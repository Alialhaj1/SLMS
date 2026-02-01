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
 * Cost Variance Report
 *
 * NOTE:
 * - Planned cost is not currently stored; we return plannedCost = actualCost (variance=0)
 *   until a planned-cost source is introduced.
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('reports:cost_variance:view'),
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
            COALESCE(SUM(e.amount), 0)::numeric AS actual_cost
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
        const actualCost = Number(r.actual_cost ?? 0);
        const plannedCost = actualCost;
        const variance = actualCost - plannedCost;
        const variancePct = plannedCost !== 0 ? (variance / plannedCost) * 100 : 0;

        return {
          id: Number(r.id),
          shipmentRef: String(r.shipment_ref),
          plannedCost,
          actualCost,
          variance,
          variancePct,
          reason: '',
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
      console.error('Error generating cost variance report:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to generate cost variance report' } });
    }
  }
);

export default router;
