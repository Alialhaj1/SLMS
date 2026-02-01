import express, { Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = express.Router();

// ============================================
// Shipment Expense Types (Master Data)
// ============================================

/**
 * GET /api/master/shipment-expense-types
 * List all shipment expense types for dropdown
 */
router.get(
  '/master/shipment-expense-types',
  authenticate,
  loadCompanyContext,
  requirePermission('shipments:expenses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;

      const result = await pool.query(
        `SELECT 
          id, code, name_en, name_ar,
          account_number, category, default_distribution_method, is_active
         FROM shipment_expense_types
         WHERE company_id = $1 AND deleted_at IS NULL AND is_active = true
         ORDER BY code`,
        [companyId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching shipment expense types:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch shipment expense types'
        }
      });
    }
  }
);

// ============================================
// Shipment Expenses CRUD
// ============================================

/**
 * GET /api/shipments/:shipmentId/expenses
 * List all expenses for a shipment
 */
router.get(
  '/shipments/:shipmentId/expenses',
  authenticate,
  requirePermission('shipments:expenses:view'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const companyId = req.headers['x-company-id'];

      const result = await pool.query(
        `SELECT 
          se.id,
          se.shipment_id,
          se.project_id,
          se.expense_type_id,
          se.amount,
          se.currency_id,
          se.exchange_rate,
          se.amount_local,
          se.distribution_method,
          se.debit_account_id,
          se.expense_date,
          se.reference_number,
          se.description,
          se.notes,
          se.approval_status,
          se.approved_by,
          se.approved_at,
          se.posted,
          se.posted_at,
          se.journal_entry_id,
          se.created_at,
          se.updated_at,
          
          -- Expense Type details
          set.code as expense_type_code,
          set.name_en as expense_type_name_en,
          set.name_ar as expense_type_name_ar,
          set.account_number as expense_type_account,
          
          -- Currency details
          c.code as currency_code,
          c.symbol as currency_symbol,
          
          -- Account details
          a.account_number as debit_account_number,
          a.account_name_en as debit_account_name_en,
          a.account_name_ar as debit_account_name_ar,
          
          -- Distribution summary
          (SELECT COUNT(*) FROM shipment_expense_distributions sed 
           WHERE sed.shipment_expense_id = se.id) as items_distributed
           
         FROM shipment_expenses se
         LEFT JOIN shipment_expense_types set ON set.id = se.expense_type_id
         LEFT JOIN currencies c ON c.id = se.currency_id
         LEFT JOIN accounts a ON a.id = se.debit_account_id
         WHERE se.shipment_id = $1 
           AND se.company_id = $2 
           AND se.deleted_at IS NULL
         ORDER BY se.expense_date DESC, se.created_at DESC`,
        [shipmentId, companyId]
      );

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('Error fetching shipment expenses:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch shipment expenses'
        }
      });
    }
  }
);

/**
 * GET /api/shipments/:shipmentId/expenses/:id
 * Get single expense details with distribution
 */
router.get(
  '/shipments/:shipmentId/expenses/:id',
  authenticate,
  requirePermission('shipments:expenses:view'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];

      // Get expense details
      const expenseResult = await pool.query(
        `SELECT 
          se.*,
          set.code as expense_type_code,
          set.name_en as expense_type_name_en,
          set.name_ar as expense_type_name_ar,
          c.code as currency_code,
          c.symbol as currency_symbol
         FROM shipment_expenses se
         LEFT JOIN shipment_expense_types set ON set.id = se.expense_type_id
         LEFT JOIN currencies c ON c.id = se.currency_id
         WHERE se.id = $1 
           AND se.shipment_id = $2 
           AND se.company_id = $3 
           AND se.deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (expenseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      // Get distribution details
      const distributionResult = await pool.query(
        `SELECT 
          sed.id,
          sed.shipment_expense_id,
          sed.shipment_item_id,
          sed.allocated_amount,
          sed.distribution_base,
          sed.distribution_percentage,
          
          -- Item details
          lsi.item_code,
          lsi.item_name,
          lsi.item_name_ar,
          lsi.quantity,
          lsi.unit_cost,
          lsi.weight,
          (lsi.quantity * lsi.unit_cost) as item_value
          
         FROM shipment_expense_distributions sed
         JOIN logistics_shipment_items lsi ON lsi.id = sed.shipment_item_id
         WHERE sed.shipment_expense_id = $1
         ORDER BY sed.allocated_amount DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...expenseResult.rows[0],
          distribution: distributionResult.rows
        }
      });
    } catch (error: any) {
      console.error('Error fetching shipment expense details:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch shipment expense details'
        }
      });
    }
  }
);

/**
 * POST /api/shipments/:shipmentId/expenses
 * Create new shipment expense (triggers auto-distribution)
 */
router.post(
  '/shipments/:shipmentId/expenses',
  authenticate,
  requirePermission('shipments:expenses:create'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { shipmentId } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;

      const {
        project_id,
        expense_type_id,
        amount,
        currency_id,
        exchange_rate,
        distribution_method,
        debit_account_id,
        expense_date,
        reference_number,
        description,
        notes
      } = req.body;

      // Validate required fields
      if (!project_id || !expense_type_id || !amount || !currency_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: project_id, expense_type_id, amount, currency_id'
          }
        });
      }

      // Verify shipment exists and not locked
      const shipmentCheck = await client.query(
        `SELECT id, locked_at FROM logistics_shipments 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [shipmentId, companyId]
      );

      if (shipmentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment not found'
          }
        });
      }

      if (shipmentCheck.rows[0].locked_at) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SHIPMENT_LOCKED',
            message: 'Cannot add expenses to locked shipment'
          }
        });
      }

      await client.query('BEGIN');

      // Calculate amount_local
      const finalExchangeRate = exchange_rate || 1.0;
      const amountLocal = amount * finalExchangeRate;

      // Insert expense
      const result = await client.query(
        `INSERT INTO shipment_expenses (
          company_id, shipment_id, project_id, expense_type_id,
          amount, currency_id, exchange_rate, amount_local,
          distribution_method, debit_account_id,
          expense_date, reference_number, description, notes,
          approval_status, posted, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          companyId, shipmentId, project_id, expense_type_id,
          amount, currency_id, finalExchangeRate, amountLocal,
          distribution_method || 'VALUE', debit_account_id,
          expense_date || new Date(), reference_number, description, notes,
          'pending', false, userId
        ]
      );

      // Distribution happens automatically via trigger!

      await client.query('COMMIT');

      // Fetch complete data with relations
      const completeResult = await pool.query(
        `SELECT 
          se.*,
          set.code as expense_type_code,
          set.name_en as expense_type_name_en,
          set.name_ar as expense_type_name_ar,
          c.code as currency_code
         FROM shipment_expenses se
         LEFT JOIN shipment_expense_types set ON set.id = se.expense_type_id
         LEFT JOIN currencies c ON c.id = se.currency_id
         WHERE se.id = $1`,
        [result.rows[0].id]
      );

      res.status(201).json({
        success: true,
        data: completeResult.rows[0],
        message: 'Shipment expense created successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create shipment expense'
        }
      });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/shipments/:shipmentId/expenses/:id
 * Update shipment expense (re-triggers distribution)
 */
router.put(
  '/shipments/:shipmentId/expenses/:id',
  authenticate,
  requirePermission('shipments:expenses:update'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;

      const {
        expense_type_id,
        amount,
        currency_id,
        exchange_rate,
        distribution_method,
        debit_account_id,
        expense_date,
        reference_number,
        description,
        notes
      } = req.body;

      // Check if expense exists and not posted
      const checkResult = await client.query(
        `SELECT id, posted FROM shipment_expenses 
         WHERE id = $1 AND shipment_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      if (checkResult.rows[0].posted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXPENSE_POSTED',
            message: 'Cannot modify posted expense'
          }
        });
      }

      await client.query('BEGIN');

      // Calculate amount_local if amount or exchange_rate changed
      let amountLocal;
      if (amount && exchange_rate) {
        amountLocal = amount * exchange_rate;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (expense_type_id !== undefined) {
        updates.push(`expense_type_id = $${paramIndex++}`);
        values.push(expense_type_id);
      }
      if (amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(amount);
      }
      if (currency_id !== undefined) {
        updates.push(`currency_id = $${paramIndex++}`);
        values.push(currency_id);
      }
      if (exchange_rate !== undefined) {
        updates.push(`exchange_rate = $${paramIndex++}`);
        values.push(exchange_rate);
      }
      if (amountLocal !== undefined) {
        updates.push(`amount_local = $${paramIndex++}`);
        values.push(amountLocal);
      }
      if (distribution_method !== undefined) {
        updates.push(`distribution_method = $${paramIndex++}`);
        values.push(distribution_method);
      }
      if (debit_account_id !== undefined) {
        updates.push(`debit_account_id = $${paramIndex++}`);
        values.push(debit_account_id);
      }
      if (expense_date !== undefined) {
        updates.push(`expense_date = $${paramIndex++}`);
        values.push(expense_date);
      }
      if (reference_number !== undefined) {
        updates.push(`reference_number = $${paramIndex++}`);
        values.push(reference_number);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes);
      }

      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id, shipmentId, companyId);

      const result = await client.query(
        `UPDATE shipment_expenses 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} 
           AND shipment_id = $${paramIndex++} 
           AND company_id = $${paramIndex++} 
           AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      // Re-distribution happens automatically via trigger!

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Shipment expense updated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update shipment expense'
        }
      });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /api/shipments/:shipmentId/expenses/:id
 * Soft delete shipment expense (only if not posted)
 */
router.delete(
  '/shipments/:shipmentId/expenses/:id',
  authenticate,
  requirePermission('shipments:expenses:delete'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;

      // Check if expense exists and not posted
      const checkResult = await pool.query(
        `SELECT id, posted FROM shipment_expenses 
         WHERE id = $1 AND shipment_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      if (checkResult.rows[0].posted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXPENSE_POSTED',
            message: 'Cannot delete posted expense'
          }
        });
      }

      // Soft delete
      await pool.query(
        `UPDATE shipment_expenses 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = $2 AND shipment_id = $3 AND company_id = $4`,
        [userId, id, shipmentId, companyId]
      );

      res.json({
        success: true,
        message: 'Shipment expense deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete shipment expense'
        }
      });
    }
  }
);

// ============================================
// Expense Approval Workflow
// ============================================

/**
 * POST /api/shipments/:shipmentId/expenses/:id/approve
 * Approve shipment expense
 */
router.post(
  '/shipments/:shipmentId/expenses/:id/approve',
  authenticate,
  requirePermission('shipments:expenses:approve'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;

      // Check if expense exists and not posted
      const checkResult = await pool.query(
        `SELECT id, approval_status, posted FROM shipment_expenses 
         WHERE id = $1 AND shipment_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      if (checkResult.rows[0].posted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXPENSE_POSTED',
            message: 'Expense already posted'
          }
        });
      }

      // Approve
      const result = await pool.query(
        `UPDATE shipment_expenses 
         SET approval_status = 'approved',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP,
             updated_by = $1
         WHERE id = $2 AND shipment_id = $3 AND company_id = $4
         RETURNING *`,
        [userId, id, shipmentId, companyId]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Shipment expense approved successfully'
      });
    } catch (error: any) {
      console.error('Error approving shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVE_ERROR',
          message: 'Failed to approve shipment expense'
        }
      });
    }
  }
);

/**
 * POST /api/shipments/:shipmentId/expenses/:id/reject
 * Reject shipment expense
 */
router.post(
  '/shipments/:shipmentId/expenses/:id/reject',
  authenticate,
  requirePermission('shipments:expenses:approve'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;
      const { rejection_reason } = req.body;

      const result = await pool.query(
        `UPDATE shipment_expenses 
         SET approval_status = 'rejected',
             notes = COALESCE(notes || E'\n\n', '') || 'Rejected: ' || $1,
             updated_by = $2
         WHERE id = $3 AND shipment_id = $4 AND company_id = $5 AND posted = false
         RETURNING *`,
        [rejection_reason || 'No reason provided', userId, id, shipmentId, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found or already posted'
          }
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Shipment expense rejected'
      });
    } catch (error: any) {
      console.error('Error rejecting shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REJECT_ERROR',
          message: 'Failed to reject shipment expense'
        }
      });
    }
  }
);

/**
 * POST /api/shipments/:shipmentId/expenses/:id/post
 * Post shipment expense to journal (creates journal entry)
 */
router.post(
  '/shipments/:shipmentId/expenses/:id/post',
  authenticate,
  requirePermission('shipments:expenses:post'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];
      const userId = (req as any).user?.id;

      await client.query('BEGIN');

      // Check if expense exists, is approved, and not posted
      const expenseResult = await client.query(
        `SELECT 
          se.*,
          set.account_number,
          a.id as default_debit_account_id
         FROM shipment_expenses se
         LEFT JOIN shipment_expense_types set ON set.id = se.expense_type_id
         LEFT JOIN accounts a ON a.account_number = set.account_number AND a.company_id = se.company_id
         WHERE se.id = $1 
           AND se.shipment_id = $2 
           AND se.company_id = $3 
           AND se.deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (expenseResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      const expense = expenseResult.rows[0];

      if (expense.posted) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_POSTED',
            message: 'Expense already posted'
          }
        });
      }

      if (expense.approval_status !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_APPROVED',
            message: 'Expense must be approved before posting'
          }
        });
      }

      // TODO: Create journal entry (journal_entries table integration)
      // For now, just mark as posted
      
      const finalDebitAccountId = expense.debit_account_id || expense.default_debit_account_id;

      const result = await client.query(
        `UPDATE shipment_expenses 
         SET posted = true,
             posted_at = CURRENT_TIMESTAMP,
             posted_by = $1,
             debit_account_id = $2,
             updated_by = $1
         WHERE id = $3
         RETURNING *`,
        [userId, finalDebitAccountId, id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Shipment expense posted successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error posting shipment expense:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'POST_ERROR',
          message: error.message || 'Failed to post shipment expense'
        }
      });
    } finally {
      client.release();
    }
  }
);

// ============================================
// Expense Distribution View
// ============================================

/**
 * GET /api/shipments/:shipmentId/expenses/:id/distribution
 * View expense distribution details
 */
router.get(
  '/shipments/:shipmentId/expenses/:id/distribution',
  authenticate,
  requirePermission('shipments:expenses:view'),
  async (req: Request, res: Response) => {
    try {
      const { shipmentId, id } = req.params;
      const companyId = req.headers['x-company-id'];

      // Verify expense exists
      const expenseCheck = await pool.query(
        `SELECT id, amount_local, distribution_method FROM shipment_expenses 
         WHERE id = $1 AND shipment_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [id, shipmentId, companyId]
      );

      if (expenseCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shipment expense not found'
          }
        });
      }

      const expense = expenseCheck.rows[0];

      // Get distribution
      const result = await pool.query(
        `SELECT 
          sed.id,
          sed.allocated_amount,
          sed.distribution_base,
          sed.distribution_percentage,
          
          lsi.id as item_id,
          lsi.item_code,
          lsi.item_name,
          lsi.item_name_ar,
          lsi.quantity,
          lsi.unit_cost,
          lsi.weight,
          (lsi.quantity * lsi.unit_cost) as item_value,
          u.code as unit_code
          
         FROM shipment_expense_distributions sed
         JOIN logistics_shipment_items lsi ON lsi.id = sed.shipment_item_id
         LEFT JOIN units u ON u.id = lsi.unit_id
         WHERE sed.shipment_expense_id = $1
         ORDER BY sed.allocated_amount DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          expense_id: expense.id,
          total_amount: expense.amount_local,
          distribution_method: expense.distribution_method,
          items: result.rows,
          total_distributed: result.rows.reduce((sum, item) => sum + parseFloat(item.allocated_amount), 0)
        }
      });
    } catch (error: any) {
      console.error('Error fetching expense distribution:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch expense distribution'
        }
      });
    }
  }
);

export default router;
