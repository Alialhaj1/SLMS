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

const TABLE = 'shipping_agents';

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [`${TABLE}.deleted_at IS NULL`];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`${TABLE}.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(${TABLE}.name ILIKE $${pc} OR ${TABLE}.name_ar ILIKE $${pc} OR ${TABLE}.code ILIKE $${pc} OR COALESCE(${TABLE}.email,'') ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.agent_type) { where.push(`${TABLE}.agent_type = $${pc}`); params.push(q.agent_type); pc++; }
  if (q.is_active !== undefined) { where.push(`${TABLE}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM ${TABLE} WHERE deleted_at IS NULL ${cw}`, params);
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
      `SELECT * FROM ${TABLE} ${whereSql} ORDER BY name ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch freight agents', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Freight agent not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch freight agent', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name, name_ar, agent_type, email, phone, address,
      city_id, country_id, contact_person, license_number,
      services, notes, credit_limit, payment_terms_id, is_active = true } = req.body;
    if (!name) return sendError(res, 'VALIDATION', 'name is required', 400);
    const r = await pool.query(`
      INSERT INTO ${TABLE} (company_id, code, name, name_ar, agent_type, email, phone, address,
        city_id, country_id, contact_person, license_number,
        services, notes, credit_limit, payment_terms_id, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *
    `, [companyId, code || null, name, name_ar || null, agent_type || null, email || null, phone || null,
      address || null, city_id || null, country_id || null, contact_person || null, license_number || null,
      services || null, notes || null, credit_limit || null, payment_terms_id || null, is_active,
      (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create freight agent', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name, name_ar, agent_type, email, phone, address,
      city_id, country_id, contact_person, license_number,
      services, notes, credit_limit, payment_terms_id, is_active } = req.body;
    const cw = companyId ? `AND company_id = $18` : '';
    const params: any[] = [code, name, name_ar, agent_type, email, phone, address,
      city_id || null, country_id || null, contact_person, license_number,
      services, notes, credit_limit, payment_terms_id, is_active, id];
    if (companyId) params.push(companyId);
    const r = await pool.query(`
      UPDATE ${TABLE} SET code=$1, name=$2, name_ar=$3, agent_type=$4, email=$5, phone=$6,
        address=$7, city_id=$8, country_id=$9, contact_person=$10, license_number=$11,
        services=$12, notes=$13, credit_limit=$14, payment_terms_id=$15, is_active=$16,
        updated_at=NOW()
      WHERE id=$17 AND deleted_at IS NULL ${cw} RETURNING *
    `, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Freight agent not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update freight agent', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE ${TABLE} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Freight agent not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete freight agent', 500); }
});

export default router;
