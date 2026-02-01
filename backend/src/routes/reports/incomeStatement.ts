/**
 * 📊 INCOME STATEMENT API ROUTES
 * =====================================================
 * GET /api/reports/income-statement - Main P&L report
 * GET /api/reports/income-statement/summary - Summary only
 */

import { Router, Request, Response } from 'express';
import {
  getIncomeStatement,
  IncomeStatementRequest,
} from '../../services/reports/incomeStatement.service';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { requireCompany } from '../../middleware/companyContext';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Standard middleware chain for multi-tenant protected routes
router.use(authenticate);
router.use(loadCompanyContext);

/**
 * GET /api/reports/income-statement
 * Main income statement endpoint
 * 
 * Query Params:
 *   from_date: YYYY-MM-DD (required)
 *   to_date: YYYY-MM-DD (required)
 *   include_zero: boolean (optional, default: false)
 *   comparison_from: YYYY-MM-DD (optional, for comparison period)
 *   comparison_to: YYYY-MM-DD (optional, for comparison period)
 */
router.get(
  '/',
  requirePermission('accounting:reports:income-statement:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const {
      from_date,
      to_date,
      include_zero,
      comparison_from,
      comparison_to,
    } = req.query;

    // Validation
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required',
      });
    }

    // Validate date format
    if (!isValidDate(from_date as string) || !isValidDate(to_date as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const params: IncomeStatementRequest = {
      from_date: from_date as string,
      to_date: to_date as string,
      include_zero: include_zero === 'true',
    };

    // Add comparison period if provided
    if (comparison_from && comparison_to) {
      params.comparison_period = {
        from_date: comparison_from as string,
        to_date: comparison_to as string,
      };
    }

    const result = await getIncomeStatement(req, companyId, params);

    res.json({
      success: true,
      data: {
        revenue: result.revenue,
        cogs: result.cogs,
        expenses: result.expenses,
      },
      summary: result.summary,
      period: result.period,
      comparison: result.comparison,
      meta: {
        revenue_count: result.revenue.length,
        cogs_count: result.cogs.length,
        expense_count: result.expenses.length,
        net_profit: result.summary.net_profit,
        net_profit_margin: result.summary.net_profit_margin.toFixed(2) + '%',
      },
    });
  })
);

/**
 * GET /api/reports/income-statement/summary
 * Summary only (no account details)
 * Useful for dashboard widgets
 */
router.get(
  '/summary',
  requirePermission('accounting:reports:income-statement:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required',
      });
    }

    const params: IncomeStatementRequest = {
      from_date: from_date as string,
      to_date: to_date as string,
      include_zero: false,
    };

    const result = await getIncomeStatement(req, companyId, params);

    res.json({
      success: true,
      summary: result.summary,
      period: result.period,
    });
  })
);

/**
 * POST /api/reports/income-statement/export
 * Export to Excel/PDF
 */
router.post(
  '/export',
  requirePermission('accounting:reports:income-statement:export'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { from_date, to_date, format } = req.body;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date required',
      });
    }

    const params: IncomeStatementRequest = {
      from_date,
      to_date,
      include_zero: false,
    };

    const result = await getIncomeStatement(req, companyId, params);

    // Format export (basic implementation)
    if (format === 'pdf') {
      // TODO: Implement PDF export
      res.json({
        success: false,
        message: 'PDF export not yet implemented',
      });
    } else {
      // Excel export
      // TODO: Implement Excel export with xlsx library
      res.json({
        success: false,
        message: 'Excel export not yet implemented',
      });
    }
  })
);

// Helper: Validate date format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export default router;
