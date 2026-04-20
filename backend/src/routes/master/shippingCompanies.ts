import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List shipping_companies
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM shipping_companies WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM shipping_companies WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping company', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shipping_companies WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'shipping company not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch shipping company', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_ar, contact_person, phone, email, address, services, is_active = true } = req.body;
    if (!name) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const userId = (req as any).user?.id || null;
    const finalCode = code || name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name;
    const dup = await pool.query(`SELECT id FROM shipping_companies WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO shipping_companies (company_id, code, name, name_ar, contact_person, phone, email, address, services, is_active, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, name, finalNameAr, contact_person||null, phone||null, email||null, address||null, services||null, is_active, userId]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Shipping company created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create shipping company', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, contact_person, phone, email, address, services, is_active } = req.body;
    const userId = (req as any).user?.id || null;
    const existing = await pool.query(`SELECT * FROM shipping_companies WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping company not found', 404);
    const result = await pool.query(
      `UPDATE shipping_companies SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       contact_person=$4, phone=$5, email=$6, address=$7, services=$8,
       is_active=COALESCE($9,is_active), updated_by=$10, updated_at=NOW()
       WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [code, name, name_ar, contact_person||null, phone||null, email||null, address||null, services||null, is_active, userId, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Shipping company updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update shipping company', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM shipping_companies WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Shipping company not found', 404);
    await pool.query(`UPDATE shipping_companies SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Shipping company deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete shipping company', 500);
  }
});

export default router;
