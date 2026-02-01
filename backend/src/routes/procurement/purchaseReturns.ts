import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// PURCHASE RETURNS - Full CRUD
// ============================================

// GET /api/procurement/returns - List returns
router.get('/', requirePermission('purchase_returns:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, vendor_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE pr.company_id = $1 AND pr.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (pr.return_number ILIKE $${paramIndex} OR pr.vendor_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND pr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND pr.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND pr.return_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND pr.return_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM purchase_returns pr ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        pr.*,
        v.name as vendor_display_name,
        c.code as currency_code, c.symbol as currency_symbol,
        pi.invoice_number as invoice_number,
        w.name as warehouse_name
      FROM purchase_returns pr
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      LEFT JOIN currencies c ON pr.currency_id = c.id
      LEFT JOIN purchase_invoices pi ON pr.purchase_invoice_id = pi.id
      LEFT JOIN warehouses w ON pr.warehouse_id = w.id
      ${whereClause}
      ORDER BY pr.return_date DESC, pr.return_number DESC
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
    logger.error('Error fetching returns:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch returns' } });
  }
});

// GET /api/procurement/returns/:id - Get single return with items
router.get('/:id', requirePermission('purchase_returns:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const retResult = await pool.query(`
      SELECT 
        pr.*,
        v.name as vendor_display_name, v.name_ar as vendor_display_name_ar,
        c.code as currency_code, c.symbol as currency_symbol,
        pi.invoice_number as invoice_number,
        w.name as warehouse_name
      FROM purchase_returns pr
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      LEFT JOIN currencies c ON pr.currency_id = c.id
      LEFT JOIN purchase_invoices pi ON pr.purchase_invoice_id = pi.id
      LEFT JOIN warehouses w ON pr.warehouse_id = w.id
      WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL
    `, [id, companyId]);

    if (retResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Return not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        pri.*,
        i.code as item_display_code, i.name as item_display_name,
        u.code as uom_code, u.name as uom_name
      FROM purchase_return_items pri
      LEFT JOIN items i ON pri.item_id = i.id
      LEFT JOIN units_of_measure u ON pri.uom_id = u.id
      WHERE pri.return_id = $1
      ORDER BY pri.line_number
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...retResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching return:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch return' } });
  }
});

// POST /api/procurement/returns - Create return
router.post('/', requirePermission('purchase_returns:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      return_date, vendor_id, purchase_invoice_id, goods_receipt_id,
      warehouse_id, currency_id, exchange_rate, return_reason, notes, items
    } = req.body;

    if (!return_date || !vendor_id || !warehouse_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Return date, vendor and warehouse required' } });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } });
    }

    await client.query('BEGIN');

    // Get vendor info
    const vendorResult = await client.query(
      'SELECT code, name FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [vendor_id, companyId]
    );
    if (vendorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'INVALID_VENDOR', message: 'Vendor not found' } });
    }

    // Generate return number
    const lastRet = await client.query(
      "SELECT return_number FROM purchase_returns WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    
    let returnNumber = 'PRET-0001';
    if (lastRet.rows.length > 0) {
      const lastNum = parseInt(lastRet.rows[0].return_number.replace('PRET-', '')) || 0;
      returnNumber = `PRET-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemTax = lineTotal * (item.tax_rate || 0) / 100;
      subtotal += lineTotal;
      taxAmount += itemTax;
    }

    const totalAmount = subtotal + taxAmount;

    // Insert return
    const retResult = await client.query(`
      INSERT INTO purchase_returns (
        company_id, return_number, return_date, vendor_id, vendor_code, vendor_name,
        purchase_invoice_id, goods_receipt_id, warehouse_id,
        currency_id, exchange_rate, subtotal, tax_amount, total_amount,
        return_reason, status, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft', $16, $17
      ) RETURNING *
    `, [
      companyId, returnNumber, return_date, vendor_id, vendorResult.rows[0].code, vendorResult.rows[0].name,
      purchase_invoice_id, goods_receipt_id, warehouse_id,
      currency_id, exchange_rate || 1, subtotal, taxAmount, totalAmount,
      return_reason, notes, userId
    ]);

    const returnId = retResult.rows[0].id;

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemTax = lineTotal * (item.tax_rate || 0) / 100;

      await client.query(`
        INSERT INTO purchase_return_items (
          return_id, line_number, invoice_item_id, item_id, item_code, item_name,
          uom_id, quantity, unit_price, tax_rate, tax_amount, line_total,
          batch_number, warehouse_id, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        returnId, i + 1, item.invoice_item_id, item.item_id, item.item_code, item.item_name,
        item.uom_id, item.quantity, item.unit_price, item.tax_rate || 0, itemTax, lineTotal + itemTax,
        item.batch_number, item.warehouse_id || warehouse_id, item.reason
      ]);
    }

    await client.query('COMMIT');

    logger.info('Purchase return created', { returnId, returnNumber, userId });
    res.status(201).json({ success: true, data: retResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating return:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create return' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/returns/:id/post - Post return (updates inventory, vendor balance, creates journal)
router.put('/:id/post', requirePermission('purchase_returns:post'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get return with items
    const retResult = await client.query(`
      SELECT pr.* FROM purchase_returns pr
      WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL
    `, [id, companyId]);

    if (retResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Return not found' } });
    }

    const returnDoc = retResult.rows[0];

    if (returnDoc.status === 'posted') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_POSTED', message: 'Return is already posted' } });
    }

    // Get items
    const itemsResult = await client.query(
      'SELECT * FROM purchase_return_items WHERE return_id = $1',
      [id]
    );

    await client.query('BEGIN');

    // Update return status
    await client.query(`
      UPDATE purchase_returns 
      SET status = 'posted', posted_by = $1, posted_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [userId, id]);

    // Update vendor balance (debit = we owe less)
    await client.query(`
      UPDATE vendors 
      SET current_balance = COALESCE(current_balance, 0) - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [returnDoc.total_amount, returnDoc.vendor_id]);

    // Insert balance transaction
    await client.query(`
      INSERT INTO vendor_balance_transactions (
        company_id, vendor_id, transaction_date, document_type, document_id, document_number,
        currency_id, debit_amount, balance_after, created_by
      ) VALUES ($1, $2, $3, 'purchase_return', $4, $5, $6, $7, 
        (SELECT COALESCE(current_balance, 0) FROM vendors WHERE id = $2), $8)
    `, [companyId, returnDoc.vendor_id, returnDoc.return_date, id, returnDoc.return_number, returnDoc.currency_id, returnDoc.total_amount, userId]);

    // Decrease inventory for each item
    for (const item of itemsResult.rows) {
      if (item.item_id) {
        // Update warehouse inventory (decrease)
        await client.query(`
          UPDATE warehouse_items 
          SET quantity = COALESCE(quantity, 0) - $1, updated_at = CURRENT_TIMESTAMP
          WHERE warehouse_id = $2 AND item_id = $3
        `, [item.quantity, item.warehouse_id || returnDoc.warehouse_id, item.item_id]);

        // Create inventory movement
        await client.query(`
          INSERT INTO inventory_movements (
            company_id, item_id, warehouse_id, movement_type, movement_date,
            quantity, reference_type, reference_id, reference_number, created_by
          ) VALUES ($1, $2, $3, 'return_out', $4, $5, 'purchase_return', $6, $7, $8)
        `, [companyId, item.item_id, item.warehouse_id || returnDoc.warehouse_id, returnDoc.return_date, -item.quantity, id, returnDoc.return_number, userId]);
      }
    }

    await client.query('COMMIT');

    logger.info('Purchase return posted', { returnId: id, amount: returnDoc.total_amount, userId });
    res.json({ success: true, message: 'Return posted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error posting return:', error);
    res.status(500).json({ success: false, error: { code: 'POST_ERROR', message: 'Failed to post return' } });
  } finally {
    client.release();
  }
});

export default router;
