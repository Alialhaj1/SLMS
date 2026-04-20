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
    const cw = companyId ? `AND et.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE et.is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE et.is_active = false)::int AS inactive,
        COUNT(DISTINCT et.category)::int AS categories,
        COUNT(*) FILTER (WHERE et.is_vat_exempt = true)::int AS vat_exempt
      FROM shipment_expense_types et
      WHERE et.deleted_at IS NULL ${cw}
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
    const cw = companyId ? `AND et.company_id = $1` : '';
    const params = companyId ? [companyId] : [];
    const categories = await pool.query(`SELECT DISTINCT category AS value, category AS label FROM shipment_expense_types et WHERE deleted_at IS NULL AND category IS NOT NULL ${cw} ORDER BY 1`, params);
    sendSuccess(res, { categories: categories.rows });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
  }
});

const BASE_SELECT = `
  et.id, et.code, et.name, et.name_ar, et.category,
  et.default_vat_rate, et.is_vat_exempt, et.is_active,
  et.display_order, et.notes,
  et.linked_account_id, et.analytic_account_code,
  et.requires_clearance_office, et.requires_customs_declaration,
  et.requires_insurance_company, et.requires_laboratory,
  et.requires_lc, et.requires_port, et.requires_shipping_agent,
  et.created_at, et.updated_at,
  acc.code AS linked_account_code, acc.name AS linked_account_name
`;

const BASE_FROM = `
  FROM shipment_expense_types et
  LEFT JOIN accounts acc ON acc.id = et.linked_account_id
`;

/* GET / - List */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const companyId = getCompanyId(req);
    const { search, category, is_active, sortBy = 'display_order', sortOrder = 'asc' } = req.query as any;

    const conditions: string[] = ['et.deleted_at IS NULL'];
    const params: any[] = [];

    if (companyId) { params.push(companyId); conditions.push(`et.company_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(et.name ILIKE $${params.length} OR et.name_ar ILIKE $${params.length} OR et.code ILIKE $${params.length})`); }
    if (category) { params.push(category); conditions.push(`et.category = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`et.is_active = $${params.length}`); }

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const allowedSort = ['display_order', 'name', 'code', 'category', 'created_at'];
    const sort = allowedSort.includes(sortBy) ? sortBy : 'display_order';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countR = await pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params);
    const pc = params.length + 1;
    const dataR = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql} ORDER BY et.${sort} ${order} NULLS LAST, et.id ASC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, limit, offset]);

    sendSuccess(res, dataR.rows, 200, { total: countR.rows[0]?.total ?? 0, page, limit });
  } catch (err: any) {
    console.error('shipment-expense-types list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch expense types', 500);
  }
});

/* GET /:id */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND et.company_id = $2` : '';
    const r = await pool.query(`SELECT ${BASE_SELECT} ${BASE_FROM} WHERE et.id = $1 AND et.deleted_at IS NULL ${cw}`, companyId ? [id, companyId] : [id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Expense type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch expense type', 500);
  }
});

/* POST / */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { code, name, name_ar, category, default_vat_rate, is_vat_exempt, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office, requires_customs_declaration, requires_insurance_company, requires_laboratory, requires_lc, requires_port, requires_shipping_agent, is_active } = req.body;

    if (!name) return sendError(res, 'VALIDATION', 'name is required', 400);

    const r = await pool.query(`
      INSERT INTO shipment_expense_types
        (company_id, code, name, name_ar, category, default_vat_rate, is_vat_exempt, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office, requires_customs_declaration, requires_insurance_company, requires_laboratory, requires_lc, requires_port, requires_shipping_agent, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [companyId, code, name, name_ar, category, default_vat_rate, is_vat_exempt ?? false, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office ?? false, requires_customs_declaration ?? false, requires_insurance_company ?? false, requires_laboratory ?? false, requires_lc ?? false, requires_port ?? false, requires_shipping_agent ?? false, is_active ?? true, userId]);

    sendSuccess(res, r.rows[0], 201);
  } catch (err: any) {
    console.error('shipment-expense-types create error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to create expense type', 500);
  }
});

/* PUT /:id */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { code, name, name_ar, category, default_vat_rate, is_vat_exempt, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office, requires_customs_declaration, requires_insurance_company, requires_laboratory, requires_lc, requires_port, requires_shipping_agent, is_active } = req.body;

    const cw = companyId ? `AND company_id = $21` : '';
    const r = await pool.query(`
      UPDATE shipment_expense_types SET
        code=$1, name=$2, name_ar=$3, category=$4, default_vat_rate=$5,
        is_vat_exempt=$6, linked_account_id=$7, analytic_account_code=$8,
        display_order=$9, notes=$10,
        requires_clearance_office=$11, requires_customs_declaration=$12,
        requires_insurance_company=$13, requires_laboratory=$14,
        requires_lc=$15, requires_port=$16, requires_shipping_agent=$17,
        is_active=$18, updated_by=$19, updated_at=NOW()
      WHERE id=$20 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, companyId
      ? [code, name, name_ar, category, default_vat_rate, is_vat_exempt, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office, requires_customs_declaration, requires_insurance_company, requires_laboratory, requires_lc, requires_port, requires_shipping_agent, is_active, userId, id, companyId]
      : [code, name, name_ar, category, default_vat_rate, is_vat_exempt, linked_account_id, analytic_account_code, display_order, notes, requires_clearance_office, requires_customs_declaration, requires_insurance_company, requires_laboratory, requires_lc, requires_port, requires_shipping_agent, is_active, userId, id]
    );

    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Expense type not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('shipment-expense-types update error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update expense type', 500);
  }
});

/* DELETE /:id */
router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;

    // Check if in use
    const inUse = await pool.query(`SELECT COUNT(*)::int AS cnt FROM shipment_expenses WHERE expense_type_id = $1 AND deleted_at IS NULL`, [id]);
    if (inUse.rows[0]?.cnt > 0) return sendError(res, 'CONFLICT', `Cannot delete: ${inUse.rows[0].cnt} expenses use this type`, 409);

    const cw = companyId ? `AND company_id = $3` : '';
    const r = await pool.query(`UPDATE shipment_expense_types SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL ${cw} RETURNING id`, companyId ? [userId, id, companyId] : [userId, id]);
    if (r.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Expense type not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete expense type', 500);
  }
});

export default router;
