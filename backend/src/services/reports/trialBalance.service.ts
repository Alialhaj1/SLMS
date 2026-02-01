/**
 * 📊 TRIAL BALANCE SERVICE
 * =====================================================
 * Aggregates posted journal entries by account
 * Calculates balances with proper sign normalization
 * Source of truth: journals + accounts (no materialized ledger)
 */

import { pool } from '../../db';
import { Request } from 'express';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface TrialBalanceRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  parent_account_id?: number;
  is_header: boolean;
  level: number;
  debit: number;
  credit: number;
  balance: number; // debit - credit (signed)
}

export interface TrialBalanceRequest {
  from_date?: string; // YYYY-MM-DD
  to_date?: string;
  account_from?: string;
  account_to?: string;
  level?: number;
  include_zero_balance?: boolean;
}

export interface TrialBalanceResponse {
  data: TrialBalanceRow[];
  summary: {
    total_debit: number;
    total_credit: number;
    total_balance: number;
    is_balanced: boolean;
  };
  period: {
    from: string;
    to: string;
  };
}

/**
 * Calculate trial balance for given period
 * ✅ Uses posted journals only
 * ✅ Aggregates by account
 * ✅ Returns signed balance (debit - credit)
 */
export async function getTrialBalance(
  req: Request,
  companyId: number,
  params: TrialBalanceRequest
): Promise<TrialBalanceResponse> {
  try {
    // Build dynamic SQL query with filters
    const query = buildTrialBalanceQuery(companyId, params);

    const result = await pool.query(query.sql, query.params);
    const accounts = (result.rows as TrialBalanceRow[]).map((row) => {
      const debit = toNumber((row as any).debit);
      const credit = toNumber((row as any).credit);
      const balance = toNumber((row as any).balance);
      return { ...row, debit, credit, balance };
    });

    // Calculate totals
    const summary = {
      total_debit: accounts.reduce((sum, row) => sum + (row.debit || 0), 0),
      total_credit: accounts.reduce((sum, row) => sum + (row.credit || 0), 0),
      total_balance: accounts.reduce((sum, row) => sum + (row.balance || 0), 0),
      is_balanced: Math.abs(
        accounts.reduce((sum, row) => sum + (row.debit || 0), 0) -
        accounts.reduce((sum, row) => sum + (row.credit || 0), 0)
      ) < 0.01, // Allow for rounding errors
    };

    return {
      data: accounts,
      summary,
      period: {
        from: params.from_date || 'Beginning of time',
        to: params.to_date || 'Now',
      },
    };
  } catch (error) {
    console.error('Trial balance calculation error:', error);
    throw error;
  }
}

/**
 * Build dynamic trial balance query with filters
 */
function buildTrialBalanceQuery(
  companyId: number,
  params: TrialBalanceRequest
): {
  sql: string;
  params: (string | number | boolean)[];
} {
  const queryParams: (string | number | boolean)[] = [companyId];

  // We apply the same date filters to:
  // - posted journal entries (journal_entries.posting_date)
  // - posted opening balances (accounting_periods.start_date)
  const fromDate = params.from_date;
  const toDate = params.to_date;

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
        ${fromDate ? `AND je.posting_date >= $2` : ''}
        ${toDate ? `AND je.posting_date <= $${fromDate ? 3 : 2}` : ''}
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
        ${fromDate ? `AND ap.start_date >= $2` : ''}
        ${toDate ? `AND ap.start_date <= $${fromDate ? 3 : 2}` : ''}
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
      a.parent_id as parent_account_id,
      a.is_group as is_header,
      a.level,
      COALESCE(agg.debit, 0) as debit,
      COALESCE(agg.credit, 0) as credit,
      COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0) as balance
    FROM
      accounts a
      JOIN account_types at ON at.id = a.account_type_id
      LEFT JOIN agg ON agg.account_id = a.id
    WHERE
      a.company_id = $1
      AND a.deleted_at IS NULL
  `;

  let paramIndex = 2;

  // Date filters (shared between journals + opening balances)
  if (fromDate) {
    queryParams.push(fromDate);
    paramIndex++;
  }

  if (toDate) {
    queryParams.push(toDate);
    paramIndex++;
  }

  // Account code range filters
  if (params.account_from) {
    sql += ` AND a.code >= $${paramIndex}`;
    queryParams.push(params.account_from);
    paramIndex++;
  }

  if (params.account_to) {
    sql += ` AND a.code <= $${paramIndex}`;
    queryParams.push(params.account_to);
    paramIndex++;
  }

  // Level filter
  if (params.level !== undefined) {
    sql += ` AND a.level = $${paramIndex}`;
    queryParams.push(params.level);
    paramIndex++;
  }

  // Filter zero balances if needed (exclude leaf accounts with zero balance)
  if (!params.include_zero_balance) {
    sql += ` AND (a.is_group = true OR (COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0)) != 0)`;
  }

  // Sort by code
  sql += `
    ORDER BY
      a.code ASC
  `;

  return { sql, params: queryParams };
}

/**
 * Get trial balance with hierarchy (parent-child relationships)
 * Parent balance = sum of all children (not included in rows)
 * Header accounts show calculated totals from descendants
 */
export async function getTrialBalanceWithHierarchy(
  req: Request,
  companyId: number,
  params: TrialBalanceRequest
): Promise<TrialBalanceResponse> {
  const result = await getTrialBalance(req, companyId, params);

  // Sort by code to maintain hierarchy
  result.data.sort((a, b) => a.account_code.localeCompare(b.account_code));

  // Calculate parent balances from children
  const accountMap = new Map<number, TrialBalanceRow>();
  result.data.forEach(acc => accountMap.set(acc.account_id, acc));

  // For each header account, recalculate as sum of children
  result.data.forEach(account => {
    if (account.is_header) {
      let childDebit = 0;
      let childCredit = 0;

      // Find all children at next level
      result.data.forEach(other => {
        if (other.parent_account_id === account.account_id && !other.is_header) {
          childDebit += other.debit || 0;
          childCredit += other.credit || 0;
        }
      });

      // Update parent with child totals
      account.debit = childDebit;
      account.credit = childCredit;
      account.balance = childDebit - childCredit;
    }
  });

  // Recalculate summary with updated hierarchy
  result.summary = {
    total_debit: result.data
      .filter(r => !r.is_header) // Only leaf accounts
      .reduce((sum, row) => sum + (row.debit || 0), 0),
    total_credit: result.data
      .filter(r => !r.is_header)
      .reduce((sum, row) => sum + (row.credit || 0), 0),
    total_balance: result.data
      .filter(r => !r.is_header)
      .reduce((sum, row) => sum + (row.balance || 0), 0),
    is_balanced: Math.abs(
      result.data
        .filter(r => !r.is_header)
        .reduce((sum, row) => sum + (row.debit || 0), 0) -
      result.data
        .filter(r => !r.is_header)
        .reduce((sum, row) => sum + (row.credit || 0), 0)
    ) < 0.01,
  };

  return result;
}

/**
 * Verify trial balance is balanced
 * Returns true if debit = credit within rounding tolerance
 */
export function isTrialBalanceBalanced(response: TrialBalanceResponse): boolean {
  return Math.abs(response.summary.total_debit - response.summary.total_credit) < 0.01;
}
