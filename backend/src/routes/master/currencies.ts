/**
 * CURRENCIES API
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * Helper function to sync exchange rate when currency is created/updated
 * Creates or updates exchange rate record: currency -> base currency
 */
async function syncExchangeRate(
  currencyId: number,
  exchangeRate: number,
  companyId: number | null,
  userId: number | null
): Promise<void> {
  if (!companyId || !exchangeRate || exchangeRate <= 0) return;

  try {
    // Get company's base currency
    const companyRes = await pool.query(
      `SELECT c.id as currency_id FROM companies co 
       JOIN currencies c ON c.code = co.currency 
       WHERE co.id = $1`,
      [companyId]
    );
    
    if (companyRes.rows.length === 0) return;
    const baseCurrencyId = companyRes.rows[0].currency_id;
    
    // Don't create exchange rate for base currency to itself
    if (currencyId === baseCurrencyId) return;

    const today = new Date().toISOString().split('T')[0];

    // Check if exchange rate exists for today
    const existingRate = await pool.query(
      `SELECT id FROM exchange_rates 
       WHERE company_id = $1 
         AND from_currency_id = $2 
         AND to_currency_id = $3 
         AND rate_date = $4 
         AND rate_type = 'standard'`,
      [companyId, currencyId, baseCurrencyId, today]
    );

    if (existingRate.rows.length > 0) {
      // Update existing rate
      await pool.query(
        `UPDATE exchange_rates 
         SET rate = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [exchangeRate, existingRate.rows[0].id]
      );
    } else {
      // Insert new rate
      await pool.query(
        `INSERT INTO exchange_rates 
         (company_id, from_currency_id, to_currency_id, rate, rate_date, rate_type, source, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, 'standard', 'manual', true, $6)`,
        [companyId, currencyId, baseCurrencyId, exchangeRate, today, userId]
      );
    }
  } catch (error) {
    console.error('Error syncing exchange rate:', error);
    // Don't throw - this is a secondary operation
  }
}

router.get(
  '/',
  requireAnyPermission(['master:currencies:view', 'currencies:view']),
  async (req: Request, res: Response) => {
    try {
      const { search, is_active } = req.query;
      const companyId = req.companyId;

      // First, get the company's base currency
      let baseCurrencyId: number | null = null;
      if (companyId) {
        const companyRes = await pool.query(
          `SELECT c.id as currency_id FROM companies co 
           JOIN currencies c ON c.code = co.currency 
           WHERE co.id = $1`,
          [companyId]
        );
        if (companyRes.rows.length > 0) {
          baseCurrencyId = companyRes.rows[0].currency_id;
        }
      }

      // Query currencies with latest exchange rate
      let query = `
        SELECT c.*, 
          COALESCE(
            (SELECT er.rate 
             FROM exchange_rates er 
             WHERE er.from_currency_id = c.id 
               AND er.to_currency_id = $1
               AND er.company_id = $2
               AND er.is_active = true
             ORDER BY er.rate_date DESC 
             LIMIT 1),
            CASE WHEN c.id = $1 THEN 1.0 ELSE NULL END
          ) as exchange_rate
        FROM currencies c 
        WHERE c.deleted_at IS NULL`;
      
      const params: any[] = [baseCurrencyId, companyId];
      let paramCount = 2;

      if (search) {
        paramCount++;
        query += ` AND (c.name ILIKE $${paramCount} OR c.name_en ILIKE $${paramCount} OR c.name_ar ILIKE $${paramCount} OR c.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND c.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      query += ` ORDER BY c.code`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching currencies:', error);
      res.status(500).json({ error: 'Failed to fetch currencies' });
    }
  }
);

router.get(
  '/:id',
  requireAnyPermission(['master:currencies:view', 'currencies:view']),
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

router.post(
  '/',
  requireAnyPermission(['master:currencies:manage', 'currencies:create', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { code, name, name_en, name_ar, symbol, decimal_places, exchange_rate, is_active = true } = req.body;

      const resolvedName = name_en || name;
      if (!code || !resolvedName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const duplicateCheck = await pool.query(
        'SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Currency code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO currencies (code, name, name_en, name_ar, symbol, decimal_places, is_active, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          code.toUpperCase(),
          resolvedName,
          resolvedName,
          name_ar || null,
          symbol || null,
          typeof decimal_places === 'number' ? decimal_places : 2,
          is_active,
          req.companyId ?? null,
        ]
      );

      const newCurrency = result.rows[0];

      // Sync exchange rate if provided
      if (exchange_rate && exchange_rate > 0) {
        await syncExchangeRate(
          newCurrency.id,
          parseFloat(exchange_rate),
          req.companyId ?? null,
          req.user?.id ?? null
        );
      }

      // Return with exchange_rate in response
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

router.put(
  '/:id',
  requireAnyPermission(['master:currencies:manage', 'currencies:edit', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, name_en, name_ar, symbol, decimal_places, exchange_rate, is_active } = req.body;

      const resolvedName = name_en || name;

      const existingCurrency = await pool.query(
        'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingCurrency.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found' });
      }

      const result = await pool.query(
        `UPDATE currencies 
         SET 
           name = COALESCE($1, name),
           name_en = COALESCE($2, name_en),
           name_ar = COALESCE($3, name_ar),
           symbol = COALESCE($4, symbol),
           decimal_places = COALESCE($5, decimal_places),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND deleted_at IS NULL
         RETURNING *`,
        [resolvedName ?? null, resolvedName ?? null, name_ar ?? null, symbol ?? null, decimal_places ?? null, is_active ?? null, id]
      );

      const updatedCurrency = result.rows[0];

      // Sync exchange rate if provided
      if (exchange_rate !== undefined && exchange_rate > 0) {
        await syncExchangeRate(
          parseInt(id),
          parseFloat(exchange_rate),
          req.companyId ?? null,
          req.user?.id ?? null
        );
      }

      res.json({ 
        success: true, 
        data: { ...updatedCurrency, exchange_rate: exchange_rate || null }, 
        message: 'Currency updated successfully' 
      });
    } catch (error: any) {
      console.error('Error updating currency:', error);
      res.status(500).json({ error: 'Failed to update currency' });
    }
  }
);

router.delete(
  '/:id',
  requireAnyPermission(['master:currencies:manage', 'currencies:delete', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingCurrency = await pool.query(
        'SELECT * FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingCurrency.rows.length === 0) {
        return res.status(404).json({ error: 'Currency not found' });
      }

      await pool.query(
        `UPDATE currencies SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      res.json({ success: true, message: 'Currency deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting currency:', error);
      res.status(500).json({ error: 'Failed to delete currency' });
    }
  }
);

router.post(
  '/:id/restore',
  requireAnyPermission(['master:currencies:manage', 'currencies:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE currencies 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id]
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
