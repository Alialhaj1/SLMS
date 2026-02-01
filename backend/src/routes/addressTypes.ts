import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const addressTypeSchema = z.object({
  address_type_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/address-types
 * @desc    Get all address types
 * @access  Private (address_types:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('address_types:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { is_active, search } = req.query;

      let query = `
        SELECT *
        FROM address_types
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
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR address_type_code ILIKE $${paramCount})`;
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
      console.error('Error fetching address types:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch address types',
        },
      });
    }
  }
);

/**
 * @route   GET /api/address-types/:id
 * @desc    Get address type by ID
 * @access  Private (address_types:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('address_types:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM address_types
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
            message: 'Address type not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching address type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch address type',
        },
      });
    }
  }
);

/**
 * @route   POST /api/address-types
 * @desc    Create new address type
 * @access  Private (address_types:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('address_types:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = addressTypeSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create address types for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create address type for another company',
          },
        });
      }

      // Check for duplicate address_type_code
      let duplicateCheckQuery = 'SELECT id FROM address_types WHERE address_type_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.address_type_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Address type code already exists',
          },
        });
      }

      // Insert address type
      const result = await pool.query(
        `INSERT INTO address_types (
          address_type_code, name_en, name_ar, description_en, description_ar,
          is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          validatedData.address_type_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
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

      console.error('Error creating address type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create address type',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/address-types/:id
 * @desc    Update address type
 * @access  Private (address_types:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('address_types:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = addressTypeSchema.partial().parse(req.body);

      // Check if address type exists
      let checkQuery = 'SELECT * FROM address_types WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingAddressType = await pool.query(checkQuery, checkParams);

      if (existingAddressType.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Address type not found',
          },
        });
      }

      // Check for duplicate address_type_code
      if (validatedData.address_type_code) {
        let duplicateCheckQuery = 'SELECT id FROM address_types WHERE address_type_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.address_type_code, id];

        const targetCompanyId = existingAddressType.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Address type code already exists',
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
        `UPDATE address_types SET ${updateFields.join(', ')}
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

      console.error('Error updating address type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update address type',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/address-types/:id
 * @desc    Soft delete address type
 * @access  Private (address_types:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('address_types:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if address type exists
      let checkQuery = 'SELECT * FROM address_types WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingAddressType = await pool.query(checkQuery, checkParams);

      if (existingAddressType.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Address type not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE address_types SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Address type deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting address type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete address type',
        },
      });
    }
  }
);

export default router;
