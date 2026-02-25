/**
 * 💰 CURRENCIES API (Enterprise Edition)
 * ========================================
 * Full ISO 4217 currency management with:
 *   - Enterprise CRUD (create, read, update, soft-delete, restore)
 *   - Exchange rate sync on create/update
 *   - Base currency enforcement (single true constraint)
 *   - Stats endpoint for dashboard cards
 *   - Filter by status, is_favorite, country_code, decimal_places
 *   - Sort, paginate, search across code/name/name_ar/symbol
 * 
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { dynamicDeletionProtection } from '../../services/referenceIntegrityEngine';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
applyEnhancedAudit(router, 'currencies');

// ─── Helper: Sync exchange rate on create/update ────────────────────────
async function syncExchangeRate(
  currencyId: number,
  exchangeRate: number,
  companyId: number | null,
  userId: number | null
): Promise<void> {
  if (!companyId || !exchangeRate || exchangeRate <= 0) return;

  try {
    const companyRes = await pool.query(
      `SELECT c.id as currency_id FROM companies co 
       JOIN currencies c ON c.code = co.currency 
       WHERE co.id = $1`,
      [companyId]
    );
    if (companyRes.rows.length === 0) return;
    const baseCurrencyId = companyRes.rows[0].currency_id;
    if (currencyId === baseCurrencyId) return;

    const today = new Date().toISOString().split('T')[0];

    const existingRate = await pool.query(
      `SELECT id FROM exchange_rates 
       WHERE company_id = $1 AND from_currency_id = $2 
         AND to_currency_id = $3 AND rate_date = $4 AND rate_type = 'standard'`,
      [companyId, currencyId, baseCurrencyId, today]
    );

    if (existingRate.rows.length > 0) {
      await pool.query(
        `UPDATE exchange_rates SET rate = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [exchangeRate, existingRate.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO exchange_rates 
         (company_id, from_currency_id, to_currency_id, rate, rate_date, rate_type, source, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, 'standard', 'manual', true, $6)`,
        [companyId, currencyId, baseCurrencyId, exchangeRate, today, userId]
      );
    }
  } catch (error) {
    console.error('Error syncing exchange rate:', error);
  }
}

// ─── GET /stats — Stats for dashboard cards ─────────────────────────────
router.get(
  '/stats',
  requireAnyPermission(['master:currencies:view', 'master:currencies:manage', 'currencies:view']),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND (status = 'active' OR (status IS NULL AND is_active = true))) AS active,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND (status = 'inactive' OR (status IS NOT NULL AND status != 'active') OR (status IS NULL AND is_active = false))) AS inactive,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_favorite = true) AS favorites,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND decimal_places = 3) AS three_decimal,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND decimal_places = 0) AS zero_decimal,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_base_currency = true) AS base_currencies
        FROM currencies
      `);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching currency stats:', error);
      res.status(500).json({ error: 'Failed to fetch currency stats' });
    }
  }
);

// ─── GET / — List currencies with search, filter, sort, pagination ──────
router.get(
  '/',
  requireAnyPermission(['master:currencies:view', 'master:currencies:manage', 'currencies:view']),
  async (req: Request, res: Response) => {
    try {
      // Accept both frontend naming (sortBy/limit) and backend naming (sort_field/page_size)
      const { 
        search, status, is_favorite, country_code, decimal_places,
        sort_field, sortBy, sort_order, sortOrder,
        page, page_size, limit, is_active
      } = req.query;
      const companyId = req.companyId;

      const effectiveSortField = (sort_field || sortBy || 'sort_order') as string;
      const effectiveSortOrder = (sort_order || sortOrder || 'asc') as string;
      const effectivePageSize = page_size || limit;

      // Build WHERE clause separately from SELECT
      let whereClause = `WHERE c.deleted_at IS NULL`;
      const params: any[] = [];
      let paramCount = 0;

      // Search
      if (search) {
        paramCount++;
        whereClause += ` AND (c.code ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR c.name_en ILIKE $${paramCount} OR c.name_ar ILIKE $${paramCount} OR c.symbol ILIKE $${paramCount} OR c.numeric_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      // Filters
      if (status) {
        paramCount++;
        whereClause += ` AND c.status = $${paramCount}`;
        params.push(status);
      } else if (is_active !== undefined) {
        paramCount++;
        whereClause += ` AND c.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (is_favorite !== undefined && is_favorite !== '') {
        paramCount++;
        whereClause += ` AND c.is_favorite = $${paramCount}`;
        params.push(is_favorite === 'true');
      }

      if (country_code) {
        paramCount++;
        whereClause += ` AND c.country_code = $${paramCount}`;
        params.push(country_code);
      }

      if (decimal_places !== undefined && decimal_places !== '') {
        paramCount++;
        whereClause += ` AND c.decimal_places = $${paramCount}`;
        params.push(parseInt(decimal_places as string));
      }

      // Count total for pagination (clean query, no subquery issues)
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM currencies c ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Sort — whitelist allowed fields
      const allowedSortFields = ['code', 'name', 'name_en', 'name_ar', 'symbol', 'decimal_places', 'status', 'is_active', 'is_favorite', 'sort_order', 'country_code', 'created_at', 'updated_at', 'numeric_code', 'is_base_currency'];
      const safeSortField = allowedSortFields.includes(effectiveSortField) ? effectiveSortField : 'sort_order';
      const safeSortOrder = effectiveSortOrder === 'desc' ? 'DESC' : 'ASC';

      // Get base currency for exchange rate lookups
      let baseCurrencyId: number | null = null;
      if (companyId) {
        try {
          const companyRes = await pool.query(
            `SELECT cur.id as currency_id FROM companies co 
             JOIN currencies cur ON cur.code = co.currency 
             WHERE co.id = $1`,
            [companyId]
          );
          if (companyRes.rows.length > 0) {
            baseCurrencyId = companyRes.rows[0].currency_id;
          }
        } catch (_) { /* ignore if exchange_rates lookup fails */ }
      }

      // Build data query with optional exchange rate
      let selectFields = 'c.*';
      const dataParams = [...params];
      let dataParamCount = paramCount;

      if (baseCurrencyId && companyId) {
        dataParamCount++;
        const baseCurrParam = dataParamCount;
        dataParamCount++;
        const companyParam = dataParamCount;
        selectFields = `c.*,
          COALESCE(
            (SELECT er.rate FROM exchange_rates er 
             WHERE er.from_currency_id = c.id 
               AND er.to_currency_id = $${baseCurrParam}
               AND er.company_id = $${companyParam}
               AND er.is_active = true
             ORDER BY er.rate_date DESC LIMIT 1),
            CASE WHEN c.id = $${baseCurrParam} THEN 1.0 ELSE NULL END
          ) as exchange_rate`;
        dataParams.push(baseCurrencyId, companyId);
      } else {
        selectFields = `c.*, NULL::numeric as exchange_rate`;
      }

      let dataQuery = `SELECT ${selectFields} FROM currencies c ${whereClause}`;
      dataQuery += ` ORDER BY c.is_favorite DESC NULLS LAST, c.${safeSortField} ${safeSortOrder} NULLS LAST, c.code ASC`;

      // Pagination
      if (page && effectivePageSize) {
        const pgSize = parseInt(effectivePageSize as string);
        const offset = (parseInt(page as string) - 1) * pgSize;
        dataParamCount++;
        dataQuery += ` LIMIT $${dataParamCount}`;
        dataParams.push(pgSize);
        dataParamCount++;
        dataQuery += ` OFFSET $${dataParamCount}`;
        dataParams.push(offset);
      }

      const result = await pool.query(dataQuery, dataParams);

      res.json({ success: true, data: result.rows, total, meta: { page: parseInt(page as string) || 1, limit: parseInt(effectivePageSize as string) || total, total } });
    } catch (error: any) {
      console.error('Error fetching currencies:', error);
      res.status(500).json({ error: 'Failed to fetch currencies' });
    }
  }
);

// ─── GET /:id — Get single currency ────────────────────────────────────
router.get(
  '/:id',
  requireAnyPermission(['master:currencies:view', 'master:currencies:manage', 'currencies:view']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching currency:', error);
      res.status(500).json({ error: 'Failed to fetch currency' });
    }
  }
);

// ─── POST / — Create currency ──────────────────────────────────────────
router.post(
  '/',
  requireAnyPermission(['master:currencies:manage', 'currencies:create', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        code, numeric_code, name, name_en, name_ar, symbol, symbol_position,
        decimal_places, decimal_separator, thousands_separator,
        subunit_en, subunit_ar, subunit_ratio, country_code,
        is_base_currency, exchange_rate, is_active = true, status = 'active',
        is_favorite = false, sort_order
      } = req.body;

      const resolvedName = name_en || name;
      if (!code || !resolvedName) {
        return res.status(400).json({ error: 'Currency code and name are required' });
      }

      // Check duplicate
      const dup = await pool.query(
        'SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [code.toUpperCase()]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: 'Currency code already exists' });
      }

      // If setting as base currency, unset any existing base
      if (is_base_currency) {
        await pool.query(
          `UPDATE currencies SET is_base_currency = false, updated_at = CURRENT_TIMESTAMP 
           WHERE is_base_currency = true AND deleted_at IS NULL`
        );
      }

      const result = await pool.query(
        `INSERT INTO currencies (
          code, numeric_code, name, name_en, name_ar, symbol, symbol_position,
          decimal_places, decimal_separator, thousands_separator,
          subunit_en, subunit_ar, subunit_ratio, country_code,
          is_base_currency, is_active, status, is_favorite, sort_order,
          company_id, created_by, is_global, is_system
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, true, false
        ) RETURNING *`,
        [
          code.toUpperCase(),
          numeric_code || null,
          resolvedName,
          resolvedName,
          name_ar || null,
          symbol || null,
          symbol_position || 'before',
          typeof decimal_places === 'number' ? decimal_places : 2,
          decimal_separator || '.',
          thousands_separator || ',',
          subunit_en || null,
          subunit_ar || null,
          subunit_ratio || 100,
          country_code || null,
          is_base_currency || false,
          is_active,
          status,
          is_favorite,
          sort_order || null,
          req.companyId ?? null,
          req.user?.id ?? null,
        ]
      );

      const newCurrency = result.rows[0];

      // Sync exchange rate
      if (exchange_rate && exchange_rate > 0) {
        await syncExchangeRate(newCurrency.id, parseFloat(exchange_rate), req.companyId ?? null, req.user?.id ?? null);
      }

      res.status(201).json({
        success: true,
        data: { ...newCurrency, exchange_rate: exchange_rate || null },
        message: 'Currency created successfully'
      });
    } catch (error: any) {
      console.error('Error creating currency:', error);
      res.status(500).json({ error: 'Failed to create currency' });
    }
  }
);

// ─── PUT /:id — Update currency ────────────────────────────────────────
router.put(
  '/:id',
  requireAnyPermission(['master:currencies:manage', 'currencies:edit', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name, name_en, name_ar, symbol, symbol_position,
        decimal_places, decimal_separator, thousands_separator,
        subunit_en, subunit_ar, subunit_ratio, country_code, numeric_code,
        is_base_currency, exchange_rate, is_active, status,
        is_favorite, sort_order
      } = req.body;

      const existing = await pool.query(
        'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found' });
      }

      // Protect global system records from modification
      if (existing.rows[0].is_system && existing.rows[0].is_global) {
        return res.status(400).json({ error: 'System currencies cannot be modified. Clone to your company scope first.' });
      }

      const resolvedName = name_en || name;

      // If setting as base currency, unset any existing base (except self)
      if (is_base_currency === true && !existing.rows[0].is_base_currency) {
        await pool.query(
          `UPDATE currencies SET is_base_currency = false, updated_at = CURRENT_TIMESTAMP 
           WHERE is_base_currency = true AND id != $1 AND deleted_at IS NULL`,
          [id]
        );
      }

      const result = await pool.query(
        `UPDATE currencies SET
          name = COALESCE($1, name),
          name_en = COALESCE($2, name_en),
          name_ar = COALESCE($3, name_ar),
          symbol = COALESCE($4, symbol),
          symbol_position = COALESCE($5, symbol_position),
          decimal_places = COALESCE($6, decimal_places),
          decimal_separator = COALESCE($7, decimal_separator),
          thousands_separator = COALESCE($8, thousands_separator),
          subunit_en = COALESCE($9, subunit_en),
          subunit_ar = COALESCE($10, subunit_ar),
          subunit_ratio = COALESCE($11, subunit_ratio),
          country_code = COALESCE($12, country_code),
          numeric_code = COALESCE($13, numeric_code),
          is_base_currency = COALESCE($14, is_base_currency),
          is_active = COALESCE($15, is_active),
          status = COALESCE($16, status),
          is_favorite = COALESCE($17, is_favorite),
          sort_order = COALESCE($18, sort_order),
          updated_by = $19,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $20 AND deleted_at IS NULL
        RETURNING *`,
        [
          resolvedName ?? null,
          resolvedName ?? null,
          name_ar ?? null,
          symbol ?? null,
          symbol_position ?? null,
          decimal_places ?? null,
          decimal_separator ?? null,
          thousands_separator ?? null,
          subunit_en ?? null,
          subunit_ar ?? null,
          subunit_ratio ?? null,
          country_code ?? null,
          numeric_code ?? null,
          is_base_currency ?? null,
          is_active ?? null,
          status ?? null,
          is_favorite ?? null,
          sort_order ?? null,
          req.user?.id ?? null,
          id,
        ]
      );

      const updated = result.rows[0];

      // Sync exchange rate
      if (exchange_rate !== undefined && exchange_rate > 0) {
        await syncExchangeRate(parseInt(id), parseFloat(exchange_rate), req.companyId ?? null, req.user?.id ?? null);
      }

      res.json({
        success: true,
        data: { ...updated, exchange_rate: exchange_rate || null },
        message: 'Currency updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating currency:', error);
      res.status(500).json({ error: 'Failed to update currency' });
    }
  }
);

// ─── DELETE /:id — Soft delete currency ────────────────────────────────
router.delete(
  '/:id',
  requireAnyPermission(['master:currencies:manage', 'currencies:delete', 'currencies:manage']),
  dynamicDeletionProtection('currencies'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Prevent deleting base currency or system records
      const check = await pool.query(
        'SELECT is_base_currency, is_system, is_global FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      if (check.rows[0].is_system && check.rows[0].is_global) {
        return res.status(400).json({ error: 'System currencies cannot be deleted. Clone to your company scope first.' });
      }
      if (check.rows[0].is_base_currency) {
        return res.status(400).json({ error: 'Cannot delete the base currency. Change the base currency first.' });
      }

      await pool.query(
        `UPDATE currencies SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2`,
        [req.user?.id ?? null, id]
      );

      res.json({ success: true, message: 'Currency deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting currency:', error);
      res.status(500).json({ error: 'Failed to delete currency' });
    }
  }
);

// ─── POST /:id/restore — Restore soft-deleted currency ─────────────────
router.post(
  '/:id/restore',
  requireAnyPermission(['master:currencies:manage', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE currencies 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = $2 AND deleted_at IS NOT NULL
         RETURNING *`,
        [req.user?.id ?? null, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found or already active' });
      }
      res.json({ success: true, data: result.rows[0], message: 'Currency restored successfully' });
    } catch (error: any) {
      console.error('Error restoring currency:', error);
      res.status(500).json({ error: 'Failed to restore currency' });
    }
  }
);

export default router;
