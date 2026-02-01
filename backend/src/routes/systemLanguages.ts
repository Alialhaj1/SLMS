import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const systemLanguageSchema = z.object({
  code: z.string().length(2).regex(/^[a-z]{2}$/),
  name_en: z.string().min(1).max(100),
  name_native: z.string().min(1).max(100),
  direction: z.enum(['ltr', 'rtl']),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

// GET /api/system-languages - List all system languages
router.get('/', authenticate, requirePermission('system_languages:view'), async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    let query = `
      SELECT id, code, name_en, name_native, direction, is_default, is_active, sort_order,
             created_at, updated_at
      FROM system_languages
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY sort_order, name_en`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching system languages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch system languages' },
    });
  }
});

// GET /api/system-languages/:id - Get single system language
router.get('/:id', authenticate, requirePermission('system_languages:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, code, name_en, name_native, direction, is_default, is_active, sort_order,
              created_at, updated_at
       FROM system_languages
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System language not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching system language:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch system language' },
    });
  }
});

// POST /api/system-languages - Create new system language
router.post('/', authenticate, requirePermission('system_languages:create'), async (req: Request, res: Response) => {
  try {
    const validatedData = systemLanguageSchema.parse(req.body);
    const { id: userId } = req.user!;

    // If this language is set as default, unset others
    if (validatedData.is_default) {
      await pool.query(`UPDATE system_languages SET is_default = FALSE WHERE is_default = TRUE`);
    }

    const result = await pool.query(
      `INSERT INTO system_languages (
        code, name_en, name_native, direction, is_default, is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        validatedData.code,
        validatedData.name_en,
        validatedData.name_native,
        validatedData.direction,
        validatedData.is_default,
        validatedData.is_active,
        validatedData.sort_order,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error creating system language:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create system language' },
    });
  }
});

// PUT /api/system-languages/:id - Update system language
router.put('/:id', authenticate, requirePermission('system_languages:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = systemLanguageSchema.partial().parse(req.body);
    const { id: userId } = req.user!;

    const existing = await pool.query(
      `SELECT id FROM system_languages WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System language not found' },
      });
    }

    // If this language is set as default, unset others
    if (validatedData.is_default === true) {
      await pool.query(`UPDATE system_languages SET is_default = FALSE WHERE id != $1`, [id]);
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    updateFields.push(`updated_at = NOW()`);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE system_languages SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error updating system language:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update system language' },
    });
  }
});

// DELETE /api/system-languages/:id - Soft delete system language
router.delete('/:id', authenticate, requirePermission('system_languages:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user!;

    const existing = await pool.query(
      `SELECT id, is_default FROM system_languages WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System language not found' },
      });
    }

    // Prevent deleting default language
    if (existing.rows[0].is_default) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete default language' },
      });
    }

    await pool.query(
      `UPDATE system_languages 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    res.json({
      success: true,
      message: 'System language deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting system language:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete system language' },
    });
  }
});

export default router;
