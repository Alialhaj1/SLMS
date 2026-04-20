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

const T = 'insurance_companies';

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = [`${T}.deleted_at IS NULL`]; const params: any[] = []; let pc = 1;
  if (companyId) { where.push(`(${T}.company_id = $${pc} OR ${T}.company_id IS NULL)`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) { where.push(`(${T}.name ILIKE $${pc} OR ${T}.name_ar ILIKE $${pc} OR COALESCE(${T}.name_en,'') ILIKE $${pc} OR ${T}.code ILIKE $${pc} OR COALESCE(${T}.email,'') ILIKE $${pc})`); params.push(`%${String(q.search).trim()}%`); pc++; }
  if (q.country_id) { where.push(`${T}.country_id = $${pc}`); params.push(Number(q.country_id)); pc++; }
  if (q.is_active !== undefined) { where.push(`${T}.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND (company_id = $1 OR company_id IS NULL)` : ''; const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(DISTINCT country_id)::int AS countries FROM ${T} WHERE deleted_at IS NULL ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND (company_id = $1 OR company_id IS NULL)` : ''; const params = companyId ? [companyId] : [];
    const countries = await pool.query(`SELECT DISTINCT country_id FROM ${T} WHERE deleted_at IS NULL AND country_id IS NOT NULL ${cw} ORDER BY country_id`, params);
    sendSuccess(res, { countryIds: countries.rows.map(r => r.country_id) });
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
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch insurance companies', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`SELECT * FROM ${T} WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch insurance company', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name, name_en, name_ar, contact_person, phone, email, address,
      policy_number_prefix, website, country_id, city_id, rating,
      license_number, specializations, notes, is_active = true, sort_order = 0 } = req.body;
    if (!name && !name_en) return sendError(res, 'VALIDATION', 'name is required', 400);
    const r = await pool.query(`
      INSERT INTO ${T} (company_id, code, name, name_en, name_ar, contact_person, phone, email, address,
        policy_number_prefix, website, country_id, city_id, rating,
        license_number, specializations, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *
    `, [companyId, code || null, name || name_en, name_en || null, name_ar || null,
      contact_person || null, phone || null, email || null, address || null,
      policy_number_prefix || null, website || null, country_id || null, city_id || null, rating || null,
      license_number || null, specializations || null, notes || null, is_active, sort_order,
      (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create insurance company', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const { code, name, name_en, name_ar, contact_person, phone, email, address,
      policy_number_prefix, website, country_id, city_id, rating,
      license_number, specializations, notes, is_active, sort_order } = req.body;
    const r = await pool.query(`
      UPDATE ${T} SET code=$1, name=$2, name_en=$3, name_ar=$4, contact_person=$5, phone=$6, email=$7,
        address=$8, policy_number_prefix=$9, website=$10, country_id=$11, city_id=$12, rating=$13,
        license_number=$14, specializations=$15, notes=$16, is_active=$17, sort_order=$18, updated_at=NOW()
      WHERE id=$19 AND deleted_at IS NULL RETURNING *
    `, [code, name || name_en, name_en, name_ar, contact_person, phone, email,
      address, policy_number_prefix, website, country_id || null, city_id || null, rating,
      license_number, specializations, notes, is_active, sort_order, id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update insurance company', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`UPDATE ${T} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete insurance company', 500); }
});

export default router;

router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND (company_id = $1 OR company_id IS NULL)` : ''; const params = companyId ? [companyId] : [];
    const r = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(DISTINCT country_id)::int AS countries FROM ${T} WHERE deleted_at IS NULL ${cw}`, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500); }
});

router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req); const cw = companyId ? `AND (company_id = $1 OR company_id IS NULL)` : ''; const params = companyId ? [companyId] : [];
    const countries = await pool.query(`SELECT DISTINCT country_id FROM ${T} WHERE deleted_at IS NULL AND country_id IS NOT NULL ${cw} ORDER BY country_id`, params);
    sendSuccess(res, { countryIds: countries.rows.map(r => r.country_id) });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500); }
});

router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM ${T} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(`SELECT * FROM ${T} ${whereSql} ORDER BY sort_order ASC, name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch insurance companies', 500); }
});

router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`SELECT * FROM ${T} WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to fetch insurance company', 500); }
});

router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, license_number, tax_number,
      contact_person, contact_phone, contact_email, website, address,
      rating, financial_strength_rating, max_coverage_amount, default_currency,
      specialties, offered_coverage_types,
      notes, is_active = true, sort_order = 0 } = req.body;
    if (!name_en) return sendError(res, 'VALIDATION', 'name_en is required', 400);
    const r = await pool.query(`
      INSERT INTO ${T} (company_id, code, name_en, name_ar, description_en, description_ar,
        country_id, city_id, license_number, tax_number,
        contact_person, contact_phone, contact_email, website, address,
        rating, financial_strength_rating, max_coverage_amount, default_currency,
        specialties, offered_coverage_types,
        notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING *
    `, [companyId, code || null, name_en, name_ar || null, description_en || null, description_ar || null,
      country_id || null, city_id || null, license_number || null, tax_number || null,
      contact_person || null, contact_phone || null, contact_email || null, website || null, address || null,
      rating || null, financial_strength_rating || null, max_coverage_amount || null, default_currency || null,
      specialties || null, offered_coverage_types || null,
      notes || null, is_active, sort_order, (req as any).user?.userId || null]);
    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create insurance company', 500);
  }
});

router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const { code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, license_number, tax_number,
      contact_person, contact_phone, contact_email, website, address,
      rating, financial_strength_rating, max_coverage_amount, default_currency,
      specialties, offered_coverage_types,
      notes, is_active, sort_order } = req.body;
    const r = await pool.query(`
      UPDATE ${T} SET code=$1, name_en=$2, name_ar=$3, description_en=$4, description_ar=$5,
        country_id=$6, city_id=$7, license_number=$8, tax_number=$9,
        contact_person=$10, contact_phone=$11, contact_email=$12, website=$13, address=$14,
        rating=$15, financial_strength_rating=$16, max_coverage_amount=$17, default_currency=$18,
        specialties=$19, offered_coverage_types=$20,
        notes=$21, is_active=$22, sort_order=$23, updated_at=NOW()
      WHERE id=$24 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, license_number, tax_number,
      contact_person, contact_phone, contact_email, website, address,
      rating, financial_strength_rating, max_coverage_amount, default_currency,
      specialties, offered_coverage_types,
      notes, is_active, sort_order, id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update insurance company', 500);
  }
});

router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const r = await pool.query(`UPDATE ${T} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Insurance company not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete insurance company', 500); }
});

export default router;
