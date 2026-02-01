import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
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

function mapUiStatus(status: string): 'pending' | 'confirmed' | 'rejected' {
  if (status === 'posted') return 'confirmed';
  if (status === 'cancelled') return 'rejected';
  return 'pending';
}

// =============================================
// GET /api/cash-deposits - List cash deposits
// Backed by journal_entries (entry_type = 'cash_deposit')
// =============================================
router.get(
  '/',
  requirePermission('accounting:journal:view'),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const { page, limit, offset } = getPaginationParams(req.query);
      const { status, from_date, to_date, search, bank_account_id, cash_box_id } = req.query as any;

      const params: any[] = [companyId];
      let paramIndex = 2;

      let where = ` WHERE je.company_id = $1 AND je.entry_type = 'cash_deposit'`;

      if (from_date) {
        where += ` AND je.entry_date >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        where += ` AND je.entry_date <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      if (status && status !== 'all') {
        if (status === 'pending') {
          where += ` AND je.status IN ('draft', 'pending', 'approved')`;
        } else if (status === 'confirmed') {
          where += ` AND je.status = 'posted'`;
        } else if (status === 'rejected') {
          where += ` AND je.status = 'cancelled'`;
        }
      }

      if (search) {
        where += ` AND (je.entry_number ILIKE $${paramIndex} OR COALESCE(je.source_document_number, '') ILIKE $${paramIndex} OR COALESCE(je.description, '') ILIKE $${paramIndex})`;
        params.push(`%${String(search).trim()}%`);
        paramIndex++;
      }

      if (bank_account_id) {
        where += ` AND ba.id = $${paramIndex}`;
        params.push(Number(bank_account_id));
        paramIndex++;
      }

      if (cash_box_id) {
        where += ` AND cb.id = $${paramIndex}`;
        params.push(Number(cash_box_id));
        paramIndex++;
      }

      const baseQuery = `
        FROM journal_entries je
        JOIN journal_lines jl_debit
          ON jl_debit.journal_entry_id = je.id
         AND COALESCE(jl_debit.debit_amount, 0) > 0
        JOIN journal_lines jl_credit
          ON jl_credit.journal_entry_id = je.id
         AND COALESCE(jl_credit.credit_amount, 0) > 0
        LEFT JOIN bank_accounts ba
          ON ba.company_id = je.company_id
         AND ba.gl_account_id = jl_debit.account_id
         AND ba.deleted_at IS NULL
        LEFT JOIN banks b
          ON b.id = ba.bank_id
         AND b.deleted_at IS NULL
        LEFT JOIN cash_boxes cb
          ON cb.company_id = je.company_id
         AND cb.gl_account_id = jl_credit.account_id
         AND cb.deleted_at IS NULL
        LEFT JOIN currencies c
          ON c.id = je.currency_id
        LEFT JOIN users u
          ON u.id = je.created_by
        LEFT JOIN users pu
          ON pu.id = je.posted_by
      `;

      const countResult = await pool.query(`SELECT COUNT(*)::int as total ${baseQuery} ${where}`, params);
      const total = countResult.rows[0]?.total ?? 0;

      const rows = await pool.query(
        `SELECT
           je.id as journal_id,
           je.entry_number,
           COALESCE(je.source_document_number, je.entry_number) as deposit_number,
           je.entry_date,
           je.status as journal_status,
           je.description,
           je.reference as deposit_slip_no,
           je.exchange_rate,
           c.code as currency_code,
           je.total_debit as amount_base,
           COALESCE(je.total_debit_fc, 0) as amount_fc,
           cb.id as cash_box_id,
           cb.name as cash_box_name,
           cb.name_ar as cash_box_name_ar,
           ba.id as bank_account_id,
           ba.account_name as bank_account_name,
           ba.account_number as bank_account_number,
           b.name as bank_name,
           b.name_ar as bank_name_ar,
           u.full_name as created_by_name,
           pu.full_name as posted_by_name,
           je.posted_at
         ${baseQuery}
         ${where}
         ORDER BY je.entry_date DESC, je.id DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const data = rows.rows.map((r: any) => {
        const currencyCode = r.currency_code || 'SAR';
        const amount = toNumber(r.amount_fc) > 0 ? toNumber(r.amount_fc) : toNumber(r.amount_base);
        return {
          id: Number(r.journal_id),
          journal_id: Number(r.journal_id),
          depositNumber: r.deposit_number,
          date: String(r.entry_date).slice(0, 10),
          cashAccount: r.cash_box_name || null,
          cashAccountAr: r.cash_box_name_ar || null,
          bankAccount: r.bank_account_name || r.bank_account_number || null,
          bankAccountAr: r.bank_account_name || r.bank_account_number || null,
          bankName: r.bank_name || null,
          bankNameAr: r.bank_name_ar || null,
          amount,
          currency: currencyCode,
          exchangeRate: toNumber(r.exchange_rate) || 1,
          description: r.description || '',
          descriptionAr: r.description || '',
          depositSlipNo: r.deposit_slip_no || '',
          status: mapUiStatus(r.journal_status),
          createdBy: r.created_by_name || '',
          confirmedBy: r.posted_by_name || '',
          confirmedDate: r.posted_at ? String(r.posted_at).slice(0, 10) : '',
        };
      });

      return sendPaginated(res, data, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching cash deposits:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch cash deposits' });
    }
  }
);

// =============================================
// POST /api/cash-deposits - Create draft cash deposit journal
// =============================================
router.post(
  '/',
  requirePermission('accounting:journal:create'),
  requireCompany,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const companyId = req.companyId as number;
      const userId = req.user!.id;

      const {
        entry_date,
        cash_box_id,
        bank_account_id,
        amount,
        currency_code,
        exchange_rate,
        deposit_slip_no,
        description,
      } = req.body || {};

      const amountNum = toNumber(amount);
      if (!entry_date) {
        return res.status(400).json({ success: false, error: 'entry_date is required' });
      }
      if (!cash_box_id) {
        return res.status(400).json({ success: false, error: 'cash_box_id is required' });
      }
      if (!bank_account_id) {
        return res.status(400).json({ success: false, error: 'bank_account_id is required' });
      }
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be > 0' });
      }

      await client.query('BEGIN');

      // Verify period is open
      const periodCheck = await client.query(
        `SELECT ap.id, ap.status 
         FROM accounting_periods ap
         JOIN fiscal_years fy ON fy.id = ap.fiscal_year_id
         WHERE fy.company_id = $1 
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [companyId, entry_date]
      );

      if (periodCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'No accounting period found for this date' });
      }

      if (periodCheck.rows[0].status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Accounting period is not open' });
      }

      const cashBox = await client.query(
        `SELECT id, name, name_ar, gl_account_id
         FROM cash_boxes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND is_active = TRUE
         LIMIT 1`,
        [Number(cash_box_id), companyId]
      );

      if (cashBox.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Invalid cash_box_id' });
      }

      const bankAccount = await client.query(
        `SELECT ba.id, ba.account_name, ba.account_number, ba.currency_id, ba.gl_account_id,
                b.name as bank_name, b.name_ar as bank_name_ar
         FROM bank_accounts ba
         JOIN banks b ON b.id = ba.bank_id AND b.deleted_at IS NULL
         WHERE ba.id = $1 AND ba.company_id = $2 AND ba.deleted_at IS NULL AND ba.is_active = TRUE
         LIMIT 1`,
        [Number(bank_account_id), companyId]
      );

      if (bankAccount.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Invalid bank_account_id' });
      }

      const cashGl = cashBox.rows[0].gl_account_id;
      const bankGl = bankAccount.rows[0].gl_account_id;

      if (!cashGl || !bankGl) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Both cash box and bank account must be linked to a GL account' });
      }

      const baseCurrencyId = req.companyContext?.currency_id;
      const desiredCurrencyId = currency_code
        ? await resolveCurrencyId(companyId, String(currency_code))
        : (bankAccount.rows[0].currency_id as number);

      if (!desiredCurrencyId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      const exchangeRateNum = toNumber(exchange_rate) || 1;
      const isForeign = baseCurrencyId && desiredCurrencyId !== baseCurrencyId;
      if (isForeign && exchangeRateNum <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'exchange_rate must be > 0 for foreign currency deposits' });
      }

      const amountBase = isForeign ? amountNum * exchangeRateNum : amountNum;
      const totalDebit = amountBase;
      const totalCredit = amountBase;
      const totalDebitFc = isForeign ? amountNum : 0;
      const totalCreditFc = isForeign ? amountNum : 0;

      // Generate entry number
      const entryNumber = await client.query(
        `SELECT generate_document_number($1, 'journal_entry', $2, NULL, NULL, $3::date) as number`,
        [companyId, userId, entry_date]
      );

      const number = entryNumber.rows[0]?.number || `JE-${Date.now()}`;
      const depositNumber = `DEP-${String(Date.now()).slice(-10)}`;

      // Get fiscal year and period
      const fiscalInfo = await client.query(
        `SELECT fy.id as fiscal_year_id, ap.id as period_id
         FROM fiscal_years fy
         JOIN accounting_periods ap ON ap.fiscal_year_id = fy.id
         WHERE fy.company_id = $1 
           AND $2::date BETWEEN ap.start_date AND ap.end_date
         LIMIT 1`,
        [companyId, entry_date]
      );

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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'draft', $18, NOW())
        RETURNING *`,
        [
          companyId,
          number,
          entry_date,
          fiscalInfo.rows[0]?.fiscal_year_id,
          fiscalInfo.rows[0]?.period_id,
          'cash_deposit',
          'cash_deposit',
          depositNumber,
          desiredCurrencyId,
          exchangeRateNum,
          totalDebit,
          totalCredit,
          totalDebitFc,
          totalCreditFc,
          description || null,
          null,
          deposit_slip_no || null,
          userId,
        ]
      );

      const journalId = header.rows[0].id;
      const lineDescription = description || `Cash deposit ${depositNumber}`;

      // Debit bank
      await client.query(
        `INSERT INTO journal_lines (
          journal_entry_id, line_number,
          account_id,
          debit_amount, credit_amount,
          fc_debit_amount, fc_credit_amount,
          currency_id, exchange_rate,
          description
        ) VALUES ($1, 1, $2, $3, 0, $4, 0, $5, $6, $7)`,
        [journalId, bankGl, amountBase, totalDebitFc, desiredCurrencyId, exchangeRateNum, lineDescription]
      );

      // Credit cash
      await client.query(
        `INSERT INTO journal_lines (
          journal_entry_id, line_number,
          account_id,
          debit_amount, credit_amount,
          fc_debit_amount, fc_credit_amount,
          currency_id, exchange_rate,
          description
        ) VALUES ($1, 2, $2, 0, $3, 0, $4, $5, $6, $7)`,
        [journalId, cashGl, amountBase, totalCreditFc, desiredCurrencyId, exchangeRateNum, lineDescription]
      );

      await client.query(
        `INSERT INTO journal_audit_log (journal_entry_id, action, performed_by, notes)
         VALUES ($1, 'created', $2, $3)`,
        [journalId, userId, `Cash deposit created: ${depositNumber}`]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        data: {
          journal_id: journalId,
          entry_number: header.rows[0].entry_number,
          deposit_number: depositNumber,
        },
        message: 'Cash deposit created successfully',
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating cash deposit:', error);
      return res.status(500).json({ success: false, error: 'Failed to create cash deposit' });
    } finally {
      client.release();
    }
  }
);

export default router;
