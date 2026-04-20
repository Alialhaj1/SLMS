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

const PARTY_TYPES = ['importer', 'exporter', 'consignee', 'notify_party', 'broker', 'shipping_agent', 'freight_forwarder', 'insurance_agent', 'customs_broker', 'other'];

const BASE_SELECT = `
  sp.id, sp.company_id, sp.shipment_id, sp.party_type, sp.party_name, sp.party_name_ar,
  sp.supplier_id, sp.customer_id, sp.tax_number, sp.commercial_register,
  sp.address, sp.city, sp.country_id, sp.phone, sp.email, sp.contact_person,
  sp.broker_license_number, sp.is_primary, sp.notes, sp.created_at, sp.updated_at,
  c.name_en AS country_name, c.name_ar AS country_name_ar,
  ls.shipment_number
`;

const BASE_FROM = `
  FROM shipment_parties sp
  LEFT JOIN countries c ON c.id = sp.country_id
  LEFT JOIN logistics_shipments ls ON ls.id = sp.shipment_id
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['sp.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) { where.push(`sp.company_id = $${pc}`); params.push(companyId); pc++; }

  const q = req.query;
  if (q.shipment_id) { where.push(`sp.shipment_id = $${pc}`); params.push(Number(q.shipment_id)); pc++; }
  if (q.search) {
    where.push(`(sp.party_name ILIKE $${pc} OR sp.party_name_ar ILIKE $${pc} OR sp.email ILIKE $${pc} OR sp.tax_number ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`); pc++;
  }
  if (q.party_type) { where.push(`sp.party_type = $${pc}`); params.push(q.party_type); pc++; }
  if (q.is_primary !== undefined) { where.push(`sp.is_primary = $${pc}`); params.push(q.is_primary === 'true'); pc++; }
  if (q.country_id) { where.push(`sp.country_id = $${pc}`); params.push(Number(q.country_id)); pc++; }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sp.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT sp.shipment_id)::int AS shipments_with_parties,
        COUNT(*) FILTER (WHERE sp.party_type = 'importer')::int AS importers,
        COUNT(*) FILTER (WHERE sp.party_type = 'exporter')::int AS exporters,
        COUNT(*) FILTER (WHERE sp.party_type = 'broker')::int AS brokers,
        COUNT(*) FILTER (WHERE sp.party_type = 'customs_broker')::int AS customs_brokers,
        COUNT(*) FILTER (WHERE sp.is_primary)::int AS primary_parties
      FROM shipment_parties sp WHERE sp.deleted_at IS NULL ${cw}
    `, params);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-parties/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* GET /party-types */
router.get('/party-types', authenticate, async (_req: Request, res: Response) => {
  sendSuccess(res, PARTY_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })));
});

/* GET / */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);
    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const total = countR.rows[0]?.total ?? 0;
    const listR = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY sp.is_primary DESC, sp.party_type ASC, sp.party_name ASC LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: listR.rows, total, page, limit });
  } catch (err: any) {
    console.error('shipment-parties list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipment parties', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sp.company_id = $2` : '';
    const params: any[] = [id]; if (companyId) params.push(companyId);
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE sp.id = $1 AND sp.deleted_at IS NULL ${cw}`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Party not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch party', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { shipment_id, party_type, party_name, party_name_ar, supplier_id, customer_id,
      tax_number, commercial_register, address, city, country_id, phone, email,
      contact_person, broker_license_number, is_primary = false, notes } = req.body;

    if (!shipment_id || !party_type || !party_name) return sendError(res, 'VALIDATION', 'shipment_id, party_type, and party_name are required', 400);
    if (!PARTY_TYPES.includes(party_type)) return sendError(res, 'VALIDATION', `Invalid party_type. Must be one of: ${PARTY_TYPES.join(', ')}`, 400);

    const r = await pool.query(`
      INSERT INTO shipment_parties (company_id, shipment_id, party_type, party_name, party_name_ar,
        supplier_id, customer_id, tax_number, commercial_register, address, city, country_id,
        phone, email, contact_person, broker_license_number, is_primary, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [companyId, shipment_id, party_type, party_name, party_name_ar || null,
      supplier_id || null, customer_id || null, tax_number || null, commercial_register || null,
      address || null, city || null, country_id || null, phone || null, email || null,
      contact_person || null, broker_license_number || null, is_primary, notes || null, userId || null]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-parties POST error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create party', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { party_type, party_name, party_name_ar, supplier_id, customer_id,
      tax_number, commercial_register, address, city, country_id, phone, email,
      contact_person, broker_license_number, is_primary, notes } = req.body;

    if (party_type && !PARTY_TYPES.includes(party_type)) return sendError(res, 'VALIDATION', `Invalid party_type`, 400);

    const cw = companyId ? `AND company_id = $18` : '';
    const params = [party_type, party_name, party_name_ar || null, supplier_id || null, customer_id || null,
      tax_number || null, commercial_register || null, address || null, city || null, country_id || null,
      phone || null, email || null, contact_person || null, broker_license_number || null,
      is_primary, notes || null, userId || null, id];
    if (companyId) params.push(companyId);

    const r = await pool.query(`
      UPDATE shipment_parties SET
        party_type=$1, party_name=$2, party_name_ar=$3, supplier_id=$4, customer_id=$5,
        tax_number=$6, commercial_register=$7, address=$8, city=$9, country_id=$10,
        phone=$11, email=$12, contact_person=$13, broker_license_number=$14,
        is_primary=$15, notes=$16, updated_by=$17, updated_at=NOW()
      WHERE id=$18 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Party not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-parties PUT error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update party', 500);
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
    const r = await pool.query(`UPDATE shipment_parties SET deleted_at=NOW(), updated_by=$2 WHERE id=$1 AND deleted_at IS NULL ${cw} RETURNING id`, params);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Party not found', 404);
    sendSuccess(res, { id, deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete party', 500);
  }
});

export default router;
