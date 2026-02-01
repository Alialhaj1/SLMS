import { Router } from 'express';
import { z } from 'zod';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext, requireCompany } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { auditLog, captureBeforeState } from '../../middleware/auditLog';

const router = Router();

const currencyCreateSchema = z.object({
  code: z.string().trim().min(3).max(3),
  name: z.string().trim().min(1).max(100),
  symbol: z.string().trim().min(0).max(10).optional().nullable(),
  decimal_places: z.number().int().min(0).max(6).optional(),
  is_base_currency: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

type CurrencyCreateInput = z.infer<typeof currencyCreateSchema>;

const currencyUpdateSchema = currencyCreateSchema.partial();

type CurrencyUpdateInput = z.infer<typeof currencyUpdateSchema>;

async function hasCompanyTransactions(companyId: number): Promise<boolean> {
  // Minimal enforcement: journals exist => base currency locked
  const result = await pool.query(
    'SELECT EXISTS(SELECT 1 FROM journal_entries WHERE company_id = $1 LIMIT 1) AS has_any',
    [companyId]
  );
  return Boolean(result.rows?.[0]?.has_any);
}

async function ensureCompanyCurrencies(companyId: number, userId?: number | null): Promise<void> {
  // If the company already has currencies, do nothing.
  const existing = await pool.query(
    'SELECT 1 FROM currencies WHERE company_id = $1 AND deleted_at IS NULL LIMIT 1',
    [companyId]
  );
  if (existing.rows.length > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Re-check inside transaction to avoid races.
    const stillEmpty = await client.query(
      'SELECT 1 FROM currencies WHERE company_id = $1 AND deleted_at IS NULL LIMIT 1',
      [companyId]
    );
    if (stillEmpty.rows.length > 0) {
      await client.query('COMMIT');
      return;
    }

    // Clone the global currency list into this company scope.
    await client.query(
      `INSERT INTO currencies (
          company_id,
          code,
          name,
          name_en,
          name_ar,
          symbol,
          decimal_places,
          subunit_en,
          subunit_ar,
          is_active,
          sort_order,
          symbol_position,
          is_base_currency,
          created_by,
          updated_by
        )
        SELECT
          $1,
          g.code,
          g.name,
          g.name_en,
          g.name_ar,
          g.symbol,
          g.decimal_places,
          g.subunit_en,
          g.subunit_ar,
          g.is_active,
          g.sort_order,
          g.symbol_position,
          FALSE,
          $2,
          $2
        FROM currencies g
        WHERE g.company_id IS NULL AND g.deleted_at IS NULL
        ON CONFLICT DO NOTHING`,
      [companyId, userId ?? null]
    );

    // If the company has no base currency yet, set it based on companies.currency.
    await client.query(
      `UPDATE currencies
       SET is_base_currency = TRUE,
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE company_id = $1
         AND deleted_at IS NULL
         AND code = (SELECT currency FROM companies WHERE id = $1 AND deleted_at IS NULL)
         AND NOT EXISTS (
           SELECT 1 FROM currencies b
           WHERE b.company_id = $1 AND b.deleted_at IS NULL AND b.is_base_currency = TRUE
         )`,
      [companyId, userId ?? null]
    );

    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    throw new Error('Failed to initialize company currencies');
  } finally {
    client.release();
  }
}

router.use(authenticate);
router.use(loadCompanyContext);
router.use(requireCompany);

router.get('/', requirePermission('settings:currency:view'), async (req, res) => {
  const companyId = req.companyId as number;
  await ensureCompanyCurrencies(companyId, req.user?.id ?? null);

  const [currenciesResult, locked] = await Promise.all([
    pool.query(
      `SELECT id, code, name, symbol, decimal_places, is_base_currency, is_active,
              created_at, updated_at
       FROM currencies
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY is_base_currency DESC, code ASC`,
      [companyId]
    ),
    hasCompanyTransactions(companyId),
  ]);

  return res.json({
    success: true,
    data: currenciesResult.rows,
    meta: {
      baseCurrencyLocked: locked,
    },
  });
});

router.post('/', requirePermission('settings:currency:create'), auditLog, async (req, res) => {
  const companyId = req.companyId as number;
  const userId = req.user?.id;

  let input: CurrencyCreateInput;
  try {
    input = currencyCreateSchema.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid currency data' });
  }

  const code = input.code.toUpperCase();
  const isBase = Boolean(input.is_base_currency);
  const isActive = input.is_active ?? true;
  const decimalPlaces = input.decimal_places ?? 2;

  const locked = await hasCompanyTransactions(companyId);
  if (isBase && locked) {
    const existingBase = await pool.query(
      `SELECT id, code FROM currencies
       WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE
       LIMIT 1`,
      [companyId]
    );

    if (existingBase.rows.length > 0) {
      return res.status(409).json({ error: 'Base currency is locked after transactions exist' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Unset current base if setting a new base (only allowed when unlocked)
    if (isBase) {
      await client.query(
        `UPDATE currencies
         SET is_base_currency = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE`,
        [companyId, userId ?? null]
      );
    }

    const insertResult = await client.query(
      `INSERT INTO currencies (company_id, code, name, symbol, decimal_places, is_base_currency, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING id, code, name, symbol, decimal_places, is_base_currency, is_active, created_at, updated_at`,
      [companyId, code, input.name, input.symbol ?? null, decimalPlaces, isBase, isActive, userId ?? null]
    );

    if (isBase) {
      await client.query(
        `UPDATE companies
         SET currency = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
         WHERE id = $1 AND deleted_at IS NULL`,
        [companyId, code, userId ?? null]
      );
    }

    await client.query('COMMIT');

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: insertResult.rows[0],
    };

    return res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (String(error?.code) === '23505') {
      return res.status(409).json({ error: 'Currency code already exists' });
    }

    return res.status(500).json({ error: 'Failed to create currency' });
  } finally {
    client.release();
  }
});

router.put(
  '/:id',
  requirePermission('settings:currency:update'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const currencyId = Number(req.params.id);

    if (!Number.isFinite(currencyId)) {
      return res.status(400).json({ error: 'Invalid currency ID' });
    }

    let input: CurrencyUpdateInput;
    try {
      input = currencyUpdateSchema.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid currency data' });
    }

    const existing = await pool.query(
      `SELECT id, code, is_base_currency, is_active
       FROM currencies
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [currencyId, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const current = existing.rows[0];
    const locked = await hasCompanyTransactions(companyId);

    const wantsBaseTrue = input.is_base_currency === true;
    const wantsBaseFalse = input.is_base_currency === false;

    if (locked) {
      if (wantsBaseTrue && !current.is_base_currency) {
        return res.status(409).json({ error: 'Base currency is locked after transactions exist' });
      }
      if (wantsBaseFalse && current.is_base_currency) {
        return res.status(409).json({ error: 'Base currency cannot be unset after transactions exist' });
      }
      if (input.code && input.code.toUpperCase() !== String(current.code).toUpperCase() && current.is_base_currency) {
        return res.status(409).json({ error: 'Base currency code cannot be changed after transactions exist' });
      }
      if (input.is_active === false && current.is_base_currency) {
        return res.status(409).json({ error: 'Base currency cannot be deactivated after transactions exist' });
      }
    }

    const nextCode = input.code ? input.code.toUpperCase() : undefined;

    await captureBeforeState(req as any, 'currencies', currencyId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (wantsBaseTrue) {
        await client.query(
          `UPDATE currencies
           SET is_base_currency = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
           WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE`,
          [companyId, userId ?? null]
        );
      }

      const updateResult = await client.query(
        `UPDATE currencies
         SET code = COALESCE($3, code),
             name = COALESCE($4, name),
             symbol = COALESCE($5, symbol),
             decimal_places = COALESCE($6, decimal_places),
             is_base_currency = COALESCE($7, is_base_currency),
             is_active = COALESCE($8, is_active),
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $2
         WHERE id = $9 AND company_id = $1 AND deleted_at IS NULL
         RETURNING id, code, name, symbol, decimal_places, is_base_currency, is_active, created_at, updated_at`,
        [
          companyId,
          userId ?? null,
          nextCode ?? null,
          input.name ?? null,
          input.symbol ?? null,
          input.decimal_places ?? null,
          input.is_base_currency ?? null,
          input.is_active ?? null,
          currencyId,
        ]
      );

      if (updateResult.rows?.[0]?.is_base_currency) {
        await client.query(
          `UPDATE companies
           SET currency = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
           WHERE id = $1 AND deleted_at IS NULL`,
          [companyId, updateResult.rows[0].code, userId ?? null]
        );
      }

      await client.query('COMMIT');

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: updateResult.rows[0],
      };

      return res.json({ success: true, data: updateResult.rows[0] });
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (String(error?.code) === '23505') {
        return res.status(409).json({ error: 'Currency code already exists' });
      }

      return res.status(500).json({ error: 'Failed to update currency' });
    } finally {
      client.release();
    }
  }
);

router.delete(
  '/:id',
  requirePermission('settings:currency:delete'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const currencyId = Number(req.params.id);

    if (!Number.isFinite(currencyId)) {
      return res.status(400).json({ error: 'Invalid currency ID' });
    }

    const existing = await pool.query(
      `SELECT id, is_base_currency
       FROM currencies
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [currencyId, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const locked = await hasCompanyTransactions(companyId);
    if (locked && existing.rows[0].is_base_currency) {
      return res.status(409).json({ error: 'Base currency cannot be deleted after transactions exist' });
    }

    // Prevent deletion if referenced by journal entries
    const referenced = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM journal_entries WHERE company_id = $1 AND currency_id = $2 LIMIT 1) AS has_any',
      [companyId, currencyId]
    );

    if (Boolean(referenced.rows?.[0]?.has_any)) {
      return res.status(409).json({ error: 'Currency is in use and cannot be deleted' });
    }

    await captureBeforeState(req as any, 'currencies', currencyId);

    const deleted = await pool.query(
      `UPDATE currencies
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [currencyId, companyId, userId ?? null]
    );

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: { deleted: true, id: currencyId, company_id: companyId },
    };

    return res.json({ success: true });
  }
);

router.post(
  '/:id/set-base',
  requirePermission('settings:currency:update'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const currencyId = Number(req.params.id);

    if (!Number.isFinite(currencyId)) {
      return res.status(400).json({ error: 'Invalid currency ID' });
    }

    const locked = await hasCompanyTransactions(companyId);
    if (locked) {
      return res.status(409).json({ error: 'Base currency is locked after transactions exist' });
    }

    await captureBeforeState(req as any, 'currencies', currencyId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id FROM currencies
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [currencyId, companyId]
      );

      if (exists.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Currency not found' });
      }

      await client.query(
        `UPDATE currencies
         SET is_base_currency = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE company_id = $1 AND deleted_at IS NULL AND is_base_currency = TRUE`,
        [companyId, userId ?? null]
      );

      await client.query(
        `UPDATE currencies
         SET is_base_currency = TRUE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP, updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [currencyId, companyId, userId ?? null]
      );

      const baseCode = await client.query(
        'SELECT code FROM currencies WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [currencyId, companyId]
      );

      if (baseCode.rows.length > 0) {
        await client.query(
          `UPDATE companies
           SET currency = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
           WHERE id = $1 AND deleted_at IS NULL`,
          [companyId, baseCode.rows[0].code, userId ?? null]
        );
      }

      await client.query('COMMIT');

      const after = await pool.query(
        `SELECT id, code, name, symbol, decimal_places, is_base_currency, is_active, created_at, updated_at
         FROM currencies
         WHERE id = $1 AND company_id = $2`,
        [currencyId, companyId]
      );

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: after.rows?.[0] || { id: currencyId, company_id: companyId, is_base_currency: true },
      };

      return res.json({ success: true });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to set base currency' });
    } finally {
      client.release();
    }
  }
);

export default router;
