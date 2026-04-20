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

const T = 'customs_statuses';

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [`${T}.deleted_at IS NULL`];
  const params: any[] = []; let pc = 1;
  if (companyId) { where.push(`${T}.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) { where.push(`(${T}.code ILIKE $${pc} OR ${T}.name_en ILIKE $${pc} OR ${T}.name_ar ILIKE $${pc})`); params.push(`%${String(q.search).trim()}%`); pc++; }
  if (q.status_category) { where.push(`${T}.status_category = $${pc}`); params.push(q.status_category); pc++; }
  if (q.is_active !== undefined) { where.push(`${T}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $1` : ''; const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(DISTINCT status_category)::int AS categories, COUNT(*) FILTER (WHERE is_initial)::int AS initial_states, COUNT(*) FILTER (WHERE is_final)::int AS final_states FROM ${T} WHERE deleted_at IS NULL ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $1` : ''; const params = companyId ? [companyId] : [];
    const cats = await pool.query(`SELECT DISTINCT status_category FROM ${T} WHERE deleted_at IS NULL ${cw} ORDER BY status_category`, params);
    sendSuccess(res, { categories: cats.rows.map(r => r.status_category) });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500); }
});

router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM ${T} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(`SELECT * FROM ${T} ${whereSql} ORDER BY sequence_order ASC, sort_order ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch customs statuses', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT * FROM ${T} WHERE id = $1 AND deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customs status not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch customs status', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, description_en, description_ar, status_category = 'declaration',
      color_hex = '#6B7280', icon, sequence_order = 0, is_initial = false, is_final = false,
      is_blocking = false, allowed_next_statuses, requires_document = false, requires_approval = false,
      auto_notify = true, sla_hours, is_active = true, sort_order = 0 } = req.body;
    if (!code || !name_en) return sendError(res, 'VALIDATION', 'code and name_en are required', 400);
    const r = await pool.query(`
      INSERT INTO ${T} (company_id, code, name_en, name_ar, description_en, description_ar,
        status_category, color_hex, icon, sequence_order, is_initial, is_final, is_blocking,
        allowed_next_statuses, requires_document, requires_approval, auto_notify, sla_hours,
        is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *
    `, [companyId, code, name_en, name_ar || null, description_en || null, description_ar || null,
      status_category, color_hex, icon || null, sequence_order, is_initial, is_final, is_blocking,
      allowed_next_statuses || null, requires_document, requires_approval, auto_notify, sla_hours || null,
      is_active, sort_order, (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Customs status with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create customs status', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, description_en, description_ar, status_category,
      color_hex, icon, sequence_order, is_initial, is_final, is_blocking,
      allowed_next_statuses, requires_document, requires_approval, auto_notify, sla_hours,
      is_active, sort_order } = req.body;
    const cw = companyId ? `AND company_id = $22` : '';
    const params = [code, name_en, name_ar, description_en, description_ar, status_category,
      color_hex, icon, sequence_order, is_initial, is_final, is_blocking,
      allowed_next_statuses, requires_document, requires_approval, auto_notify, sla_hours,
      is_active, sort_order, (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);
    const r = await pool.query(`
      UPDATE ${T} SET code=$1, name_en=$2, name_ar=$3, description_en=$4, description_ar=$5,
        status_category=$6, color_hex=$7, icon=$8, sequence_order=$9, is_initial=$10, is_final=$11,
        is_blocking=$12, allowed_next_statuses=$13, requires_document=$14, requires_approval=$15,
        auto_notify=$16, sla_hours=$17, is_active=$18, sort_order=$19, updated_by=$20, updated_at=NOW()
      WHERE id=$21 AND deleted_at IS NULL ${cw} RETURNING *
    `, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customs status not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate code', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update customs status', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    // Prevent deleting system statuses
    const check = await pool.query(`SELECT is_system FROM ${T} WHERE id = $1`, [id]);
    if (check.rows[0]?.is_system) return sendError(res, 'FORBIDDEN', 'Cannot delete system status', 403);
    const r = await pool.query(`UPDATE ${T} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customs status not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete customs status', 500); }
});

export default router;
