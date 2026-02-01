import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const customsOfficeSchema = z.object({
  office_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  country_id: z.number().int().positive(),
  city_id: z.number().int().positive().optional(),
  office_type: z.enum(['border', 'inland', 'airport', 'seaport']).optional(),
  contact_phone: z.string().max(50).optional(),
  contact_email: z.string().email().max(255).optional(),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/customs-offices
 * @desc    Get all customs offices
 * @access  Private (customs_offices:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('customs_offices:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { country_id, city_id, office_type, is_active, search } = req.query;

      let query = `
        SELECT co.*,
               c.name_en as country_name_en,
               c.name_ar as country_name_ar,
               ct.name_en as city_name_en,
               ct.name_ar as city_name_ar
        FROM customs_offices co
        LEFT JOIN countries c ON co.country_id = c.id
        LEFT JOIN cities ct ON co.city_id = ct.id
        WHERE co.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (co.company_id = $${paramCount} OR co.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by country
      if (country_id) {
        query += ` AND co.country_id = $${paramCount}`;
        params.push(parseInt(country_id as string));
        paramCount++;
      }

      // Filter by city
      if (city_id) {
        query += ` AND co.city_id = $${paramCount}`;
        params.push(parseInt(city_id as string));
        paramCount++;
      }

      // Filter by office type
      if (office_type) {
        query += ` AND co.office_type = $${paramCount}`;
        params.push(office_type);
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND co.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (co.name_en ILIKE $${paramCount} OR co.name_ar ILIKE $${paramCount} OR co.office_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY c.name_en ASC, co.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching customs offices:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch customs offices',
        },
      });
    }
  }
);

/**
 * @route   GET /api/customs-offices/:id
 * @desc    Get customs office by ID
 * @access  Private (customs_offices:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('customs_offices:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT co.*,
               c.name_en as country_name_en,
               c.name_ar as country_name_ar,
               ct.name_en as city_name_en,
               ct.name_ar as city_name_ar
        FROM customs_offices co
        LEFT JOIN countries c ON co.country_id = c.id
        LEFT JOIN cities ct ON co.city_id = ct.id
        WHERE co.id = $1 AND co.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (co.company_id = $2 OR co.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Customs office not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching customs office:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch customs office',
        },
      });
    }
  }
);

/**
 * @route   POST /api/customs-offices
 * @desc    Create new customs office
 * @access  Private (customs_offices:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('customs_offices:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = customsOfficeSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create customs offices for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create customs office for another company',
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

      // Validate city if provided
      if (validatedData.city_id) {
        const cityCheck = await pool.query(
          'SELECT id FROM cities WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.city_id]
        );

        if (cityCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'City not found',
            },
          });
        }
      }

      // Check for duplicate office_code
      let duplicateCheckQuery = 'SELECT id FROM customs_offices WHERE office_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.office_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Customs office code already exists',
          },
        });
      }

      // Insert customs office
      const result = await pool.query(
        `INSERT INTO customs_offices (
          office_code, name_en, name_ar, description_en, description_ar,
          country_id, city_id, office_type, contact_phone, contact_email,
          address_en, address_ar, is_active, company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          validatedData.office_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.country_id,
          validatedData.city_id || null,
          validatedData.office_type || null,
          validatedData.contact_phone || null,
          validatedData.contact_email || null,
          validatedData.address_en || null,
          validatedData.address_ar || null,
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

      console.error('Error creating customs office:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create customs office',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/customs-offices/:id
 * @desc    Update customs office
 * @access  Private (customs_offices:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('customs_offices:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = customsOfficeSchema.partial().parse(req.body);

      // Check if customs office exists
      let checkQuery = 'SELECT * FROM customs_offices WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingOffice = await pool.query(checkQuery, checkParams);

      if (existingOffice.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Customs office not found',
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

      // Validate city if provided
      if (validatedData.city_id) {
        const cityCheck = await pool.query(
          'SELECT id FROM cities WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.city_id]
        );

        if (cityCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'City not found',
            },
          });
        }
      }

      // Check for duplicate office_code
      if (validatedData.office_code) {
        let duplicateCheckQuery = 'SELECT id FROM customs_offices WHERE office_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.office_code, id];

        const targetCompanyId = existingOffice.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Customs office code already exists',
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
        `UPDATE customs_offices SET ${updateFields.join(', ')}
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

      console.error('Error updating customs office:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update customs office',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/customs-offices/:id
 * @desc    Soft delete customs office
 * @access  Private (customs_offices:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('customs_offices:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if customs office exists
      let checkQuery = 'SELECT * FROM customs_offices WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingOffice = await pool.query(checkQuery, checkParams);

      if (existingOffice.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Customs office not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE customs_offices SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Customs office deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting customs office:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete customs office',
        },
      });
    }
  }
);

export default router;
