import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const batchNumberSchema = z.object({
  batch_number: z.string().min(1).max(100),
  item_id: z.number().int().positive(),
  manufacturing_date: z.string().optional(), // ISO date
  expiry_date: z.string().optional(), // ISO date
  received_date: z.string().optional(), // ISO date
  quantity: z.number().min(0),
  warehouse_id: z.number().int().positive().optional(),
  location_id: z.number().int().positive().optional(),
  supplier_id: z.number().int().positive().optional(),
  purchase_order_number: z.string().max(100).optional(),
  qr_code: z.string().optional(), // QR code data
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/batch-numbers
 * @desc    Get all batch numbers
 * @access  Private (batch_numbers:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('batch_numbers:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { item_id, warehouse_id, expired, expiring_soon, is_active, search } = req.query;

      let query = `
        SELECT bn.*,
               i.name_en as item_name_en,
               i.name_ar as item_name_ar,
               i.code as item_code,
               w.name_en as warehouse_name_en,
               w.name_ar as warehouse_name_ar,
               s.name_en as supplier_name_en,
               s.name_ar as supplier_name_ar
        FROM batch_numbers bn
        LEFT JOIN items i ON bn.item_id = i.id
        LEFT JOIN warehouses w ON bn.warehouse_id = w.id
        LEFT JOIN vendors s ON bn.supplier_id = s.id
        WHERE bn.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (bn.company_id = $${paramCount} OR bn.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by item
      if (item_id) {
        query += ` AND bn.item_id = $${paramCount}`;
        params.push(parseInt(item_id as string));
        paramCount++;
      }

      // Filter by warehouse
      if (warehouse_id) {
        query += ` AND bn.warehouse_id = $${paramCount}`;
        params.push(parseInt(warehouse_id as string));
        paramCount++;
      }

      // Filter expired batches
      if (expired === 'true') {
        query += ` AND bn.expiry_date < NOW()`;
      }

      // Filter expiring soon (next 30 days)
      if (expiring_soon === 'true') {
        query += ` AND bn.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND bn.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND bn.batch_number ILIKE $${paramCount}`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY bn.expiry_date ASC NULLS LAST, bn.batch_number ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching batch numbers:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch batch numbers',
        },
      });
    }
  }
);

/**
 * @route   GET /api/batch-numbers/:id
 * @desc    Get batch number by ID
 * @access  Private (batch_numbers:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('batch_numbers:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT bn.*,
               i.name_en as item_name_en,
               i.name_ar as item_name_ar,
               w.name_en as warehouse_name_en,
               w.name_ar as warehouse_name_ar
        FROM batch_numbers bn
        LEFT JOIN items i ON bn.item_id = i.id
        LEFT JOIN warehouses w ON bn.warehouse_id = w.id
        WHERE bn.id = $1 AND bn.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (bn.company_id = $2 OR bn.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Batch number not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching batch number:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch batch number',
        },
      });
    }
  }
);

/**
 * @route   POST /api/batch-numbers
 * @desc    Create new batch number
 * @access  Private (batch_numbers:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('batch_numbers:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = batchNumberSchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create batch numbers for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create batch number for another company',
          },
        });
      }

      // Validate item exists
      const itemCheck = await pool.query(
        'SELECT id, track_batches FROM items WHERE id = $1 AND deleted_at IS NULL',
        [validatedData.item_id]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Item not found',
          },
        });
      }

      // Check if item has batch tracking enabled
      if (!itemCheck.rows[0].track_batches) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Batch tracking not enabled for this item',
          },
        });
      }

      // Validate warehouse if provided
      if (validatedData.warehouse_id) {
        const warehouseCheck = await pool.query(
          'SELECT id FROM warehouses WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.warehouse_id]
        );

        if (warehouseCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Warehouse not found',
            },
          });
        }
      }

      // Business logic: expiry_date must be after manufacturing_date
      if (validatedData.manufacturing_date && validatedData.expiry_date) {
        const mfgDate = new Date(validatedData.manufacturing_date);
        const expDate = new Date(validatedData.expiry_date);

        if (expDate <= mfgDate) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Expiry date must be after manufacturing date',
            },
          });
        }
      }

      // Check for duplicate batch_number for same item
      let duplicateCheckQuery = 'SELECT id FROM batch_numbers WHERE batch_number = $1 AND item_id = $2 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.batch_number, validatedData.item_id];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Batch number already exists for this item',
          },
        });
      }

      // Insert batch number
      const result = await pool.query(
        `INSERT INTO batch_numbers (
          batch_number, item_id, manufacturing_date, expiry_date, received_date,
          quantity, warehouse_id, location_id, supplier_id, purchase_order_number,
          qr_code, notes, is_active, company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          validatedData.batch_number,
          validatedData.item_id,
          validatedData.manufacturing_date || null,
          validatedData.expiry_date || null,
          validatedData.received_date || null,
          validatedData.quantity,
          validatedData.warehouse_id || null,
          validatedData.location_id || null,
          validatedData.supplier_id || null,
          validatedData.purchase_order_number || null,
          validatedData.qr_code || null,
          validatedData.notes || null,
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

      console.error('Error creating batch number:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create batch number',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/batch-numbers/:id
 * @desc    Update batch number
 * @access  Private (batch_numbers:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('batch_numbers:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = batchNumberSchema.partial().parse(req.body);

      // Check if batch number exists
      let checkQuery = 'SELECT * FROM batch_numbers WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingBatch = await pool.query(checkQuery, checkParams);

      if (existingBatch.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Batch number not found',
          },
        });
      }

      // Validate item if provided
      if (validatedData.item_id) {
        const itemCheck = await pool.query(
          'SELECT id, track_batches FROM items WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.item_id]
        );

        if (itemCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Item not found',
            },
          });
        }
      }

      // Business logic: expiry_date must be after manufacturing_date
      const finalMfgDate = validatedData.manufacturing_date || existingBatch.rows[0].manufacturing_date;
      const finalExpDate = validatedData.expiry_date || existingBatch.rows[0].expiry_date;

      if (finalMfgDate && finalExpDate) {
        const mfgDate = new Date(finalMfgDate);
        const expDate = new Date(finalExpDate);

        if (expDate <= mfgDate) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Expiry date must be after manufacturing date',
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
        `UPDATE batch_numbers SET ${updateFields.join(', ')}
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

      console.error('Error updating batch number:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update batch number',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/batch-numbers/:id
 * @desc    Soft delete batch number
 * @access  Private (batch_numbers:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('batch_numbers:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if batch number exists
      let checkQuery = 'SELECT * FROM batch_numbers WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingBatch = await pool.query(checkQuery, checkParams);

      if (existingBatch.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Batch number not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE batch_numbers SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Batch number deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting batch number:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete batch number',
        },
      });
    }
  }
);

export default router;
