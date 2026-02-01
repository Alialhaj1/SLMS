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
 * Shipment Profitability Report
 *
 * NOTE:
 * - Legacy shipments/expenses tables are not company-scoped.
 * - We scope results by company via shipment_milestones (company_id + shipment_reference)
 *   and match milestones.shipment_reference -> shipments.tracking_number.
 * - Revenue is not currently stored in DB; returned as 0 for now.
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('reports:shipment_profitability:view'),
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
        where.push(`m.shipment_reference ILIKE $${paramCount}`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM shipment_milestones m
         ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT
            COALESCE(s.id, m.id) AS id,
            m.shipment_reference AS shipment_ref,
            0::numeric AS revenue,
            COALESCE(SUM(e.amount), 0)::numeric AS total_cost
         FROM shipment_milestones m
         LEFT JOIN shipments s ON s.tracking_number = m.shipment_reference
         LEFT JOIN expenses e ON e.shipment_id = s.id
         ${whereSql}
         GROUP BY COALESCE(s.id, m.id), m.shipment_reference
         ORDER BY m.updated_at DESC, m.id DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      const rows = listResult.rows.map((r: any) => {
        const revenue = Number(r.revenue ?? 0);
        const totalCost = Number(r.total_cost ?? 0);
        const profit = revenue - totalCost;
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          id: Number(r.id),
          shipmentRef: String(r.shipment_ref),
          revenue,
          totalCost,
          profit,
          marginPct,
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
      console.error('Error generating shipment profitability report:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to generate shipment profitability report' } });
    }
  }
);

export default router;
