import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List customs_duty_types
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT *, name_en AS name FROM customs_duty_types WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }

    // Company filter
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      params.push(tenantId);
      query += ` AND company_id = $${params.length}`;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM customs_duty_types WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customs duty type', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customs_duty_types WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'customs duty type not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch customs duty type', 500);
  }
});

// POST / - Create customs duty type
router.post('/', authenticate, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenant_id;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, rate_percent, calculation_method, status } = req.body;
    if (!code || !name_en) return sendError(res, 'VALIDATION_ERROR', 'code and name_en required', 400);

    const result = await pool.query(`
      INSERT INTO customs_duty_types (code, name, name_en, name_ar, rate_percent, calculation_method, status, company_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *, name_en AS name
    `, [code, name_en, name_ar||name_en, rate_percent||0, calculation_method||'percentage', status||'active', tenantId]);

    res.status(201);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to create customs duty type', 500);
  }
});

// PUT /:id - Update customs duty type
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { code, name_en, name_ar, rate_percent, calculation_method, status } = req.body;

    const result = await pool.query(`
      UPDATE customs_duty_types SET
        code=COALESCE($1,code), name=COALESCE($2,name), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        rate_percent=COALESCE($4,rate_percent), calculation_method=COALESCE($5,calculation_method),
        status=COALESCE($6,status), updated_at=NOW()
      WHERE id=$7 AND deleted_at IS NULL RETURNING *, name_en AS name
    `, [code, name_en, name_ar, rate_percent, calculation_method, status, req.params.id]);

    if (!result.rows.length) return sendError(res, 'NOT_FOUND', 'customs duty type not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to update customs duty type', 500);
  }
});

// DELETE /:id - Soft delete customs duty type
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE customs_duty_types SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return sendError(res, 'NOT_FOUND', 'customs duty type not found', 404);
    sendSuccess(res, { message: 'Deleted successfully' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete customs duty type', 500);
  }
});

export default router;
