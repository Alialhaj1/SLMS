import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';

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
  sc.id, sc.company_id, sc.shipment_id, sc.container_type_id, sc.container_number,
  sc.seal_number, sc.bl_number, sc.gross_weight_kg, sc.tare_weight_kg, sc.net_weight_kg,
  sc.volume_cbm, sc.packages_count, sc.temperature_min, sc.temperature_max,
  sc.is_hazardous, sc.hazmat_class, sc.status, sc.loading_date, sc.discharge_date,
  sc.release_date, sc.location, sc.notes, sc.is_active, sc.created_at, sc.updated_at,
  ct.code AS container_type_code, ct.name_en AS container_type_name,
  ct.size_feet, ct.teu,
  ls.shipment_number
`;

const BASE_FROM = `
  FROM shipment_containers sc
  LEFT JOIN container_types ct ON ct.id = sc.container_type_id
  LEFT JOIN logistics_shipments ls ON ls.id = sc.shipment_id
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['sc.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) { where.push(`sc.company_id = $${pc}`); params.push(companyId); pc++; }

  const q = req.query;
  if (q.shipment_id) { where.push(`sc.shipment_id = $${pc}`); params.push(Number(q.shipment_id)); pc++; }
  if (q.search) {
    where.push(`(sc.container_number ILIKE $${pc} OR sc.seal_number ILIKE $${pc} OR sc.bl_number ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.status) { where.push(`sc.status = $${pc}`); params.push(q.status); pc++; }
  if (q.is_hazardous !== undefined) { where.push(`sc.is_hazardous = $${pc}`); params.push(q.is_hazardous === 'true'); pc++; }
  if (q.container_type_id) { where.push(`sc.container_type_id = $${pc}`); params.push(Number(q.container_type_id)); pc++; }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sc.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sc.status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE sc.status = 'loaded')::int AS loaded,
        COUNT(*) FILTER (WHERE sc.status = 'in_transit')::int AS in_transit,
        COUNT(*) FILTER (WHERE sc.status = 'discharged')::int AS discharged,
        COUNT(*) FILTER (WHERE sc.status = 'released')::int AS released,
        COUNT(*) FILTER (WHERE sc.is_hazardous)::int AS hazardous,
        COALESCE(SUM(sc.gross_weight_kg), 0)::numeric AS total_weight_kg,
        COALESCE(SUM(sc.volume_cbm), 0)::numeric AS total_volume_cbm,
        COALESCE(SUM(sc.packages_count), 0)::int AS total_packages
      FROM shipment_containers sc WHERE sc.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-containers/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /filters */
router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sc.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const [statuses, types] = await Promise.all([
      pool.query(`SELECT DISTINCT sc.status FROM shipment_containers sc WHERE sc.deleted_at IS NULL ${cw} AND sc.status IS NOT NULL ORDER BY sc.status`, params),
      pool.query(`SELECT DISTINCT ct.id, ct.code, ct.name_en FROM shipment_containers sc JOIN container_types ct ON ct.id = sc.container_type_id WHERE sc.deleted_at IS NULL ${cw} ORDER BY ct.name_en`, params),
    ]);
    sendSuccess(res, { statuses: statuses.rows.map(r => r.status), container_types: types.rows });
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
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY sc.created_at DESC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    console.error('shipment-containers list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipment containers', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sc.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE sc.id = $1 AND sc.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch container', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { shipment_id, container_type_id, container_number, seal_number, bl_number,
      gross_weight_kg = 0, tare_weight_kg = 0, net_weight_kg = 0, volume_cbm = 0,
      packages_count = 0, temperature_min, temperature_max, is_hazardous = false,
      hazmat_class, status = 'pending', loading_date, discharge_date, release_date,
      location, notes, is_active = true } = req.body;

    if (!shipment_id || !container_number) return sendError(res, 'VALIDATION', 'shipment_id and container_number are required', 400);

    const r = await pool.query(`
      INSERT INTO shipment_containers (company_id, shipment_id, container_type_id, container_number, seal_number, bl_number,
        gross_weight_kg, tare_weight_kg, net_weight_kg, volume_cbm, packages_count,
        temperature_min, temperature_max, is_hazardous, hazmat_class, status,
        loading_date, discharge_date, release_date, location, notes, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *
    `, [companyId, shipment_id, container_type_id || null, container_number, seal_number || null,
      bl_number || null, gross_weight_kg, tare_weight_kg, net_weight_kg, volume_cbm,
      packages_count, temperature_min || null, temperature_max || null, is_hazardous,
      hazmat_class || null, status, loading_date || null, discharge_date || null,
      release_date || null, location || null, notes || null, is_active, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-containers POST error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create container', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { container_type_id, container_number, seal_number, bl_number,
      gross_weight_kg, tare_weight_kg, net_weight_kg, volume_cbm, packages_count,
      temperature_min, temperature_max, is_hazardous, hazmat_class, status,
      loading_date, discharge_date, release_date, location, notes, is_active } = req.body;

    const cw = companyId ? `AND company_id = $22` : '';
    const params = [container_type_id || null, container_number, seal_number || null,
      bl_number || null, gross_weight_kg, tare_weight_kg, net_weight_kg, volume_cbm,
      packages_count, temperature_min || null, temperature_max || null, is_hazardous,
      hazmat_class || null, status, loading_date || null, discharge_date || null,
      release_date || null, location || null, notes || null, is_active, userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE shipment_containers SET
        container_type_id=$1, container_number=$2, seal_number=$3, bl_number=$4,
        gross_weight_kg=$5, tare_weight_kg=$6, net_weight_kg=$7, volume_cbm=$8,
        packages_count=$9, temperature_min=$10, temperature_max=$11, is_hazardous=$12,
        hazmat_class=$13, status=$14, loading_date=$15, discharge_date=$16,
        release_date=$17, location=$18, notes=$19, is_active=$20,
        updated_by=$21, updated_at=NOW()
      WHERE id=$22 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-containers PUT error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update container', 500);
  }
});

/* DELETE /:id */
router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const cw = companyId ? `AND company_id = $3` : '';
    const params: any[] = [id, userId || null]; if (companyId) params.push(companyId);
    const r = await pool.query(`UPDATE shipment_containers SET deleted_at=NOW(), updated_by=$2 WHERE id=$1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Container not found', 404);
    sendSuccess(res, { id, deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete container', 500);
  }
});

export default router;
