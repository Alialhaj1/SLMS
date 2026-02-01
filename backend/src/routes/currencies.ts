import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema with new columns from migration 030
const currencySchema = z.object({
  code: z.string().length(3), // ISO 4217 currency code (USD, SAR, EUR)
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  symbol: z.string().max(10),
  subunit_en: z.string().max(50).optional(), // Cent, Halala, Pence
  subunit_ar: z.string().max(50).optional(),
  symbol_position: z.enum(['before', 'after']).default('before'), // $100 vs 100€
  decimal_places: z.number().int().min(0).max(4).default(2),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/currencies
 * @desc    Get all currencies
 * @access  Private (currencies:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('currencies:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { is_active, search } = req.query;

      let query = `
        SELECT *
        FROM currencies
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
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY code ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching currencies:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch currencies',
        },
      });
    }
  }
);

/**
 * @route   GET /api/currencies/:id
 * @desc    Get currency by ID
 * @access  Private (currencies:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('currencies:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM currencies
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
            message: 'Currency not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching currency:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch currency',
        },
      });
    }
  }
);

/**
 * @route   POST /api/currencies
 * @desc    Create new currency
 * @access  Private (currencies:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('currencies:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = currencySchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create currencies for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create currency for another company',
          },
        });
      }

      // Check for duplicate code
      let duplicateCheckQuery = 'SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL';
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
            message: 'Currency code already exists',
          },
        });
      }

      // Insert currency
      const result = await pool.query(
        `INSERT INTO currencies (
          code, name_en, name_ar, description_en, description_ar,
          symbol, subunit_en, subunit_ar, symbol_position, decimal_places,
          is_active, company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.symbol,
          validatedData.subunit_en || null,
          validatedData.subunit_ar || null,
          validatedData.symbol_position,
          validatedData.decimal_places,
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

      console.error('Error creating currency:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create currency',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/currencies/:id
 * @desc    Update currency
 * @access  Private (currencies:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('currencies:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = currencySchema.partial().parse(req.body);

      // Check if currency exists
      let checkQuery = 'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCurrency = await pool.query(checkQuery, checkParams);

      if (existingCurrency.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Currency not found',
          },
        });
      }

      // Check for duplicate code
      if (validatedData.code) {
        let duplicateCheckQuery = 'SELECT id FROM currencies WHERE code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.code, id];

        const targetCompanyId = existingCurrency.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Currency code already exists',
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
        `UPDATE currencies SET ${updateFields.join(', ')}
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

      console.error('Error updating currency:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update currency',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/currencies/:id
 * @desc    Soft delete currency
 * @access  Private (currencies:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('currencies:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if currency exists
      let checkQuery = 'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingCurrency = await pool.query(checkQuery, checkParams);

      if (existingCurrency.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Currency not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE currencies SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Currency deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting currency:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete currency',
        },
      });
    }
  }
);

export default router;
