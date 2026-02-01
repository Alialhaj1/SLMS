import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

type VoucherMethod = 'cash' | 'bank_transfer' | 'cheque';
type VoucherStatus = 'draft' | 'posted' | 'void';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapStatus(status: string): VoucherStatus {
  if (status === 'posted') return 'posted';
  if (status === 'cancelled') return 'void';
  return 'draft';
}

async function resolveCurrencyId(companyId: number, currencyCode?: string): Promise<number | null> {
  const code = (currencyCode || '').trim().toUpperCase();
  if (!code) return null;

  const scoped = await pool.query(
    `SELECT id FROM currencies WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
    [companyId, code]
  );
  if (scoped.rows[0]?.id) return scoped.rows[0].id;

  const global = await pool.query(
    `SELECT id FROM currencies WHERE company_id IS NULL AND code = $1 AND deleted_at IS NULL LIMIT 1`,
    [code]
  );
  return global.rows[0]?.id ?? null;
}

async function resolveGlAccountId(companyId: number, glAccountCode?: string): Promise<number | null> {
  const code = (glAccountCode || '').trim();
  if (!code) return null;
  const r = await pool.query(
    `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
    [companyId, code]
  );
  return r.rows[0]?.id ?? null;
}

// =============================================
// GET /api/payment-vouchers - list
// =============================================
router.get(
  '/',
  requireAnyPermission([
    'purchases:payment:view',
    'purchases:payment:create',
    'purchases:payment:approve',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const { page, limit, offset } = getPaginationParams(req.query);
      const { status, method, from_date, to_date, search } = req.query as any;

      const params: any[] = [companyId];
      let paramIndex = 2;

      let where = ` WHERE pv.company_id = $1 AND pv.deleted_at IS NULL`;

      if (from_date) {
        where += ` AND pv.voucher_date >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        where += ` AND pv.voucher_date <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      if (status && status !== 'all') {
        if (status === 'draft') where += ` AND pv.status IN ('draft','pending','approved')`;
        if (status === 'posted') where += ` AND pv.status = 'posted'`;
        if (status === 'void') where += ` AND pv.status = 'cancelled'`;
      }

      if (method && method !== 'all') {
        where += ` AND pv.method = $${paramIndex}`;
        params.push(method);
        paramIndex++;
      }

      if (search) {
        where += ` AND (pv.voucher_number ILIKE $${paramIndex} OR pv.payee ILIKE $${paramIndex} OR COALESCE(pv.reference,'') ILIKE $${paramIndex})`;
        params.push(`%${String(search).trim()}%`);
        paramIndex++;
      }

      const fromClause = `
        FROM payment_vouchers pv
        LEFT JOIN currencies c ON c.id = pv.currency_id
        LEFT JOIN cash_boxes cb ON cb.id = pv.cash_box_id AND cb.deleted_at IS NULL
        LEFT JOIN bank_accounts ba ON ba.id = pv.bank_account_id AND ba.deleted_at IS NULL
        LEFT JOIN banks b ON b.id = ba.bank_id AND b.deleted_at IS NULL
      `;

      const countResult = await pool.query(`SELECT COUNT(*)::int as total ${fromClause} ${where}`, params);
      const total = countResult.rows[0]?.total ?? 0;

      const result = await pool.query(
        `SELECT
          pv.id,
          pv.voucher_number,
          pv.voucher_date,
          pv.payee,
          pv.payee_ar,
          pv.method,
          pv.amount,
          pv.reference,
          pv.status,
          pv.exchange_rate,
          c.code as currency_code,
          cb.name as cash_box_name,
          cb.name_ar as cash_box_name_ar,
          ba.account_number as bank_account_number,
          b.name as bank_name,
          b.name_ar as bank_name_ar,
          pv.journal_entry_id
         ${fromClause}
         ${where}
         ORDER BY pv.voucher_date DESC, pv.id DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const data = result.rows.map((r: any) => ({
        id: Number(r.id),
        voucherNo: r.voucher_number,
        payee: r.payee,
        payeeAr: r.payee_ar || '',
        method: r.method,
        date: String(r.voucher_date).slice(0, 10),
        amount: toNumber(r.amount),
        currency: (r.currency_code || 'SAR') as any,
        reference: r.reference || '',
        status: mapStatus(r.status),
        journal_id: r.journal_entry_id ? Number(r.journal_entry_id) : null,
        cash_box_name: r.cash_box_name || null,
        cash_box_name_ar: r.cash_box_name_ar || null,
        bank_account_number: r.bank_account_number || null,
        bank_name: r.bank_name || null,
        bank_name_ar: r.bank_name_ar || null,
        exchange_rate: toNumber(r.exchange_rate) || 1,
      }));

      return sendPaginated(res, data, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching payment vouchers:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch payment vouchers' });
    }
  }
);

// =============================================
// POST /api/payment-vouchers - create draft (creates a draft journal entry)
// =============================================
router.post(
  '/',
  requireAnyPermission(['purchases:payment:create', 'purchases:payment:approve']),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const companyId = req.companyId as number;
      const userId = req.user!.id;

      const {
        voucher_date,
        payee,
        payee_ar,
        method,
        amount,
        currency_code,
        exchange_rate,
        reference,
        cash_box_id,
        bank_account_id,
        expense_gl_account_code,
      } = req.body || {};

      const m = String(method || '').trim() as VoucherMethod;
      const amt = toNumber(amount);

      if (!voucher_date) return res.status(400).json({ success: false, error: 'voucher_date is required' });
      if (!payee || !String(payee).trim()) return res.status(400).json({ success: false, error: 'payee is required' });
      if (!['cash', 'bank_transfer', 'cheque'].includes(m)) {
        return res.status(400).json({ success: false, error: 'Invalid payment method' });
      }
      if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: 'amount must be > 0' });

      await client.query('BEGIN');

      // Period open check
      const periodCheck = await client.query(
        `SELECT ap.id, ap.status
         FROM accounting_periods ap
         JOIN fiscal_years fy ON fy.id = ap.fiscal_year_id
         WHERE fy.company_id = $1
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [companyId, voucher_date]
      );

      if (periodCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'No accounting period found for this date' });
      }
      if (periodCheck.rows[0].status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Accounting period is not open' });
      }

      const expenseAccountId = await resolveGlAccountId(companyId, String(expense_gl_account_code || ''));
      if (!expenseAccountId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Invalid expense_gl_account_code' });
      }

      let creditAccountId: number | null = null;
      let resolvedCashBoxId: number | null = null;
      let resolvedBankAccountId: number | null = null;
      let fallbackCurrencyId: number | null = null;

      if (m === 'cash') {
        if (!cash_box_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: 'cash_box_id is required for cash method' });
        }
        const cb = await client.query(
          `SELECT id, gl_account_id, currency_id
           FROM cash_boxes
           WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND is_active = TRUE
           LIMIT 1`,
          [Number(cash_box_id), companyId]
        );
        if (cb.rows.length === 0 || !cb.rows[0].gl_account_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: 'Invalid cash_box_id' });
        }
        resolvedCashBoxId = cb.rows[0].id;
        creditAccountId = cb.rows[0].gl_account_id;
        fallbackCurrencyId = cb.rows[0].currency_id || null;
      } else {
        if (!bank_account_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: 'bank_account_id is required for bank methods' });
        }
        const ba = await client.query(
          `SELECT id, gl_account_id, currency_id
           FROM bank_accounts
           WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND is_active = TRUE
           LIMIT 1`,
          [Number(bank_account_id), companyId]
        );
        if (ba.rows.length === 0 || !ba.rows[0].gl_account_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: 'Invalid bank_account_id' });
        }
        resolvedBankAccountId = ba.rows[0].id;
        creditAccountId = ba.rows[0].gl_account_id;
        fallbackCurrencyId = ba.rows[0].currency_id || null;
      }

      if (!creditAccountId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Payment source must be linked to a GL account' });
      }

      const baseCurrencyId = req.companyContext?.currency_id;
      const desiredCurrencyId = currency_code
        ? await resolveCurrencyId(companyId, String(currency_code))
        : fallbackCurrencyId;

      if (!desiredCurrencyId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      const exchangeRateNum = toNumber(exchange_rate) || 1;
      const isForeign = baseCurrencyId && desiredCurrencyId !== baseCurrencyId;
      if (isForeign && exchangeRateNum <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'exchange_rate must be > 0 for foreign currency' });
      }

      const amountBase = isForeign ? amt * exchangeRateNum : amt;
      const totalDebit = amountBase;
      const totalCredit = amountBase;
      const totalDebitFc = isForeign ? amt : 0;
      const totalCreditFc = isForeign ? amt : 0;

      // Numbering
      const voucherNumberResult = await client.query(
        `SELECT generate_document_number($1, 'payment_voucher', $2, NULL, NULL, $3::date) as number`,
        [companyId, userId, voucher_date]
      );
      const voucherNumber = voucherNumberResult.rows[0]?.number || `PV-${Date.now()}`;

      const journalEntryNumberResult = await client.query(
        `SELECT generate_document_number($1, 'journal_entry', $2, NULL, NULL, $3::date) as number`,
        [companyId, userId, voucher_date]
      );
      const journalEntryNumber = journalEntryNumberResult.rows[0]?.number || `JE-${Date.now()}`;

      const fiscalInfo = await client.query(
        `SELECT fy.id as fiscal_year_id, ap.id as period_id
         FROM fiscal_years fy
         JOIN accounting_periods ap ON ap.fiscal_year_id = fy.id
         WHERE fy.company_id = $1
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [companyId, voucher_date]
      );

      const description = `Payment Voucher ${voucherNumber} - ${String(payee).trim()}`;

      const header = await client.query(
        `INSERT INTO journal_entries (
          company_id, entry_number, entry_date,
          fiscal_year_id, period_id,
          entry_type,
          source_document_type, source_document_number,
          currency_id, exchange_rate,
          total_debit, total_credit, total_debit_fc, total_credit_fc,
          description, narration, reference,
          status, created_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft',$18,NOW())
        RETURNING id, entry_number`,
        [
          companyId,
          journalEntryNumber,
          voucher_date,
          fiscalInfo.rows[0]?.fiscal_year_id,
          fiscalInfo.rows[0]?.period_id,
          'payment_voucher',
          'payment_voucher',
          voucherNumber,
          desiredCurrencyId,
          exchangeRateNum,
          totalDebit,
          totalCredit,
          totalDebitFc,
          totalCreditFc,
          description,
          null,
          reference || null,
          userId,
        ]
      );

      const journalId = header.rows[0].id;

      // Debit expense
      await client.query(
        `INSERT INTO journal_lines (
          journal_entry_id, line_number,
          account_id,
          debit_amount, credit_amount,
          fc_debit_amount, fc_credit_amount,
          currency_id, exchange_rate,
          description
        ) VALUES ($1, 1, $2, $3, 0, $4, 0, $5, $6, $7)`,
        [journalId, expenseAccountId, amountBase, totalDebitFc, desiredCurrencyId, exchangeRateNum, description]
      );

      // Credit cash/bank
      await client.query(
        `INSERT INTO journal_lines (
          journal_entry_id, line_number,
          account_id,
          debit_amount, credit_amount,
          fc_debit_amount, fc_credit_amount,
          currency_id, exchange_rate,
          description
        ) VALUES ($1, 2, $2, 0, $3, 0, $4, $5, $6, $7)`,
        [journalId, creditAccountId, amountBase, totalCreditFc, desiredCurrencyId, exchangeRateNum, description]
      );

      const voucherRow = await client.query(
        `INSERT INTO payment_vouchers (
          company_id, voucher_number, voucher_date,
          payee, payee_ar,
          method,
          cash_box_id, bank_account_id,
          expense_account_id,
          currency_id, exchange_rate,
          amount, reference,
          status, journal_entry_id,
          created_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft',$14,$15,NOW())
        RETURNING id`,
        [
          companyId,
          voucherNumber,
          voucher_date,
          String(payee).trim(),
          payee_ar ? String(payee_ar).trim() : null,
          m,
          resolvedCashBoxId,
          resolvedBankAccountId,
          expenseAccountId,
          desiredCurrencyId,
          exchangeRateNum,
          amt,
          reference || null,
          journalId,
          userId,
        ]
      );

      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
         VALUES ($1, 'created', $2, $3)`,
        [journalId, userId, `Payment voucher created: ${voucherNumber}`]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        data: {
          id: voucherRow.rows[0].id,
          voucher_number: voucherNumber,
          journal_id: journalId,
        },
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating payment voucher:', error);
      return res.status(500).json({ success: false, error: 'Failed to create payment voucher' });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/payment-vouchers/:id/post - post voucher (posts underlying journal)
// =============================================
router.post(
  '/:id/post',
  requireAnyPermission(['purchases:payment:approve', 'accounting:journal:post']),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const companyId = req.companyId as number;
      const userId = req.user!.id;
      const { id } = req.params;

      await client.query('BEGIN');

      const v = await client.query(
        `SELECT id, status, journal_entry_id
         FROM payment_vouchers
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [Number(id), companyId]
      );

      if (v.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Payment voucher not found' });
      }

      if (v.rows[0].status === 'posted') {
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'Already posted' });
      }

      if (v.rows[0].status === 'cancelled') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Cannot post void voucher' });
      }

      const journalId = v.rows[0].journal_entry_id;
      if (!journalId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Voucher has no linked journal entry' });
      }

      const postResult = await client.query(
        `SELECT post_journal_entry($1, $2) as success`,
        [journalId, userId]
      );

      if (!postResult.rows[0]?.success) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Failed to post voucher journal' });
      }

      await client.query(
        `UPDATE payment_vouchers
         SET status = 'posted', posted_by = $1, posted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [userId, Number(id), companyId]
      );

      await client.query('COMMIT');

      return res.json({ success: true, message: 'Payment voucher posted' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error posting payment voucher:', error);
      return res.status(500).json({ success: false, error: 'Failed to post payment voucher' });
    } finally {
      client.release();
    }
  }
);

// =============================================
// POST /api/payment-vouchers/:id/void - void draft voucher (cancels underlying journal)
// =============================================
router.post(
  '/:id/void',
  requireAnyPermission(['purchases:payment:approve', 'accounting:journal:delete']),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const companyId = req.companyId as number;
      const userId = req.user!.id;
      const { id } = req.params;

      await client.query('BEGIN');

      const v = await client.query(
        `SELECT id, status, journal_entry_id
         FROM payment_vouchers
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [Number(id), companyId]
      );

      if (v.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Payment voucher not found' });
      }

      if (v.rows[0].status === 'cancelled') {
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'Already void' });
      }

      if (v.rows[0].status === 'posted') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Cannot void posted voucher (reverse required)' });
      }

      const journalId = v.rows[0].journal_entry_id;
      if (journalId) {
        await client.query(
          `UPDATE journal_entries
           SET status = 'cancelled', updated_by = $1, updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [userId, journalId, companyId]
        );

        await client.query(
          `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
           VALUES ($1, 'cancelled', $2, $3)`,
          [journalId, userId, 'Payment voucher voided']
        );
      }

      await client.query(
        `UPDATE payment_vouchers
         SET status = 'cancelled', voided_by = $1, voided_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [userId, Number(id), companyId]
      );

      await client.query('COMMIT');

      return res.json({ success: true, message: 'Payment voucher voided' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error voiding payment voucher:', error);
      return res.status(500).json({ success: false, error: 'Failed to void payment voucher' });
    } finally {
      client.release();
    }
  }
);

export default router;
