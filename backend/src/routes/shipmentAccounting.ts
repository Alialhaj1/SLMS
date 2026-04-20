import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(query.limit ?? '25'), 10) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getCompanyId(req: Request): number | undefined {
  return (req as any).companyId || (req as any).user?.company_id;
}

/* GET /summary/:shipmentId - Financial summary for a shipment */
router.get('/summary/:shipmentId', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    if (Number.isNaN(shipmentId)) return sendError(res, 'VALIDATION', 'Invalid shipment id', 400);
    const companyId = getCompanyId(req);

    // Get shipment basic info
    const shipmentR = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.status_code, ls.total_amount,
        ls.stage_code, ls.shipment_type_id,
        st.name_en AS shipment_type_name
      FROM logistics_shipments ls
      LEFT JOIN logistics_shipment_types st ON st.id = ls.shipment_type_id
      WHERE ls.id = $1 AND ls.deleted_at IS NULL ${companyId ? 'AND ls.company_id = $2' : ''}
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    if (shipmentR.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipment not found', 404);

    // Get expense summary
    const expenseR = await pool.query(`
      SELECT
        COUNT(*)::int AS total_expenses,
        COALESCE(SUM(se.amount_before_vat), 0)::numeric AS total_before_vat,
        COALESCE(SUM(se.vat_amount), 0)::numeric AS total_vat,
        COALESCE(SUM(se.total_amount), 0)::numeric AS total_expenses_amount,
        COALESCE(SUM(se.total_in_base_currency), 0)::numeric AS total_base_currency,
        COUNT(*) FILTER (WHERE se.is_posted = true)::int AS posted_count,
        COUNT(*) FILTER (WHERE se.is_posted = false OR se.is_posted IS NULL)::int AS unposted_count
      FROM shipment_expenses se
      WHERE se.shipment_id = $1 AND se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $2' : ''}
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    // Get cost summary
    const costR = await pool.query(`
      SELECT * FROM shipment_cost_summary WHERE shipment_id = $1
    `, [shipmentId]);

    // Get journal entries linked to this shipment
    const journalR = await pool.query(`
      SELECT
        COUNT(*)::int AS total_journal_entries,
        COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0)::numeric AS total_debits,
        COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0)::numeric AS total_credits
      FROM logistics_shipment_costs lsc
      JOIN journal_entries je ON je.id = lsc.journal_entry_id
      JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE lsc.shipment_id = $1 AND lsc.deleted_at IS NULL ${companyId ? 'AND lsc.company_id = $2' : ''}
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    sendSuccess(res, {
      shipment: shipmentR.rows[0],
      expenses: expenseR.rows[0],
      cost_summary: costR.rows[0] || null,
      journal_summary: journalR.rows[0]
    });
  } catch (err: any) {
    console.error('shipment-accounting/summary error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch accounting summary', 500);
  }
});

/* GET /journal-entries/:shipmentId - Journal entries for a shipment */
router.get('/journal-entries/:shipmentId', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    if (Number.isNaN(shipmentId)) return sendError(res, 'VALIDATION', 'Invalid shipment id', 400);
    const companyId = getCompanyId(req);
    const { page, limit, offset } = parsePagination(req.query);

    const baseWhere = `lsc.shipment_id = $1 AND lsc.deleted_at IS NULL AND lsc.journal_entry_id IS NOT NULL ${companyId ? 'AND lsc.company_id = $2' : ''}`;
    const params = companyId ? [shipmentId, companyId] : [shipmentId];
    const pc = params.length + 1;

    const countR = await pool.query(`
      SELECT COUNT(DISTINCT je.id)::int AS total
      FROM logistics_shipment_costs lsc
      JOIN journal_entries je ON je.id = lsc.journal_entry_id
      WHERE ${baseWhere}
    `, params);

    const journalR = await pool.query(`
      SELECT DISTINCT je.id, je.entry_number, je.entry_date, je.description, je.status,
        je.total_debit, je.total_credit, je.created_at,
        lsc.cost_type_code, lsc.amount, lsc.description AS cost_description
      FROM logistics_shipment_costs lsc
      JOIN journal_entries je ON je.id = lsc.journal_entry_id
      WHERE ${baseWhere}
      ORDER BY je.entry_date DESC
      LIMIT $${pc} OFFSET $${pc + 1}
    `, [...params, limit, offset]);

    res.json({ success: true, data: journalR.rows, total: countR.rows[0]?.total ?? 0, page, limit });
  } catch (err: any) {
    console.error('shipment-accounting/journal-entries error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch journal entries', 500);
  }
});

/* GET /expense-breakdown/:shipmentId - Expense breakdown by category */
router.get('/expense-breakdown/:shipmentId', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    if (Number.isNaN(shipmentId)) return sendError(res, 'VALIDATION', 'Invalid shipment id', 400);
    const companyId = getCompanyId(req);

    const r = await pool.query(`
      SELECT
        set2.category,
        set2.name AS expense_type_name,
        set2.name_ar AS expense_type_name_ar,
        COUNT(*)::int AS count,
        COALESCE(SUM(se.amount_before_vat), 0)::numeric AS total_before_vat,
        COALESCE(SUM(se.vat_amount), 0)::numeric AS total_vat,
        COALESCE(SUM(se.total_amount), 0)::numeric AS total_amount,
        COALESCE(SUM(se.total_in_base_currency), 0)::numeric AS total_base_currency
      FROM shipment_expenses se
      JOIN shipment_expense_types set2 ON set2.id = se.expense_type_id
      WHERE se.shipment_id = $1 AND se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $2' : ''}
      GROUP BY set2.category, set2.name, set2.name_ar
      ORDER BY set2.category, total_amount DESC
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    sendSuccess(res, r.rows);
  } catch (err: any) {
    console.error('shipment-accounting/expense-breakdown error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch expense breakdown', 500);
  }
});

/* GET /default-accounts - Get default accounts mapping */
router.get('/default-accounts', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const r = await pool.query(`
      SELECT da.id, da.cost_type_code, da.debit_account_id, da.credit_account_id, da.is_active,
        da_acc.code AS debit_account_code, da_acc.name AS debit_account_name,
        ca_acc.code AS credit_account_code, ca_acc.name AS credit_account_name
      FROM logistics_shipment_cost_default_accounts da
      LEFT JOIN accounts da_acc ON da_acc.id = da.debit_account_id
      LEFT JOIN accounts ca_acc ON ca_acc.id = da.credit_account_id
      WHERE da.deleted_at IS NULL ${companyId ? 'AND da.company_id = $1' : ''}
      ORDER BY da.cost_type_code
    `, companyId ? [companyId] : []);
    sendSuccess(res, r.rows);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch default accounts', 500);
  }
});

/* POST /default-accounts - Upsert default account mapping */
router.post('/default-accounts', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { cost_type_code, debit_account_id, credit_account_id, is_active = true } = req.body;

    if (!cost_type_code || !debit_account_id || !credit_account_id) {
      return sendError(res, 'VALIDATION', 'cost_type_code, debit_account_id, and credit_account_id are required', 400);
    }

    const r = await pool.query(`
      INSERT INTO logistics_shipment_cost_default_accounts (company_id, cost_type_code, debit_account_id, credit_account_id, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (company_id, cost_type_code) DO UPDATE SET
        debit_account_id = EXCLUDED.debit_account_id,
        credit_account_id = EXCLUDED.credit_account_id,
        is_active = EXCLUDED.is_active,
        updated_by = $6,
        updated_at = NOW()
      RETURNING *
    `, [companyId, cost_type_code, debit_account_id, credit_account_id, is_active, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-accounting/default-accounts POST error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to save default account', 500);
  }
});

/* GET /closing-status/:shipmentId - Check if shipment can be closed financially */
router.get('/closing-status/:shipmentId', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    if (Number.isNaN(shipmentId)) return sendError(res, 'VALIDATION', 'Invalid shipment id', 400);
    const companyId = getCompanyId(req);

    const expR = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE se.is_posted = false OR se.is_posted IS NULL)::int AS unposted_expenses,
        COUNT(*) FILTER (WHERE se.approval_status = 'draft')::int AS draft_expenses,
        COUNT(*) FILTER (WHERE se.approval_status NOT IN ('approved'))::int AS unapproved_expenses
      FROM shipment_expenses se
      WHERE se.shipment_id = $1 AND se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $2' : ''}
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    const allocR = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE sca.is_posted = false)::int AS unposted_allocations
      FROM shipment_cost_allocations sca
      WHERE sca.shipment_id = $1 AND sca.deleted_at IS NULL ${companyId ? 'AND sca.company_id = $2' : ''}
    `, companyId ? [shipmentId, companyId] : [shipmentId]);

    const status = expR.rows[0];
    const allocStatus = allocR.rows[0];
    const canClose = status.unposted_expenses === 0 && status.draft_expenses === 0 && allocStatus.unposted_allocations === 0;

    sendSuccess(res, {
      can_close: canClose,
      blockers: {
        unposted_expenses: status.unposted_expenses,
        draft_expenses: status.draft_expenses,
        unapproved_expenses: status.unapproved_expenses,
        unposted_allocations: allocStatus.unposted_allocations
      }
    });
  } catch (err: any) {
    console.error('shipment-accounting/closing-status error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to check closing status', 500);
  }
});

/* GET / - List all shipments with accounting summary */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ls.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const pc = params.length + 1;

    const countR = await pool.query(`
      SELECT COUNT(*)::int AS total FROM logistics_shipments ls WHERE ls.deleted_at IS NULL ${cw}
    `, params);

    const listR = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.status_code, ls.total_amount,
        COALESCE(scs.total_amount, 0)::numeric AS total_expenses,
        COALESCE(scs.total_in_base_currency, 0)::numeric AS total_expenses_base,
        scs.total_expenses_count,
        (SELECT COUNT(*)::int FROM logistics_shipment_costs lsc WHERE lsc.shipment_id = ls.id AND lsc.journal_entry_id IS NOT NULL AND lsc.deleted_at IS NULL) AS journal_entries_count
      FROM logistics_shipments ls
      LEFT JOIN shipment_cost_summary scs ON scs.shipment_id = ls.id
      WHERE ls.deleted_at IS NULL ${cw}
      ORDER BY ls.created_at DESC
      LIMIT $${pc} OFFSET $${pc + 1}
    `, [...params, limit, offset]);

    res.json({ success: true, data: listR.rows, total: countR.rows[0]?.total ?? 0, page, limit });
  } catch (err: any) {
    console.error('shipment-accounting list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch accounting data', 500);
  }
});

/* GET /accounting-map - Shipment type → account mapping */
router.get('/accounting-map', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    // Return landed_cost_settings joined with expense type and accounts
    const r = await pool.query(`
      SELECT lcs.id, lcs.cost_type_code,
        set2.name AS expense_type_name, set2.name_ar AS expense_type_name_ar,
        set2.category, set2.is_vat_exempt,
        set2.default_vat_rate,
        lcs.debit_account_id, da.code AS debit_account_code, da.name AS debit_account_name,
        lcs.credit_account_id, ca.code AS credit_account_code, ca.name AS credit_account_name,
        lcs.created_at, lcs.updated_at
      FROM landed_cost_settings lcs
      JOIN shipment_expense_types set2 ON set2.code = lcs.cost_type_code
        AND set2.company_id = $1 AND set2.deleted_at IS NULL
      LEFT JOIN accounts da ON da.id = lcs.debit_account_id
      LEFT JOIN accounts ca ON ca.id = lcs.credit_account_id
      WHERE lcs.company_id = $1
      ORDER BY set2.display_order, set2.code
    `, [companyId]);

    sendSuccess(res, r.rows);
  } catch (err: any) {
    console.error('shipment-accounting/accounting-map error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch accounting map', 500);
  }
});

/* PUT /accounting-map/:id - Update a mapping */
router.put('/accounting-map/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { debit_account_id, credit_account_id } = req.body;

    if (!debit_account_id || !credit_account_id) {
      return sendError(res, 'VALIDATION', 'debit_account_id and credit_account_id are required', 400);
    }

    const r = await pool.query(`
      UPDATE landed_cost_settings SET
        debit_account_id = $1, credit_account_id = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `, [debit_account_id, credit_account_id, id, companyId]);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Mapping not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-accounting/accounting-map PUT error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update mapping', 500);
  }
});

/* GET /financial-dashboard - Aggregated financial KPIs across all shipments */
router.get('/financial-dashboard', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);

    // Summary KPIs from shipment_cost_summary + shipment data
    const summaryR = await pool.query(`
      SELECT
        COUNT(DISTINCT ls.id)::int AS shipment_count,
        COALESCE(SUM(ls.total_amount), 0)::numeric AS total_shipment_value,
        COALESCE(SUM(scs.total_amount), 0)::numeric AS total_expenses,
        COALESCE(SUM(scs.total_in_base_currency), 0)::numeric AS total_expenses_base,
        COALESCE(SUM(scs.total_vat_amount), 0)::numeric AS total_vat,
        COALESCE(SUM(scs.total_expenses_count), 0)::int AS total_expense_count,
        COUNT(DISTINCT ls.id) FILTER (WHERE scs.total_expenses_count > 0)::int AS shipments_with_expenses,
        COUNT(DISTINCT ls.id) FILTER (WHERE scs.total_expenses_count IS NULL OR scs.total_expenses_count = 0)::int AS shipments_without_expenses
      FROM logistics_shipments ls
      LEFT JOIN shipment_cost_summary scs ON scs.shipment_id = ls.id
      WHERE ls.deleted_at IS NULL ${companyId ? 'AND ls.company_id = $1' : ''}
    `, companyId ? [companyId] : []);

    // Expense breakdown by category
    const categoryR = await pool.query(`
      SELECT
        set2.category,
        COUNT(*)::int AS count,
        COALESCE(SUM(se.amount_before_vat), 0)::numeric AS total_before_vat,
        COALESCE(SUM(se.vat_amount), 0)::numeric AS total_vat,
        COALESCE(SUM(se.total_in_base_currency), 0)::numeric AS total_base
      FROM shipment_expenses se
      JOIN shipment_expense_types set2 ON set2.id = se.expense_type_id
      WHERE se.deleted_at IS NULL ${companyId ? 'AND se.company_id = $1' : ''}
      GROUP BY set2.category
      ORDER BY total_base DESC
    `, companyId ? [companyId] : []);

    // Per-shipment financial data
    const shipmentsR = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.status_code, ls.total_amount,
        st.name_en AS shipment_type_name,
        COALESCE(scs.total_amount, 0)::numeric AS total_expenses,
        COALESCE(scs.total_in_base_currency, 0)::numeric AS total_expenses_base,
        COALESCE(scs.total_vat_amount, 0)::numeric AS total_vat,
        COALESCE(scs.total_expenses_count, 0)::int AS expense_count,
        (SELECT COUNT(*)::int FROM shipment_expenses se2 WHERE se2.shipment_id = ls.id AND se2.is_posted = true AND se2.deleted_at IS NULL) AS posted_count,
        (SELECT COUNT(*)::int FROM shipment_expenses se3 WHERE se3.shipment_id = ls.id AND se3.is_posted = false AND se3.deleted_at IS NULL) AS unposted_count
      FROM logistics_shipments ls
      LEFT JOIN shipment_cost_summary scs ON scs.shipment_id = ls.id
      LEFT JOIN shipment_types st ON st.id = ls.shipment_type_id
      WHERE ls.deleted_at IS NULL ${companyId ? 'AND ls.company_id = $1' : ''}
      ORDER BY ls.created_at DESC
      LIMIT 50
    `, companyId ? [companyId] : []);

    sendSuccess(res, {
      summary: summaryR.rows[0],
      categories: categoryR.rows,
      shipments: shipmentsR.rows
    });
  } catch (err: any) {
    console.error('shipment-accounting/financial-dashboard error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch financial dashboard', 500);
  }
});

/* GET /journal-links - List all shipment expenses with journal entry info */
router.get('/journal-links', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { page, limit, offset } = parsePagination(req.query);
    const { search, status } = req.query as any;

    const conditions: string[] = ['se.deleted_at IS NULL'];
    const params: any[] = [];

    if (companyId) { params.push(companyId); conditions.push(`se.company_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(ls.shipment_number ILIKE $${params.length} OR se.expense_type_name ILIKE $${params.length})`);
    }
    if (status === 'posted') conditions.push(`se.is_posted = true`);
    if (status === 'unposted') conditions.push(`(se.is_posted = false OR se.is_posted IS NULL)`);

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const countR = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM shipment_expenses se
      JOIN logistics_shipments ls ON ls.id = se.shipment_id
      ${whereSql}
    `, params);

    const pc = params.length + 1;
    const dataR = await pool.query(`
      SELECT se.id AS expense_id, se.shipment_id,
        ls.shipment_number,
        se.expense_type_code, se.expense_type_name,
        set2.name_ar AS expense_type_name_ar,
        set2.category,
        se.entity_name AS vendor_name,
        se.total_amount, se.vat_amount, se.total_in_base_currency,
        se.currency_code,
        se.invoice_number,
        se.approval_status, se.is_posted,
        se.journal_entry_id, se.posted_at
      FROM shipment_expenses se
      JOIN logistics_shipments ls ON ls.id = se.shipment_id
      LEFT JOIN shipment_expense_types set2 ON set2.id = se.expense_type_id
      ${whereSql}
      ORDER BY se.created_at DESC
      LIMIT $${pc} OFFSET $${pc + 1}
    `, [...params, limit, offset]);

    res.json({
      success: true,
      data: dataR.rows,
      pagination: { total: countR.rows[0]?.total ?? 0, page, limit }
    });
  } catch (err: any) {
    console.error('shipment-accounting/journal-links error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch journal links', 500);
  }
});

export default router;
