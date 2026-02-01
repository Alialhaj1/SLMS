import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { requireCompany, loadCompanyContext } from '../middleware/companyContext';

const router = Router();

// Apply authentication and company context to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// =============================================
// GET /api/accounting-rules/triggers - List all triggers
// =============================================
router.get('/triggers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT code, name, name_ar, description, entity_type, available_fields, display_order
       FROM accounting_rule_triggers
       WHERE is_active = TRUE
       ORDER BY display_order, name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch triggers'
    });
  }
});

// =============================================
// GET /api/accounting-rules - List rules for company
// =============================================
router.get(
  '/',
  requirePermission('accounting:rules:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { trigger_code, is_active, search, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = `
        SELECT 
          r.id, r.code, r.name, r.name_ar, r.description,
          r.trigger_code, 
          t.name as trigger_name, t.name_ar as trigger_name_ar, t.entity_type,
          r.is_active, r.is_system, r.priority,
          r.auto_post, r.require_approval,
          r.created_at, r.updated_at,
          (SELECT COUNT(*) FROM accounting_rule_conditions WHERE rule_id = r.id) as conditions_count,
          (SELECT COUNT(*) FROM accounting_rule_lines WHERE rule_id = r.id) as lines_count,
          (SELECT COUNT(*) FROM accounting_auto_postings WHERE rule_id = r.id AND status = 'posted') as postings_count
        FROM accounting_rules r
        JOIN accounting_rule_triggers t ON t.code = r.trigger_code
        WHERE r.company_id = $1 AND r.deleted_at IS NULL
      `;

      const params: any[] = [req.companyId];
      let paramIndex = 2;

      if (trigger_code) {
        query += ` AND r.trigger_code = $${paramIndex}`;
        params.push(trigger_code);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND r.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      if (search) {
        query += ` AND (r.name ILIKE $${paramIndex} OR r.name_ar ILIKE $${paramIndex} OR r.code ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Count total - build count query separately to avoid regex issues with subqueries
      let countQuery = `
        SELECT COUNT(*)
        FROM accounting_rules r
        JOIN accounting_rule_triggers t ON t.code = r.trigger_code
        WHERE r.company_id = $1 AND r.deleted_at IS NULL
      `;
      if (trigger_code) {
        countQuery += ` AND r.trigger_code = $2`;
      }
      if (is_active !== undefined) {
        const idx = trigger_code ? 3 : 2;
        countQuery += ` AND r.is_active = $${idx}`;
      }
      if (search) {
        const idx = 2 + (trigger_code ? 1 : 0) + (is_active !== undefined ? 1 : 0);
        countQuery += ` AND (r.name ILIKE $${idx} OR r.name_ar ILIKE $${idx} OR r.code ILIKE $${idx})`;
      }
      
      const countParams = params.slice(0, paramIndex - 1); // Exclude pagination params
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY r.priority, r.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Number(limit), offset);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rules'
      });
    }
  }
);

// =============================================
// GET /api/accounting-rules/:id - Get single rule with details
// =============================================
router.get(
  '/:id',
  requirePermission('accounting:rules:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get rule
      const ruleResult = await pool.query(
        `SELECT 
          r.*, 
          t.name as trigger_name, t.name_ar as trigger_name_ar, 
          t.entity_type, t.available_fields
        FROM accounting_rules r
        JOIN accounting_rule_triggers t ON t.code = r.trigger_code
        WHERE r.id = $1 AND r.company_id = $2 AND r.deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (ruleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
      }

      // Get conditions
      const conditionsResult = await pool.query(
        `SELECT id, field_name, operator, field_value, field_value_2, condition_group, sequence
         FROM accounting_rule_conditions
         WHERE rule_id = $1
         ORDER BY condition_group, sequence`,
        [id]
      );

      // Get lines with account details
      const linesResult = await pool.query(
        `SELECT 
          l.*,
          a.code as account_code, a.name as account_name, a.name_ar as account_name_ar,
          fa.code as fallback_account_code, fa.name as fallback_account_name
        FROM accounting_rule_lines l
        LEFT JOIN accounts a ON a.id = l.account_id
        LEFT JOIN accounts fa ON fa.id = l.fallback_account_id
        WHERE l.rule_id = $1
        ORDER BY l.sequence`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...ruleResult.rows[0],
          conditions: conditionsResult.rows,
          lines: linesResult.rows
        }
      });
    } catch (error: any) {
      console.error('Error fetching rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rule'
      });
    }
  }
);

// =============================================
// POST /api/accounting-rules - Create new rule
// =============================================
router.post(
  '/',
  requirePermission('accounting:rules:create'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const {
        code, name, name_ar, description, trigger_code,
        is_active, priority, auto_post, require_approval,
        stop_on_match, conditions, lines
      } = req.body;

      // Validation
      if (!code || !name || !trigger_code) {
        return res.status(400).json({
          success: false,
          error: 'Code, name, and trigger are required'
        });
      }

      await client.query('BEGIN');

      // Check for duplicate code
      const existing = await client.query(
        `SELECT id FROM accounting_rules WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL`,
        [req.companyId, code]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: `Rule with code ${code} already exists`
        });
      }

      // Validate trigger exists
      const triggerCheck = await client.query(
        `SELECT code FROM accounting_rule_triggers WHERE code = $1`,
        [trigger_code]
      );

      if (triggerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Invalid trigger code'
        });
      }

      // Insert rule
      const ruleResult = await client.query(
        `INSERT INTO accounting_rules (
          company_id, code, name, name_ar, description, trigger_code,
          is_active, priority, auto_post, require_approval, stop_on_match,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *`,
        [
          req.companyId, code, name, name_ar || null, description || null, trigger_code,
          is_active !== false, priority || 100, auto_post || false, require_approval !== false,
          stop_on_match !== false, req.user!.id
        ]
      );

      const ruleId = ruleResult.rows[0].id;

      // Insert conditions
      if (conditions && Array.isArray(conditions)) {
        for (let i = 0; i < conditions.length; i++) {
          const cond = conditions[i];
          await client.query(
            `INSERT INTO accounting_rule_conditions (
              rule_id, field_name, operator, field_value, field_value_2,
              condition_group, sequence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              ruleId, cond.field_name, cond.operator, 
              cond.field_value || null, cond.field_value_2 || null,
              cond.condition_group || 1, i
            ]
          );
        }
      }

      // Insert lines
      if (lines && Array.isArray(lines)) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          await client.query(
            `INSERT INTO accounting_rule_lines (
              rule_id, line_type, sequence,
              account_source, account_id, account_field, fallback_account_id,
              amount_source, amount_value, amount_field,
              cost_center_source, cost_center_id,
              project_source, project_id,
              shipment_source, shipment_id,
              description_template
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              ruleId, line.line_type, i,
              line.account_source || 'fixed', line.account_id || null, 
              line.account_field || null, line.fallback_account_id || null,
              line.amount_source || 'full_amount', line.amount_value || null, line.amount_field || null,
              line.cost_center_source || 'from_entity', line.cost_center_id || null,
              line.project_source || 'from_entity', line.project_id || null,
              line.shipment_source || 'from_entity', line.shipment_id || null,
              line.description_template || null
            ]
          );
        }
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, 'CREATE_ACCOUNTING_RULE', 'accounting_rule', ruleId, JSON.stringify(ruleResult.rows[0])]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: ruleResult.rows[0],
        message: 'Rule created successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create rule',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PUT /api/accounting-rules/:id - Update rule
// =============================================
router.put(
  '/:id',
  requirePermission('accounting:rules:edit'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const {
        name, name_ar, description, is_active, priority,
        auto_post, require_approval, stop_on_match,
        conditions, lines
      } = req.body;

      await client.query('BEGIN');

      // Check rule exists and is not system
      const existing = await client.query(
        `SELECT * FROM accounting_rules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
      }

      const oldData = existing.rows[0];

      if (oldData.is_system) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'System rules cannot be modified'
        });
      }

      // Update rule
      const result = await client.query(
        `UPDATE accounting_rules SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          description = COALESCE($3, description),
          is_active = COALESCE($4, is_active),
          priority = COALESCE($5, priority),
          auto_post = COALESCE($6, auto_post),
          require_approval = COALESCE($7, require_approval),
          stop_on_match = COALESCE($8, stop_on_match),
          updated_by = $9,
          updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          name, name_ar, description, is_active, priority,
          auto_post, require_approval, stop_on_match,
          req.user!.id, id
        ]
      );

      // Update conditions if provided
      if (conditions !== undefined) {
        // Delete existing conditions
        await client.query(`DELETE FROM accounting_rule_conditions WHERE rule_id = $1`, [id]);
        
        // Insert new conditions
        if (Array.isArray(conditions)) {
          for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            await client.query(
              `INSERT INTO accounting_rule_conditions (
                rule_id, field_name, operator, field_value, field_value_2,
                condition_group, sequence
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                id, cond.field_name, cond.operator,
                cond.field_value || null, cond.field_value_2 || null,
                cond.condition_group || 1, i
              ]
            );
          }
        }
      }

      // Update lines if provided
      if (lines !== undefined) {
        // Delete existing lines
        await client.query(`DELETE FROM accounting_rule_lines WHERE rule_id = $1`, [id]);
        
        // Insert new lines
        if (Array.isArray(lines)) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            await client.query(
              `INSERT INTO accounting_rule_lines (
                rule_id, line_type, sequence,
                account_source, account_id, account_field, fallback_account_id,
                amount_source, amount_value, amount_field,
                cost_center_source, cost_center_id,
                project_source, project_id,
                shipment_source, shipment_id,
                description_template
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
              [
                id, line.line_type, i,
                line.account_source || 'fixed', line.account_id || null,
                line.account_field || null, line.fallback_account_id || null,
                line.amount_source || 'full_amount', line.amount_value || null, line.amount_field || null,
                line.cost_center_source || 'from_entity', line.cost_center_id || null,
                line.project_source || 'from_entity', line.project_id || null,
                line.shipment_source || 'from_entity', line.shipment_id || null,
                line.description_template || null
              ]
            );
          }
        }
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user!.id, 'UPDATE_ACCOUNTING_RULE', 'accounting_rule', id, JSON.stringify(oldData), JSON.stringify(result.rows[0])]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Rule updated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rule'
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// DELETE /api/accounting-rules/:id - Delete rule
// =============================================
router.delete(
  '/:id',
  requirePermission('accounting:rules:delete'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check rule exists
      const existing = await client.query(
        `SELECT * FROM accounting_rules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, req.companyId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
      }

      if (existing.rows[0].is_system) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'System rules cannot be deleted'
        });
      }

      // Check if rule has been used
      const usageCheck = await client.query(
        `SELECT COUNT(*) FROM accounting_auto_postings WHERE rule_id = $1 AND status = 'posted'`,
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        // Soft delete
        await client.query(
          `UPDATE accounting_rules SET deleted_at = NOW(), updated_by = $1 WHERE id = $2`,
          [req.user!.id, id]
        );
      } else {
        // Hard delete (cascade will handle conditions and lines)
        await client.query(`DELETE FROM accounting_rules WHERE id = $1`, [id]);
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, 'DELETE_ACCOUNTING_RULE', 'accounting_rule', id, JSON.stringify(existing.rows[0])]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Rule deleted successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete rule'
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/accounting-rules/:id/toggle - Toggle rule active status
// =============================================
router.patch(
  '/:id/toggle',
  requirePermission('accounting:rules:edit'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE accounting_rules 
         SET is_active = NOT is_active, updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING *`,
        [req.user!.id, id, req.companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: result.rows[0].is_active ? 'Rule activated' : 'Rule deactivated'
      });
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle rule'
      });
    }
  }
);

// =============================================
// POST /api/accounting-rules/preview - Preview journal entry for entity
// =============================================
router.post(
  '/preview',
  requirePermission('accounting:rules:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { trigger_code, entity_type, entity_id, entity_data } = req.body;

      if (!trigger_code || !entity_type) {
        return res.status(400).json({
          success: false,
          error: 'trigger_code and entity_type are required'
        });
      }

      // Find matching rules
      const rulesResult = await pool.query(
        `SELECT r.*, 
          (SELECT json_agg(c.*) FROM accounting_rule_conditions c WHERE c.rule_id = r.id) as conditions,
          (SELECT json_agg(l.* ORDER BY l.sequence) FROM accounting_rule_lines l WHERE l.rule_id = r.id) as lines
         FROM accounting_rules r
         WHERE r.company_id = $1 
           AND r.trigger_code = $2 
           AND r.is_active = TRUE 
           AND r.deleted_at IS NULL
         ORDER BY r.priority`,
        [req.companyId, trigger_code]
      );

      if (rulesResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            matched: false,
            message: 'No matching rules found',
            preview: null
          }
        });
      }

      // For now, return the first matching rule's structure
      // In production, this would evaluate conditions and resolve accounts
      const rule = rulesResult.rows[0];
      const lines = rule.lines || [];

      // Build preview
      const preview = {
        rule_id: rule.id,
        rule_code: rule.code,
        rule_name: rule.name,
        auto_post: rule.auto_post,
        require_approval: rule.require_approval,
        journal_lines: lines.map((line: any) => ({
          line_type: line.line_type,
          account_source: line.account_source,
          account_id: line.account_id,
          amount_source: line.amount_source,
          amount_value: line.amount_value,
          description_template: line.description_template,
          // These would be resolved from entity_data
          resolved_account: null,
          resolved_amount: entity_data?.amount || 0,
          resolved_description: line.description_template
        }))
      };

      res.json({
        success: true,
        data: {
          matched: true,
          rule: {
            id: rule.id,
            code: rule.code,
            name: rule.name,
            name_ar: rule.name_ar
          },
          preview
        }
      });
    } catch (error: any) {
      console.error('Error previewing rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview rule'
      });
    }
  }
);

// =============================================
// GET /api/accounting-rules/postings - List auto postings log
// =============================================
router.get(
  '/postings',
  requirePermission('accounting:rules:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { 
        status, trigger_code, source_entity_type, 
        from_date, to_date, page = 1, limit = 50 
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = `
        SELECT 
          ap.*,
          r.name as rule_name, r.name_ar as rule_name_ar,
          t.name as trigger_name, t.name_ar as trigger_name_ar,
          je.entry_number as journal_number,
          u.email as posted_by_email
        FROM accounting_auto_postings ap
        LEFT JOIN accounting_rules r ON r.id = ap.rule_id
        LEFT JOIN accounting_rule_triggers t ON t.code = ap.trigger_code
        LEFT JOIN journal_entries je ON je.id = ap.journal_entry_id
        LEFT JOIN users u ON u.id = ap.posted_by
        WHERE ap.company_id = $1
      `;

      const params: any[] = [req.companyId];
      let paramIndex = 2;

      if (status) {
        query += ` AND ap.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (trigger_code) {
        query += ` AND ap.trigger_code = $${paramIndex}`;
        params.push(trigger_code);
        paramIndex++;
      }

      if (source_entity_type) {
        query += ` AND ap.source_entity_type = $${paramIndex}`;
        params.push(source_entity_type);
        paramIndex++;
      }

      if (from_date) {
        query += ` AND ap.created_at >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        query += ` AND ap.created_at <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      // Count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY ap.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Number(limit), offset);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching postings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch postings'
      });
    }
  }
);

// =============================================
// POST /api/accounting-rules/postings/:id/confirm - Confirm and post a pending posting
// =============================================
router.post(
  '/postings/:id/confirm',
  requirePermission('accounting:rules:post'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Import the confirmAutoPosting function
      const { confirmAutoPosting } = await import('../services/accountingEngine');
      
      const result = await confirmAutoPosting(parseInt(id), userId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          journal_entry_id: result.journal_entry_id
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message
        });
      }
    } catch (error: any) {
      console.error('Error confirming posting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm posting'
      });
    }
  }
);

// =============================================
// POST /api/accounting-rules/preview - Preview accounting entries for an entity
// =============================================
router.post(
  '/preview',
  requirePermission('accounting:rules:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { entity_type, entity_id, trigger_code } = req.body;
      const userId = req.user!.id;

      if (!entity_type || !entity_id || !trigger_code) {
        return res.status(400).json({
          success: false,
          error: 'entity_type, entity_id, and trigger_code are required'
        });
      }

      // Import the runAccountingRules function
      const { runAccountingRules } = await import('../services/accountingEngine');
      
      const result = await runAccountingRules({
        event: trigger_code,
        entity_id: parseInt(entity_id),
        entity_type: entity_type,
        company_id: req.companyId!,
        user_id: userId
      });

      res.json({
        success: result.success,
        status: result.status,
        message: result.message,
        preview_data: result.preview_data,
        auto_posting_id: result.auto_posting_id
      });
    } catch (error: any) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate preview'
      });
    }
  }
);

// =============================================
// POST /api/accounting-rules/run - Manually run accounting rules for an entity
// =============================================
router.post(
  '/run',
  requirePermission('accounting:rules:post'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { entity_type, entity_id, trigger_code, auto_post = false } = req.body;
      const userId = req.user!.id;

      if (!entity_type || !entity_id || !trigger_code) {
        return res.status(400).json({
          success: false,
          error: 'entity_type, entity_id, and trigger_code are required'
        });
      }

      // Import the runAccountingRules function
      const { runAccountingRules } = await import('../services/accountingEngine');
      
      const result = await runAccountingRules({
        event: trigger_code,
        entity_id: parseInt(entity_id),
        entity_type: entity_type,
        company_id: req.companyId!,
        user_id: userId
      });

      // If auto_post is requested and we got a preview, confirm it
      if (auto_post && result.auto_posting_id && result.status === 'preview') {
        const { confirmAutoPosting } = await import('../services/accountingEngine');
        const confirmResult = await confirmAutoPosting(result.auto_posting_id, userId);
        return res.json({
          success: confirmResult.success,
          status: confirmResult.status,
          message: confirmResult.message,
          journal_entry_id: confirmResult.journal_entry_id,
          auto_posting_id: result.auto_posting_id
        });
      }

      res.json({
        success: result.success,
        status: result.status,
        message: result.message,
        preview_data: result.preview_data,
        journal_entry_id: result.journal_entry_id,
        auto_posting_id: result.auto_posting_id
      });
    } catch (error: any) {
      console.error('Error running accounting rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run accounting rules'
      });
    }
  }
);

export default router;
