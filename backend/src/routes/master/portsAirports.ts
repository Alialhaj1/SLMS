import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();
function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(query.limit ?? '25'), 10) || 25));
  return { page, limit, offset: (page - 1) * limit };
}
function getCompanyId(req: Request): number | undefined { return (req as any).companyId || (req as any).user?.company_id; }

const T = 'ports';

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [`${T}.deleted_at IS NULL`]; const params: any[] = []; let pc = 1;
  if (companyId) { where.push(`${T}.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) { where.push(`(${T}.name ILIKE $${pc} OR ${T}.name_ar ILIKE $${pc} OR COALESCE(${T}.name_en, '') ILIKE $${pc} OR ${T}.code ILIKE $${pc} OR COALESCE(${T}.un_locode, '') ILIKE $${pc})`); params.push(`%${String(q.search).trim()}%`); pc++; }
  if (q.port_type) { where.push(`${T}.port_type = $${pc}`); params.push(q.port_type); pc++; }
  if (q.country_id) { where.push(`${T}.country_id = $${pc}`); params.push(Number(q.country_id)); pc++; }
  if (q.is_active !== undefined) { where.push(`${T}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $1` : ''; const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(DISTINCT port_type)::int AS types, COUNT(DISTINCT country_id)::int AS countries FROM ${T} WHERE deleted_at IS NULL ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $1` : ''; const params = companyId ? [companyId] : [];
    const types = await pool.query(`SELECT DISTINCT port_type FROM ${T} WHERE deleted_at IS NULL AND port_type IS NOT NULL ${cw} ORDER BY port_type`, params);
    sendSuccess(res, { portTypes: types.rows.map(r => r.port_type) });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500); }
});

router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM ${T} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(`SELECT * FROM ${T} ${whereSql} ORDER BY sort_order ASC, name ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch ports', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT * FROM ${T} WHERE id = $1 AND deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Port not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch port', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name, name_en, name_ar, port_type, country_id, city_id,
      un_locode, iata_code, latitude, longitude, timezone,
      handles_fcl = true, handles_lcl = true, handles_bulk = false, handles_roro = false,
      handles_dangerous = false, free_zone = false, annual_capacity_teu,
      contact_phone, contact_email, website, address, operating_hours, is_international = false,
      is_active = true, sort_order = 0 } = req.body;
    if (!name && !name_en) return sendError(res, 'VALIDATION', 'name is required', 400);
    const r = await pool.query(`
      INSERT INTO ${T} (company_id, code, name, name_en, name_ar, port_type, country_id, city_id,
        un_locode, iata_code, latitude, longitude, timezone,
        handles_fcl, handles_lcl, handles_bulk, handles_roro, handles_dangerous, free_zone,
        annual_capacity_teu, contact_phone, contact_email, website, address, operating_hours,
        is_international, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *
    `, [companyId, code || null, name || name_en, name_en || name || null, name_ar || null,
      port_type || null, country_id || null, city_id || null,
      un_locode || null, iata_code || null, latitude || null, longitude || null, timezone || null,
      handles_fcl, handles_lcl, handles_bulk, handles_roro, handles_dangerous, free_zone,
      annual_capacity_teu || null, contact_phone || null, contact_email || null, website || null,
      address || null, operating_hours || null, is_international, is_active, sort_order,
      (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create port', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name, name_en, name_ar, port_type, country_id, city_id,
      un_locode, iata_code, latitude, longitude, timezone,
      handles_fcl, handles_lcl, handles_bulk, handles_roro, handles_dangerous, free_zone,
      annual_capacity_teu, contact_phone, contact_email, website, address, operating_hours,
      is_international, is_active, sort_order } = req.body;
    const cw = companyId ? `AND company_id = $28` : '';
    const params: any[] = [code, name || name_en, name_en, name_ar, port_type,
      country_id || null, city_id || null, un_locode, iata_code,
      latitude, longitude, timezone, handles_fcl, handles_lcl, handles_bulk, handles_roro,
      handles_dangerous, free_zone, annual_capacity_teu, contact_phone, contact_email, website, address,
      operating_hours, is_international, is_active, id];
    if (companyId) params.push(companyId);
    const r = await pool.query(`
      UPDATE ${T} SET code=$1, name=$2, name_en=$3, name_ar=$4, port_type=$5,
        country_id=$6, city_id=$7, un_locode=$8, iata_code=$9,
        latitude=$10, longitude=$11, timezone=$12,
        handles_fcl=$13, handles_lcl=$14, handles_bulk=$15, handles_roro=$16,
        handles_dangerous=$17, free_zone=$18, annual_capacity_teu=$19,
        contact_phone=$20, contact_email=$21, website=$22, address=$23,
        operating_hours=$24, is_international=$25, is_active=$26,
        updated_at=NOW()
      WHERE id=$27 AND deleted_at IS NULL ${cw} RETURNING *
    `, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Port not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update port', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req); const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE ${T} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Port not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete port', 500); }
});

export default router;
