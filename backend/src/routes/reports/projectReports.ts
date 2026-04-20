/**
 * PROJECT REPORTS API
 * ===================
 * Financial reporting and analytics for projects.
 * Routes: /api/reports/projects
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

async function getEffectiveCompanyId(req: Request): Promise<number | null> {
  const companyId = (req as any).companyContext?.companyId || (req as any).user?.company_id;
  if (companyId) return companyId;
  const result = await pool.query(`SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1`);
  return result.rows[0]?.id || null;
}

// =============================================
// SUMMARY REPORT — All projects overview
// =============================================

/**
 * @route   GET /api/reports/projects/summary
 * @desc    Summary of all projects with KPIs
 */
router.get('/summary', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    const { status, project_level, project_type_id, vendor_id, date_from, date_to } = req.query;

    let where = `p.company_id = $1 AND p.deleted_at IS NULL`;
    const params: any[] = [companyId];
    let idx = 2;

    if (status && status !== 'all') {
      where += ` AND p.status = $${idx}`; params.push(status); idx++;
    }
    if (project_level && project_level !== 'all') {
      where += ` AND p.project_level = $${idx}`; params.push(project_level); idx++;
    }
    if (project_type_id) {
      where += ` AND p.project_type_id = $${idx}`; params.push(project_type_id); idx++;
    }
    if (vendor_id) {
      where += ` AND p.vendor_id = $${idx}`; params.push(vendor_id); idx++;
    }
    if (date_from) {
      where += ` AND p.start_date >= $${idx}`; params.push(date_from); idx++;
    }
    if (date_to) {
      where += ` AND p.start_date <= $${idx}`; params.push(date_to); idx++;
    }

    // Main data
    const result = await pool.query(`
      SELECT 
        p.id, p.code, p.name, p.name_ar, p.project_level, p.status,
        p.priority, p.risk_level, p.financial_status,
        p.budget, p.budget_allocated, p.budget_consumed,
        p.revenue_target, p.revenue_actual,
        p.progress_percent, p.completion_pct,
        p.start_date, p.end_date,
        p.vendor_id,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        pt.name as project_type_name, pt.name_ar as project_type_name_ar,
        pt.icon as project_type_icon, pt.color as project_type_color,
        COALESCE(cs.total_cost, 0) as total_cost,
        COALESCE(cs.total_revenue, 0) as total_revenue,
        COALESCE(cs.freight_cost, 0) as freight_cost,
        COALESCE(cs.supplier_payment_cost, 0) as supplier_payment_cost,
        COALESCE(cs.customs_cost, 0) as customs_cost,
        COALESCE(cs.shipments_count, 0) as shipments_count,
        COALESCE(cs.payments_count, 0) as payments_count,
        COALESCE(cs.total_links_count, 0) as total_links_count,
        CASE WHEN COALESCE(p.budget_allocated, 0) > 0
             THEN ROUND((COALESCE(cs.total_cost, 0) / p.budget_allocated * 100)::numeric, 1)
             ELSE 0 END as budget_utilization_pct,
        COALESCE(cs.total_revenue, 0) - COALESCE(cs.total_cost, 0) as profit_loss,
        CASE WHEN COALESCE(cs.total_revenue, 0) > 0
             THEN ROUND(((COALESCE(cs.total_revenue, 0) - COALESCE(cs.total_cost, 0)) / cs.total_revenue * 100)::numeric, 1)
             ELSE 0 END as margin_pct
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      LEFT JOIN v_project_cost_summary cs ON cs.id = p.id
      WHERE ${where}
      ORDER BY p.code
    `, params);

    // Aggregate stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE p.project_level = 'group') as total_groups,
        COUNT(*) FILTER (WHERE p.project_level = 'master') as total_masters,
        COUNT(*) FILTER (WHERE p.project_level = 'sub') as total_subs,
        COUNT(*) FILTER (WHERE p.status IN ('active','in_progress')) as active_count,
        COUNT(*) FILTER (WHERE p.status = 'completed') as completed_count,
        COALESCE(SUM(p.budget_allocated), 0) as total_budget,
        COALESCE(SUM(p.budget_consumed), 0) as total_consumed,
        COALESCE(SUM(p.revenue_actual), 0) as total_revenue,
        COUNT(*) FILTER (WHERE p.risk_level IN ('high','critical')) as at_risk_count
      FROM projects p
      WHERE ${where}
    `, params);

    return res.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0] || {},
      meta: { total: result.rows.length }
    });
  } catch (error: any) {
    console.error('Error generating project summary report:', error);
    return res.status(500).json({ error: 'Failed to generate summary report' });
  }
});

// =============================================
// COST REPORT — Detailed cost breakdown for a project
// =============================================

/**
 * @route   GET /api/reports/projects/:id/cost
 * @desc    Detailed cost breakdown for a specific project
 */
router.get('/:id/cost', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    // Project basic info
    const projectResult = await pool.query(`
      SELECT p.id, p.code, p.name, p.name_ar, p.project_level, p.status,
             p.budget, p.budget_allocated, p.budget_consumed,
             p.currency_code, p.vendor_id,
             v.name as vendor_name
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
    `, [id, companyId]);

    if (projectResult.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    // Cost by category
    const byCategoryResult = await pool.query(`
      SELECT 
        COALESCE(cost_category, 'uncategorized') as category,
        COUNT(*) as link_count,
        COALESCE(SUM(amount_base), 0) as total_amount,
        COALESCE(SUM(amount), 0) as total_original_amount,
        MIN(linked_at) as earliest_date,
        MAX(linked_at) as latest_date
      FROM project_links
      WHERE project_id = $1 AND deleted_at IS NULL
      GROUP BY cost_category
      ORDER BY total_amount DESC
    `, [id]);

    // Cost by link type
    const byTypeResult = await pool.query(`
      SELECT 
        link_type,
        COUNT(*) as link_count,
        COALESCE(SUM(amount_base), 0) as total_amount
      FROM project_links
      WHERE project_id = $1 AND deleted_at IS NULL
      GROUP BY link_type
      ORDER BY total_amount DESC
    `, [id]);

    // All linked transactions
    const transactionsResult = await pool.query(`
      SELECT 
        pl.id, pl.link_type, pl.linked_id, pl.linked_reference, pl.linked_date,
        pl.amount, pl.currency_code, pl.amount_base, pl.cost_category,
        pl.linked_description, pl.linked_status, pl.notes, pl.linked_at,
        u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.deleted_at IS NULL
      ORDER BY pl.linked_at DESC
    `, [id]);

    // Monthly cost trend
    const monthlyResult = await pool.query(`
      SELECT 
        TO_CHAR(linked_at, 'YYYY-MM') as month,
        COALESCE(SUM(amount_base) FILTER (WHERE cost_category != 'revenue'), 0) as cost,
        COALESCE(SUM(amount_base) FILTER (WHERE cost_category = 'revenue'), 0) as revenue
      FROM project_links
      WHERE project_id = $1 AND deleted_at IS NULL AND linked_at IS NOT NULL
      GROUP BY TO_CHAR(linked_at, 'YYYY-MM')
      ORDER BY month
    `, [id]);

    return res.json({
      success: true,
      data: {
        project: projectResult.rows[0],
        by_category: byCategoryResult.rows,
        by_type: byTypeResult.rows,
        transactions: transactionsResult.rows,
        monthly_trend: monthlyResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error generating cost report:', error);
    return res.status(500).json({ error: 'Failed to generate cost report' });
  }
});

// =============================================
// PROFITABILITY REPORT
// =============================================

/**
 * @route   GET /api/reports/projects/:id/profitability
 * @desc    Profitability analysis for a project
 */
router.get('/:id/profitability', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        p.id, p.code, p.name, p.name_ar, p.budget_allocated,
        COALESCE(cs.total_cost, 0) as total_cost,
        COALESCE(cs.total_revenue, 0) as total_revenue,
        COALESCE(cs.total_revenue, 0) - COALESCE(cs.total_cost, 0) as profit_loss,
        COALESCE(cs.freight_cost, 0) as freight_cost,
        COALESCE(cs.supplier_payment_cost, 0) as supplier_payment_cost,
        COALESCE(cs.customs_cost, 0) as customs_cost,
        COALESCE(cs.insurance_cost, 0) as insurance_cost,
        COALESCE(cs.service_fee_cost, 0) as service_fee_cost,
        COALESCE(cs.bank_charges_cost, 0) as bank_charges_cost,
        COALESCE(cs.misc_cost, 0) as misc_cost,
        CASE WHEN COALESCE(cs.total_revenue, 0) > 0
             THEN ROUND(((cs.total_revenue - cs.total_cost) / cs.total_revenue * 100)::numeric, 2)
             ELSE 0 END as profit_margin_pct,
        CASE WHEN COALESCE(cs.total_cost, 0) > 0
             THEN ROUND(((cs.total_revenue - cs.total_cost) / cs.total_cost * 100)::numeric, 2)
             ELSE 0 END as roi_pct
      FROM projects p
      LEFT JOIN v_project_cost_summary cs ON cs.id = p.id
      WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error generating profitability report:', error);
    return res.status(500).json({ error: 'Failed to generate profitability report' });
  }
});

// =============================================
// BUDGET vs ACTUAL REPORT
// =============================================

/**
 * @route   GET /api/reports/projects/budget-vs-actual
 * @desc    Budget variance report for all projects
 */
router.get('/budget-vs-actual', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    const result = await pool.query(`
      SELECT 
        p.id, p.code, p.name, p.name_ar, p.project_level, p.status,
        COALESCE(p.budget_allocated, 0) as budget_allocated,
        COALESCE(cs.total_cost, 0) as actual_cost,
        COALESCE(p.budget_allocated, 0) - COALESCE(cs.total_cost, 0) as variance,
        CASE WHEN COALESCE(p.budget_allocated, 0) > 0
             THEN ROUND((COALESCE(cs.total_cost, 0) / p.budget_allocated * 100)::numeric, 1)
             ELSE 0 END as utilization_pct,
        CASE 
          WHEN COALESCE(p.budget_allocated, 0) = 0 THEN 'no_budget'
          WHEN COALESCE(cs.total_cost, 0) <= p.budget_allocated * 0.7 THEN 'on_track'
          WHEN COALESCE(cs.total_cost, 0) <= p.budget_allocated * 0.9 THEN 'warning'
          WHEN COALESCE(cs.total_cost, 0) <= p.budget_allocated THEN 'critical'
          ELSE 'over_budget'
        END as budget_status,
        p.risk_level,
        pt.name as type_name, pt.name_ar as type_name_ar,
        v.name as vendor_name
      FROM projects p
      LEFT JOIN v_project_cost_summary cs ON cs.id = p.id
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.company_id = $1 AND p.deleted_at IS NULL
      ORDER BY utilization_pct DESC
    `, [companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error generating budget vs actual report:', error);
    return res.status(500).json({ error: 'Failed to generate budget vs actual report' });
  }
});

// =============================================
// VENDOR ANALYSIS REPORT
// =============================================

/**
 * @route   GET /api/reports/projects/vendor-analysis
 * @desc    Vendor cost analysis across projects
 */
router.get('/vendor-analysis', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    const result = await pool.query(`
      SELECT 
        v.id as vendor_id,
        v.name as vendor_name,
        v.name_ar as vendor_name_ar,
        v.code as vendor_code,
        COUNT(DISTINCT p.id) as project_count,
        COALESCE(SUM(p.budget_allocated), 0) as total_budget,
        COALESCE(SUM(cs.total_cost), 0) as total_cost,
        COALESCE(SUM(cs.total_revenue), 0) as total_revenue,
        COALESCE(SUM(cs.total_revenue), 0) - COALESCE(SUM(cs.total_cost), 0) as total_profit,
        COALESCE(SUM(cs.shipments_count), 0) as total_shipments,
        COALESCE(SUM(cs.payments_count), 0) as total_payments,
        ROUND(AVG(COALESCE(cs.total_cost, 0))::numeric, 2) as avg_project_cost
      FROM vendors v
      INNER JOIN projects p ON p.vendor_id = v.id AND p.deleted_at IS NULL AND p.company_id = $1
      LEFT JOIN v_project_cost_summary cs ON cs.id = p.id
      GROUP BY v.id, v.name, v.name_ar, v.code
      ORDER BY total_cost DESC
    `, [companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error generating vendor analysis report:', error);
    return res.status(500).json({ error: 'Failed to generate vendor analysis report' });
  }
});

// =============================================
// CASHFLOW REPORT for a project
// =============================================

/**
 * @route   GET /api/reports/projects/:id/cashflow
 * @desc    Cash flow analysis for a specific project
 */
router.get('/:id/cashflow', requireAnyPermission(['projects:view', 'projects:reports:view']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    // Monthly inflows and outflows
    const result = await pool.query(`
      SELECT 
        TO_CHAR(pl.linked_at, 'YYYY-MM') as month,
        COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'revenue'), 0) as inflow,
        COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category != 'revenue'), 0) as outflow,
        COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'revenue'), 0) 
          - COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category != 'revenue'), 0) as net_flow
      FROM project_links pl
      WHERE pl.project_id = $1 AND pl.deleted_at IS NULL AND pl.linked_at IS NOT NULL
      GROUP BY TO_CHAR(pl.linked_at, 'YYYY-MM')
      ORDER BY month
    `, [id]);

    // Running total
    let runningTotal = 0;
    const data = result.rows.map(row => {
      runningTotal += parseFloat(row.net_flow);
      return { ...row, cumulative: runningTotal };
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error generating cashflow report:', error);
    return res.status(500).json({ error: 'Failed to generate cashflow report' });
  }
});

export default router;
