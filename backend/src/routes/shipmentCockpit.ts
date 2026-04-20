import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';

const router = Router();

function getCompanyId(req: Request): number | undefined {
  return (req as any).companyId || (req as any).user?.company_id;
}

/* GET / - Main cockpit dashboard data */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ls.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    // Shipment counts by status
    const statusR = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ls.status_code = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE ls.status_code = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE ls.status_code = 'in_transit')::int AS in_transit,
        COUNT(*) FILTER (WHERE ls.status_code = 'at_port')::int AS at_port,
        COUNT(*) FILTER (WHERE ls.status_code = 'customs_clearance')::int AS customs_clearance,
        COUNT(*) FILTER (WHERE ls.status_code = 'delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE ls.status_code = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE ls.status_code = 'cancelled')::int AS cancelled,
        COALESCE(SUM(ls.total_amount), 0)::numeric AS total_value,
        COUNT(*) FILTER (WHERE ls.created_at >= NOW() - INTERVAL '30 days')::int AS last_30_days,
        COUNT(*) FILTER (WHERE ls.created_at >= NOW() - INTERVAL '7 days')::int AS last_7_days
      FROM logistics_shipments ls WHERE ls.deleted_at IS NULL ${cw}
    `, params);

    // Expense summary
    const expenseR = await pool.query(`
      SELECT
        COUNT(se.id)::int AS total_expenses,
        COALESCE(SUM(se.total_in_base_currency), 0)::numeric AS total_expense_amount,
        COALESCE(SUM(se.vat_in_base_currency), 0)::numeric AS total_vat,
        COUNT(*) FILTER (WHERE se.is_posted = false OR se.is_posted IS NULL)::int AS unposted
      FROM shipment_expenses se
      WHERE se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $1' : ''}
    `, params);

    // Recent shipments
    const recentR = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.status_code, ls.total_amount,
        ls.stage_code, ls.expected_arrival_date,
        st.name_en AS shipment_type
      FROM logistics_shipments ls
      LEFT JOIN logistics_shipment_types st ON st.id = ls.shipment_type_id
      WHERE ls.deleted_at IS NULL ${cw}
      ORDER BY ls.created_at DESC LIMIT 10
    `, params);

    // Containers overview
    const containerR = await pool.query(`
      SELECT
        COUNT(*)::int AS total_containers,
        COUNT(*) FILTER (WHERE sc.status = 'in_transit')::int AS in_transit,
        COUNT(*) FILTER (WHERE sc.status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE sc.status = 'released')::int AS released,
        COALESCE(SUM(sc.gross_weight_kg), 0)::numeric AS total_weight
      FROM shipment_containers sc
      WHERE sc.deleted_at IS NULL ${companyId ? 'AND sc.company_id = $1' : ''}
    `, params);

    // Compliance overview
    const complianceR = await pool.query(`
      SELECT
        COUNT(*)::int AS total_checks,
        COUNT(*) FILTER (WHERE scp.status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE scp.status = 'passed')::int AS passed,
        COUNT(*) FILTER (WHERE scp.status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE scp.due_date < NOW() AND scp.status IN ('pending','in_progress'))::int AS overdue
      FROM shipment_compliance scp
      WHERE scp.deleted_at IS NULL ${companyId ? 'AND scp.company_id = $1' : ''}
    `, params);

    // Top expense categories
    const topExpensesR = await pool.query(`
      SELECT set2.category, set2.name AS type_name,
        COUNT(*)::int AS count,
        COALESCE(SUM(se.total_in_base_currency), 0)::numeric AS total_amount
      FROM shipment_expenses se
      JOIN shipment_expense_types set2 ON set2.id = se.expense_type_id
      WHERE se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $1' : ''}
      GROUP BY set2.category, set2.name
      ORDER BY total_amount DESC LIMIT 10
    `, params);

    sendSuccess(res, {
      shipments: statusR.rows[0],
      expenses: expenseR.rows[0],
      recent_shipments: recentR.rows,
      containers: containerR.rows[0],
      compliance: complianceR.rows[0],
      top_expenses: topExpensesR.rows
    });
  } catch (err: any) {
    console.error('shipment-cockpit error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch cockpit data', 500);
  }
});

/* GET /timeline - Shipment timeline (ETD/ETA overview) */
router.get('/timeline', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ls.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const r = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.status_code, ls.stage_code,
        ls.expected_arrival_date,
        CASE
          WHEN ls.expected_arrival_date < NOW() AND ls.status_code NOT IN ('delivered','completed','cancelled') THEN 'delayed'
          WHEN ls.status_code IN ('delivered','completed') THEN 'arrived'
          WHEN ls.status_code = 'in_transit' THEN 'in_transit'
          ELSE 'scheduled'
        END AS timeline_status
      FROM logistics_shipments ls
      WHERE ls.deleted_at IS NULL AND ls.status_code NOT IN ('cancelled')
      ${cw}
      ORDER BY ls.expected_arrival_date ASC NULLS LAST
      LIMIT 50
    `, params);

    sendSuccess(res, r.rows);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch timeline', 500);
  }
});

/* GET /kpis - Key performance indicators */
router.get('/kpis', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ls.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total_shipments,
        COUNT(*) FILTER (WHERE ls.status_code = 'completed')::int AS completed_count,
        COUNT(*) FILTER (WHERE ls.status_code = 'in_transit')::int AS in_transit_count,
        COUNT(*) FILTER (WHERE ls.status_code = 'cancelled')::int AS cancelled_count,
        COALESCE(AVG(ls.total_amount), 0)::numeric AS avg_shipment_value,
        COALESCE(SUM(ls.total_amount), 0)::numeric AS total_shipment_value,
        COUNT(*) FILTER (WHERE ls.expected_arrival_date < NOW() AND ls.status_code NOT IN ('delivered','completed','cancelled'))::int AS overdue_count
      FROM logistics_shipments ls WHERE ls.deleted_at IS NULL ${cw}
    `, params);

    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch KPIs', 500);
  }
});

export default router;
