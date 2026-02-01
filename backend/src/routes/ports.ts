import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const portSchema = z.object({
  port_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  port_type: z.enum(['sea', 'air', 'land', 'river']),
  country_id: z.number().int().positive(),
  city_id: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  customs_office_code: z.string().max(50).optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/ports
 * @desc    Get all ports
 * @access  Private (logistics:ports:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('logistics:ports:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { country_id, city_id, port_type, is_active, search } = req.query;

      let query = `
        SELECT p.*,
               co.name_en as country_name_en,
               co.name_ar as country_name_ar,
               c.name_en as city_name_en,
               c.name_ar as city_name_ar
        FROM ports p
        LEFT JOIN countries co ON p.country_id = co.id
        LEFT JOIN cities c ON p.city_id = c.id
        WHERE p.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (p.company_id = $${paramCount} OR p.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by country
      if (country_id) {
        query += ` AND p.country_id = $${paramCount}`;
        params.push(parseInt(country_id as string));
        paramCount++;
      }

      // Filter by city
      if (city_id) {
        query += ` AND p.city_id = $${paramCount}`;
        params.push(parseInt(city_id as string));
        paramCount++;
      }

      // Filter by port type
      if (port_type) {
        query += ` AND p.port_type = $${paramCount}`;
        params.push(port_type);
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND p.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (p.name_en ILIKE $${paramCount} OR p.name_ar ILIKE $${paramCount} OR p.port_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY co.name_en ASC, p.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching ports:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch ports',
        },
      });
    }
  }
);

/**
 * @route   GET /api/ports/:id
 * @desc    Get port by ID
 * @access  Private (ports:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('logistics:ports:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT p.*,
               co.name_en as country_name_en,
               co.name_ar as country_name_ar,
               c.name_en as city_name_en,
               c.name_ar as city_name_ar
        FROM ports p
        LEFT JOIN countries co ON p.country_id = co.id
        LEFT JOIN cities c ON p.city_id = c.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (p.company_id = $2 OR p.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Port not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching port:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch port',
        },
      });
    }
  }
);

/**
 * @route   POST /api/ports
 * @desc    Create new port
 * @access  Private (ports:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('logistics:ports:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = portSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create ports for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create port for another company',
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

      // Check for duplicate port_code
      let duplicateCheckQuery = 'SELECT id FROM ports WHERE code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.port_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Port code already exists',
          },
        });
      }

      // Insert port
      const result = await pool.query(
        `INSERT INTO ports (
          code, name, name_en, name_ar,
          port_type, country_id, city_id, latitude, longitude,
          customs_office_id, is_active, company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          validatedData.port_code,
          validatedData.name_en, // name = name_en for backward compatibility
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.port_type,
          validatedData.country_id,
          validatedData.city_id || null,
          validatedData.latitude || null,
          validatedData.longitude || null,
          validatedData.customs_office_code ? parseInt(validatedData.customs_office_code) : null, // customs_office_id
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

      console.error('Error creating port:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create port',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/ports/:id
 * @desc    Update port
 * @access  Private (ports:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('logistics:ports:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = portSchema.partial().parse(req.body);

      // Check if port exists
      let checkQuery = 'SELECT * FROM ports WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingPort = await pool.query(checkQuery, checkParams);

      if (existingPort.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Port not found',
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

      // Check for duplicate port_code
      if (validatedData.port_code) {
        let duplicateCheckQuery = 'SELECT id FROM ports WHERE code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.port_code, id];

        const targetCompanyId = existingPort.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Port code already exists',
            },
          });
        }
      }

      // Build update query dynamically - map field names to DB column names
      const fieldMapping: Record<string, string> = {
        port_code: 'code',
        name_en: 'name_en',
        name_ar: 'name_ar',
        port_type: 'port_type',
        country_id: 'country_id',
        city_id: 'city_id',
        latitude: 'latitude',
        longitude: 'longitude',
        customs_office_code: 'customs_office_id',
        is_active: 'is_active',
        company_id: 'company_id',
      };
      
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined && fieldMapping[key]) {
          const dbColumn = fieldMapping[key];
          updateFields.push(`${dbColumn} = $${paramCount}`);
          // Handle customs_office_id conversion
          if (key === 'customs_office_code' && value) {
            updateValues.push(parseInt(value as string));
          } else if (key === 'port_code') {
            // Also update 'name' column for backward compatibility
            updateFields.push(`name = $${paramCount}`);
            updateValues.push(value);
          } else {
            updateValues.push(value);
          }
          paramCount++;
        }
      });

      updateFields.push(`updated_by = $${paramCount}`);
      updateValues.push(userId);
      paramCount++;

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(id);

      const result = await pool.query(
        `UPDATE ports SET ${updateFields.join(', ')}
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

      console.error('Error updating port:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update port',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/ports/:id
 * @desc    Soft delete port
 * @access  Private (ports:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('logistics:ports:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if port exists
      let checkQuery = 'SELECT * FROM ports WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingPort = await pool.query(checkQuery, checkParams);

      if (existingPort.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Port not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE ports SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Port deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting port:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete port',
        },
      });
    }
  }
);

export default router;
