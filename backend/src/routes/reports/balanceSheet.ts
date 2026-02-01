/**
 * 📊 BALANCE SHEET API ROUTES
 * =====================================================
 * GET /api/reports/balance-sheet - Main balance sheet report
 * GET /api/reports/balance-sheet/summary - Summary only
 */

import { Router, Request, Response } from 'express';
import {
  getBalanceSheet,
  BalanceSheetRequest,
} from '../../services/reports/balanceSheet.service';
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
 * GET /api/reports/balance-sheet
 * Main balance sheet endpoint
 * 
 * Query Params:
 *   as_of_date: YYYY-MM-DD (required)
 *   include_zero: boolean (optional, default: false)
 *   comparison_date: YYYY-MM-DD (optional)
 */
router.get(
  '/',
  requirePermission('accounting:reports:balance-sheet:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { as_of_date, include_zero, comparison_date } = req.query;

    // Validation
    if (!as_of_date) {
      return res.status(400).json({
        success: false,
        message: 'as_of_date is required',
      });
    }

    // Validate date format
    if (!isValidDate(as_of_date as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const params: BalanceSheetRequest = {
      as_of_date: as_of_date as string,
      include_zero: include_zero === 'true',
    };

    if (comparison_date) {
      params.comparison_date = comparison_date as string;
    }

    const result = await getBalanceSheet(req, companyId, params);

    res.json({
      success: true,
      data: {
        assets: result.assets,
        liabilities: result.liabilities,
        equity: result.equity,
      },
      summary: result.summary,
      as_of_date: result.as_of_date,
      comparison: result.comparison,
      meta: {
        is_balanced: result.summary.is_balanced,
        balance_variance: result.summary.balance_variance,
      },
    });
  })
);

/**
 * GET /api/reports/balance-sheet/summary
 * Summary only (no account details)
 */
router.get(
  '/summary',
  requirePermission('accounting:reports:balance-sheet:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { as_of_date } = req.query;

    if (!as_of_date) {
      return res.status(400).json({
        success: false,
        message: 'as_of_date is required',
      });
    }

    const params: BalanceSheetRequest = {
      as_of_date: as_of_date as string,
      include_zero: false,
    };

    const result = await getBalanceSheet(req, companyId, params);

    res.json({
      success: true,
      summary: result.summary,
      as_of_date: result.as_of_date,
    });
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
