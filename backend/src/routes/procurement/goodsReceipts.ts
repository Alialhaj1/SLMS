import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { DocumentNumberService } from '../../services/documentNumberService';
import { ProcurementSettingsService } from '../../services/procurementSettingsService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// GOODS RECEIPTS - Full CRUD with Inventory Updates
// ============================================

// GET /api/procurement/goods-receipts - List goods receipts
router.get('/', requirePermission('goods_receipts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, vendor_id, warehouse_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE gr.company_id = $1 AND gr.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (gr.receipt_number ILIKE $${paramIndex} OR gr.po_number ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND gr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND gr.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (warehouse_id) {
      whereClause += ` AND gr.warehouse_id = $${paramIndex}`;
      params.push(warehouse_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM goods_receipts gr LEFT JOIN vendors v ON gr.vendor_id = v.id ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        gr.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        w.name as warehouse_name, w.name_ar as warehouse_name_ar
      FROM goods_receipts gr
      LEFT JOIN vendors v ON gr.vendor_id = v.id
      LEFT JOIN warehouses w ON gr.warehouse_id = w.id
      ${whereClause}
      ORDER BY gr.receipt_date DESC, gr.receipt_number DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
    });
  } catch (error) {
    logger.error('Error fetching goods receipts:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch goods receipts' } });
  }
});

// GET /api/procurement/goods-receipts/:id - Get single receipt with items
router.get('/:id', requirePermission('goods_receipts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const grResult = await pool.query(`
      SELECT 
        gr.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        w.name as warehouse_name, w.name_ar as warehouse_name_ar
      FROM goods_receipts gr
      LEFT JOIN vendors v ON gr.vendor_id = v.id
      LEFT JOIN warehouses w ON gr.warehouse_id = w.id
      WHERE gr.id = $1 AND gr.company_id = $2 AND gr.deleted_at IS NULL
    `, [id, companyId]);

    if (grResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goods receipt not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        gri.*,
        i.code as item_display_code, i.name as item_display_name, i.name_ar as item_display_name_ar,
        u.code as uom_code, u.name as uom_name
      FROM goods_receipt_items gri
      LEFT JOIN items i ON gri.item_id = i.id
      LEFT JOIN units_of_measure u ON gri.uom_id = u.id
      WHERE gri.goods_receipt_id = $1
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...grResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching goods receipt:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch goods receipt' } });
  }
});

// POST /api/procurement/goods-receipts - Create goods receipt
router.post('/', requirePermission('goods_receipts:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      purchase_order_id, vendor_id, warehouse_id, receipt_date, delivery_note_number,
      notes, items
    } = req.body;

    if (!vendor_id || !warehouse_id || !receipt_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor, warehouse, and receipt date are required' } });
    }

    await client.query('BEGIN');

    // Get PO number if linked
    let poNumber = null;
    if (purchase_order_id) {
      const poResult = await client.query(
        'SELECT order_number FROM purchase_orders WHERE id = $1 AND company_id = $2',
        [purchase_order_id, companyId]
      );
      if (poResult.rows.length > 0) {
        poNumber = poResult.rows[0].order_number;
      }
    }

    // ═══════════════════════════════════════════════════
    // 🔢 DOCUMENT NUMBERING SERVICE (NEW)
    // ═══════════════════════════════════════════════════
    const generatedNumber = await DocumentNumberService.generateNumber(companyId, 'goods_receipt');
    const receiptNumber = generatedNumber.number;
    
    // ═══════════════════════════════════════════════════
    // ⚙️ GET PROCUREMENT SETTINGS
    // ═══════════════════════════════════════════════════
    const settings = await ProcurementSettingsService.getSettings(companyId);
    const isOperationalOnly = settings.enable_operational_gr_without_posting || false;

    // Insert goods receipt
    const grResult = await client.query(`
      INSERT INTO goods_receipts (
        company_id, purchase_order_id, po_number, vendor_id, warehouse_id,
        receipt_number, receipt_date, delivery_note_number, status, notes, 
        is_operational_only, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11
      ) RETURNING *
    `, [
      companyId, purchase_order_id, poNumber, vendor_id, warehouse_id,
      receiptNumber, receipt_date, delivery_note_number, notes, 
      isOperationalOnly, userId
    ]);

    const goodsReceiptId = grResult.rows[0].id;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(`
          INSERT INTO goods_receipt_items (
            goods_receipt_id, purchase_order_item_id, item_id, item_code, item_name,
            uom_id, ordered_qty, received_qty, accepted_qty, rejected_qty, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          goodsReceiptId, item.purchase_order_item_id, item.item_id, item.item_code, item.item_name,
          item.uom_id, item.ordered_qty || 0, item.received_qty || 0, 
          item.accepted_qty || item.received_qty || 0, item.rejected_qty || 0, item.notes
        ]);
      }
    }

    await client.query('COMMIT');

    logger.info('Goods receipt created', { goodsReceiptId, receiptNumber, userId });
    res.status(201).json({ success: true, data: grResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating goods receipt:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create goods receipt' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/goods-receipts/:id/post - Post goods receipt (updates inventory)
router.put('/:id/post', requirePermission('goods_receipts:post'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Get goods receipt
    const grResult = await client.query(
      'SELECT * FROM goods_receipts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (grResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goods receipt not found' } });
    }

    const gr = grResult.rows[0];

    if (gr.status === 'posted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'ALREADY_POSTED', message: 'Goods receipt already posted' } });
    }

    // Get items
    const itemsResult = await client.query(
      'SELECT * FROM goods_receipt_items WHERE goods_receipt_id = $1',
      [id]
    );

    // Update inventory for each accepted item
    for (const item of itemsResult.rows) {
      if (item.accepted_qty > 0) {
        // Check if warehouse_items record exists
        const whItemResult = await client.query(
          'SELECT id, quantity FROM warehouse_items WHERE warehouse_id = $1 AND item_id = $2',
          [gr.warehouse_id, item.item_id]
        );

        if (whItemResult.rows.length > 0) {
          // Update existing record - INCREASE quantity
          await client.query(`
            UPDATE warehouse_items 
            SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
            WHERE warehouse_id = $2 AND item_id = $3
          `, [item.accepted_qty, gr.warehouse_id, item.item_id]);
        } else {
          // Insert new record
          await client.query(`
            INSERT INTO warehouse_items (
              warehouse_id, item_id, quantity, minimum_stock, maximum_stock, reorder_point
            ) VALUES ($1, $2, $3, 0, 0, 0)
          `, [gr.warehouse_id, item.item_id, item.accepted_qty]);
        }

        // Create inventory movement
        await client.query(`
          INSERT INTO inventory_movements (
            company_id, warehouse_id, item_id, movement_type, quantity,
            reference_type, reference_id, reference_number, notes, created_by
          ) VALUES ($1, $2, $3, 'receipt', $4, 'goods_receipt', $5, $6, $7, $8)
        `, [
          companyId, gr.warehouse_id, item.item_id, item.accepted_qty,
          id, gr.receipt_number, `Receipt from vendor`, userId
        ]);
      }
    }

    // Update goods receipt status
    await client.query(`
      UPDATE goods_receipts 
      SET status = 'posted', posted_at = CURRENT_TIMESTAMP, posted_by = $1, 
          updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [userId, id]);

    // Update purchase order if linked
    if (gr.purchase_order_id) {
      await client.query(`
        UPDATE purchase_orders 
        SET status_id = (
          SELECT id FROM purchase_order_statuses 
          WHERE company_id = $1 AND code = 'RECEIVED' AND deleted_at IS NULL
          LIMIT 1
        ),
        updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [companyId, userId, gr.purchase_order_id]);
    }

    await client.query('COMMIT');

    logger.info('Goods receipt posted', { goodsReceiptId: id, userId });
    res.json({ success: true, data: { message: 'Goods receipt posted successfully' } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error posting goods receipt:', error);
    res.status(500).json({ success: false, error: { code: 'POST_ERROR', message: 'Failed to post goods receipt' } });
  } finally {
    client.release();
  }
});

// DELETE /api/procurement/goods-receipts/:id - Soft delete
router.delete('/:id', requirePermission('goods_receipts:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check if can be deleted
    const existing = await pool.query(
      'SELECT status FROM goods_receipts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goods receipt not found' } });
    }

    if (existing.rows[0].status === 'posted') {
      return res.status(400).json({ success: false, error: { code: 'DELETE_BLOCKED', message: 'Cannot delete posted goods receipt' } });
    }

    const result = await pool.query(`
      UPDATE goods_receipts 
      SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id, companyId]);

    logger.info('Goods receipt deleted', { goodsReceiptId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error deleting goods receipt:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete goods receipt' } });
  }
});

export default router;
