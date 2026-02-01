/**
 * Stock Movements API - نظام الحركات المخزنية الموحد
 * Unified stock movement system following the principle:
 * "Every quantity change must go through transactions"
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

// Apply middleware
router.use(authenticate);
router.use(loadCompanyContext);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const REFERENCE_TYPES = [
  'PURCHASE', 'PURCHASE_RETURN', 'SALE', 'SALE_RETURN',
  'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
  'WASTAGE', 'OPENING_BALANCE', 'PRODUCTION_IN', 'PRODUCTION_OUT',
  'SAMPLE', 'DONATION', 'EXPIRED'
] as const;

const stockMovementSchema = z.object({
  item_id: z.number().int().positive(),
  warehouse_id: z.number().int().positive(),
  bin_location: z.string().max(100).optional(),
  qty: z.number(),
  unit_id: z.number().int().positive().optional(),
  reference_type: z.enum(REFERENCE_TYPES),
  reference_id: z.number().int().optional(),
  reference_no: z.string().max(100).optional(),
  unit_cost: z.number().optional(),
  batch_number: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/inventory/stock-movements - List movements with filters
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', requirePermission('stock_movements:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const {
      item_id,
      warehouse_id,
      reference_type,
      batch_number,
      from_date,
      to_date,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 500);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'sm.company_id = $1 AND sm.is_reversed = FALSE';
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (item_id) {
      whereClause += ` AND sm.item_id = $${paramIndex++}`;
      params.push(parseInt(item_id as string, 10));
    }
    if (warehouse_id) {
      whereClause += ` AND sm.warehouse_id = $${paramIndex++}`;
      params.push(parseInt(warehouse_id as string, 10));
    }
    if (reference_type) {
      whereClause += ` AND sm.reference_type = $${paramIndex++}`;
      params.push(reference_type);
    }
    if (batch_number) {
      whereClause += ` AND sm.batch_number ILIKE $${paramIndex++}`;
      params.push(`%${batch_number}%`);
    }
    if (from_date) {
      whereClause += ` AND sm.created_at >= $${paramIndex++}`;
      params.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND sm.created_at <= $${paramIndex++}`;
      params.push(to_date);
    }

    const query = `
      SELECT 
        sm.*,
        i.code AS item_code,
        i.name AS item_name,
        i.name_ar AS item_name_ar,
        w.name AS warehouse_name,
        u.name AS unit_name,
        u.symbol AS unit_symbol,
        cb.first_name || ' ' || cb.last_name AS created_by_name
      FROM stock_movements sm
      LEFT JOIN items i ON i.id = sm.item_id
      LEFT JOIN warehouses w ON w.id = sm.warehouse_id
      LEFT JOIN units u ON u.id = sm.unit_id
      LEFT JOIN users cb ON cb.id = sm.created_by
      WHERE ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limitNum, offset);

    const countQuery = `
      SELECT COUNT(*) FROM stock_movements sm WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/inventory/stock-movements/item/:itemId - Get movements for item
// ═══════════════════════════════════════════════════════════════════════════

router.get('/item/:itemId', requirePermission('stock_movements:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const itemId = parseInt(req.params.itemId, 10);
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);

    const query = `
      SELECT 
        sm.*,
        w.name AS warehouse_name,
        u.name AS unit_name,
        cb.first_name || ' ' || cb.last_name AS created_by_name
      FROM stock_movements sm
      LEFT JOIN warehouses w ON w.id = sm.warehouse_id
      LEFT JOIN units u ON u.id = sm.unit_id
      LEFT JOIN users cb ON cb.id = sm.created_by
      WHERE sm.company_id = $1 AND sm.item_id = $2 AND sm.is_reversed = FALSE
      ORDER BY sm.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [companyId, itemId, limit]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching item movements:', error);
    res.status(500).json({ error: 'Failed to fetch item movements' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/inventory/stock-movements/summary/:itemId - Get stock summary
// ═══════════════════════════════════════════════════════════════════════════

router.get('/summary/:itemId', requirePermission('stock_movements:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const itemId = parseInt(req.params.itemId, 10);

    // Get total stock
    const stockQuery = `
      SELECT 
        COALESCE(SUM(base_qty), 0) AS total_stock,
        COUNT(*) AS movement_count,
        MAX(created_at) AS last_movement
      FROM stock_movements
      WHERE company_id = $1 AND item_id = $2 AND is_reversed = FALSE
    `;

    // Get stock by warehouse
    const warehouseQuery = `
      SELECT 
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(SUM(sm.base_qty), 0) AS stock_qty
      FROM stock_movements sm
      JOIN warehouses w ON w.id = sm.warehouse_id
      WHERE sm.company_id = $1 AND sm.item_id = $2 AND sm.is_reversed = FALSE
      GROUP BY w.id, w.name
      HAVING SUM(sm.base_qty) != 0
      ORDER BY w.name
    `;

    // Get movement stats by type (last 30 days)
    const statsQuery = `
      SELECT 
        reference_type,
        COUNT(*) AS count,
        COALESCE(SUM(ABS(base_qty)), 0) AS total_qty
      FROM stock_movements
      WHERE company_id = $1 AND item_id = $2 
        AND is_reversed = FALSE
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY reference_type
      ORDER BY count DESC
    `;

    const [stockResult, warehouseResult, statsResult] = await Promise.all([
      pool.query(stockQuery, [companyId, itemId]),
      pool.query(warehouseQuery, [companyId, itemId]),
      pool.query(statsQuery, [companyId, itemId]),
    ]);

    res.json({
      success: true,
      data: {
        total_stock: parseFloat(stockResult.rows[0]?.total_stock || '0'),
        movement_count: parseInt(stockResult.rows[0]?.movement_count || '0', 10),
        last_movement: stockResult.rows[0]?.last_movement,
        by_warehouse: warehouseResult.rows,
        stats_30d: statsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/inventory/stock-movements - Create movement
// ═══════════════════════════════════════════════════════════════════════════

router.post('/', requirePermission('stock_movements:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).user?.id;

    const validation = stockMovementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const data = validation.data;

    // Get item base unit and conversion
    const itemQuery = `SELECT unit_id FROM items WHERE id = $1 AND company_id = $2`;
    const itemResult = await pool.query(itemQuery, [data.item_id, companyId]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Calculate base quantity
    let baseQty = data.qty;
    if (data.unit_id && data.unit_id !== itemResult.rows[0].unit_id) {
      const convQuery = `
        SELECT conversion_factor FROM item_units 
        WHERE item_id = $1 AND unit_id = $2
      `;
      const convResult = await pool.query(convQuery, [data.item_id, data.unit_id]);
      if (convResult.rows.length > 0) {
        baseQty = data.qty * convResult.rows[0].conversion_factor;
      }
    }

    const insertQuery = `
      INSERT INTO stock_movements (
        company_id, item_id, warehouse_id, bin_location,
        qty, unit_id, base_qty,
        reference_type, reference_id, reference_no,
        unit_cost, total_cost,
        batch_number, serial_number, expiry_date,
        notes, created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        $13, $14, $15,
        $16, $17
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      companyId,
      data.item_id,
      data.warehouse_id,
      data.bin_location || null,
      data.qty,
      data.unit_id || null,
      baseQty,
      data.reference_type,
      data.reference_id || null,
      data.reference_no || null,
      data.unit_cost || 0,
      (data.unit_cost || 0) * Math.abs(baseQty),
      data.batch_number || null,
      data.serial_number || null,
      data.expiry_date || null,
      data.notes || null,
      userId,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(500).json({ error: 'Failed to create stock movement' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/inventory/stock-movements/:id/reverse - Reverse movement
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:id/reverse', requirePermission('stock_movements:reverse'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).user?.id;
    const movementId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    // Check if movement exists and not already reversed
    const checkQuery = `
      SELECT * FROM stock_movements 
      WHERE id = $1 AND company_id = $2 AND is_reversed = FALSE
    `;
    const checkResult = await pool.query(checkQuery, [movementId, companyId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Movement not found or already reversed' });
    }

    const movement = checkResult.rows[0];

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark original as reversed
      await client.query(`
        UPDATE stock_movements 
        SET is_reversed = TRUE, reversed_by = $1, reversed_at = NOW(), reversal_reason = $2
        WHERE id = $3
      `, [userId, reason, movementId]);

      // Create reversing entry
      await client.query(`
        INSERT INTO stock_movements (
          company_id, item_id, warehouse_id, bin_location,
          qty, unit_id, base_qty,
          reference_type, reference_id, reference_no,
          unit_cost, total_cost,
          batch_number, serial_number, expiry_date,
          notes, created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12,
          $13, $14, $15,
          $16, $17
        )
      `, [
        movement.company_id,
        movement.item_id,
        movement.warehouse_id,
        movement.bin_location,
        -movement.qty,
        movement.unit_id,
        -movement.base_qty,
        movement.reference_type,
        movement.reference_id,
        movement.reference_no ? `REV-${movement.reference_no}` : null,
        movement.unit_cost,
        -movement.total_cost,
        movement.batch_number,
        movement.serial_number,
        movement.expiry_date,
        `Reversal of movement #${movementId}: ${reason || ''}`,
        userId,
      ]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Movement reversed successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reversing stock movement:', error);
    res.status(500).json({ error: 'Failed to reverse stock movement' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/inventory/stock-movements/alerts - Get stock alerts
// ═══════════════════════════════════════════════════════════════════════════

router.get('/alerts/all', requireAnyPermission(['stock_movements:view', 'reports:expiry_alerts']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;

    // Low stock items
    const lowStockQuery = `
      SELECT * FROM v_item_stock_summary 
      WHERE company_id = $1 AND stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')
      ORDER BY total_stock ASC
      LIMIT 20
    `;

    // Expiry alerts
    const expiryQuery = `
      SELECT * FROM v_expiry_alerts 
      WHERE company_id = $1 AND expiry_status IN ('EXPIRED', 'CRITICAL', 'WARNING')
      ORDER BY days_until_expiry ASC
      LIMIT 20
    `;

    // Slow moving
    const slowMovingQuery = `
      SELECT * FROM v_slow_moving_items 
      WHERE company_id = $1
      ORDER BY days_since_movement DESC NULLS FIRST
      LIMIT 20
    `;

    const [lowStock, expiry, slowMoving] = await Promise.all([
      pool.query(lowStockQuery, [companyId]).catch(() => ({ rows: [] })),
      pool.query(expiryQuery, [companyId]).catch(() => ({ rows: [] })),
      pool.query(slowMovingQuery, [companyId]).catch(() => ({ rows: [] })),
    ]);

    res.json({
      success: true,
      data: {
        low_stock: lowStock.rows,
        expiry_alerts: expiry.rows,
        slow_moving: slowMoving.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
});

export default router;
