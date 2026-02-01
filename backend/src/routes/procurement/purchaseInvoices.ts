import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { DocumentStateMachine, DocumentState } from '../../utils/documentStateMachine';
import JournalEntryService from '../../services/journalEntryService';
import ThreeWayMatchingService from '../../services/threeWayMatchingService';
import DocumentAuditService from '../../services/documentAuditService';
import { DocumentNumberService } from '../../services/documentNumberService';
import { ProcurementSettingsService } from '../../services/procurementSettingsService';
import { checkNeedsApproval, createApprovalRequest, isDocumentApproved } from '../../utils/approvalHelpers';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// PURCHASE INVOICES - Full CRUD
// ============================================

// GET /api/procurement/invoices - List invoices
router.get('/', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, vendor_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE pi.company_id = $1 AND pi.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (pi.invoice_number ILIKE $${paramIndex} OR pi.vendor_invoice_number ILIKE $${paramIndex} OR pi.vendor_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND pi.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND pi.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND pi.invoice_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND pi.invoice_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM purchase_invoices pi ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        pi.*,
        v.name as vendor_display_name,
        c.code as currency_code, c.symbol as currency_symbol,
        po.order_number as po_number
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      LEFT JOIN currencies c ON pi.currency_id = c.id
      LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
      ${whereClause}
      ORDER BY pi.invoice_date DESC, pi.invoice_number DESC
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
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoices' } });
  }
});

// GET /api/procurement/invoices/:id - Get single invoice with items
router.get('/:id', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const invResult = await pool.query(`
      SELECT 
        pi.*,
        v.name as vendor_display_name, v.name_ar as vendor_display_name_ar,
        c.code as currency_code, c.symbol as currency_symbol,
        po.order_number as po_number,
        vpt.name as payment_terms_name
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      LEFT JOIN currencies c ON pi.currency_id = c.id
      LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
      LEFT JOIN vendor_payment_terms vpt ON pi.payment_terms_id = vpt.id
      WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        pii.*,
        i.code as item_display_code, i.name as item_display_name,
        u.code as uom_code, u.name as uom_name,
        a.code as expense_account_code, a.name as expense_account_name
      FROM purchase_invoice_items pii
      LEFT JOIN items i ON pii.item_id = i.id
      LEFT JOIN units_of_measure u ON pii.uom_id = u.id
      LEFT JOIN accounts a ON pii.expense_account_id = a.id
      WHERE pii.invoice_id = $1
      ORDER BY pii.line_number
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...invResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoice' } });
  }
});

// POST /api/procurement/invoices - Create invoice
router.post('/', requirePermission('purchase_invoices:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      invoice_date, due_date, vendor_id, vendor_invoice_number, vendor_invoice_date,
      purchase_order_id, goods_receipt_id, currency_id, exchange_rate, payment_terms_id,
      discount_amount, freight_amount, notes, cost_center_id, items
    } = req.body;

    if (!invoice_date || !vendor_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invoice date and vendor required' } });
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

    // ═══════════════════════════════════════════════════
    // 🔢 DOCUMENT NUMBERING SERVICE (NEW)
    // ═══════════════════════════════════════════════════
    const generatedNumber = await DocumentNumberService.generateNumber(companyId, 'purchase_invoice');
    const invoiceNumber = generatedNumber.number;
    
    // ═══════════════════════════════════════════════════
    // ⚙️ GET PROCUREMENT SETTINGS FOR MATCHING CONFIG
    // ═══════════════════════════════════════════════════
    const procSettings = await ProcurementSettingsService.getSettings(companyId);

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;
      subtotal += lineTotal - itemDiscount;
      taxAmount += itemTax;
    }

    const totalAmount = subtotal - (discount_amount || 0) + taxAmount + (freight_amount || 0);

    // Insert invoice
    const invResult = await client.query(`
      INSERT INTO purchase_invoices (
        company_id, invoice_number, invoice_date, due_date,
        vendor_id, vendor_code, vendor_name, vendor_invoice_number, vendor_invoice_date,
        purchase_order_id, goods_receipt_id, currency_id, exchange_rate, payment_terms_id,
        subtotal, discount_amount, tax_amount, freight_amount, total_amount, balance,
        status, cost_center_id, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $19, 'draft', $20, $21, $22
      ) RETURNING *
    `, [
      companyId, invoiceNumber, invoice_date, due_date,
      vendor_id, vendorResult.rows[0].code, vendorResult.rows[0].name, vendor_invoice_number, vendor_invoice_date,
      purchase_order_id, goods_receipt_id, currency_id, exchange_rate || 1, payment_terms_id,
      subtotal, discount_amount || 0, taxAmount, freight_amount || 0, totalAmount,
      cost_center_id, notes, userId
    ]);

    const invoiceId = invResult.rows[0].id;

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;

      await client.query(`
        INSERT INTO purchase_invoice_items (
          invoice_id, line_number, purchase_order_item_id, goods_receipt_item_id,
          item_id, item_code, item_name, expense_account_id, description,
          uom_id, quantity, unit_price, discount_percent, discount_amount,
          tax_rate_id, tax_rate, tax_amount, line_total, cost_center_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `, [
        invoiceId, i + 1, item.purchase_order_item_id, item.goods_receipt_item_id,
        item.item_id, item.item_code, item.item_name, item.expense_account_id, item.description,
        item.uom_id, item.quantity, item.unit_price, item.discount_percent || 0, itemDiscount,
        item.tax_rate_id, item.tax_rate || 0, itemTax, lineTotal - itemDiscount + itemTax, item.cost_center_id || cost_center_id, item.notes
      ]);
    }

    await client.query('COMMIT');

    logger.info('Purchase invoice created', { invoiceId, invoiceNumber, userId });
    res.status(201).json({ success: true, data: invResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating invoice:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create invoice' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/invoices/:id - Update invoice (draft only)
router.put('/:id', requirePermission('purchase_invoices:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const {
      invoice_date, due_date, vendor_id, vendor_invoice_number, vendor_invoice_date,
      purchase_order_id, goods_receipt_id, currency_id, exchange_rate, payment_terms_id,
      discount_amount, freight_amount, notes, cost_center_id, items
    } = req.body;

    if (!invoice_date || !vendor_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invoice date and vendor required' } });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } });
    }

    await client.query('BEGIN');

    // Check if invoice exists and is draft
    const checkResult = await client.query(
      'SELECT id, status, is_posted FROM purchase_invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = checkResult.rows[0];
    if (invoice.is_posted || invoice.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'CANNOT_EDIT', message: 'Cannot edit posted or non-draft invoice' } });
    }

    // Get vendor info
    const vendorResult = await client.query(
      'SELECT code, name FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [vendor_id, companyId]
    );
    if (vendorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'INVALID_VENDOR', message: 'Vendor not found' } });
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;
      subtotal += lineTotal;
      totalTax += itemTax;
    }
    const totalAmount = subtotal - (discount_amount || 0) + totalTax + (freight_amount || 0);

    // Update invoice
    const invResult = await client.query(`
      UPDATE purchase_invoices SET
        invoice_date = $1, due_date = $2, vendor_id = $3, vendor_code = $4, vendor_name = $5,
        vendor_invoice_number = $6, vendor_invoice_date = $7, purchase_order_id = $8,
        goods_receipt_id = $9, currency_id = $10, exchange_rate = $11, payment_terms_id = $12,
        subtotal = $13, discount_amount = $14, freight_amount = $15, tax_amount = $16,
        total_amount = $17, notes = $18, cost_center_id = $19, updated_by = $20, updated_at = CURRENT_TIMESTAMP
      WHERE id = $21 AND company_id = $22
      RETURNING *
    `, [
      invoice_date, due_date, vendor_id, vendorResult.rows[0].code, vendorResult.rows[0].name,
      vendor_invoice_number, vendor_invoice_date, purchase_order_id,
      goods_receipt_id, currency_id, exchange_rate || 1, payment_terms_id,
      subtotal, discount_amount || 0, freight_amount || 0, totalTax,
      totalAmount, notes, cost_center_id, userId, id, companyId
    ]);

    // Delete existing items
    await client.query('DELETE FROM purchase_invoice_items WHERE invoice_id = $1', [id]);

    // Insert updated items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;

      await client.query(`
        INSERT INTO purchase_invoice_items (
          invoice_id, line_number, purchase_order_item_id, goods_receipt_item_id,
          item_id, item_code, item_name, expense_account_id, description,
          uom_id, quantity, unit_price, discount_percent, discount_amount,
          tax_rate_id, tax_rate, tax_amount, line_total, cost_center_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `, [
        id, i + 1, item.purchase_order_item_id, item.goods_receipt_item_id,
        item.item_id, item.item_code, item.item_name, item.expense_account_id, item.description,
        item.uom_id, item.quantity, item.unit_price, item.discount_percent || 0, itemDiscount,
        item.tax_rate_id, item.tax_rate || 0, itemTax, lineTotal - itemDiscount + itemTax, item.cost_center_id || cost_center_id, item.notes
      ]);
    }

    await client.query('COMMIT');

    logger.info('Purchase invoice updated', { invoiceId: id, userId });
    res.json({ success: true, data: invResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating invoice:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update invoice' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/invoices/:id/post - Post invoice (creates journal entry & updates vendor balance)
router.put('/:id/post', requirePermission('purchase_invoices:post'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { force_post, matching_override_reason } = req.body;

    // Get invoice with state info
    const invResult = await client.query(`
      SELECT 
        pi.*, 
        v.payable_account_id as vendor_payable_account,
        v.name as vendor_name,
        COALESCE(pi.is_posted, FALSE) as is_posted,
        COALESCE(pi.is_approved, FALSE) as is_approved,
        COALESCE(pi.is_reversed, FALSE) as is_reversed,
        COALESCE(pi.is_locked, FALSE) as is_locked
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = invResult.rows[0];

    // Check document state using state machine
    const documentState: DocumentState = {
      status: invoice.status,
      is_posted: invoice.is_posted,
      is_approved: invoice.is_approved,
      is_reversed: invoice.is_reversed,
      is_cancelled: invoice.status === 'cancelled',
      is_locked: invoice.is_locked
    };

    const canPost = DocumentStateMachine.canPost('purchase_invoice', documentState, ['purchase_invoices:post']);
    if (!canPost.allowed) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'POST_NOT_ALLOWED', 
          message: canPost.reason,
          message_ar: canPost.reason_ar,
          requires_reversal: canPost.requires_reversal
        } 
      });
    }

    // Check if approval is required
    const approvalCheck = await checkNeedsApproval(
      companyId,
      'purchase_invoices',
      parseFloat(invoice.total_amount)
    );

    if (approvalCheck.needsApproval) {
      // Check if already approved
      const isApproved = await isDocumentApproved('purchase_invoices', parseInt(id));
      
      if (!isApproved) {
        // Create approval request if not exists
        const existingApproval = await client.query(
          `SELECT id FROM approval_requests 
           WHERE document_type = 'purchase_invoice' AND document_id = $1 
           AND company_id = $2 AND status = 'pending' AND deleted_at IS NULL`,
          [id, companyId]
        );

        if (existingApproval.rows.length === 0) {
          await createApprovalRequest(
            companyId,
            approvalCheck.workflowId!,
            'purchase_invoice',
            parseInt(id),
            invoice.invoice_number,
            parseFloat(invoice.total_amount),
            userId,
            'Auto-generated approval request on posting attempt'
          );
        }

        return res.status(403).json({
          success: false,
          error: {
            code: 'APPROVAL_REQUIRED',
            message: 'Approval required before posting',
            message_ar: 'مطلوب اعتماد قبل الترحيل',
            approval_required: true,
            workflow_name: approvalCheck.workflowName,
            required_role: approvalCheck.approvalRole
          }
        });
      }
    }

    // 3-Way Matching Validation
    if (invoice.purchase_order_id || invoice.goods_receipt_id) {
      const matchingResult = await ThreeWayMatchingService.validateInvoice(parseInt(id), companyId);
      
      if (matchingResult.requires_approval && !force_post) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MATCHING_VARIANCE',
            message: 'Invoice has matching variances that require approval',
            message_ar: 'الفاتورة بها فروقات تتطلب الاعتماد'
          },
          matching: matchingResult
        });
      }

      // Log matching override if forced
      if (matchingResult.variances.length > 0 && force_post) {
        logger.warn('Invoice posted with matching variances', {
          invoiceId: id,
          variances: matchingResult.variances,
          override_reason: matching_override_reason,
          userId
        });
      }
    }

    await client.query('BEGIN');

    // Get invoice items for journal entry
    const itemsResult = await client.query(`
      SELECT item_id, item_name, line_total, item_id IS NOT NULL as is_inventory
      FROM purchase_invoice_items
      WHERE invoice_id = $1
    `, [id]);

    const items = itemsResult.rows.map(row => ({
      item_id: row.item_id,
      item_name: row.item_name,
      amount: parseFloat(row.line_total) || 0,
      is_inventory: row.is_inventory
    }));

    // Create Journal Entry
    let journalEntryId: number | null = null;
    try {
      journalEntryId = await JournalEntryService.createPurchaseInvoiceEntry(
        parseInt(id),
        invoice.invoice_number,
        companyId,
        invoice.vendor_id,
        invoice.vendor_name,
        invoice.invoice_date,
        parseFloat(invoice.subtotal) || 0,
        parseFloat(invoice.tax_amount) || 0,
        parseFloat(invoice.total_amount) || 0,
        items,
        userId,
        invoice.currency_id
      );
    } catch (journalError) {
      logger.error('Journal entry creation failed:', journalError);
      // Continue without journal if chart of accounts not set up
    }

    // Update invoice status
    await client.query(`
      UPDATE purchase_invoices 
      SET status = 'posted', 
          is_posted = TRUE, 
          is_locked = TRUE,
          journal_entry_id = $1,
          posted_by = $2, 
          posted_at = CURRENT_TIMESTAMP, 
          updated_by = $2, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [journalEntryId, userId, id]);

    // Update vendor balance (credit = we owe more)
    await client.query(`
      UPDATE vendors 
      SET current_balance = COALESCE(current_balance, 0) + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [invoice.total_amount, invoice.vendor_id]);

    // Insert balance transaction
    await client.query(`
      INSERT INTO vendor_balance_transactions (
        company_id, vendor_id, transaction_date, document_type, document_id, document_number,
        currency_id, credit_amount, balance_after, created_by
      ) VALUES ($1, $2, $3, 'purchase_invoice', $4, $5, $6, $7, 
        (SELECT COALESCE(current_balance, 0) FROM vendors WHERE id = $2), $8)
    `, [companyId, invoice.vendor_id, invoice.invoice_date, id, invoice.invoice_number, invoice.currency_id, invoice.total_amount, userId]);

    // Log audit trail
    await DocumentAuditService.logPosted(
      companyId,
      'purchase_invoice',
      parseInt(id),
      invoice.invoice_number,
      invoice.status,
      {
        journal_entry_id: journalEntryId,
        total_amount: invoice.total_amount,
        vendor_balance_updated: true
      },
      userId,
      req.ip
    );

    await client.query('COMMIT');

    // Get side effects for response
    const sideEffects = DocumentStateMachine.getPostSideEffects('purchase_invoice');

    logger.info('Purchase invoice posted', { invoiceId: id, journalEntryId, amount: invoice.total_amount, userId });
    res.json({ 
      success: true, 
      message: 'Invoice posted successfully',
      message_ar: 'تم ترحيل الفاتورة بنجاح',
      journal_entry_id: journalEntryId,
      side_effects: sideEffects
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error posting invoice:', error);
    res.status(500).json({ success: false, error: { code: 'POST_ERROR', message: 'Failed to post invoice' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/invoices/:id/reverse - Reverse a posted invoice
router.put('/:id/reverse', requirePermission('purchase_invoices:reverse'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { reason, reason_ar } = req.body;

    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Reversal reason is required' } 
      });
    }

    // Get invoice
    const invResult = await client.query(`
      SELECT 
        pi.*, 
        v.name as vendor_name,
        COALESCE(pi.is_posted, FALSE) as is_posted,
        COALESCE(pi.is_reversed, FALSE) as is_reversed
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = invResult.rows[0];

    // Check if can reverse using state machine
    const documentState: DocumentState = {
      status: invoice.status,
      is_posted: invoice.is_posted,
      is_approved: invoice.is_approved || false,
      is_reversed: invoice.is_reversed,
      is_cancelled: invoice.status === 'cancelled',
      is_locked: invoice.is_locked || false
    };

    const canReverse = DocumentStateMachine.canReverse('purchase_invoice', documentState, ['purchase_invoices:reverse']);
    if (!canReverse.allowed) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'REVERSE_NOT_ALLOWED', 
          message: canReverse.reason,
          message_ar: canReverse.reason_ar
        } 
      });
    }

    await client.query('BEGIN');

    // Get invoice items for reversal journal entry
    const itemsResult = await client.query(`
      SELECT item_id, item_name, line_total, item_id IS NOT NULL as is_inventory
      FROM purchase_invoice_items
      WHERE invoice_id = $1
    `, [id]);

    const items = itemsResult.rows.map(row => ({
      item_id: row.item_id,
      item_name: row.item_name,
      amount: parseFloat(row.line_total) || 0,
      is_inventory: row.is_inventory
    }));

    // Create Reversal Journal Entry
    let reversalJournalEntryId: number | null = null;
    try {
      reversalJournalEntryId = await JournalEntryService.createPurchaseInvoiceReversalEntry(
        parseInt(id),
        invoice.invoice_number,
        companyId,
        invoice.vendor_id,
        invoice.vendor_name,
        new Date().toISOString().split('T')[0],
        parseFloat(invoice.subtotal) || 0,
        parseFloat(invoice.tax_amount) || 0,
        parseFloat(invoice.total_amount) || 0,
        items,
        userId,
        invoice.currency_id
      );
    } catch (journalError) {
      logger.error('Reversal journal entry creation failed:', journalError);
    }

    // Update invoice status to reversed
    await client.query(`
      UPDATE purchase_invoices 
      SET status = 'reversed', 
          is_reversed = TRUE,
          reversed_by = $1, 
          reversed_at = CURRENT_TIMESTAMP,
          reversal_reason = $2,
          updated_by = $1, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [userId, reason, id]);

    // Reverse vendor balance (debit = reduce what we owe)
    await client.query(`
      UPDATE vendors 
      SET current_balance = COALESCE(current_balance, 0) - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [invoice.total_amount, invoice.vendor_id]);

    // Insert reversal balance transaction
    await client.query(`
      INSERT INTO vendor_balance_transactions (
        company_id, vendor_id, transaction_date, document_type, document_id, document_number,
        currency_id, debit_amount, balance_after, notes, created_by
      ) VALUES ($1, $2, CURRENT_DATE, 'invoice_reversal', $3, $4, $5, $6, 
        (SELECT COALESCE(current_balance, 0) FROM vendors WHERE id = $2), $7, $8)
    `, [companyId, invoice.vendor_id, id, `REV-${invoice.invoice_number}`, invoice.currency_id, invoice.total_amount, reason, userId]);

    // Log audit trail
    await DocumentAuditService.logReversed(
      companyId,
      'purchase_invoice',
      parseInt(id),
      invoice.invoice_number,
      reason,
      reason_ar || reason,
      {
        reversal_journal_entry_id: reversalJournalEntryId,
        original_amount: invoice.total_amount,
        vendor_balance_reversed: true
      },
      userId,
      req.ip
    );

    await client.query('COMMIT');

    const sideEffects = DocumentStateMachine.getReverseSideEffects('purchase_invoice');

    logger.info('Purchase invoice reversed', { invoiceId: id, reversalJournalEntryId, reason, userId });
    res.json({ 
      success: true, 
      message: 'Invoice reversed successfully',
      message_ar: 'تم عكس الفاتورة بنجاح',
      reversal_journal_entry_id: reversalJournalEntryId,
      side_effects: sideEffects
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error reversing invoice:', error);
    res.status(500).json({ success: false, error: { code: 'REVERSE_ERROR', message: 'Failed to reverse invoice' } });
  } finally {
    client.release();
  }
});

// GET /api/procurement/invoices/:id/matching - Get 3-way matching status
router.get('/:id/matching', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const matchingResult = await ThreeWayMatchingService.validateInvoice(parseInt(id), companyId);
    
    res.json({ success: true, data: matchingResult });
  } catch (error) {
    logger.error('Error getting matching status:', error);
    res.status(500).json({ success: false, error: { code: 'MATCHING_ERROR', message: 'Failed to get matching status' } });
  }
});

// GET /api/procurement/invoices/:id/side-effects - Get side effects preview before posting
router.get('/:id/side-effects', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { action } = req.query;

    // Get invoice
    const invResult = await pool.query(`
      SELECT pi.*, v.name as vendor_name
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = invResult.rows[0];

    let sideEffects;
    if (action === 'reverse') {
      sideEffects = DocumentStateMachine.getReverseSideEffects('purchase_invoice');
    } else {
      sideEffects = DocumentStateMachine.getPostSideEffects('purchase_invoice');
    }

    // Add specific amounts
    const response = {
      ...sideEffects,
      details: {
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        vendor_name: invoice.vendor_name,
        vendor_balance_change: action === 'reverse' ? -invoice.total_amount : invoice.total_amount
      }
    };

    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Error getting side effects:', error);
    res.status(500).json({ success: false, error: { code: 'SIDE_EFFECTS_ERROR', message: 'Failed to get side effects' } });
  }
});

// GET /api/procurement/invoices/:id/history - Get document audit trail
router.get('/:id/history', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await DocumentAuditService.getDocumentHistory('purchase_invoice', parseInt(id));
    
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Error getting invoice history:', error);
    res.status(500).json({ success: false, error: { code: 'HISTORY_ERROR', message: 'Failed to get invoice history' } });
  }
});

// GET /api/procurement/invoices/:id/journal-entries - Get related journal entries
router.get('/:id/journal-entries', requirePermission('purchase_invoices:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entries = await JournalEntryService.getEntriesForDocument('purchase_invoice', parseInt(id));
    
    res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('Error getting journal entries:', error);
    res.status(500).json({ success: false, error: { code: 'JOURNAL_ERROR', message: 'Failed to get journal entries' } });
  }
});

// DELETE /api/procurement/invoices/:id - Soft delete (only if allowed by state machine)
router.delete('/:id', requirePermission('purchase_invoices:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const current = await pool.query(`
      SELECT 
        status, 
        invoice_number,
        COALESCE(is_posted, FALSE) as is_posted,
        COALESCE(is_approved, FALSE) as is_approved,
        COALESCE(is_reversed, FALSE) as is_reversed,
        COALESCE(is_locked, FALSE) as is_locked
      FROM purchase_invoices 
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = current.rows[0];

    // Check if can delete using state machine
    const documentState: DocumentState = {
      status: invoice.status,
      is_posted: invoice.is_posted,
      is_approved: invoice.is_approved,
      is_reversed: invoice.is_reversed,
      is_cancelled: invoice.status === 'cancelled',
      is_locked: invoice.is_locked
    };

    const canDelete = DocumentStateMachine.canDelete('purchase_invoice', documentState, ['purchase_invoices:delete']);
    if (!canDelete.allowed) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'DELETE_NOT_ALLOWED', 
          message: canDelete.reason,
          message_ar: canDelete.reason_ar,
          requires_reversal: canDelete.requires_reversal
        } 
      });
    }

    await pool.query(
      'UPDATE purchase_invoices SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2',
      [userId, id]
    );

    // Log audit trail
    await DocumentAuditService.log({
      company_id: companyId,
      document_type: 'purchase_invoice',
      document_id: parseInt(id),
      document_number: invoice.invoice_number,
      action: 'deleted',
      previous_status: invoice.status,
      new_status: 'deleted',
      performed_by: userId,
      ip_address: req.ip
    });

    logger.info('Purchase invoice deleted', { invoiceId: id, userId });
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    logger.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete invoice' } });
  }
});

// =============================================
// APPROVAL WORKFLOW ROUTES
// =============================================

// POST /api/procurement/invoices/:id/approve - Approve invoice
router.post('/:id/approve', requirePermission('purchase_invoices:approve'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { comment } = req.body;

    await client.query('BEGIN');

    // Get invoice
    const invResult = await client.query(`
      SELECT * FROM purchase_invoices 
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = invResult.rows[0];

    // Check if already approved
    if (invoice.status === 'approved' || invoice.status === 'posted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: { code: 'ALREADY_APPROVED', message: 'Invoice is already approved' } 
      });
    }

    // Update invoice status
    await client.query(`
      UPDATE purchase_invoices 
      SET status = 'approved',
          is_approved = TRUE,
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
      WHERE id = $2
    `, [userId, id]);

    // Update approval request if exists
    await client.query(`
      UPDATE approval_requests 
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          approval_notes = $2
      WHERE document_type = 'purchase_invoice' 
        AND document_id = $3 
        AND company_id = $4
        AND status = 'pending'
    `, [userId, comment || 'Approved', id, companyId]);

    // Log audit trail
    await DocumentAuditService.log({
      company_id: companyId,
      document_type: 'purchase_invoice',
      document_id: parseInt(id),
      document_number: invoice.invoice_number,
      action: 'approved',
      previous_status: invoice.status,
      new_status: 'approved',
      performed_by: userId,
      ip_address: req.ip,
      reason: comment
    });

    await client.query('COMMIT');
    
    logger.info('Purchase invoice approved', { invoiceId: id, userId });
    res.json({ 
      success: true, 
      message: 'Invoice approved successfully',
      data: { id: parseInt(id), status: 'approved' }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving invoice:', error);
    res.status(500).json({ success: false, error: { code: 'APPROVE_ERROR', message: 'Failed to approve invoice' } });
  } finally {
    client.release();
  }
});

// POST /api/procurement/invoices/:id/reject - Reject invoice
router.post('/:id/reject', requirePermission('purchase_invoices:approve'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'COMMENT_REQUIRED', message: 'Rejection reason is required' } 
      });
    }

    await client.query('BEGIN');

    // Get invoice
    const invResult = await client.query(`
      SELECT * FROM purchase_invoices 
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (invResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const invoice = invResult.rows[0];

    // Check if can be rejected
    if (invoice.status === 'posted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: { code: 'CANNOT_REJECT_POSTED', message: 'Cannot reject a posted invoice' } 
      });
    }

    // Update invoice status
    await client.query(`
      UPDATE purchase_invoices 
      SET status = 'rejected',
          is_approved = FALSE,
          rejection_reason = $1,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
      WHERE id = $3
    `, [comment, userId, id]);

    // Update approval request if exists
    await client.query(`
      UPDATE approval_requests 
      SET status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          approval_notes = $2
      WHERE document_type = 'purchase_invoice' 
        AND document_id = $3 
        AND company_id = $4
        AND status = 'pending'
    `, [userId, comment, id, companyId]);

    // Log audit trail
    await DocumentAuditService.log({
      company_id: companyId,
      document_type: 'purchase_invoice',
      document_id: parseInt(id),
      document_number: invoice.invoice_number,
      action: 'rejected',
      previous_status: invoice.status,
      new_status: 'rejected',
      performed_by: userId,
      ip_address: req.ip,
      reason: comment
    });

    await client.query('COMMIT');
    
    logger.info('Purchase invoice rejected', { invoiceId: id, userId, reason: comment });
    res.json({ 
      success: true, 
      message: 'Invoice rejected',
      data: { id: parseInt(id), status: 'rejected' }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error rejecting invoice:', error);
    res.status(500).json({ success: false, error: { code: 'REJECT_ERROR', message: 'Failed to reject invoice' } });
  } finally {
    client.release();
  }
});

export default router;
