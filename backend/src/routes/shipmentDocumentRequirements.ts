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

/* GET /stats */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sdr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sdr.is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE sdr.is_active = false)::int AS inactive,
        COUNT(*) FILTER (WHERE sdr.is_mandatory = true)::int AS mandatory,
        COUNT(DISTINCT sdr.document_category) AS categories,
        COUNT(DISTINCT sdr.stage) AS stages
      FROM shipment_document_requirements sdr
      WHERE sdr.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND sdr.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const categories = await pool.query(`SELECT DISTINCT document_category AS value, document_category AS label FROM shipment_document_requirements sdr WHERE deleted_at IS NULL AND document_category IS NOT NULL ${cw} ORDER BY 1`, params);
    const stages = await pool.query(`SELECT DISTINCT stage AS value, stage AS label FROM shipment_document_requirements sdr WHERE deleted_at IS NULL AND stage IS NOT NULL ${cw} ORDER BY 1`, params);
    sendSuccess(res, { categories: categories.rows, stages: stages.rows });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
  }
});

const BASE_SELECT = `
  sdr.id, sdr.requirement_code, sdr.name_en, sdr.name_ar,
  sdr.document_category, sdr.stage, sdr.is_mandatory, sdr.is_active,
  sdr.issuing_authority, sdr.valid_days, sdr.applies_to,
  sdr.description_en, sdr.description_ar, sdr.sort_order,
  sdr.shipment_type_id, sdr.template_url,
  sdr.created_at, sdr.updated_at,
  st.name_en AS shipment_type_name_en
`;

const BASE_FROM = `
  FROM shipment_document_requirements sdr
  LEFT JOIN shipment_types st ON st.id = sdr.shipment_type_id
`;

/* GET / - List */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const companyId = getCompanyId(req);
    const { search, document_category, stage, is_mandatory, is_active, sortBy = 'sort_order', sortOrder = 'asc' } = req.query as any;

    const conditions: string[] = ['sdr.deleted_at IS NULL'];
    const params: any[] = [];

    if (companyId) { params.push(companyId); conditions.push(`sdr.company_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(sdr.name_en ILIKE $${params.length} OR sdr.name_ar ILIKE $${params.length} OR sdr.requirement_code ILIKE $${params.length})`); }
    if (document_category) { params.push(document_category); conditions.push(`sdr.document_category = $${params.length}`); }
    if (stage) { params.push(stage); conditions.push(`sdr.stage = $${params.length}`); }
    if (is_mandatory !== undefined) { params.push(is_mandatory === 'true'); conditions.push(`sdr.is_mandatory = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`sdr.is_active = $${params.length}`); }

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const allowedSort = ['sort_order', 'name_en', 'requirement_code', 'document_category', 'stage', 'created_at'];
    const sort = allowedSort.includes(sortBy) ? sortBy : 'sort_order';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const pc = params.length + 1;
    const dataR = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY sdr.${sort} ${order} NULLS LAST, sdr.id ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);

    sendSuccess(res, dataR.rows, 200, { total: countR.rows[0]?.total ?? 0, page, limit });
  } catch (err: any) {
    console.error('shipment-document-requirements list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch document requirements', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND sdr.company_id = $2` : '';
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE sdr.id = $1 AND sdr.deleted_at IS NULL ${cw}`, companyId ? [id, companyId] : [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Document requirement not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch document requirement', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { requirement_code, name_en, name_ar, document_category, stage, is_mandatory, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active } = req.body;

    if (!name_en) return sendError(res, 'VALIDATION', 'name_en is required', 400);

    const r = await pool.query(`
      INSERT INTO shipment_document_requirements
        (company_id, requirement_code, name_en, name_ar, document_category, stage, is_mandatory, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [companyId, requirement_code, name_en, name_ar, document_category, stage, is_mandatory ?? false, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active ?? true, userId]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-document-requirements create error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create document requirement', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { requirement_code, name_en, name_ar, document_category, stage, is_mandatory, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active } = req.body;

    const cw = companyId ? `AND company_id = $19` : '';
    const r = await pool.query(`
      UPDATE shipment_document_requirements SET
        requirement_code=$1, name_en=$2, name_ar=$3, document_category=$4, stage=$5,
        is_mandatory=$6, issuing_authority=$7, valid_days=$8, applies_to=$9,
        description_en=$10, description_ar=$11, sort_order=$12, shipment_type_id=$13,
        template_url=$14, is_active=$15, updated_by=$16, updated_at=NOW()
      WHERE id=$17 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, companyId
      ? [requirement_code, name_en, name_ar, document_category, stage, is_mandatory, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active, userId, id, companyId]
      : [requirement_code, name_en, name_ar, document_category, stage, is_mandatory, issuing_authority, valid_days, applies_to, description_en, description_ar, sort_order, shipment_type_id, template_url, is_active, userId, id]
    );

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Document requirement not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-document-requirements update error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update document requirement', 500);
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
    const r = await pool.query(`
      UPDATE shipment_document_requirements SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL ${cw} RETURNING id
    `, companyId ? [userId, id, companyId] : [userId, id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Document requirement not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete document requirement', 500);
  }
});

export default router;
