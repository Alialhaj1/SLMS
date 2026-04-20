import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List vendor_statuses (supplier statuses)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM vendor_statuses WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM vendor_statuses WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supplier status', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_statuses WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'supplier status not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supplier status', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active = true } = req.body;
    if (!name) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const finalCode = code || name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name;
    const dup = await pool.query(`SELECT id FROM vendor_statuses WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO vendor_statuses (company_id, code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, name, finalNameAr, description||null, description_ar||null, color||null, allows_purchase_orders??true, allows_invoices??true, allows_payments??true, is_default??false, sort_order||0, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Supplier status created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create supplier status', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active } = req.body;
    const existing = await pool.query(`SELECT * FROM vendor_statuses WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supplier status not found', 404);
    const result = await pool.query(
      `UPDATE vendor_statuses SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_ar=COALESCE($5,description_ar), color=$6,
       allows_purchase_orders=COALESCE($7,allows_purchase_orders), allows_invoices=COALESCE($8,allows_invoices),
       allows_payments=COALESCE($9,allows_payments), is_default=COALESCE($10,is_default),
       sort_order=COALESCE($11,sort_order), is_active=COALESCE($12,is_active), updated_at=NOW()
       WHERE id = $13 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, description, description_ar, color||null, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Supplier status updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update supplier status', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM vendor_statuses WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supplier status not found', 404);
    await pool.query(`UPDATE vendor_statuses SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supplier status deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete supplier status', 500);
  }
});

export default router;
