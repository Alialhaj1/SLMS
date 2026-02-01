/**
 * PROJECTS API
 * Project management for cost tracking
 * Routes: GET /api/finance/projects
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

const projectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget_amount: z.number().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
  is_active: z.boolean().default(true),
});

/**
 * @route   GET /api/finance/projects
 * @desc    Get all projects for company
 * @access  Private (projects:view)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active, status, search } = req.query;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          start_date,
          end_date,
          budget AS budget_amount,
          status,
          is_active,
          company_id,
          created_at,
          updated_at
        FROM projects
        WHERE company_id = $1 AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
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
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
);

/**
 * @route   GET /api/finance/projects/:id
 * @desc    Get single project
 * @access  Private (projects:view)
 */
router.get(
  '/:id',
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM projects 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }
  }
);

/**
 * @route   POST /api/finance/projects
 * @desc    Create new project
 * @access  Private (projects:create)
 */
router.post(
  '/',
  requirePermission('projects:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const validatedData = projectSchema.parse(req.body);

      const result = await pool.query(
        `INSERT INTO projects (
          code, name, name_ar, description, description_ar,
          start_date, end_date, budget_amount, status, is_active, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name,
          validatedData.name_ar || null,
          validatedData.description || null,
          validatedData.description_ar || null,
          validatedData.start_date || null,
          validatedData.end_date || null,
          validatedData.budget_amount || null,
          validatedData.status,
          validatedData.is_active,
          companyId,
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Project code already exists' });
      }
      return res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

/**
 * @route   PUT /api/finance/projects/:id
 * @desc    Update project
 * @access  Private (projects:update)
 */
router.put(
  '/:id',
  requirePermission('projects:update'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;
      const validatedData = projectSchema.partial().parse(req.body);

      const existing = await pool.query(
        `SELECT id FROM projects 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
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
        `UPDATE projects 
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
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

/**
 * @route   DELETE /api/finance/projects/:id
 * @desc    Soft delete project
 * @access  Private (projects:delete)
 */
router.delete(
  '/:id',
  requirePermission('projects:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;

      const result = await pool.query(
        `UPDATE projects 
         SET deleted_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

export default router;
