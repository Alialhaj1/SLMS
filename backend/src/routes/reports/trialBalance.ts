/**
 * 📊 TRIAL BALANCE API ROUTES
 * =====================================================
 * GET /api/reports/trial-balance
 * 
 * Returns aggregated account balances from posted journals
 */

import express, { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { requireCompany } from '../../middleware/companyContext';
import {
  getTrialBalance,
  getTrialBalanceWithHierarchy,
  isTrialBalanceBalanced,
  TrialBalanceRequest,
} from '../../services/reports/trialBalance.service';

const router: Router = express.Router();

// Standard middleware chain for multi-tenant protected routes
router.use(authenticate);
router.use(loadCompanyContext);

/**
 * GET /api/reports/trial-balance
 * 
 * Retrieve trial balance for specified period
 * 
 * Query Parameters:
 * - from_date: string (YYYY-MM-DD) - optional
 * - to_date: string (YYYY-MM-DD) - optional
 * - account_from: string - optional (account code from)
 * - account_to: string - optional (account code to)
 * - level: number - optional (account level)
 * - include_zero_balance: boolean - optional (default: false)
 * - hierarchy: boolean - optional (default: true)
 * 
 * Response:
 * {
 *   data: TrialBalanceRow[],
 *   summary: { total_debit, total_credit, total_balance, is_balanced },
 *   period: { from, to }
 * }
 */
router.get(
  '/',
  requirePermission('accounting:reports:trial-balance'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.company?.id;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Parse query parameters
      const params: TrialBalanceRequest = {
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        account_from: req.query.account_from ? String(req.query.account_from) : undefined,
        account_to: req.query.account_to ? String(req.query.account_to) : undefined,
        level: req.query.level ? parseInt(String(req.query.level), 10) : undefined,
        include_zero_balance: req.query.include_zero_balance === 'true',
      };

      // Validate date parameters
      if (params.from_date && !isValidDate(params.from_date)) {
        return res.status(400).json({ error: 'Invalid from_date format (YYYY-MM-DD)' });
      }

      if (params.to_date && !isValidDate(params.to_date)) {
        return res.status(400).json({ error: 'Invalid to_date format (YYYY-MM-DD)' });
      }

      // Get hierarchy preference (default true)
      const useHierarchy = req.query.hierarchy !== 'false';

      // Fetch trial balance
      const result = useHierarchy
        ? await getTrialBalanceWithHierarchy(req, companyId, params)
        : await getTrialBalance(req, companyId, params);

      // Return response
      res.json({
        success: true,
        data: result.data,
        summary: result.summary,
        period: result.period,
        meta: {
          total_rows: result.data.length,
          is_balanced: isTrialBalanceBalanced(result),
          balance_variance: Math.abs(
            result.summary.total_debit - result.summary.total_credit
          ),
        },
      });
    } catch (error: any) {
      console.error('Trial balance error:', error);
      res.status(500).json({
        error: 'Failed to generate trial balance',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/reports/trial-balance/details/:account_id
 * 
 * Get detailed journal entries for specific account in trial balance
 */
router.get(
  '/details/:account_id',
  requirePermission('accounting:reports:trial-balance'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.company?.id;
      const { account_id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const fromDate = req.query.from_date ? String(req.query.from_date) : undefined;
      const toDate = req.query.to_date ? String(req.query.to_date) : undefined;

      // Query posted journal lines + posted opening balance lines for this account
      const query = `
        WITH txns AS (
          SELECT
            COALESCE(je.posting_date, je.entry_date) AS txn_date,
            je.entry_date,
            je.posting_date,
            COALESCE(je.reference, je.entry_number, je.id::text) AS reference,
            COALESCE(je.description, je.narration, '') AS description,
            jl.debit_amount,
            jl.credit_amount,
            jl.description AS line_description,
            je.status
          FROM journal_entries je
          JOIN journal_lines jl ON je.id = jl.journal_entry_id
          WHERE
            je.company_id = $1
            AND jl.account_id = $2
            AND je.status = 'posted'
            ${fromDate ? 'AND je.posting_date >= $3' : ''}
            ${toDate ? `AND je.posting_date <= $${fromDate ? '4' : '3'}` : ''}

          UNION ALL

          SELECT
            ap.start_date AS txn_date,
            ap.start_date AS entry_date,
            ap.start_date AS posting_date,
            obb.batch_no AS reference,
            COALESCE(obl.description, 'Opening Balance') AS description,
            obl.debit AS debit_amount,
            obl.credit AS credit_amount,
            obl.description AS line_description,
            obb.status
          FROM opening_balance_lines obl
          JOIN opening_balance_batches obb ON obb.id = obl.batch_id
          JOIN accounting_periods ap ON ap.id = obb.period_id
          WHERE
            obb.company_id = $1
            AND obl.account_id = $2
            AND obb.status = 'posted'
            ${fromDate ? 'AND ap.start_date >= $3' : ''}
            ${toDate ? `AND ap.start_date <= $${fromDate ? '4' : '3'}` : ''}
        )
        SELECT *
        FROM txns
        ORDER BY txn_date ASC
      `;

      const params: (number | string)[] = [companyId, parseInt(account_id, 10)];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);

      const result = await pool.query(query, params);
      const rows = result.rows;

      res.json({
        success: true,
        account_id: parseInt(account_id, 10),
        entries: rows,
        total_entries: rows.length,
      });
    } catch (error: any) {
      console.error('Trial balance details error:', error);
      res.status(500).json({
        error: 'Failed to fetch trial balance details',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/reports/trial-balance/summary
 * 
 * Get only the summary totals (debit, credit, balance)
 */
router.get(
  '/summary',
  requirePermission('accounting:reports:trial-balance'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.company?.id;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const params: TrialBalanceRequest = {
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
      };

      const result = await getTrialBalance(req, companyId, params);

      res.json({
        success: true,
        summary: result.summary,
        period: result.period,
      });
    } catch (error: any) {
      console.error('Trial balance summary error:', error);
      res.status(500).json({
        error: 'Failed to fetch trial balance summary',
        message: error.message,
      });
    }
  }
);

/**
 * Helper: Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export default router;
