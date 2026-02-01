import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

const uiThemeSchema = z.object({
  company_id: z.number().int().positive(),
  theme_name: z.string().min(1).max(100),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logo_url: z.string().url().optional(),
  favicon_url: z.string().url().optional(),
  custom_css: z.string().optional(),
  is_active: z.boolean().default(true),
});

router.get('/', authenticate, requirePermission('ui_themes:view'), async (req: Request, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { is_active } = req.query;

    let query = `
      SELECT ut.id, ut.company_id, ut.theme_name, ut.primary_color, ut.secondary_color,
             ut.accent_color, ut.background_color, ut.text_color, ut.logo_url,
             ut.favicon_url, ut.custom_css, ut.is_active,
             ut.created_at, ut.updated_at,
             c.name as company_name
      FROM ui_themes ut
      LEFT JOIN companies c ON ut.company_id = c.id
      WHERE ut.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (companyId) {
      query += ` AND ut.company_id = $${params.length + 1}`;
      params.push(companyId);
    }

    if (is_active !== undefined) {
      query += ` AND ut.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY ut.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching UI themes:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch UI themes' },
    });
  }
});

router.get('/:id', authenticate, requirePermission('ui_themes:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    let query = `
      SELECT ut.id, ut.company_id, ut.theme_name, ut.primary_color, ut.secondary_color,
             ut.accent_color, ut.background_color, ut.text_color, ut.logo_url,
             ut.favicon_url, ut.custom_css, ut.is_active,
             ut.created_at, ut.updated_at,
             c.name as company_name
      FROM ui_themes ut
      LEFT JOIN companies c ON ut.company_id = c.id
      WHERE ut.id = $1 AND ut.deleted_at IS NULL
    `;
    const params: any[] = [id];

    if (companyId) {
      query += ` AND ut.company_id = $2`;
      params.push(companyId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'UI theme not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching UI theme:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch UI theme' },
    });
  }
});

router.post('/', authenticate, requirePermission('ui_themes:create'), async (req: Request, res: Response) => {
  try {
    const validatedData = uiThemeSchema.parse(req.body);
    const { companyId, id: userId } = req.user!;

    // Verify company access
    if (!req.user!.roles.includes('super_admin') && validatedData.company_id !== companyId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot create theme for another company' },
      });
    }

    // Deactivate other themes for this company
    await pool.query(
      `UPDATE ui_themes SET is_active = FALSE WHERE company_id = $1`,
      [validatedData.company_id]
    );

    const result = await pool.query(
      `INSERT INTO ui_themes (
        company_id, theme_name, primary_color, secondary_color, accent_color,
        background_color, text_color, logo_url, favicon_url, custom_css,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        validatedData.company_id,
        validatedData.theme_name,
        validatedData.primary_color,
        validatedData.secondary_color,
        validatedData.accent_color,
        validatedData.background_color,
        validatedData.text_color,
        validatedData.logo_url || null,
        validatedData.favicon_url || null,
        validatedData.custom_css || null,
        validatedData.is_active,
        userId,
        userId,
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
    console.error('Error creating UI theme:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create UI theme' },
    });
  }
});

router.put('/:id', authenticate, requirePermission('ui_themes:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = uiThemeSchema.partial().parse(req.body);
    const { companyId, id: userId } = req.user!;

    const checkQuery = companyId
      ? `SELECT id, company_id FROM ui_themes WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`
      : `SELECT id, company_id FROM ui_themes WHERE id = $1 AND deleted_at IS NULL`;
    const checkParams = companyId ? [id, companyId] : [id];
    const existing = await pool.query(checkQuery, checkParams);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'UI theme not found' },
      });
    }

    // If activating this theme, deactivate others for the same company
    if (validatedData.is_active === true) {
      await pool.query(
        `UPDATE ui_themes SET is_active = FALSE 
         WHERE company_id = $1 AND id != $2`,
        [existing.rows[0].company_id, id]
      );
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'company_id') {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(userId);
    paramCount++;

    updateFields.push(`updated_at = NOW()`);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE ui_themes SET ${updateFields.join(', ')}
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
    console.error('Error updating UI theme:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update UI theme' },
    });
  }
});

router.delete('/:id', authenticate, requirePermission('ui_themes:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId, id: userId } = req.user!;

    const checkQuery = companyId
      ? `SELECT id FROM ui_themes WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`
      : `SELECT id FROM ui_themes WHERE id = $1 AND deleted_at IS NULL`;
    const checkParams = companyId ? [id, companyId] : [id];
    const existing = await pool.query(checkQuery, checkParams);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'UI theme not found' },
      });
    }

    await pool.query(
      `UPDATE ui_themes 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    res.json({
      success: true,
      message: 'UI theme deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting UI theme:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete UI theme' },
    });
  }
});

export default router;
