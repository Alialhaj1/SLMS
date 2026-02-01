import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema with new columns from migration 030
const citySchema = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  country_id: z.number().int().positive(),
  state_province_en: z.string().max(100).optional(),
  state_province_ar: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  is_capital: z.boolean().default(false),
  is_port: z.boolean().default(false),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/cities
 * @desc    Get all cities
 * @access  Private (cities:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('cities:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { country_id, is_port, is_capital, is_active, search } = req.query;

      let query = `
        SELECT c.*,
               co.name_en as country_name_en,
               co.name_ar as country_name_ar,
               co.code as country_code
        FROM cities c
        LEFT JOIN countries co ON c.country_id = co.id
        WHERE c.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (c.company_id = $${paramCount} OR c.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by country
      if (country_id) {
        query += ` AND c.country_id = $${paramCount}`;
        params.push(parseInt(country_id as string));
        paramCount++;
      }

      // Filter by port status
      if (is_port !== undefined) {
        query += ` AND c.is_port = $${paramCount}`;
        params.push(is_port === 'true');
        paramCount++;
      }

      // Filter by capital status
      if (is_capital !== undefined) {
        query += ` AND c.is_capital = $${paramCount}`;
        params.push(is_capital === 'true');
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND c.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (c.name_en ILIKE $${paramCount} OR c.name_ar ILIKE $${paramCount} OR c.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY co.name_en ASC, c.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch cities',
        },
      });
    }
  }
);

/**
 * @route   GET /api/cities/:id
 * @desc    Get city by ID
 * @access  Private (cities:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('cities:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT c.*,
               co.name_en as country_name_en,
               co.name_ar as country_name_ar
        FROM cities c
        LEFT JOIN countries co ON c.country_id = co.id
        WHERE c.id = $1 AND c.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (c.company_id = $2 OR c.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'City not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching city:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch city',
        },
      });
    }
  }
);

/**
 * @route   POST /api/cities
 * @desc    Create new city
 * @access  Private (cities:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('cities:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = citySchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create cities for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create city for another company',
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

      // Check for duplicate code within same country
      let duplicateCheckQuery = 'SELECT id FROM cities WHERE code = $1 AND country_id = $2 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.code, validatedData.country_id];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'City code already exists in this country',
          },
        });
      }

      // If is_capital=true, unset other capitals for same country
      if (validatedData.is_capital) {
        await pool.query(
          `UPDATE cities SET is_capital = FALSE 
           WHERE country_id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL`,
          [validatedData.country_id, targetCompanyId]
        );
      }

      // Insert city
      const result = await pool.query(
        `INSERT INTO cities (
          code, name_en, name_ar, description_en, description_ar,
          country_id, state_province_en, state_province_ar,
          latitude, longitude, is_capital, is_port, is_active,
          company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.country_id,
          validatedData.state_province_en || null,
          validatedData.state_province_ar || null,
          validatedData.latitude || null,
          validatedData.longitude || null,
          validatedData.is_capital,
          validatedData.is_port,
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

      console.error('Error creating city:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create city',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/cities/:id
 * @desc    Update city
 * @access  Private (cities:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('cities:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = citySchema.partial().parse(req.body);

      // Check if city exists
      let checkQuery = 'SELECT * FROM cities WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCity = await pool.query(checkQuery, checkParams);

      if (existingCity.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'City not found',
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

      // Check for duplicate code
      if (validatedData.code || validatedData.country_id) {
        const checkCode = validatedData.code || existingCity.rows[0].code;
        const checkCountryId = validatedData.country_id || existingCity.rows[0].country_id;

        let duplicateCheckQuery = 'SELECT id FROM cities WHERE code = $1 AND country_id = $2 AND id != $3 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [checkCode, checkCountryId, id];

        const targetCompanyId = existingCity.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $4 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'City code already exists in this country',
            },
          });
        }
      }

      // If is_capital=true, unset other capitals for same country
      if (validatedData.is_capital) {
        const targetCountryId = validatedData.country_id || existingCity.rows[0].country_id;
        const targetCompanyId = existingCity.rows[0].company_id;

        await pool.query(
          `UPDATE cities SET is_capital = FALSE 
           WHERE country_id = $1 AND id != $2 AND (company_id = $3 OR company_id IS NULL) AND deleted_at IS NULL`,
          [targetCountryId, id, targetCompanyId]
        );
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
        `UPDATE cities SET ${updateFields.join(', ')}
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

      console.error('Error updating city:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update city',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/cities/:id
 * @desc    Soft delete city
 * @access  Private (cities:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('cities:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if city exists
      let checkQuery = 'SELECT * FROM cities WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCity = await pool.query(checkQuery, checkParams);

      if (existingCity.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'City not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE cities SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'City deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting city:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete city',
        },
      });
    }
  }
);

export default router;
