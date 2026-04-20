import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List group_types (stored in reference_data table)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM reference_data WHERE type = 'group_types' AND deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM reference_data WHERE type = 'group_types' AND deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group types', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reference_data WHERE id = $1 AND type = 'group_types' AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'group type not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group type', 500);
  }
});

// POST / - Create
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, name_en, name_ar, description_en, description_ar, is_active = true } = req.body;
    if (!name_en) return sendError(res, 'VALIDATION_ERROR', 'name_en is required', 400);
    const finalCode = code || name_en.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name_en;
    const companyId = (req as any).companyId || (req as any).user?.company_id || null;
    const userId = (req as any).user?.id || null;
    const dup = await pool.query(`SELECT id FROM reference_data WHERE type = 'group_types' AND code = $1 AND deleted_at IS NULL`, [finalCode]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO reference_data (type, company_id, code, name_en, name_ar, description_en, description_ar, is_active, created_by, created_at, updated_at)
       VALUES ('group_types',$1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, name_en, finalNameAr, description_en||null, description_ar||null, is_active, userId]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Group type created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create group type', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name_en, name_ar, description_en, description_ar, is_active } = req.body;
    const userId = (req as any).user?.id || null;
    const existing = await pool.query(`SELECT * FROM reference_data WHERE id = $1 AND type = 'group_types' AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Group type not found', 404);
    const result = await pool.query(
      `UPDATE reference_data SET code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
       description_en=COALESCE($4,description_en), description_ar=COALESCE($5,description_ar),
       is_active=COALESCE($6,is_active), updated_by=$7, updated_at=NOW()
       WHERE id = $8 AND type = 'group_types' AND deleted_at IS NULL RETURNING *`,
      [code, name_en, name_ar, description_en, description_ar, is_active, userId, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Group type updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update group type', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM reference_data WHERE id = $1 AND type = 'group_types' AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Group type not found', 404);
    await pool.query(`UPDATE reference_data SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Group type deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete group type', 500);
  }
});

export default router;
