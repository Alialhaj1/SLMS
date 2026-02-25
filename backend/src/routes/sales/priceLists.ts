/**
 * 💰 PRICE LISTS ROUTES — Enterprise Edition (C-11)
 * ===================================================
 *
 * Full CRUD + stats + filters for EnterpriseMasterPage,
 * plus advanced features: item management, price lookup,
 * copy price list, bulk-update.
 *
 * API: /api/sales/price-lists
 * DB:  price_lists + price_list_items (migration 018 + 339)
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { PriceListService } from '../../services/priceListService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ════════════════════════════════════════════════════════════════════════
// STATS — GET /api/sales/price-lists/stats
// ════════════════════════════════════════════════════════════════════════
router.get('/stats', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;

    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                                      AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int                      AS active,
        COUNT(*) FILTER (WHERE is_active = false)::int                     AS inactive,
        COUNT(*) FILTER (WHERE base_price_type = 'fixed_price')::int       AS fixed_price_count,
        COUNT(*) FILTER (WHERE base_price_type = 'markup_pct')::int        AS markup_count,
        COUNT(*) FILTER (WHERE base_price_type = 'discount_from_standard')::int AS discount_count,
        COUNT(*) FILTER (WHERE is_default = true)::int                     AS default_count,
        COUNT(*) FILTER (WHERE valid_to IS NOT NULL AND valid_to < CURRENT_DATE)::int AS expired_count
      FROM price_lists
      WHERE (company_id = $1 OR $1::int IS NULL) AND deleted_at IS NULL
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching price list stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// FILTERS — GET /api/sales/price-lists/filters
// ════════════════════════════════════════════════════════════════════════
router.get('/filters', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;

    const [currencies, customerCategories] = await Promise.all([
      pool.query(`
        SELECT id, code, name AS name_en, name_ar, symbol
        FROM currencies
        WHERE is_active = true OR is_active IS NULL
        ORDER BY code
      `),
      pool.query(`
        SELECT id, code, name_en, name_ar
        FROM customer_categories
        WHERE (company_id = $1 OR company_id IS NULL)
          AND deleted_at IS NULL
          AND (is_active = true OR is_active IS NULL)
        ORDER BY name_en
      `, [companyId]),
    ]);

    res.json({
      currencies: currencies.rows,
      customer_categories: customerCategories.rows,
    });
  } catch (error) {
    logger.error('Error fetching price list filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// PRICE LOOKUP — GET /api/sales/price-lists/lookup
// ════════════════════════════════════════════════════════════════════════
router.get('/lookup', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { item_id, customer_id, quantity, uom_id } = req.query;

    if (!item_id) {
      return res.status(400).json({ error: 'item_id is required' });
    }

    const price = await PriceListService.getPrice(
      companyId,
      parseInt(item_id as string),
      parseFloat(quantity as string) || 1,
      customer_id ? parseInt(customer_id as string) : undefined,
      uom_id ? parseInt(uom_id as string) : undefined
    );

    if (!price) {
      return res.status(404).json({ error: 'No price found for this item' });
    }

    res.json({ data: price });
  } catch (error) {
    logger.error('Error looking up price:', error);
    res.status(500).json({ error: 'Failed to look up price' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// LIST — GET /api/sales/price-lists
// ════════════════════════════════════════════════════════════════════════
router.get('/', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const {
      page = '1', limit = '25',
      sort = 'name', order = 'asc',
      search,
      currency_id, customer_category_id, base_price_type, is_active, is_default,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset   = (pageNum - 1) * pageSize;

    const params: any[] = [companyId];
    let paramIdx = 2;
    let where = 'WHERE (pl.company_id = $1 OR $1::int IS NULL) AND pl.deleted_at IS NULL';

    if (search) {
      where += ` AND (pl.name ILIKE $${paramIdx} OR pl.name_ar ILIKE $${paramIdx} OR pl.code ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (currency_id) {
      where += ` AND pl.currency_id = $${paramIdx}`;
      params.push(Number(currency_id));
      paramIdx++;
    }
    if (customer_category_id) {
      where += ` AND pl.customer_category_id = $${paramIdx}`;
      params.push(Number(customer_category_id));
      paramIdx++;
    }
    if (base_price_type) {
      where += ` AND pl.base_price_type = $${paramIdx}`;
      params.push(base_price_type);
      paramIdx++;
    }
    if (is_active !== undefined && is_active !== '') {
      where += ` AND pl.is_active = $${paramIdx}`;
      params.push(is_active === 'true');
      paramIdx++;
    }
    if (is_default !== undefined && is_default !== '') {
      where += ` AND pl.is_default = $${paramIdx}`;
      params.push(is_default === 'true');
      paramIdx++;
    }

    // Sorting
    const allowedSorts: Record<string, string> = {
      name: 'pl.name',
      code: 'pl.code',
      valid_from: 'pl.valid_from',
      valid_to: 'pl.valid_to',
      base_price_type: 'pl.base_price_type',
      is_active: 'pl.is_active',
      created_at: 'pl.created_at',
    };
    const sortCol = allowedSorts[sort as string] || 'pl.name';
    const sortDir = (order as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM price_lists pl ${where}`,
      params
    );

    params.push(pageSize, offset);
    const rows = await pool.query(`
      SELECT
        pl.id, pl.company_id, pl.code, pl.name, pl.name_ar, pl.description,
        pl.currency_id, pl.customer_category_id,
        pl.valid_from, pl.valid_to,
        pl.base_price_type, pl.markup_pct, pl.discount_pct,
        pl.is_active, pl.is_default,
        pl.created_by, pl.updated_by,
        pl.created_at, pl.updated_at,

        cur.code   AS currency_code,
        cur.symbol AS currency_symbol,
        cur.name   AS currency_name,

        cc.name_en AS customer_category_name,
        cc.name_ar  AS customer_category_name_ar,

        uc.email   AS created_by_name,
        uu.email   AS updated_by_name,

        (SELECT COUNT(*)::int FROM price_list_items
         WHERE price_list_id = pl.id AND is_active = true) AS items_count
      FROM price_lists pl
      LEFT JOIN currencies cur        ON pl.currency_id = cur.id
      LEFT JOIN customer_categories cc ON pl.customer_category_id = cc.id
      LEFT JOIN users uc              ON pl.created_by = uc.id
      LEFT JOIN users uu              ON pl.updated_by = uu.id
      ${where}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, params);

    res.json({ data: rows.rows, total: countResult.rows[0].total });
  } catch (error) {
    logger.error('Error fetching price lists:', error);
    res.status(500).json({ error: 'Failed to fetch price lists' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// GET SINGLE — GET /api/sales/price-lists/:id
// ════════════════════════════════════════════════════════════════════════
router.get('/:id', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        pl.*,
        cur.code   AS currency_code,
        cur.symbol AS currency_symbol,
        cur.name   AS currency_name,
        cc.name_en AS customer_category_name,
        cc.name_ar AS customer_category_name_ar,
        uc.email   AS created_by_name,
        uu.email   AS updated_by_name
      FROM price_lists pl
      LEFT JOIN currencies cur        ON pl.currency_id = cur.id
      LEFT JOIN customer_categories cc ON pl.customer_category_id = cc.id
      LEFT JOIN users uc              ON pl.created_by = uc.id
      LEFT JOIN users uu              ON pl.updated_by = uu.id
      WHERE pl.id = $1 AND (pl.company_id = $2 OR $2::int IS NULL) AND pl.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price list not found' });
    }

    // Get line items
    const itemsResult = await pool.query(`
      SELECT
        pli.id,
        pli.item_id,
        pli.item_group_id,
        pli.uom_id,
        pli.unit_price  AS price,
        pli.min_qty,
        pli.max_qty,
        pli.discount_percent AS discount_pct,
        pli.is_active,
        i.code  AS item_code,
        i.name  AS item_name,
        i.name_ar AS item_name_ar,
        ig.code AS item_group_code,
        COALESCE(ig.name_en, ig.name) AS item_group_name
      FROM price_list_items pli
      LEFT JOIN items i       ON pli.item_id = i.id
      LEFT JOIN item_groups ig ON pli.item_group_id = ig.id
      WHERE pli.price_list_id = $1 AND pli.is_active = true
      ORDER BY COALESCE(i.code, ig.code)
    `, [id]);

    res.json({
      ...result.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    logger.error('Error fetching price list:', error);
    res.status(500).json({ error: 'Failed to fetch price list' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// CREATE — POST /api/sales/price-lists
// ════════════════════════════════════════════════════════════════════════
router.post('/', requirePermission('price_lists:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;
    const {
      code, name, name_ar, description,
      currency_id, customer_category_id,
      valid_from, valid_to,
      base_price_type, markup_pct, discount_pct,
      is_active, is_default,
      items,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    if (!valid_from) {
      return res.status(400).json({ error: 'valid_from is required' });
    }
    if (base_price_type && !['fixed_price', 'markup_pct', 'discount_from_standard'].includes(base_price_type)) {
      return res.status(400).json({ error: 'Invalid base_price_type' });
    }

    await client.query('BEGIN');

    // If setting as default → unset other defaults for same category
    if (is_default) {
      await client.query(`
        UPDATE price_lists
        SET is_default = false, updated_at = NOW()
        WHERE (company_id = $1 OR $1::int IS NULL) AND is_default = true AND deleted_at IS NULL
      `, [companyId]);
    }

    const result = await client.query(`
      INSERT INTO price_lists (
        company_id, code, name, name_ar, description,
        currency_id, customer_category_id,
        valid_from, valid_to,
        base_price_type, markup_pct, discount_pct,
        is_active, is_default,
        price_list_type, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11, $12,
        $13, $14,
        'sales', $15
      ) RETURNING *
    `, [
      companyId, code, name, name_ar || null, description || null,
      currency_id || null, customer_category_id || null,
      valid_from, valid_to || null,
      base_price_type || 'fixed_price', markup_pct || null, discount_pct || null,
      is_active !== false, is_default || false,
      userId,
    ]);

    const priceListId = result.rows[0].id;

    // Insert line items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(`
          INSERT INTO price_list_items (
            price_list_id, item_id, item_group_id, uom_id,
            unit_price, min_qty, discount_percent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          priceListId,
          item.item_id || null,
          item.item_group_id || null,
          item.unit_id || item.uom_id || null,
          item.price || item.unit_price || 0,
          item.min_qty || 1,
          item.discount_pct || item.discount_percent || null,
        ]);
      }
    }

    await client.query('COMMIT');
    logger.info('Price list created', { priceListId, code, userId });
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating price list:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Price list code already exists' });
    }
    res.status(500).json({ error: 'Failed to create price list' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════
// UPDATE — PUT /api/sales/price-lists/:id
// ════════════════════════════════════════════════════════════════════════
router.put('/:id', requirePermission('price_lists:edit'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;
    const { id }    = req.params;

    const allowedFields = [
      'name', 'name_ar', 'description',
      'currency_id', 'customer_category_id',
      'valid_from', 'valid_to',
      'base_price_type', 'markup_pct', 'discount_pct',
      'is_active', 'is_default',
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (field in req.body) {
        fields.push(`${field} = $${paramIdx}`);
        values.push(req.body[field]);
        paramIdx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push(`updated_by = $${paramIdx}`, `updated_at = NOW()`);
    values.push(userId);
    paramIdx++;

    values.push(id, companyId);

    const result = await pool.query(
      `UPDATE price_lists SET ${fields.join(', ')}
       WHERE id = $${paramIdx} AND (company_id = $${paramIdx + 1} OR $${paramIdx + 1}::int IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price list not found' });
    }

    logger.info('Price list updated', { priceListId: id, userId });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating price list:', error);
    res.status(500).json({ error: 'Failed to update price list' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// DELETE — DELETE /api/sales/price-lists/:id (soft)
// ════════════════════════════════════════════════════════════════════════
router.delete('/:id', requirePermission('price_lists:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;
    const { id }    = req.params;

    const result = await pool.query(
      `UPDATE price_lists
       SET deleted_at = NOW(), updated_by = $3
       WHERE id = $1 AND (company_id = $2 OR $2::int IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price list not found' });
    }

    logger.info('Price list deleted', { priceListId: id, userId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting price list:', error);
    res.status(500).json({ error: 'Failed to delete price list' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// ITEM MANAGEMENT
// ════════════════════════════════════════════════════════════════════════

// POST /api/sales/price-lists/:id/items — Add or upsert items
router.post('/:id/items', requirePermission('price_lists:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id }    = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    // Verify price list exists
    const check = await pool.query(
      'SELECT id FROM price_lists WHERE id = $1 AND (company_id = $2 OR $2::int IS NULL) AND deleted_at IS NULL',
      [id, companyId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Price list not found' });
    }

    await client.query('BEGIN');
    const added: any[] = [];

    for (const item of items) {
      const result = await client.query(`
        INSERT INTO price_list_items (
          price_list_id, item_id, item_group_id, uom_id,
          unit_price, min_qty, max_qty, discount_percent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (price_list_id, item_id, uom_id, min_qty)
        DO UPDATE SET
          unit_price = EXCLUDED.unit_price,
          max_qty = EXCLUDED.max_qty,
          discount_percent = EXCLUDED.discount_percent,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [
        id,
        item.item_id || null,
        item.item_group_id || null,
        item.uom_id || item.unit_id || null,
        item.unit_price || item.price || 0,
        item.min_qty || 1,
        item.max_qty || null,
        item.discount_percent || item.discount_pct || null,
      ]);
      added.push(result.rows[0]);
    }

    await client.query('COMMIT');
    logger.info('Price list items added', { priceListId: id, count: added.length });
    res.json({ data: added, count: added.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding price list items:', error);
    res.status(500).json({ error: 'Failed to add items' });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/price-lists/:id/items/:itemId
router.delete('/:id/items/:itemId', requirePermission('price_lists:edit'), async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;

    await pool.query(
      'UPDATE price_list_items SET is_active = false, updated_at = NOW() WHERE price_list_id = $1 AND item_id = $2',
      [id, itemId]
    );

    logger.info('Price list item removed', { priceListId: id, itemId });
    res.json({ message: 'Item removed' });
  } catch (error) {
    logger.error('Error removing price list item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// COPY — POST /api/sales/price-lists/:id/copy
// ════════════════════════════════════════════════════════════════════════
router.post('/:id/copy', requirePermission('price_lists:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;
    const { id }    = req.params;
    const { code, name, adjustment_percent } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }

    const newId = await PriceListService.copyPriceList(
      parseInt(id), code, name,
      parseFloat(adjustment_percent) || 0,
      companyId, userId
    );

    res.status(201).json({ data: { id: newId }, message: 'Price list copied' });
  } catch (error) {
    logger.error('Error copying price list:', error);
    res.status(500).json({ error: 'Failed to copy price list' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// BULK UPDATE — POST /api/sales/price-lists/:id/bulk-update
// ════════════════════════════════════════════════════════════════════════
router.post('/:id/bulk-update', requirePermission('price_lists:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment_type, adjustment_value, category_id, item_ids } = req.body;

    if (!adjustment_type || adjustment_value === undefined) {
      return res.status(400).json({ error: 'adjustment_type and adjustment_value are required' });
    }

    const rowsAffected = await PriceListService.bulkUpdatePrices(
      parseInt(id), adjustment_type, parseFloat(adjustment_value),
      { categoryId: category_id, itemIds: item_ids }
    );

    res.json({ data: { rows_affected: rowsAffected }, message: `${rowsAffected} prices updated` });
  } catch (error) {
    logger.error('Error bulk updating prices:', error);
    res.status(500).json({ error: 'Failed to bulk update prices' });
  }
});

export default router;
