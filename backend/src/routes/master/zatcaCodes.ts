import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List zatca_codes
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM zatca_codes WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM zatca_codes WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch ZATCA code', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM zatca_codes WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'ZATCA code not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch ZATCA code', 500);
  }
});

// GET /stats - Stats for dashboard
router.get('/stats', authenticate, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(DISTINCT code_type) as types
      FROM zatca_codes WHERE deleted_at IS NULL
    `);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed', 500); }
});

// GET /filters - Distinct filter values
router.get('/filters', authenticate, async (req, res) => {
  try {
    const types = await pool.query('SELECT DISTINCT code_type FROM zatca_codes WHERE deleted_at IS NULL ORDER BY code_type');
    sendSuccess(res, { code_types: types.rows.map((r: any) => r.code_type) });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed', 500); }
});

// POST / - Create ZATCA code
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = (req as any).user?.tenant_id;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, code_type, parent_code, zatca_id, is_b2b, is_b2c, version, effective_from, effective_to, display_order } = req.body;
    if (!code || !name_en || !code_type) return sendError(res, 'VALIDATION_ERROR', 'code, name_en, code_type required', 400);

    const r = await pool.query(`
      INSERT INTO zatca_codes (company_id, code, name_en, name_ar, description, code_type, parent_code, zatca_id, is_b2b, is_b2c, version, effective_from, effective_to, display_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [companyId, code, name_en, name_ar, description, code_type, parent_code, zatca_id, is_b2b||false, is_b2c||false, version, effective_from, effective_to, display_order||0, userId]);

    res.status(201);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to create ZATCA code', 500); }
});

// PUT /:id - Update ZATCA code
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, code_type, parent_code, zatca_id, is_b2b, is_b2c, version, effective_from, effective_to, display_order, is_active } = req.body;

    const r = await pool.query(`
      UPDATE zatca_codes SET
        code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        description=$4, code_type=COALESCE($5,code_type), parent_code=$6, zatca_id=$7,
        is_b2b=COALESCE($8,is_b2b), is_b2c=COALESCE($9,is_b2c), version=$10,
        effective_from=$11, effective_to=$12, display_order=COALESCE($13,display_order),
        is_active=COALESCE($14,is_active), updated_by=$15, updated_at=NOW()
      WHERE id=$16 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description, code_type, parent_code, zatca_id, is_b2b, is_b2c, version, effective_from, effective_to, display_order, is_active, userId, req.params.id]);

    if (!r.rows.length) return sendError(res, 'NOT_FOUND', 'ZATCA code not found', 404);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to update ZATCA code', 500); }
});

// DELETE /:id - Soft delete ZATCA code
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query('UPDATE zatca_codes SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (!r.rows.length) return sendError(res, 'NOT_FOUND', 'ZATCA code not found', 404);
    sendSuccess(res, { message: 'Deleted' });
  } catch (err: any) { sendError(res, 'SERVER_ERROR', 'Failed to delete ZATCA code', 500); }
});

export default router;
