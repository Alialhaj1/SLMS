/**
 * Transfer Requests Routes
 * طلبات التحويل
 * 
 * Endpoints for managing transfer requests (linked to approved expense requests)
 */

import express from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { recordApprovalHistory, notifyOnAction } from '../services/approvalService';

const router = express.Router();
router.use(authenticate, loadCompanyContext);

/**
 * GET /api/transfer-requests
 * Get all transfer requests
 */
router.get(
  '/',
  authenticate,
  requireAnyPermission(['transfer_requests:view', 'transfer_requests:manage']),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');
      const isManager = req.user!.roles?.includes('admin') || req.user!.roles?.includes('manager');

      const { 
        status_id,
        project_id,
        shipment_id,
        vendor_id,
        is_printed,
        deleted_only,
        date_from,
        date_to,
        search,
        page = '1',
        limit = '50'
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let whereConditions = deleted_only === 'true' ? ['tr.deleted_at IS NOT NULL'] : ['tr.deleted_at IS NULL'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Company filter
      if (!isSuperAdmin && companyId) {
        whereConditions.push(`tr.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      // User filter (show only own requests unless manager)
      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`tr.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      // Status filter
      if (status_id) {
        whereConditions.push(`tr.status_id = $${paramIndex}`);
        queryParams.push(status_id);
        paramIndex++;
      }

      // Project filter
      if (project_id) {
        whereConditions.push(`tr.project_id = $${paramIndex}`);
        queryParams.push(project_id);
        paramIndex++;
      }

      // Shipment filter
      if (shipment_id) {
        whereConditions.push(`tr.shipment_id = $${paramIndex}`);
        queryParams.push(shipment_id);
        paramIndex++;
      }

      // Vendor filter
      if (vendor_id) {
        whereConditions.push(`tr.vendor_id = $${paramIndex}`);
        queryParams.push(vendor_id);
        paramIndex++;
      }

      // Printed filter
      if (is_printed !== undefined) {
        whereConditions.push(`tr.is_printed = $${paramIndex}`);
        queryParams.push(is_printed === 'true');
        paramIndex++;
      }

      // Date range filter
      if (date_from) {
        whereConditions.push(`tr.request_date >= $${paramIndex}`);
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereConditions.push(`tr.request_date <= $${paramIndex}`);
        queryParams.push(date_to);
        paramIndex++;
      }

      // Search filter
      if (search) {
        whereConditions.push(`(
          tr.request_number ILIKE $${paramIndex} OR
          tr.transaction_reference ILIKE $${paramIndex} OR
          tr.notes ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transfer_requests tr
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data with joins
      const dataQuery = `
        SELECT 
          tr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          rs.color as status_color,
          rs.icon as status_icon,
          et.name as expense_type_name,
          et.name_ar as expense_type_name_ar,
          p.name as project_name,
          p.code as project_code,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          v.name_ar as vendor_name_ar,
          c.code as currency_code,
          c.symbol as currency_symbol,
          u.email as requested_by_email,
          u.full_name as requested_by_name,
          er.request_number as expense_request_number,
          -- Vendor payment info if linked
          vp.payment_number as vendor_payment_number,
          vp.payment_amount as vendor_payment_amount,
          COALESCE(tr.transfer_type, 'expense') as transfer_type
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        LEFT JOIN request_expense_types et ON tr.expense_type_id = et.id
        LEFT JOIN projects p ON tr.project_id = p.id
        LEFT JOIN logistics_shipments s ON tr.shipment_id = s.id
        LEFT JOIN vendors v ON tr.vendor_id = v.id
        LEFT JOIN currencies c ON tr.currency_id = c.id
        LEFT JOIN users u ON tr.requested_by = u.id
        LEFT JOIN expense_requests er ON tr.expense_request_id = er.id
        LEFT JOIN vendor_payments vp ON tr.source_vendor_payment_id = vp.id
        WHERE ${whereClause}
        ORDER BY tr.request_date DESC, tr.id DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(parseInt(limit as string), offset);

      const dataResult = await pool.query(dataQuery, queryParams);

      res.json({
        data: dataResult.rows,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });

    } catch (error: any) {
      console.error('Error fetching transfer requests:', error);
      res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
  }
);

/**
 * GET /api/transfer-requests/:id
 * Get single transfer request by ID
 */
router.get(
  '/:id',
  authenticate,
  requireAnyPermission(['transfer_requests:view', 'transfer_requests:manage']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');
      const isManager = req.user!.roles?.includes('admin') || req.user!.roles?.includes('manager');

      let whereConditions = ['tr.id = $1', 'tr.deleted_at IS NULL'];
      const queryParams: any[] = [id];
      let paramIndex = 2;

      if (!isSuperAdmin && companyId) {
        whereConditions.push(`tr.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`tr.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      const query = `
        SELECT 
          tr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          rs.color as status_color,
          rs.icon as status_icon,
          rs.code as status_code,
          rs.allows_edit,
          rs.allows_delete,
          rs.allows_print,
          rs.allows_submit,
          rs.allows_approve,
          et.name as expense_type_name,
          et.name_ar as expense_type_name_ar,
          p.name as project_name,
          p.code as project_code,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          v.name_ar as vendor_name_ar,
          v.email as vendor_email,
          v.phone as vendor_phone,
          v.code as vendor_code,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          u.email as requested_by_email,
          u.full_name as requested_by_name,
          er.request_number as expense_request_number,
          er.total_amount as expense_total_amount,
          COALESCE(ba.account_number, tr.beneficiary_account) as bank_account_number,
          COALESCE(b.name, tr.beneficiary_bank) as bank_name,
          COALESCE(b.swift_code, tr.swift_code) as swift_code,
          COALESCE(ba.iban, tr.beneficiary_iban) as iban,
          -- Vendor payment info if linked
          vp.payment_number as vendor_payment_number,
          vp.payment_amount as vendor_payment_amount,
          vp.purchase_order_id as po_id,
          vp.reference_number as po_vendor_reference,
          vp.source_type as payment_source_type,
          vp.shipment_id as payment_shipment_id,
          -- Purchase order info (from vendor_payment.purchase_order_id OR from shipment OR from vendor_payment.shipment)
          COALESCE(po.order_number, po_from_ship.order_number, po_from_vp_ship.order_number) as po_number,
          COALESCE(po.total_amount, po_from_ship.total_amount, po_from_vp_ship.total_amount) as po_total_amount,
          COALESCE(po.currency_id, po_from_ship.currency_id, po_from_vp_ship.currency_id) as po_currency_id,
          COALESCE(po.id, po_from_ship.id, po_from_vp_ship.id) as effective_po_id,
          -- Calculate paid amount for this vendor+project/shipment (excluding current payment)
          -- This includes all previous payments to the same vendor for the same project/shipment
          COALESCE((
            SELECT SUM(vp2.payment_amount)
            FROM vendor_payments vp2
            WHERE vp2.vendor_id = tr.vendor_id
            AND vp2.deleted_at IS NULL
            AND vp2.id != COALESCE(tr.source_vendor_payment_id, 0)
            AND (
              -- Match by PO if available
              (vp2.purchase_order_id IS NOT NULL AND vp2.purchase_order_id = COALESCE(vp.purchase_order_id, s.purchase_order_id, vp_ship.purchase_order_id))
              -- OR match by shipment
              OR (vp2.shipment_id IS NOT NULL AND vp2.shipment_id = COALESCE(vp.shipment_id, tr.shipment_id))
              -- OR match by project (fallback)
              OR (vp2.project_id IS NOT NULL AND vp2.project_id = tr.project_id AND vp2.shipment_id IS NULL AND vp2.purchase_order_id IS NULL)
            )
          ), 0) as po_paid_before,
          -- Total commitment for this project/shipment (PO amount or sum of all payments if no PO)
          CASE 
            WHEN COALESCE(po.id, po_from_ship.id, po_from_vp_ship.id) IS NOT NULL 
            THEN COALESCE(po.total_amount, po_from_ship.total_amount, po_from_vp_ship.total_amount)
            ELSE (
              SELECT COALESCE(SUM(vp3.payment_amount), 0)
              FROM vendor_payments vp3
              WHERE vp3.vendor_id = tr.vendor_id
              AND vp3.deleted_at IS NULL
              AND (
                (vp3.shipment_id IS NOT NULL AND vp3.shipment_id = COALESCE(vp.shipment_id, tr.shipment_id))
                OR (vp3.project_id = tr.project_id AND vp3.shipment_id IS NULL)
              )
            )
          END as calculated_total,
          COALESCE(tr.transfer_type, 'expense') as transfer_type,
          -- Vendor bank info (for beneficiary details) - from vendor_bank_accounts, then vendor legacy fields
          COALESCE(vba.account_number, v.bank_account_number) as vendor_bank_account,
          COALESCE(vba.iban, v.bank_iban) as vendor_iban,
          COALESCE(vba.swift_code, v.bank_swift) as vendor_swift,
          COALESCE(vba.bank_name, vbank.name, vlegacy_bank.name) as vendor_bank_name,
          COALESCE(tr.beneficiary_name, v.name) as beneficiary_name
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        LEFT JOIN request_expense_types et ON tr.expense_type_id = et.id
        LEFT JOIN projects p ON tr.project_id = p.id
        LEFT JOIN logistics_shipments s ON tr.shipment_id = s.id
        LEFT JOIN vendors v ON tr.vendor_id = v.id
        LEFT JOIN currencies c ON tr.currency_id = c.id
        LEFT JOIN users u ON tr.requested_by = u.id
        LEFT JOIN expense_requests er ON tr.expense_request_id = er.id
        LEFT JOIN bank_accounts ba ON tr.bank_account_id = ba.id
        LEFT JOIN banks b ON ba.bank_id = b.id
        LEFT JOIN vendor_payments vp ON tr.source_vendor_payment_id = vp.id
        LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
        -- Get PO from shipment linked to transfer request
        LEFT JOIN purchase_orders po_from_ship ON s.purchase_order_id = po_from_ship.id
        -- Get shipment from vendor payment, then get its PO
        LEFT JOIN logistics_shipments vp_ship ON vp.shipment_id = vp_ship.id
        LEFT JOIN purchase_orders po_from_vp_ship ON vp_ship.purchase_order_id = po_from_vp_ship.id
        -- Vendor bank accounts (first active default one from vendor_bank_accounts table)
        LEFT JOIN LATERAL (
          SELECT vba2.* FROM vendor_bank_accounts vba2 
          WHERE vba2.vendor_id = v.id AND vba2.is_active = true AND vba2.deleted_at IS NULL
          ORDER BY vba2.is_default DESC
          LIMIT 1
        ) vba ON true
        LEFT JOIN banks vbank ON vba.bank_id = vbank.id
        -- Vendor legacy bank (from vendors.bank_id)
        LEFT JOIN banks vlegacy_bank ON v.bank_id = vlegacy_bank.id
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      // Get approval history
      const historyQuery = `
        SELECT 
          rah.*,
          u.email as performed_by_email,
          u.full_name as performed_by_name,
          u.signature_image_url as performer_signature_url,
          u.signature_title_en as performer_title_en,
          u.signature_title_ar as performer_title_ar,
          ps.name as previous_status_name,
          ps.name_ar as previous_status_name_ar,
          ns.name as new_status_name,
          ns.name_ar as new_status_name_ar
        FROM request_approval_history rah
        LEFT JOIN users u ON rah.performed_by = u.id
        LEFT JOIN request_statuses ps ON rah.previous_status_id = ps.id
        LEFT JOIN request_statuses ns ON rah.new_status_id = ns.id
        WHERE rah.request_type = 'transfer'
          AND rah.request_id = $1
        ORDER BY rah.performed_at DESC
      `;

      const historyResult = await pool.query(historyQuery, [id]);

      res.json({
        ...result.rows[0],
        history: historyResult.rows
      });

    } catch (error: any) {
      console.error('Error fetching transfer request:', error);
      res.status(500).json({ error: 'Failed to fetch transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/from-vendor-payment
 * Create a transfer request directly from a vendor payment (pre-filled with payment data)
 */
router.post(
  '/from-vendor-payment',
  authenticate,
  loadCompanyContext,
  requirePermission('transfer_requests:create'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userId = req.user!.id;
      const companyId = req.companyId;

      const {
        vendor_payment_id,
        project_id,
        shipment_id,
        beneficiary_name,
        beneficiary_account,
        beneficiary_bank,
        beneficiary_iban,
        swift_code,
        transfer_method,
        expected_transfer_date,
        notes
      } = req.body;

      if (!vendor_payment_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'vendor_payment_id is required' });
      }

      // Get payment details
      const paymentResult = await client.query(
        `SELECT vp.*, v.name as vendor_name, c.code as currency_code
         FROM vendor_payments vp
         JOIN vendors v ON vp.vendor_id = v.id
         JOIN currencies c ON vp.currency_id = c.id
         WHERE vp.id = $1 AND vp.company_id = $2 AND vp.deleted_at IS NULL`,
        [vendor_payment_id, companyId]
      );

      if (paymentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Payment not found' });
      }

      const payment = paymentResult.rows[0];

      // Check if transfer request already exists for this payment
      const existingTR = await client.query(
        'SELECT id, request_number FROM transfer_requests WHERE source_vendor_payment_id = $1 AND deleted_at IS NULL',
        [vendor_payment_id]
      );
      if (existingTR.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Transfer request already exists for this payment',
          transfer_request_id: existingTR.rows[0].id,
          request_number: existingTR.rows[0].request_number
        });
      }

      // Resolve project_id
      const resolvedProjectId = project_id || payment.project_id;
      if (!resolvedProjectId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Project is required for transfer request', code: 'PROJECT_REQUIRED' });
      }

      // Resolve shipment_id (optional for vendor_payment type)
      const resolvedShipmentId = shipment_id || payment.shipment_id || null;

      // Get vendor bank details if not provided
      let resolvedBeneficiaryName = beneficiary_name || payment.vendor_name;
      let resolvedBeneficiaryAccount = beneficiary_account || null;
      let resolvedBeneficiaryBank = beneficiary_bank || null;
      let resolvedBeneficiaryIban = beneficiary_iban || null;
      let resolvedSwiftCode = swift_code || null;

      if (!beneficiary_account) {
        const vendorBankResult = await client.query(
          `SELECT account_name, account_number, iban, swift_code, bank_name
           FROM vendor_bank_accounts
           WHERE vendor_id = $1 AND is_active = true AND deleted_at IS NULL
           ORDER BY is_default DESC LIMIT 1`,
          [payment.vendor_id]
        );
        if (vendorBankResult.rows.length > 0) {
          const vb = vendorBankResult.rows[0];
          resolvedBeneficiaryName = resolvedBeneficiaryName || vb.account_name;
          resolvedBeneficiaryAccount = vb.account_number;
          resolvedBeneficiaryBank = vb.bank_name;
          resolvedBeneficiaryIban = vb.iban;
          resolvedSwiftCode = vb.swift_code;
        } else {
          // Fallback: check vendor's legacy bank fields
          const vendorLegacyBank = await client.query(
            `SELECT v.bank_account_name, v.bank_account_number, v.bank_iban, v.bank_swift, b.name as bank_name, b.swift_code as bank_swift_code
             FROM vendors v
             LEFT JOIN banks b ON v.bank_id = b.id
             WHERE v.id = $1`,
            [payment.vendor_id]
          );
          if (vendorLegacyBank.rows.length > 0) {
            const vl = vendorLegacyBank.rows[0];
            if (vl.bank_account_number || vl.bank_iban) {
              resolvedBeneficiaryName = resolvedBeneficiaryName || vl.bank_account_name;
              resolvedBeneficiaryAccount = vl.bank_account_number || null;
              resolvedBeneficiaryBank = vl.bank_name || null;
              resolvedBeneficiaryIban = vl.bank_iban || null;
              resolvedSwiftCode = vl.bank_swift || vl.bank_swift_code || null;
            }
          }
        }
      }

      // Get DRAFT status
      const statusResult = await client.query(`SELECT id FROM request_statuses WHERE UPPER(code) = 'DRAFT' LIMIT 1`);
      if (!statusResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'DRAFT status not found in request_statuses' });
      }
      const draftStatusId = statusResult.rows[0].id;

      // Determine transfer_method (map payment methods to TR allowed values)
      const methodMap: Record<string, string> = {
        bank_transfer: 'bank_transfer',
        wire_transfer: 'bank_transfer',
        check: 'cheque',
        cheque: 'cheque',
        cash: 'cash',
        online: 'online'
      };
      const resolvedMethod = methodMap[transfer_method || payment.payment_method] || 'bank_transfer';

      // Create transfer request
      const result = await client.query(
        `INSERT INTO transfer_requests (
           company_id, requested_by, source_vendor_payment_id,
           project_id, shipment_id, vendor_id,
           currency_id, transfer_amount, transfer_amount_local,
           transfer_method, status_id,
           beneficiary_name, beneficiary_account, beneficiary_iban, swift_code, beneficiary_bank,
           notes, transfer_type, created_by, updated_by,
           expected_transfer_date, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id, request_number`,
        [
          companyId, userId, vendor_payment_id,
          resolvedProjectId, resolvedShipmentId, payment.vendor_id,
          payment.currency_id, payment.payment_amount, payment.base_amount || payment.payment_amount,
          resolvedMethod, draftStatusId,
          resolvedBeneficiaryName, resolvedBeneficiaryAccount, resolvedBeneficiaryIban, resolvedSwiftCode, resolvedBeneficiaryBank,
          notes || payment.notes || `Transfer for payment ${payment.payment_number}`,
          'vendor_payment', userId, userId,
          expected_transfer_date || null
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        id: result.rows[0].id,
        request_number: result.rows[0].request_number,
        message: 'Transfer request created successfully'
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating transfer request from vendor payment:', error);
      res.status(500).json({ error: 'Failed to create transfer request' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/transfer-requests
 * Create new transfer request (from approved expense request)
 */
router.post(
  '/',
  authenticate,
  requirePermission('transfer_requests:create'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const {
        expense_request_id,
        transfer_method,
        expected_transfer_date,
        bank_account_id,
        beneficiary_name,
        beneficiary_account,
        beneficiary_bank,
        beneficiary_iban,
        swift_code,
        notes,
        internal_notes
      } = req.body;

      // Validation
      if (!expense_request_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'expense_request_id is required' });
      }

      // Verify expense request exists and is approved
      const expenseCheck = await client.query(`
        SELECT er.*, rs.code as status_code
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL
      `, [expense_request_id, companyId]);

      if (expenseCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Expense request not found' });
      }

      const expenseRequest = expenseCheck.rows[0];

      if (expenseRequest.status_code !== 'APPROVED') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Expense request must be approved before creating transfer request'
        });
      }

      // Check if transfer request already exists for this expense
      const existingTransfer = await client.query(
        'SELECT id FROM transfer_requests WHERE expense_request_id = $1 AND deleted_at IS NULL',
        [expense_request_id]
      );

      if (existingTransfer.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Transfer request already exists for this expense request'
        });
      }

      // Get DRAFT status ID
      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'DRAFT'`;
      const statusResult = await client.query(statusQuery);
      const draftStatusId = statusResult.rows[0]?.id || 1;

      // Insert transfer request (inherits data from expense request)
      const insertQuery = `
        INSERT INTO transfer_requests (
          company_id, requested_by, expense_request_id,
          project_id, shipment_id, expense_type_id, vendor_id,
          currency_id, transfer_amount, transfer_amount_local,
          transfer_method, expected_transfer_date,
          bank_account_id, beneficiary_name, beneficiary_account,
          beneficiary_bank, beneficiary_iban, swift_code,
          status_id, notes, internal_notes,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        companyId,
        userId,
        expense_request_id,
        expenseRequest.project_id,
        expenseRequest.shipment_id,
        expenseRequest.expense_type_id,
        expenseRequest.vendor_id,
        expenseRequest.currency_id,
        expenseRequest.total_amount,
        expenseRequest.total_amount_local,
        transfer_method,
        expected_transfer_date,
        bank_account_id,
        beneficiary_name,
        beneficiary_account,
        beneficiary_bank,
        beneficiary_iban,
        swift_code,
        draftStatusId,
        notes,
        internal_notes,
        userId,
        userId
      ]);

      await client.query('COMMIT');

      // Fetch created request with joins
      const fetchQuery = `
        SELECT 
          tr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          et.name as expense_type_name,
          p.name as project_name,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          c.code as currency_code
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        LEFT JOIN request_expense_types et ON tr.expense_type_id = et.id
        LEFT JOIN projects p ON tr.project_id = p.id
        LEFT JOIN logistics_shipments s ON tr.shipment_id = s.id
        LEFT JOIN vendors v ON tr.vendor_id = v.id
        LEFT JOIN currencies c ON tr.currency_id = c.id
        WHERE tr.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [insertResult.rows[0].id]);

      res.status(201).json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating transfer request:', error);
      res.status(500).json({ error: 'Failed to create transfer request' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/transfer-requests/:id
 * Update transfer request
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('transfer_requests:update'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      // Check if request exists and can be edited
      const checkQuery = `
        SELECT tr.*, rs.allows_edit
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL
      `;

      const checkResult = await client.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      const existingRequest = checkResult.rows[0];

      if (!existingRequest.allows_edit) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Cannot edit request in current status' });
      }

      const {
        transfer_method,
        expected_transfer_date,
        bank_account_id,
        beneficiary_name,
        beneficiary_account,
        beneficiary_bank,
        beneficiary_iban,
        swift_code,
        notes,
        internal_notes
      } = req.body;

      // Update transfer request
      const updateQuery = `
        UPDATE transfer_requests SET
          transfer_method = COALESCE($1, transfer_method),
          expected_transfer_date = $2,
          bank_account_id = $3,
          beneficiary_name = COALESCE($4, beneficiary_name),
          beneficiary_account = $5,
          beneficiary_bank = $6,
          beneficiary_iban = $7,
          swift_code = $8,
          notes = $9,
          internal_notes = $10,
          updated_by = $11
        WHERE id = $12 AND deleted_at IS NULL
        RETURNING *
      `;

      await client.query(updateQuery, [
        transfer_method, expected_transfer_date, bank_account_id,
        beneficiary_name, beneficiary_account, beneficiary_bank,
        beneficiary_iban, swift_code, notes, internal_notes,
        userId, id
      ]);

      await client.query('COMMIT');

      // Fetch updated request
      const fetchQuery = `
        SELECT 
          tr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          et.name as expense_type_name,
          p.name as project_name,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          c.code as currency_code
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        LEFT JOIN request_expense_types et ON tr.expense_type_id = et.id
        LEFT JOIN projects p ON tr.project_id = p.id
        LEFT JOIN logistics_shipments s ON tr.shipment_id = s.id
        LEFT JOIN vendors v ON tr.vendor_id = v.id
        LEFT JOIN currencies c ON tr.currency_id = c.id
        WHERE tr.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [id]);

      res.json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating transfer request:', error);
      res.status(500).json({ error: 'Failed to update transfer request' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/transfer-requests/from-vendor-payment
 * Create transfer request from vendor payment
 */
router.post(
  '/from-vendor-payment',
  authenticate,
  loadCompanyContext,
  requirePermission('transfer_requests:create'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.user!.id;
      const companyId = req.companyId;

      if (!companyId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Company context required' });
      }

      const {
        vendor_payment_id,
        project_id: override_project_id,  // Optional override if payment not linked to project
        shipment_id: override_shipment_id, // Optional override if payment not linked to shipment
        transfer_method,
        expected_transfer_date,
        bank_account_id,
        beneficiary_name,
        beneficiary_account,
        beneficiary_bank,
        beneficiary_iban,
        swift_code,
        notes,
        internal_notes
      } = req.body;

      // Validation
      if (!vendor_payment_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'vendor_payment_id is required' });
      }

      // Verify vendor payment exists and get related shipment/project from linked documents
      const paymentCheck = await client.query(`
        SELECT vp.*, 
               v.name as vendor_name,
               v.name_ar as vendor_name_ar,
               c.code as currency_code,
               -- Get project from: direct link, PO, or shipment
               COALESCE(vp.project_id, po.project_id, ls.project_id) as resolved_project_id,
               -- Get shipment from: direct link or PO's shipment
               COALESCE(vp.shipment_id, po_ship.id) as resolved_shipment_id,
               p.code as project_code,
               p.name as project_name,
               COALESCE(ls.shipment_number, po_ship.shipment_number) as shipment_number
        FROM vendor_payments vp
        INNER JOIN vendors v ON vp.vendor_id = v.id
        INNER JOIN currencies c ON vp.currency_id = c.id
        LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
        LEFT JOIN projects p ON COALESCE(vp.project_id, po.project_id) = p.id
        LEFT JOIN logistics_shipments ls ON vp.shipment_id = ls.id
        LEFT JOIN logistics_shipments po_ship ON po.id = po_ship.purchase_order_id AND po_ship.deleted_at IS NULL
        WHERE vp.id = $1 AND vp.company_id = $2 AND vp.deleted_at IS NULL
      `, [vendor_payment_id, companyId]);

      if (paymentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Vendor payment not found' });
      }

      const vendorPayment = paymentCheck.rows[0];

      // Use override values if provided, otherwise use resolved ones
      const finalProjectId = override_project_id || vendorPayment.resolved_project_id;
      const finalShipmentId = override_shipment_id || vendorPayment.resolved_shipment_id;

      // Validate required fields for transfer request - project is required
      if (!finalProjectId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Cannot create transfer request: Payment is not linked to a project. Please provide a project_id.',
          code: 'PROJECT_REQUIRED'
        });
      }

      // Validate project exists if override provided
      if (override_project_id) {
        const projectCheck = await client.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [override_project_id, companyId]
        );
        if (projectCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid project_id provided' });
        }
      }

      // Shipment is now optional - some transfer requests may not be linked to shipments

      // Check if transfer request already exists for this payment
      const existingTransfer = await client.query(
        'SELECT id FROM transfer_requests WHERE source_vendor_payment_id = $1 AND deleted_at IS NULL',
        [vendor_payment_id]
      );

      if (existingTransfer.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Transfer request already exists for this vendor payment'
        });
      }

      // Get DRAFT status ID
      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'DRAFT'`;
      const statusResult = await client.query(statusQuery);
      const draftStatusId = statusResult.rows[0]?.id || 1;

      // Resolve beneficiary bank data from vendor if not provided
      let resolvedBeneficiaryName2 = beneficiary_name || vendorPayment.vendor_name;
      let resolvedBeneficiaryAccount2 = beneficiary_account || null;
      let resolvedBeneficiaryBank2 = beneficiary_bank || null;
      let resolvedBeneficiaryIban2 = beneficiary_iban || null;
      let resolvedSwiftCode2 = swift_code || null;

      if (!beneficiary_account) {
        // Try vendor_bank_accounts first
        const vbaResult = await client.query(
          `SELECT account_name, account_number, iban, swift_code, bank_name
           FROM vendor_bank_accounts
           WHERE vendor_id = $1 AND is_active = true AND deleted_at IS NULL
           ORDER BY is_default DESC LIMIT 1`,
          [vendorPayment.vendor_id]
        );
        if (vbaResult.rows.length > 0) {
          const vb = vbaResult.rows[0];
          resolvedBeneficiaryName2 = resolvedBeneficiaryName2 || vb.account_name;
          resolvedBeneficiaryAccount2 = vb.account_number;
          resolvedBeneficiaryBank2 = vb.bank_name;
          resolvedBeneficiaryIban2 = vb.iban;
          resolvedSwiftCode2 = vb.swift_code;
        } else {
          // Fallback: vendor legacy bank fields
          const vlResult = await client.query(
            `SELECT v.bank_account_name, v.bank_account_number, v.bank_iban, v.bank_swift, b.name as bank_name, b.swift_code as bank_swift_code
             FROM vendors v LEFT JOIN banks b ON v.bank_id = b.id WHERE v.id = $1`,
            [vendorPayment.vendor_id]
          );
          if (vlResult.rows.length > 0) {
            const vl = vlResult.rows[0];
            if (vl.bank_account_number || vl.bank_iban) {
              resolvedBeneficiaryName2 = resolvedBeneficiaryName2 || vl.bank_account_name;
              resolvedBeneficiaryAccount2 = vl.bank_account_number || null;
              resolvedBeneficiaryBank2 = vl.bank_name || null;
              resolvedBeneficiaryIban2 = vl.bank_iban || null;
              resolvedSwiftCode2 = vl.bank_swift || vl.bank_swift_code || null;
            }
          }
        }
      }

      // Insert transfer request from vendor payment
      const insertQuery = `
        INSERT INTO transfer_requests (
          company_id, requested_by, source_vendor_payment_id,
          project_id, shipment_id, vendor_id,
          currency_id, transfer_amount, transfer_amount_local,
          transfer_method, expected_transfer_date,
          bank_account_id, beneficiary_name, beneficiary_account,
          beneficiary_bank, beneficiary_iban, swift_code,
          status_id, notes, internal_notes,
          transfer_type, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        companyId,
        userId,
        vendor_payment_id,
        finalProjectId,  // Use final (potentially overridden) project
        finalShipmentId || null, // Use final shipment (optional)
        vendorPayment.vendor_id,
        vendorPayment.currency_id,
        vendorPayment.payment_amount,
        vendorPayment.base_amount || vendorPayment.payment_amount,
        transfer_method || 'bank_transfer',
        expected_transfer_date,
        bank_account_id || vendorPayment.bank_account_id,
        resolvedBeneficiaryName2,
        resolvedBeneficiaryAccount2,
        resolvedBeneficiaryBank2,
        resolvedBeneficiaryIban2,
        resolvedSwiftCode2,
        draftStatusId,
        notes,
        internal_notes,
        'vendor_payment',
        userId,
        userId
      ]);

      await client.query('COMMIT');

      // Fetch created request with joins
      const fetchQuery = `
        SELECT 
          tr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          p.name as project_name,
          ls.shipment_number,
          v.name as vendor_name,
          c.code as currency_code,
          vp.payment_number as vendor_payment_number
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        LEFT JOIN projects p ON tr.project_id = p.id
        LEFT JOIN logistics_shipments ls ON tr.shipment_id = ls.id
        LEFT JOIN vendors v ON tr.vendor_id = v.id
        LEFT JOIN currencies c ON tr.currency_id = c.id
        LEFT JOIN vendor_payments vp ON tr.source_vendor_payment_id = vp.id
        WHERE tr.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [insertResult.rows[0].id]);

      res.status(201).json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating transfer request from vendor payment:', error.message);
      console.error('Error details:', error);
      res.status(500).json({ 
        error: 'Failed to create transfer request',
        details: error.message 
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/transfer-requests/:id/submit
 * Submit transfer request for approval
 */
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('transfer_requests:submit'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'SUBMITTED'`;
      const statusResult = await pool.query(statusQuery);
      const submittedStatusId = statusResult.rows[0]?.id;

      const updateQuery = `
        UPDATE transfer_requests
        SET status_id = $1, submitted_at = NOW(), submitted_by = $2, updated_by = $2
        WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'DRAFT')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [submittedStatusId, userId, id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Transfer request not found or cannot be submitted'
        });
      }

      const request = result.rows[0];

      // Record approval history
      const draftStatusId = (await pool.query(`SELECT id FROM request_statuses WHERE code = 'DRAFT'`)).rows[0]?.id;
      await recordApprovalHistory({
        requestType: 'transfer', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'submitted', previousStatusId: draftStatusId, newStatusId: submittedStatusId,
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });

      // Notify reviewers/approvers
      await notifyOnAction({
        companyId: companyId!, requestType: 'transfer', requestId: parseInt(id),
        requestNumber: request.request_number || `TR-${id}`,
        action: 'submitted', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({
        message: 'Transfer request submitted for approval',
        data: request
      });

    } catch (error: any) {
      console.error('Error submitting transfer request:', error);
      res.status(500).json({ error: 'Failed to submit transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/:id/review
 * Review transfer request (3-level: SUBMITTED → REVIEWED)
 */
router.post(
  '/:id/review',
  authenticate,
  requireAnyPermission(['transfer_requests:review', 'transfer_requests:approve']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusResult = await pool.query(`SELECT id FROM request_statuses WHERE code = 'REVIEWED'`);
      const reviewedStatusId = statusResult.rows[0]?.id;
      if (!reviewedStatusId) return res.status(500).json({ error: 'REVIEWED status not found' });

      const currentReq = await pool.query(
        `SELECT tr.*, rs.code as status_code FROM transfer_requests tr
         JOIN request_statuses rs ON tr.status_id = rs.id
         WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Transfer request not found' });
      if (currentReq.rows[0].status_code !== 'SUBMITTED') {
        return res.status(400).json({ error: 'Transfer request must be in SUBMITTED status to review' });
      }

      const previousStatusId = currentReq.rows[0].status_id;
      const result = await pool.query(
        `UPDATE transfer_requests SET status_id = $1, reviewed_at = NOW(), reviewed_by = $2, updated_by = $2
         WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL RETURNING *`,
        [reviewedStatusId, userId, id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'transfer', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'reviewed', previousStatusId, newStatusId: reviewedStatusId,
        comments, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'transfer', requestId: parseInt(id),
        requestNumber: request.request_number || `TR-${id}`,
        action: 'reviewed', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Transfer request reviewed successfully', data: request });
    } catch (error: any) {
      console.error('Error reviewing transfer request:', error);
      res.status(500).json({ error: 'Failed to review transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/:id/approve
 * Approve transfer request (accepts from SUBMITTED or REVIEWED)
 */
router.post(
  '/:id/approve',
  authenticate,
  requirePermission('transfer_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'APPROVED'`;
      const statusResult = await pool.query(statusQuery);
      const approvedStatusId = statusResult.rows[0]?.id;

      const currentReq = await pool.query(
        `SELECT tr.*, rs.code as status_code FROM transfer_requests tr
         JOIN request_statuses rs ON tr.status_id = rs.id
         WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Transfer request not found' });
      const currentStatus = currentReq.rows[0].status_code;
      if (currentStatus !== 'SUBMITTED' && currentStatus !== 'REVIEWED') {
        return res.status(400).json({ error: 'Transfer request must be in SUBMITTED or REVIEWED status to approve' });
      }
      const previousStatusId = currentReq.rows[0].status_id;

      const result = await pool.query(
        `UPDATE transfer_requests SET status_id = $1, approved_at = NOW(), approved_by = $2, updated_by = $2
         WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL RETURNING *`,
        [approvedStatusId, userId, id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'transfer', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'approved', previousStatusId, newStatusId: approvedStatusId,
        comments, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'transfer', requestId: parseInt(id),
        requestNumber: request.request_number || `TR-${id}`,
        action: 'approved', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Transfer request approved successfully', data: request });
    } catch (error: any) {
      console.error('Error approving transfer request:', error);
      res.status(500).json({ error: 'Failed to approve transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/:id/reject
 * Reject transfer request
 */
router.post(
  '/:id/reject',
  authenticate,
  requirePermission('transfer_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason, comments } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      if (!rejection_reason || !rejection_reason.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'REJECTED'`;
      const statusResult = await pool.query(statusQuery);
      const rejectedStatusId = statusResult.rows[0]?.id;

      const currentReq = await pool.query(
        `SELECT tr.*, rs.code as status_code FROM transfer_requests tr
         JOIN request_statuses rs ON tr.status_id = rs.id
         WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Transfer request not found' });
      const currentStatus = currentReq.rows[0].status_code;
      if (currentStatus !== 'SUBMITTED' && currentStatus !== 'REVIEWED') {
        return res.status(400).json({ error: 'Transfer request must be in SUBMITTED or REVIEWED status to reject' });
      }
      const previousStatusId = currentReq.rows[0].status_id;

      const result = await pool.query(
        `UPDATE transfer_requests SET status_id = $1, rejected_at = NOW(), rejected_by = $2, rejection_reason = $3, updated_by = $2
         WHERE id = $4 AND company_id = $5 AND deleted_at IS NULL RETURNING *`,
        [rejectedStatusId, userId, rejection_reason.trim(), id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'transfer', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'rejected', previousStatusId, newStatusId: rejectedStatusId,
        comments, rejectionReason: rejection_reason.trim(),
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'transfer', requestId: parseInt(id),
        requestNumber: request.request_number || `TR-${id}`,
        action: 'rejected', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Transfer request rejected', data: request });
    } catch (error: any) {
      console.error('Error rejecting transfer request:', error);
      res.status(500).json({ error: 'Failed to reject transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/:id/execute
 * Mark transfer request as executed
 */
router.post(
  '/:id/execute',
  authenticate,
  requirePermission('transfer_requests:execute'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { transaction_reference, transfer_date } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'EXECUTED'`;
      const statusResult = await pool.query(statusQuery);
      const executedStatusId = statusResult.rows[0]?.id;

      const updateQuery = `
        UPDATE transfer_requests
        SET status_id = $1, executed_at = NOW(), executed_by = $2, 
            transaction_reference = $3, transfer_date = $4, updated_by = $2
        WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'APPROVED')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        executedStatusId, userId, transaction_reference, transfer_date || new Date(), id, companyId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Transfer request not found or cannot be executed (must be approved first)'
        });
      }

      res.json({
        message: 'Transfer request executed successfully',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error executing transfer request:', error);
      res.status(500).json({ error: 'Failed to execute transfer request' });
    }
  }
);

/**
 * POST /api/transfer-requests/:id/print
 * Track print event
 */
router.post(
  '/:id/print',
  authenticate,
  requirePermission('transfer_requests:print'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      // Check if allowed to print
      const checkQuery = `
        SELECT tr.*, rs.allows_print
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL
      `;

      const checkResult = await pool.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      const request = checkResult.rows[0];

      if (!request.allows_print) {
        return res.status(403).json({ error: 'Cannot print request in current status' });
      }

      // Update print tracking
      const updateQuery = `
        UPDATE transfer_requests
        SET 
          is_printed = true,
          first_printed_at = COALESCE(first_printed_at, NOW()),
          first_printed_by = COALESCE(first_printed_by, $1),
          print_count = print_count + 1,
          last_printed_at = NOW(),
          last_printed_by = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [userId, id]);

      res.json({
        message: 'Print event tracked',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error tracking print event:', error);
      res.status(500).json({ error: 'Failed to track print event' });
    }
  }
);

/**
 * DELETE /api/transfer-requests/:id
 * Soft delete transfer request
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('transfer_requests:delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      // Check if can be deleted
      const checkQuery = `
        SELECT tr.*, rs.allows_delete
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL
      `;

      const checkResult = await pool.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      const request = checkResult.rows[0];

      if (!request.allows_delete) {
        return res.status(403).json({ error: 'Cannot delete request in current status' });
      }

      // Soft delete
      const deleteQuery = `
        UPDATE transfer_requests 
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND deleted_at IS NULL
      `;

      await pool.query(deleteQuery, [userId, id]);

      res.json({ message: 'Transfer request deleted successfully' });

    } catch (error: any) {
      console.error('Error deleting transfer request:', error);
      res.status(500).json({ error: 'Failed to delete transfer request' });
    }
  }
);

export default router;
