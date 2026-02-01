import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

// Validation schemas
const createBranchSchema = z.object({
  company_id: z.number().int().positive(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().max(255).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  manager_name: z.string().max(255).optional(),
  is_active: z.boolean().default(true),
  is_headquarters: z.boolean().default(false),
});

const updateBranchSchema = createBranchSchema.partial().omit({ company_id: true });

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

/**
 * GET /api/branches
 * List all branches with optional company filter
 */
router.get(
  '/',
  authenticate,
  requirePermission('branches:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { company_id, search, is_active } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `
        SELECT b.*, 
               c.name as company_name,
               u1.full_name as created_by_name,
               u2.full_name as updated_by_name
        FROM branches b
        INNER JOIN companies c ON b.company_id = c.id
        LEFT JOIN users u1 ON b.created_by = u1.id
        LEFT JOIN users u2 ON b.updated_by = u2.id
        WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Filter by company
      if (company_id) {
        query += ` AND b.company_id = $${paramIndex}`;
        params.push(company_id);
        paramIndex++;
      }

      // Filter by search query
      if (search) {
        query += ` AND (b.name ILIKE $${paramIndex} OR b.code ILIKE $${paramIndex} OR b.city ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND b.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        'SELECT COUNT(DISTINCT b.id) as total FROM'
      ).replace(/ORDER BY.*$/, '');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      query += ` ORDER BY b.is_headquarters DESC, b.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch branches:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branches' });
    }
  }
);

/**
 * GET /api/branches/:id
 * Get single branch by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('branches:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT b.*, 
                c.name as company_name,
                u1.full_name as created_by_name,
                u2.full_name as updated_by_name
         FROM branches b
         INNER JOIN companies c ON b.company_id = c.id
         LEFT JOIN users u1 ON b.created_by = u1.id
         LEFT JOIN users u2 ON b.updated_by = u2.id
         WHERE b.id = $1 AND b.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Failed to fetch branch:', error);
      res.status(500).json({ error: 'Failed to fetch branch' });
    }
  }
);

/**
 * POST /api/branches
 * Create new branch
 */
router.post(
  '/',
  authenticate,
  requirePermission('branches:create'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate input
      const validatedData = createBranchSchema.parse(req.body);

      // Verify company exists
      const companyExists = await pool.query(
        'SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [validatedData.company_id]
      );

      if (companyExists.rows.length === 0) {
        return res.status(400).json({ error: 'Company not found' });
      }

      // Check for duplicate code within company
      const duplicateCode = await pool.query(
        'SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [validatedData.company_id, validatedData.code]
      );

      if (duplicateCode.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Branch code already exists for this company' 
        });
      }

      // If this is set as headquarters, unset other headquarters for this company
      if (validatedData.is_headquarters) {
        await pool.query(
          'UPDATE branches SET is_headquarters = false WHERE company_id = $1',
          [validatedData.company_id]
        );
      }

      // Insert branch
      const result = await pool.query(
        `INSERT INTO branches (
          company_id, code, name, name_ar, country, city, address, 
          phone, email, manager_name, is_active, is_headquarters,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          validatedData.company_id,
          validatedData.code,
          validatedData.name,
          validatedData.name_ar || null,
          validatedData.country || null,
          validatedData.city || null,
          validatedData.address || null,
          validatedData.phone || null,
          validatedData.email || null,
          validatedData.manager_name || null,
          validatedData.is_active,
          validatedData.is_headquarters,
          req.user!.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error('Failed to create branch:', error);
      res.status(500).json({ error: 'Failed to create branch' });
    }
  }
);

/**
 * PUT /api/branches/:id
 * Update existing branch
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('branches:edit'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Capture before state for audit
      await captureBeforeState(req as any, 'branches', parseInt(id));

      // Validate input
      const validatedData = updateBranchSchema.parse(req.body);

      // Check if branch exists
      const existingBranch = await pool.query(
        'SELECT * FROM branches WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingBranch.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      const companyId = existingBranch.rows[0].company_id;

      // Check for duplicate code (excluding current branch)
      if (validatedData.code) {
        const duplicateCode = await pool.query(
          'SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
          [companyId, validatedData.code, id]
        );

        if (duplicateCode.rows.length > 0) {
          return res.status(400).json({ 
            error: 'Branch code already exists for this company' 
          });
        }
      }

      // If setting as headquarters, unset other headquarters
      if (validatedData.is_headquarters) {
        await pool.query(
          'UPDATE branches SET is_headquarters = false WHERE company_id = $1 AND id != $2',
          [companyId, id]
        );
      }

      // Build dynamic update query
      const fields = Object.keys(validatedData);
      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(', ');

      const values = fields.map(field => (validatedData as any)[field]);

      const result = await pool.query(
        `UPDATE branches 
         SET ${setClause}, updated_by = $${fields.length + 2}, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        [id, ...values, req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error('Failed to update branch:', error);
      res.status(500).json({ error: 'Failed to update branch' });
    }
  }
);

/**
 * DELETE /api/branches/:id
 * Soft delete branch
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('branches:delete'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Capture before state for audit
      await captureBeforeState(req as any, 'branches', parseInt(id));

      // Check if branch exists
      const existingBranch = await pool.query(
        'SELECT * FROM branches WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingBranch.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Prevent deleting headquarters if it's the only branch
      if (existingBranch.rows[0].is_headquarters) {
        const branchCount = await pool.query(
          'SELECT COUNT(*) as count FROM branches WHERE company_id = $1 AND deleted_at IS NULL',
          [existingBranch.rows[0].company_id]
        );

        if (parseInt(branchCount.rows[0].count) === 1) {
          return res.status(400).json({ 
            error: 'Cannot delete the only branch. Companies must have at least one branch.' 
          });
        }
      }

      // Soft delete
      await pool.query(
        'UPDATE branches SET deleted_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({ message: 'Branch deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete branch:', error);
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }
);

export default router;
