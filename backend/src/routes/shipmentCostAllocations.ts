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

const ALLOCATION_METHODS = ['value', 'weight', 'volume', 'quantity', 'equal', 'manual'];

const BASE_SELECT = `
  sca.id, sca.company_id, sca.shipment_id, sca.expense_id, sca.cost_id,
  sca.item_id, sca.item_code, sca.item_name, sca.allocation_method,
  sca.allocation_basis, sca.allocation_percentage, sca.allocated_amount,
  sca.currency_id, sca.allocated_amount_base, sca.is_posted, sca.posted_at,
  sca.journal_entry_id, sca.notes, sca.created_at, sca.updated_at,
  cur.code AS currency_code,
  ls.shipment_number
`;

const BASE_FROM = `
  FROM shipment_cost_allocations sca
  LEFT JOIN currencies cur ON cur.id = sca.currency_id
  LEFT JOIN logistics_shipments ls ON ls.id = sca.shipment_id
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['sca.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) { where.push(`sca.company_id = $${pc}`); params.push(companyId); pc++; }

  const q = req.query;
  if (q.shipment_id) { where.push(`sca.shipment_id = $${pc}`); params.push(Number(q.shipment_id)); pc++; }
  if (q.expense_id) { where.push(`sca.expense_id = $${pc}`); params.push(Number(q.expense_id)); pc++; }
  if (q.item_id) { where.push(`sca.item_id = $${pc}`); params.push(Number(q.item_id)); pc++; }
  if (q.allocation_method) { where.push(`sca.allocation_method = $${pc}`); params.push(q.allocation_method); pc++; }
  if (q.is_posted !== undefined) { where.push(`sca.is_posted = $${pc}`); params.push(q.is_posted === 'true'); pc++; }
  if (q.search) {
    where.push(`(sca.item_code ILIKE $${pc} OR sca.item_name ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sca.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sca.is_posted)::int AS posted,
        COUNT(*) FILTER (WHERE NOT sca.is_posted)::int AS unposted,
        COUNT(DISTINCT sca.shipment_id)::int AS shipments,
        COUNT(DISTINCT sca.item_id)::int AS items,
        COALESCE(SUM(sca.allocated_amount), 0)::numeric AS total_allocated,
        COALESCE(SUM(sca.allocated_amount_base), 0)::numeric AS total_allocated_base
      FROM shipment_cost_allocations sca WHERE sca.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-cost-allocations/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /allocation-methods */
router.get('/allocation-methods', authenticate, async (_req: Request, res: Response) => {
  sendSuccess(res, ALLOCATION_METHODS.map(m => ({ value: m, label: m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })));
});

/* GET / */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY sca.created_at DESC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    console.error('shipment-cost-allocations list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch cost allocations', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sca.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE sca.id = $1 AND sca.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Cost allocation not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch cost allocation', 500);
  }
});

/* POST / - Create single allocation */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { shipment_id, expense_id, cost_id, item_id, item_code, item_name,
      allocation_method = 'value', allocation_basis = 0, allocation_percentage = 0,
      allocated_amount = 0, currency_id, allocated_amount_base = 0, notes } = req.body;

    if (!shipment_id) return sendError(res, 'VALIDATION', 'shipment_id is required', 400);
    if (!ALLOCATION_METHODS.includes(allocation_method)) return sendError(res, 'VALIDATION', `Invalid allocation_method`, 400);

    const r = await pool.query(`
      INSERT INTO shipment_cost_allocations (company_id, shipment_id, expense_id, cost_id,
        item_id, item_code, item_name, allocation_method, allocation_basis, allocation_percentage,
        allocated_amount, currency_id, allocated_amount_base, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [companyId, shipment_id, expense_id || null, cost_id || null, item_id || null,
      item_code || null, item_name || null, allocation_method, allocation_basis,
      allocation_percentage, allocated_amount, currency_id || null, allocated_amount_base,
      notes || null, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-cost-allocations POST error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create cost allocation', 500);
  }
});

/* POST /auto-allocate - Auto-allocate an expense across shipment items */
router.post('/auto-allocate', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { shipment_id, expense_id, allocation_method = 'value', currency_id } = req.body;

    if (!shipment_id) return sendError(res, 'VALIDATION', 'shipment_id is required', 400);

    // Get shipment items
    const itemsR = await pool.query(`
      SELECT lsi.id AS item_id, lsi.item_code, lsi.description AS item_name,
        lsi.quantity, lsi.unit_price, (lsi.quantity * lsi.unit_price) AS total_value
      FROM logistics_shipment_items lsi
      WHERE lsi.shipment_id = $1 AND lsi.deleted_at IS NULL
    `, [shipment_id]);

    if (itemsR.rows.length === 0) return sendError(res, 'VALIDATION', 'No items found for this shipment', 400);

    // Get expense amount to allocate
    let totalToAllocate = 0;
    if (expense_id) {
      const expR = await pool.query(`SELECT total_amount FROM shipment_expenses WHERE id = $1 AND deleted_at IS NULL`, [expense_id]);
      if (expR.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Expense not found', 404);
      totalToAllocate = parseFloat(expR.rows[0].total_amount);
    }

    const items = itemsR.rows;
    let totalBasis = 0;
    if (allocation_method === 'value') totalBasis = items.reduce((s: number, i: any) => s + parseFloat(i.total_value || 0), 0);
    else if (allocation_method === 'quantity') totalBasis = items.reduce((s: number, i: any) => s + parseFloat(i.quantity || 0), 0);
    else totalBasis = items.length; // equal

    const allocations = [];
    for (const item of items) {
      let basis = 0;
      if (allocation_method === 'value') basis = parseFloat(item.total_value || 0);
      else if (allocation_method === 'quantity') basis = parseFloat(item.quantity || 0);
      else basis = 1;

      const pct = totalBasis > 0 ? (basis / totalBasis) * 100 : 0;
      const amount = totalToAllocate > 0 ? totalToAllocate * (pct / 100) : 0;

      const r = await pool.query(`
        INSERT INTO shipment_cost_allocations (company_id, shipment_id, expense_id, item_id, item_code, item_name,
          allocation_method, allocation_basis, allocation_percentage, allocated_amount, currency_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `, [companyId, shipment_id, expense_id || null, item.item_id, item.item_code, item.item_name,
        allocation_method, basis, pct, amount, currency_id || null, userId || null]);

      allocations.push(r.rows[0]);
    }

    sendSuccess(res, { allocations, count: allocations.length, total_allocated: totalToAllocate }, 201);
  } catch (err: any) {
    console.error('shipment-cost-allocations/auto-allocate error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to auto-allocate costs', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { allocation_method, allocation_basis, allocation_percentage, allocated_amount,
      currency_id, allocated_amount_base, notes } = req.body;

    const cw = companyId ? `AND company_id = $9` : '';
    const params = [allocation_method, allocation_basis, allocation_percentage,
      allocated_amount, currency_id || null, allocated_amount_base, notes || null, userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE shipment_cost_allocations SET
        allocation_method=$1, allocation_basis=$2, allocation_percentage=$3,
        allocated_amount=$4, currency_id=$5, allocated_amount_base=$6,
        notes=$7, updated_by=$8, updated_at=NOW()
      WHERE id=$9 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Cost allocation not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-cost-allocations PUT error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update cost allocation', 500);
  }
});

/* DELETE /:id */
router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const cw = companyId ? `AND company_id = $3` : '';
    const params: any[] = [id, userId || null]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE shipment_cost_allocations SET deleted_at=NOW(), updated_by=$2 WHERE id=$1 AND deleted_at IS NULL AND is_posted = false ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Cost allocation not found or already posted', 404);
    sendSuccess(res, { id, deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete cost allocation', 500);
  }
});

export default router;
