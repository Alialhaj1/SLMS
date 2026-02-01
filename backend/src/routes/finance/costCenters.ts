/**
 * COST CENTERS API
 * Financial management - cost tracking by department/project/activity
 * Routes: GET /api/finance/cost-centers
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { z } from 'zod';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

const costCenterSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  level: z.number().int().min(1).max(10).default(1),
  is_active: z.boolean().default(true),
});

/**
 * @route   GET /api/finance/cost-centers
 * @desc    Get all cost centers for company
 * @access  Private (cost_centers:view)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active, parent_id, search } = req.query;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          description,
          parent_id,
          level,
          is_active,
          company_id,
          created_at,
          updated_at
        FROM cost_centers
        WHERE company_id = $1 AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      if (parent_id !== undefined) {
        if (parent_id === 'null' || parent_id === '') {
          query += ` AND parent_id IS NULL`;
        } else {
          query += ` AND parent_id = $${paramCount}`;
          params.push(Number(parent_id));
          paramCount++;
        }
      }

      if (search) {
        query += ` AND (code ILIKE $${paramCount} OR name ILIKE $${paramCount} OR name_ar ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY code ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching cost centers:', error);
      return res.status(500).json({ error: 'Failed to fetch cost centers' });
    }
  }
);

/**
 * @route   GET /api/finance/cost-centers/:id
 * @desc    Get single cost center
 * @access  Private (cost_centers:view)
 */
router.get(
  '/:id',
  requirePermission('cost_centers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM cost_centers 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cost center not found' });
      }

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error fetching cost center:', error);
      return res.status(500).json({ error: 'Failed to fetch cost center' });
    }
  }
);

/**
 * @route   POST /api/finance/cost-centers
 * @desc    Create new cost center
 * @access  Private (cost_centers:create)
 */
router.post(
  '/',
  requirePermission('cost_centers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const validatedData = costCenterSchema.parse(req.body);

      const result = await pool.query(
        `INSERT INTO cost_centers (
          code, name, name_ar, description, description_ar, 
          parent_id, level, is_active, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name,
          validatedData.name_ar || null,
          validatedData.description || null,
          validatedData.description_ar || null,
          validatedData.parent_id || null,
          validatedData.level,
          validatedData.is_active,
          companyId,
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating cost center:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Cost center code already exists' });
      }
      return res.status(500).json({ error: 'Failed to create cost center' });
    }
  }
);

/**
 * @route   PUT /api/finance/cost-centers/:id
 * @desc    Update cost center
 * @access  Private (cost_centers:update)
 */
router.put(
  '/:id',
  requirePermission('cost_centers:update'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;
      const validatedData = costCenterSchema.partial().parse(req.body);

      // Check if exists
      const existing = await pool.query(
        `SELECT id FROM cost_centers 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Cost center not found' });
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      Object.entries(validatedData).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      });

      updateFields.push(`updated_at = NOW()`);

      const result = await pool.query(
        `UPDATE cost_centers 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
         RETURNING *`,
        [...updateValues, id, companyId]
      );

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error updating cost center:', error);
      return res.status(500).json({ error: 'Failed to update cost center' });
    }
  }
);

/**
 * @route   DELETE /api/finance/cost-centers/:id
 * @desc    Soft delete cost center
 * @access  Private (cost_centers:delete)
 */
router.delete(
  '/:id',
  requirePermission('cost_centers:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;

      const result = await pool.query(
        `UPDATE cost_centers 
         SET deleted_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cost center not found' });
      }

      return res.json({
        success: true,
        message: 'Cost center deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      return res.status(500).json({ error: 'Failed to delete cost center' });
    }
  }
);

export default router;
