import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema with new columns from migration 030
const countrySchema = z.object({
  code: z.string().min(2).max(10), // ISO country code
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  continent: z.string().max(50).optional(), // Asia, Europe, Africa, etc.
  capital_en: z.string().max(100).optional(),
  capital_ar: z.string().max(100).optional(),
  alpha_2: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  alpha_3: z.string().length(3).optional(), // ISO 3166-1 alpha-3
  phone_code_prefix: z.string().max(10).optional(), // +966, +1, etc.
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/countries
 * @desc    Get all countries
 * @access  Private (countries:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('countries:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { continent, is_active, search } = req.query;

      let query = `
        SELECT *
        FROM countries
        WHERE deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (company_id = $${paramCount} OR company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by continent
      if (continent) {
        query += ` AND continent = $${paramCount}`;
        params.push(continent);
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR code ILIKE $${paramCount} OR alpha_2 ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch countries',
        },
      });
    }
  }
);

/**
 * @route   GET /api/countries/:id
 * @desc    Get country by ID
 * @access  Private (countries:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('countries:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM countries
        WHERE id = $1 AND deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (company_id = $2 OR company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Country not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching country:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch country',
        },
      });
    }
  }
);

/**
 * @route   POST /api/countries
 * @desc    Create new country
 * @access  Private (countries:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('countries:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = countrySchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create countries for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create country for another company',
          },
        });
      }

      // Check for duplicate code
      let duplicateCheckQuery = 'SELECT id FROM countries WHERE code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Country code already exists',
          },
        });
      }

      // Insert country
      const result = await pool.query(
        `INSERT INTO countries (
          code, name_en, name_ar, description_en, description_ar,
          continent, capital_en, capital_ar, alpha_2, alpha_3,
          phone_code_prefix, is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.continent || null,
          validatedData.capital_en || null,
          validatedData.capital_ar || null,
          validatedData.alpha_2 || null,
          validatedData.alpha_3 || null,
          validatedData.phone_code_prefix || null,
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

      console.error('Error creating country:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create country',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/countries/:id
 * @desc    Update country
 * @access  Private (countries:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('countries:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = countrySchema.partial().parse(req.body);

      // Check if country exists
      let checkQuery = 'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCountry = await pool.query(checkQuery, checkParams);

      if (existingCountry.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Country not found',
          },
        });
      }

      // Check for duplicate code
      if (validatedData.code) {
        let duplicateCheckQuery = 'SELECT id FROM countries WHERE code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.code, id];

        const targetCompanyId = existingCountry.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Country code already exists',
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
        `UPDATE countries SET ${updateFields.join(', ')}
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

      console.error('Error updating country:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update country',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/countries/:id
 * @desc    Soft delete country
 * @access  Private (countries:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('countries:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if country exists
      let checkQuery = 'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCountry = await pool.query(checkQuery, checkParams);

      if (existingCountry.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Country not found',
          },
        });
      }

      // Check if country is used in cities, ports, border points, etc.
      const usageCheck = await pool.query(
        `SELECT 
          (SELECT COUNT(*) FROM cities WHERE country_id = $1 AND deleted_at IS NULL) as cities_count,
          (SELECT COUNT(*) FROM border_points WHERE country_id = $1 AND deleted_at IS NULL) as border_points_count
        `,
        [id]
      );

      const totalUsage = parseInt(usageCheck.rows[0].cities_count) + parseInt(usageCheck.rows[0].border_points_count);

      if (totalUsage > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Cannot delete country with ${totalUsage} related records`,
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE countries SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Country deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting country:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete country',
        },
      });
    }
  }
);

export default router;
