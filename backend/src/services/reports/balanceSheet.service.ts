/**
 * 📊 BALANCE SHEET SERVICE
 * =====================================================
 * Statement of Financial Position
 * Assets = Liabilities + Equity (auto-balanced)
 * Point-in-time snapshot (as of date)
 */

import { pool } from '../../db';
import { Request } from 'express';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface BalanceSheetRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string; // 'Asset', 'Liability', 'Equity'
  amount: number; // Signed: Assets +, Liabilities -, Equity -
  level: number;
  is_header: boolean;
}

export interface BalanceSheetSummary {
  total_assets: number;
  total_current_assets: number;
  total_fixed_assets: number;
  total_liabilities: number;
  total_current_liabilities: number;
  total_long_term_liabilities: number;
  total_equity: number;
  retained_earnings: number; // From income statement
  is_balanced: boolean; // Assets = Liabilities + Equity
  balance_variance: number;
}

export interface BalanceSheetRequest {
  as_of_date: string; // YYYY-MM-DD
  include_zero: boolean;
  comparison_date?: string; // Optional comparative balance sheet
}

export interface BalanceSheetResponse {
  as_of_date: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  summary: BalanceSheetSummary;
  comparison?: {
    as_of_date: string;
    summary: BalanceSheetSummary;
  };
}

/**
 * Get asset accounts with cumulative balance up to date
 * Assets = Debit balance (increase assets)
 */
async function getAssetAccounts(
  companyId: number,
  asOfDate: string,
  includeZero: boolean
): Promise<BalanceSheetRow[]> {
  let sql = `
    WITH movement AS (
      SELECT
        jl.account_id,
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) AS credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE
        je.company_id = $1
        AND je.status = 'posted'
        AND je.posting_date <= $2
      GROUP BY jl.account_id

      UNION ALL

      SELECT
        obl.account_id,
        SUM(obl.debit) AS debit,
        SUM(obl.credit) AS credit
      FROM opening_balance_lines obl
      JOIN opening_balance_batches obb ON obb.id = obl.batch_id
      JOIN accounting_periods ap ON ap.id = obb.period_id
      WHERE
        obb.company_id = $1
        AND obb.status = 'posted'
        AND ap.start_date <= $2
      GROUP BY obl.account_id
    ), agg AS (
      SELECT account_id, SUM(debit) AS debit, SUM(credit) AS credit
      FROM movement
      GROUP BY account_id
    )
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.classification as account_type,
      a.level,
      a.is_group as is_header,
      (COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0)) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN agg ON agg.account_id = a.id
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.classification = 'asset'
  `;

  if (!includeZero) {
    sql += `
    AND (a.is_group = true OR (COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0)) != 0)
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, asOfDate]);
  return (result.rows as BalanceSheetRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Get liability accounts with cumulative balance up to date
 * Liabilities = Credit balance (increase liabilities)
 */
async function getLiabilityAccounts(
  companyId: number,
  asOfDate: string,
  includeZero: boolean
): Promise<BalanceSheetRow[]> {
  let sql = `
    WITH movement AS (
      SELECT
        jl.account_id,
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) AS credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE
        je.company_id = $1
        AND je.status = 'posted'
        AND je.posting_date <= $2
      GROUP BY jl.account_id

      UNION ALL

      SELECT
        obl.account_id,
        SUM(obl.debit) AS debit,
        SUM(obl.credit) AS credit
      FROM opening_balance_lines obl
      JOIN opening_balance_batches obb ON obb.id = obl.batch_id
      JOIN accounting_periods ap ON ap.id = obb.period_id
      WHERE
        obb.company_id = $1
        AND obb.status = 'posted'
        AND ap.start_date <= $2
      GROUP BY obl.account_id
    ), agg AS (
      SELECT account_id, SUM(debit) AS debit, SUM(credit) AS credit
      FROM movement
      GROUP BY account_id
    )
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.classification as account_type,
      a.level,
      a.is_group as is_header,
      (COALESCE(agg.credit, 0) - COALESCE(agg.debit, 0)) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN agg ON agg.account_id = a.id
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.classification = 'liability'
  `;

  if (!includeZero) {
    sql += `
    AND (a.is_group = true OR (COALESCE(agg.credit, 0) - COALESCE(agg.debit, 0)) != 0)
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, asOfDate]);
  return (result.rows as BalanceSheetRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Get equity accounts with cumulative balance up to date
 * Equity = Credit balance (increase equity)
 */
async function getEquityAccounts(
  companyId: number,
  asOfDate: string,
  includeZero: boolean
): Promise<BalanceSheetRow[]> {
  let sql = `
    WITH movement AS (
      SELECT
        jl.account_id,
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) AS credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE
        je.company_id = $1
        AND je.status = 'posted'
        AND je.posting_date <= $2
      GROUP BY jl.account_id

      UNION ALL

      SELECT
        obl.account_id,
        SUM(obl.debit) AS debit,
        SUM(obl.credit) AS credit
      FROM opening_balance_lines obl
      JOIN opening_balance_batches obb ON obb.id = obl.batch_id
      JOIN accounting_periods ap ON ap.id = obb.period_id
      WHERE
        obb.company_id = $1
        AND obb.status = 'posted'
        AND ap.start_date <= $2
      GROUP BY obl.account_id
    ), agg AS (
      SELECT account_id, SUM(debit) AS debit, SUM(credit) AS credit
      FROM movement
      GROUP BY account_id
    )
    SELECT
      a.id as account_id,
      a.code as account_code,
      a.name as account_name,
      a.name_ar as account_name_ar,
      at.classification as account_type,
      a.level,
      a.is_group as is_header,
      (COALESCE(agg.credit, 0) - COALESCE(agg.debit, 0)) as amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN agg ON agg.account_id = a.id
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
      AND at.classification = 'equity'
  `;

  if (!includeZero) {
    sql += `
    AND (a.is_group = true OR (COALESCE(agg.credit, 0) - COALESCE(agg.debit, 0)) != 0)
    `;
  }

  sql += ` ORDER BY a.code ASC`;

  const result = await pool.query(sql, [companyId, asOfDate]);
  return (result.rows as BalanceSheetRow[]).map((r) => ({
    ...r,
    amount: toNumber((r as any).amount),
  }));
}

/**
 * Calculate retained earnings (cumulative net profit up to date)
 * Retained Earnings = Total Revenue - Total Expenses (all time)
 */
async function getRetainedEarnings(
  companyId: number,
  asOfDate: string
): Promise<number> {
  // Keep this simple and consistent: report retained earnings as the balance
  // of the retained earnings account (code 3200) up to as-of date.
  const sql = `
    WITH movement AS (
      SELECT
        jl.account_id,
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) AS credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE
        je.company_id = $1
        AND je.status = 'posted'
        AND je.posting_date <= $2
      GROUP BY jl.account_id

      UNION ALL

      SELECT
        obl.account_id,
        SUM(obl.debit) AS debit,
        SUM(obl.credit) AS credit
      FROM opening_balance_lines obl
      JOIN opening_balance_batches obb ON obb.id = obl.batch_id
      JOIN accounting_periods ap ON ap.id = obb.period_id
      WHERE
        obb.company_id = $1
        AND obb.status = 'posted'
        AND ap.start_date <= $2
      GROUP BY obl.account_id
    ), agg AS (
      SELECT account_id, SUM(debit) AS debit, SUM(credit) AS credit
      FROM movement
      GROUP BY account_id
    )
    SELECT (COALESCE(agg.credit, 0) - COALESCE(agg.debit, 0)) AS amount
    FROM accounts a
    LEFT JOIN agg ON agg.account_id = a.id
    WHERE a.company_id = $1 AND a.deleted_at IS NULL AND a.code = '3200'
    LIMIT 1
  `;

  const result = await pool.query(sql, [companyId, asOfDate]);
  return toNumber(result.rows[0]?.amount);
}

/**
 * Calculate balance sheet summary
 */
function calculateSummary(
  assets: BalanceSheetRow[],
  liabilities: BalanceSheetRow[],
  equity: BalanceSheetRow[],
  retainedEarnings: number
): BalanceSheetSummary {
  const totalAssets = assets
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  const totalCurrentAssets = 0;
  const totalFixedAssets = 0;

  const totalLiabilities = liabilities
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  const totalCurrentLiabilities = 0;
  const totalLongTermLiabilities = 0;

  const totalEquity = equity
    .filter(r => !r.is_header)
    .reduce((sum, row) => sum + row.amount, 0);

  // Retained Earnings is already part of equity accounts (if account 3200 exists).
  // Still expose it in summary, but do not double-count.
  const totalEquityWithRE = totalEquity;

  // Check balance: Assets = Liabilities + Equity
  const balanceVariance = totalAssets - (totalLiabilities + totalEquityWithRE);
  const isBalanced = Math.abs(balanceVariance) < 0.01;

  return {
    total_assets: totalAssets,
    total_current_assets: totalCurrentAssets,
    total_fixed_assets: totalFixedAssets,
    total_liabilities: totalLiabilities,
    total_current_liabilities: totalCurrentLiabilities,
    total_long_term_liabilities: totalLongTermLiabilities,
    total_equity: totalEquityWithRE,
    retained_earnings: retainedEarnings,
    is_balanced: isBalanced,
    balance_variance: balanceVariance,
  };
}

/**
 * Get complete Balance Sheet as of date
 */
export async function getBalanceSheet(
  req: Request,
  companyId: number,
  params: BalanceSheetRequest
): Promise<BalanceSheetResponse> {
  try {
    const { as_of_date, include_zero = false } = params;

    // Validate date
    if (!as_of_date) {
      throw new Error('as_of_date is required');
    }

    // Get all sections
    const [assets, liabilities, equity, retainedEarnings] = await Promise.all([
      getAssetAccounts(companyId, as_of_date, include_zero),
      getLiabilityAccounts(companyId, as_of_date, include_zero),
      getEquityAccounts(companyId, as_of_date, include_zero),
      getRetainedEarnings(companyId, as_of_date),
    ]);

    // Calculate summary
    const summary = calculateSummary(assets, liabilities, equity, retainedEarnings);

    const response: BalanceSheetResponse = {
      as_of_date,
      assets,
      liabilities,
      equity,
      summary,
    };

    // Add comparison if requested
    if (params.comparison_date) {
      const [compAssets, compLiabilities, compEquity, compRE] = await Promise.all([
        getAssetAccounts(companyId, params.comparison_date, include_zero),
        getLiabilityAccounts(companyId, params.comparison_date, include_zero),
        getEquityAccounts(companyId, params.comparison_date, include_zero),
        getRetainedEarnings(companyId, params.comparison_date),
      ]);

      const compSummary = calculateSummary(compAssets, compLiabilities, compEquity, compRE);

      response.comparison = {
        as_of_date: params.comparison_date,
        summary: compSummary,
      };
    }

    return response;
  } catch (error) {
    console.error('Balance sheet calculation error:', error);
    throw error;
  }
}

/**
 * Validate balance sheet equation
 * Returns true if Assets = Liabilities + Equity (within tolerance)
 */
export function isBalanceSheetBalanced(response: BalanceSheetResponse): boolean {
  return response.summary.is_balanced;
}
