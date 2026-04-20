import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { NotificationService } from '../../services/notificationService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// VENDOR QUOTATIONS - Full CRUD
// ============================================

// GET /api/procurement/quotations - List quotations
router.get('/', requirePermission('vendor_quotations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, vendor_id, exclude_with_shipments, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE vq.company_id = $1 AND vq.deleted_at IS NULL';

    if (exclude_with_shipments === 'true') {
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM logistics_shipments ls
        WHERE ls.quotation_id = vq.id AND ls.deleted_at IS NULL
      )`;
    }

    if (search) {
      whereClause += ` AND (vq.quotation_number ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND vq.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND vq.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vendor_quotations vq LEFT JOIN vendors v ON vq.vendor_id = v.id ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        vq.*, vq.valid_to as validity_date,
        v.name as vendor_name, v.name_ar as vendor_name_ar, v.code as vendor_code,
        c.code as currency_code, c.symbol as currency_symbol,
        p.code as project_code, p.name as project_name, p.name_ar as project_name_ar
      FROM vendor_quotations vq
      LEFT JOIN vendors v ON vq.vendor_id = v.id
      LEFT JOIN currencies c ON vq.currency_id = c.id
      LEFT JOIN projects p ON vq.project_id = p.id
      ${whereClause}
      ORDER BY vq.quotation_date DESC, vq.quotation_number DESC
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
    logger.error('Error fetching quotations:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch quotations' } });
  }
});

// GET /api/procurement/quotations/:id - Get single quotation with items
router.get('/:id', requirePermission('vendor_quotations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const quotResult = await pool.query(`
      SELECT 
        vq.*, vq.valid_to as validity_date,
        v.name as vendor_name, v.name_ar as vendor_name_ar, v.email as contact_email, v.code as vendor_code,
        c.code as currency_code, c.symbol as currency_symbol,
        p.code as project_code, p.name as project_name, p.name_ar as project_name_ar
      FROM vendor_quotations vq
      LEFT JOIN vendors v ON vq.vendor_id = v.id
      LEFT JOIN currencies c ON vq.currency_id = c.id
      LEFT JOIN projects p ON vq.project_id = p.id
      WHERE vq.id = $1 AND vq.company_id = $2 AND vq.deleted_at IS NULL
    `, [id, companyId]);

    if (quotResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        vqi.*,
        i.code as item_display_code, i.name as item_display_name, i.name_ar as item_display_name_ar,
        u.code as uom_code, u.name as uom_name
      FROM vendor_quotation_items vqi
      LEFT JOIN items i ON vqi.item_id = i.id
      LEFT JOIN units_of_measure u ON vqi.uom_id = u.id
      WHERE vqi.quotation_id = $1
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...quotResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching quotation:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch quotation' } });
  }
});

// POST /api/procurement/quotations - Create quotation
router.post('/', requirePermission('vendor_quotations:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      vendor_id, quotation_date, valid_until, validity_date, currency_id, exchange_rate,
      payment_terms_id, delivery_terms_id, supply_terms_id, project_id,
      notes, technical_notes, subtotal, discount_amount, tax_amount, total_amount,
      items
    } = req.body;

    if (!vendor_id || !quotation_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor and quotation date are required' } });
    }

    await client.query('BEGIN');

    // Generate quotation number
    const lastQuot = await client.query(
      "SELECT quotation_number FROM vendor_quotations WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    
    let quotationNumber = 'QUOT-0001';
    if (lastQuot.rows.length > 0) {
      const lastNum = parseInt(lastQuot.rows[0].quotation_number.replace('QUOT-', '')) || 0;
      quotationNumber = `QUOT-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Use line totals from items if provided
    let calcTotal = total_amount || 0;
    if (!calcTotal && items && Array.isArray(items)) {
      for (const item of items) {
        calcTotal += item.line_total || ((item.quantity || 0) * (item.unit_price || 0));
      }
    }

    const effectiveValidTo = validity_date || valid_until || null;

    // Insert quotation
    const quotResult = await client.query(`
      INSERT INTO vendor_quotations (
        company_id, vendor_id, quotation_number, quotation_date, valid_to,
        currency_id, exchange_rate, payment_terms_id, delivery_terms_id,
        supply_terms_id, project_id, subtotal, discount_amount, tax_amount,
        total_amount, status, notes, technical_notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        'pending', $16, $17, $18
      ) RETURNING *
    `, [
      companyId, vendor_id, quotationNumber, quotation_date, effectiveValidTo,
      currency_id || null, exchange_rate || 1,
      payment_terms_id || null, delivery_terms_id || null,
      supply_terms_id || null, project_id || null,
      subtotal || calcTotal, discount_amount || 0, tax_amount || 0,
      calcTotal, notes || null, technical_notes || null, userId
    ]);

    const quotationId = quotResult.rows[0].id;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const lineTotal = item.line_total || ((item.quantity || 0) * (item.unit_price || 0));
        await client.query(`
          INSERT INTO vendor_quotation_items (
            quotation_id, item_id, item_code, item_name, item_name_ar, uom_id,
            quantity, unit_price, line_total, discount_pct, discount_amount,
            tax_rate, tax_amount, specifications, brand, model_number,
            country_of_origin, warranty_months, delivery_days, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        `, [
          quotationId, item.item_id, item.item_code, item.item_name, item.item_name_ar || null, item.uom_id,
          item.quantity, item.unit_price, lineTotal,
          item.discount_pct || 0, item.discount_amount || 0,
          item.tax_rate || 0, item.tax_amount || 0,
          item.specifications || null, item.brand || null, item.model_number || null,
          item.country_of_origin || null, item.warranty_months || null,
          item.delivery_days || null, item.notes || null
        ]);
      }
    }

    await client.query('COMMIT');

    // Send notification to users with approve permission
    try {
      const approvers = await pool.query(
        `SELECT DISTINCT ur.user_id FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE p.permission_code = 'vendor_quotations:approve'
         AND ur.user_id != $1`,
        [userId]
      );
      const tenantId = (req as any).user?.tenant_id;
      for (const row of approvers.rows) {
        await NotificationService.create({
          type: 'approval_pending',
          category: 'user',
          priority: 'high',
          titleKey: 'notifications.quotation_created.title',
          messageKey: 'notifications.quotation_created.message',
          payload: { document_type: 'vendor_quotation', document_number: quotationNumber },
          targetUserId: row.user_id,
          relatedEntityType: 'vendor_quotation',
          relatedEntityId: quotationId,
          actionUrl: `/purchasing/quotations`,
          tenantId,
          companyId,
        });
      }
    } catch (notifErr) {
      logger.warn('Failed to send quotation approval notifications', notifErr);
    }

    logger.info('Vendor quotation created', { quotationId, quotationNumber, userId });
    res.status(201).json({ success: true, data: quotResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating quotation:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create quotation' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/quotations/:id/accept - Accept quotation
router.put('/:id/accept', requirePermission('vendor_quotations:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET status = 'accepted', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL AND status = 'pending'
      RETURNING *
    `, [userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found or cannot be accepted' } });
    }

    logger.info('Vendor quotation accepted', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error accepting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'ACCEPT_ERROR', message: 'Failed to accept quotation' } });
  }
});

// PUT /api/procurement/quotations/:id - Update quotation
router.put('/:id', requirePermission('vendor_quotations:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const {
      vendor_id, quotation_date, valid_until, validity_date, currency_id, exchange_rate,
      payment_terms_id, delivery_terms_id, supply_terms_id, project_id,
      subtotal, discount_amount, tax_amount, shipping_amount, total_amount,
      notes, technical_notes, items
    } = req.body;

    // Check exists and is still editable
    const existing = await client.query(
      'SELECT * FROM vendor_quotations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'عرض السعر غير موجود' } });
    }
    if (existing.rows[0].status !== 'pending') {
      client.release();
      return res.status(422).json({ success: false, error: { code: 'NOT_EDITABLE', message: 'لا يمكن تعديل عرض مقبول أو مرفوض' } });
    }

    const effectiveValidTo = validity_date || valid_until || null;

    await client.query('BEGIN');

    await client.query(`
      UPDATE vendor_quotations SET
        vendor_id = COALESCE($1, vendor_id),
        quotation_date = COALESCE($2, quotation_date),
        valid_to = $3,
        currency_id = COALESCE($4, currency_id),
        exchange_rate = COALESCE($5, exchange_rate),
        payment_terms_id = $6,
        delivery_terms_id = $7,
        supply_terms_id = $8,
        project_id = $9,
        subtotal = COALESCE($10, subtotal),
        discount_amount = COALESCE($11, discount_amount),
        tax_amount = COALESCE($12, tax_amount),
        shipping_amount = COALESCE($13, shipping_amount),
        total_amount = COALESCE($14, total_amount),
        notes = $15,
        technical_notes = $16,
        updated_by = $17,
        updated_at = NOW()
      WHERE id = $18 AND company_id = $19
    `, [
      vendor_id, quotation_date, effectiveValidTo,
      currency_id, exchange_rate || 1,
      payment_terms_id || null, delivery_terms_id || null,
      supply_terms_id || null, project_id || null,
      subtotal, discount_amount, tax_amount, shipping_amount, total_amount,
      notes || null, technical_notes || null, userId, id, companyId
    ]);

    // Replace items
    if (Array.isArray(items)) {
      await client.query('DELETE FROM vendor_quotation_items WHERE quotation_id = $1', [id]);
      for (const item of items) {
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        await client.query(`
          INSERT INTO vendor_quotation_items
          (quotation_id, item_id, item_code, item_name, uom_id,
           quantity, unit_price, line_total, discount_pct, discount_amount,
           tax_rate, tax_amount, specifications, brand, model_number,
           country_of_origin, warranty_months, delivery_days, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        `, [
          id, item.item_id, item.item_code, item.item_name, item.uom_id,
          item.quantity, item.unit_price, lineTotal,
          item.discount_pct || 0, item.discount_amount || 0,
          item.tax_rate || 0, item.tax_amount || 0,
          item.specifications || null, item.brand || null, item.model_number || null,
          item.country_of_origin || null, item.warranty_months || null,
          item.delivery_days || null, item.notes || null
        ]);
      }
    }

    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM vendor_quotations WHERE id = $1', [id]);
    logger.info('Vendor quotation updated', { quotationId: id, userId });
    res.json({ success: true, data: updated.rows[0], message: 'تم تحديث عرض السعر' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating quotation:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update quotation' } });
  } finally {
    client.release();
  }
});

// POST /api/procurement/quotations/:id/convert-to-contract - Convert accepted quotation to contract
router.post('/:id/convert-to-contract', requirePermission('vendor_contracts:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get quotation with items
    const quotResult = await client.query(
      'SELECT * FROM vendor_quotations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (quotResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'عرض السعر غير موجود' } });
    }
    const quot = quotResult.rows[0];

    if (quot.status !== 'accepted') {
      client.release();
      return res.status(422).json({ success: false, error: { code: 'NOT_ACCEPTED', message: 'يجب قبول عرض السعر أولاً' } });
    }
    if (quot.converted_to_contract_id) {
      client.release();
      return res.status(409).json({ success: false, error: { code: 'ALREADY_CONVERTED', message: 'تم تحويل هذا العرض لعقد مسبقاً' } });
    }

    await client.query('BEGIN');

    // Generate contract number
    const lastCon = await client.query(
      "SELECT contract_number FROM vendor_contracts WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    let contractNumber = 'CON-0001';
    if (lastCon.rows.length > 0) {
      const lastNum = parseInt(lastCon.rows[0].contract_number.replace('CON-', '')) || 0;
      contractNumber = `CON-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Get draft status
    const draftStatus = await client.query(
      'SELECT id FROM contract_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, 'DRAFT']
    );

    // Create contract
    const conResult = await client.query(`
      INSERT INTO vendor_contracts
      (company_id, vendor_id, contract_number, title, currency_id, exchange_rate,
       total_value, payment_terms_id, delivery_terms_id, supply_terms_id,
       quotation_id, project_id, status_id, contract_date, start_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_DATE,CURRENT_DATE,$14)
      RETURNING id, contract_number
    `, [
      companyId, quot.vendor_id, contractNumber,
      `عقد - ${quot.quotation_number}`,
      quot.currency_id, quot.exchange_rate || 1,
      quot.total_amount, quot.payment_terms_id, quot.delivery_terms_id,
      quot.supply_terms_id, quot.id, quot.project_id,
      draftStatus.rows[0]?.id, userId
    ]);

    const contractId = conResult.rows[0].id;

    // Copy items from quotation to contract
    const items = await client.query(
      'SELECT * FROM vendor_quotation_items WHERE quotation_id = $1', [id]
    );
    for (const item of items.rows) {
      await client.query(`
        INSERT INTO vendor_contract_items
        (contract_id, item_id, item_code, item_name, uom_id, contracted_qty, unit_price, line_total, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [contractId, item.item_id, item.item_code, item.item_name,
          item.uom_id, item.quantity, item.unit_price, item.line_total, item.notes]);
    }

    // Mark quotation as converted
    await client.query(
      'UPDATE vendor_quotations SET converted_to_contract_id = $1 WHERE id = $2',
      [contractId, id]
    );

    await client.query('COMMIT');

    logger.info('Quotation converted to contract', { quotationId: id, contractId, contractNumber, userId });
    res.json({ success: true, contract_id: contractId, contract_number: contractNumber, message: 'تم تحويل عرض السعر إلى عقد بنجاح' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error converting quotation to contract:', error);
    res.status(500).json({ success: false, error: { code: 'CONVERT_ERROR', message: 'Failed to convert quotation' } });
  } finally {
    client.release();
  }
});

// POST /api/procurement/quotations/:id/convert-to-po - Convert accepted quotation to purchase order
router.post('/:id/convert-to-po', requirePermission('purchase_orders:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const quotResult = await client.query(
      'SELECT * FROM vendor_quotations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (quotResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'عرض السعر غير موجود' } });
    }
    const quot = quotResult.rows[0];

    if (quot.status !== 'accepted') {
      client.release();
      return res.status(422).json({ success: false, error: { code: 'NOT_ACCEPTED', message: 'يجب قبول عرض السعر أولاً' } });
    }
    if (quot.converted_to_po_id) {
      client.release();
      return res.status(409).json({ success: false, error: { code: 'ALREADY_CONVERTED', message: 'تم تحويل هذا العرض لأمر شراء مسبقاً' } });
    }

    await client.query('BEGIN');

    // Generate PO number
    const lastPo = await client.query(
      "SELECT order_number FROM purchase_orders WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    let poNumber = 'PO-0001';
    if (lastPo.rows.length > 0) {
      const match = lastPo.rows[0].order_number.match(/(\d+)$/);
      const lastNum = match ? parseInt(match[1]) : 0;
      poNumber = `PO-${String(lastNum + 1).padStart(5, '0')}`;
    }

    // Get draft status
    const draftStatus = await client.query(
      'SELECT id FROM purchase_order_statuses WHERE company_id = $1 AND (LOWER(code) = $2 OR LOWER(name) = $2) AND deleted_at IS NULL LIMIT 1',
      [companyId, 'draft']
    );

    // Get vendor details
    const vendor = await client.query('SELECT code, name FROM vendors WHERE id = $1', [quot.vendor_id]);

    // Create PO
    const poResult = await client.query(`
      INSERT INTO purchase_orders
      (company_id, order_number, order_date, vendor_id, vendor_code, vendor_name,
       quotation_id, currency_id, exchange_rate, payment_terms_id, delivery_terms_id,
       supply_terms_id, project_id, subtotal, tax_amount, discount_amount, total_amount,
       status, status_id, created_by)
      VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'draft',$17,$18)
      RETURNING id, order_number
    `, [
      companyId, poNumber, quot.vendor_id,
      vendor.rows[0]?.code, vendor.rows[0]?.name,
      quot.id, quot.currency_id, quot.exchange_rate || 1,
      quot.payment_terms_id, quot.delivery_terms_id, quot.supply_terms_id,
      quot.project_id, quot.subtotal || quot.total_amount,
      quot.tax_amount || 0, quot.discount_amount || 0, quot.total_amount,
      draftStatus.rows[0]?.id, userId
    ]);
    const poId = poResult.rows[0].id;

    // Copy items
    const items = await client.query(
      'SELECT * FROM vendor_quotation_items WHERE quotation_id = $1', [id]
    );
    for (const item of items.rows) {
      await client.query(`
        INSERT INTO purchase_order_items
        (order_id, item_id, item_code, item_name, uom_id, quantity, unit_price,
         discount_amount, tax_amount, line_total, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [poId, item.item_id, item.item_code, item.item_name,
          item.uom_id, item.quantity, item.unit_price,
          item.discount_amount || 0, item.tax_amount || 0,
          item.line_total, item.notes]);
    }

    // Mark quotation as converted
    await client.query(
      'UPDATE vendor_quotations SET converted_to_po_id = $1 WHERE id = $2',
      [poId, id]
    );

    await client.query('COMMIT');

    logger.info('Quotation converted to PO', { quotationId: id, poId, poNumber, userId });
    res.json({ success: true, po_id: poId, po_number: poNumber, message: 'تم تحويل عرض السعر إلى أمر شراء بنجاح' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error converting quotation to PO:', error);
    res.status(500).json({ success: false, error: { code: 'CONVERT_ERROR', message: 'Failed to convert quotation to PO' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/quotations/:id/reject - Reject quotation
router.put('/:id/reject', requirePermission('vendor_quotations:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET status = 'rejected', rejected_reason = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL AND status = 'pending'
      RETURNING *
    `, [reason || null, userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found or cannot be rejected' } });
    }

    logger.info('Vendor quotation rejected', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error rejecting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'REJECT_ERROR', message: 'Failed to reject quotation' } });
  }
});

// DELETE /api/procurement/quotations/:id - Soft delete quotation
router.delete('/:id', requirePermission('vendor_quotations:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check if quotation is in a deletable state
    const existing = await pool.query(
      'SELECT status FROM vendor_quotations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }

    if (existing.rows[0].status === 'accepted') {
      return res.status(400).json({ success: false, error: { code: 'DELETE_BLOCKED', message: 'Cannot delete accepted quotation' } });
    }

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id, companyId]);

    logger.info('Vendor quotation deleted', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error deleting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete quotation' } });
  }
});

export default router;
