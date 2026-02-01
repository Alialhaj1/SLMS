import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function parsePeriod(period: string): { year: number; month: number } | null {
  // Expect YYYY-MM
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(String(period || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

async function getCompanyBaseCurrency(companyId: number): Promise<{ id: number; code: string } | null> {
  const r = await pool.query(
    `SELECT id, code
     FROM currencies
     WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE
     ORDER BY id ASC
     LIMIT 1`,
    [companyId]
  );
  return r.rows[0] ?? null;
}

async function ensureFiscalYearId(companyId: number, year: number, userId?: number): Promise<number> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const inserted = await pool.query(
    `INSERT INTO fiscal_years (company_id, year, name, start_date, end_date, created_by)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     ON CONFLICT (company_id, year) DO NOTHING
     RETURNING id`,
    [companyId, year, String(year), startDate, endDate, userId ?? null]
  );

  if (inserted.rows.length > 0) return inserted.rows[0].id;

  const existing = await pool.query(
    `SELECT id FROM fiscal_years WHERE company_id = $1 AND year = $2 LIMIT 1`,
    [companyId, year]
  );
  if (!existing.rows[0]?.id) {
    throw new Error('Failed to resolve fiscal year');
  }
  return existing.rows[0].id;
}

async function ensureAccountingPeriodId(companyId: number, fiscalYearId: number, year: number, month: number, userId?: number): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const inserted = await pool.query(
    `INSERT INTO accounting_periods (
        company_id, fiscal_year_id, year, month, period_name,
        start_date, end_date, status, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'open', $8)
     ON CONFLICT (company_id, year, month) DO NOTHING
     RETURNING id`,
    [companyId, fiscalYearId, year, month, `${year}-${String(month).padStart(2, '0')}`, startStr, endStr, userId ?? null]
  );

  if (inserted.rows.length > 0) return inserted.rows[0].id;

  const existing = await pool.query(
    `SELECT id FROM accounting_periods WHERE company_id = $1 AND year = $2 AND month = $3 LIMIT 1`,
    [companyId, year, month]
  );

  if (!existing.rows[0]?.id) {
    throw new Error('Failed to resolve accounting period');
  }

  return existing.rows[0].id;
}

// =====================================================
// GET /api/opening-balances - List opening balance lines
// =====================================================
router.get(
  '/',
  requireAnyPermission(['accounting:opening_balances:view']),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { status, batch_no } = req.query as any;

      const params: any[] = [req.companyId];
      let idx = 2;

      let where = 'WHERE ob.company_id = $1';
      if (status && ['draft', 'posted', 'reversed'].includes(String(status))) {
        where += ` AND ob.status = $${idx}`;
        params.push(String(status));
        idx++;
      }
      if (batch_no) {
        where += ` AND ob.batch_no ILIKE $${idx}`;
        params.push(`%${String(batch_no)}%`);
        idx++;
      }

      const result = await pool.query(
        `SELECT
          obl.id,
          ob.id as batch_id,
          ob.batch_no,
          ob.status,
          ap.year,
          ap.month,
          a.code as account_code,
          a.name as account_name,
          a.name_ar as account_name_ar,
          obl.debit,
          obl.credit,
          c.code as currency_code
         FROM opening_balance_lines obl
         JOIN opening_balance_batches ob ON ob.id = obl.batch_id
         JOIN accounting_periods ap ON ap.id = ob.period_id
         JOIN accounts a ON a.id = obl.account_id
         JOIN currencies c ON c.id = obl.currency_id
         ${where}
         ORDER BY ap.year DESC, ap.month DESC, ob.batch_no ASC, a.code ASC, obl.id ASC`,
        params
      );

      return res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('Error fetching opening balances:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch opening balances' });
    }
  }
);

// =====================================================
// POST /api/opening-balances - Create a line (auto-creates batch)
// =====================================================
router.post(
  '/',
  requireAnyPermission(['accounting:opening_balances:create', 'accounting:opening_balances:edit']),
  requireCompany,
  async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const { batch_no, period, account_code, debit, credit, currency_code, description } = req.body || {};

      const batchNo = String(batch_no || '').trim();
      if (!batchNo) return res.status(400).json({ success: false, error: 'batch_no is required' });

      const p = parsePeriod(String(period || ''));
      if (!p) return res.status(400).json({ success: false, error: 'period must be YYYY-MM' });

      const debitNum = Number(debit || 0);
      const creditNum = Number(credit || 0);
      if (!Number.isFinite(debitNum) || debitNum < 0) return res.status(400).json({ success: false, error: 'Invalid debit' });
      if (!Number.isFinite(creditNum) || creditNum < 0) return res.status(400).json({ success: false, error: 'Invalid credit' });
      if (debitNum > 0 && creditNum > 0) return res.status(400).json({ success: false, error: 'Only one of debit/credit can be > 0' });
      if (debitNum === 0 && creditNum === 0) return res.status(400).json({ success: false, error: 'Either debit or credit must be > 0' });

      await client.query('BEGIN');

      const fiscalYearId = await (async () => {
        const startDate = `${p.year}-01-01`;
        const endDate = `${p.year}-12-31`;

        const inserted = await client.query(
          `INSERT INTO fiscal_years (company_id, year, name, start_date, end_date, created_by)
           VALUES ($1, $2, $3, $4::date, $5::date, $6)
           ON CONFLICT (company_id, year) DO NOTHING
           RETURNING id`,
          [companyId, p.year, String(p.year), startDate, endDate, userId ?? null]
        );
        if (inserted.rows.length > 0) return inserted.rows[0].id;

        const existing = await client.query(
          `SELECT id FROM fiscal_years WHERE company_id = $1 AND year = $2 LIMIT 1`,
          [companyId, p.year]
        );
        return existing.rows[0].id;
      })();

      const periodId = await (async () => {
        const startDate = new Date(p.year, p.month - 1, 1);
        const endDate = new Date(p.year, p.month, 0);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const inserted = await client.query(
          `INSERT INTO accounting_periods (
              company_id, fiscal_year_id, year, month, period_name,
              start_date, end_date, status, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'open', $8)
           ON CONFLICT (company_id, year, month) DO NOTHING
           RETURNING id`,
          [companyId, fiscalYearId, p.year, p.month, `${p.year}-${String(p.month).padStart(2, '0')}`, startStr, endStr, userId ?? null]
        );
        if (inserted.rows.length > 0) return inserted.rows[0].id;

        const existing = await client.query(
          `SELECT id FROM accounting_periods WHERE company_id = $1 AND year = $2 AND month = $3 LIMIT 1`,
          [companyId, p.year, p.month]
        );
        return existing.rows[0].id;
      })();

      const account = await client.query(
        `SELECT id FROM accounts WHERE company_id = $1 AND deleted_at IS NULL AND code = $2 LIMIT 1`,
        [companyId, String(account_code || '').trim()]
      );
      if (account.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Account not found' });
      }
      const accountId = account.rows[0].id as number;

      const currencyId = await (async () => {
        if (currency_code) {
          const c = await client.query(
            `SELECT id FROM currencies WHERE company_id = $1 AND deleted_at IS NULL AND code = $2 LIMIT 1`,
            [companyId, String(currency_code).trim().toUpperCase()]
          );
          if (c.rows[0]?.id) return c.rows[0].id as number;
        }
        const base = await client.query(
          `SELECT id FROM currencies WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE ORDER BY id ASC LIMIT 1`,
          [companyId]
        );
        if (!base.rows[0]?.id) {
          throw new Error('Company base currency not set');
        }
        return base.rows[0].id as number;
      })();

      // Upsert batch (company + batch_no)
      const batchInsert = await client.query(
        `INSERT INTO opening_balance_batches (company_id, fiscal_year_id, period_id, batch_no, status, created_by)
         VALUES ($1, $2, $3, $4, 'draft', $5)
         ON CONFLICT (company_id, batch_no) DO UPDATE SET
           fiscal_year_id = EXCLUDED.fiscal_year_id,
           period_id = EXCLUDED.period_id
         RETURNING id, status`,
        [companyId, fiscalYearId, periodId, batchNo, userId ?? null]
      );

      const batchId = batchInsert.rows[0].id as number;
      const batchStatus = String(batchInsert.rows[0].status);
      if (batchStatus !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, error: 'Cannot add lines to a non-draft batch' });
      }

      const lineNoRes = await client.query(
        `SELECT COALESCE(MAX(line_no), 0) + 1 AS next_no FROM opening_balance_lines WHERE batch_id = $1`,
        [batchId]
      );
      const lineNo = Number(lineNoRes.rows[0].next_no || 1);

      const line = await client.query(
        `INSERT INTO opening_balance_lines (company_id, batch_id, line_no, account_id, currency_id, debit, credit, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [companyId, batchId, lineNo, accountId, currencyId, debitNum, creditNum, description ?? null]
      );

      await client.query('COMMIT');
      return res.status(201).json({ success: true, data: { id: line.rows[0].id, batch_id: batchId } });
    } catch (error: any) {
      try { await (pool as any).query('ROLLBACK'); } catch { /* ignore */ }
      console.error('Error creating opening balance line:', error);
      return res.status(500).json({ success: false, error: 'Failed to create opening balance line' });
    } finally {
      client.release();
    }
  }
);

// =====================================================
// POST /api/opening-balances/batches/:id/post - Post batch (apply to account_balances openings)
// =====================================================
router.post(
  '/batches/:id/post',
  requireAnyPermission(['accounting:opening_balances:post']),
  requireCompany,
  async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const batchId = Number(req.params.id);

      if (!Number.isInteger(batchId)) {
        return res.status(400).json({ success: false, error: 'Invalid batch id' });
      }

      await client.query('BEGIN');

      const batch = await client.query(
        `SELECT id, status, fiscal_year_id, period_id
         FROM opening_balance_batches
         WHERE id = $1 AND company_id = $2
         LIMIT 1`,
        [batchId, companyId]
      );
      if (batch.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }
      if (batch.rows[0].status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, error: 'Only draft batches can be posted' });
      }

      const otherPosted = await client.query(
        `SELECT 1
         FROM opening_balance_batches
         WHERE company_id = $1 AND period_id = $2 AND status = 'posted' AND id <> $3
         LIMIT 1`,
        [companyId, batch.rows[0].period_id, batchId]
      );
      if (otherPosted.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, error: 'A posted opening balance batch already exists for this period' });
      }

      const lines = await client.query(
        `SELECT account_id, currency_id, SUM(debit) AS debit, SUM(credit) AS credit
         FROM opening_balance_lines
         WHERE batch_id = $1 AND company_id = $2
         GROUP BY account_id, currency_id`,
        [batchId, companyId]
      );

      const totals = await client.query(
        `SELECT COALESCE(SUM(debit),0) AS total_debit, COALESCE(SUM(credit),0) AS total_credit
         FROM opening_balance_lines
         WHERE batch_id = $1 AND company_id = $2`,
        [batchId, companyId]
      );

      const totalDebit = Number(totals.rows[0].total_debit || 0);
      const totalCredit = Number(totals.rows[0].total_credit || 0);
      if (Math.abs(totalDebit - totalCredit) > 0.0001) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Batch is not balanced (total debit must equal total credit)' });
      }

      // Apply opening balances to account_balances
      for (const row of lines.rows) {
        const accountId = Number(row.account_id);
        const currencyId = Number(row.currency_id);
        const debit = Number(row.debit || 0);
        const credit = Number(row.credit || 0);

        // Find existing balance row with NULL dimensions (branch/cost_center)
        const existing = await client.query(
          `SELECT id
           FROM account_balances
           WHERE company_id = $1
             AND account_id = $2
             AND fiscal_year_id = $3
             AND period_id = $4
             AND currency_id = $5
             AND COALESCE(cost_center_id, -1) = -1
             AND COALESCE(branch_id, -1) = -1
           LIMIT 1`,
          [companyId, accountId, batch.rows[0].fiscal_year_id, batch.rows[0].period_id, currencyId]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE account_balances
             SET opening_debit = $1,
                 opening_credit = $2,
                 last_updated_at = NOW()
             WHERE id = $3`,
            [debit, credit, existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO account_balances (
              company_id, account_id, fiscal_year_id, period_id, currency_id,
              opening_debit, opening_credit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [companyId, accountId, batch.rows[0].fiscal_year_id, batch.rows[0].period_id, currencyId, debit, credit]
          );
        }
      }

      await client.query(
        `UPDATE opening_balance_batches
         SET status = 'posted', posted_by = $1, posted_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [userId ?? null, batchId, companyId]
      );

      await client.query('COMMIT');
      return res.json({ success: true });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error posting opening balance batch:', error);
      return res.status(500).json({ success: false, error: 'Failed to post opening balance batch' });
    } finally {
      client.release();
    }
  }
);

// =====================================================
// POST /api/opening-balances/batches/:id/reverse - Reverse batch (zero out openings)
// =====================================================
router.post(
  '/batches/:id/reverse',
  requireAnyPermission(['accounting:opening_balances:reverse']),
  requireCompany,
  async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const batchId = Number(req.params.id);

      if (!Number.isInteger(batchId)) {
        return res.status(400).json({ success: false, error: 'Invalid batch id' });
      }

      await client.query('BEGIN');

      const batch = await client.query(
        `SELECT id, status, fiscal_year_id, period_id
         FROM opening_balance_batches
         WHERE id = $1 AND company_id = $2
         LIMIT 1`,
        [batchId, companyId]
      );
      if (batch.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }
      if (batch.rows[0].status !== 'posted') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, error: 'Only posted batches can be reversed' });
      }

      const affected = await client.query(
        `SELECT DISTINCT account_id, currency_id
         FROM opening_balance_lines
         WHERE batch_id = $1 AND company_id = $2`,
        [batchId, companyId]
      );

      for (const row of affected.rows) {
        await client.query(
          `UPDATE account_balances
           SET opening_debit = 0,
               opening_credit = 0,
               last_updated_at = NOW()
           WHERE company_id = $1
             AND account_id = $2
             AND fiscal_year_id = $3
             AND period_id = $4
             AND currency_id = $5
             AND COALESCE(cost_center_id, -1) = -1
             AND COALESCE(branch_id, -1) = -1`,
          [companyId, row.account_id, batch.rows[0].fiscal_year_id, batch.rows[0].period_id, row.currency_id]
        );
      }

      await client.query(
        `UPDATE opening_balance_batches
         SET status = 'reversed', reversed_by = $1, reversed_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [userId ?? null, batchId, companyId]
      );

      await client.query('COMMIT');
      return res.json({ success: true });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error reversing opening balance batch:', error);
      return res.status(500).json({ success: false, error: 'Failed to reverse opening balance batch' });
    } finally {
      client.release();
    }
  }
);

export default router;
