/**
 * 💰 PRICE LISTS ROUTES
 * ======================
 * Price list management API endpoints
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

// ============================================
// PRICE LISTS - CRUD
// ============================================

// GET /api/sales/price-lists - List price lists
router.get('/', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { type, is_active, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE pl.company_id = $1 AND pl.deleted_at IS NULL';

    if (type) {
      whereClause += ` AND pl.price_list_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND pl.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM price_lists pl ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        pl.*,
        c.code as currency_code, c.symbol as currency_symbol,
        ppl.name as parent_name,
        (SELECT COUNT(*) FROM price_list_items WHERE price_list_id = pl.id) as items_count
      FROM price_lists pl
      LEFT JOIN currencies c ON pl.currency_id = c.id
      LEFT JOIN price_lists ppl ON pl.parent_price_list_id = ppl.id
      ${whereClause}
      ORDER BY pl.priority, pl.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching price lists:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch price lists' } });
  }
});

// GET /api/sales/price-lists/:id - Get single price list with items
router.get('/:id', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        pl.*,
        c.code as currency_code, c.symbol as currency_symbol,
        ppl.name as parent_name
      FROM price_lists pl
      LEFT JOIN currencies c ON pl.currency_id = c.id
      LEFT JOIN price_lists ppl ON pl.parent_price_list_id = ppl.id
      WHERE pl.id = $1 AND pl.company_id = $2 AND pl.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Price list not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        pli.*,
        i.code as item_code, i.name as item_name, i.name_ar as item_name_ar,
        u.code as uom_code, u.name as uom_name
      FROM price_list_items pli
      JOIN items i ON pli.item_id = i.id
      LEFT JOIN units_of_measure u ON pli.uom_id = u.id
      WHERE pli.price_list_id = $1 AND pli.is_active = true
      ORDER BY i.code
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching price list:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch price list' } });
  }
});

// POST /api/sales/price-lists - Create price list
router.post('/', requirePermission('price_lists:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      code, name, name_ar, description,
      price_list_type, currency_id, valid_from, valid_to,
      is_tax_inclusive, markup_percent, discount_percent,
      parent_price_list_id, priority, is_default,
      items
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    await client.query('BEGIN');

    // If setting as default, unset other defaults of same type
    if (is_default) {
      await client.query(`
        UPDATE price_lists 
        SET is_default = false, updated_at = NOW()
        WHERE company_id = $1 AND price_list_type = $2 AND is_default = true
      `, [companyId, price_list_type || 'sales']);
    }

    const result = await client.query(`
      INSERT INTO price_lists (
        company_id, code, name, name_ar, description,
        price_list_type, currency_id, valid_from, valid_to,
        is_tax_inclusive, markup_percent, discount_percent,
        parent_price_list_id, priority, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      companyId, code, name, name_ar, description,
      price_list_type || 'sales', currency_id, valid_from, valid_to,
      is_tax_inclusive || false, markup_percent, discount_percent,
      parent_price_list_id, priority || 100, is_default || false, userId
    ]);

    const priceListId = result.rows[0].id;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(`
          INSERT INTO price_list_items (
            price_list_id, item_id, uom_id, unit_price,
            min_qty, max_qty, discount_percent, discount_amount,
            valid_from, valid_to
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          priceListId, item.item_id, item.uom_id, item.unit_price,
          item.min_qty || 1, item.max_qty, item.discount_percent, item.discount_amount,
          item.valid_from, item.valid_to
        ]);
      }
    }

    await client.query('COMMIT');

    logger.info('Price list created', { priceListId, code, userId });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating price list:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Price list code already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create price list' } });
  } finally {
    client.release();
  }
});

// PUT /api/sales/price-lists/:id - Update price list
router.put('/:id', requirePermission('price_lists:update'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'name_ar', 'description',
      'price_list_type', 'currency_id', 'valid_from', 'valid_to',
      'is_tax_inclusive', 'markup_percent', 'discount_percent',
      'parent_price_list_id', 'priority', 'is_default', 'is_active'
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, companyId);

    const result = await pool.query(
      `UPDATE price_lists SET ${fields.join(', ')} WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Price list not found' } });
    }

    logger.info('Price list updated', { priceListId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating price list:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update price list' } });
  }
});

// DELETE /api/sales/price-lists/:id - Soft delete price list
router.delete('/:id', requirePermission('price_lists:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE price_lists SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Price list not found' } });
    }

    logger.info('Price list deleted', { priceListId: id, userId });
    res.json({ success: true, message: 'Price list deleted successfully' });
  } catch (error) {
    logger.error('Error deleting price list:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete price list' } });
  }
});

// ============================================
// PRICE LIST ITEMS
// ============================================

// POST /api/sales/price-lists/:id/items - Add items to price list
router.post('/:id/items', requirePermission('price_lists:update'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Items array is required' } });
    }

    // Verify price list exists
    const priceListCheck = await pool.query(
      'SELECT id FROM price_lists WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (priceListCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Price list not found' } });
    }

    await client.query('BEGIN');

    const addedItems: any[] = [];
    
    for (const item of items) {
      const result = await client.query(`
        INSERT INTO price_list_items (
          price_list_id, item_id, uom_id, unit_price,
          min_qty, max_qty, discount_percent, discount_amount,
          valid_from, valid_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (price_list_id, item_id, uom_id, min_qty) 
        DO UPDATE SET 
          unit_price = EXCLUDED.unit_price,
          max_qty = EXCLUDED.max_qty,
          discount_percent = EXCLUDED.discount_percent,
          discount_amount = EXCLUDED.discount_amount,
          valid_from = EXCLUDED.valid_from,
          valid_to = EXCLUDED.valid_to,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [
        id, item.item_id, item.uom_id || null, item.unit_price,
        item.min_qty || 1, item.max_qty, item.discount_percent, item.discount_amount,
        item.valid_from, item.valid_to
      ]);
      addedItems.push(result.rows[0]);
    }

    await client.query('COMMIT');

    logger.info('Price list items added', { priceListId: id, itemCount: addedItems.length });
    res.json({ success: true, data: addedItems, count: addedItems.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding price list items:', error);
    res.status(500).json({ success: false, error: { code: 'ADD_ERROR', message: 'Failed to add items to price list' } });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/price-lists/:id/items/:itemId - Remove item from price list
router.delete('/:id/items/:itemId', requirePermission('price_lists:update'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id, itemId } = req.params;

    await pool.query(
      'UPDATE price_list_items SET is_active = false, updated_at = NOW() WHERE price_list_id = $1 AND item_id = $2',
      [id, itemId]
    );

    logger.info('Price list item removed', { priceListId: id, itemId });
    res.json({ success: true, message: 'Item removed from price list' });
  } catch (error) {
    logger.error('Error removing price list item:', error);
    res.status(500).json({ success: false, error: { code: 'REMOVE_ERROR', message: 'Failed to remove item from price list' } });
  }
});

// ============================================
// PRICE LOOKUP
// ============================================

// GET /api/sales/price-lists/lookup - Get price for item
router.get('/lookup', requirePermission('price_lists:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { item_id, customer_id, quantity, uom_id } = req.query;

    if (!item_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'item_id is required' } });
    }

    const price = await PriceListService.getPrice(
      companyId,
      parseInt(item_id as string),
      parseFloat(quantity as string) || 1,
      customer_id ? parseInt(customer_id as string) : undefined,
      uom_id ? parseInt(uom_id as string) : undefined
    );

    if (!price) {
      return res.status(404).json({ success: false, error: { code: 'PRICE_NOT_FOUND', message: 'No price found for this item' } });
    }

    res.json({ success: true, data: price });
  } catch (error) {
    logger.error('Error looking up price:', error);
    res.status(500).json({ success: false, error: { code: 'LOOKUP_ERROR', message: 'Failed to look up price' } });
  }
});

// POST /api/sales/price-lists/:id/copy - Copy price list
router.post('/:id/copy', requirePermission('price_lists:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { code, name, adjustment_percent } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    const newId = await PriceListService.copyPriceList(
      parseInt(id),
      code,
      name,
      parseFloat(adjustment_percent) || 0,
      companyId,
      userId
    );

    res.status(201).json({ success: true, data: { id: newId }, message: 'Price list copied successfully' });
  } catch (error) {
    logger.error('Error copying price list:', error);
    res.status(500).json({ success: false, error: { code: 'COPY_ERROR', message: 'Failed to copy price list' } });
  }
});

// POST /api/sales/price-lists/:id/bulk-update - Bulk update prices
router.post('/:id/bulk-update', requirePermission('price_lists:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment_type, adjustment_value, category_id, item_ids } = req.body;

    if (!adjustment_type || adjustment_value === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'adjustment_type and adjustment_value are required' } });
    }

    const rowsAffected = await PriceListService.bulkUpdatePrices(
      parseInt(id),
      adjustment_type,
      parseFloat(adjustment_value),
      { categoryId: category_id, itemIds: item_ids }
    );

    res.json({ success: true, data: { rows_affected: rowsAffected }, message: `${rowsAffected} prices updated` });
  } catch (error) {
    logger.error('Error bulk updating prices:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to bulk update prices' } });
  }
});

export default router;
