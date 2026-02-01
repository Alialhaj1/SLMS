/**
 * Expense Types Routes
 * أنواع المصاريف
 * 
 * Reference data for expense categories
 */

import express from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';

const router = express.Router();

/**
 * GET /api/expense-types
 * Get all expense types
 */
router.get(
  '/',
  authenticate,
  requireAnyPermission(['expense_types:view', 'expense_requests:view']),
  async (req, res) => {
    try {
      const companyId = req.user!.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');

      const { is_active = 'true', search } = req.query;

      let whereConditions = ['deleted_at IS NULL'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Company filter (global + company-specific)
      if (!isSuperAdmin && companyId) {
        whereConditions.push(`(company_id IS NULL OR company_id = $${paramIndex})`);
        queryParams.push(companyId);
        paramIndex++;
      }

      // Active filter
      if (is_active !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active === 'true');
        paramIndex++;
      }

      // Search filter
      if (search) {
        whereConditions.push(`(
          code ILIKE $${paramIndex} OR
          name ILIKE $${paramIndex} OR
          name_ar ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          et.*,
          a.code as default_account_code,
          a.name as default_account_name
        FROM request_expense_types et
        LEFT JOIN accounts a ON et.default_account_id = a.id
        WHERE ${whereClause}
        ORDER BY et.sort_order ASC, et.name ASC
      `;

      const result = await pool.query(query, queryParams);

      res.json({ data: result.rows, total: result.rows.length });

    } catch (error: any) {
      console.error('Error fetching expense types:', error);
      res.status(500).json({ error: 'Failed to fetch expense types' });
    }
  }
);

/**
 * GET /api/expense-types/:id
 * Get single expense type by ID
 */
router.get(
  '/:id',
  authenticate,
  requireAnyPermission(['expense_types:view', 'expense_requests:view']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          et.*,
          a.code as default_account_code,
          a.name as default_account_name
        FROM request_expense_types et
        LEFT JOIN accounts a ON et.default_account_id = a.id
        WHERE et.id = $1 AND et.deleted_at IS NULL
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense type not found' });
      }

      res.json(result.rows[0]);

    } catch (error: any) {
      console.error('Error fetching expense type:', error);
      res.status(500).json({ error: 'Failed to fetch expense type' });
    }
  }
);

/**
 * POST /api/expense-types
 * Create new expense type
 */
router.post(
  '/',
  authenticate,
  requirePermission('expense_types:create'),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const {
        code,
        name,
        name_ar,
        description,
        description_ar,
        default_account_id,
        requires_shipment = true,
        requires_project = true,
        requires_vendor = true,
        requires_items = false,
        icon,
        color,
        sort_order = 0,
        is_active = true
      } = req.body;

      // Validation
      if (!code || !name || !name_ar) {
        return res.status(400).json({
          error: 'Missing required fields: code, name, name_ar'
        });
      }

      // Check for duplicate code
      const duplicateCheck = await pool.query(
        'SELECT id FROM request_expense_types WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL',
        [code, companyId]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Expense type with this code already exists' });
      }

      const insertQuery = `
        INSERT INTO request_expense_types (
          company_id, code, name, name_ar, description, description_ar,
          default_account_id, requires_shipment, requires_project,
          requires_vendor, requires_items, icon, color, sort_order,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        companyId, code, name, name_ar, description, description_ar,
        default_account_id, requires_shipment, requires_project,
        requires_vendor, requires_items, icon, color, sort_order,
        is_active, userId, userId
      ]);

      res.status(201).json(result.rows[0]);

    } catch (error: any) {
      console.error('Error creating expense type:', error);
      res.status(500).json({ error: 'Failed to create expense type' });
    }
  }
);

/**
 * PUT /api/expense-types/:id
 * Update expense type
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('expense_types:update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      // Check if exists and not system type
      const checkQuery = `
        SELECT * FROM expense_types
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      `;

      const checkResult = await pool.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense type not found' });
      }

      if (checkResult.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot modify system expense type' });
      }

      const {
        code,
        name,
        name_ar,
        description,
        description_ar,
        default_account_id,
        requires_shipment,
        requires_project,
        requires_vendor,
        requires_items,
        icon,
        color,
        sort_order,
        is_active
      } = req.body;

      const updateQuery = `
        UPDATE request_expense_types SET
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          name_ar = COALESCE($3, name_ar),
          description = $4,
          description_ar = $5,
          default_account_id = $6,
          requires_shipment = COALESCE($7, requires_shipment),
          requires_project = COALESCE($8, requires_project),
          requires_vendor = COALESCE($9, requires_vendor),
          requires_items = COALESCE($10, requires_items),
          icon = $11,
          color = $12,
          sort_order = COALESCE($13, sort_order),
          is_active = COALESCE($14, is_active),
          updated_by = $15
        WHERE id = $16 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        code, name, name_ar, description, description_ar,
        default_account_id, requires_shipment, requires_project,
        requires_vendor, requires_items, icon, color,
        sort_order, is_active, userId, id
      ]);

      res.json(result.rows[0]);

    } catch (error: any) {
      console.error('Error updating expense type:', error);
      res.status(500).json({ error: 'Failed to update expense type' });
    }
  }
);

/**
 * DELETE /api/expense-types/:id
 * Soft delete expense type
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('expense_types:delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      // Check if exists and not system type
      const checkQuery = `
        SELECT * FROM expense_types
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      `;

      const checkResult = await pool.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense type not found' });
      }

      if (checkResult.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot delete system expense type' });
      }

      // Check if in use
      const usageCheck = await pool.query(
        'SELECT COUNT(*) as count FROM expense_requests WHERE expense_type_id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot delete expense type - it is in use by expense requests'
        });
      }

      // Soft delete
      const deleteQuery = `
        UPDATE request_expense_types 
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND deleted_at IS NULL
      `;

      await pool.query(deleteQuery, [userId, id]);

      res.json({ message: 'Expense type deleted successfully' });

    } catch (error: any) {
      console.error('Error deleting expense type:', error);
      res.status(500).json({ error: 'Failed to delete expense type' });
    }
  }
);

export default router;

