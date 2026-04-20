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
  tr.id, tr.company_id, tr.code, tr.name_en, tr.name_ar,
  tr.route_type, tr.transport_mode,
  tr.origin_type, tr.origin_port_id, tr.origin_city_id, tr.origin_country_id, tr.origin_description,
  tr.destination_type, tr.destination_port_id, tr.destination_city_id, tr.destination_country_id, tr.destination_description,
  tr.via_points, tr.distance_km, tr.estimated_hours, tr.estimated_days,
  tr.cost_per_trip, tr.cost_per_ton_km, tr.currency_code,
  tr.requires_customs_clearance, tr.border_crossing_points,
  tr.risk_level, tr.frequency,
  tr.preferred_carrier_id, tc.name_en AS carrier_name_en,
  tr.max_weight_tons, tr.notes,
  tr.is_active, tr.sort_order, tr.created_at, tr.updated_at
`;

const BASE_FROM = `
  FROM transport_routes tr
  LEFT JOIN transport_companies tc ON tc.id = tr.preferred_carrier_id AND tc.deleted_at IS NULL
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['tr.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;
  if (companyId) { where.push(`tr.company_id = $${pc}`); params.push(companyId); pc++; }
  const q = req.query;
  if (q.search) {
    where.push(`(tr.code ILIKE $${pc} OR tr.name_en ILIKE $${pc} OR tr.name_ar ILIKE $${pc} OR tr.origin_description ILIKE $${pc} OR tr.destination_description ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.route_type) { where.push(`tr.route_type = $${pc}`); params.push(q.route_type); pc++; }
  if (q.transport_mode) { where.push(`tr.transport_mode = $${pc}`); params.push(q.transport_mode); pc++; }
  if (q.risk_level) { where.push(`tr.risk_level = $${pc}`); params.push(q.risk_level); pc++; }
  if (q.is_active !== undefined) { where.push(`tr.is_active = $${pc}`); params.push(q.is_active === 'true'); pc++; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND tr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tr.is_active)::int AS active,
        COUNT(DISTINCT tr.transport_mode)::int AS modes,
        COUNT(*) FILTER (WHERE tr.route_type = 'domestic')::int AS domestic,
        COUNT(*) FILTER (WHERE tr.route_type = 'international')::int AS international,
        COUNT(*) FILTER (WHERE tr.requires_customs_clearance)::int AS customs_required,
        ROUND(AVG(tr.distance_km)::numeric, 0) AS avg_distance_km
      FROM transport_routes tr WHERE tr.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND tr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const [modes, types, risks] = await Promise.all([
      pool.query(`SELECT DISTINCT tr.transport_mode FROM transport_routes tr WHERE tr.deleted_at IS NULL ${cw} ORDER BY tr.transport_mode`, params),
      pool.query(`SELECT DISTINCT tr.route_type FROM transport_routes tr WHERE tr.deleted_at IS NULL ${cw} ORDER BY tr.route_type`, params),
      pool.query(`SELECT DISTINCT tr.risk_level FROM transport_routes tr WHERE tr.deleted_at IS NULL ${cw} ORDER BY tr.risk_level`, params),
    ]);
    sendSuccess(res, {
      modes: modes.rows.map(r => r.transport_mode),
      types: types.rows.map(r => r.route_type),
      riskLevels: risks.rows.map(r => r.risk_level),
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
    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM transport_routes tr ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY tr.sort_order ASC, tr.name_en ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch transport routes', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND tr.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE tr.id = $1 AND tr.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport route not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch transport route', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, route_type = 'domestic', transport_mode = 'land',
      origin_type, origin_port_id, origin_city_id, origin_country_id, origin_description,
      destination_type, destination_port_id, destination_city_id, destination_country_id, destination_description,
      via_points, distance_km, estimated_hours, estimated_days,
      cost_per_trip, cost_per_ton_km, currency_code = 'SAR',
      requires_customs_clearance = false, border_crossing_points,
      risk_level = 'low', frequency = 'on_demand',
      preferred_carrier_id, max_weight_tons, notes, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name_en) return sendError(res, 'VALIDATION', 'code and name_en are required', 400);

    const r = await pool.query(`
      INSERT INTO transport_routes (company_id, code, name_en, name_ar, route_type, transport_mode,
        origin_type, origin_port_id, origin_city_id, origin_country_id, origin_description,
        destination_type, destination_port_id, destination_city_id, destination_country_id, destination_description,
        via_points, distance_km, estimated_hours, estimated_days,
        cost_per_trip, cost_per_ton_km, currency_code,
        requires_customs_clearance, border_crossing_points,
        risk_level, frequency, preferred_carrier_id, max_weight_tons,
        notes, is_active, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
      RETURNING *
    `, [companyId, code, name_en, name_ar || null, route_type, transport_mode,
      origin_type || 'city', origin_port_id || null, origin_city_id || null, origin_country_id || null, origin_description || null,
      destination_type || 'city', destination_port_id || null, destination_city_id || null, destination_country_id || null, destination_description || null,
      via_points ? JSON.stringify(via_points) : '[]', distance_km || null, estimated_hours || null, estimated_days || null,
      cost_per_trip || null, cost_per_ton_km || null, currency_code,
      requires_customs_clearance, border_crossing_points || null,
      risk_level, frequency, preferred_carrier_id || null, max_weight_tons || null,
      notes || null, is_active, sort_order, (req as any).user?.userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Transport route with this code already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create transport route', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const { code, name_en, name_ar, route_type, transport_mode,
      origin_type, origin_port_id, origin_city_id, origin_country_id, origin_description,
      destination_type, destination_port_id, destination_city_id, destination_country_id, destination_description,
      via_points, distance_km, estimated_hours, estimated_days,
      cost_per_trip, cost_per_ton_km, currency_code,
      requires_customs_clearance, border_crossing_points,
      risk_level, frequency, preferred_carrier_id, max_weight_tons,
      notes, is_active, sort_order } = req.body;

    const cw = companyId ? `AND company_id = $34` : '';
    const params = [code, name_en, name_ar, route_type, transport_mode,
      origin_type, origin_port_id || null, origin_city_id || null, origin_country_id || null, origin_description,
      destination_type, destination_port_id || null, destination_city_id || null, destination_country_id || null, destination_description,
      via_points ? JSON.stringify(via_points) : '[]', distance_km, estimated_hours, estimated_days,
      cost_per_trip, cost_per_ton_km, currency_code,
      requires_customs_clearance, border_crossing_points,
      risk_level, frequency, preferred_carrier_id || null, max_weight_tons,
      notes, is_active, sort_order,
      (req as any).user?.userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE transport_routes SET
        code=$1, name_en=$2, name_ar=$3, route_type=$4, transport_mode=$5,
        origin_type=$6, origin_port_id=$7, origin_city_id=$8, origin_country_id=$9, origin_description=$10,
        destination_type=$11, destination_port_id=$12, destination_city_id=$13, destination_country_id=$14, destination_description=$15,
        via_points=$16, distance_km=$17, estimated_hours=$18, estimated_days=$19,
        cost_per_trip=$20, cost_per_ton_km=$21, currency_code=$22,
        requires_customs_clearance=$23, border_crossing_points=$24,
        risk_level=$25, frequency=$26, preferred_carrier_id=$27, max_weight_tons=$28,
        notes=$29, is_active=$30, sort_order=$31,
        updated_by=$32, updated_at=NOW()
      WHERE id=$33 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport route not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate code', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update transport route', 500);
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
    const r = await pool.query(`UPDATE transport_routes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Transport route not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete transport route', 500);
  }
});

export default router;
