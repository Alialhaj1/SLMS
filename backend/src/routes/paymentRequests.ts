/**
 * Payment Requests Routes
 * طلبات السداد
 * 
 * Endpoints for managing payment requests (linked to executed transfer requests)
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
 * GET /api/payment-requests
 * Get all payment requests
 */
router.get(
  '/',
  authenticate,
  requireAnyPermission(['payment_requests:view', 'payment_requests:manage']),
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
        is_posted,
        deleted_only,
        date_from,
        date_to,
        search,
        page = '1',
        limit = '50'
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let whereConditions = deleted_only === 'true' ? ['pr.deleted_at IS NOT NULL'] : ['pr.deleted_at IS NULL'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Company filter — always enforce company isolation (even for super_admin)
      if (companyId) {
        whereConditions.push(`pr.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`pr.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      if (status_id) {
        whereConditions.push(`pr.status_id = $${paramIndex}`);
        queryParams.push(status_id);
        paramIndex++;
      }

      if (project_id) {
        whereConditions.push(`pr.project_id = $${paramIndex}`);
        queryParams.push(project_id);
        paramIndex++;
      }

      if (shipment_id) {
        whereConditions.push(`pr.shipment_id = $${paramIndex}`);
        queryParams.push(shipment_id);
        paramIndex++;
      }

      if (vendor_id) {
        whereConditions.push(`pr.vendor_id = $${paramIndex}`);
        queryParams.push(vendor_id);
        paramIndex++;
      }

      if (is_printed !== undefined) {
        whereConditions.push(`pr.is_printed = $${paramIndex}`);
        queryParams.push(is_printed === 'true');
        paramIndex++;
      }

      if (is_posted !== undefined) {
        whereConditions.push(`pr.is_posted = $${paramIndex}`);
        queryParams.push(is_posted === 'true');
        paramIndex++;
      }

      if (date_from) {
        whereConditions.push(`pr.request_date >= $${paramIndex}`);
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereConditions.push(`pr.request_date <= $${paramIndex}`);
        queryParams.push(date_to);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(
          pr.request_number ILIKE $${paramIndex} OR
          pr.transaction_reference ILIKE $${paramIndex} OR
          pr.receipt_number ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const countQuery = `SELECT COUNT(*) as total FROM payment_requests pr WHERE ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const dataQuery = `
        SELECT 
          pr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          rs.color as status_color,
          rs.icon as status_icon,
          et.name as expense_type_name,
          et.name_ar as expense_type_name_ar,
          p.name as project_name,
          p.code as project_code,
          s.tracking_number as shipment_number,
          v.name as vendor_name,
          v.name_ar as vendor_name_ar,
          c.code as currency_code,
          c.symbol as currency_symbol,
          u.email as requested_by_email,
          u.full_name as requested_by_name,
          tr.request_number as transfer_request_number,
          er.request_number as expense_request_number
        FROM payment_requests pr
        LEFT JOIN request_statuses rs ON pr.status_id = rs.id
        LEFT JOIN request_expense_types et ON pr.expense_type_id = et.id
        LEFT JOIN projects p ON pr.project_id = p.id
        LEFT JOIN shipments s ON pr.shipment_id = s.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN currencies c ON pr.currency_id = c.id
        LEFT JOIN users u ON pr.requested_by = u.id
        LEFT JOIN transfer_requests tr ON pr.transfer_request_id = tr.id
        LEFT JOIN expense_requests er ON pr.expense_request_id = er.id
        WHERE ${whereClause}
        ORDER BY pr.request_date DESC, pr.id DESC
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
      console.error('Error fetching payment requests:', error);
      res.status(500).json({ error: 'Failed to fetch payment requests' });
    }
  }
);

/**
 * GET /api/payment-requests/:id
 * Get single payment request by ID
 */
router.get(
  '/:id',
  authenticate,
  requireAnyPermission(['payment_requests:view', 'payment_requests:manage']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');
      const isManager = req.user!.roles?.includes('admin') || req.user!.roles?.includes('manager');

      let whereConditions = ['pr.id = $1', 'pr.deleted_at IS NULL'];
      const queryParams: any[] = [id];
      let paramIndex = 2;

      // Company filter — always enforce company isolation
      if (companyId) {
        whereConditions.push(`pr.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`pr.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      const query = `
        SELECT 
          pr.*,
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
          s.tracking_number as shipment_number,
          v.name as vendor_name,
          v.name_ar as vendor_name_ar,
          v.email as vendor_email,
          v.phone as vendor_phone,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          u.email as requested_by_email,
          u.full_name as requested_by_name,
          approver.email as approved_by_email,
          approver.full_name as approved_by_name,
          rejector.email as rejected_by_email,
          rejector.full_name as rejected_by_name,
          executor.full_name as executed_by_name,
          tr.request_number as transfer_request_number,
          er.request_number as expense_request_number,
          ba.account_number as bank_account_number,
          ba.bank_name
        FROM payment_requests pr
        LEFT JOIN request_statuses rs ON pr.status_id = rs.id
        LEFT JOIN request_expense_types et ON pr.expense_type_id = et.id
        LEFT JOIN projects p ON pr.project_id = p.id
        LEFT JOIN shipments s ON pr.shipment_id = s.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN currencies c ON pr.currency_id = c.id
        LEFT JOIN users u ON pr.requested_by = u.id
        LEFT JOIN users approver ON pr.approved_by = approver.id
        LEFT JOIN users rejector ON pr.rejected_by = rejector.id
        LEFT JOIN users executor ON pr.executed_by = executor.id
        LEFT JOIN transfer_requests tr ON pr.transfer_request_id = tr.id
        LEFT JOIN expense_requests er ON pr.expense_request_id = er.id
        LEFT JOIN bank_accounts ba ON pr.bank_account_id = ba.id
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment request not found' });
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
        WHERE rah.request_type = 'payment'
          AND rah.request_id = $1
        ORDER BY rah.performed_at DESC
      `;

      const historyResult = await pool.query(historyQuery, [id]);

      res.json({
        ...result.rows[0],
        history: historyResult.rows
      });

    } catch (error: any) {
      console.error('Error fetching payment request:', error);
      res.status(500).json({ error: 'Failed to fetch payment request' });
    }
  }
);

/**
 * POST /api/payment-requests
 * Create new payment request (from approved transfer request)
 */
router.post(
  '/',
  authenticate,
  requirePermission('payment_requests:create'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const {
        transfer_request_id,
        payment_method,
        payment_date,
        bank_account_id,
        cheque_number,
        transaction_reference,
        receipt_number,
        notes,
        internal_notes
      } = req.body;

      if (!transfer_request_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'transfer_request_id is required' });
      }

      // Verify transfer request exists and is approved
      const transferCheck = await client.query(`
        SELECT tr.*, rs.code as status_code
        FROM transfer_requests tr
        LEFT JOIN request_statuses rs ON tr.status_id = rs.id
        WHERE tr.id = $1 AND tr.company_id = $2 AND tr.deleted_at IS NULL
      `, [transfer_request_id, companyId]);

      if (transferCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      const transferRequest = transferCheck.rows[0];

      if (transferRequest.status_code !== 'APPROVED' && transferRequest.status_code !== 'EXECUTED') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Transfer request must be approved before creating payment request'
        });
      }

      // Check if payment request already exists
      const existingPayment = await client.query(
        'SELECT id FROM payment_requests WHERE transfer_request_id = $1 AND deleted_at IS NULL',
        [transfer_request_id]
      );

      if (existingPayment.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Payment request already exists for this transfer request'
        });
      }

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'DRAFT'`;
      const statusResult = await client.query(statusQuery);
      const draftStatusId = statusResult.rows[0]?.id || 1;

      // Insert payment request (inherits data from transfer request)
      const insertQuery = `
        INSERT INTO payment_requests (
          company_id, requested_by, transfer_request_id, expense_request_id,
          project_id, shipment_id, expense_type_id, vendor_id,
          currency_id, payment_amount, payment_amount_local,
          payment_method, payment_date,
          bank_account_id, cheque_number, transaction_reference, receipt_number,
          status_id, notes, internal_notes,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        companyId,
        userId,
        transfer_request_id,
        transferRequest.expense_request_id,
        transferRequest.project_id,
        transferRequest.shipment_id,
        transferRequest.expense_type_id,
        transferRequest.vendor_id,
        transferRequest.currency_id,
        transferRequest.transfer_amount,
        transferRequest.transfer_amount_local,
        payment_method,
        payment_date,
        bank_account_id,
        cheque_number,
        transaction_reference,
        receipt_number,
        draftStatusId,
        notes,
        internal_notes,
        userId,
        userId
      ]);

      await client.query('COMMIT');

      const fetchQuery = `
        SELECT 
          pr.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          et.name as expense_type_name,
          p.name as project_name,
          s.tracking_number as shipment_number,
          v.name as vendor_name,
          c.code as currency_code
        FROM payment_requests pr
        LEFT JOIN request_statuses rs ON pr.status_id = rs.id
        LEFT JOIN request_expense_types et ON pr.expense_type_id = et.id
        LEFT JOIN projects p ON pr.project_id = p.id
        LEFT JOIN shipments s ON pr.shipment_id = s.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN currencies c ON pr.currency_id = c.id
        WHERE pr.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [insertResult.rows[0].id]);

      res.status(201).json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating payment request:', error);
      res.status(500).json({ error: 'Failed to create payment request' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/payment-requests/:id/submit
 * Submit payment request for approval
 */
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('payment_requests:submit'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'SUBMITTED'`;
      const statusResult = await pool.query(statusQuery);
      const submittedStatusId = statusResult.rows[0]?.id;

      const updateQuery = `
        UPDATE payment_requests
        SET status_id = $1, submitted_at = NOW(), submitted_by = $2, updated_by = $2
        WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'DRAFT')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [submittedStatusId, userId, id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment request not found or cannot be submitted' });
      }

      const request = result.rows[0];

      const draftStatusId = (await pool.query(`SELECT id FROM request_statuses WHERE code = 'DRAFT'`)).rows[0]?.id;
      await recordApprovalHistory({
        requestType: 'payment', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'submitted', previousStatusId: draftStatusId, newStatusId: submittedStatusId,
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'payment', requestId: parseInt(id),
        requestNumber: request.request_number || `PAY-${id}`,
        action: 'submitted', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Payment request submitted for approval', data: request });
    } catch (error: any) {
      console.error('Error submitting payment request:', error);
      res.status(500).json({ error: 'Failed to submit payment request' });
    }
  }
);

/**
 * POST /api/payment-requests/:id/review
 * Review payment request (3-level: SUBMITTED → REVIEWED)
 */
router.post(
  '/:id/review',
  authenticate,
  requireAnyPermission(['payment_requests:review', 'payment_requests:approve']),
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
        `SELECT pr.*, rs.code as status_code FROM payment_requests pr
         JOIN request_statuses rs ON pr.status_id = rs.id
         WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Payment request not found' });
      if (currentReq.rows[0].status_code !== 'SUBMITTED') {
        return res.status(400).json({ error: 'Payment request must be in SUBMITTED status to review' });
      }

      const previousStatusId = currentReq.rows[0].status_id;
      const result = await pool.query(
        `UPDATE payment_requests SET status_id = $1, reviewed_at = NOW(), reviewed_by = $2, updated_by = $2
         WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL RETURNING *`,
        [reviewedStatusId, userId, id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'payment', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'reviewed', previousStatusId, newStatusId: reviewedStatusId,
        comments, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'payment', requestId: parseInt(id),
        requestNumber: request.request_number || `PAY-${id}`,
        action: 'reviewed', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Payment request reviewed successfully', data: request });
    } catch (error: any) {
      console.error('Error reviewing payment request:', error);
      res.status(500).json({ error: 'Failed to review payment request' });
    }
  }
);

/**
 * POST /api/payment-requests/:id/approve
 * Approve payment request (accepts from SUBMITTED or REVIEWED)
 */
router.post(
  '/:id/approve',
  authenticate,
  requirePermission('payment_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusResult = await pool.query(`SELECT id FROM request_statuses WHERE code = 'APPROVED'`);
      const approvedStatusId = statusResult.rows[0]?.id;

      const currentReq = await pool.query(
        `SELECT pr.*, rs.code as status_code FROM payment_requests pr
         JOIN request_statuses rs ON pr.status_id = rs.id
         WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Payment request not found' });
      const currentStatus = currentReq.rows[0].status_code;
      if (currentStatus !== 'SUBMITTED' && currentStatus !== 'REVIEWED') {
        return res.status(400).json({ error: 'Payment request must be in SUBMITTED or REVIEWED status to approve' });
      }
      const previousStatusId = currentReq.rows[0].status_id;

      const result = await pool.query(
        `UPDATE payment_requests SET status_id = $1, approved_at = NOW(), approved_by = $2, updated_by = $2
         WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL RETURNING *`,
        [approvedStatusId, userId, id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'payment', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'approved', previousStatusId, newStatusId: approvedStatusId,
        comments, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'payment', requestId: parseInt(id),
        requestNumber: request.request_number || `PAY-${id}`,
        action: 'approved', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Payment request approved', data: request });
    } catch (error: any) {
      console.error('Error approving payment request:', error);
      res.status(500).json({ error: 'Failed to approve payment request' });
    }
  }
);

/**
 * POST /api/payment-requests/:id/reject
 * Reject payment request
 */
router.post(
  '/:id/reject',
  authenticate,
  requirePermission('payment_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason, comments } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      if (!rejection_reason || !rejection_reason.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const statusResult = await pool.query(`SELECT id FROM request_statuses WHERE code = 'REJECTED'`);
      const rejectedStatusId = statusResult.rows[0]?.id;

      const currentReq = await pool.query(
        `SELECT pr.*, rs.code as status_code FROM payment_requests pr
         JOIN request_statuses rs ON pr.status_id = rs.id
         WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (currentReq.rows.length === 0) return res.status(404).json({ error: 'Payment request not found' });
      const currentStatus = currentReq.rows[0].status_code;
      if (currentStatus !== 'SUBMITTED' && currentStatus !== 'REVIEWED') {
        return res.status(400).json({ error: 'Payment request must be in SUBMITTED or REVIEWED status to reject' });
      }
      const previousStatusId = currentReq.rows[0].status_id;

      const result = await pool.query(
        `UPDATE payment_requests SET status_id = $1, rejected_at = NOW(), rejected_by = $2, rejection_reason = $3, updated_by = $2
         WHERE id = $4 AND company_id = $5 AND deleted_at IS NULL RETURNING *`,
        [rejectedStatusId, userId, rejection_reason.trim(), id, companyId]
      );
      const request = result.rows[0];

      await recordApprovalHistory({
        requestType: 'payment', requestId: parseInt(id), companyId: companyId!,
        userId, action: 'rejected', previousStatusId, newStatusId: rejectedStatusId,
        comments, rejectionReason: rejection_reason.trim(),
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      await notifyOnAction({
        companyId: companyId!, requestType: 'payment', requestId: parseInt(id),
        requestNumber: request.request_number || `PAY-${id}`,
        action: 'rejected', actorId: userId, requestedBy: request.requested_by,
      });

      res.json({ message: 'Payment request rejected', data: request });
    } catch (error: any) {
      console.error('Error rejecting payment request:', error);
      res.status(500).json({ error: 'Failed to reject payment request' });
    }
  }
);

/**
 * POST /api/payment-requests/:id/execute
 * Mark payment request as executed
 */
router.post(
  '/:id/execute',
  authenticate,
  requirePermission('payment_requests:execute'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { transaction_reference, payment_date } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;

      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'EXECUTED'`;
      const statusResult = await pool.query(statusQuery);
      const executedStatusId = statusResult.rows[0]?.id;

      const updateQuery = `
        UPDATE payment_requests
        SET status_id = $1, executed_at = NOW(), executed_by = $2, 
            transaction_reference = COALESCE($3, transaction_reference), 
            payment_date = COALESCE($4, payment_date), 
            updated_by = $2
        WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'APPROVED')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        executedStatusId, userId, transaction_reference, payment_date, id, companyId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Payment request not found or cannot be executed'
        });
      }

      res.json({
        message: 'Payment request executed successfully',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error executing payment request:', error);
      res.status(500).json({ error: 'Failed to execute payment request' });
    }
  }
);

/**
 * POST /api/payment-requests/:id/print
 * Track print event
 */
router.post(
  '/:id/print',
  authenticate,
  requirePermission('payment_requests:print'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const updateQuery = `
        UPDATE payment_requests
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

export default router;
