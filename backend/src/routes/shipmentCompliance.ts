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

const REQUIREMENT_TYPES = ['customs_clearance', 'quality_inspection', 'health_certificate', 'phytosanitary', 'fumigation', 'sgs_inspection', 'lab_test', 'import_license', 'certificate_of_origin', 'halal_certificate', 'saso', 'other'];
const STATUSES = ['pending', 'in_progress', 'passed', 'failed', 'waived', 'expired'];

const BASE_SELECT = `
  sc.id, sc.company_id, sc.shipment_id, sc.requirement_type, sc.requirement_name,
  sc.requirement_name_ar, sc.authority, sc.reference_number, sc.status, sc.due_date,
  sc.completed_date, sc.expiry_date, sc.inspector, sc.result_notes, sc.document_url,
  sc.cost, sc.currency_id, sc.is_mandatory, sc.priority, sc.notes,
  sc.created_at, sc.updated_at,
  cur.code AS currency_code, cur.name_en AS currency_name,
  ls.shipment_number
`;

const BASE_FROM = `
  FROM shipment_compliance sc
  LEFT JOIN currencies cur ON cur.id = sc.currency_id
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
    where.push(`(sc.requirement_name ILIKE $${pc} OR sc.requirement_name_ar ILIKE $${pc} OR sc.reference_number ILIKE $${pc} OR sc.authority ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.status) { where.push(`sc.status = $${pc}`); params.push(q.status); pc++; }
  if (q.requirement_type) { where.push(`sc.requirement_type = $${pc}`); params.push(q.requirement_type); pc++; }
  if (q.is_mandatory !== undefined) { where.push(`sc.is_mandatory = $${pc}`); params.push(q.is_mandatory === 'true'); pc++; }
  if (q.priority) { where.push(`sc.priority = $${pc}`); params.push(q.priority); pc++; }

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
        COUNT(*) FILTER (WHERE sc.status = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE sc.status = 'passed')::int AS passed,
        COUNT(*) FILTER (WHERE sc.status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE sc.status = 'expired')::int AS expired,
        COUNT(*) FILTER (WHERE sc.is_mandatory)::int AS mandatory,
        COUNT(*) FILTER (WHERE sc.priority = 'critical')::int AS critical,
        COALESCE(SUM(sc.cost), 0)::numeric AS total_cost,
        COUNT(*) FILTER (WHERE sc.due_date < NOW() AND sc.status IN ('pending','in_progress'))::int AS overdue
      FROM shipment_compliance sc WHERE sc.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-compliance/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /requirement-types */
router.get('/requirement-types', authenticate, async (_req: Request, res: Response) => {
  sendSuccess(res, REQUIREMENT_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })));
});

/* GET / */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY CASE sc.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, sc.due_date ASC NULLS LAST LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    console.error('shipment-compliance list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch compliance records', 500);
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
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Compliance record not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch compliance record', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { shipment_id, requirement_type, requirement_name, requirement_name_ar, authority,
      reference_number, status = 'pending', due_date, completed_date, expiry_date, inspector,
      result_notes, document_url, cost = 0, currency_id, is_mandatory = true,
      priority = 'normal', notes } = req.body;

    if (!shipment_id || !requirement_type || !requirement_name) return sendError(res, 'VALIDATION', 'shipment_id, requirement_type, and requirement_name are required', 400);

    const r = await pool.query(`
      INSERT INTO shipment_compliance (company_id, shipment_id, requirement_type, requirement_name,
        requirement_name_ar, authority, reference_number, status, due_date, completed_date,
        expiry_date, inspector, result_notes, document_url, cost, currency_id,
        is_mandatory, priority, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [companyId, shipment_id, requirement_type, requirement_name, requirement_name_ar || null,
      authority || null, reference_number || null, status, due_date || null, completed_date || null,
      expiry_date || null, inspector || null, result_notes || null, document_url || null,
      cost, currency_id || null, is_mandatory, priority, notes || null, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-compliance POST error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create compliance record', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { requirement_type, requirement_name, requirement_name_ar, authority,
      reference_number, status, due_date, completed_date, expiry_date, inspector,
      result_notes, document_url, cost, currency_id, is_mandatory, priority, notes } = req.body;

    const cw = companyId ? `AND company_id = $19` : '';
    const params = [requirement_type, requirement_name, requirement_name_ar || null,
      authority || null, reference_number || null, status, due_date || null,
      completed_date || null, expiry_date || null, inspector || null, result_notes || null,
      document_url || null, cost, currency_id || null, is_mandatory, priority,
      notes || null, userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE shipment_compliance SET
        requirement_type=$1, requirement_name=$2, requirement_name_ar=$3, authority=$4,
        reference_number=$5, status=$6, due_date=$7, completed_date=$8, expiry_date=$9,
        inspector=$10, result_notes=$11, document_url=$12, cost=$13, currency_id=$14,
        is_mandatory=$15, priority=$16, notes=$17, updated_by=$18, updated_at=NOW()
      WHERE id=$19 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Compliance record not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-compliance PUT error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update compliance record', 500);
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
    const r = await pool.query(`UPDATE shipment_compliance SET deleted_at=NOW(), updated_by=$2 WHERE id=$1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Compliance record not found', 404);
    sendSuccess(res, { id, deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete compliance record', 500);
  }
});

export default router;
