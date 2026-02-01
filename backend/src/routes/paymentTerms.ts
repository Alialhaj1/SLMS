import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const paymentTermSchema = z.object({
  term_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  due_days: z.number().int().min(0).max(3650).default(0), // 0 = immediate payment
  discount_percent: z.number().min(0).max(100).default(0),
  discount_days: z.number().int().min(0).max(365).default(0), // Early payment discount window
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/payment-terms
 * @desc    Get all payment terms
 * @access  Private (payment_terms:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('payment_terms:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { is_active, search } = req.query;

      let query = `
        SELECT *
        FROM payment_terms
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
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR term_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY due_days ASC, name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch payment terms',
        },
      });
    }
  }
);

/**
 * @route   GET /api/payment-terms/:id
 * @desc    Get payment term by ID
 * @access  Private (payment_terms:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('payment_terms:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM payment_terms
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
            message: 'Payment term not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching payment term:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch payment term',
        },
      });
    }
  }
);

/**
 * @route   POST /api/payment-terms
 * @desc    Create new payment term
 * @access  Private (payment_terms:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('payment_terms:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = paymentTermSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create payment terms for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create payment term for another company',
          },
        });
      }

      // Business logic: discount_days cannot exceed due_days
      if (validatedData.discount_days > validatedData.due_days) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Discount days cannot exceed due days',
          },
        });
      }

      // Check for duplicate term_code
      let duplicateCheckQuery = 'SELECT id FROM payment_terms WHERE term_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.term_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Payment term code already exists',
          },
        });
      }

      // Insert payment term
      const result = await pool.query(
        `INSERT INTO payment_terms (
          term_code, name_en, name_ar, description_en, description_ar,
          due_days, discount_percent, discount_days, is_active,
          company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          validatedData.term_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.due_days,
          validatedData.discount_percent,
          validatedData.discount_days,
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

      console.error('Error creating payment term:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create payment term',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/payment-terms/:id
 * @desc    Update payment term
 * @access  Private (payment_terms:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('payment_terms:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = paymentTermSchema.partial().parse(req.body);

      // Check if payment term exists
      let checkQuery = 'SELECT * FROM payment_terms WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingTerm = await pool.query(checkQuery, checkParams);

      if (existingTerm.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Payment term not found',
          },
        });
      }

      // Business logic: discount_days cannot exceed due_days
      const finalDueDays = validatedData.due_days ?? existingTerm.rows[0].due_days;
      const finalDiscountDays = validatedData.discount_days ?? existingTerm.rows[0].discount_days;

      if (finalDiscountDays > finalDueDays) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Discount days cannot exceed due days',
          },
        });
      }

      // Check for duplicate term_code
      if (validatedData.term_code) {
        let duplicateCheckQuery = 'SELECT id FROM payment_terms WHERE term_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.term_code, id];

        const targetCompanyId = existingTerm.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Payment term code already exists',
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
        `UPDATE payment_terms SET ${updateFields.join(', ')}
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

      console.error('Error updating payment term:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update payment term',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/payment-terms/:id
 * @desc    Soft delete payment term
 * @access  Private (payment_terms:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('payment_terms:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if payment term exists
      let checkQuery = 'SELECT * FROM payment_terms WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingTerm = await pool.query(checkQuery, checkParams);

      if (existingTerm.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Payment term not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE payment_terms SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Payment term deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting payment term:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete payment term',
        },
      });
    }
  }
);

export default router;
