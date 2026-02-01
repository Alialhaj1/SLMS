import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

// Validation schema
const inventoryPolicySchema = z.object({
  policy_code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  item_category_id: z.number().int().positive().optional(),
  warehouse_id: z.number().int().positive().optional(),
  valuation_method: z.enum(['FIFO', 'LIFO', 'Weighted Average', 'Standard Cost']).default('FIFO'),
  allow_negative_stock: z.boolean().default(false),
  auto_reorder: z.boolean().default(false),
  min_stock_alert: z.boolean().default(true),
  expiry_alert_days: z.number().int().min(0).max(365).default(30), // Alert 30 days before expiry
  policy_rules: z.record(z.any()).optional(), // JSONB for flexible rules
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
});

/**
 * @route   GET /api/inventory-policies
 * @desc    Get all inventory policies
 * @access  Private (inventory_policies:view)
 */
router.get(
  '/',
  authenticate,
  requirePermission('inventory_policies:view'),
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.user!;
      const { item_category_id, warehouse_id, valuation_method, is_active, search } = req.query;

      let query = `
        SELECT ip.*,
               ic.name_en as category_name_en,
               ic.name_ar as category_name_ar,
               w.name_en as warehouse_name_en,
               w.name_ar as warehouse_name_ar
        FROM inventory_policies ip
        LEFT JOIN item_categories ic ON ip.item_category_id = ic.id
        LEFT JOIN warehouses w ON ip.warehouse_id = w.id
        WHERE ip.deleted_at IS NULL
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (ip.company_id = $${paramCount} OR ip.company_id IS NULL)`;
        params.push(companyId);
        paramCount++;
      }

      // Filter by item category
      if (item_category_id) {
        query += ` AND ip.item_category_id = $${paramCount}`;
        params.push(parseInt(item_category_id as string));
        paramCount++;
      }

      // Filter by warehouse
      if (warehouse_id) {
        query += ` AND ip.warehouse_id = $${paramCount}`;
        params.push(parseInt(warehouse_id as string));
        paramCount++;
      }

      // Filter by valuation method
      if (valuation_method) {
        query += ` AND ip.valuation_method = $${paramCount}`;
        params.push(valuation_method);
        paramCount++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND ip.is_active = $${paramCount}`;
        params.push(is_active === 'true');
        paramCount++;
      }

      // Search
      if (search) {
        query += ` AND (ip.name_en ILIKE $${paramCount} OR ip.name_ar ILIKE $${paramCount} OR ip.policy_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY ip.name_en ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error('Error fetching inventory policies:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch inventory policies',
        },
      });
    }
  }
);

/**
 * @route   GET /api/inventory-policies/:id
 * @desc    Get inventory policy by ID
 * @access  Private (inventory_policies:view)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('inventory_policies:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      let query = `
        SELECT ip.*,
               ic.name_en as category_name_en,
               ic.name_ar as category_name_ar,
               w.name_en as warehouse_name_en,
               w.name_ar as warehouse_name_ar
        FROM inventory_policies ip
        LEFT JOIN item_categories ic ON ip.item_category_id = ic.id
        LEFT JOIN warehouses w ON ip.warehouse_id = w.id
        WHERE ip.id = $1 AND ip.deleted_at IS NULL
      `;
      const params: any[] = [id];

      // Multi-tenant filtering
      if (companyId) {
        query += ` AND (ip.company_id = $2 OR ip.company_id IS NULL)`;
        params.push(companyId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Inventory policy not found',
          },
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching inventory policy:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch inventory policy',
        },
      });
    }
  }
);

/**
 * @route   POST /api/inventory-policies
 * @desc    Create new inventory policy
 * @access  Private (inventory_policies:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('inventory_policies:create'),
  async (req: Request, res: Response) => {
    try {
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = inventoryPolicySchema.parse(req.body);

      // Determine target company
      let targetCompanyId = validatedData.company_id || companyId || null;

      // Security: Non-super_admin cannot create inventory policies for other companies
      if (!roles.includes('super_admin') && validatedData.company_id && validatedData.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot create inventory policy for another company',
          },
        });
      }

      // Validate item category if provided
      if (validatedData.item_category_id) {
        const categoryCheck = await pool.query(
          'SELECT id FROM item_categories WHERE id = $1 AND deleted_at IS NULL',
          [validatedData.item_category_id]
        );

        if (categoryCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Item category not found',
            },
          });
        }
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

      // Check for duplicate policy_code
      let duplicateCheckQuery = 'SELECT id FROM inventory_policies WHERE policy_code = $1 AND deleted_at IS NULL';
      const duplicateCheckParams: any[] = [validatedData.policy_code];

      if (targetCompanyId) {
        duplicateCheckQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        duplicateCheckParams.push(targetCompanyId);
      }

      const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Policy code already exists',
          },
        });
      }

      // Insert inventory policy
      const result = await pool.query(
        `INSERT INTO inventory_policies (
          policy_code, name_en, name_ar, description_en, description_ar,
          item_category_id, warehouse_id, valuation_method, allow_negative_stock,
          auto_reorder, min_stock_alert, expiry_alert_days, policy_rules,
          is_active, company_id, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          validatedData.policy_code,
          validatedData.name_en,
          validatedData.name_ar,
          validatedData.description_en || null,
          validatedData.description_ar || null,
          validatedData.item_category_id || null,
          validatedData.warehouse_id || null,
          validatedData.valuation_method,
          validatedData.allow_negative_stock,
          validatedData.auto_reorder,
          validatedData.min_stock_alert,
          validatedData.expiry_alert_days,
          validatedData.policy_rules ? JSON.stringify(validatedData.policy_rules) : null,
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

      console.error('Error creating inventory policy:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create inventory policy',
        },
      });
    }
  }
);

/**
 * @route   PUT /api/inventory-policies/:id
 * @desc    Update inventory policy
 * @access  Private (inventory_policies:edit)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('inventory_policies:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Validate input
      const validatedData = inventoryPolicySchema.partial().parse(req.body);

      // Check if inventory policy exists
      let checkQuery = 'SELECT * FROM inventory_policies WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingPolicy = await pool.query(checkQuery, checkParams);

      if (existingPolicy.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Inventory policy not found',
          },
        });
      }

      // Check for duplicate policy_code
      if (validatedData.policy_code) {
        let duplicateCheckQuery = 'SELECT id FROM inventory_policies WHERE policy_code = $1 AND id != $2 AND deleted_at IS NULL';
        const duplicateCheckParams: any[] = [validatedData.policy_code, id];

        const targetCompanyId = existingPolicy.rows[0].company_id;
        if (targetCompanyId) {
          duplicateCheckQuery += ' AND (company_id = $3 OR company_id IS NULL)';
          duplicateCheckParams.push(targetCompanyId);
        }

        const duplicateCheck = await pool.query(duplicateCheckQuery, duplicateCheckParams);

        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Policy code already exists',
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
          if (key === 'policy_rules') {
            updateFields.push(`${key} = $${paramCount}`);
            updateValues.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramCount}`);
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
        `UPDATE inventory_policies SET ${updateFields.join(', ')}
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

      console.error('Error updating inventory policy:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update inventory policy',
        },
      });
    }
  }
);

/**
 * @route   DELETE /api/inventory-policies/:id
 * @desc    Soft delete inventory policy
 * @access  Private (inventory_policies:delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('inventory_policies:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id: userId, companyId, roles } = req.user!;

      // Check if inventory policy exists
      let checkQuery = 'SELECT * FROM inventory_policies WHERE id = $1 AND deleted_at IS NULL';
      const checkParams: any[] = [id];

      if (companyId && !roles.includes('super_admin')) {
        checkQuery += ' AND (company_id = $2 OR company_id IS NULL)';
        checkParams.push(companyId);
      }

      const existingPolicy = await pool.query(checkQuery, checkParams);

      if (existingPolicy.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Inventory policy not found',
          },
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE inventory_policies SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Inventory policy deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting inventory policy:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete inventory policy',
        },
      });
    }
  }
);

export default router;
