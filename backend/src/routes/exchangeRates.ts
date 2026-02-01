/**
 * Exchange Rates Routes
 * =====================
 * CRUD operations for managing exchange rates between currencies.
 * Supports manual rates and API-synced rates.
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';

const router = express.Router();

// ============================================
// Validation Schemas
// ============================================

const exchangeRateCreateSchema = z.object({
  from_currency_id: z.number().int().positive('From currency is required'),
  to_currency_id: z.number().int().positive('To currency is required'),
  rate: z.number().positive('Rate must be positive'),
  rate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  rate_type: z.enum(['standard', 'buying', 'selling', 'customs']).default('standard'),
  source: z.enum(['manual', 'central_bank', 'api', 'ecb', 'openexchangerates']).default('manual'),
  is_active: z.boolean().default(true),
});

const exchangeRateUpdateSchema = exchangeRateCreateSchema.partial();

// ============================================
// Helper Functions
// ============================================

/**
 * Get exchange rate for a specific date and currency pair
 */
async function getExchangeRate(
  companyId: number,
  fromCurrencyId: number,
  toCurrencyId: number,
  date: string,
  rateType: string = 'standard'
): Promise<number | null> {
  // First try to get manual rate (priority)
  const manualRate = await pool.query(
    `SELECT rate FROM exchange_rates 
     WHERE company_id = $1 
       AND from_currency_id = $2 
       AND to_currency_id = $3 
       AND rate_date <= $4 
       AND rate_type = $5
       AND source = 'manual'
       AND is_active = true
       AND deleted_at IS NULL
     ORDER BY rate_date DESC 
     LIMIT 1`,
    [companyId, fromCurrencyId, toCurrencyId, date, rateType]
  );

  if (manualRate.rows.length > 0) {
    return parseFloat(manualRate.rows[0].rate);
  }

  // Fall back to API rate
  const apiRate = await pool.query(
    `SELECT rate FROM exchange_rates 
     WHERE company_id = $1 
       AND from_currency_id = $2 
       AND to_currency_id = $3 
       AND rate_date <= $4 
       AND rate_type = $5
       AND is_active = true
       AND deleted_at IS NULL
     ORDER BY rate_date DESC 
     LIMIT 1`,
    [companyId, fromCurrencyId, toCurrencyId, date, rateType]
  );

  return apiRate.rows.length > 0 ? parseFloat(apiRate.rows[0].rate) : null;
}

// ============================================
// Routes
// ============================================

/**
 * @route   GET /api/exchange-rates
 * @desc    Get all exchange rates with optional filters
 * @access  Private (exchange_rates:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { 
        from_currency_id, 
        to_currency_id, 
        rate_type, 
        source,
        date_from,
        date_to,
        is_active,
        page = '1', 
        limit = '50' 
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE clause
      const conditions: string[] = ['er.company_id = $1', 'er.deleted_at IS NULL'];
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (from_currency_id) {
        conditions.push(`er.from_currency_id = $${paramIndex++}`);
        params.push(parseInt(from_currency_id as string, 10));
      }

      if (to_currency_id) {
        conditions.push(`er.to_currency_id = $${paramIndex++}`);
        params.push(parseInt(to_currency_id as string, 10));
      }

      if (rate_type) {
        conditions.push(`er.rate_type = $${paramIndex++}`);
        params.push(rate_type);
      }

      if (source) {
        conditions.push(`er.source = $${paramIndex++}`);
        params.push(source);
      }

      if (date_from) {
        conditions.push(`er.rate_date >= $${paramIndex++}`);
        params.push(date_from);
      }

      if (date_to) {
        conditions.push(`er.rate_date <= $${paramIndex++}`);
        params.push(date_to);
      }

      if (is_active !== undefined) {
        conditions.push(`er.is_active = $${paramIndex++}`);
        params.push(is_active === 'true');
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int as total FROM exchange_rates er WHERE ${whereClause}`,
        params
      );
      const total = countResult.rows[0].total;

      // Get paginated data
      const result = await pool.query(
        `SELECT 
           er.id,
           er.company_id,
           er.from_currency_id,
           fc.code as from_currency_code,
           fc.name as from_currency_name,
           fc.name_ar as from_currency_name_ar,
           fc.symbol as from_currency_symbol,
           er.to_currency_id,
           tc.code as to_currency_code,
           tc.name as to_currency_name,
           tc.name_ar as to_currency_name_ar,
           tc.symbol as to_currency_symbol,
           er.rate,
           er.rate_date,
           er.rate_type,
           er.source,
           er.is_active,
           er.created_by,
           u.email as created_by_email,
           er.created_at,
           er.updated_at
         FROM exchange_rates er
         LEFT JOIN currencies fc ON fc.id = er.from_currency_id
         LEFT JOIN currencies tc ON tc.id = er.to_currency_id
         LEFT JOIN users u ON u.id = er.created_by
         WHERE ${whereClause}
         ORDER BY er.rate_date DESC, er.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limitNum, offset]
      );

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch exchange rates' },
      });
    }
  }
);

/**
 * @route   GET /api/exchange-rates/convert
 * @desc    Convert amount between currencies using latest rate
 * @access  Private (exchange_rates:view)
 */
router.get(
  '/convert',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { 
        from_currency_id, 
        to_currency_id, 
        amount,
        date,
        rate_type = 'standard'
      } = req.query;

      if (!from_currency_id || !to_currency_id || !amount) {
        return res.status(400).json({
          success: false,
          error: { message: 'from_currency_id, to_currency_id, and amount are required' },
        });
      }

      const fromId = parseInt(from_currency_id as string, 10);
      const toId = parseInt(to_currency_id as string, 10);
      const amountNum = parseFloat(amount as string);
      const rateDate = (date as string) || new Date().toISOString().split('T')[0];

      // Same currency - no conversion needed
      if (fromId === toId) {
        return res.json({
          success: true,
          data: {
            from_amount: amountNum,
            to_amount: amountNum,
            rate: 1,
            rate_date: rateDate,
          },
        });
      }

      const rate = await getExchangeRate(companyId, fromId, toId, rateDate, rate_type as string);

      if (!rate) {
        // Try reverse rate
        const reverseRate = await getExchangeRate(companyId, toId, fromId, rateDate, rate_type as string);
        if (reverseRate) {
          const convertedAmount = amountNum / reverseRate;
          return res.json({
            success: true,
            data: {
              from_amount: amountNum,
              to_amount: Math.round(convertedAmount * 100) / 100,
              rate: 1 / reverseRate,
              rate_date: rateDate,
              note: 'Using reverse rate',
            },
          });
        }

        return res.status(404).json({
          success: false,
          error: { message: 'No exchange rate found for this currency pair and date' },
        });
      }

      const convertedAmount = amountNum * rate;

      return res.json({
        success: true,
        data: {
          from_amount: amountNum,
          to_amount: Math.round(convertedAmount * 100) / 100,
          rate,
          rate_date: rateDate,
        },
      });
    } catch (error) {
      console.error('Error converting currency:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'CONVERT_ERROR', message: 'Failed to convert currency' },
      });
    }
  }
);

/**
 * @route   GET /api/exchange-rates/:id
 * @desc    Get single exchange rate by ID
 * @access  Private (exchange_rates:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { id } = req.params;
      const rateId = parseInt(id, 10);

      if (Number.isNaN(rateId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid ID' },
        });
      }

      const result = await pool.query(
        `SELECT 
           er.id,
           er.company_id,
           er.from_currency_id,
           fc.code as from_currency_code,
           fc.name as from_currency_name,
           fc.name_ar as from_currency_name_ar,
           fc.symbol as from_currency_symbol,
           er.to_currency_id,
           tc.code as to_currency_code,
           tc.name as to_currency_name,
           tc.name_ar as to_currency_name_ar,
           tc.symbol as to_currency_symbol,
           er.rate,
           er.rate_date,
           er.rate_type,
           er.source,
           er.is_active,
           er.created_by,
           u.email as created_by_email,
           er.created_at,
           er.updated_at
         FROM exchange_rates er
         LEFT JOIN currencies fc ON fc.id = er.from_currency_id
         LEFT JOIN currencies tc ON tc.id = er.to_currency_id
         LEFT JOIN users u ON u.id = er.created_by
         WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL`,
        [rateId, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Exchange rate not found' },
        });
      }

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch exchange rate' },
      });
    }
  }
);

/**
 * @route   POST /api/exchange-rates
 * @desc    Create new exchange rate
 * @access  Private (exchange_rates:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = (req as any).user?.id ?? null;
      const payload = exchangeRateCreateSchema.parse(req.body);

      // Validate currencies exist
      const fromCurrency = await pool.query(
        'SELECT id, code FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [payload.from_currency_id]
      );
      if (fromCurrency.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'From currency not found' },
        });
      }

      const toCurrency = await pool.query(
        'SELECT id, code FROM currencies WHERE id = $1 AND deleted_at IS NULL',
        [payload.to_currency_id]
      );
      if (toCurrency.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'To currency not found' },
        });
      }

      // Check same currency
      if (payload.from_currency_id === payload.to_currency_id) {
        return res.status(400).json({
          success: false,
          error: { message: 'From and To currencies must be different' },
        });
      }

      // Check for duplicate (same currency pair + date + type)
      const existingRate = await pool.query(
        `SELECT id FROM exchange_rates 
         WHERE company_id = $1 
           AND from_currency_id = $2 
           AND to_currency_id = $3 
           AND rate_date = $4 
           AND rate_type = $5
           AND deleted_at IS NULL`,
        [companyId, payload.from_currency_id, payload.to_currency_id, payload.rate_date, payload.rate_type]
      );

      if (existingRate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Exchange rate already exists for this currency pair, date, and type',
            existing_id: existingRate.rows[0].id,
          },
        });
      }

      // Insert new rate
      const result = await pool.query(
        `INSERT INTO exchange_rates (
           company_id, from_currency_id, to_currency_id, rate, rate_date, 
           rate_type, source, is_active, created_by, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING id, company_id, from_currency_id, to_currency_id, rate, 
                   rate_date, rate_type, source, is_active, created_at`,
        [
          companyId,
          payload.from_currency_id,
          payload.to_currency_id,
          payload.rate,
          payload.rate_date,
          payload.rate_type,
          payload.source,
          payload.is_active,
          userId,
        ]
      );

      // Audit log
      (req as any).auditContext = {
        action: 'create',
        resource: 'exchange_rates',
        resourceId: result.rows[0].id,
        after: result.rows[0],
      };

      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Exchange rate created successfully',
      });
    } catch (error: any) {
      console.error('Error creating exchange rate:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: 'Failed to create exchange rate' },
      });
    }
  }
);

/**
 * @route   PUT /api/exchange-rates/:id
 * @desc    Update exchange rate
 * @access  Private (exchange_rates:update)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:update'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = (req as any).user?.id ?? null;
      const { id } = req.params;
      const rateId = parseInt(id, 10);

      if (Number.isNaN(rateId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid ID' },
        });
      }

      // Check if rate exists
      const existing = await pool.query(
        'SELECT * FROM exchange_rates WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [rateId, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Exchange rate not found' },
        });
      }

      await captureBeforeState(req as any, 'exchange_rates', rateId);

      const payload = exchangeRateUpdateSchema.parse(req.body);

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (payload.from_currency_id !== undefined) {
        updates.push(`from_currency_id = $${paramIndex++}`);
        values.push(payload.from_currency_id);
      }
      if (payload.to_currency_id !== undefined) {
        updates.push(`to_currency_id = $${paramIndex++}`);
        values.push(payload.to_currency_id);
      }
      if (payload.rate !== undefined) {
        updates.push(`rate = $${paramIndex++}`);
        values.push(payload.rate);
      }
      if (payload.rate_date !== undefined) {
        updates.push(`rate_date = $${paramIndex++}`);
        values.push(payload.rate_date);
      }
      if (payload.rate_type !== undefined) {
        updates.push(`rate_type = $${paramIndex++}`);
        values.push(payload.rate_type);
      }
      if (payload.source !== undefined) {
        updates.push(`source = $${paramIndex++}`);
        values.push(payload.source);
      }
      if (payload.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(payload.is_active);
      }

      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(rateId, companyId);

      const result = await pool.query(
        `UPDATE exchange_rates 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: result.rows[0],
      };

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Exchange rate updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating exchange rate:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update exchange rate' },
      });
    }
  }
);

/**
 * @route   DELETE /api/exchange-rates/:id
 * @desc    Soft delete exchange rate
 * @access  Private (exchange_rates:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = (req as any).user?.id ?? null;
      const { id } = req.params;
      const rateId = parseInt(id, 10);

      if (Number.isNaN(rateId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid ID' },
        });
      }

      await captureBeforeState(req as any, 'exchange_rates', rateId);

      const result = await pool.query(
        `UPDATE exchange_rates 
         SET deleted_at = CURRENT_TIMESTAMP, 
             updated_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [userId, rateId, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Exchange rate not found' },
        });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        action: 'delete',
      };

      return res.json({
        success: true,
        message: 'Exchange rate deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting exchange rate:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: 'Failed to delete exchange rate' },
      });
    }
  }
);

/**
 * @route   POST /api/exchange-rates/sync
 * @desc    Sync exchange rates from external API
 * @access  Private (exchange_rates:sync_api)
 */
router.post(
  '/sync',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:sync_api'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = (req as any).user?.id ?? null;
      const { base_currency_code = 'USD', target_currencies } = req.body;

      // Get base currency
      const baseCurrency = await pool.query(
        'SELECT id, code FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [base_currency_code]
      );

      if (baseCurrency.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: `Base currency ${base_currency_code} not found` },
        });
      }

      // Get target currencies (or all active currencies)
      let targetCurrenciesQuery = 'SELECT id, code FROM currencies WHERE deleted_at IS NULL AND is_active = true';
      const targetParams: any[] = [];

      if (target_currencies && Array.isArray(target_currencies) && target_currencies.length > 0) {
        targetCurrenciesQuery += ` AND code = ANY($1)`;
        targetParams.push(target_currencies);
      }

      const currencies = await pool.query(targetCurrenciesQuery, targetParams);

      if (currencies.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'No target currencies found' },
        });
      }

      // In a real implementation, you would call an external API here
      // For now, we'll return a placeholder response
      const today = new Date().toISOString().split('T')[0];
      const syncedRates: any[] = [];
      const errors: any[] = [];

      // Simulate API rates (in production, replace with actual API call)
      const mockApiRates: Record<string, number> = {
        'SAR': 3.75,
        'EUR': 0.92,
        'GBP': 0.79,
        'AED': 3.67,
        'EGP': 30.90,
        'JPY': 149.50,
        'CNY': 7.24,
      };

      for (const currency of currencies.rows) {
        if (currency.code === base_currency_code) continue;

        try {
          const rate = mockApiRates[currency.code] || 1;

          // Check if rate already exists for today
          const existing = await pool.query(
            `SELECT id FROM exchange_rates 
             WHERE company_id = $1 
               AND from_currency_id = $2 
               AND to_currency_id = $3 
               AND rate_date = $4 
               AND source != 'manual'
               AND deleted_at IS NULL`,
            [companyId, baseCurrency.rows[0].id, currency.id, today]
          );

          if (existing.rows.length > 0) {
            // Update existing rate
            await pool.query(
              `UPDATE exchange_rates 
               SET rate = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
               WHERE id = $3`,
              [rate, userId, existing.rows[0].id]
            );
            syncedRates.push({ currency: currency.code, rate, action: 'updated' });
          } else {
            // Insert new rate
            await pool.query(
              `INSERT INTO exchange_rates (
                 company_id, from_currency_id, to_currency_id, rate, rate_date,
                 rate_type, source, is_active, created_by
               ) VALUES ($1, $2, $3, $4, $5, 'standard', 'api', true, $6)`,
              [companyId, baseCurrency.rows[0].id, currency.id, rate, today, userId]
            );
            syncedRates.push({ currency: currency.code, rate, action: 'created' });
          }
        } catch (err: any) {
          errors.push({ currency: currency.code, error: err.message });
        }
      }

      return res.json({
        success: true,
        data: {
          synced: syncedRates,
          errors,
          sync_date: today,
          base_currency: base_currency_code,
        },
        message: `Synced ${syncedRates.length} exchange rates`,
      });
    } catch (error) {
      console.error('Error syncing exchange rates:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: 'Failed to sync exchange rates' },
      });
    }
  }
);

/**
 * @route   GET /api/exchange-rates/rate-for-company/:currency_code
 * @desc    Get exchange rate from company's base currency to specified foreign currency
 * @access  Private (exchange_rates:view)
 * @example GET /api/exchange-rates/rate-for-company/USD
 */
router.get(
  '/rate-for-company/:currency_code',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { currency_code } = req.params;
      const { rate_type = 'standard', date } = req.query;
      const rateDate = (date as string) || new Date().toISOString().split('T')[0];

      // 1. Get company's base currency
      const companyResult = await pool.query(
        'SELECT currency FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Company not found' },
        });
      }

      const baseCurrencyCode = companyResult.rows[0].currency || 'SAR';

      // 2. If same currency, return rate = 1
      if (baseCurrencyCode.toUpperCase() === currency_code.toUpperCase()) {
        return res.json({
          success: true,
          data: {
            rate: 1,
            from_currency_code: baseCurrencyCode,
            to_currency_code: currency_code.toUpperCase(),
            rate_date: rateDate,
            is_base_currency: true,
          },
        });
      }

      // 3. Get currency IDs
      const baseCurrency = await pool.query(
        'SELECT id, code, symbol, name, name_ar FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [baseCurrencyCode.toUpperCase()]
      );
      const foreignCurrency = await pool.query(
        'SELECT id, code, symbol, name, name_ar FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [currency_code.toUpperCase()]
      );

      if (baseCurrency.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: `Base currency ${baseCurrencyCode} not found` },
        });
      }

      if (foreignCurrency.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: `Currency ${currency_code} not found` },
        });
      }

      const baseCurrencyId = baseCurrency.rows[0].id;
      const foreignCurrencyId = foreignCurrency.rows[0].id;

      console.log(`[Exchange Rate Lookup] Looking for rate of ${currency_code} against base currency ${baseCurrencyCode}`);

      // 4. FIRST: Try to find rate stored as: base -> foreign (SAR -> USD = 3.757)
      //    This means: "How much base currency (SAR) equals 1 foreign currency (USD)"
      //    Example: SAR -> USD = 3.757 means 1 USD = 3.757 SAR
      const baseToForeignRate = await pool.query(
        `SELECT rate, rate_date, source, rate_type
         FROM exchange_rates 
         WHERE company_id = $1 
           AND from_currency_id = $2 
           AND to_currency_id = $3 
           AND rate_date <= $4 
           AND rate_type = $5
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY rate_date DESC 
         LIMIT 1`,
        [companyId, baseCurrencyId, foreignCurrencyId, rateDate, rate_type]
      );

      if (baseToForeignRate.rows.length > 0) {
        // Rate stored as SAR -> USD = 3.757, return directly as 1 USD = 3.757 SAR
        const rate = parseFloat(baseToForeignRate.rows[0].rate);
        console.log(`[Exchange Rate] Found base→foreign rate (${baseCurrencyCode}→${currency_code}): ${rate}`);
        return res.json({
          success: true,
          data: {
            rate: rate,
            from_currency_code: currency_code.toUpperCase(),
            from_currency: foreignCurrency.rows[0],
            to_currency_code: baseCurrencyCode,
            to_currency: baseCurrency.rows[0],
            rate_date: baseToForeignRate.rows[0].rate_date,
            rate_type: baseToForeignRate.rows[0].rate_type,
            source: baseToForeignRate.rows[0].source,
            is_reverse: false,
          },
        });
      }

      // 5. SECOND: Try to find rate stored as: foreign -> base (USD -> SAR = 3.757)
      //    This is an alternative entry format
      const foreignToBaseRate = await pool.query(
        `SELECT rate, rate_date, source, rate_type
         FROM exchange_rates 
         WHERE company_id = $1 
           AND from_currency_id = $2 
           AND to_currency_id = $3 
           AND rate_date <= $4 
           AND rate_type = $5
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY rate_date DESC 
         LIMIT 1`,
        [companyId, foreignCurrencyId, baseCurrencyId, rateDate, rate_type]
      );

      if (foreignToBaseRate.rows.length > 0) {
        const rate = parseFloat(foreignToBaseRate.rows[0].rate);
        console.log(`[Exchange Rate] Found foreign→base rate (${currency_code}→${baseCurrencyCode}): ${rate}`);
        return res.json({
          success: true,
          data: {
            rate: rate,
            from_currency_code: currency_code.toUpperCase(),
            from_currency: foreignCurrency.rows[0],
            to_currency_code: baseCurrencyCode,
            to_currency: baseCurrency.rows[0],
            rate_date: foreignToBaseRate.rows[0].rate_date,
            rate_type: foreignToBaseRate.rows[0].rate_type,
            source: foreignToBaseRate.rows[0].source,
            is_reverse: false,
          },
        });
      }

      // 6. No rate found
      return res.json({
        success: true,
        data: {
          rate: null,
          from_currency_code: baseCurrencyCode,
          from_currency: baseCurrency.rows[0],
          to_currency_code: currency_code.toUpperCase(),
          to_currency: foreignCurrency.rows[0],
          rate_date: rateDate,
          message: 'No exchange rate found, please enter manually',
        },
      });
    } catch (error) {
      console.error('Error fetching exchange rate for company:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch exchange rate' },
      });
    }
  }
);

/**
 * @route   GET /api/exchange-rates/latest
 * @desc    Get latest exchange rate for a currency pair
 * @access  Private (exchange_rates:view)
 */
router.get(
  '/latest/:from/:to',
  authenticate,
  loadCompanyContext,
  requirePermission('exchange_rates:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { from, to } = req.params;
      const { rate_type = 'standard' } = req.query;

      // Get currency IDs from codes
      const fromCurrency = await pool.query(
        'SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [from.toUpperCase()]
      );
      const toCurrency = await pool.query(
        'SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL',
        [to.toUpperCase()]
      );

      if (fromCurrency.rows.length === 0 || toCurrency.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Currency not found' },
        });
      }

      const result = await pool.query(
        `SELECT 
           er.id,
           er.rate,
           er.rate_date,
           er.rate_type,
           er.source,
           fc.code as from_currency_code,
           tc.code as to_currency_code
         FROM exchange_rates er
         JOIN currencies fc ON fc.id = er.from_currency_id
         JOIN currencies tc ON tc.id = er.to_currency_id
         WHERE er.company_id = $1 
           AND er.from_currency_id = $2 
           AND er.to_currency_id = $3
           AND er.rate_type = $4
           AND er.is_active = true
           AND er.deleted_at IS NULL
         ORDER BY er.rate_date DESC
         LIMIT 1`,
        [companyId, fromCurrency.rows[0].id, toCurrency.rows[0].id, rate_type]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'No exchange rate found for this currency pair' },
        });
      }

      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching latest exchange rate:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch latest exchange rate' },
      });
    }
  }
);

export default router;

// Export helper function for use in other routes
export { getExchangeRate };
