import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

router.use(authenticate);

// GET / - List group_levels (stored in reference_data table)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM reference_data WHERE type = 'group_levels' AND deleted_at IS NULL`;
    let countQuery = `SELECT COUNT(*) FROM reference_data WHERE type = 'group_levels' AND deleted_at IS NULL`;
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      const clause = ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
      query += clause;
      countQuery += clause;
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group levels', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reference_data WHERE id = $1 AND type = 'group_levels' AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'group level not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group level', 500);
  }
});

// POST / - Create a new group level
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name_en, name_ar, description_en, description_ar, is_active = true } = req.body;

    if (!name_en) {
      return sendError(res, 'VALIDATION_ERROR', 'name_en is required', 400);
    }

    // Auto-generate code if not provided (code is NOT NULL)
    const finalCode = code || name_en.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name_en;

    // Check duplicate code
    const dup = await pool.query(
      `SELECT id FROM reference_data WHERE type = 'group_levels' AND code = $1 AND deleted_at IS NULL`,
      [finalCode]
    );
    if (dup.rows.length > 0) {
      return sendError(res, 'DUPLICATE', 'A group level with this code already exists', 400);
    }

    const userId = (req as any).user?.id || null;

    const result = await pool.query(
      `INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active, created_by, updated_by, created_at, updated_at)
       VALUES ('group_levels', $1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())
       RETURNING *`,
      [finalCode, name_en, finalNameAr, description_en || null, description_ar || null, is_active, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Group level created successfully' });
  } catch (err: any) {
    console.error('Error creating group level:', err);
    if (err.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    }
    sendError(res, 'SERVER_ERROR', 'Failed to create group level', 500);
  }
});

// PUT /:id - Update a group level
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name_en, name_ar, description_en, description_ar, is_active } = req.body;

    const existing = await pool.query(
      `SELECT * FROM reference_data WHERE id = $1 AND type = 'group_levels' AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Group level not found', 404);
    }

    // Check duplicate code (if changed)
    if (code && code !== existing.rows[0].code) {
      const dup = await pool.query(
        `SELECT id FROM reference_data WHERE type = 'group_levels' AND code = $1 AND id != $2 AND deleted_at IS NULL`,
        [code, id]
      );
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'A group level with this code already exists', 400);
      }
    }

    const userId = (req as any).user?.id || null;

    const result = await pool.query(
      `UPDATE reference_data SET
        code = COALESCE($1, code),
        name_en = COALESCE($2, name_en),
        name_ar = COALESCE($3, name_ar),
        description_en = COALESCE($4, description_en),
        description_ar = COALESCE($5, description_ar),
        is_active = COALESCE($6, is_active),
        updated_by = $7,
        updated_at = NOW()
      WHERE id = $8 AND type = 'group_levels' AND deleted_at IS NULL
      RETURNING *`,
      [code, name_en, name_ar, description_en, description_ar, is_active, userId, id]
    );

    res.json({ success: true, data: result.rows[0], message: 'Group level updated successfully' });
  } catch (err: any) {
    console.error('Error updating group level:', err);
    if (err.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    }
    sendError(res, 'SERVER_ERROR', 'Failed to update group level', 500);
  }
});

// DELETE /:id - Soft delete a group level
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      `SELECT id FROM reference_data WHERE id = $1 AND type = 'group_levels' AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Group level not found', 404);
    }

    const userId = (req as any).user?.id || null;

    await pool.query(
      `UPDATE reference_data SET deleted_at = NOW(), updated_by = $2 WHERE id = $1`,
      [id, userId]
    );

    res.json({ success: true, message: 'Group level deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting group level:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to delete group level', 500);
  }
});

export default router;
