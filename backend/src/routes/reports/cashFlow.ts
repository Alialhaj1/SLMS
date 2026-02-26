/**
 * Cash Flow Report Route
 * Generates cash flow statement from journal entries and bank transactions.
 */
import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/reports/cash-flow
 * Query params: company_id, start_date, end_date
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId || req.query.company_id;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'company_id is required' });
    }

    // Operating activities: cash from operations
    const operatingResult = await pool.query(
      `SELECT 
         COALESCE(SUM(jl.debit_amount), 0) as total_debit,
         COALESCE(SUM(jl.credit_amount), 0) as total_credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.company_id = $1
         AND je.status = 'posted'
         AND coa.account_type IN ('revenue', 'expense')
         ${startDate ? "AND je.entry_date >= $2::date" : ""}
         ${endDate ? `AND je.entry_date <= $${startDate ? 3 : 2}::date` : ""}
         AND je.deleted_at IS NULL`,
      [companyId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
    );

    // Cash & bank account balances
    const cashResult = await pool.query(
      `SELECT coa.code, coa.name, COALESCE(coa.current_balance, 0) as balance
       FROM chart_of_accounts coa
       WHERE coa.company_id = $1
         AND coa.code IN ('1101', '1102')
         AND coa.deleted_at IS NULL`,
      [companyId]
    );

    const operating = operatingResult.rows[0] || { total_debit: 0, total_credit: 0 };

    res.json({
      success: true,
      data: {
        period: { start_date: startDate || 'all', end_date: endDate || 'all' },
        operating_activities: {
          revenue: parseFloat(operating.total_credit) || 0,
          expenses: parseFloat(operating.total_debit) || 0,
          net_operating: (parseFloat(operating.total_credit) || 0) - (parseFloat(operating.total_debit) || 0),
        },
        investing_activities: { net_investing: 0 }, // Placeholder
        financing_activities: { net_financing: 0 }, // Placeholder
        cash_balances: cashResult.rows,
        net_change: (parseFloat(operating.total_credit) || 0) - (parseFloat(operating.total_debit) || 0),
      },
    });
  } catch (error: any) {
    console.error('Cash flow report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate cash flow report' });
  }
});

export default router;
