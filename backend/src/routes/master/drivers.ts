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
  dr.id, dr.company_id, dr.code, dr.full_name_en, dr.full_name_ar,
  dr.id_number, dr.id_type, dr.nationality_id,
  dr.phone, dr.phone2, dr.email,
  dr.emergency_contact_name, dr.emergency_contact_phone,
  dr.license_number, dr.license_type, dr.license_expiry, dr.license_issuing_country_id,
  dr.transport_company_id, tc.name_en AS transport_company_name_en,
  dr.assigned_vehicle_id, v.plate_number AS vehicle_plate,
  dr.current_status, dr.hire_date, dr.contract_end,
  dr.daily_rate, dr.per_trip_rate,
  dr.total_trips, dr.total_km, dr.rating,
  dr.certifications, dr.violations_count,
  dr.blood_type, dr.medical_clearance_expiry,
  dr.photo_url, dr.notes,
  dr.is_active, dr.sort_order, dr.created_at, dr.updated_at
`;

const BASE_FROM = `
  FROM drivers dr
  LEFT JOIN transport_companies tc ON tc.id = dr.transport_company_id AND tc.deleted_at IS NULL
  LEFT JOIN vehicles v ON v.id = dr.assigned_vehicle_id AND v.deleted_at IS NULL
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['dr.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`dr.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(dr.code ILIKE $${pc} OR dr.full_name_en ILIKE $${pc} OR dr.full_name_ar ILIKE $${pc} OR dr.id_number ILIKE $${pc} OR dr.phone ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.transport_company_id) { where.push(`dr.transport_company_id = $${pc}`); params.push(Number(q.transport_company_id)); pc++; }
  if (q.current_status) { where.push(`dr.current_status = $${pc}`); params.push(q.current_status); pc++; }
  if (q.license_type) { where.push(`dr.license_type = $${pc}`); params.push(q.license_type); pc++; }
  if (q.is_active !== undefined) { where.push(`dr.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND dr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE dr.is_active)::int AS active,
        COUNT(*) FILTER (WHERE dr.current_status = 'available')::int AS available,
        COUNT(*) FILTER (WHERE dr.current_status = 'on_trip')::int AS on_trip,
        COUNT(*) FILTER (WHERE dr.current_status = 'on_leave')::int AS on_leave,
        COUNT(*) FILTER (WHERE dr.license_expiry < CURRENT_DATE)::int AS expired_license,
        COUNT(*) FILTER (WHERE dr.medical_clearance_expiry < CURRENT_DATE)::int AS expired_medical,
        COALESCE(SUM(dr.total_trips), 0)::int AS total_trips_all,
        ROUND(AVG(dr.rating)::numeric, 2) AS avg_rating
      FROM drivers dr WHERE dr.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND dr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const [statuses, licenseTypes, companies] = await Promise.all([
      pool.query(`SELECT DISTINCT dr.current_status FROM drivers dr WHERE dr.deleted_at IS NULL ${cw} ORDER BY dr.current_status`, params),
      pool.query(`SELECT DISTINCT dr.license_type FROM drivers dr WHERE dr.deleted_at IS NULL ${cw} ORDER BY dr.license_type`, params),
      pool.query(`SELECT tc.id, tc.name_en FROM transport_companies tc WHERE tc.deleted_at IS NULL ${companyId ? 'AND tc.company_id = $1' : ''} ORDER BY tc.name_en`, params),
    ]);
    sendSuccess(res, {
      statuses: statuses.rows.map(r => r.current_status),
      licenseTypes: licenseTypes.rows.map(r => r.license_type),
      transportCompanies: companies.rows,
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
  }
});

/* GET / */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM drivers dr ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY dr.sort_order ASC, dr.full_name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch drivers', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND dr.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE dr.id = $1 AND dr.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch driver', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, full_name_en, full_name_ar, id_number, id_type = 'national_id',
      nationality_id, phone, phone2, email,
      emergency_contact_name, emergency_contact_phone,
      license_number, license_type = 'heavy', license_expiry, license_issuing_country_id,
      transport_company_id, assigned_vehicle_id, current_status = 'available',
      hire_date, contract_end, daily_rate, per_trip_rate,
      certifications, blood_type, medical_clearance_expiry,
      photo_url, notes, is_active = true, sort_order = 0 } = req.body;

    if (!code || !full_name_en) return sendError(res, 'VALIDATION', 'code and full_name_en are required', 400);

    const r = await pool.query(`
      INSERT INTO drivers (company_id, code, full_name_en, full_name_ar, id_number, id_type,
        nationality_id, phone, phone2, email,
        emergency_contact_name, emergency_contact_phone,
        license_number, license_type, license_expiry, license_issuing_country_id,
        transport_company_id, assigned_vehicle_id, current_status,
        hire_date, contract_end, daily_rate, per_trip_rate,
        certifications, blood_type, medical_clearance_expiry,
        photo_url, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
      RETURNING *
    `, [companyId, code, full_name_en, full_name_ar || null, id_number || null, id_type,
      nationality_id || null, phone || null, phone2 || null, email || null,
      emergency_contact_name || null, emergency_contact_phone || null,
      license_number || null, license_type, license_expiry || null, license_issuing_country_id || null,
      transport_company_id || null, assigned_vehicle_id || null, current_status,
      hire_date || null, contract_end || null, daily_rate || null, per_trip_rate || null,
      certifications || null, blood_type || null, medical_clearance_expiry || null,
      photo_url || null, notes || null, is_active, sort_order,
      (req as any).user?.userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Driver with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create driver', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, full_name_en, full_name_ar, id_number, id_type,
      nationality_id, phone, phone2, email,
      emergency_contact_name, emergency_contact_phone,
      license_number, license_type, license_expiry, license_issuing_country_id,
      transport_company_id, assigned_vehicle_id, current_status,
      hire_date, contract_end, daily_rate, per_trip_rate,
      certifications, blood_type, medical_clearance_expiry,
      photo_url, notes, is_active, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $32` : '';
    const params = [code, full_name_en, full_name_ar, id_number, id_type,
      nationality_id || null, phone, phone2, email,
      emergency_contact_name, emergency_contact_phone,
      license_number, license_type, license_expiry || null, license_issuing_country_id || null,
      transport_company_id || null, assigned_vehicle_id || null, current_status,
      hire_date || null, contract_end || null, daily_rate, per_trip_rate,
      certifications, blood_type, medical_clearance_expiry || null,
      photo_url, notes, is_active, sort_order,
      (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE drivers SET
        code=$1, full_name_en=$2, full_name_ar=$3, id_number=$4, id_type=$5,
        nationality_id=$6, phone=$7, phone2=$8, email=$9,
        emergency_contact_name=$10, emergency_contact_phone=$11,
        license_number=$12, license_type=$13, license_expiry=$14, license_issuing_country_id=$15,
        transport_company_id=$16, assigned_vehicle_id=$17, current_status=$18,
        hire_date=$19, contract_end=$20, daily_rate=$21, per_trip_rate=$22,
        certifications=$23, blood_type=$24, medical_clearance_expiry=$25,
        photo_url=$26, notes=$27, is_active=$28, sort_order=$29,
        updated_by=$30, updated_at=NOW()
      WHERE id=$31 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate code', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update driver', 500);
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
    const r = await pool.query(`UPDATE drivers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete driver', 500);
  }
});

export default router;
