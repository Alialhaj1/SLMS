/**
 * 💰 PRICE LIST SERVICE
 * ======================
 * Price list management with priority-based pricing
 * 
 * Features:
 * ✅ Multi-currency support
 * ✅ Quantity-based pricing
 * ✅ Customer-specific prices
 * ✅ Validity date checking
 */

import pool from '../db';
import { logger } from '../utils/logger';

export interface PriceResult {
  price_list_id: number;
  price_list_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  uom_id?: number;
  uom_code?: string;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  min_qty: number;
  max_qty?: number;
  is_tax_inclusive: boolean;
  currency_id?: number;
  currency_code?: string;
  source: 'customer' | 'item' | 'default';
}

/**
 * Price List Service
 */
export class PriceListService {
  
  /**
   * Get best price for item based on customer, quantity, and price lists
   */
  static async getPrice(
    companyId: number,
    itemId: number,
    quantity: number = 1,
    customerId?: number,
    uomId?: number
  ): Promise<PriceResult | null> {
    // Priority order:
    // 1. Customer-specific price list
    // 2. Customer category default price list
    // 3. Company default price list
    // 4. Item base price
    
    // Build query for applicable price lists
    let query = `
      WITH applicable_price_lists AS (
        -- Customer-specific price lists
        SELECT 
          pl.id as price_list_id,
          pl.name as price_list_name,
          pl.is_tax_inclusive,
          pl.currency_id,
          cur.code as currency_code,
          cpl.priority,
          'customer' as source
        FROM customer_price_lists cpl
        JOIN price_lists pl ON cpl.price_list_id = pl.id
        LEFT JOIN currencies cur ON pl.currency_id = cur.id
        WHERE cpl.customer_id = $2
          AND cpl.is_active = true
          AND pl.is_active = true
          AND pl.deleted_at IS NULL
          AND pl.price_list_type IN ('sales', 'both')
          AND (cpl.valid_from IS NULL OR cpl.valid_from <= CURRENT_DATE)
          AND (cpl.valid_to IS NULL OR cpl.valid_to >= CURRENT_DATE)
          AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
          AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
        
        UNION ALL
        
        -- Category default price list
        SELECT 
          pl.id as price_list_id,
          pl.name as price_list_name,
          pl.is_tax_inclusive,
          pl.currency_id,
          cur.code as currency_code,
          pl.priority + 1000 as priority, -- Lower priority than customer-specific
          'item' as source
        FROM customers c
        JOIN customer_categories cc ON c.category_id = cc.id
        JOIN price_lists pl ON cc.default_price_list_id = pl.id
        LEFT JOIN currencies cur ON pl.currency_id = cur.id
        WHERE c.id = $2
          AND pl.is_active = true
          AND pl.deleted_at IS NULL
          AND pl.price_list_type IN ('sales', 'both')
          AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
          AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
        
        UNION ALL
        
        -- Default company price list
        SELECT 
          pl.id as price_list_id,
          pl.name as price_list_name,
          pl.is_tax_inclusive,
          pl.currency_id,
          cur.code as currency_code,
          pl.priority + 2000 as priority, -- Lowest priority
          'default' as source
        FROM price_lists pl
        LEFT JOIN currencies cur ON pl.currency_id = cur.id
        WHERE pl.company_id = $1
          AND pl.is_default = true
          AND pl.is_active = true
          AND pl.deleted_at IS NULL
          AND pl.price_list_type IN ('sales', 'both')
          AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
          AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
      )
      SELECT 
        apl.price_list_id,
        apl.price_list_name,
        apl.is_tax_inclusive,
        apl.currency_id,
        apl.currency_code,
        apl.source,
        pli.item_id,
        i.code as item_code,
        i.name as item_name,
        pli.uom_id,
        u.code as uom_code,
        pli.unit_price,
        pli.discount_percent,
        pli.discount_amount,
        pli.min_qty,
        pli.max_qty
      FROM applicable_price_lists apl
      JOIN price_list_items pli ON apl.price_list_id = pli.price_list_id
      JOIN items i ON pli.item_id = i.id
      LEFT JOIN units_of_measure u ON pli.uom_id = u.id
      WHERE pli.item_id = $3
        AND pli.is_active = true
        AND (pli.uom_id IS NULL OR pli.uom_id = $4 OR $4 IS NULL)
        AND pli.min_qty <= $5
        AND (pli.max_qty IS NULL OR pli.max_qty >= $5)
        AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
        AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
      ORDER BY apl.priority ASC, pli.min_qty DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [
      companyId,
      customerId || 0,
      itemId,
      uomId || null,
      quantity
    ]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Fall back to item's base selling price
    const itemResult = await pool.query(`
      SELECT 
        i.id as item_id,
        i.code as item_code,
        i.name as item_name,
        i.selling_price as unit_price,
        i.base_uom_id as uom_id,
        u.code as uom_code
      FROM items i
      LEFT JOIN units_of_measure u ON i.base_uom_id = u.id
      WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL
    `, [itemId, companyId]);
    
    if (itemResult.rows.length > 0) {
      const item = itemResult.rows[0];
      return {
        price_list_id: 0,
        price_list_name: 'Base Price',
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom_id: item.uom_id,
        uom_code: item.uom_code,
        unit_price: item.unit_price || 0,
        min_qty: 1,
        is_tax_inclusive: false,
        source: 'default'
      };
    }
    
    return null;
  }
  
  /**
   * Get all prices for an item (all applicable price lists)
   */
  static async getAllPrices(
    companyId: number,
    itemId: number,
    customerId?: number
  ): Promise<PriceResult[]> {
    const query = `
      SELECT 
        pl.id as price_list_id,
        pl.code as price_list_code,
        pl.name as price_list_name,
        pl.is_tax_inclusive,
        pl.currency_id,
        cur.code as currency_code,
        pli.item_id,
        i.code as item_code,
        i.name as item_name,
        pli.uom_id,
        u.code as uom_code,
        pli.unit_price,
        pli.discount_percent,
        pli.discount_amount,
        pli.min_qty,
        pli.max_qty,
        pli.valid_from,
        pli.valid_to
      FROM price_lists pl
      JOIN price_list_items pli ON pl.id = pli.price_list_id
      JOIN items i ON pli.item_id = i.id
      LEFT JOIN units_of_measure u ON pli.uom_id = u.id
      LEFT JOIN currencies cur ON pl.currency_id = cur.id
      WHERE pl.company_id = $1
        AND pli.item_id = $2
        AND pl.is_active = true
        AND pli.is_active = true
        AND pl.deleted_at IS NULL
        AND pl.price_list_type IN ('sales', 'both')
      ORDER BY pl.priority, pli.min_qty
    `;
    
    const result = await pool.query(query, [companyId, itemId]);
    return result.rows;
  }
  
  /**
   * Copy price list with new prices
   */
  static async copyPriceList(
    sourcePriceListId: number,
    newCode: string,
    newName: string,
    adjustmentPercent: number, // +10 for 10% increase, -5 for 5% decrease
    companyId: number,
    createdBy: number
  ): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Copy price list header
      const headerResult = await client.query(`
        INSERT INTO price_lists (
          company_id, code, name, name_ar, description,
          price_list_type, currency_id, valid_from, valid_to,
          is_tax_inclusive, markup_percent, discount_percent,
          parent_price_list_id, priority, is_active, created_by
        )
        SELECT 
          company_id, $1, $2, name_ar, description,
          price_list_type, currency_id, valid_from, valid_to,
          is_tax_inclusive, markup_percent, discount_percent,
          $3, priority + 1, true, $4
        FROM price_lists 
        WHERE id = $3 AND company_id = $5
        RETURNING id
      `, [newCode, newName, sourcePriceListId, createdBy, companyId]);
      
      const newPriceListId = headerResult.rows[0].id;
      
      // Copy items with price adjustment
      const multiplier = 1 + (adjustmentPercent / 100);
      
      await client.query(`
        INSERT INTO price_list_items (
          price_list_id, item_id, uom_id, unit_price,
          min_qty, max_qty, discount_percent, discount_amount,
          valid_from, valid_to, is_active
        )
        SELECT 
          $1, item_id, uom_id, 
          ROUND(unit_price * $2, 2) as unit_price,
          min_qty, max_qty, discount_percent, discount_amount,
          valid_from, valid_to, is_active
        FROM price_list_items
        WHERE price_list_id = $3
      `, [newPriceListId, multiplier, sourcePriceListId]);
      
      await client.query('COMMIT');
      
      logger.info('Price list copied', { 
        sourcePriceListId, 
        newPriceListId, 
        adjustmentPercent 
      });
      
      return newPriceListId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Bulk update prices
   */
  static async bulkUpdatePrices(
    priceListId: number,
    adjustmentType: 'percent' | 'fixed',
    adjustmentValue: number,
    itemFilter?: { categoryId?: number; itemIds?: number[] }
  ): Promise<number> {
    let query: string;
    const params: any[] = [priceListId];
    
    if (adjustmentType === 'percent') {
      query = `
        UPDATE price_list_items pli
        SET unit_price = ROUND(unit_price * (1 + $2 / 100), 2),
            updated_at = NOW()
        WHERE price_list_id = $1
      `;
      params.push(adjustmentValue);
    } else {
      query = `
        UPDATE price_list_items pli
        SET unit_price = GREATEST(0, unit_price + $2),
            updated_at = NOW()
        WHERE price_list_id = $1
      `;
      params.push(adjustmentValue);
    }
    
    // Add item filter if provided
    if (itemFilter?.itemIds && itemFilter.itemIds.length > 0) {
      query += ` AND item_id = ANY($${params.length + 1})`;
      params.push(itemFilter.itemIds);
    }
    
    if (itemFilter?.categoryId) {
      query += ` AND item_id IN (SELECT id FROM items WHERE category_id = $${params.length + 1})`;
      params.push(itemFilter.categoryId);
    }
    
    const result = await pool.query(query, params);
    
    logger.info('Bulk price update', { 
      priceListId, 
      adjustmentType, 
      adjustmentValue, 
      rowsAffected: result.rowCount 
    });
    
    return result.rowCount || 0;
  }
}

export default PriceListService;
