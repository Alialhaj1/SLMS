import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const contactMethodSchema = z.object({
  contact_method_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  validation_regex: z.string().optional(), // Regex pattern for validation (e.g., email, phone)
  format_example_en: z.string().max(255).optional(), // Example: "+966 5X XXX XXXX"
  format_example_ar: z.string().max(255).optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/contact-methods
 * @desc    Get all contact methods
 * @access  Private (contact_methods:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('contact_methods:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { is_active, search } = req.query;

      let query = `
        SELECT *
        FROM contact_methods
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
        query += ` AND (name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR contact_method_code ILIKE $${paramCount})`;
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
      console.error('Error fetching contact methods:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch contact methods',
        },
      });
    }
  }
);

/**
 * @route   GET /api/contact-methods/:id
 * @desc    Get contact method by ID
 * @access  Private (contact_methods:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('contact_methods:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT *
        FROM contact_methods
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
            message: 'Contact method not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching contact method:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch contact method',
        },
      });
    }
  }
);

/**
 * @route   POST /api/contact-methods
 * @desc    Create new contact method
 * @access  Private (contact_methods:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('contact_methods:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = contactMethodSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create contact methods for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create contact method for another company',
          },
        });
      }

      // Validate regex pattern if provided
      if (validatedData.validation_regex) {
        try {
          new RegExp(validatedData.validation_regex);
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid validation regex pattern',
            },
          });
        }
      }

      // Check for duplicate contact_method_code
      let duplicateCheckQuery = 'SELECT id FROM contact_methods WHERE contact_method_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.contact_method_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Contact method code already exists',
          },
        });
      }

      // Insert contact method
      const result = await pool.query(
        `INSERT INTO contact_methods (
          contact_method_code, name_en, name_ar, description_en, description_ar,
          validation_regex, format_example_en, format_example_ar,
          is_active, company_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          validatedData.contact_method_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.validation_regex || null,
          validatedData.format_example_en || null,
          validatedData.format_example_ar || null,
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

      console.error('Error creating contact method:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create contact method',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/contact-methods/:id
 * @desc    Update contact method
 * @access  Private (contact_methods:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('contact_methods:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = contactMethodSchema.partial().parse(req.body);

      // Check if contact method exists
      let checkQuery = 'SELECT * FROM contact_methods WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingContactMethod = await pool.query(checkQuery, checkParams);

      if (existingContactMethod.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Contact method not found',
          },
        });
      }

      // Validate regex pattern if provided
      if (validatedData.validation_regex) {
        try {
          new RegExp(validatedData.validation_regex);
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid validation regex pattern',
            },
          });
        }
      }

      // Check for duplicate contact_method_code
      if (validatedData.contact_method_code) {
        let duplicateCheckQuery = 'SELECT id FROM contact_methods WHERE contact_method_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.contact_method_code, id];

        const targetCompanyId = existingContactMethod.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Contact method code already exists',
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
        `UPDATE contact_methods SET ${updateFields.join(', ')}
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

      console.error('Error updating contact method:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update contact method',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/contact-methods/:id
 * @desc    Soft delete contact method
 * @access  Private (contact_methods:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('contact_methods:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if contact method exists
      let checkQuery = 'SELECT * FROM contact_methods WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingContactMethod = await pool.query(checkQuery, checkParams);

      if (existingContactMethod.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Contact method not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE contact_methods SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Contact method deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting contact method:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete contact method',
        },
      });
    }
  }
);

export default router;
