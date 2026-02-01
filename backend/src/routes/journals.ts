/**
 * Journal Entries API Routes
 * 
 * Core Accounting API with:
 * - Draft/Submit/Approve/Post workflow
 * - Automatic document numbering
 * - Balance validation
 * - Company isolation
 * - Audit trail
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// =============================================
// GET /api/journals - List journal entries
// =============================================
router.get(
  '/',
  requirePermission('accounting:journal:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { status, from_date, to_date, search, entry_type } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `
        SELECT 
          je.id, je.entry_number, je.entry_date, je.posting_date,
          je.entry_type, je.status, je.description, je.narration,
          je.total_debit, je.total_credit,
          je.source_document_type, je.source_document_number,
          je.is_reversal, je.reversal_reason,
          u.full_name as created_by_name,
          ap.full_name as approved_by_name,
          po.full_name as posted_by_name,
          c.code as currency_code
        FROM journal_entries je
        LEFT JOIN users u ON u.id = je.created_by
        LEFT JOIN users ap ON ap.id = je.approved_by
        LEFT JOIN users po ON po.id = je.posted_by
        LEFT JOIN currencies c ON c.id = je.currency_id
        WHERE je.company_id = $1
      `;

      const params: any[] = [req.companyId];
      let paramIndex = 2;

      if (status) {
        query += ` AND je.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (from_date) {
        query += ` AND je.entry_date >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        query += ` AND je.entry_date <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      if (entry_type) {
        query += ` AND je.entry_type = $${paramIndex}`;
        params.push(entry_type);
        paramIndex++;
      }

      if (search) {
        query += ` AND (je.entry_number ILIKE $${paramIndex} OR je.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Count total
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      query += ` ORDER BY je.entry_date DESC, je.id DESC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching journals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch journal entries'
      });
    }
  }
);

// =============================================
// GET /api/journals/:id - Get single journal with lines
// =============================================
router.get(
  '/:id',
  requirePermission('accounting:journal:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get header
      const header = await pool.query(
        `SELECT je.*, 
          u.full_name as created_by_name,
          c.code as currency_code, c.name as currency_name
         FROM journal_entries je
         LEFT JOIN users u ON u.id = je.created_by
         LEFT JOIN currencies c ON c.id = je.currency_id
         WHERE je.id = $1 AND je.company_id = $2`,
        [id, req.companyId]
      );

      if (header.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Journal entry not found'
        });
      }

      // Get lines
      const lines = await pool.query(
        `SELECT jl.*, 
          a.code as account_code, a.name as account_name,
          cc.code as cost_center_code, cc.name as cost_center_name
         FROM journal_lines jl
         LEFT JOIN accounts a ON a.id = jl.account_id
         LEFT JOIN cost_centers cc ON cc.id = jl.cost_center_id
         WHERE jl.journal_entry_id = $1
         ORDER BY jl.line_number`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...header.rows[0],
          lines: lines.rows
        }
      });
    } catch (error: any) {
      console.error('Error fetching journal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch journal entry'
      });
    }
  }
);

// =============================================
// POST /api/journals - Create new journal entry
// =============================================
router.post(
  '/',
  requirePermission('accounting:journal:create'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const {
        entry_date, description, narration, reference,
        currency_id, exchange_rate,
        entry_type = 'manual',
        lines
      } = req.body;

      // Validation
      if (!entry_date || !lines || !Array.isArray(lines) || lines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Entry date and at least 2 lines are required'
        });
      }

      // Validate lines balance
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of lines) {
        if (!line.account_id) {
          return res.status(400).json({
            success: false,
            error: 'Each line must have an account'
          });
        }
        const debit = line.debit_amount ?? line.debit ?? 0;
        const credit = line.credit_amount ?? line.credit ?? 0;
        totalDebit += parseFloat(debit || 0);
        totalCredit += parseFloat(credit || 0);
      }

      // Check balance (allow small rounding difference)
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
        });
      }

      await client.query('BEGIN');

      // Verify period is open
      const periodCheck = await client.query(
        `SELECT ap.id, ap.status 
         FROM accounting_periods ap
         JOIN fiscal_years fy ON fy.id = ap.fiscal_year_id
         WHERE fy.company_id = $1 
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [req.companyId, entry_date]
      );

      if (periodCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'No accounting period found for this date'
        });
      }

      if (periodCheck.rows[0].status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Accounting period is not open'
        });
      }

      // Generate entry number
      const entryNumber = await client.query(
        `SELECT generate_document_number($1, 'journal_entry', $2, NULL, NULL, $3::date) as number`,
        [req.companyId, req.user!.id, entry_date]
      );

      const number = entryNumber.rows[0]?.number || `JE-${Date.now()}`;

      // Get fiscal year and period
      const fiscalInfo = await client.query(
        `SELECT fy.id as fiscal_year_id, ap.id as period_id
         FROM fiscal_years fy
         JOIN accounting_periods ap ON ap.fiscal_year_id = fy.id
         WHERE fy.company_id = $1 
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [req.companyId, entry_date]
      );

      // Insert header
      const header = await client.query(
        `INSERT INTO journal_entries (
          company_id, entry_number, entry_date,
          fiscal_year_id, period_id,
          entry_type, currency_id, exchange_rate,
          total_debit, total_credit,
          description, narration, reference,
          status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', $14, NOW())
        RETURNING *`,
        [
          req.companyId, number, entry_date,
          fiscalInfo.rows[0]?.fiscal_year_id, fiscalInfo.rows[0]?.period_id,
          entry_type, currency_id || req.companyContext?.currency_id, exchange_rate || 1,
          totalDebit, totalCredit,
          description, narration, reference,
          req.user!.id
        ]
      );

      const journalId = header.rows[0].id;

      // Insert lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const debit = line.debit_amount ?? line.debit ?? 0;
        const credit = line.credit_amount ?? line.credit ?? 0;
        const debitFc = line.fc_debit_amount ?? line.debit_fc ?? line.debit_fc_amount ?? 0;
        const creditFc = line.fc_credit_amount ?? line.credit_fc ?? line.credit_fc_amount ?? 0;

        await client.query(
          `INSERT INTO journal_lines (
            journal_entry_id, line_number,
            account_id, cost_center_id, project_id,
            debit_amount, credit_amount, fc_debit_amount, fc_credit_amount,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            journalId, i + 1,
            line.account_id, line.cost_center_id || null, line.project_id || null,
            debit || 0, credit || 0,
            debitFc || 0, creditFc || 0,
            line.description || null
          ]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
         VALUES ($1, 'created', $2, $3)`,
        [journalId, req.user!.id, `Created with ${lines.length} lines`]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: header.rows[0],
        message: 'Journal entry created successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating journal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create journal entry',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/journals/:id/post - Post journal entry
// =============================================
router.post(
  '/:id/post',
  requirePermission('accounting:journal:post'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Verify journal exists and is in correct status
      const journal = await client.query(
        `SELECT * FROM journal_entries 
         WHERE id = $1 AND company_id = $2`,
        [id, req.companyId]
      );

      if (journal.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Journal entry not found'
        });
      }

      if (journal.rows[0].status === 'posted') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Journal entry is already posted'
        });
      }

      if (journal.rows[0].status === 'cancelled') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Cannot post cancelled journal entry'
        });
      }

      // Call the post function
      const result = await client.query(
        `SELECT post_journal_entry($1, $2) as success`,
        [id, req.user!.id]
      );

      if (!result.rows[0].success) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Failed to post journal entry'
        });
      }

      // Audit log
      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by)
         VALUES ($1, 'posted', $2)`,
        [id, req.user!.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Journal entry posted successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error posting journal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to post journal entry',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/journals/:id/cancel - Cancel draft/approved journal entry
// =============================================
router.post(
  '/:id/cancel',
  requirePermission('accounting:journal:delete'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const journal = await client.query(
        `SELECT id, status FROM journal_entries WHERE id = $1 AND company_id = $2`,
        [id, req.companyId]
      );

      if (journal.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Journal entry not found' });
      }

      const currentStatus = journal.rows[0].status;
      if (currentStatus === 'posted' || currentStatus === 'reversed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Cannot cancel posted/reversed journal entry' });
      }

      if (currentStatus === 'cancelled') {
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'Journal entry already cancelled' });
      }

      await client.query(
        `UPDATE journal_entries
         SET status = 'cancelled', updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [req.user!.id, id, req.companyId]
      );

      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
         VALUES ($1, 'cancelled', $2, $3)`,
        [id, req.user!.id, 'Cancelled by user']
      );

      await client.query('COMMIT');

      return res.json({ success: true, message: 'Journal entry cancelled successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error cancelling journal:', error);
      return res.status(500).json({ success: false, error: 'Failed to cancel journal entry', message: error.message });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/journals/:id/reverse - Reverse posted entry
// =============================================
router.post(
  '/:id/reverse',
  requirePermission('accounting:journal:reverse'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const { reversal_date, reason } = req.body;

      if (!reversal_date || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Reversal date and reason are required'
        });
      }

      await client.query('BEGIN');

      // Call the reverse function
      const result = await client.query(
        `SELECT reverse_journal_entry($1, $2, $3::date, $4) as reversal_id`,
        [id, req.user!.id, reversal_date, reason]
      );

      const reversalId = result.rows[0].reversal_id;

      if (!reversalId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Failed to reverse journal entry'
        });
      }

      // Audit log
      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
         VALUES ($1, 'reversed', $2, $3)`,
        [id, req.user!.id, `Reversed with entry ${reversalId}. Reason: ${reason}`]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: { reversal_id: reversalId },
        message: 'Journal entry reversed successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error reversing journal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reverse journal entry',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

export default router;
