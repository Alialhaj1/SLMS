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
    
    let query = `SELECT * FROM customs_duty_types WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length})`;
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

export default router;
