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

const BASE_SELECT = `
  sm.id, sm.company_id, sm.code, sm.name, sm.name_ar, sm.name_en,
  sm.transport_mode, sm.default_carrier_id, sm.transit_days, sm.tracking_available,
  sm.expense_account_id, sm.is_active, sm.description_en, sm.description_ar,
  sm.cost_basis, sm.sort_order, sm.created_at, sm.updated_at
`;

const BASE_FROM = `FROM shipping_methods sm`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['(sm.is_deleted = false OR sm.is_deleted IS NULL)', 'sm.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) { where.push(`sm.company_id = $${pc}`); params.push(companyId); pc++; }

  const q = req.query;
  if (q.search) {
    where.push(`(sm.code ILIKE $${pc} OR sm.name ILIKE $${pc} OR sm.name_ar ILIKE $${pc} OR sm.name_en ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.transport_mode) { where.push(`sm.transport_mode = $${pc}`); params.push(q.transport_mode); pc++; }
  if (q.is_active !== undefined) { where.push(`sm.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sm.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sm.is_active)::int AS active,
        COUNT(*) FILTER (WHERE NOT sm.is_active)::int AS inactive,
        COUNT(DISTINCT sm.transport_mode)::int AS transport_modes,
        AVG(sm.transit_days)::numeric(10,1) AS avg_transit_days
      FROM shipping_methods sm WHERE (sm.is_deleted = false OR sm.is_deleted IS NULL) AND sm.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /filters */
router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sm.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT DISTINCT sm.transport_mode FROM shipping_methods sm
      WHERE (sm.is_deleted = false OR sm.is_deleted IS NULL) AND sm.deleted_at IS NULL ${cw}
      AND sm.transport_mode IS NOT NULL ORDER BY sm.transport_mode
    `, params);
    sendSuccess(res, { transport_modes: r.rows.map(r => r.transport_mode) });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
  }
});

/* GET / */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY sm.sort_order ASC, sm.name ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping methods', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sm.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE sm.id = $1 AND (sm.is_deleted = false OR sm.is_deleted IS NULL) AND sm.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping method', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { code, name, name_ar, name_en, transport_mode, default_carrier_id,
      transit_days, tracking_available = true, expense_account_id, is_active = true,
      description_en, description_ar, cost_basis, sort_order = 0 } = req.body;

    if (!code || !name) return sendError(res, 'VALIDATION', 'code and name are required', 400);

    const r = await pool.query(`
      INSERT INTO shipping_methods (company_id, code, name, name_ar, name_en, transport_mode,
        default_carrier_id, transit_days, tracking_available, expense_account_id, is_active,
        description_en, description_ar, cost_basis, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [companyId, code, name, name_ar || null, name_en || null, transport_mode,
      default_carrier_id || null, transit_days || null, tracking_available,
      expense_account_id || null, is_active, description_en || null, description_ar || null,
      cost_basis || null, sort_order, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Shipping method with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create shipping method', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { code, name, name_ar, name_en, transport_mode, default_carrier_id,
      transit_days, tracking_available, expense_account_id, is_active,
      description_en, description_ar, cost_basis, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $16` : '';
    const params = [code, name, name_ar || null, name_en || null, transport_mode,
      default_carrier_id || null, transit_days || null, tracking_available,
      expense_account_id || null, is_active, description_en || null, description_ar || null,
      cost_basis || null, sort_order, userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE shipping_methods SET
        code=$1, name=$2, name_ar=$3, name_en=$4, transport_mode=$5,
        default_carrier_id=$6, transit_days=$7, tracking_available=$8,
        expense_account_id=$9, is_active=$10, description_en=$11, description_ar=$12,
        cost_basis=$13, sort_order=$14, updated_by=$15, updated_at=NOW()
      WHERE id=$16 AND (is_deleted = false OR is_deleted IS NULL) AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Shipping method with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update shipping method', 500);
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
    const r = await pool.query(`UPDATE shipping_methods SET is_deleted=true, deleted_at=NOW(), deleted_by=$2 WHERE id=$1 AND (is_deleted = false OR is_deleted IS NULL) ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, { id, deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete shipping method', 500);
  }
});

export default router;
