import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

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

const TABLE = 'shipping_methods';
const SOFT_DELETE_FILTER = `(${TABLE}.deleted_at IS NULL AND (${TABLE}.is_deleted IS NULL OR ${TABLE}.is_deleted = false))`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [SOFT_DELETE_FILTER];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`${TABLE}.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(COALESCE(${TABLE}.name_en, ${TABLE}.name) ILIKE $${pc} OR ${TABLE}.name_ar ILIKE $${pc} OR ${TABLE}.code ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.is_active !== undefined) { where.push(`${TABLE}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM ${TABLE} WHERE ${SOFT_DELETE_FILTER} ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM ${TABLE} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT *, COALESCE(name_en, name) AS name_en FROM ${TABLE} ${whereSql} ORDER BY sort_order ASC, COALESCE(name_en, name) ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping methods', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT *, COALESCE(name_en, name) AS name_en FROM ${TABLE} WHERE id = $1 AND ${SOFT_DELETE_FILTER} ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping method', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name, name_en, name_ar, description_en, description_ar, cost_basis,
      notes, is_active = true, sort_order = 0 } = req.body;
    if (!name && !name_en) return sendError(res, 'VALIDATION', 'name is required', 400);
    const theName = name_en || name;
    const r = await pool.query(`
      INSERT INTO ${TABLE} (company_id, code, name, name_en, name_ar, description_en, description_ar,
        cost_basis, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [companyId, code || null, theName, theName, name_ar || null, description_en || null,
      description_ar || null, cost_basis || null, notes || null, is_active, sort_order,
      (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create shipping method', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name, name_en, name_ar, description_en, description_ar, cost_basis,
      notes, is_active, sort_order } = req.body;
    const theName = name_en || name;
    const cw = companyId ? `AND company_id = $13` : '';
    const params = [code, theName, theName, name_ar, description_en, description_ar,
      cost_basis, notes, is_active, sort_order, (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);
    const r = await pool.query(`
      UPDATE ${TABLE} SET code=$1, name=$2, name_en=$3, name_ar=$4, description_en=$5,
        description_ar=$6, cost_basis=$7, notes=$8, is_active=$9, sort_order=$10,
        updated_by=$11, updated_at=NOW()
      WHERE id=$12 AND ${SOFT_DELETE_FILTER} ${cw} RETURNING *
    `, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update shipping method', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE ${TABLE} SET deleted_at = NOW(), is_deleted = true WHERE id = $1 AND ${SOFT_DELETE_FILTER} ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping method not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete shipping method', 500); }
});

export default router;
