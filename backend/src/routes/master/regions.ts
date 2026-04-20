import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List regions (supports country_id filter for cascading selects)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', country_id, status, is_active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT r.*, co.name AS country_name, co.name_ar AS country_name_ar, co.code AS country_code
                 FROM regions r
                 LEFT JOIN countries co ON r.country_id = co.id
                 WHERE r.deleted_at IS NULL`;
    let countQuery = `SELECT COUNT(*) FROM regions r WHERE r.deleted_at IS NULL`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramCount = 0;
    
    // Filter by country_id (key for cascading city → region)
    if (country_id) {
      paramCount++;
      const clause = ` AND r.country_id = $${paramCount}`;
      query += clause;
      countQuery += clause;
      params.push(parseInt(country_id as string));
      countParams.push(parseInt(country_id as string));
    }

    // Filter by status
    if (status) {
      paramCount++;
      const clause = ` AND r.is_active = $${paramCount}`;
      query += clause;
      countQuery += clause;
      const val = status === 'active';
      params.push(val);
      countParams.push(val);
    }

    // Filter by is_active
    if (is_active !== undefined) {
      paramCount++;
      const clause = ` AND r.is_active = $${paramCount}`;
      query += clause;
      countQuery += clause;
      const val = is_active === 'true';
      params.push(val);
      countParams.push(val);
    }

    // Search
    if (search) {
      paramCount++;
      const clause = ` AND (r.name_en ILIKE $${paramCount} OR r.name_ar ILIKE $${paramCount} OR r.code ILIKE $${paramCount})`;
      query += clause;
      countQuery += clause;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }
    
    query += ` ORDER BY r.sort_order ASC, r.name_en ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch regions', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM regions WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'region not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch region', 500);
  }
});

export default router;
