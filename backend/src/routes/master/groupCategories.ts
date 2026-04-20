import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// GET / - List group_categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM group_categories WHERE deleted_at IS NULL`;
    let countQuery = `SELECT COUNT(*) FROM group_categories WHERE deleted_at IS NULL`;
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      const clause = ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
      query += clause;
      countQuery += clause;
    }
    
    query += ` ORDER BY sort_order ASC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group categories', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM group_categories WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'group category not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch group category', 500);
  }
});

// POST / - Create a new group category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name_en, name_ar, description_en, description_ar, sort_order, is_active = true } = req.body;

    if (!name_en) {
      return sendError(res, 'VALIDATION_ERROR', 'name_en is required', 400);
    }

    const companyId = (req as any).companyId || (req as any).user?.company_id || null;

    if (!companyId) {
      return sendError(res, 'VALIDATION_ERROR', 'Company context is required. Send X-Company-Id header.', 400);
    }

    // Auto-generate code if not provided (code is NOT NULL)
    const finalCode = code || name_en.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || name_en;

    // Check duplicate code
    const dup = await pool.query(
      `SELECT id FROM group_categories WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [finalCode, companyId]
    );
    if (dup.rows.length > 0) {
      return sendError(res, 'DUPLICATE', 'A group category with this code already exists', 400);
    }

    const result = await pool.query(
      `INSERT INTO group_categories (company_id, code, name_en, name_ar, description_en, description_ar, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [companyId, finalCode, name_en, finalNameAr, description_en || null, description_ar || null, sort_order || 0, is_active]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Group category created successfully' });
  } catch (err: any) {
    console.error('Error creating group category:', err);
    if (err.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    }
    sendError(res, 'SERVER_ERROR', 'Failed to create group category', 500);
  }
});

// PUT /:id - Update a group category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name_en, name_ar, description_en, description_ar, sort_order, is_active } = req.body;

    const existing = await pool.query(
      `SELECT * FROM group_categories WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Group category not found', 404);
    }

    const result = await pool.query(
      `UPDATE group_categories SET
        code = COALESCE($1, code),
        name_en = COALESCE($2, name_en),
        name_ar = COALESCE($3, name_ar),
        description_en = COALESCE($4, description_en),
        description_ar = COALESCE($5, description_ar),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8 AND deleted_at IS NULL
      RETURNING *`,
      [code, name_en, name_ar, description_en, description_ar, sort_order, is_active, id]
    );

    res.json({ success: true, data: result.rows[0], message: 'Group category updated successfully' });
  } catch (err: any) {
    console.error('Error updating group category:', err);
    if (err.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    }
    sendError(res, 'SERVER_ERROR', 'Failed to update group category', 500);
  }
});

// DELETE /:id - Soft delete a group category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      `SELECT id FROM group_categories WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Group category not found', 404);
    }

    await pool.query(
      `UPDATE group_categories SET deleted_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Group category deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting group category:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to delete group category', 500);
  }
});

export default router;
