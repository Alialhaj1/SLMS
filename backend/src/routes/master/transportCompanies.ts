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
  tc.id, tc.company_id, tc.code, tc.name_en, tc.name_ar,
  tc.company_type, tc.license_number, tc.tax_number,
  tc.contact_person, tc.phone, tc.mobile, tc.fax, tc.email, tc.website,
  tc.address_en, tc.address_ar, tc.city_id, tc.country_id,
  tc.fleet_size, tc.service_coverage, tc.specializations,
  tc.insurance_provider_id, tc.insurance_policy_number, tc.insurance_expiry,
  tc.contract_start, tc.contract_end,
  tc.payment_terms_days, tc.credit_limit,
  tc.rating, tc.reliability_score, tc.certifications, tc.operating_regions,
  tc.notes, tc.is_active, tc.sort_order,
  tc.created_at, tc.updated_at
`;

const BASE_FROM = `FROM transport_companies tc`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['tc.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) { where.push(`tc.company_id = $${pc}`); params.push(companyId); pc++; }

  const q = req.query;
  if (q.search) {
    where.push(`(tc.code ILIKE $${pc} OR tc.name_en ILIKE $${pc} OR tc.name_ar ILIKE $${pc} OR tc.contact_person ILIKE $${pc} OR tc.email ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.company_type) { where.push(`tc.company_type = $${pc}`); params.push(q.company_type); pc++; }
  if (q.service_coverage) { where.push(`tc.service_coverage = $${pc}`); params.push(q.service_coverage); pc++; }
  if (q.is_active !== undefined) { where.push(`tc.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND tc.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tc.is_active)::int AS active,
        COUNT(*) FILTER (WHERE NOT tc.is_active)::int AS inactive,
        COUNT(DISTINCT tc.company_type)::int AS types,
        COALESCE(SUM(tc.fleet_size), 0)::int AS total_fleet,
        ROUND(AVG(tc.rating)::numeric, 1) AS avg_rating
      FROM transport_companies tc WHERE tc.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('transport-companies/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /filters */
router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND tc.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const [types, coverages] = await Promise.all([
      pool.query(`SELECT DISTINCT tc.company_type FROM transport_companies tc WHERE tc.deleted_at IS NULL ${cw} ORDER BY tc.company_type`, params),
      pool.query(`SELECT DISTINCT tc.service_coverage FROM transport_companies tc WHERE tc.deleted_at IS NULL ${cw} ORDER BY tc.service_coverage`, params),
    ]);
    sendSuccess(res, { types: types.rows.map(r => r.company_type), coverages: coverages.rows.map(r => r.service_coverage) });
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
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY tc.sort_order ASC, tc.name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    console.error('transport-companies list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch transport companies', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND tc.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE tc.id = $1 AND tc.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch transport company', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, company_type = 'land_transport', license_number, tax_number,
      contact_person, phone, mobile, fax, email, website, address_en, address_ar,
      city_id, country_id, fleet_size = 0, service_coverage = 'domestic',
      specializations, insurance_provider_id, insurance_policy_number, insurance_expiry,
      contract_start, contract_end, payment_terms_days = 30, credit_limit = 0,
      rating = 0, certifications, operating_regions, notes, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name_en) return sendError(res, 'VALIDATION', 'code and name_en are required', 400);

    const r = await pool.query(`
      INSERT INTO transport_companies (company_id, code, name_en, name_ar, company_type, license_number, tax_number,
        contact_person, phone, mobile, fax, email, website, address_en, address_ar,
        city_id, country_id, fleet_size, service_coverage, specializations,
        insurance_provider_id, insurance_policy_number, insurance_expiry,
        contract_start, contract_end, payment_terms_days, credit_limit,
        rating, certifications, operating_regions, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
      RETURNING *
    `, [companyId, code, name_en, name_ar || null, company_type, license_number || null, tax_number || null,
      contact_person || null, phone || null, mobile || null, fax || null, email || null, website || null,
      address_en || null, address_ar || null, city_id || null, country_id || null, fleet_size,
      service_coverage, specializations || null, insurance_provider_id || null,
      insurance_policy_number || null, insurance_expiry || null, contract_start || null, contract_end || null,
      payment_terms_days, credit_limit, rating, certifications || null, operating_regions || null,
      notes || null, is_active, sort_order, (req as any).user?.userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('transport-companies POST error:', err);
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Transport company with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create transport company', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, company_type, license_number, tax_number,
      contact_person, phone, mobile, fax, email, website, address_en, address_ar,
      city_id, country_id, fleet_size, service_coverage, specializations,
      insurance_provider_id, insurance_policy_number, insurance_expiry,
      contract_start, contract_end, payment_terms_days, credit_limit,
      rating, certifications, operating_regions, notes, is_active, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $35` : '';
    const params = [code, name_en, name_ar, company_type, license_number, tax_number,
      contact_person, phone, mobile, fax, email, website, address_en, address_ar,
      city_id || null, country_id || null, fleet_size, service_coverage, specializations,
      insurance_provider_id || null, insurance_policy_number, insurance_expiry || null,
      contract_start || null, contract_end || null, payment_terms_days, credit_limit,
      rating, certifications, operating_regions, notes, is_active, sort_order,
      (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE transport_companies SET
        code=$1, name_en=$2, name_ar=$3, company_type=$4, license_number=$5, tax_number=$6,
        contact_person=$7, phone=$8, mobile=$9, fax=$10, email=$11, website=$12,
        address_en=$13, address_ar=$14, city_id=$15, country_id=$16, fleet_size=$17,
        service_coverage=$18, specializations=$19, insurance_provider_id=$20,
        insurance_policy_number=$21, insurance_expiry=$22, contract_start=$23, contract_end=$24,
        payment_terms_days=$25, credit_limit=$26, rating=$27, certifications=$28,
        operating_regions=$29, notes=$30, is_active=$31, sort_order=$32,
        updated_by=$33, updated_at=NOW()
      WHERE id=$34 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport company not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate code', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update transport company', 500);
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
    const r = await pool.query(`UPDATE transport_companies SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport company not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete transport company', 500);
  }
});

export default router;
