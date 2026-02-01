import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const regionSchema = z.object({
  region_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  parent_region_id: z.number().int().positive().optional(),
  hierarchy_level: z.number().int().min(0).max(5).default(0),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/regions
 * @desc    Get all regions (hierarchical)
 * @access  Private (regions:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('regions:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { parent_region_id, hierarchy_level, is_active, search } = req.query;

      let query = `
        SELECT r.*,
               pr.name_en as parent_region_name_en,
               pr.name_ar as parent_region_name_ar
        FROM regions r
        LEFT JOIN regions pr ON r.parent_region_id = pr.id
        WHERE r.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (r.company_id = $${paramCount} OR r.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by parent region
      if (parent_region_id === 'null' || parent_region_id === '') {
        query += ` AND r.parent_region_id IS NULL`;
      } else if (parent_region_id) {
        query += ` AND r.parent_region_id = $${paramCount}`;
        params.push(parseInt(parent_region_id as string));
        paramCount++;
      }

      // Filter by hierarchy level
      if (hierarchy_level) {
        query += ` AND r.hierarchy_level = $${paramCount}`;
        params.push(parseInt(hierarchy_level as string));
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND r.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (r.name_en ILIKE $${paramCount} OR r.name_ar ILIKE $${paramCount} OR r.region_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY r.hierarchy_level ASC, r.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching regions:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch regions',
        },
      });
    }
  }
);

/**
 * @route   GET /api/regions/:id
 * @desc    Get region by ID
 * @access  Private (regions:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('regions:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT r.*,
               pr.name_en as parent_region_name_en,
               pr.name_ar as parent_region_name_ar,
               (SELECT COUNT(*) FROM regions WHERE parent_region_id = r.id AND deleted_at IS NULL) as children_count
        FROM regions r
        LEFT JOIN regions pr ON r.parent_region_id = pr.id
        WHERE r.id = $1 AND r.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (r.company_id = $2 OR r.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Region not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching region:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch region',
        },
      });
    }
  }
);

/**
 * @route   POST /api/regions
 * @desc    Create new region
 * @access  Private (regions:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('regions:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = regionSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create regions for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create region for another company',
          },
        });
      }

      // Validate parent region exists if provided
      if (validatedData.parent_region_id) {
        const parentCheck = await pool.query(
          'SELECT id, hierarchy_level FROM regions WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.parent_region_id]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Parent region not found',
            },
          });
        }

        // Auto-calculate hierarchy level based on parent
        validatedData.hierarchy_level = parentCheck.rows[0].hierarchy_level + 1;
      }

      // Check for duplicate region_code
      let duplicateCheckQuery = 'SELECT id FROM regions WHERE region_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.region_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Region code already exists',
          },
        });
      }

      // Insert region
      const result = await pool.query(
        `INSERT INTO regions (
          region_code, name_en, name_ar, description_en, description_ar,
          parent_region_id, hierarchy_level, is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          validatedData.region_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.parent_region_id || null,
          validatedData.hierarchy_level,
          validatedData.is_active,
          targetCompanyId,
          userId,
          userId,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      console.error('Error creating region:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create region',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/regions/:id
 * @desc    Update region
 * @access  Private (regions:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('regions:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = regionSchema.partial().parse(req.body);

      // Check if region exists
      let checkQuery = 'SELECT * FROM regions WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingRegion = await pool.query(checkQuery, checkParams);

      if (existingRegion.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Region not found',
          },
        });
      }

      // Validate parent region if provided
      if (validatedData.parent_region_id) {
        // Prevent circular reference
        if (validatedData.parent_region_id === parseInt(id)) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Region cannot be its own parent',
            },
          });
        }

        const parentCheck = await pool.query(
          'SELECT id, hierarchy_level FROM regions WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.parent_region_id]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Parent region not found',
            },
          });
        }

        // Auto-calculate hierarchy level based on parent
        validatedData.hierarchy_level = parentCheck.rows[0].hierarchy_level + 1;
      }

      // Check for duplicate region_code
      if (validatedData.region_code) {
        let duplicateCheckQuery = 'SELECT id FROM regions WHERE region_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.region_code, id];

        const targetCompanyId = existingRegion.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Region code already exists',
            },
          });
        }
      }

      // Build update query dynamically
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

      updateFields.push(`updated_by = $${paramCount}`);
      updateValues.push(userId);
      paramCount++;

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(id);

      const result = await pool.query(
        `UPDATE regions SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING *`,
        updateValues
      );

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      console.error('Error updating region:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update region',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/regions/:id
 * @desc    Soft delete region
 * @access  Private (regions:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('regions:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if region exists
      let checkQuery = 'SELECT * FROM regions WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingRegion = await pool.query(checkQuery, checkParams);

      if (existingRegion.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Region not found',
          },
        });
      }

      // Check if region has child regions
      const childrenCheck = await pool.query(
        'SELECT COUNT(*) FROM regions WHERE parent_region_id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (parseInt(childrenCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cannot delete region with child regions',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE regions SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Region deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting region:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete region',
        },
      });
    }
  }
);

export default router;
