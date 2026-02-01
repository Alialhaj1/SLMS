import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

type BankAccountRow = {
  id: number;
  account_number: string;
  iban: string | null;
  account_type: string | null;
  opening_balance: string | number | null;
  current_balance: string | number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  bank_name: string;
  bank_name_ar: string | null;
  swift_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  currency_code: string;
  gl_account_code: string | null;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(row: BankAccountRow) {
  return {
    id: row.id,
    code: `BA${String(row.id).padStart(3, '0')}`,
    bank_name: row.bank_name,
    bank_name_ar: row.bank_name_ar,
    branch_name: row.branch_name,
    branch_code: row.branch_code,
    account_number: row.account_number,
    iban: row.iban,
    swift_code: row.swift_code,
    account_type: row.account_type || 'current',
    currency_code: row.currency_code,
    gl_account_code: row.gl_account_code,
    opening_balance: toNumber(row.opening_balance),
    current_balance: toNumber(row.current_balance),
    overdraft_limit: null,
    is_default: row.is_default,
    is_reconciled: false,
    last_reconciled_date: null,
    last_reconciled_balance: null,
    is_active: row.is_active,
    notes: null,
    created_at: row.created_at,
  };
}

async function resolveCurrencyId(currencyCode: string): Promise<number | null> {
  const code = (currencyCode || '').trim().toUpperCase();
  if (!code) return null;
  const r = await pool.query(
    `SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
    [code]
  );
  return r.rows[0]?.id ?? null;
}

async function resolveBranchId(companyId: number, branchCode?: string, branchName?: string): Promise<number | null> {
  const code = (branchCode || '').trim();
  if (code) {
    const r = await pool.query(
      `SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
      [companyId, code]
    );
    return r.rows[0]?.id ?? null;
  }

  const name = (branchName || '').trim();
  if (name) {
    const r = await pool.query(
      `SELECT id FROM branches WHERE company_id = $1 AND name ILIKE $2 AND deleted_at IS NULL LIMIT 1`,
      [companyId, name]
    );
    return r.rows[0]?.id ?? null;
  }

  return null;
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

async function resolveBankId(bankName: string, bankNameAr?: string, swiftCode?: string): Promise<number | null> {
  const name = (bankName || '').trim();
  if (!name) return null;

  const existing = await pool.query(
    `SELECT id FROM banks WHERE name ILIKE $1 AND deleted_at IS NULL LIMIT 1`,
    [name]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create minimal bank record if it doesn't exist
  const code = `BNK${String(Date.now()).slice(-10)}`; // <= 13 chars
  const inserted = await pool.query(
    `INSERT INTO banks (code, swift_code, name, name_ar, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [code, swiftCode?.trim() || null, name, bankNameAr?.trim() || null]
  );

  return inserted.rows[0]?.id ?? null;
}

// =============================================
// GET /api/bank-accounts - List bank accounts
// =============================================
router.get(
  '/',
  requireAnyPermission([
    'finance:bank_accounts:view',
    'finance:bank_accounts:manage',
    // tolerate older/front-end permission namespaces if they exist
    'master:finance:view',
    'master:finance:create',
    'master:finance:update',
    'master:finance:delete',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;

      const result = await pool.query(
        `WITH ob AS (
           SELECT
             obl.company_id,
             obl.account_id,
             SUM(COALESCE(obl.debit, 0) - COALESCE(obl.credit, 0))::DECIMAL(18,4) AS opening_balance
           FROM opening_balance_lines obl
           JOIN opening_balance_batches obb
             ON obb.id = obl.batch_id
            AND obb.status = 'posted'
           WHERE obl.company_id = $1
           GROUP BY obl.company_id, obl.account_id
         ), mv AS (
           SELECT
             gl.company_id,
             gl.account_id,
             SUM(COALESCE(gl.debit_amount, 0) - COALESCE(gl.credit_amount, 0))::DECIMAL(18,4) AS movement_balance
           FROM general_ledger gl
           WHERE gl.company_id = $1
           GROUP BY gl.company_id, gl.account_id
         )
         SELECT
           ba.id,
           ba.account_number,
           ba.iban,
           ba.account_type,
           COALESCE(ob.opening_balance, 0) AS opening_balance,
           (COALESCE(ob.opening_balance, 0) + COALESCE(mv.movement_balance, 0)) AS current_balance,
           ba.is_default,
           ba.is_active,
           ba.created_at,
           b.name AS bank_name,
           b.name_ar AS bank_name_ar,
           b.swift_code,
           br.name AS branch_name,
           br.code AS branch_code,
           c.code AS currency_code,
           a.code AS gl_account_code
         FROM bank_accounts ba
         JOIN banks b ON b.id = ba.bank_id AND b.deleted_at IS NULL
         LEFT JOIN branches br ON br.id = ba.branch_id AND br.deleted_at IS NULL
         JOIN currencies c ON c.id = ba.currency_id AND c.deleted_at IS NULL
         LEFT JOIN accounts a ON a.id = ba.gl_account_id AND a.deleted_at IS NULL
         LEFT JOIN ob ON ob.company_id = ba.company_id AND ob.account_id = ba.gl_account_id
         LEFT JOIN mv ON mv.company_id = ba.company_id AND mv.account_id = ba.gl_account_id
         WHERE ba.company_id = $1 AND ba.deleted_at IS NULL
         ORDER BY ba.is_default DESC, ba.id DESC`,
        [companyId]
      );

      return res.json({ success: true, data: result.rows.map(mapRow) });
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch bank accounts' });
    }
  }
);

// =============================================
// POST /api/bank-accounts - Create bank account
// =============================================
router.post(
  '/',
  requireAnyPermission([
    'finance:bank_accounts:create',
    'finance:bank_accounts:manage',
    'master:finance:create',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const {
        bank_name,
        bank_name_ar,
        swift_code,
        branch_code,
        branch_name,
        account_number,
        iban,
        account_type,
        currency_code,
        gl_account_code,
        opening_balance,
        is_default,
        is_active,
      } = req.body || {};

      if (!bank_name || !String(bank_name).trim()) {
        return res.status(400).json({ success: false, error: 'bank_name is required' });
      }

      if (!account_number || !String(account_number).trim()) {
        return res.status(400).json({ success: false, error: 'account_number is required' });
      }

      if (!gl_account_code || !String(gl_account_code).trim()) {
        return res.status(400).json({ success: false, error: 'gl_account_code is required' });
      }

      const currencyId = await resolveCurrencyId(String(currency_code || ''));
      if (!currencyId) {
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      const bankId = await resolveBankId(String(bank_name), bank_name_ar, swift_code);
      if (!bankId) {
        return res.status(400).json({ success: false, error: 'Invalid bank' });
      }

      const branchId = await resolveBranchId(companyId, branch_code, branch_name);
      const glAccountId = await resolveGlAccountId(companyId, String(gl_account_code));
      if (!glAccountId) {
        return res.status(400).json({ success: false, error: 'Invalid gl_account_code' });
      }

      const opening = toNumber(opening_balance);
      const active = is_active === undefined ? true : Boolean(is_active);
      const makeDefault = Boolean(is_default);

      if (makeDefault) {
        await pool.query(
          `UPDATE bank_accounts
           SET is_default = false, updated_at = NOW()
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true`,
          [companyId]
        );
      }

      const inserted = await pool.query(
        `INSERT INTO bank_accounts (
          company_id,
          bank_id,
          branch_id,
          account_number,
          iban,
          account_name,
          currency_id,
          account_type,
          gl_account_id,
          opening_balance,
          current_balance,
          is_default,
          is_active,
          created_by,
          updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING id`,
        [
          companyId,
          bankId,
          branchId,
          String(account_number).trim(),
          iban ? String(iban).trim() : null,
          null,
          currencyId,
          account_type ? String(account_type).trim() : 'current',
          glAccountId,
          opening,
          opening,
          makeDefault,
          active,
          userId ?? null,
          userId ?? null,
        ]
      );

      const id = inserted.rows[0]?.id;
      return res.status(201).json({ success: true, data: { id } });
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      if (String(error?.code) === '23505') {
        return res.status(409).json({ success: false, error: 'Bank account already exists' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create bank account' });
    }
  }
);

// =============================================
// PUT /api/bank-accounts/:id - Update bank account
// =============================================
router.put(
  '/:id',
  requireAnyPermission([
    'finance:bank_accounts:edit',
    'finance:bank_accounts:manage',
    'master:finance:update',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const exists = await pool.query(
        `SELECT 1 FROM bank_accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, companyId]
      );

      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bank account not found' });
      }

      const {
        bank_name,
        bank_name_ar,
        swift_code,
        branch_code,
        branch_name,
        account_number,
        iban,
        account_type,
        currency_code,
        gl_account_code,
        opening_balance,
        current_balance,
        is_default,
        is_active,
      } = req.body || {};

      const currencyId = currency_code ? await resolveCurrencyId(String(currency_code)) : null;
      if (currency_code && !currencyId) {
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      const bankId = bank_name ? await resolveBankId(String(bank_name), bank_name_ar, swift_code) : null;
      if (bank_name && !bankId) {
        return res.status(400).json({ success: false, error: 'Invalid bank' });
      }

      const branchId = await resolveBranchId(companyId, branch_code, branch_name);
      const glAccountId =
        gl_account_code !== undefined ? await resolveGlAccountId(companyId, String(gl_account_code)) : null;
      if (gl_account_code !== undefined && (!gl_account_code || !String(gl_account_code).trim())) {
        return res.status(400).json({ success: false, error: 'gl_account_code is required' });
      }
      if (gl_account_code !== undefined && !glAccountId) {
        return res.status(400).json({ success: false, error: 'Invalid gl_account_code' });
      }

      const makeDefault = is_default === undefined ? null : Boolean(is_default);
      if (makeDefault) {
        await pool.query(
          `UPDATE bank_accounts
           SET is_default = false, updated_at = NOW()
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true AND id <> $2`,
          [companyId, id]
        );
      }

      await pool.query(
        `UPDATE bank_accounts
         SET
           bank_id = COALESCE($1, bank_id),
           branch_id = $2,
           account_number = COALESCE($3, account_number),
           iban = $4,
           currency_id = COALESCE($5, currency_id),
           account_type = COALESCE($6, account_type),
           gl_account_id = COALESCE($7, gl_account_id),
           opening_balance = COALESCE($8, opening_balance),
           current_balance = COALESCE($9, current_balance),
           is_default = COALESCE($10, is_default),
           is_active = COALESCE($11, is_active),
           updated_by = $12,
           updated_at = NOW()
         WHERE id = $13 AND company_id = $14 AND deleted_at IS NULL`,
        [
          bankId,
          branchId,
          account_number ? String(account_number).trim() : null,
          iban ? String(iban).trim() : null,
          currencyId,
          account_type ? String(account_type).trim() : null,
          gl_account_code !== undefined ? glAccountId : null,
          opening_balance === undefined ? null : toNumber(opening_balance),
          current_balance === undefined ? null : toNumber(current_balance),
          makeDefault,
          is_active === undefined ? null : Boolean(is_active),
          userId ?? null,
          id,
          companyId,
        ]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating bank account:', error);
      if (String(error?.code) === '23505') {
        return res.status(409).json({ success: false, error: 'Bank account already exists' });
      }
      return res.status(500).json({ success: false, error: 'Failed to update bank account' });
    }
  }
);

// =============================================
// DELETE /api/bank-accounts/:id - Soft delete
// =============================================
router.delete(
  '/:id',
  requireAnyPermission([
    'finance:bank_accounts:delete',
    'finance:bank_accounts:manage',
    'master:finance:delete',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const existing = await pool.query(
        `SELECT gl_account_id
         FROM bank_accounts
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bank account not found' });
      }

      const glAccountId = Number(existing.rows[0]?.gl_account_id);
      if (Number.isFinite(glAccountId) && glAccountId > 0) {
        const hasOb = await pool.query(
          `SELECT 1
           FROM opening_balance_lines obl
           JOIN opening_balance_batches obb ON obb.id = obl.batch_id AND obb.status = 'posted'
           WHERE obl.company_id = $1 AND obl.account_id = $2
           LIMIT 1`,
          [companyId, glAccountId]
        );
        if (hasOb.rows.length > 0) {
          return res.status(409).json({ success: false, error: 'Cannot delete bank account with opening balance' });
        }

        const hasGl = await pool.query(
          `SELECT 1
           FROM general_ledger gl
           WHERE gl.company_id = $1 AND gl.account_id = $2
           LIMIT 1`,
          [companyId, glAccountId]
        );
        if (hasGl.rows.length > 0) {
          return res.status(409).json({ success: false, error: 'Cannot delete bank account with posted movements' });
        }
      }

      const result = await pool.query(
        `UPDATE bank_accounts
         SET is_deleted = true,
             deleted_at = NOW(),
             deleted_by = $3,
             updated_at = NOW(),
             updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId, userId ?? null]
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete bank account' });
    }
  }
);

export default router;
