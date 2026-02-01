import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const borderPointSchema = z.object({
  border_point_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  border_point_type: z.enum(['land', 'sea', 'air']),
  country_id: z.number().int().positive(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  customs_office_code: z.string().max(50).optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/border-points
 * @desc    Get all border points
 * @access  Private (border_points:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('border_points:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { country_id, border_point_type, is_active, search } = req.query;

      let query = `
        SELECT bp.*,
               c.name_en as country_name_en,
               c.name_ar as country_name_ar
        FROM border_points bp
        LEFT JOIN countries c ON bp.country_id = c.id
        WHERE bp.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (bp.company_id = $${paramCount} OR bp.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by country
      if (country_id) {
        query += ` AND bp.country_id = $${paramCount}`;
        params.push(parseInt(country_id as string));
        paramCount++;
      }

      // Filter by border point type
      if (border_point_type) {
        query += ` AND bp.border_point_type = $${paramCount}`;
        params.push(border_point_type);
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND bp.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (bp.name_en ILIKE $${paramCount} OR bp.name_ar ILIKE $${paramCount} OR bp.border_point_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY bp.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching border points:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch border points',
        },
      });
    }
  }
);

/**
 * @route   GET /api/border-points/:id
 * @desc    Get border point by ID
 * @access  Private (border_points:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('border_points:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT bp.*,
               c.name_en as country_name_en,
               c.name_ar as country_name_ar
        FROM border_points bp
        LEFT JOIN countries c ON bp.country_id = c.id
        WHERE bp.id = $1 AND bp.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (bp.company_id = $2 OR bp.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Border point not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching border point:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch border point',
        },
      });
    }
  }
);

/**
 * @route   POST /api/border-points
 * @desc    Create new border point
 * @access  Private (border_points:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('border_points:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = borderPointSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create border points for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create border point for another company',
          },
        });
      }

      // Validate country exists
      const countryCheck = await pool.query(
        'SELECT id FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [validatedData.country_id]
      );

      if (countryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Country not found',
          },
        });
      }

      // Check for duplicate border_point_code
      let duplicateCheckQuery = 'SELECT id FROM border_points WHERE border_point_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.border_point_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Border point code already exists',
          },
        });
      }

      // Insert border point
      const result = await pool.query(
        `INSERT INTO border_points (
          border_point_code, name_en, name_ar, description_en, description_ar,
          border_point_type, country_id, latitude, longitude,
          customs_office_code, is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          validatedData.border_point_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.border_point_type,
          validatedData.country_id,
          validatedData.latitude || null,
          validatedData.longitude || null,
          validatedData.customs_office_code || null,
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

      console.error('Error creating border point:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create border point',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/border-points/:id
 * @desc    Update border point
 * @access  Private (border_points:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('border_points:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = borderPointSchema.partial().parse(req.body);

      // Check if border point exists
      let checkQuery = 'SELECT * FROM border_points WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingBorderPoint = await pool.query(checkQuery, checkParams);

      if (existingBorderPoint.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Border point not found',
          },
        });
      }

      // Validate country if provided
      if (validatedData.country_id) {
        const countryCheck = await pool.query(
          'SELECT id FROM countries WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.country_id]
        );

        if (countryCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Country not found',
            },
          });
        }
      }

      // Check for duplicate border_point_code
      if (validatedData.border_point_code) {
        let duplicateCheckQuery = 'SELECT id FROM border_points WHERE border_point_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.border_point_code, id];

        const targetCompanyId = existingBorderPoint.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Border point code already exists',
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
        `UPDATE border_points SET ${updateFields.join(', ')}
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

      console.error('Error updating border point:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update border point',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/border-points/:id
 * @desc    Soft delete border point
 * @access  Private (border_points:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('border_points:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if border point exists
      let checkQuery = 'SELECT * FROM border_points WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingBorderPoint = await pool.query(checkQuery, checkParams);

      if (existingBorderPoint.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Border point not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE border_points SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Border point deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting border point:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete border point',
        },
      });
    }
  }
);

export default router;
