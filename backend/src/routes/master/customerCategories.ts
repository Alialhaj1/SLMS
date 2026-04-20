import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List customer_categories
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM customer_categories WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM customer_categories WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customer category', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_categories WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'customer category not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customer category', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_ar, description, description_ar, parent_id, default_payment_terms_id, default_credit_limit, default_discount_percent, default_price_list_id, is_active = true, sort_order } = req.body;
    if (!name) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const finalCode = code || name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name;
    const dup = await pool.query(`SELECT id FROM customer_categories WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO customer_categories (company_id, parent_id, code, name, name_ar, description, description_ar, default_payment_terms_id, default_credit_limit, default_discount_percent, default_price_list_id, is_active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [companyId, parent_id||null, finalCode, name, finalNameAr, description||null, description_ar||null, default_payment_terms_id||null, default_credit_limit||null, default_discount_percent||null, default_price_list_id||null, is_active, sort_order||0]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Customer category created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create customer category', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, description_ar, parent_id, default_payment_terms_id, default_credit_limit, default_discount_percent, default_price_list_id, is_active, sort_order } = req.body;
    const existing = await pool.query(`SELECT * FROM customer_categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customer category not found', 404);
    const result = await pool.query(
      `UPDATE customer_categories SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_ar=COALESCE($5,description_ar), parent_id=$6,
       default_payment_terms_id=$7, default_credit_limit=$8, default_discount_percent=$9, default_price_list_id=$10,
       is_active=COALESCE($11,is_active), sort_order=COALESCE($12,sort_order), updated_at=NOW()
       WHERE id = $13 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, description_ar, parent_id||null, default_payment_terms_id||null, default_credit_limit||null, default_discount_percent||null, default_price_list_id||null, is_active, sort_order, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Customer category updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update customer category', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM customer_categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Customer category not found', 404);
    await pool.query(`UPDATE customer_categories SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Customer category deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete customer category', 500);
  }
});

export default router;
