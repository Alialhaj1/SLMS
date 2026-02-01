/**
 * 📊 INCOME STATEMENT SERVICE
 * =====================================================
 * Profit & Loss Statement (P&L)
 * Revenue - Cost of Goods Sold - Expenses = Net Profit
 * Period-based aggregation from posted journals
 */

import { pool } from '../../db';
import { Request } from 'express';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface IncomeStatementRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string; // 'Revenue', 'Expense', 'Cost of Goods Sold'
  amount: number; // Credit for revenue, Debit for expenses (signed properly)
  level: number;
  is_header: boolean;
}

export interface IncomeStatementSummary {
  total_revenue: number;
  total_cogs: number; // Cost of Goods Sold
  gross_profit: number; // Revenue - COGS
  total_expenses: number;
  net_profit: number; // Gross Profit - Expenses
  net_profit_margin: number; // (Net Profit / Revenue) * 100
}

export interface IncomeStatementRequest {
  from_date: string; // YYYY-MM-DD
  to_date: string;
  include_zero: boolean;
  comparison_period?: {
    from_date: string;
    to_date: string;
  };
}

export interface IncomeStatementResponse {
  period: {
    from: string;
    to: string;
  };
  revenue: IncomeStatementRow[];
  cogs: IncomeStatementRow[]; // Cost of Goods Sold
  expenses: IncomeStatementRow[];
  summary: IncomeStatementSummary;
  comparison?: {
    period: { from: string; to: string };
    summary: IncomeStatementSummary;
  };
}

/**
 * Get revenue accounts with period totals
 * Revenue = Credit balance (increase revenue)
 */
async function getRevenueAccounts(
  companyId: number,
  fromDate: string,
  toDate: string,
  includeZero: boolean
): Promise<IncomeStatementRow[]> {
  let sql = `
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.classification as account_type,
      a.level,
      a.is_group as is_header,
      COALESCE(
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) -
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END),
        0
      ) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.status = 'posted'
      AND je.posting_date >= $2
      AND je.posting_date <= $3
      AND je.company_id = $1
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.report_group = 'income_statement'
      AND at.classification = 'revenue'
    GROUP BY a.id, a.code, a.name, a.name_ar, at.classification, a.level, a.is_group
  `;

  if (!includeZero) {
    sql += `
    HAVING COALESCE(
      SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END) -
      SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END),
      0
    ) != 0
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, fromDate, toDate]);
  return (result.rows as IncomeStatementRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Get Cost of Goods Sold (COGS) accounts
 * COGS = Debit balance (increase cost)
 */
async function getCOGSAccounts(
  companyId: number,
  fromDate: string,
  toDate: string,
  includeZero: boolean
): Promise<IncomeStatementRow[]> {
  let sql = `
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.code as account_type,
      a.level,
      a.is_group as is_header,
      COALESCE(
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) -
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END),
        0
      ) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.status = 'posted'
      AND je.posting_date >= $2
      AND je.posting_date <= $3
      AND je.company_id = $1
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.report_group = 'income_statement'
      AND at.code = 'COGS'
    GROUP BY a.id, a.code, a.name, a.name_ar, at.code, a.level, a.is_group
  `;

  if (!includeZero) {
    sql += `
    HAVING COALESCE(
      SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END) -
      SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END),
      0
    ) != 0
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, fromDate, toDate]);
  return (result.rows as IncomeStatementRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Get expense accounts with period totals
 * Expenses = Debit balance (increase expense)
 */
async function getExpenseAccounts(
  companyId: number,
  fromDate: string,
  toDate: string,
  includeZero: boolean
): Promise<IncomeStatementRow[]> {
  let sql = `
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.classification as account_type,
      a.level,
      a.is_group as is_header,
      COALESCE(
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) -
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END),
        0
      ) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.status = 'posted'
      AND je.posting_date >= $2
      AND je.posting_date <= $3
      AND je.company_id = $1
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.report_group = 'income_statement'
      AND at.classification = 'expense'
      AND at.code <> 'COGS'
    GROUP BY a.id, a.code, a.name, a.name_ar, at.classification, a.level, a.is_group
  `;

  if (!includeZero) {
    sql += `
    HAVING COALESCE(
      SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END) -
      SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END),
      0
    ) != 0
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, fromDate, toDate]);
  return (result.rows as IncomeStatementRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Calculate summary totals for income statement
 */
function calculateSummary(
  revenue: IncomeStatementRow[],
  cogs: IncomeStatementRow[],
  expenses: IncomeStatementRow[]
): IncomeStatementSummary {
  const totalRevenue = revenue
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  const totalCOGS = cogs
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  const totalExpenses = expenses
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    total_revenue: totalRevenue,
    total_cogs: totalCOGS,
    gross_profit: grossProfit,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    net_profit_margin: netProfitMargin,
  };
}

/**
 * Get complete Income Statement for period
 */
export async function getIncomeStatement(
  req: Request,
  companyId: number,
  params: IncomeStatementRequest
): Promise<IncomeStatementResponse> {
  try {
    const { from_date, to_date, include_zero = false } = params;

    // Validate dates
    if (!from_date || !to_date) {
      throw new Error('from_date and to_date are required');
    }

    // Get all sections
    const [revenue, cogs, expenses] = await Promise.all([
      getRevenueAccounts(companyId, from_date, to_date, include_zero),
      getCOGSAccounts(companyId, from_date, to_date, include_zero),
      getExpenseAccounts(companyId, from_date, to_date, include_zero),
    ]);

    // Calculate summary
    const summary = calculateSummary(revenue, cogs, expenses);

    const response: IncomeStatementResponse = {
      period: {
        from: from_date,
        to: to_date,
      },
      revenue,
      cogs,
      expenses,
      summary,
    };

    // Add comparison period if requested
    if (params.comparison_period) {
      const [compRevenue, compCOGS, compExpenses] = await Promise.all([
        getRevenueAccounts(
          companyId,
          params.comparison_period.from_date,
          params.comparison_period.to_date,
          include_zero
        ),
        getCOGSAccounts(
          companyId,
          params.comparison_period.from_date,
          params.comparison_period.to_date,
          include_zero
        ),
        getExpenseAccounts(
          companyId,
          params.comparison_period.from_date,
          params.comparison_period.to_date,
          include_zero
        ),
      ]);

      const compSummary = calculateSummary(compRevenue, compCOGS, compExpenses);

      response.comparison = {
        period: {
          from: params.comparison_period.from_date,
          to: params.comparison_period.to_date,
        },
        summary: compSummary,
      };
    }

    return response;
  } catch (error) {
    console.error('Income statement calculation error:', error);
    throw error;
  }
}

/**
 * Validate income statement structure
 * Returns true if all sections are present
 */
export function isIncomeStatementValid(response: IncomeStatementResponse): boolean {
  return (
    response.revenue !== undefined &&
    response.expenses !== undefined &&
    response.summary !== undefined
  );
}
