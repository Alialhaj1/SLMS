/**
 * Chart of Accounts API Routes
 * 
 * Full CRUD operations for accounts with:
 * - Company isolation
 * - Permission checking
 * - Hierarchical account structure
 * - Balance queries
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

// Apply authentication and company context to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// =============================================
// GET /api/accounts - List all accounts
// =============================================
router.get(
  '/',
  requirePermission('master:accounts:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { search, account_type_id, parent_id, is_active, with_balance, account_behavior, level } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `
        SELECT 
          a.id, a.code, a.name, a.name_ar, a.description,
          a.account_type_id, at.name as account_type_name, at.classification, at.nature,
          a.parent_id, p.code as parent_code, p.name as parent_name,
          a.level, a.is_group as is_header, a.is_active,
          a.account_behavior, ab.name as behavior_name, ab.name_ar as behavior_name_ar,
          a.level_type, a.linked_entity_type, a.linked_entity_id,
          a.is_frozen, a.is_system, a.allow_posting, a.normal_balance,
          a.cost_center_required, a.project_required,
          a.opening_balance, a.current_balance,
          a.opening_balance_foreign, a.current_balance_foreign,
          a.budget_amount, a.display_order, a.notes,
          CASE WHEN a.is_system THEN FALSE ELSE TRUE END as can_delete,
          a.currency_id, c.code as currency_code,
          a.created_at, a.updated_at,
          (SELECT COUNT(*) FROM accounts ch WHERE ch.parent_id = a.id AND ch.deleted_at IS NULL) as children_count
        FROM accounts a
        LEFT JOIN account_types at ON at.id = a.account_type_id
        LEFT JOIN accounts p ON p.id = a.parent_id
        LEFT JOIN currencies c ON c.id = a.currency_id
        LEFT JOIN account_behaviors ab ON ab.code = a.account_behavior
        WHERE a.company_id = $1 AND a.deleted_at IS NULL
      `;

      const params: any[] = [req.companyId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (a.code ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex} OR a.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (account_type_id) {
        query += ` AND a.account_type_id = $${paramIndex}`;
        params.push(account_type_id);
        paramIndex++;
      }

      if (parent_id) {
        query += ` AND a.parent_id = $${paramIndex}`;
        params.push(parent_id);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND a.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      if (account_behavior) {
        query += ` AND a.account_behavior = $${paramIndex}`;
        params.push(account_behavior);
        paramIndex++;
      }

      if (level) {
        query += ` AND a.level = $${paramIndex}`;
        params.push(parseInt(level as string));
        paramIndex++;
      }

      // Build WHERE clause for count query
      let whereClause = `WHERE a.company_id = $1 AND a.deleted_at IS NULL`;
      const countParams: any[] = [req.companyId];
      let countParamIndex = 2;

      if (search) {
        whereClause += ` AND (a.code ILIKE $${countParamIndex} OR a.name ILIKE $${countParamIndex} OR a.name_ar ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
      }
      if (account_type_id) {
        whereClause += ` AND a.account_type_id = $${countParamIndex}`;
        countParams.push(account_type_id);
        countParamIndex++;
      }
      if (parent_id) {
        whereClause += ` AND a.parent_id = $${countParamIndex}`;
        countParams.push(parent_id);
        countParamIndex++;
      }
      if (is_active !== undefined) {
        whereClause += ` AND a.is_active = $${countParamIndex}`;
        countParams.push(is_active === 'true');
        countParamIndex++;
      }
      if (account_behavior) {
        whereClause += ` AND a.account_behavior = $${countParamIndex}`;
        countParams.push(account_behavior);
        countParamIndex++;
      }
      if (level) {
        whereClause += ` AND a.level = $${countParamIndex}`;
        countParams.push(parseInt(level as string));
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM accounts a ${whereClause}`;
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      query += ` ORDER BY a.code`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Optionally include balances from account_balances table
      if (with_balance === 'true' && result.rows.length > 0) {
        const accountIds = result.rows.map(r => r.id);
        const balances = await pool.query(
          `SELECT account_id, SUM(balance) as balance 
           FROM account_balances 
           WHERE company_id = $1 AND account_id = ANY($2)
           GROUP BY account_id`,
          [req.companyId, accountIds]
        );

        const balanceMap = new Map(balances.rows.map(b => [b.account_id, b.balance]));
        result.rows.forEach(row => {
          row.balance = balanceMap.get(row.id) || row.current_balance || 0;
        });
      }

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch accounts',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/accounts/tree - Get accounts as tree structure
// =============================================
router.get(
  '/tree',
  requirePermission('master:accounts:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
          a.id, a.code, a.name, a.name_ar, 
          a.account_type_id, at.name as account_type_name,
          a.parent_id, a.level, a.is_group as is_header, a.is_active
         FROM accounts a
         LEFT JOIN account_types at ON at.id = a.account_type_id
         WHERE a.company_id = $1 AND a.deleted_at IS NULL
         ORDER BY a.code`,
        [req.companyId]
      );

      // Build tree structure
      const accounts = result.rows;
      const accountMap = new Map();
      const tree: any[] = [];

      // First pass: create map
      accounts.forEach(acc => {
        accountMap.set(acc.id, { ...acc, children: [] });
      });

      // Second pass: build tree
      accounts.forEach(acc => {
        const node = accountMap.get(acc.id);
        if (acc.parent_id && accountMap.has(acc.parent_id)) {
          accountMap.get(acc.parent_id).children.push(node);
        } else {
          tree.push(node);
        }
      });

      res.json({
        success: true,
        data: tree
      });
    } catch (error: any) {
      console.error('Error fetching account tree:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account tree'
      });
    }
  }
);

// =============================================
// GET /api/accounts/types - List account types
// =============================================
router.get(
  '/types',
  requirePermission('master:accounts:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          id, code, name, name_ar,
          nature, classification, report_group,
          display_order, is_system, created_at
         FROM account_types
         ORDER BY display_order ASC, code ASC`
      );

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching account types:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch account types'
      });
    }
  }
);

// =============================================
// GET /api/accounts/behaviors - List account behaviors
// =============================================
router.get('/behaviors', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT code, name, name_ar, description, allow_posting, display_order
       FROM account_behaviors
       ORDER BY display_order`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching account behaviors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account behaviors'
    });
  }
});

// =============================================
// GET /api/accounts/level-types - List account level types
// =============================================
router.get('/level-types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT level, code, name, name_ar, description, allow_posting, code_length
       FROM account_level_types
       ORDER BY level`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching account level types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account level types'
    });
  }
});

// =============================================
// GET /api/accounts/linked-entity-types - List linked entity types
// =============================================
router.get('/linked-entity-types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT code, name, name_ar, table_name, display_order
       FROM linked_entity_types
       ORDER BY display_order`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching linked entity types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch linked entity types'
    });
  }
});

// =============================================
// GET /api/accounts/:id - Get single account
// =============================================
router.get(
  '/:id',
  requirePermission('master:accounts:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          a.*,
          a.is_group as is_header,
          CASE WHEN a.is_system THEN FALSE ELSE TRUE END as can_delete,
          at.name as account_type_name,
          p.code as parent_code, p.name as parent_name,
          c.code as currency_code, c.name as currency_name
         FROM accounts a
         LEFT JOIN account_types at ON at.id = a.account_type_id
         LEFT JOIN accounts p ON p.id = a.parent_id
         LEFT JOIN currencies c ON c.id = a.currency_id
         WHERE a.id = $1 AND a.company_id = $2 AND a.deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Get balance
      const balanceResult = await pool.query(
        `SELECT SUM(balance) as balance 
         FROM account_balances 
         WHERE account_id = $1 AND company_id = $2`,
        [id, req.companyId]
      );

      const account = result.rows[0];
      account.balance = balanceResult.rows[0]?.balance || 0;

      res.json({
        success: true,
        data: account
      });
    } catch (error: any) {
      console.error('Error fetching account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account'
      });
    }
  }
);

// =============================================
// POST /api/accounts - Create new account
// =============================================
router.post(
  '/',
  requirePermission('master:accounts:create'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const {
        code, name, name_ar, description,
        account_type_id, parent_id, currency_id,
        is_header, is_active,
        account_behavior, linked_entity_type, linked_entity_id,
        cost_center_required, project_required, notes
      } = req.body;

      // Validation
      if (!code || !name || !account_type_id) {
        return res.status(400).json({
          success: false,
          error: 'Code, name, and account type are required'
        });
      }

      await client.query('BEGIN');

      // Check for duplicate code
      const existing = await client.query(
        `SELECT id FROM accounts 
         WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL`,
        [req.companyId, code]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: `Account with code ${code} already exists`
        });
      }

      // Get account type nature for normal_balance
      const accountTypeResult = await client.query(
        `SELECT nature FROM account_types WHERE id = $1`,
        [account_type_id]
      );
      const normalBalance = accountTypeResult.rows[0]?.nature || 'debit';

      // Calculate level based on parent
      let level = 1;
      if (parent_id) {
        const parentResult = await client.query(
          `SELECT level, company_id FROM accounts WHERE id = $1`,
          [parent_id]
        );

        if (parentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Parent account not found'
          });
        }

        // Verify parent belongs to same company
        if (parentResult.rows[0].company_id !== req.companyId) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'Parent account belongs to different company'
          });
        }

        level = parentResult.rows[0].level + 1;

        // Mark parent as header if not already
        await client.query(
          `UPDATE accounts SET is_group = TRUE, account_behavior = 'GROUP' WHERE id = $1`,
          [parent_id]
        );
      }

      // Determine behavior based on level and settings
      let behavior = account_behavior || 'DETAIL';
      let levelType = 'detail';
      let allowPosting = true;

      if (is_header || level === 1) {
        behavior = 'HEADER';
        levelType = 'header';
        allowPosting = false;
      } else if (level === 2) {
        behavior = 'GROUP';
        levelType = 'group';
        allowPosting = false;
      } else if (linked_entity_type) {
        behavior = 'ANALYTICAL';
        levelType = 'analytical';
      }

      // Insert account
      const result = await client.query(
        `INSERT INTO accounts (
          company_id, code, name, name_ar, description,
          account_type_id, parent_id, currency_id,
          level, is_group, is_active, allow_posting,
          account_behavior, level_type, normal_balance,
          linked_entity_type, linked_entity_id,
          cost_center_required, project_required, notes,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
        RETURNING *`,
        [
          req.companyId, code, name, name_ar || null, description || null,
          account_type_id, parent_id || null, currency_id || null,
          level, is_header || false, is_active !== false, allowPosting,
          behavior, levelType, normalBalance,
          linked_entity_type || null, linked_entity_id || null,
          cost_center_required || false, project_required || false, notes || null,
          req.user!.id
        ]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, 'CREATE_ACCOUNT', 'account', result.rows[0].id, JSON.stringify(result.rows[0])]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Account created successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create account',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PUT /api/accounts/:id - Update account
// =============================================
router.put(
  '/:id',
  requirePermission('master:accounts:edit'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const {
        name, name_ar, description, is_active,
        account_behavior, linked_entity_type, linked_entity_id,
        is_frozen, cost_center_required, project_required,
        budget_amount, notes
      } = req.body;

      await client.query('BEGIN');

      // Check account exists and belongs to company
      const existing = await client.query(
        `SELECT * FROM accounts 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const oldData = existing.rows[0];

      // Don't allow editing system accounts
      if (oldData.is_system) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'System accounts cannot be modified'
        });
      }

      // Update account (code and account_type cannot be changed)
      const result = await client.query(
        `UPDATE accounts SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          description = COALESCE($3, description),
          is_active = COALESCE($4, is_active),
          account_behavior = COALESCE($5, account_behavior),
          linked_entity_type = COALESCE($6, linked_entity_type),
          linked_entity_id = $7,
          is_frozen = COALESCE($8, is_frozen),
          cost_center_required = COALESCE($9, cost_center_required),
          project_required = COALESCE($10, project_required),
          budget_amount = COALESCE($11, budget_amount),
          notes = COALESCE($12, notes),
          updated_by = $13,
          updated_at = NOW()
         WHERE id = $14 AND company_id = $15
         RETURNING *`,
        [
          name, name_ar, description, is_active,
          account_behavior, linked_entity_type, linked_entity_id || null,
          is_frozen, cost_center_required, project_required,
          budget_amount, notes,
          req.user!.id, id, req.companyId
        ]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user!.id, 'UPDATE_ACCOUNT', 'account', id, JSON.stringify(oldData), JSON.stringify(result.rows[0])]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Account updated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update account'
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// DELETE /api/accounts/:id - Soft delete account
// =============================================
router.delete(
  '/:id',
  requirePermission('master:accounts:delete'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check account exists
      const existing = await client.query(
        `SELECT * FROM accounts 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Check if account has balance
      const balanceCheck = await client.query(
        `SELECT SUM(ABS(balance)) as balance FROM account_balances WHERE account_id = $1`,
        [id]
      );

      if (parseFloat(balanceCheck.rows[0]?.balance || 0) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account with balance'
        });
      }

      // Check if account has children
      const childrenCheck = await client.query(
        `SELECT COUNT(*) as count FROM accounts WHERE parent_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (parseInt(childrenCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account with child accounts'
        });
      }

      // Check if account has transactions
      const transactionCheck = await client.query(
        `SELECT COUNT(*) as count FROM journal_lines WHERE account_id = $1`,
        [id]
      );

      if (parseInt(transactionCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account with transactions'
        });
      }

      // Soft delete
      await client.query(
        `UPDATE accounts SET 
          deleted_at = NOW(),
          updated_by = $1,
          updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [req.user!.id, id, req.companyId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, 'DELETE_ACCOUNT', 'account', id, JSON.stringify(existing.rows[0])]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PATCH /api/accounts/:id/toggle-freeze - Toggle account freeze
// =============================================
router.patch(
  '/:id/toggle-freeze',
  requirePermission('master:accounts:edit'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check account exists
      const existing = await client.query(
        `SELECT * FROM accounts 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const oldData = existing.rows[0];
      const newFrozenState = !oldData.is_frozen;

      // Toggle freeze
      const result = await client.query(
        `UPDATE accounts SET 
          is_frozen = $1,
          updated_by = $2,
          updated_at = NOW()
         WHERE id = $3 AND company_id = $4
         RETURNING *`,
        [newFrozenState, req.user!.id, id, req.companyId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user!.id, newFrozenState ? 'FREEZE_ACCOUNT' : 'UNFREEZE_ACCOUNT', 'account', id, JSON.stringify(oldData), JSON.stringify(result.rows[0])]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: newFrozenState ? 'Account frozen successfully' : 'Account unfrozen successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error toggling account freeze:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle account freeze'
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// GET /api/accounts/:id/ledger - Get account ledger
// =============================================
router.get(
  '/:id/ledger',
  requirePermission('reports:financial:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { from_date, to_date } = req.query;

      // Verify account belongs to company
      const accountCheck = await pool.query(
        `SELECT id, code, name FROM accounts 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (accountCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      let query = `
        SELECT 
          gl.id, gl.entry_date, gl.posting_date,
          gl.debit, gl.credit, gl.balance_after as running_balance,
          gl.description, gl.reference,
          je.entry_number, je.narration
        FROM general_ledger gl
        JOIN journal_entries je ON je.id = gl.journal_entry_id
        WHERE gl.account_id = $1 AND gl.company_id = $2
      `;

      const params: any[] = [id, req.companyId];
      let paramIndex = 3;

      if (from_date) {
        query += ` AND gl.entry_date >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        query += ` AND gl.entry_date <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      query += ` ORDER BY gl.entry_date, gl.id`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          account: accountCheck.rows[0],
          entries: result.rows
        }
      });
    } catch (error: any) {
      console.error('Error fetching account ledger:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account ledger'
      });
    }
  }
);

export default router;
