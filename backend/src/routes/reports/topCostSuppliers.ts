import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(query.limit ?? '50'), 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Top Cost Suppliers Report
 *
 * NOTE:
 * - Suppliers and shipments are legacy/global.
 * - We scope by company using shipment_milestones and match to shipments via tracking_number.
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('reports:top_cost_suppliers:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();

      const where: string[] = ['m.deleted_at IS NULL', 'm.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`COALESCE(sp.name, 'Unknown') ILIKE $${paramCount}`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      // Count suppliers for pagination
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM (
          SELECT COALESCE(sp.id, 0) AS supplier_id
          FROM shipment_milestones m
          LEFT JOIN shipments s ON s.tracking_number = m.shipment_reference
          LEFT JOIN suppliers sp ON sp.id = s.supplier_id
          ${whereSql}
          GROUP BY COALESCE(sp.id, 0)
         ) x`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT
            COALESCE(sp.id, 0) AS id,
            COALESCE(sp.name, 'Unknown') AS supplier,
            COUNT(DISTINCT m.shipment_reference)::int AS shipments,
            COALESCE(SUM(e.amount), 0)::numeric AS total_cost
         FROM shipment_milestones m
         LEFT JOIN shipments s ON s.tracking_number = m.shipment_reference
         LEFT JOIN suppliers sp ON sp.id = s.supplier_id
         LEFT JOIN expenses e ON e.shipment_id = s.id
         ${whereSql}
         GROUP BY COALESCE(sp.id, 0), COALESCE(sp.name, 'Unknown')
         ORDER BY total_cost DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      const rows = listResult.rows.map((r: any) => {
        const shipments = Number(r.shipments ?? 0);
        const totalCost = Number(r.total_cost ?? 0);
        const avgCost = shipments > 0 ? totalCost / shipments : 0;

        return {
          id: Number(r.id),
          supplier: String(r.supplier),
          shipments,
          totalCost,
          avgCost,
        };
      });

      return res.json({
        success: true,
        data: rows,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      });
    } catch (error) {
      console.error('Error generating top cost suppliers report:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to generate top cost suppliers report' } });
    }
  }
);

export default router;
