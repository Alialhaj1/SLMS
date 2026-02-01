/**
 * 📚 GENERAL LEDGER API ROUTES
 * =====================================================
 * GET /api/reports/general-ledger - Main GL with account selector
 * GET /api/reports/general-ledger/accounts - Account list for selector
 * GET /api/reports/general-ledger/:account_id - Drill-down details
 */

import { Router, Request, Response } from 'express';
import {
  getGeneralLedger,
  getAccounts,
  getGeneralLedgerByType,
  GLRequest,
} from '../../services/reports/generalLedger.service';
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
 * GET /api/reports/general-ledger/accounts
 * Returns list of accounts with balances for account selector
 */
router.get(
  '/accounts',
  requirePermission('accounting:reports:general-ledger:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const exclude_zero = req.query.exclude_zero === 'true';

    const accounts = await getAccounts(companyId, exclude_zero);

    res.json({
      success: true,
      data: accounts,
      meta: {
        total: accounts.length,
      },
    });
  })
);

/**
 * GET /api/reports/general-ledger
 * Main GL endpoint - requires account_id or account_code
 * Query Params:
 *   account_id: number (OR account_code)
 *   account_code: string (OR account_id)
 *   from_date: YYYY-MM-DD (optional, default: beginning)
 *   to_date: YYYY-MM-DD (optional, default: today)
 *   include_opening: boolean (optional, default: true)
 */
router.get(
  '/',
  requirePermission('accounting:reports:general-ledger:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { account_id, account_code, from_date, to_date, include_opening } =
      req.query;

    // Validation
    if (!account_id && !account_code) {
      return res.status(400).json({
        success: false,
        message: 'Either account_id or account_code is required',
      });
    }

    // Validate date format
    if (from_date && !isValidDate(from_date as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid from_date format. Use YYYY-MM-DD',
      });
    }

    if (to_date && !isValidDate(to_date as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid to_date format. Use YYYY-MM-DD',
      });
    }

    const params: GLRequest = {
      account_id: account_id ? parseInt(account_id as string) : undefined,
      account_code: account_code as string,
      from_date: from_date as string,
      to_date: to_date as string,
      include_opening_balance: include_opening !== 'false',
    };

    const result = await getGeneralLedger(req, companyId, params);

    res.json({
      success: true,
      data: result.data,
      account: result.account,
      summary: result.summary,
      period: result.period,
      meta: {
        total_rows: result.data.length,
        opening_balance: result.summary.opening_balance,
        closing_balance: result.summary.closing_balance,
      },
    });
  })
);

/**
 * GET /api/reports/general-ledger/:account_id
 * Convenience endpoint - account_id in path
 * Query Params:
 *   from_date: YYYY-MM-DD (optional)
 *   to_date: YYYY-MM-DD (optional)
 */
router.get(
  '/:account_id',
  requirePermission('accounting:reports:general-ledger:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { account_id } = req.params;
    const { from_date, to_date } = req.query;

    if (!account_id || isNaN(parseInt(account_id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account_id',
      });
    }

    const params: GLRequest = {
      account_id: parseInt(account_id),
      from_date: from_date as string,
      to_date: to_date as string,
    };

    const result = await getGeneralLedger(req, companyId, params);

    res.json({
      success: true,
      data: result.data,
      account: result.account,
      summary: result.summary,
      period: result.period,
      meta: {
        total_rows: result.data.length,
        opening_balance: result.summary.opening_balance,
        closing_balance: result.summary.closing_balance,
      },
    });
  })
);

/**
 * GET /api/reports/general-ledger/by-type/:type
 * Get GL for all accounts of a specific type
 * Returns: { [account_code]: GLResponse }
 */
router.get(
  '/by-type/:type',
  requirePermission('accounting:reports:general-ledger:view'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { type } = req.params;
    const { from_date, to_date } = req.query;

    const params: GLRequest = {
      from_date: from_date as string,
      to_date: to_date as string,
    };

    const result = await getGeneralLedgerByType(req, companyId, type, params);

    res.json({
      success: true,
      data: result,
      meta: {
        type,
        accounts: Object.keys(result).length,
      },
    });
  })
);

/**
 * POST /api/reports/general-ledger/export
 * Export GL to Excel or PDF
 */
router.post(
  '/export',
  requirePermission('accounting:reports:general-ledger:export'),
  requireCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).companyId;
    const { account_id, account_code, from_date, to_date, format } = req.body;

    if (!account_id && !account_code) {
      return res.status(400).json({
        success: false,
        message: 'account_id or account_code required',
      });
    }

    const params: GLRequest = {
      account_id,
      account_code,
      from_date,
      to_date,
    };

    const result = await getGeneralLedger(req, companyId, params);

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
