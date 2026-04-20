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

const T = 'container_types';

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [`${T}.deleted_at IS NULL`]; const params: any[] = []; let pc = 1;
  if (companyId) { where.push(`(${T}.company_id = $${pc} OR ${T}.company_id IS NULL)`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) { where.push(`(${T}.name_en ILIKE $${pc} OR ${T}.name_ar ILIKE $${pc} OR ${T}.code ILIKE $${pc})`); params.push(`%${String(q.search).trim()}%`); pc++; }
  if (q.is_refrigerated !== undefined) { where.push(`${T}.is_refrigerated = $${pc}`); params.push(q.is_refrigerated === 'true'); pc++; }
  if (q.is_active !== undefined) { where.push(`${T}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND (company_id = $1 OR company_id IS NULL)` : ''; const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(*) FILTER (WHERE is_refrigerated = true)::int AS refrigerated FROM ${T} WHERE deleted_at IS NULL ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM ${T} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(`SELECT * FROM ${T} ${whereSql} ORDER BY sort_order ASC, name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch container types', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`SELECT * FROM ${T} WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch container type', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, description_en, description_ar,
      length_ft, external_length_mm, external_width_mm, external_height_mm,
      internal_length_mm, internal_width_mm, internal_height_mm,
      tare_weight_kg, max_payload_kg, internal_volume_m3,
      is_refrigerated = false, is_open_top = false, is_flat_rack = false, is_tank = false,
      teu = 1, iso_code, notes, is_active = true, sort_order = 0 } = req.body;
    if (!name_en) return sendError(res, 'VALIDATION', 'name_en is required', 400);
    const r = await pool.query(`
      INSERT INTO ${T} (company_id, code, name_en, name_ar, description_en, description_ar,
        length_ft, external_length_mm, external_width_mm, external_height_mm,
        internal_length_mm, internal_width_mm, internal_height_mm,
        tare_weight_kg, max_payload_kg, internal_volume_m3,
        is_refrigerated, is_open_top, is_flat_rack, is_tank, teu, iso_code,
        notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *
    `, [companyId, code || null, name_en, name_ar || null, description_en || null, description_ar || null,
      length_ft || null, external_length_mm || null, external_width_mm || null, external_height_mm || null,
      internal_length_mm || null, internal_width_mm || null, internal_height_mm || null,
      tare_weight_kg || null, max_payload_kg || null, internal_volume_m3 || null,
      is_refrigerated, is_open_top, is_flat_rack, is_tank, teu, iso_code || null,
      notes || null, is_active, sort_order, (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create container type', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const { code, name_en, name_ar, description_en, description_ar,
      length_ft, external_length_mm, external_width_mm, external_height_mm,
      internal_length_mm, internal_width_mm, internal_height_mm,
      tare_weight_kg, max_payload_kg, internal_volume_m3,
      is_refrigerated, is_open_top, is_flat_rack, is_tank, teu, iso_code,
      notes, is_active, sort_order } = req.body;
    const r = await pool.query(`
      UPDATE ${T} SET code=$1, name_en=$2, name_ar=$3, description_en=$4, description_ar=$5,
        length_ft=$6, external_length_mm=$7, external_width_mm=$8, external_height_mm=$9,
        internal_length_mm=$10, internal_width_mm=$11, internal_height_mm=$12,
        tare_weight_kg=$13, max_payload_kg=$14, internal_volume_m3=$15,
        is_refrigerated=$16, is_open_top=$17, is_flat_rack=$18, is_tank=$19, teu=$20, iso_code=$21,
        notes=$22, is_active=$23, sort_order=$24, updated_at=NOW()
      WHERE id=$25 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description_en, description_ar,
      length_ft, external_length_mm, external_width_mm, external_height_mm,
      internal_length_mm, internal_width_mm, internal_height_mm,
      tare_weight_kg, max_payload_kg, internal_volume_m3,
      is_refrigerated, is_open_top, is_flat_rack, is_tank, teu, iso_code,
      notes, is_active, sort_order, id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update container type', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`UPDATE ${T} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container type not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete container type', 500); }
});

export default router;
