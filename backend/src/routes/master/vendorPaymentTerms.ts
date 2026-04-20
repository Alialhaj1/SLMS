import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();
router.use(authenticate);
router.use(loadCompanyContext);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = `SELECT * FROM vendor_payment_terms WHERE deleted_at IS NULL`;
    let countQuery = `SELECT COUNT(*) FROM vendor_payment_terms WHERE deleted_at IS NULL`;
    const params: any[] = [];
    const countParams: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      const clause = ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
      query += clause;
      countQuery += clause;
    }
    query += ` ORDER BY sort_order ASC NULLS LAST, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    const [result, countResult] = await Promise.all([pool.query(query, params), pool.query(countQuery, countParams)]);
    sendSuccess(res, { data: result.rows, total: parseInt(countResult.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vendor payment terms', 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM vendor_payment_terms WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, installment_count, installment_interval_days, is_default, sort_order, is_active = true } = req.body;
    if (!code || !name) return sendError(res, 'VALIDATION_ERROR', 'code and name are required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const dup = await pool.query('SELECT id FROM vendor_payment_terms WHERE code=$1 AND company_id=$2 AND deleted_at IS NULL', [code, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO vendor_payment_terms (company_id, code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, installment_count, installment_interval_days, is_default, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW()) RETURNING *`,
      [companyId, code, name, name_ar||null, description||null, description_ar||null, payment_type||'net', due_days||30, discount_days||0, discount_percent||0, installment_count||1, installment_interval_days||30, is_default||false, sort_order||0, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, installment_count, installment_interval_days, is_default, sort_order, is_active } = req.body;
    const existing = await pool.query('SELECT * FROM vendor_payment_terms WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    const result = await pool.query(
      `UPDATE vendor_payment_terms SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_ar=COALESCE($5,description_ar),
       payment_type=COALESCE($6,payment_type), due_days=COALESCE($7,due_days), discount_days=COALESCE($8,discount_days),
       discount_percent=COALESCE($9,discount_percent), installment_count=COALESCE($10,installment_count),
       installment_interval_days=COALESCE($11,installment_interval_days), is_default=COALESCE($12,is_default),
       sort_order=COALESCE($13,sort_order), is_active=COALESCE($14,is_active), updated_at=NOW()
       WHERE id=$15 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, installment_count, installment_interval_days, is_default, sort_order, is_active, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('UPDATE vendor_payment_terms SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete', 500);
  }
});

export default router;
