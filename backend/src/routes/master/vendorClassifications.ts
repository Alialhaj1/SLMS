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
    let query = `SELECT * FROM vendor_classifications WHERE deleted_at IS NULL`;
    let countQuery = `SELECT COUNT(*) FROM vendor_classifications WHERE deleted_at IS NULL`;
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
    sendError(res, 'SERVER_ERROR', 'Failed to fetch vendor classifications', 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM vendor_classifications WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, name_ar, description, color, sort_order, is_active = true } = req.body;
    if (!code || !name) return sendError(res, 'VALIDATION_ERROR', 'code and name are required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const dup = await pool.query('SELECT id FROM vendor_classifications WHERE code=$1 AND company_id=$2 AND deleted_at IS NULL', [code, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO vendor_classifications (company_id, code, name, name_ar, description, color, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
      [companyId, code, name, name_ar||null, description||null, color||null, sort_order||0, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { code, name, name_ar, description, color, sort_order, is_active } = req.body;
    const existing = await pool.query('SELECT * FROM vendor_classifications WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    const result = await pool.query(
      `UPDATE vendor_classifications SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), color=COALESCE($5,color), sort_order=COALESCE($6,sort_order),
       is_active=COALESCE($7,is_active), updated_at=NOW() WHERE id=$8 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, color, sort_order, is_active, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('UPDATE vendor_classifications SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Not found', 404);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete', 500);
  }
});

export default router;
