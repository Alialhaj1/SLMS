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

const BASE_SELECT = `
  vt.id, vt.company_id, vt.code, vt.name_en, vt.name_ar,
  vt.category, vt.max_weight_tons, vt.max_volume_cbm,
  vt.length_m, vt.width_m, vt.height_m,
  vt.fuel_type, vt.axle_count, vt.is_refrigerated,
  vt.temperature_range_min, vt.temperature_range_max,
  vt.requires_special_license, vt.license_type,
  vt.icon, vt.color_hex,
  vt.description_en, vt.description_ar, vt.notes,
  vt.is_active, vt.sort_order,
  vt.created_at, vt.updated_at
`;

const BASE_FROM = `FROM vehicle_types vt`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['vt.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`vt.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(vt.code ILIKE $${pc} OR vt.name_en ILIKE $${pc} OR vt.name_ar ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.category) { where.push(`vt.category = $${pc}`); params.push(q.category); pc++; }
  if (q.is_refrigerated !== undefined) { where.push(`vt.is_refrigerated = $${pc}`); params.push(q.is_refrigerated === 'true'); pc++; }
  if (q.is_active !== undefined) { where.push(`vt.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND vt.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE vt.is_active)::int AS active,
        COUNT(*) FILTER (WHERE vt.is_refrigerated)::int AS refrigerated,
        COUNT(DISTINCT vt.category)::int AS categories
      FROM vehicle_types vt WHERE vt.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND vt.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const cats = await pool.query(`SELECT DISTINCT vt.category FROM vehicle_types vt WHERE vt.deleted_at IS NULL ${cw} ORDER BY vt.category`, params);
    sendSuccess(res, { categories: cats.rows.map(r => r.category) });
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
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY vt.sort_order ASC, vt.name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vehicle types', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND vt.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE vt.id = $1 AND vt.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vehicle type', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, category = 'truck', max_weight_tons, max_volume_cbm,
      length_m, width_m, height_m, fuel_type = 'diesel', axle_count,
      is_refrigerated = false, temperature_range_min, temperature_range_max,
      requires_special_license = false, license_type, icon, color_hex,
      description_en, description_ar, notes, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name_en) return sendError(res, 'VALIDATION', 'code and name_en are required', 400);

    const r = await pool.query(`
      INSERT INTO vehicle_types (company_id, code, name_en, name_ar, category,
        max_weight_tons, max_volume_cbm, length_m, width_m, height_m,
        fuel_type, axle_count, is_refrigerated, temperature_range_min, temperature_range_max,
        requires_special_license, license_type, icon, color_hex,
        description_en, description_ar, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
    `, [companyId, code, name_en, name_ar || null, category,
      max_weight_tons || null, max_volume_cbm || null, length_m || null, width_m || null, height_m || null,
      fuel_type, axle_count || null, is_refrigerated, temperature_range_min || null, temperature_range_max || null,
      requires_special_license, license_type || null, icon || null, color_hex || null,
      description_en || null, description_ar || null, notes || null, is_active, sort_order,
      (req as any).user?.userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Vehicle type with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create vehicle type', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, category, max_weight_tons, max_volume_cbm,
      length_m, width_m, height_m, fuel_type, axle_count,
      is_refrigerated, temperature_range_min, temperature_range_max,
      requires_special_license, license_type, icon, color_hex,
      description_en, description_ar, notes, is_active, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $26` : '';
    const params = [code, name_en, name_ar, category, max_weight_tons || null, max_volume_cbm || null,
      length_m || null, width_m || null, height_m || null, fuel_type, axle_count || null,
      is_refrigerated, temperature_range_min || null, temperature_range_max || null,
      requires_special_license, license_type, icon, color_hex,
      description_en, description_ar, notes, is_active, sort_order,
      (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE vehicle_types SET
        code=$1, name_en=$2, name_ar=$3, category=$4,
        max_weight_tons=$5, max_volume_cbm=$6, length_m=$7, width_m=$8, height_m=$9,
        fuel_type=$10, axle_count=$11, is_refrigerated=$12,
        temperature_range_min=$13, temperature_range_max=$14,
        requires_special_license=$15, license_type=$16, icon=$17, color_hex=$18,
        description_en=$19, description_ar=$20, notes=$21, is_active=$22, sort_order=$23,
        updated_by=$24, updated_at=NOW()
      WHERE id=$25 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate code', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update vehicle type', 500);
  }
});

/* DELETE /:id */
router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE vehicle_types SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle type not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete vehicle type', 500);
  }
});

export default router;
