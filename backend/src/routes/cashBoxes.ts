import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

type CashBoxRow = {
  id: number;
  code: string;
  name: string;
  name_ar: string | null;
  currency_code: string;
  gl_account_code: string;
  opening_balance: string | number | null;
  current_balance: string | number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(row: CashBoxRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    name_ar: row.name_ar,
    currency_code: row.currency_code,
    gl_account_code: row.gl_account_code,
    opening_balance: toNumber(row.opening_balance),
    current_balance: toNumber(row.current_balance),
    is_default: row.is_default,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function resolveCurrencyId(companyId: number, currencyCode?: string): Promise<number | null> {
  const code = (currencyCode || '').trim().toUpperCase();
  if (!code) return null;

  const scoped = await pool.query(
    `SELECT id FROM currencies WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
    [companyId, code]
  );
  if (scoped.rows[0]?.id) return scoped.rows[0].id;

  const global = await pool.query(`SELECT id FROM currencies WHERE company_id IS NULL AND code = $1 AND deleted_at IS NULL LIMIT 1`, [code]);
  return global.rows[0]?.id ?? null;
}

async function resolveBaseCurrencyId(companyId: number): Promise<number | null> {
  const r = await pool.query(
    `SELECT id FROM currencies WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE ORDER BY id ASC LIMIT 1`,
    [companyId]
  );
  return r.rows[0]?.id ?? null;
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

/**
 * Find the Cash parent group account under which cash box sub-accounts live.
 * Strategy: look for default_accounts CASH entry → find child group (is_group=true),
 * or fallback to code patterns like '111101'.
 */
async function findCashParentGroup(companyId: number): Promise<{ id: number; code: string; level: number; account_type_id: number } | null> {
  // Try default_accounts → CASH account → find child group
  const da = await pool.query(
    `SELECT da.account_id FROM default_accounts da WHERE da.company_id = $1 AND da.account_key = 'CASH' LIMIT 1`,
    [companyId]
  );
  const cashAccountId = da.rows[0]?.account_id;
  if (cashAccountId) {
    // Find a child group under the cash account (e.g. 111101 Cash Boxes)
    const grp = await pool.query(
      `SELECT id, code, level, account_type_id FROM accounts WHERE company_id = $1 AND parent_id = $2 AND is_group = true AND deleted_at IS NULL ORDER BY code LIMIT 1`,
      [companyId, cashAccountId]
    );
    if (grp.rows[0]) return grp.rows[0];
    // No child group: use the cash account itself if it has children
    const self = await pool.query(
      `SELECT id, code, level, account_type_id FROM accounts WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [companyId, cashAccountId]
    );
    if (self.rows[0]) return self.rows[0];
  }
  return null;
}

/**
 * Auto-create a GL sub-account under the cash parent group for a new cash box.
 */
async function autoCreateCashGlAccount(
  companyId: number,
  name: string,
  nameAr: string | null,
  userId: number | null
): Promise<{ id: number; code: string } | null> {
  const parent = await findCashParentGroup(companyId);
  if (!parent) return null;

  // Generate next code: find max code among children, increment
  const children = await pool.query(
    `SELECT code FROM accounts WHERE company_id = $1 AND parent_id = $2 AND deleted_at IS NULL ORDER BY code DESC LIMIT 1`,
    [companyId, parent.id]
  );

  let nextCode: string;
  if (children.rows.length > 0) {
    const lastCode = children.rows[0].code;
    const numPart = parseInt(lastCode.replace(/\D/g, ''), 10);
    nextCode = String(numPart + 1).padStart(lastCode.length, '0');
  } else {
    // First child: parent code + "0001"
    nextCode = parent.code + '0001';
  }

  const inserted = await pool.query(
    `INSERT INTO accounts (
      company_id, parent_id, account_type_id, code, name, name_ar,
      level, is_group, is_active, allow_posting, normal_balance,
      created_by, updated_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, true, 'debit', $8, $8, NOW(), NOW())
    RETURNING id, code`,
    [companyId, parent.id, parent.account_type_id, nextCode, name, nameAr, parent.level + 1, userId]
  );

  return inserted.rows[0] ?? null;
}

// =============================================
// GET /api/cash-boxes/available-accounts - Available GL accounts for cash boxes
// =============================================
router.get(
  '/available-accounts',
  requireAnyPermission([
    'finance:cash_boxes:view',
    'finance:cash_boxes:create',
    'finance:cash_boxes:edit',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const parent = await findCashParentGroup(companyId);
      if (!parent) {
        return res.json({ success: true, data: [], parent_code: null });
      }

      // Get all posting accounts under the cash parent group
      const result = await pool.query(
        `SELECT a.id, a.code, a.name, a.name_ar,
                CASE WHEN cb.id IS NOT NULL THEN true ELSE false END AS already_linked
         FROM accounts a
         LEFT JOIN cash_boxes cb ON cb.gl_account_id = a.id AND cb.company_id = $1 AND cb.deleted_at IS NULL
         WHERE a.company_id = $1 AND a.parent_id = $2 AND a.allow_posting = true AND a.deleted_at IS NULL
         ORDER BY a.code`,
        [companyId, parent.id]
      );

      return res.json({
        success: true,
        data: result.rows,
        parent_code: parent.code,
      });
    } catch (error) {
      console.error('Error fetching available cash GL accounts:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch available accounts' });
    }
  }
);

// =============================================
// GET /api/cash-boxes - List cash boxes
// =============================================
router.get(
  '/',
  requireAnyPermission([
    'finance:cash_boxes:view',
    'finance:cash_boxes:create',
    'finance:cash_boxes:edit',
    'finance:cash_boxes:delete',
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
           cb.id,
           cb.code,
           cb.name,
           cb.name_ar,
           c.code AS currency_code,
           a.code AS gl_account_code,
           COALESCE(ob.opening_balance, 0) AS opening_balance,
           (COALESCE(ob.opening_balance, 0) + COALESCE(mv.movement_balance, 0)) AS current_balance,
           cb.is_default,
           cb.is_active,
           cb.created_at,
           cb.updated_at
         FROM cash_boxes cb
         JOIN currencies c ON c.id = cb.currency_id AND c.deleted_at IS NULL
         JOIN accounts a ON a.id = cb.gl_account_id AND a.deleted_at IS NULL
         LEFT JOIN ob ON ob.company_id = cb.company_id AND ob.account_id = cb.gl_account_id
         LEFT JOIN mv ON mv.company_id = cb.company_id AND mv.account_id = cb.gl_account_id
         WHERE cb.company_id = $1 AND cb.deleted_at IS NULL
         ORDER BY cb.is_default DESC, cb.code ASC`,
        [companyId]
      );

      return res.json({ success: true, data: result.rows.map(mapRow), total: result.rowCount });
    } catch (error) {
      console.error('Error fetching cash boxes:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch cash boxes' });
    }
  }
);

// =============================================
// POST /api/cash-boxes - Create cash box
// =============================================
router.post(
  '/',
  requireAnyPermission(['finance:cash_boxes:create', 'finance:cash_boxes:edit']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const { code, name, name_ar, gl_account_code, currency_code, is_default = false, is_active = true, notes } =
        req.body || {};

      if (!code || !String(code).trim()) {
        return res.status(400).json({ success: false, error: 'code is required' });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      const cashCode = String(code).trim().toUpperCase();
      const exists = await pool.query(
        `SELECT 1 FROM cash_boxes WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
        [companyId, cashCode]
      );
      if (exists.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Cash box code already exists' });
      }

      let glId: number | null = null;
      let autoCreatedGlCode: string | null = null;

      if (gl_account_code && String(gl_account_code).trim() && String(gl_account_code).trim() !== 'auto') {
        // User provided a specific GL account code — resolve it
        glId = await resolveGlAccountId(companyId, String(gl_account_code));
        if (!glId) {
          return res.status(400).json({ success: false, error: 'Invalid gl_account_code' });
        }
      } else {
        // Auto-create a new GL sub-account under the cash parent group
        const created = await autoCreateCashGlAccount(
          companyId,
          String(name).trim(),
          name_ar ? String(name_ar).trim() : null,
          userId ?? null
        );
        if (!created) {
          return res.status(400).json({
            success: false,
            error: 'Cannot auto-create GL account: no cash parent group found. Please set up a CASH default account first.',
          });
        }
        glId = created.id;
        autoCreatedGlCode = created.code;
      }

      const currencyId =
        (await resolveCurrencyId(companyId, currency_code ? String(currency_code) : undefined)) ||
        (await resolveBaseCurrencyId(companyId));
      if (!currencyId) {
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      if (Boolean(is_default)) {
        await pool.query(
          `UPDATE cash_boxes SET is_default = false, updated_at = NOW() WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true`,
          [companyId]
        );
      }

      const inserted = await pool.query(
        `INSERT INTO cash_boxes (
          company_id,
          code,
          name,
          name_ar,
          currency_id,
          gl_account_id,
          is_default,
          is_active,
          notes,
          created_by,
          updated_by
        )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         RETURNING id`,
        [
          companyId,
          cashCode,
          String(name).trim(),
          name_ar ? String(name_ar).trim() : null,
          currencyId,
          glId,
          Boolean(is_default),
          Boolean(is_active),
          notes ? String(notes).trim() : null,
          userId ?? null,
        ]
      );

      // Return normalized list row shape
      const row = await pool.query(
        `WITH ob AS (
           SELECT
             obl.company_id,
             obl.account_id,
             SUM(COALESCE(obl.debit, 0) - COALESCE(obl.credit, 0))::DECIMAL(18,4) AS opening_balance
           FROM opening_balance_lines obl
           JOIN opening_balance_batches obb
             ON obb.id = obl.batch_id
            AND obb.status = 'posted'
           WHERE obl.company_id = $2
           GROUP BY obl.company_id, obl.account_id
         ), mv AS (
           SELECT
             gl.company_id,
             gl.account_id,
             SUM(COALESCE(gl.debit_amount, 0) - COALESCE(gl.credit_amount, 0))::DECIMAL(18,4) AS movement_balance
           FROM general_ledger gl
           WHERE gl.company_id = $2
           GROUP BY gl.company_id, gl.account_id
         )
         SELECT
           cb.id,
           cb.code,
           cb.name,
           cb.name_ar,
           c.code AS currency_code,
           a.code AS gl_account_code,
           COALESCE(ob.opening_balance, 0) AS opening_balance,
           (COALESCE(ob.opening_balance, 0) + COALESCE(mv.movement_balance, 0)) AS current_balance,
           cb.is_default,
           cb.is_active,
           cb.created_at,
           cb.updated_at
         FROM cash_boxes cb
         JOIN currencies c ON c.id = cb.currency_id AND c.deleted_at IS NULL
         JOIN accounts a ON a.id = cb.gl_account_id AND a.deleted_at IS NULL
         LEFT JOIN ob ON ob.company_id = cb.company_id AND ob.account_id = cb.gl_account_id
         LEFT JOIN mv ON mv.company_id = cb.company_id AND mv.account_id = cb.gl_account_id
         WHERE cb.id = $1 AND cb.company_id = $2 AND cb.deleted_at IS NULL`,
        [inserted.rows[0].id, companyId]
      );

      return res.status(201).json({ success: true, data: mapRow(row.rows[0]) });
    } catch (error: any) {
      console.error('Error creating cash box:', error);
      return res.status(500).json({ success: false, error: 'Failed to create cash box' });
    }
  }
);

// =============================================
// PUT /api/cash-boxes/:id - Update cash box
// =============================================
router.put(
  '/:id',
  requireAnyPermission(['finance:cash_boxes:edit', 'finance:cash_boxes:create']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const { name, name_ar, gl_account_code, currency_code, is_default, is_active, notes } = req.body || {};

      const existing = await pool.query(
        `SELECT is_default FROM cash_boxes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cash box not found' });
      }

      const glId = gl_account_code !== undefined ? await resolveGlAccountId(companyId, String(gl_account_code)) : null;
      if (gl_account_code !== undefined && !glId) {
        return res.status(400).json({ success: false, error: 'Invalid gl_account_code' });
      }

      const currencyId =
        currency_code !== undefined
          ? await resolveCurrencyId(companyId, currency_code ? String(currency_code) : undefined)
          : null;
      if (currency_code !== undefined && !currencyId) {
        return res.status(400).json({ success: false, error: 'Invalid currency_code' });
      }

      if (is_default !== undefined && Boolean(is_default)) {
        await pool.query(
          `UPDATE cash_boxes SET is_default = false, updated_at = NOW() WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true AND id <> $2`,
          [companyId, id]
        );
      }

      await pool.query(
        `UPDATE cash_boxes
         SET
           name = COALESCE($1, name),
           name_ar = COALESCE($2, name_ar),
           gl_account_id = COALESCE($3, gl_account_id),
           currency_id = COALESCE($4, currency_id),
           is_default = COALESCE($5, is_default),
           is_active = COALESCE($6, is_active),
           notes = COALESCE($7, notes),
           updated_by = $8,
           updated_at = NOW()
         WHERE id = $9 AND company_id = $10 AND deleted_at IS NULL`,
        [
          name !== undefined ? String(name).trim() : null,
          name_ar !== undefined ? (name_ar ? String(name_ar).trim() : null) : null,
          gl_account_code !== undefined ? glId : null,
          currency_code !== undefined ? currencyId : null,
          is_default !== undefined ? Boolean(is_default) : null,
          is_active !== undefined ? Boolean(is_active) : null,
          notes !== undefined ? (notes ? String(notes).trim() : null) : null,
          userId ?? null,
          id,
          companyId,
        ]
      );

      const row = await pool.query(
        `WITH ob AS (
           SELECT
             obl.company_id,
             obl.account_id,
             SUM(COALESCE(obl.debit, 0) - COALESCE(obl.credit, 0))::DECIMAL(18,4) AS opening_balance
           FROM opening_balance_lines obl
           JOIN opening_balance_batches obb
             ON obb.id = obl.batch_id
            AND obb.status = 'posted'
           WHERE obl.company_id = $2
           GROUP BY obl.company_id, obl.account_id
         ), mv AS (
           SELECT
             gl.company_id,
             gl.account_id,
             SUM(COALESCE(gl.debit_amount, 0) - COALESCE(gl.credit_amount, 0))::DECIMAL(18,4) AS movement_balance
           FROM general_ledger gl
           WHERE gl.company_id = $2
           GROUP BY gl.company_id, gl.account_id
         )
         SELECT
           cb.id,
           cb.code,
           cb.name,
           cb.name_ar,
           c.code AS currency_code,
           a.code AS gl_account_code,
           COALESCE(ob.opening_balance, 0) AS opening_balance,
           (COALESCE(ob.opening_balance, 0) + COALESCE(mv.movement_balance, 0)) AS current_balance,
           cb.is_default,
           cb.is_active,
           cb.created_at,
           cb.updated_at
         FROM cash_boxes cb
         JOIN currencies c ON c.id = cb.currency_id AND c.deleted_at IS NULL
         JOIN accounts a ON a.id = cb.gl_account_id AND a.deleted_at IS NULL
         LEFT JOIN ob ON ob.company_id = cb.company_id AND ob.account_id = cb.gl_account_id
         LEFT JOIN mv ON mv.company_id = cb.company_id AND mv.account_id = cb.gl_account_id
         WHERE cb.id = $1 AND cb.company_id = $2 AND cb.deleted_at IS NULL`,
        [id, companyId]
      );

      return res.json({ success: true, data: mapRow(row.rows[0]) });
    } catch (error: any) {
      console.error('Error updating cash box:', error);
      return res.status(500).json({ success: false, error: 'Failed to update cash box' });
    }
  }
);

// =============================================
// DELETE /api/cash-boxes/:id - Soft delete
// =============================================
router.delete(
  '/:id',
  requireAnyPermission(['finance:cash_boxes:delete']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const existing = await pool.query(
        `SELECT is_default, gl_account_id FROM cash_boxes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cash box not found' });
      }
      if (existing.rows[0].is_default) {
        return res.status(400).json({ success: false, error: 'Cannot delete default cash box' });
      }

      const glAccountId = Number(existing.rows[0].gl_account_id);
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
          return res.status(409).json({ success: false, error: 'Cannot delete cash box with opening balance' });
        }

        const hasGl = await pool.query(
          `SELECT 1
           FROM general_ledger gl
           WHERE gl.company_id = $1 AND gl.account_id = $2
           LIMIT 1`,
          [companyId, glAccountId]
        );
        if (hasGl.rows.length > 0) {
          return res.status(409).json({ success: false, error: 'Cannot delete cash box with posted movements' });
        }
      }

      await pool.query(
        `UPDATE cash_boxes
         SET deleted_at = NOW(), deleted_by = $1, is_deleted = TRUE, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [userId ?? null, id, companyId]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting cash box:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete cash box' });
    }
  }
);

export default router;
