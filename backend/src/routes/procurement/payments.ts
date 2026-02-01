import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';
import { checkNeedsApproval, createApprovalRequest, isDocumentApproved } from '../../utils/approvalHelpers';

const router = Router();

/**
 * GET /api/procurement/payments
 * List vendor payments with filters
 */
router.get('/', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { vendor_id, status, from_date, to_date, unallocated_only } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let query = `
      SELECT 
        vp.*,
        v.code as vendor_code,
        v.name as vendor_name,
        c.code as currency_code,
        u.email as created_by_email,
        -- Linked entities
        po.order_number as purchase_order_number,
        ls.shipment_number,
        ls.bl_no as shipment_bl_no,
        lc.lc_number,
        p.code as project_code,
        p.name as project_name,
        ba.account_number as bank_account_number,
        ba.account_name as bank_account_name,
        b.name as bank_name
      FROM vendor_payments vp
      INNER JOIN vendors v ON vp.vendor_id = v.id
      INNER JOIN currencies c ON vp.currency_id = c.id
      LEFT JOIN users u ON vp.created_by = u.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON vp.shipment_id = ls.id
      LEFT JOIN letters_of_credit lc ON vp.lc_id = lc.id
      LEFT JOIN projects p ON vp.project_id = p.id
      LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      WHERE vp.company_id = $1
        AND vp.deleted_at IS NULL
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    if (vendor_id) {
      query += ` AND vp.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND vp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (from_date) {
      query += ` AND vp.payment_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND vp.payment_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    if (unallocated_only === 'true') {
      query += ` AND vp.unallocated_amount > 0`;
    }

    query += ` ORDER BY vp.payment_date DESC, vp.id DESC`;

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * GET /api/procurement/payments/reference-data/all
 * Get all reference data needed for payment creation form
 * NOTE: This route MUST be before /:id to avoid matching issues
 */
router.get('/reference-data/all', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get payment methods
    const paymentMethodsResult = await pool.query(
      `SELECT id, code, name, name_ar, payment_type, is_default 
       FROM payment_methods 
       WHERE (company_id = $1 OR company_id IS NULL) AND is_active = true AND deleted_at IS NULL
       ORDER BY name`,
      [companyId]
    );

    // Get cash boxes
    const cashBoxesResult = await pool.query(
      `SELECT cb.id, cb.code, cb.name, cb.name_ar, c.code as currency_code, cb.is_default
       FROM cash_boxes cb
       LEFT JOIN currencies c ON cb.currency_id = c.id
       WHERE cb.company_id = $1 AND cb.is_active = true AND cb.deleted_at IS NULL
       ORDER BY cb.name`,
      [companyId]
    );

    // Get bank accounts
    const bankAccountsResult = await pool.query(
      `SELECT ba.id, ba.account_number, ba.account_name, b.name as bank_name, c.code as currency_code, ba.is_default
       FROM bank_accounts ba
       LEFT JOIN banks b ON ba.bank_id = b.id
       LEFT JOIN currencies c ON ba.currency_id = c.id
       WHERE ba.company_id = $1 AND ba.is_active = true AND ba.deleted_at IS NULL
       ORDER BY b.name, ba.account_name`,
      [companyId]
    );

    // Get active LCs
    const lcsResult = await pool.query(
      `SELECT lc.id, lc.lc_number, lc.current_amount, lc.available_amount, c.code as currency_code, 
              ba.id as bank_account_id, b.name as bank_name,
              lc.beneficiary_vendor_id as vendor_id, v.name as vendor_name
       FROM letters_of_credit lc
       LEFT JOIN currencies c ON lc.currency_id = c.id
       LEFT JOIN bank_accounts ba ON lc.issuing_bank_id = ba.id
       LEFT JOIN banks b ON ba.bank_id = b.id
       LEFT JOIN vendors v ON lc.beneficiary_vendor_id = v.id
       LEFT JOIN lc_statuses ls ON lc.status_id = ls.id
       WHERE lc.company_id = $1 AND ls.code IN ('active', 'confirmed', 'partial_utilized') AND lc.deleted_at IS NULL
       ORDER BY lc.lc_number`,
      [companyId]
    );

    res.json({
      data: {
        paymentMethods: paymentMethodsResult.rows,
        cashBoxes: cashBoxesResult.rows,
        bankAccounts: bankAccountsResult.rows,
        lettersOfCredit: lcsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching reference data:', error);
    res.status(500).json({ error: 'Failed to fetch reference data' });
  }
});

/**
 * GET /api/procurement/payments/:id
 * Get single payment with allocations
 */
router.get('/:id', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get payment
    const paymentResult = await pool.query(
      `SELECT 
        vp.*,
        v.code as vendor_code,
        v.name as vendor_name,
        c.code as currency_code,
        -- Linked entities
        po.order_number as purchase_order_number,
        ls.shipment_number,
        ls.bl_no as shipment_bl_no,
        lc.lc_number,
        p.code as project_code,
        p.name as project_name,
        ba.account_number as bank_account_number,
        ba.account_name as bank_account_name,
        b.name as bank_name,
        -- Transfer request info if exists
        (SELECT tr.id FROM transfer_requests tr WHERE tr.source_vendor_payment_id = vp.id AND tr.deleted_at IS NULL LIMIT 1) as transfer_request_id,
        (SELECT tr.request_number FROM transfer_requests tr WHERE tr.source_vendor_payment_id = vp.id AND tr.deleted_at IS NULL LIMIT 1) as transfer_request_number
      FROM vendor_payments vp
      INNER JOIN vendors v ON vp.vendor_id = v.id
      INNER JOIN currencies c ON vp.currency_id = c.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON vp.shipment_id = ls.id
      LEFT JOIN letters_of_credit lc ON vp.lc_id = lc.id
      LEFT JOIN projects p ON vp.project_id = p.id
      LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      WHERE vp.id = $1 AND vp.company_id = $2 AND vp.deleted_at IS NULL`,
      [id, companyId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Get allocations
    const allocationsResult = await pool.query(
      `SELECT 
        vpa.*,
        pi.invoice_number,
        pi.total_amount as invoice_total,
        pi.balance as invoice_balance
      FROM vendor_payment_allocations vpa
      INNER JOIN purchase_invoices pi ON vpa.invoice_id = pi.id
      WHERE vpa.payment_id = $1 AND vpa.deleted_at IS NULL
      ORDER BY vpa.allocation_date DESC`,
      [id]
    );

    res.json({
      data: {
        ...paymentResult.rows[0],
        allocations: allocationsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

/**
 * POST /api/procurement/payments
 * Create new vendor payment
 */
router.post('/', authenticate, loadCompanyContext, requirePermission('procurement:payments:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const {
      vendor_id,
      payment_date,
      payment_method,
      payment_amount,
      currency_id,
      reference_number,
      exchange_rate,
      notes,
      status,
      // Linked entity fields
      purchase_order_id,
      shipment_id,
      lc_id,
      project_id,
      bank_account_id,
      // New fields from migration 194
      quotation_id,
      invoice_id,
      source_type,
      cash_box_id,
      // Auto-generated description
      description
    } = req.body;

    // Validation
    if (!vendor_id || !payment_date || !payment_amount || !currency_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (payment_amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be positive' });
    }

    await client.query('BEGIN');

    // Resolve project_id from linked documents if not directly provided
    let resolvedProjectId = project_id;
    let documentTotalAmount = 0;
    let projectCode = null;

    // Get project from linked document (PO or Shipment)
    if (!resolvedProjectId && purchase_order_id) {
      const poResult = await client.query(
        `SELECT po.project_id, po.total_amount, p.code as project_code 
         FROM purchase_orders po 
         LEFT JOIN projects p ON po.project_id = p.id
         WHERE po.id = $1 AND po.company_id = $2`,
        [purchase_order_id, companyId]
      );
      if (poResult.rows.length > 0 && poResult.rows[0].project_id) {
        resolvedProjectId = poResult.rows[0].project_id;
        documentTotalAmount = parseFloat(poResult.rows[0].total_amount || 0);
        projectCode = poResult.rows[0].project_code;
      }
    }
    
    if (!resolvedProjectId && shipment_id) {
      const shipResult = await client.query(
        `SELECT ls.project_id, po.total_amount, p.code as project_code 
         FROM logistics_shipments ls 
         LEFT JOIN purchase_orders po ON ls.purchase_order_id = po.id
         LEFT JOIN projects p ON ls.project_id = p.id
         WHERE ls.id = $1 AND ls.company_id = $2`,
        [shipment_id, companyId]
      );
      if (shipResult.rows.length > 0 && shipResult.rows[0].project_id) {
        resolvedProjectId = shipResult.rows[0].project_id;
        documentTotalAmount = parseFloat(shipResult.rows[0].total_amount || 0);
        projectCode = shipResult.rows[0].project_code;
      }
    }

    // Check if project is already fully paid (across all documents for same vendor and project)
    if (resolvedProjectId && vendor_id) {
      const projectPaymentsResult = await client.query(
        `SELECT 
           SUM(vp.payment_amount) as total_paid,
           (
             SELECT COALESCE(SUM(po.total_amount), 0)
             FROM purchase_orders po
             WHERE po.project_id = $1 AND po.vendor_id = $2 AND po.company_id = $3 AND po.deleted_at IS NULL
           ) as project_total_po_amount
         FROM vendor_payments vp
         WHERE vp.company_id = $3
           AND vp.vendor_id = $2
           AND vp.deleted_at IS NULL
           AND vp.status != 'cancelled'
           AND (
             vp.project_id = $1
             OR vp.purchase_order_id IN (SELECT id FROM purchase_orders WHERE project_id = $1 AND deleted_at IS NULL)
             OR vp.shipment_id IN (SELECT id FROM logistics_shipments WHERE project_id = $1 AND deleted_at IS NULL)
             OR vp.invoice_id IN (
               SELECT pi.id FROM purchase_invoices pi 
               INNER JOIN purchase_orders po ON pi.purchase_order_id = po.id 
               WHERE po.project_id = $1 AND pi.deleted_at IS NULL
             )
           )`,
        [resolvedProjectId, vendor_id, companyId]
      );

      const totalPaid = parseFloat(projectPaymentsResult.rows[0]?.total_paid || 0);
      const projectTotalAmount = parseFloat(projectPaymentsResult.rows[0]?.project_total_po_amount || 0);
      const remainingBalance = projectTotalAmount - totalPaid;
      const newPaymentAmount = parseFloat(payment_amount);

      // Check if project is fully paid
      if (projectTotalAmount > 0 && remainingBalance <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `لا يمكن إنشاء دفعة جديدة. المشروع ${projectCode || resolvedProjectId} تم دفعه بالكامل. المبلغ الإجمالي: ${projectTotalAmount.toFixed(2)}, المدفوع: ${totalPaid.toFixed(2)}`,
          error_en: `Cannot create payment. Project ${projectCode || resolvedProjectId} is fully paid. Total: ${projectTotalAmount.toFixed(2)}, Paid: ${totalPaid.toFixed(2)}`,
          project_id: resolvedProjectId,
          project_code: projectCode,
          total_amount: projectTotalAmount,
          total_paid: totalPaid,
          remaining: remainingBalance
        });
      }

      // Check if new payment exceeds remaining balance
      if (projectTotalAmount > 0 && newPaymentAmount > remainingBalance) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `مبلغ الدفعة (${newPaymentAmount.toFixed(2)}) يتجاوز المبلغ المتبقي للمشروع (${remainingBalance.toFixed(2)})`,
          error_en: `Payment amount (${newPaymentAmount.toFixed(2)}) exceeds project remaining balance (${remainingBalance.toFixed(2)})`,
          project_id: resolvedProjectId,
          project_code: projectCode,
          total_amount: projectTotalAmount,
          total_paid: totalPaid,
          remaining: remainingBalance,
          requested_amount: newPaymentAmount
        });
      }
    }

    // Generate payment number
    const countResult = await client.query(
      'SELECT COUNT(*) FROM vendor_payments WHERE company_id = $1',
      [companyId]
    );
    const paymentNumber = `PAY-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    // Calculate base_amount
    const baseAmount = payment_amount * (exchange_rate || 1);

    // Determine source_type from linked documents if not provided
    let finalSourceType = source_type || 'direct';
    if (!source_type) {
      if (invoice_id) finalSourceType = 'invoice';
      else if (purchase_order_id) finalSourceType = 'po';
      else if (shipment_id) finalSourceType = 'shipment';
      else if (quotation_id) finalSourceType = 'quotation';
      else if (lc_id) finalSourceType = 'lc';
    }

    // Insert payment with all linked entities
    const result = await client.query(
      `INSERT INTO vendor_payments 
       (company_id, vendor_id, payment_number, payment_date, payment_method, 
        currency_id, payment_amount, exchange_rate, base_amount, 
        reference_number, notes, status, created_by, 
        bank_account_id, purchase_order_id, shipment_id, lc_id, project_id,
        quotation_id, invoice_id, source_type, cash_box_id,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [companyId, vendor_id, paymentNumber, payment_date, payment_method || 'bank_transfer',
       currency_id, payment_amount, exchange_rate || 1, baseAmount,
       reference_number, notes || description, status || 'draft', userId,
       bank_account_id || null, purchase_order_id || null, shipment_id || null, lc_id || null, 
       resolvedProjectId || project_id || null,  // Use resolved project_id
       quotation_id || null, invoice_id || null, finalSourceType, cash_box_id || null]
    );

    const createdPayment = result.rows[0];

    // Automatically create a transfer request for this payment
    // Only create if payment has a project/shipment linked (required for transfer requests)
    let transferRequest = null;
    const effectiveProjectId = createdPayment.project_id;
    const effectiveShipmentId = createdPayment.shipment_id;
    
    if (effectiveProjectId && effectiveShipmentId) {
      try {
        // Get DRAFT status ID for transfer requests
        const statusQuery = `SELECT id FROM request_statuses WHERE code = 'DRAFT' LIMIT 1`;
        const statusResult = await client.query(statusQuery);
        const draftStatusId = statusResult.rows[0]?.id || 1;

        // Get vendor bank info for transfer request
        const vendorBankQuery = `
          SELECT account_number, iban, swift_code, bank_name, account_name
          FROM vendor_bank_accounts 
          WHERE vendor_id = $1 AND is_active = true AND deleted_at IS NULL
          ORDER BY is_default DESC
          LIMIT 1
        `;
        const vendorBankResult = await client.query(vendorBankQuery, [vendor_id]);
        const vendorBank = vendorBankResult.rows[0];

        // Insert transfer request linked to the vendor payment
        const transferResult = await client.query(`
          INSERT INTO transfer_requests (
            company_id, requested_by, source_vendor_payment_id,
            project_id, shipment_id, vendor_id,
            currency_id, transfer_amount, transfer_amount_local,
            transfer_method, status_id,
            beneficiary_name, beneficiary_account, beneficiary_iban, swift_code, beneficiary_bank,
            notes, transfer_type, created_by, updated_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING id, request_number
        `, [
          companyId,
          userId,
          createdPayment.id,  // Link to vendor payment
          effectiveProjectId,
          effectiveShipmentId,
          vendor_id,
          currency_id,
          payment_amount,
          baseAmount,
          payment_method || 'bank_transfer',
          draftStatusId,
          vendorBank?.account_name || null,
          vendorBank?.account_number || null,
          vendorBank?.iban || null,
          vendorBank?.swift_code || null,
          vendorBank?.bank_name || null,
          notes || description || `Transfer for payment ${paymentNumber}`,
          'vendor_payment',  // Indicate this is a vendor payment transfer
          userId,
          userId
        ]);

        transferRequest = transferResult.rows[0];
        console.log(`Auto-created transfer request ${transferRequest.request_number} for payment ${paymentNumber}`);
      } catch (trError) {
        // Log error but don't fail payment creation
        console.error('Failed to auto-create transfer request:', trError);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      data: createdPayment,
      transfer_request: transferRequest,
      message: transferRequest 
        ? `Payment created successfully with transfer request ${transferRequest.request_number}` 
        : 'Payment created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/procurement/payments/:id/post
 * Post payment (make it official and affect balances)
 */
router.post('/:id/post', authenticate, loadCompanyContext, requirePermission('procurement:payments:post'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    await client.query('BEGIN');

    // Check payment exists and is not posted
    const checkResult = await client.query(
      `SELECT * FROM vendor_payments 
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND is_posted = false`,
      [id, companyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found or already posted' });
    }

    const payment = checkResult.rows[0];

    // Check if approval is required
    const approvalCheck = await checkNeedsApproval(
      companyId,
      'vendor_payment',
      parseFloat(payment.payment_amount || 0)
    );

    if (approvalCheck.needsApproval) {
      // Check if already approved
      const isApproved = await isDocumentApproved('vendor_payment', parseInt(id));
      
      if (!isApproved) {
        // Create approval request if not exists
        const existingApproval = await client.query(
          `SELECT id FROM approval_requests 
           WHERE document_type = 'vendor_payment' AND document_id = $1 
           AND company_id = $2 AND status = 'pending' AND deleted_at IS NULL`,
          [id, companyId]
        );

        if (existingApproval.rows.length === 0) {
          await createApprovalRequest(
            companyId,
            approvalCheck.workflowId!,
            'vendor_payment',
            parseInt(id),
            payment.document_number,
            parseFloat(payment.total_amount),
            userId,
            'Auto-generated approval request on posting attempt'
          );
        }

        await client.query('ROLLBACK');
        return res.status(403).json({
          error: 'Approval required before posting',
          approval_required: true,
          workflow_name: approvalCheck.workflowName,
          required_role: approvalCheck.approvalRole
        });
      }
    }

    // Post payment
    const result = await client.query(
      `UPDATE vendor_payments
       SET is_posted = true, posted_at = CURRENT_TIMESTAMP, posted_by = $1, 
           status = 'posted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );

    // Manually update invoice balances (trigger workaround)
    // Update paid_amount from all posted payments
    await client.query(
      `UPDATE purchase_invoices pi
       SET paid_amount = (
         SELECT COALESCE(SUM(vpa.invoice_currency_amount), 0)
         FROM vendor_payment_allocations vpa
         INNER JOIN vendor_payments vp ON vpa.payment_id = vp.id
         WHERE vpa.invoice_id = pi.id
           AND vp.is_posted = true
           AND vp.deleted_at IS NULL
           AND vpa.deleted_at IS NULL
       )
       WHERE pi.id IN (
         SELECT DISTINCT vpa.invoice_id
         FROM vendor_payment_allocations vpa
         WHERE vpa.payment_id = $1 AND vpa.deleted_at IS NULL
       )`,
      [id]
    );

    // Update balance and status
    await client.query(
      `UPDATE purchase_invoices
       SET balance = total_amount - paid_amount,
           status = CASE
             WHEN paid_amount >= total_amount THEN 'paid'
             WHEN paid_amount > 0 THEN 'partial_paid'
             ELSE status
           END
       WHERE id IN (
         SELECT DISTINCT vpa.invoice_id
         FROM vendor_payment_allocations vpa
         WHERE vpa.payment_id = $1 AND vpa.deleted_at IS NULL
       )`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      data: result.rows[0],
      message: 'Payment posted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error posting payment:', error);
    res.status(500).json({ error: 'Failed to post payment' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/procurement/payments/:id/unpost
 * Revert a posted payment back to draft status
 * @access Private (procurement:payments:unpost)
 */
router.post('/:id/unpost', authenticate, loadCompanyContext, requirePermission('procurement:payments:unpost'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    await client.query('BEGIN');

    // Get payment
    const paymentResult = await client.query(
      `SELECT * FROM vendor_payments 
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (!payment.is_posted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment is not posted' });
    }

    // Revert payment to draft
    const result = await client.query(
      `UPDATE vendor_payments
       SET is_posted = false, posted_at = NULL, posted_by = NULL, 
           status = 'draft', updated_at = CURRENT_TIMESTAMP, updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );

    // Recalculate invoice balances - remove this payment's contribution
    await client.query(
      `UPDATE purchase_invoices pi
       SET paid_amount = (
         SELECT COALESCE(SUM(vpa.invoice_currency_amount), 0)
         FROM vendor_payment_allocations vpa
         INNER JOIN vendor_payments vp ON vpa.payment_id = vp.id
         WHERE vpa.invoice_id = pi.id
           AND vp.is_posted = true
           AND vp.deleted_at IS NULL
           AND vpa.deleted_at IS NULL
       )
       WHERE pi.id IN (
         SELECT DISTINCT vpa.invoice_id
         FROM vendor_payment_allocations vpa
         WHERE vpa.payment_id = $1 AND vpa.deleted_at IS NULL
       )`,
      [id]
    );

    // Update balance and status
    await client.query(
      `UPDATE purchase_invoices
       SET balance = total_amount - paid_amount,
           status = CASE
             WHEN paid_amount >= total_amount THEN 'paid'
             WHEN paid_amount > 0 THEN 'partial_paid'
             ELSE 'pending'
           END
       WHERE id IN (
         SELECT DISTINCT vpa.invoice_id
         FROM vendor_payment_allocations vpa
         WHERE vpa.payment_id = $1 AND vpa.deleted_at IS NULL
       )`,
      [id]
    );

    await client.query('COMMIT');

    console.log(`Payment ${id} unposted by user ${userId}`);

    res.json({
      data: result.rows[0],
      message: 'Payment reverted to draft successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unposting payment:', error);
    res.status(500).json({ error: 'Failed to unpost payment' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/procurement/payments/:id/allocate
 * Allocate payment to invoice(s)
 */
router.post('/:id/allocate', authenticate, loadCompanyContext, requirePermission('procurement:payments:allocate'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { allocations } = req.body; // Array of { invoice_id, allocated_amount, discount_amount, notes }

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ error: 'Allocations array required' });
    }

    await client.query('BEGIN');

    // Get payment
    const paymentResult = await client.query(
      `SELECT * FROM vendor_payments 
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Calculate total allocation
    const totalAllocation = allocations.reduce((sum: number, a: any) => sum + parseFloat(a.allocated_amount), 0);

    if (totalAllocation > payment.unallocated_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Total allocation exceeds unallocated amount' });
    }

    // Insert allocations
    for (const allocation of allocations) {
      const { invoice_id, allocated_amount, discount_amount, notes, settlement_type } = allocation;

      await client.query(
        `INSERT INTO vendor_payment_allocations
         (company_id, payment_id, invoice_id, allocated_amount, invoice_currency_amount,
          discount_amount, settlement_type, notes, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [companyId, id, invoice_id, allocated_amount, allocated_amount, // Simplified: assuming same currency
         discount_amount || 0, settlement_type || 'partial', notes, userId]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Payment allocated successfully',
      allocated_count: allocations.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error allocating payment:', error);
    res.status(500).json({ error: 'Failed to allocate payment' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/procurement/payments/vendor/:vendorId/outstanding-invoices
 * Get outstanding invoices for a vendor (for allocation UI)
 */
router.get('/vendor/:vendorId/outstanding-invoices', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { vendorId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const result = await pool.query(
      `SELECT 
        pi.id,
        pi.invoice_number,
        pi.invoice_date,
        pi.due_date,
        pi.total_amount,
        pi.paid_amount,
        pi.balance,
        pi.currency_code,
        pi.status,
        CURRENT_DATE - pi.due_date AS days_overdue
      FROM purchase_invoices pi
      WHERE pi.company_id = $1
        AND pi.vendor_id = $2
        AND pi.is_posted = true
        AND pi.balance > 0
        AND pi.deleted_at IS NULL
      ORDER BY pi.due_date ASC`,
      [companyId, vendorId]
    );

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding invoices' });
  }
});

/**
 * GET /api/procurement/payments/vendor/:vendorId/documents
 * Get all payable documents for a vendor (PO, Shipment, Quotation, Invoice)
 */
router.get('/vendor/:vendorId/documents', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { vendorId } = req.params;
    const { source_type } = req.query; // po, shipment, quotation, invoice

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let result;
    
    if (source_type === 'po') {
      // Purchase Orders with payment info
      result = await pool.query(
        `SELECT 
          po.id,
          po.order_number as document_number,
          po.order_date as document_date,
          po.total_amount,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.purchase_order_id = po.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount,
          po.total_amount - COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.purchase_order_id = po.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as balance,
          po.currency_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          po.status,
          po.project_id,
          p.code as project_code,
          p.name as project_name
        FROM purchase_orders po
        LEFT JOIN currencies c ON po.currency_id = c.id
        LEFT JOIN projects p ON po.project_id = p.id
        WHERE po.company_id = $1 
          AND po.vendor_id = $2
          AND po.status IN ('approved', 'partial_received', 'received')
          AND po.deleted_at IS NULL
        ORDER BY po.order_date DESC`,
        [companyId, vendorId]
      );
    } else if (source_type === 'shipment') {
      // Shipments with payment info - get currency from linked PO
      result = await pool.query(
        `SELECT 
          ls.id,
          ls.shipment_number as document_number,
          ls.created_at as document_date,
          COALESCE(ls.total_amount, 0) as total_amount,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.shipment_id = ls.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount,
          COALESCE(ls.total_amount, 0) - COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.shipment_id = ls.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as balance,
          COALESCE(po.currency_id, (SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1)) as currency_id,
          COALESCE(c.code, 'SAR') as currency_code,
          COALESCE(c.symbol, 'ر.س') as currency_symbol,
          ls.bl_no,
          ls.status_code as status,
          ls.project_id,
          p.code as project_code,
          p.name as project_name
        FROM logistics_shipments ls
        LEFT JOIN purchase_orders po ON ls.purchase_order_id = po.id
        LEFT JOIN currencies c ON po.currency_id = c.id
        LEFT JOIN projects p ON ls.project_id = p.id
        WHERE ls.company_id = $1 
          AND ls.vendor_id = $2
          AND ls.deleted_at IS NULL
        ORDER BY ls.created_at DESC`,
        [companyId, vendorId]
      );
    } else if (source_type === 'quotation') {
      // Vendor Quotations with payment info
      result = await pool.query(
        `SELECT 
          vq.id,
          vq.quotation_number as document_number,
          vq.quotation_date as document_date,
          vq.total_amount,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.quotation_id = vq.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount,
          vq.total_amount - COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.quotation_id = vq.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as balance,
          vq.currency_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          vq.status,
          NULL as project_id,
          NULL as project_code,
          NULL as project_name
        FROM vendor_quotations vq
        LEFT JOIN currencies c ON vq.currency_id = c.id
        WHERE vq.company_id = $1 
          AND vq.vendor_id = $2
          AND vq.status = 'accepted'
          AND vq.deleted_at IS NULL
        ORDER BY vq.quotation_date DESC`,
        [companyId, vendorId]
      );
    } else if (source_type === 'invoice') {
      // Purchase Invoices with payment info
      result = await pool.query(
        `SELECT 
          pi.id,
          pi.invoice_number as document_number,
          pi.invoice_date as document_date,
          pi.total_amount,
          COALESCE(pi.paid_amount, 0) as paid_amount,
          COALESCE(pi.balance, pi.total_amount) as balance,
          pi.currency_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          pi.due_date,
          pi.status,
          po.project_id,
          p.code as project_code,
          p.name as project_name,
          CASE WHEN pi.due_date < CURRENT_DATE THEN CURRENT_DATE - pi.due_date ELSE 0 END as days_overdue
        FROM purchase_invoices pi
        LEFT JOIN currencies c ON pi.currency_id = c.id
        LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
        LEFT JOIN projects p ON po.project_id = p.id
        WHERE pi.company_id = $1 
          AND pi.vendor_id = $2
          AND pi.status NOT IN ('cancelled', 'paid')
          AND pi.deleted_at IS NULL
        ORDER BY pi.due_date ASC, pi.invoice_date DESC`,
        [companyId, vendorId]
      );
    } else {
      return res.status(400).json({ error: 'Invalid source_type. Use: po, shipment, quotation, or invoice' });
    }

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    res.status(500).json({ error: 'Failed to fetch vendor documents' });
  }
});

/**
 * GET /api/procurement/payments/vendor/:vendorId/document/:sourceType/:documentId
 * Get single document details with items for payment
 */
router.get('/vendor/:vendorId/document/:sourceType/:documentId', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { vendorId, sourceType, documentId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let document;
    let items = [];
    
    if (sourceType === 'po') {
      // Get PO details
      const docResult = await pool.query(
        `SELECT 
          po.id, po.order_number as document_number, po.order_date as document_date,
          po.total_amount, po.currency_id, c.code as currency_code, c.symbol as currency_symbol,
          po.status, po.project_id, p.code as project_code, p.name as project_name,
          po.notes,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.purchase_order_id = po.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount
        FROM purchase_orders po
        LEFT JOIN currencies c ON po.currency_id = c.id
        LEFT JOIN projects p ON po.project_id = p.id
        WHERE po.id = $1 AND po.company_id = $2 AND po.vendor_id = $3 AND po.deleted_at IS NULL`,
        [documentId, companyId, vendorId]
      );
      
      if (docResult.rows.length > 0) {
        document = docResult.rows[0];
        document.balance = parseFloat(document.total_amount) - parseFloat(document.paid_amount);
        
        // Get PO items
        const itemsResult = await pool.query(
          `SELECT poi.id, poi.line_number, poi.item_id, poi.item_code, poi.item_name, 
                  poi.ordered_qty as quantity, poi.unit_price, poi.line_total as total_price,
                  i.name as item_name_en, uom.code as uom_code
           FROM purchase_order_items poi
           LEFT JOIN items i ON poi.item_id = i.id
           LEFT JOIN units_of_measure uom ON poi.uom_id = uom.id
           WHERE poi.order_id = $1
           ORDER BY poi.line_number`,
          [documentId]
        );
        items = itemsResult.rows;
      }
    } else if (sourceType === 'shipment') {
      // Get Shipment details - get currency from linked PO
      const docResult = await pool.query(
        `SELECT 
          ls.id, ls.shipment_number as document_number, ls.created_at as document_date,
          ls.purchase_order_id,
          COALESCE(ls.total_amount, 0) as total_amount, 
          COALESCE(po.currency_id, (SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1)) as currency_id, 
          COALESCE(c.code, 'SAR') as currency_code, 
          COALESCE(c.symbol, 'ر.س') as currency_symbol,
          ls.bl_no, ls.status_code as status, ls.project_id, p.code as project_code, p.name as project_name,
          ls.notes,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.shipment_id = ls.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount
        FROM logistics_shipments ls
        LEFT JOIN purchase_orders po ON ls.purchase_order_id = po.id
        LEFT JOIN currencies c ON po.currency_id = c.id
        LEFT JOIN projects p ON ls.project_id = p.id
        WHERE ls.id = $1 AND ls.company_id = $2 AND ls.vendor_id = $3 AND ls.deleted_at IS NULL`,
        [documentId, companyId, vendorId]
      );
      
      if (docResult.rows.length > 0) {
        document = docResult.rows[0];
        document.balance = parseFloat(document.total_amount) - parseFloat(document.paid_amount);
        
        // Shipment items - try to get from linked PO if exists
        if (document.purchase_order_id) {
          const itemsResult = await pool.query(
            `SELECT poi.id, poi.line_number, poi.item_id, poi.item_code, poi.item_name, 
                    poi.ordered_qty as quantity, poi.unit_price, poi.line_total as total_price,
                    i.name as item_name_en, uom.code as uom_code
             FROM purchase_order_items poi
             LEFT JOIN items i ON poi.item_id = i.id
             LEFT JOIN units_of_measure uom ON poi.uom_id = uom.id
             WHERE poi.order_id = $1
             ORDER BY poi.line_number`,
            [document.purchase_order_id]
          );
          items = itemsResult.rows;
        }
      }
    } else if (sourceType === 'quotation') {
      // Get Quotation details
      const docResult = await pool.query(
        `SELECT 
          vq.id, vq.quotation_number as document_number, vq.quotation_date as document_date,
          vq.total_amount, vq.currency_id, c.code as currency_code, c.symbol as currency_symbol,
          vq.status, vq.notes, vq.valid_to as valid_until,
          NULL as project_id, NULL as project_code, NULL as project_name,
          COALESCE(
            (SELECT SUM(vp.payment_amount) FROM vendor_payments vp 
             WHERE vp.quotation_id = vq.id AND vp.deleted_at IS NULL AND vp.status != 'cancelled'),
            0
          ) as paid_amount
        FROM vendor_quotations vq
        LEFT JOIN currencies c ON vq.currency_id = c.id
        WHERE vq.id = $1 AND vq.company_id = $2 AND vq.vendor_id = $3 AND vq.deleted_at IS NULL`,
        [documentId, companyId, vendorId]
      );
      
      if (docResult.rows.length > 0) {
        document = docResult.rows[0];
        document.balance = parseFloat(document.total_amount) - parseFloat(document.paid_amount);
        
        // Get Quotation items
        const itemsResult = await pool.query(
          `SELECT vqi.id, vqi.item_id, vqi.item_code, vqi.item_name, 
                  vqi.quantity, vqi.unit_price, vqi.line_total as total_price,
                  i.name as item_name_en, uom.code as uom_code
           FROM vendor_quotation_items vqi
           LEFT JOIN items i ON vqi.item_id = i.id
           LEFT JOIN units_of_measure uom ON vqi.uom_id = uom.id
           WHERE vqi.quotation_id = $1
           ORDER BY vqi.id`,
          [documentId]
        );
        items = itemsResult.rows;
      }
    } else if (sourceType === 'invoice') {
      // Get Invoice details
      const docResult = await pool.query(
        `SELECT 
          pi.id, pi.invoice_number as document_number, pi.invoice_date as document_date,
          pi.total_amount, COALESCE(pi.paid_amount, 0) as paid_amount, COALESCE(pi.balance, pi.total_amount) as balance,
          pi.currency_id, c.code as currency_code, c.symbol as currency_symbol,
          pi.due_date, pi.status, pi.notes,
          po.project_id, p.code as project_code, p.name as project_name
        FROM purchase_invoices pi
        LEFT JOIN currencies c ON pi.currency_id = c.id
        LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
        LEFT JOIN projects p ON po.project_id = p.id
        WHERE pi.id = $1 AND pi.company_id = $2 AND pi.vendor_id = $3 AND pi.deleted_at IS NULL`,
        [documentId, companyId, vendorId]
      );
      
      if (docResult.rows.length > 0) {
        document = docResult.rows[0];
        
        // Get Invoice items
        const itemsResult = await pool.query(
          `SELECT pii.*, i.name as item_name, uom.code as uom_code
           FROM purchase_invoice_items pii
           LEFT JOIN items i ON pii.item_id = i.id
           LEFT JOIN units_of_measure uom ON pii.uom_id = uom.id
           WHERE pii.invoice_id = $1 AND pii.deleted_at IS NULL
           ORDER BY pii.line_number`,
          [documentId]
        );
        items = itemsResult.rows;
      }
    } else {
      return res.status(400).json({ error: 'Invalid source_type. Use: po, shipment, quotation, or invoice' });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      data: {
        ...document,
        items
      }
    });

  } catch (error) {
    console.error('Error fetching document details:', error);
    res.status(500).json({ error: 'Failed to fetch document details' });
  }
});

/**
 * DELETE /api/procurement/payments/:id
 * Delete a vendor payment (only draft payments)
 * This reverses any accounting effects and updates document balances
 */
router.delete('/:id', authenticate, loadCompanyContext, requirePermission('procurement:payments:delete'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    await client.query('BEGIN');

    // Get payment details before deletion
    const paymentResult = await client.query(
      `SELECT vp.*, v.name as vendor_name 
       FROM vendor_payments vp
       LEFT JOIN vendors v ON vp.vendor_id = v.id
       WHERE vp.id = $1 AND vp.company_id = $2 AND vp.deleted_at IS NULL`,
      [id, companyId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Only allow deletion of draft payments
    if (payment.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete payment with status: ' + payment.status + '. Only draft payments can be deleted.',
        status: payment.status
      });
    }

    // If payment is posted, we need to reverse accounting entries
    if (payment.is_posted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete posted payment. You must void it instead.',
        is_posted: true
      });
    }

    // Delete any allocations first
    await client.query(
      `UPDATE vendor_payment_allocations 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE payment_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    // Delete related transfer request if exists (uses status_id, not status column)
    // Get cancelled status id first
    const cancelledStatusResult = await client.query(
      `SELECT id FROM request_statuses WHERE code = 'CANCELLED' LIMIT 1`
    );
    const cancelledStatusId = cancelledStatusResult.rows[0]?.id;
    
    if (cancelledStatusId) {
      await client.query(
        `UPDATE transfer_requests 
         SET deleted_at = CURRENT_TIMESTAMP, 
             status_id = $3,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $2
         WHERE source_vendor_payment_id = $1 AND deleted_at IS NULL`,
        [id, userId, cancelledStatusId]
      );
    } else {
      // Just soft delete if we can't find cancelled status
      await client.query(
        `UPDATE transfer_requests 
         SET deleted_at = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $2
         WHERE source_vendor_payment_id = $1 AND deleted_at IS NULL`,
        [id, userId]
      );
    }

    // Soft delete the payment
    await client.query(
      `UPDATE vendor_payments 
       SET deleted_at = CURRENT_TIMESTAMP, 
           status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $1
       WHERE id = $2`,
      [userId, id]
    );

    // Log the deletion in audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, ip_address, created_at)
       VALUES ($1, 'DELETE', 'vendor_payments', $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, id, JSON.stringify(payment), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Payment deleted successfully',
      deleted_payment: {
        id: payment.id,
        payment_number: payment.payment_number,
        vendor_name: payment.vendor_name,
        amount: payment.payment_amount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/procurement/payments/:id
 * Update a vendor payment (only draft payments)
 */
router.put('/:id', authenticate, loadCompanyContext, requirePermission('procurement:payments:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = req.companyId;
    const userId = req.user!.id;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const {
      payment_date,
      payment_method,
      payment_amount,
      currency_id,
      reference_number,
      exchange_rate,
      notes,
      bank_account_id,
      cash_box_id
    } = req.body;

    await client.query('BEGIN');

    // Get current payment
    const currentResult = await client.query(
      `SELECT * FROM vendor_payments WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const currentPayment = currentResult.rows[0];

    // Only allow editing draft payments
    if (currentPayment.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot edit payment with status: ' + currentPayment.status + '. Only draft payments can be edited.',
        status: currentPayment.status
      });
    }

    // Calculate base_amount
    const finalExchangeRate = exchange_rate || currentPayment.exchange_rate || 1;
    const finalAmount = payment_amount || currentPayment.payment_amount;
    const baseAmount = parseFloat(finalAmount) * parseFloat(finalExchangeRate);

    // Update payment
    const result = await client.query(
      `UPDATE vendor_payments 
       SET payment_date = COALESCE($1, payment_date),
           payment_method = COALESCE($2, payment_method),
           payment_amount = COALESCE($3, payment_amount),
           currency_id = COALESCE($4, currency_id),
           reference_number = COALESCE($5, reference_number),
           exchange_rate = COALESCE($6, exchange_rate),
           base_amount = $7,
           notes = COALESCE($8, notes),
           bank_account_id = $9,
           cash_box_id = $10,
           updated_by = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [payment_date, payment_method, payment_amount, currency_id, reference_number, 
       exchange_rate, baseAmount, notes, bank_account_id || null, cash_box_id || null, 
       userId, id]
    );

    const updatedPayment = result.rows[0];

    // Sync linked transfer request if exists
    let syncedTransferRequest = null;
    try {
      // Check if a transfer request is linked to this payment
      const trResult = await client.query(
        `SELECT id, request_number FROM transfer_requests 
         WHERE source_vendor_payment_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (trResult.rows.length > 0) {
        const trId = trResult.rows[0].id;
        
        // Update transfer request with new payment data
        await client.query(`
          UPDATE transfer_requests 
          SET transfer_amount = $1,
              transfer_amount_local = $2,
              currency_id = $3,
              transfer_method = COALESCE($4, transfer_method),
              notes = COALESCE($5, notes),
              updated_by = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
        `, [
          finalAmount,
          baseAmount,
          currency_id || updatedPayment.currency_id,
          payment_method,
          notes,
          userId,
          trId
        ]);

        syncedTransferRequest = trResult.rows[0];
        console.log(`Synced transfer request ${syncedTransferRequest.request_number} with payment ${id}`);
      }
    } catch (syncError) {
      // Log error but don't fail payment update
      console.error('Failed to sync transfer request:', syncError);
    }

    await client.query('COMMIT');

    res.json({
      data: updatedPayment,
      transfer_request_synced: syncedTransferRequest,
      message: syncedTransferRequest 
        ? `Payment updated and transfer request ${syncedTransferRequest.request_number} synced`
        : 'Payment updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/procurement/payments/project/:projectId
 * Get all payments related to a project (across PO, Shipment, Invoice, Quotation)
 * Payments to the same vendor for documents that share the same project number are grouped
 */
router.get('/project/:projectId', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { projectId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get project info
    const projectResult = await pool.query(
      `SELECT id, code, name, name_ar FROM projects WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [projectId, companyId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get all payments linked to this project directly or through linked documents
    const paymentsResult = await pool.query(
      `SELECT 
        vp.*,
        v.code as vendor_code,
        v.name as vendor_name,
        c.code as currency_code,
        c.symbol as currency_symbol,
        CASE 
          WHEN vp.purchase_order_id IS NOT NULL THEN 'PO'
          WHEN vp.shipment_id IS NOT NULL THEN 'Shipment'
          WHEN vp.invoice_id IS NOT NULL THEN 'Invoice'
          WHEN vp.quotation_id IS NOT NULL THEN 'Quotation'
          ELSE 'Direct'
        END as source_type_display,
        COALESCE(po.order_number, ls.shipment_number, pi.invoice_number, vq.quotation_number, 'N/A') as document_number
      FROM vendor_payments vp
      INNER JOIN vendors v ON vp.vendor_id = v.id
      INNER JOIN currencies c ON vp.currency_id = c.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON vp.shipment_id = ls.id
      LEFT JOIN purchase_invoices pi ON vp.invoice_id = pi.id
      LEFT JOIN vendor_quotations vq ON vp.quotation_id = vq.id
      WHERE vp.company_id = $1
        AND vp.deleted_at IS NULL
        AND (
          -- Direct project link
          vp.project_id = $2
          -- Or linked through PO
          OR po.project_id = $2
          -- Or linked through Shipment
          OR ls.project_id = $2
          -- Or linked through Invoice (via PO)
          OR (SELECT p.project_id FROM purchase_orders p WHERE p.id = pi.purchase_order_id) = $2
        )
      ORDER BY vp.payment_date DESC, vp.id DESC`,
      [companyId, projectId]
    );

    // Calculate totals per vendor
    const vendorTotals: Record<number, { vendor_name: string; total_paid: number; currency_code: string }> = {};
    let projectTotalPaid = 0;

    for (const payment of paymentsResult.rows) {
      const vendorId = payment.vendor_id;
      const amount = parseFloat(payment.payment_amount);
      
      if (!vendorTotals[vendorId]) {
        vendorTotals[vendorId] = {
          vendor_name: payment.vendor_name,
          total_paid: 0,
          currency_code: payment.currency_code
        };
      }
      vendorTotals[vendorId].total_paid += amount;
      projectTotalPaid += amount;
    }

    res.json({
      data: {
        project,
        payments: paymentsResult.rows,
        summary: {
          total_payments: paymentsResult.rows.length,
          total_amount: projectTotalPaid,
          vendors: Object.entries(vendorTotals).map(([vendorId, info]) => ({
            vendor_id: parseInt(vendorId),
            ...info
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching project payments:', error);
    res.status(500).json({ error: 'Failed to fetch project payments' });
  }
});

/**
 * GET /api/procurement/payments/vendor/:vendorId/by-project
 * Get payments for a vendor grouped by project
 */
router.get('/vendor/:vendorId/by-project', authenticate, loadCompanyContext, requirePermission('procurement:payments:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { vendorId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get all payments for this vendor grouped by project
    const result = await pool.query(
      `SELECT 
        COALESCE(vp.project_id, po.project_id, ls.project_id) as project_id,
        p.code as project_code,
        p.name as project_name,
        COUNT(vp.id) as payment_count,
        SUM(vp.payment_amount) as total_paid,
        c.code as currency_code,
        ARRAY_AGG(DISTINCT 
          CASE 
            WHEN vp.purchase_order_id IS NOT NULL THEN 'PO:' || po.order_number
            WHEN vp.shipment_id IS NOT NULL THEN 'SHP:' || ls.shipment_number
            WHEN vp.invoice_id IS NOT NULL THEN 'INV:' || pi.invoice_number
            WHEN vp.quotation_id IS NOT NULL THEN 'QTN:' || vq.quotation_number
            ELSE NULL
          END
        ) FILTER (WHERE vp.purchase_order_id IS NOT NULL OR vp.shipment_id IS NOT NULL OR vp.invoice_id IS NOT NULL OR vp.quotation_id IS NOT NULL) as linked_documents
      FROM vendor_payments vp
      INNER JOIN currencies c ON vp.currency_id = c.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON vp.shipment_id = ls.id
      LEFT JOIN purchase_invoices pi ON vp.invoice_id = pi.id
      LEFT JOIN vendor_quotations vq ON vp.quotation_id = vq.id
      LEFT JOIN projects p ON COALESCE(vp.project_id, po.project_id, ls.project_id) = p.id
      WHERE vp.company_id = $1
        AND vp.vendor_id = $2
        AND vp.deleted_at IS NULL
      GROUP BY COALESCE(vp.project_id, po.project_id, ls.project_id), p.code, p.name, c.code
      ORDER BY total_paid DESC`,
      [companyId, vendorId]
    );

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching vendor payments by project:', error);
    res.status(500).json({ error: 'Failed to fetch vendor payments by project' });
  }
});

export default router;
