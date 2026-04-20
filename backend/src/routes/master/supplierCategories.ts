import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List vendor_categories (supplier categories)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM vendor_categories WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM vendor_categories WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supplier category', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_categories WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'supplier category not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supplier category', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_ar, description, description_ar, allowed_contract_types, default_tax_treatment, default_currency_id, sort_order, is_active = true } = req.body;
    if (!name) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const userId = (req as any).user?.id || null;
    const finalCode = code || name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name;
    const dup = await pool.query(`SELECT id FROM vendor_categories WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO vendor_categories (company_id, code, name, name_ar, description, description_ar, allowed_contract_types, default_tax_treatment, default_currency_id, sort_order, is_active, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, name, finalNameAr, description||null, description_ar||null, allowed_contract_types||null, default_tax_treatment||null, default_currency_id||null, sort_order||0, is_active, userId]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Supplier category created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create supplier category', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, description_ar, allowed_contract_types, default_tax_treatment, default_currency_id, sort_order, is_active } = req.body;
    const userId = (req as any).user?.id || null;
    const existing = await pool.query(`SELECT * FROM vendor_categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supplier category not found', 404);
    const result = await pool.query(
      `UPDATE vendor_categories SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_ar=COALESCE($5,description_ar),
       allowed_contract_types=$6, default_tax_treatment=$7, default_currency_id=$8,
       sort_order=COALESCE($9,sort_order), is_active=COALESCE($10,is_active), updated_by=$11, updated_at=NOW()
       WHERE id = $12 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, description_ar, allowed_contract_types||null, default_tax_treatment||null, default_currency_id||null, sort_order, is_active, userId, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Supplier category updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update supplier category', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM vendor_categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supplier category not found', 404);
    await pool.query(`UPDATE vendor_categories SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supplier category deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete supplier category', 500);
  }
});

export default router;
