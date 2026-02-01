import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const timeZoneSchema = z.object({
  timezone_code: z.string().min(1).max(50), // IANA timezone code (e.g., Asia/Riyadh)
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  utc_offset: z.string().regex(/^[+-]\d{2}:\d{2}$/), // Format: +03:00 or -05:00
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/time-zones
 * @desc    Get all time zones
 * @access  Private (time_zones:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('time_zones:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { is_active, search } = req.query;

      let query = `
        SELECT *
        FROM time_zones
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

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR timezone_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY utc_offset ASC, name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching time zones:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch time zones',
        },
      });
    }
  }
);

/**
 * @route   GET /api/time-zones/:id
 * @desc    Get time zone by ID
 * @access  Private (time_zones:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('time_zones:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM time_zones
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
            message: 'Time zone not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching time zone:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch time zone',
        },
      });
    }
  }
);

/**
 * @route   POST /api/time-zones
 * @desc    Create new time zone
 * @access  Private (time_zones:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('time_zones:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = timeZoneSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create time zones for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create time zone for another company',
          },
        });
      }

      // Check for duplicate timezone_code
      let duplicateCheckQuery = 'SELECT id FROM time_zones WHERE timezone_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.timezone_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Time zone code already exists',
          },
        });
      }

      // Insert time zone
      const result = await pool.query(
        `INSERT INTO time_zones (
          timezone_code, name_en, name_ar, description_en, description_ar,
          utc_offset, is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          validatedData.timezone_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.utc_offset,
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

      console.error('Error creating time zone:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create time zone',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/time-zones/:id
 * @desc    Update time zone
 * @access  Private (time_zones:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('time_zones:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = timeZoneSchema.partial().parse(req.body);

      // Check if time zone exists
      let checkQuery = 'SELECT * FROM time_zones WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingTimeZone = await pool.query(checkQuery, checkParams);

      if (existingTimeZone.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Time zone not found',
          },
        });
      }

      // Check for duplicate timezone_code
      if (validatedData.timezone_code) {
        let duplicateCheckQuery = 'SELECT id FROM time_zones WHERE timezone_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.timezone_code, id];

        const targetCompanyId = existingTimeZone.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Time zone code already exists',
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
        `UPDATE time_zones SET ${updateFields.join(', ')}
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

      console.error('Error updating time zone:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update time zone',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/time-zones/:id
 * @desc    Soft delete time zone
 * @access  Private (time_zones:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('time_zones:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if time zone exists
      let checkQuery = 'SELECT * FROM time_zones WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingTimeZone = await pool.query(checkQuery, checkParams);

      if (existingTimeZone.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Time zone not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE time_zones SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Time zone deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting time zone:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete time zone',
        },
      });
    }
  }
);

export default router;
