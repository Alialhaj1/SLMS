/**
 * 📚 GENERAL LEDGER SERVICE
 * =====================================================
 * Provides transaction-level detail for each account
 * Calculates opening balance, running balance, closing balance
 * Source: Posted journals only, real-time aggregation
 */

import { pool } from '../../db';
import { Request } from 'express';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface GLRow {
  date: string; // posting_date
  reference: string; // journal_entry_id or reference
  description: string; // journal entry memo
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  balance: number; // running balance (signed)
}

export interface GLSummary {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  is_balanced: boolean; // For multi-account export
}

export interface GLRequest {
  account_id?: number; // Single account
  account_code?: string; // Or by code
  from_date?: string; // YYYY-MM-DD
  to_date?: string;
  include_opening_balance?: boolean; // Default: true
}

export interface GLResponse {
  account?: {
    id: number;
    code: string;
    name: string;
    name_ar?: string;
    type: string;
  };
  data: GLRow[];
  summary: GLSummary;
  period: {
    from: string;
    to: string;
  };
}

export interface AccountOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  type: string;
  balance: number; // Current balance
}

/**
 * Get list of accounts with current balances
 * Used for account selector in GL page
 */
export async function getAccounts(
  companyId: number,
  exclude_zero_balance: boolean = false
): Promise<AccountOption[]> {
  try {
    const asOfDate = new Date().toISOString().split('T')[0];
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
        a.id,
        a.code,
        a.name,
        a.name_ar,
        at.classification as type,
        COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0) as balance
      FROM
        accounts a
        JOIN account_types at ON at.id = a.account_type_id
        LEFT JOIN agg ON agg.account_id = a.id
      WHERE
        a.company_id = $1
        AND a.deleted_at IS NULL
        AND a.is_group = false
    `;

    if (exclude_zero_balance) {
      sql += `
      HAVING
        (COALESCE(agg.debit, 0) - COALESCE(agg.credit, 0)) != 0
      `;
    }

    sql += ` ORDER BY coa.code ASC`;

    const result = await pool.query(sql, [companyId, asOfDate]);
    return (result.rows as AccountOption[]).map((row) => ({
      ...row,
      balance: toNumber((row as any).balance),
    }));
  } catch (error) {
    console.error('Error fetching GL accounts:', error);
    throw error;
  }
}

/**
 * Get opening balance for an account at specific date
 * = sum of all posted entries BEFORE the from_date
 */
async function getOpeningBalance(
  companyId: number,
  accountId: number,
  fromDate: string
): Promise<number> {
  const sql = `
    WITH movement AS (
      SELECT
        SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END) AS credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE
        je.company_id = $1
        AND je.status = 'posted'
        AND jl.account_id = $2
        AND je.posting_date < $3

      UNION ALL

      SELECT
        SUM(obl.debit) AS debit,
        SUM(obl.credit) AS credit
      FROM opening_balance_lines obl
      JOIN opening_balance_batches obb ON obb.id = obl.batch_id
      JOIN accounting_periods ap ON ap.id = obb.period_id
      WHERE
        obb.company_id = $1
        AND obb.status = 'posted'
        AND obl.account_id = $2
        AND ap.start_date < $3
    )
    SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS balance
    FROM movement
  `;

  const result = await pool.query(sql, [companyId, accountId, fromDate]);
  return toNumber(result.rows[0]?.balance);
}

/**
 * Get transaction detail with running balance
 * Each row shows: date, ref, description, debit, credit, running_balance
 */
export async function getGeneralLedger(
  req: Request,
  companyId: number,
  params: GLRequest
): Promise<GLResponse> {
  try {
    // Validate inputs
    if (!params.account_id && !params.account_code) {
      throw new Error('Either account_id or account_code is required');
    }

    // Resolve account_id if code provided
    let accountId = params.account_id;
    let accountInfo: any = null;

    if (!accountId) {
      const acctResult = await pool.query(
        `SELECT a.id, a.code, a.name, a.name_ar, at.classification as type
         FROM accounts a
         JOIN account_types at ON at.id = a.account_type_id
         WHERE a.company_id = $1 AND a.code = $2 AND a.deleted_at IS NULL`,
        [companyId, params.account_code]
      );

      if (acctResult.rows.length === 0) {
        throw new Error(`Account ${params.account_code} not found`);
      }

      accountId = acctResult.rows[0].id;
      accountInfo = acctResult.rows[0];
    } else {
      // Fetch account info
      const acctResult = await pool.query(
        `SELECT a.id, a.code, a.name, a.name_ar, at.classification as type
         FROM accounts a
         JOIN account_types at ON at.id = a.account_type_id
         WHERE a.company_id = $1 AND a.id = $2 AND a.deleted_at IS NULL`,
        [companyId, accountId]
      );

      if (acctResult.rows.length === 0) {
        throw new Error(`Account ${accountId} not found`);
      }

      accountInfo = acctResult.rows[0];
    }

    // Get opening balance (before from_date)
    const fromDate = params.from_date || '2000-01-01';
    const toDate = params.to_date || new Date().toISOString().split('T')[0];

    const openingBalance = await getOpeningBalance(companyId, accountId, fromDate);

    // Get all transactions in period
    const sql = `
      WITH txns AS (
        SELECT
          COALESCE(je.posting_date, je.entry_date) as date,
          COALESCE(je.reference, je.entry_number, je.id::text) as reference,
          COALESCE(je.description, je.narration, '') as description,
          a.code as account_code,
          a.name as account_name,
          CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END as debit_amount,
          CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END as credit_amount
        FROM journal_lines jl
        JOIN journal_entries je ON jl.journal_entry_id = je.id
        JOIN accounts a ON jl.account_id = a.id
        WHERE
          je.company_id = $1
          AND jl.account_id = $2
          AND je.status = 'posted'
          AND je.posting_date >= $3
          AND je.posting_date <= $4

        UNION ALL

        SELECT
          ap.start_date as date,
          obb.batch_no as reference,
          COALESCE(obl.description, 'Opening Balance') as description,
          a.code as account_code,
          a.name as account_name,
          obl.debit as debit_amount,
          obl.credit as credit_amount
        FROM opening_balance_lines obl
        JOIN opening_balance_batches obb ON obb.id = obl.batch_id
        JOIN accounting_periods ap ON ap.id = obb.period_id
        JOIN accounts a ON a.id = obl.account_id
        WHERE
          obb.company_id = $1
          AND obb.status = 'posted'
          AND obl.account_id = $2
          AND ap.start_date >= $3
          AND ap.start_date <= $4
      )
      SELECT *
      FROM txns
      ORDER BY date ASC, reference ASC
    `;

    const transactionsResult = await pool.query(sql, [
      companyId,
      accountId,
      fromDate,
      toDate,
    ]);
    const transactions = transactionsResult.rows;

    // Calculate running balance
    let runningBalance = openingBalance;
    const rows: GLRow[] = [];

    for (const txn of transactions) {
      runningBalance += txn.debit_amount - txn.credit_amount;
      rows.push({
        date: txn.date,
        reference: txn.reference ? String(txn.reference) : '',
        description: txn.description || '',
        account_code: txn.account_code,
        account_name: txn.account_name,
        debit_amount: toNumber(txn.debit_amount),
        credit_amount: toNumber(txn.credit_amount),
        balance: runningBalance,
      });
    }

    // Calculate summary
    const totalDebit = rows.reduce((sum, row) => sum + row.debit_amount, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit_amount, 0);
    const closingBalance =
      openingBalance + totalDebit - totalCredit;

    return {
      account: accountInfo,
      data: params.include_opening_balance !== false
        ? [
            {
              date: 'OPENING',
              reference: '',
              description: 'Opening Balance',
              account_code: accountInfo.code,
              account_name: accountInfo.name,
              debit_amount: openingBalance > 0 ? openingBalance : 0,
              credit_amount: openingBalance < 0 ? Math.abs(openingBalance) : 0,
              balance: openingBalance,
            },
            ...rows,
          ]
        : rows,
      summary: {
        opening_balance: openingBalance,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: closingBalance,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
      period: {
        from: fromDate,
        to: toDate,
      },
    };
  } catch (error) {
    console.error('General ledger calculation error:', error);
    throw error;
  }
}

/**
 * Get GL for multiple accounts (useful for filtered GL by account type)
 * Returns aggregated GL per account
 */
export async function getGeneralLedgerByType(
  req: Request,
  companyId: number,
  accountType: string,
  params: GLRequest
): Promise<{ [key: string]: GLResponse }> {
  try {
    // Get all accounts of type
    const accountsResult = await pool.query(
      `SELECT a.id, a.code, a.name
       FROM accounts a
       JOIN account_types at ON at.id = a.account_type_id
       WHERE a.company_id = $1
         AND at.classification = $2
         AND a.deleted_at IS NULL
         AND a.is_group = false
       ORDER BY a.code ASC`,
      [companyId, accountType]
    );
    const accounts = accountsResult.rows;

    const result: { [key: string]: GLResponse } = {};

    // Get GL for each account
    for (const account of accounts) {
      const gl = await getGeneralLedger(req, companyId, {
        ...params,
        account_id: account.id,
      });
      result[account.code] = gl;
    }

    return result;
  } catch (error) {
    console.error('Error fetching GL by type:', error);
    throw error;
  }
}

/**
 * Validate GL has no broken debit/credit
 */
export function isGeneralLedgerValid(response: GLResponse): boolean {
  const { summary } = response;
  return Math.abs(summary.total_debit - summary.total_credit) < 0.01;
}
