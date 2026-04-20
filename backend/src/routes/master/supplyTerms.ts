import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List supply_terms
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT *, name AS name_en FROM supply_terms WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM supply_terms WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supply term', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT *, name AS name_en FROM supply_terms WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'supply term not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch supply term', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_en, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent, sort_order, is_active = true } = req.body;
    const theName = name || name_en;
    if (!theName) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    if (!supply_type) return sendError(res, 'VALIDATION_ERROR', 'supply_type is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const finalCode = code || theName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || theName;
    const dup = await pool.query(`SELECT id FROM supply_terms WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO supply_terms (company_id, code, name, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *, name AS name_en`,
      [companyId, finalCode, theName, finalNameAr, description||null, description_ar||null, supply_type, allows_partial_delivery??false, min_delivery_percent||null, sort_order||0, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Supply term created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create supply term', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_en, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent, sort_order, is_active } = req.body;
    const existing = await pool.query(`SELECT * FROM supply_terms WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supply term not found', 404);
    const result = await pool.query(
      `UPDATE supply_terms SET code=COALESCE($1,code), name=COALESCE($2,name), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_ar=COALESCE($5,description_ar), supply_type=COALESCE($6,supply_type),
       allows_partial_delivery=COALESCE($7,allows_partial_delivery), min_delivery_percent=$8,
       sort_order=COALESCE($9,sort_order), is_active=COALESCE($10,is_active), updated_at=NOW()
       WHERE id = $11 AND deleted_at IS NULL RETURNING *, name AS name_en`,
      [code, name || name_en, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent||null, sort_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Supply term updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update supply term', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM supply_terms WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Supply term not found', 404);
    await pool.query(`UPDATE supply_terms SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supply term deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete supply term', 500);
  }
});

export default router;
