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
  v.id, v.company_id, v.code, v.plate_number, v.plate_type,
  v.vehicle_type_id, vt.name_en AS vehicle_type_name_en, vt.name_ar AS vehicle_type_name_ar,
  v.transport_company_id, tc.name_en AS transport_company_name_en,
  v.brand, v.model, v.year, v.color, v.vin_number,
  v.registration_number, v.registration_expiry,
  v.insurance_policy_number, v.insurance_expiry, v.insurance_company_id,
  v.inspection_expiry, v.gps_tracker_id, v.gps_enabled,
  v.current_status, v.current_location_text,
  v.odometer_km, v.fuel_capacity_liters,
  v.max_weight_tons, v.max_volume_cbm,
  v.assigned_driver_id, d.full_name_en AS driver_name_en,
  v.daily_rate, v.per_km_rate, v.photo_url, v.notes,
  v.is_active, v.sort_order, v.created_at, v.updated_at
`;

const BASE_FROM = `
  FROM vehicles v
  LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id AND vt.deleted_at IS NULL
  LEFT JOIN transport_companies tc ON tc.id = v.transport_company_id AND tc.deleted_at IS NULL
  LEFT JOIN drivers d ON d.id = v.assigned_driver_id AND d.deleted_at IS NULL
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['v.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`v.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(v.plate_number ILIKE $${pc} OR v.code ILIKE $${pc} OR v.brand ILIKE $${pc} OR v.model ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.vehicle_type_id) { where.push(`v.vehicle_type_id = $${pc}`); params.push(Number(q.vehicle_type_id)); pc++; }
  if (q.transport_company_id) { where.push(`v.transport_company_id = $${pc}`); params.push(Number(q.transport_company_id)); pc++; }
  if (q.current_status) { where.push(`v.current_status = $${pc}`); params.push(q.current_status); pc++; }
  if (q.is_active !== undefined) { where.push(`v.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND v.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE v.is_active)::int AS active,
        COUNT(*) FILTER (WHERE v.current_status = 'available')::int AS available,
        COUNT(*) FILTER (WHERE v.current_status = 'in_transit')::int AS in_transit,
        COUNT(*) FILTER (WHERE v.current_status = 'maintenance')::int AS maintenance,
        COUNT(*) FILTER (WHERE v.registration_expiry < CURRENT_DATE)::int AS expired_registration,
        COUNT(*) FILTER (WHERE v.insurance_expiry < CURRENT_DATE)::int AS expired_insurance
      FROM vehicles v WHERE v.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND v.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const [statuses, types, companies] = await Promise.all([
      pool.query(`SELECT DISTINCT v.current_status FROM vehicles v WHERE v.deleted_at IS NULL ${cw} ORDER BY v.current_status`, params),
      pool.query(`SELECT vt.id, vt.name_en FROM vehicle_types vt WHERE vt.deleted_at IS NULL ${companyId ? 'AND vt.company_id = $1' : ''} ORDER BY vt.name_en`, params),
      pool.query(`SELECT tc.id, tc.name_en FROM transport_companies tc WHERE tc.deleted_at IS NULL ${companyId ? 'AND tc.company_id = $1' : ''} ORDER BY tc.name_en`, params),
    ]);
    sendSuccess(res, {
      statuses: statuses.rows.map(r => r.current_status),
      vehicleTypes: types.rows,
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
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM vehicles v ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY v.sort_order ASC, v.plate_number ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vehicles', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND v.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE v.id = $1 AND v.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vehicle', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, plate_number, plate_type = 'commercial', vehicle_type_id, transport_company_id,
      brand, model, year, color, vin_number, registration_number, registration_expiry,
      insurance_policy_number, insurance_expiry, insurance_company_id, inspection_expiry,
      gps_tracker_id, gps_enabled = false, current_status = 'available', current_location_text,
      odometer_km = 0, fuel_capacity_liters, max_weight_tons, max_volume_cbm,
      assigned_driver_id, daily_rate, per_km_rate, photo_url, notes, is_active = true, sort_order = 0 } = req.body;

    if (!plate_number) return sendError(res, 'VALIDATION', 'plate_number is required', 400);

    const r = await pool.query(`
      INSERT INTO vehicles (company_id, code, plate_number, plate_type, vehicle_type_id, transport_company_id,
        brand, model, year, color, vin_number, registration_number, registration_expiry,
        insurance_policy_number, insurance_expiry, insurance_company_id, inspection_expiry,
        gps_tracker_id, gps_enabled, current_status, current_location_text,
        odometer_km, fuel_capacity_liters, max_weight_tons, max_volume_cbm,
        assigned_driver_id, daily_rate, per_km_rate, photo_url, notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
      RETURNING *
    `, [companyId, code || null, plate_number, plate_type, vehicle_type_id || null, transport_company_id || null,
      brand || null, model || null, year || null, color || null, vin_number || null,
      registration_number || null, registration_expiry || null,
      insurance_policy_number || null, insurance_expiry || null, insurance_company_id || null,
      inspection_expiry || null, gps_tracker_id || null, gps_enabled, current_status,
      current_location_text || null, odometer_km, fuel_capacity_liters || null,
      max_weight_tons || null, max_volume_cbm || null, assigned_driver_id || null,
      daily_rate || null, per_km_rate || null, photo_url || null, notes || null,
      is_active, sort_order, (req as any).user?.userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Vehicle with this plate number already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create vehicle', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, plate_number, plate_type, vehicle_type_id, transport_company_id,
      brand, model, year, color, vin_number, registration_number, registration_expiry,
      insurance_policy_number, insurance_expiry, insurance_company_id, inspection_expiry,
      gps_tracker_id, gps_enabled, current_status, current_location_text,
      odometer_km, fuel_capacity_liters, max_weight_tons, max_volume_cbm,
      assigned_driver_id, daily_rate, per_km_rate, photo_url, notes, is_active, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $34` : '';
    const params = [code, plate_number, plate_type, vehicle_type_id || null, transport_company_id || null,
      brand, model, year, color, vin_number, registration_number, registration_expiry || null,
      insurance_policy_number, insurance_expiry || null, insurance_company_id || null,
      inspection_expiry || null, gps_tracker_id, gps_enabled, current_status, current_location_text,
      odometer_km, fuel_capacity_liters, max_weight_tons, max_volume_cbm,
      assigned_driver_id || null, daily_rate, per_km_rate, photo_url, notes, is_active, sort_order,
      (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE vehicles SET
        code=$1, plate_number=$2, plate_type=$3, vehicle_type_id=$4, transport_company_id=$5,
        brand=$6, model=$7, year=$8, color=$9, vin_number=$10,
        registration_number=$11, registration_expiry=$12,
        insurance_policy_number=$13, insurance_expiry=$14, insurance_company_id=$15,
        inspection_expiry=$16, gps_tracker_id=$17, gps_enabled=$18,
        current_status=$19, current_location_text=$20,
        odometer_km=$21, fuel_capacity_liters=$22, max_weight_tons=$23, max_volume_cbm=$24,
        assigned_driver_id=$25, daily_rate=$26, per_km_rate=$27, photo_url=$28,
        notes=$29, is_active=$30, sort_order=$31, updated_by=$32, updated_at=NOW()
      WHERE id=$33 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate plate number', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update vehicle', 500);
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
    const r = await pool.query(`UPDATE vehicles SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Vehicle not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete vehicle', 500);
  }
});

export default router;
