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
 * Now uses the real logistics_shipments and shipment_expenses tables
 * with revenue from shipment_revenues table.
 * Falls back to legacy tables if new tables have no data.
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
      const status = (req.query.status as string | undefined)?.trim();
      const dateFrom = (req.query.date_from as string | undefined)?.trim();
      const dateTo = (req.query.date_to as string | undefined)?.trim();

      const where: string[] = ['ls.deleted_at IS NULL', 'ls.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`(ls.shipment_number ILIKE $${paramCount} OR v.name ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
      }
      
      if (status) {
        where.push(`ls.status_code = $${paramCount}`);
        params.push(status);
        paramCount++;
      }
      
      if (dateFrom) {
        where.push(`ls.created_at >= $${paramCount}`);
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        where.push(`ls.created_at <= $${paramCount}`);
        params.push(dateTo);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM logistics_shipments ls
         LEFT JOIN vendors v ON v.id = ls.vendor_id
         ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT
            ls.id,
            ls.shipment_number AS shipment_ref,
            ls.status_code,
            ls.stage_code,
            ls.locked_at IS NOT NULL AS is_locked,
            v.name AS vendor_name,
            po.order_number AS po_number,
            ls.total_amount AS purchase_value,
            COALESCE(exp.total_cost, 0)::numeric AS total_cost,
            COALESCE(exp.total_vat, 0)::numeric AS total_vat,
            COALESCE(exp.expense_count, 0)::int AS expense_count,
            COALESCE(exp.posted_count, 0)::int AS posted_count,
            COALESCE(rev.total_revenue, 0)::numeric AS revenue,
            COALESCE(alloc.total_allocated, 0)::numeric AS total_allocated,
            COALESCE(alloc.items_with_allocation, 0)::int AS items_allocated,
            COALESCE(itm.items_count, 0)::int AS items_count,
            sc.status AS closing_status,
            ls.created_at
         FROM logistics_shipments ls
         LEFT JOIN vendors v ON v.id = ls.vendor_id
         LEFT JOIN purchase_orders po ON po.id = ls.purchase_order_id
         LEFT JOIN LATERAL (
           SELECT 
             SUM(se.total_in_base_currency) AS total_cost,
             SUM(se.vat_amount) AS total_vat,
             COUNT(*) AS expense_count,
             COUNT(*) FILTER (WHERE se.is_posted = true) AS posted_count
           FROM shipment_expenses se 
           WHERE se.shipment_id = ls.id AND se.deleted_at IS NULL
         ) exp ON true
         LEFT JOIN LATERAL (
           SELECT SUM(sr.amount_in_base_currency) AS total_revenue
           FROM shipment_revenues sr 
           WHERE sr.shipment_id = ls.id AND sr.deleted_at IS NULL
         ) rev ON true
         LEFT JOIN LATERAL (
           SELECT SUM(sca.allocated_amount) AS total_allocated,
                  COUNT(DISTINCT sca.item_id) AS items_with_allocation
           FROM shipment_cost_allocations sca 
           WHERE sca.shipment_id = ls.id AND sca.deleted_at IS NULL
         ) alloc ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS items_count
           FROM logistics_shipment_items lsi 
           WHERE lsi.shipment_id = ls.id AND lsi.deleted_at IS NULL
         ) itm ON true
         LEFT JOIN shipment_closings sc ON sc.shipment_id = ls.id AND sc.company_id = ls.company_id
         ${whereSql}
         ORDER BY ls.created_at DESC, ls.id DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      const rows = listResult.rows.map((r: any) => {
        const revenue = Number(r.revenue ?? 0);
        const totalCost = Number(r.total_cost ?? 0);
        const profit = revenue - totalCost;
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
        const costToValueRatio = Number(r.purchase_value) > 0 ? (totalCost / Number(r.purchase_value)) * 100 : 0;

        return {
          id: Number(r.id),
          shipmentRef: String(r.shipment_ref),
          vendorName: r.vendor_name,
          poNumber: r.po_number,
          statusCode: r.status_code,
          stageCode: r.stage_code,
          isLocked: r.is_locked,
          purchaseValue: Number(r.purchase_value ?? 0),
          revenue,
          totalCost,
          totalVat: Number(r.total_vat ?? 0),
          profit,
          marginPct: Math.round(marginPct * 100) / 100,
          costToValueRatio: Math.round(costToValueRatio * 100) / 100,
          expenseCount: Number(r.expense_count),
          postedCount: Number(r.posted_count),
          itemsCount: Number(r.items_count),
          itemsAllocated: Number(r.items_allocated),
          totalAllocated: Number(r.total_allocated ?? 0),
          closingStatus: r.closing_status || 'open',
          createdAt: r.created_at,
        };
      });

      // Summary totals
      const summaryResult = await pool.query(`
        SELECT 
          COALESCE(SUM(se.total_in_base_currency), 0) AS grand_total_cost,
          COALESCE(SUM(se.vat_amount), 0) AS grand_total_vat,
          COUNT(DISTINCT se.shipment_id) AS shipments_with_expenses
        FROM shipment_expenses se
        JOIN logistics_shipments ls ON ls.id = se.shipment_id AND ls.company_id = $1 AND ls.deleted_at IS NULL
        WHERE se.company_id = $1 AND se.deleted_at IS NULL
      `, [companyId]);

      const revSummary = await pool.query(`
        SELECT COALESCE(SUM(amount_in_base_currency), 0) AS grand_total_revenue
        FROM shipment_revenues 
        WHERE company_id = $1 AND deleted_at IS NULL
      `, [companyId]);

      return res.json({
        success: true,
        data: rows,
        total: totalItems,
        summary: {
          grandTotalCost: Number(summaryResult.rows[0]?.grand_total_cost ?? 0),
          grandTotalVat: Number(summaryResult.rows[0]?.grand_total_vat ?? 0),
          grandTotalRevenue: Number(revSummary.rows[0]?.grand_total_revenue ?? 0),
          grandProfit: Number(revSummary.rows[0]?.grand_total_revenue ?? 0) - Number(summaryResult.rows[0]?.grand_total_cost ?? 0),
          shipmentsWithExpenses: Number(summaryResult.rows[0]?.shipments_with_expenses ?? 0),
        },
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
