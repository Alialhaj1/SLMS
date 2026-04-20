import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List customer_groups
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM customer_groups WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM customer_groups WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customer groups', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_groups WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'customer group not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customer group', 500);
  }
});

// POST / - Create
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, name, name_ar, description, default_payment_terms_id, default_price_list_id, credit_limit, discount_percent, receivable_account_id, is_active = true } = req.body;
    if (!name) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id || null;
    const finalCode = code || name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name;
    const dup = await pool.query(`SELECT id FROM customer_groups WHERE code = $1 AND deleted_at IS NULL`, [finalCode]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO customer_groups (company_id, code, name, name_ar, description, default_payment_terms_id, default_price_list_id, credit_limit, discount_percent, receivable_account_id, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, name, finalNameAr, description||null, default_payment_terms_id||null, default_price_list_id||null, credit_limit||null, discount_percent||null, receivable_account_id||null, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Customer group created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create customer group', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, default_payment_terms_id, default_price_list_id, credit_limit, discount_percent, receivable_account_id, is_active } = req.body;
    const existing = await pool.query(`SELECT * FROM customer_groups WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customer group not found', 404);
    const result = await pool.query(
      `UPDATE customer_groups SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), default_payment_terms_id=$5, default_price_list_id=$6,
       credit_limit=$7, discount_percent=$8, receivable_account_id=$9,
       is_active=COALESCE($10,is_active), updated_at=NOW()
       WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, default_payment_terms_id||null, default_price_list_id||null, credit_limit||null, discount_percent||null, receivable_account_id||null, is_active, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Customer group updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update customer group', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM customer_groups WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customer group not found', 404);
    await pool.query(`UPDATE customer_groups SET deleted_at = NOW(), is_deleted = true WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Customer group deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete customer group', 500);
  }
});

export default router;
