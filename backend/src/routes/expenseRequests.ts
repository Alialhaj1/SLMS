/**
 * Expense Requests Routes
 * طلبات المصاريف
 * 
 * Endpoints for managing expense requests linked to projects and shipments
 */

import express from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { runAccountingRules } from '../services/accountingEngine';

const router = express.Router();

// Apply authentication and company context to all routes
router.use(authenticate);
router.use(loadCompanyContext);

/**
 * GET /api/expense-requests
 * Get all expense requests (filtered by user context and permissions)
 */
router.get(
  '/',
  authenticate,
  requireAnyPermission(['expense_requests:view', 'expense_requests:manage']),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');
      const isManager = req.user!.roles?.includes('admin') || req.user!.roles?.includes('manager');

      const { 
        status_id, 
        project_id, 
        shipment_id, 
        expense_type_id,
        vendor_id,
        date_from,
        date_to,
        search,
        is_printed,
        deleted_only,
        page = '1',
        limit = '50'
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Handle deleted_only filter - show deleted requests only for restore feature
      let whereConditions = deleted_only === 'true' 
        ? ['er.deleted_at IS NOT NULL'] 
        : ['er.deleted_at IS NULL'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Company filter (unless super_admin)
      if (!isSuperAdmin && companyId) {
        whereConditions.push(`er.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      // User filter (show only own requests unless manager)
      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`er.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      // Status filter
      if (status_id) {
        whereConditions.push(`er.status_id = $${paramIndex}`);
        queryParams.push(status_id);
        paramIndex++;
      }

      // Project filter
      if (project_id) {
        whereConditions.push(`er.project_id = $${paramIndex}`);
        queryParams.push(project_id);
        paramIndex++;
      }

      // Shipment filter
      if (shipment_id) {
        whereConditions.push(`er.shipment_id = $${paramIndex}`);
        queryParams.push(shipment_id);
        paramIndex++;
      }

      // Expense type filter
      if (expense_type_id) {
        whereConditions.push(`er.expense_type_id = $${paramIndex}`);
        queryParams.push(expense_type_id);
        paramIndex++;
      }

      // Vendor filter
      if (vendor_id) {
        whereConditions.push(`er.vendor_id = $${paramIndex}`);
        queryParams.push(vendor_id);
        paramIndex++;
      }

      // Printed filter (for separating current vs previous requests)
      if (is_printed !== undefined && is_printed !== '') {
        whereConditions.push(`er.is_printed = $${paramIndex}`);
        queryParams.push(is_printed === 'true');
        paramIndex++;
      }

      // Date range filter
      if (date_from) {
        whereConditions.push(`er.request_date >= $${paramIndex}`);
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereConditions.push(`er.request_date <= $${paramIndex}`);
        queryParams.push(date_to);
        paramIndex++;
      }

      // Search filter (by request number, BL number, notes)
      if (search) {
        whereConditions.push(`(
          er.request_number ILIKE $${paramIndex} OR
          er.bl_number ILIKE $${paramIndex} OR
          er.notes ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM expense_requests er
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data with joins
      const dataQuery = `
        SELECT 
          er.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          rs.color as status_color,
          rs.icon as status_icon,
          -- Use shipment expense type if available, otherwise fall back to request expense type
          COALESCE(set.name, et.name) as expense_type_name,
          COALESCE(set.name_ar, et.name_ar) as expense_type_name_ar,
          COALESCE(set.code, et.code) as expense_type_code,
          et.icon as expense_type_icon,
          et.color as expense_type_color,
          p.name as project_name,
          p.code as project_code,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          v.name_ar as vendor_name_ar,
          c.code as currency_code,
          c.symbol as currency_symbol,
          u.email as requested_by_email,
          u.full_name as requested_by_name,
          approver.email as approved_by_email,
          approver.full_name as approved_by_name
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        LEFT JOIN request_expense_types et ON er.expense_type_id = et.id
        LEFT JOIN shipment_expenses se ON er.source_shipment_expense_id = se.id
        LEFT JOIN shipment_expense_types set ON se.expense_type_id = set.id
        LEFT JOIN projects p ON er.project_id = p.id
        LEFT JOIN logistics_shipments s ON er.shipment_id = s.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        LEFT JOIN currencies c ON er.currency_id = c.id
        LEFT JOIN users u ON er.requested_by = u.id
        LEFT JOIN users approver ON er.approved_by = approver.id
        WHERE ${whereClause}
        ORDER BY er.request_date DESC, er.id DESC
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
      console.error('Error fetching expense requests:', error);
      res.status(500).json({ error: 'Failed to fetch expense requests' });
    }
  }
);

/**
 * GET /api/expense-requests/:id
 * Get single expense request by ID
 */
router.get(
  '/:id',
  authenticate,
  requireAnyPermission(['expense_requests:view', 'expense_requests:manage']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');
      const isManager = req.user!.roles?.includes('admin') || req.user!.roles?.includes('manager');

      // Build query with permission checks
      let whereConditions = ['er.id = $1', 'er.deleted_at IS NULL'];
      const queryParams: any[] = [id];
      let paramIndex = 2;

      if (!isSuperAdmin && companyId) {
        whereConditions.push(`er.company_id = $${paramIndex}`);
        queryParams.push(companyId);
        paramIndex++;
      }

      if (!isManager && !isSuperAdmin) {
        whereConditions.push(`er.requested_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      const query = `
        SELECT 
          er.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          rs.color as status_color,
          rs.icon as status_icon,
          rs.allows_edit,
          rs.allows_delete,
          rs.allows_print,
          rs.allows_submit,
          -- Use shipment expense type if available, otherwise fall back to request expense type
          COALESCE(set.name, et.name) as expense_type_name,
          COALESCE(set.name_ar, et.name_ar) as expense_type_name_ar,
          et.icon as expense_type_icon,
          et.color as expense_type_color,
          et.requires_items,
          p.name as project_name,
          p.code as project_code,
          s.shipment_number as shipment_number,
          s.bl_no as shipment_bl_number,
          s.purchase_order_id as shipment_po_id,
          po.order_number as shipment_po_number,
          po.vendor_contract_number as vendor_po_number,
          po.vendor_name as shipment_po_vendor_name,
          shipment_vendor.id as shipment_vendor_id,
          shipment_vendor.name as shipment_vendor_name,
          shipment_vendor.name_ar as shipment_vendor_name_ar,
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
          -- Shipment expense source data
          se.invoice_number as source_invoice_number,
          se.expense_date as source_invoice_date,
          se.entity_name as source_entity_name,
          se.description as source_description,
          se.bl_number as source_bl_number,
          se.lc_bank_name as source_bank_name,
          se.lc_number as source_lc_number,
          se.receipt_number as source_receipt_number,
          se.payment_reference as source_payment_reference,
          ins_co.name as source_insurance_company,
          ins_co.name_ar as source_insurance_company_ar,
          ship_agent.name as source_shipping_agent,
          ship_agent.name_ar as source_shipping_agent_ar,
          ship_co.name as source_shipping_company,
          ship_co.name_ar as source_shipping_company_ar,
          clearance.name as source_clearance_office,
          clearance.name_ar as source_clearance_office_ar
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        LEFT JOIN request_expense_types et ON er.expense_type_id = et.id
        LEFT JOIN shipment_expenses se ON er.source_shipment_expense_id = se.id
        LEFT JOIN shipment_expense_types set ON se.expense_type_id = set.id
        LEFT JOIN projects p ON er.project_id = p.id
        LEFT JOIN logistics_shipments s ON er.shipment_id = s.id
        LEFT JOIN purchase_orders po ON s.purchase_order_id = po.id
        LEFT JOIN vendors shipment_vendor ON s.vendor_id = shipment_vendor.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        LEFT JOIN currencies c ON er.currency_id = c.id
        LEFT JOIN users u ON er.requested_by = u.id
        LEFT JOIN users approver ON er.approved_by = approver.id
        LEFT JOIN users rejector ON er.rejected_by = rejector.id
        LEFT JOIN insurance_companies ins_co ON se.insurance_company_id = ins_co.id
        LEFT JOIN shipping_agents ship_agent ON se.shipping_agent_id = ship_agent.id
        LEFT JOIN vendors ship_co ON se.shipping_company_id = ship_co.id
        LEFT JOIN clearance_offices clearance ON se.clearance_office_id = clearance.id
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense request not found' });
      }

      // Get items for this request
      const itemsQuery = `
        SELECT 
          eri.*,
          i.name as item_name,
          i.name_ar as item_name_ar,
          i.code as item_code,
          uom.name as uom_name,
          uom.code as uom_abbreviation
        FROM expense_request_items eri
        LEFT JOIN items i ON eri.item_id = i.id
        LEFT JOIN units_of_measure uom ON eri.uom_id = uom.id
        WHERE eri.expense_request_id = $1
        ORDER BY eri.id
      `;

      const itemsResult = await pool.query(itemsQuery, [id]);

      // Get attachments
      const attachmentsQuery = `
        SELECT 
          era.*,
          u.email as uploaded_by_email,
          u.full_name as uploaded_by_name
        FROM expense_request_attachments era
        LEFT JOIN users u ON era.uploaded_by = u.id
        WHERE era.expense_request_id = $1
        ORDER BY era.uploaded_at DESC
      `;

      const attachmentsResult = await pool.query(attachmentsQuery, [id]);

      // Get approval history
      const historyQuery = `
        SELECT 
          rah.*,
          u.email as performed_by_email,
          u.full_name as performed_by_name,
          ps.name as previous_status_name,
          ps.name_ar as previous_status_name_ar,
          ns.name as new_status_name,
          ns.name_ar as new_status_name_ar
        FROM request_approval_history rah
        LEFT JOIN users u ON rah.performed_by = u.id
        LEFT JOIN request_statuses ps ON rah.previous_status_id = ps.id
        LEFT JOIN request_statuses ns ON rah.new_status_id = ns.id
        WHERE rah.request_type = 'expense'
          AND rah.request_id = $1
        ORDER BY rah.performed_at DESC
      `;

      const historyResult = await pool.query(historyQuery, [id]);

      // Get shipment items if this request is linked to a shipment
      let shipmentItems: any[] = [];
      if (result.rows[0].shipment_id) {
        const shipmentItemsQuery = `
          SELECT 
            lsi.*,
            i.name as item_name,
            i.name_ar as item_name_ar,
            i.code as item_code,
            uom.name as uom_name,
            uom.code as uom_code
          FROM logistics_shipment_items lsi
          LEFT JOIN items i ON lsi.item_id = i.id
          LEFT JOIN units_of_measure uom ON lsi.uom_id = uom.id
          WHERE lsi.shipment_id = $1 AND lsi.deleted_at IS NULL
          ORDER BY lsi.id
        `;
        const shipmentItemsResult = await pool.query(shipmentItemsQuery, [result.rows[0].shipment_id]);
        shipmentItems = shipmentItemsResult.rows;
      }

      res.json({
        ...result.rows[0],
        items: itemsResult.rows,
        shipment_items: shipmentItems,
        attachments: attachmentsResult.rows,
        history: historyResult.rows
      });

    } catch (error: any) {
      console.error('Error fetching expense request:', error);
      res.status(500).json({ error: 'Failed to fetch expense request' });
    }
  }
);

/**
 * POST /api/expense-requests
 * Create new expense request
 */
router.post(
  '/',
  authenticate,
  requirePermission('expense_requests:create'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.user!.id;
      const companyId = req.companyId;

      const {
        project_id,
        shipment_id,
        expense_type_id,
        vendor_id,
        bl_number,
        container_number,
        port_of_loading_id,
        port_of_discharge_id,
        currency_id,
        exchange_rate_id,
        exchange_rate,
        total_amount,
        notes,
        internal_notes,
        items = [],
        status_id = 1  // Default to 'DRAFT'
      } = req.body;

      // Validation
      if (!project_id || !shipment_id || !expense_type_id || !vendor_id || !currency_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Missing required fields: project_id, shipment_id, expense_type_id, vendor_id, currency_id'
        });
      }

      // Verify project exists and user has access
      const projectCheck = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [project_id, companyId]
      );

      if (projectCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      // Verify shipment exists
      const shipmentCheck = await client.query(
        'SELECT id FROM shipments WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [shipment_id, companyId]
      );

      if (shipmentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Shipment not found' });
      }

      // Calculate total amount local
      const exchangeRateValue = exchange_rate || 1;
      const total_amount_local = parseFloat(total_amount) * exchangeRateValue;

      // Insert expense request (request_number auto-generated by trigger)
      const insertQuery = `
        INSERT INTO expense_requests (
          company_id, requested_by, project_id, shipment_id,
          expense_type_id, vendor_id, bl_number, container_number,
          port_of_loading_id, port_of_discharge_id, currency_id,
          exchange_rate_id, exchange_rate, total_amount, total_amount_local,
          status_id, notes, internal_notes, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        companyId, userId, project_id, shipment_id,
        expense_type_id, vendor_id, bl_number, container_number,
        port_of_loading_id, port_of_discharge_id, currency_id,
        exchange_rate_id, exchangeRateValue, total_amount, total_amount_local,
        status_id, notes, internal_notes, userId, userId
      ]);

      const expenseRequestId = insertResult.rows[0].id;

      // Insert items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          const lineTotal = (parseFloat(item.quantity) * parseFloat(item.unit_price)) 
            - parseFloat(item.discount_amount || 0)
            + parseFloat(item.tax_amount || 0);

          await client.query(`
            INSERT INTO expense_request_items (
              expense_request_id, item_id, item_description, item_description_ar,
              quantity, uom_id, unit_price, discount_percent, discount_amount,
              tax_percent, tax_amount, line_total, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            expenseRequestId, item.item_id, item.item_description, item.item_description_ar,
            item.quantity, item.uom_id, item.unit_price, item.discount_percent || 0,
            item.discount_amount || 0, item.tax_percent || 0, item.tax_amount || 0,
            lineTotal, item.notes
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch created request with joins
      const fetchQuery = `
        SELECT 
          er.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          et.name as expense_type_name,
          et.name_ar as expense_type_name_ar,
          p.name as project_name,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          c.code as currency_code
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        LEFT JOIN request_expense_types et ON er.expense_type_id = et.id
        LEFT JOIN projects p ON er.project_id = p.id
        LEFT JOIN logistics_shipments s ON er.shipment_id = s.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        LEFT JOIN currencies c ON er.currency_id = c.id
        WHERE er.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [expenseRequestId]);

      res.status(201).json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating expense request:', error);
      res.status(500).json({ error: 'Failed to create expense request' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/expense-requests/:id
 * Update existing expense request
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('expense_requests:update'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;

      // Check if request exists and user has permission
      const checkQuery = `
        SELECT er.*, rs.allows_edit, rs.stage
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL
      `;

      const checkResult = await client.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Expense request not found' });
      }

      const existingRequest = checkResult.rows[0];

      // Check if editing is allowed
      if (!existingRequest.allows_edit) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: `Cannot edit request in ${existingRequest.stage} status`
        });
      }

      const {
        project_id,
        shipment_id,
        expense_type_id,
        vendor_id,
        bl_number,
        container_number,
        port_of_loading_id,
        port_of_discharge_id,
        currency_id,
        exchange_rate_id,
        exchange_rate,
        total_amount,
        notes,
        internal_notes,
        items = []
      } = req.body;

      // Calculate total amount local
      const exchangeRateValue = exchange_rate || existingRequest.exchange_rate || 1;
      const total_amount_local = parseFloat(total_amount || existingRequest.total_amount) * exchangeRateValue;

      // Update expense request
      const updateQuery = `
        UPDATE expense_requests SET
          project_id = COALESCE($1, project_id),
          shipment_id = COALESCE($2, shipment_id),
          expense_type_id = COALESCE($3, expense_type_id),
          vendor_id = COALESCE($4, vendor_id),
          bl_number = COALESCE($5, bl_number),
          container_number = COALESCE($6, container_number),
          port_of_loading_id = $7,
          port_of_discharge_id = $8,
          currency_id = COALESCE($9, currency_id),
          exchange_rate_id = $10,
          exchange_rate = COALESCE($11, exchange_rate),
          total_amount = COALESCE($12, total_amount),
          total_amount_local = $13,
          notes = $14,
          internal_notes = $15,
          updated_by = $16
        WHERE id = $17 AND deleted_at IS NULL
        RETURNING *
      `;

      await client.query(updateQuery, [
        project_id, shipment_id, expense_type_id, vendor_id,
        bl_number, container_number, port_of_loading_id, port_of_discharge_id,
        currency_id, exchange_rate_id, exchange_rate, total_amount,
        total_amount_local, notes, internal_notes, userId, id
      ]);

      // Update items (delete and recreate for simplicity)
      if (items && items.length > 0) {
        await client.query('DELETE FROM expense_request_items WHERE expense_request_id = $1', [id]);

        for (const item of items) {
          const lineTotal = (parseFloat(item.quantity) * parseFloat(item.unit_price)) 
            - parseFloat(item.discount_amount || 0)
            + parseFloat(item.tax_amount || 0);

          await client.query(`
            INSERT INTO expense_request_items (
              expense_request_id, item_id, item_description, item_description_ar,
              quantity, uom_id, unit_price, discount_percent, discount_amount,
              tax_percent, tax_amount, line_total, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            id, item.item_id, item.item_description, item.item_description_ar,
            item.quantity, item.uom_id, item.unit_price, item.discount_percent || 0,
            item.discount_amount || 0, item.tax_percent || 0, item.tax_amount || 0,
            lineTotal, item.notes
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch updated request
      const fetchQuery = `
        SELECT 
          er.*,
          rs.name as status_name,
          rs.name_ar as status_name_ar,
          et.name as expense_type_name,
          p.name as project_name,
          s.shipment_number as shipment_number,
          v.name as vendor_name,
          c.code as currency_code
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        LEFT JOIN request_expense_types et ON er.expense_type_id = et.id
        LEFT JOIN projects p ON er.project_id = p.id
        LEFT JOIN logistics_shipments s ON er.shipment_id = s.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        LEFT JOIN currencies c ON er.currency_id = c.id
        WHERE er.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [id]);

      res.json(fetchResult.rows[0]);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating expense request:', error);
      res.status(500).json({ error: 'Failed to update expense request' });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /api/expense-requests/:id
 * Soft delete expense request
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('expense_requests:delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;

      // Check if request exists and can be deleted
      const checkQuery = `
        SELECT er.*, rs.allows_delete, rs.stage
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL
      `;

      const checkResult = await pool.query(checkQuery, [id, companyId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense request not found' });
      }

      const existingRequest = checkResult.rows[0];

      if (!existingRequest.allows_delete) {
        return res.status(403).json({
          error: `Cannot delete request in ${existingRequest.stage} status`
        });
      }

      // Soft delete
      const deleteQuery = `
        UPDATE expense_requests 
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND deleted_at IS NULL
      `;

      await pool.query(deleteQuery, [userId, id]);

      res.json({ message: 'Expense request deleted successfully' });

    } catch (error: any) {
      console.error('Error deleting expense request:', error);
      res.status(500).json({ error: 'Failed to delete expense request' });
    }
  }
);

/**
 * POST /api/expense-requests/:id/submit
 * Submit expense request for approval
 */
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('expense_requests:submit'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;

      // Get SUBMITTED status ID
      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'SUBMITTED'`;
      const statusResult = await pool.query(statusQuery);
      const submittedStatusId = statusResult.rows[0]?.id;

      if (!submittedStatusId) {
        return res.status(500).json({ error: 'SUBMITTED status not found in system' });
      }

      // Update request status
      const updateQuery = `
        UPDATE expense_requests
        SET status_id = $1, submitted_at = NOW(), submitted_by = $2, updated_by = $2
        WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'DRAFT')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [submittedStatusId, userId, id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Expense request not found or cannot be submitted (must be in DRAFT status)'
        });
      }

      res.json({
        message: 'Expense request submitted for approval',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error submitting expense request:', error);
      res.status(500).json({ error: 'Failed to submit expense request' });
    }
  }
);

/**
 * POST /api/expense-requests/:id/approve
 * Approve expense request
 */
router.post(
  '/:id/approve',
  authenticate,
  requirePermission('expense_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;

      // Get APPROVED status ID
      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'APPROVED'`;
      const statusResult = await pool.query(statusQuery);
      const approvedStatusId = statusResult.rows[0]?.id;

      if (!approvedStatusId) {
        return res.status(500).json({ error: 'APPROVED status not found in system' });
      }

      // Update request status
      const updateQuery = `
        UPDATE expense_requests
        SET status_id = $1, approved_at = NOW(), approved_by = $2, updated_by = $2
        WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'SUBMITTED')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [approvedStatusId, userId, id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Expense request not found or cannot be approved (must be in SUBMITTED status)'
        });
      }

      // =============================================
      // Trigger Accounting Engine
      // =============================================
      let accountingResult = null;
      if (companyId) {
        try {
          accountingResult = await runAccountingRules({
            event: 'expense_request_approved',
            entity_id: parseInt(id),
            entity_type: 'expense_request',
            company_id: companyId,
            user_id: userId
          });
          
          console.log('[Accounting Engine] expense_request_approved result:', accountingResult);
        } catch (accError: any) {
          // Log but don't fail the approval
          console.error('[Accounting Engine] Error processing expense_request_approved:', accError);
        }
      }
      // =============================================

      res.json({
        message: 'Expense request approved successfully',
        data: result.rows[0],
        accounting: accountingResult || null
      });

    } catch (error: any) {
      console.error('Error approving expense request:', error);
      res.status(500).json({ error: 'Failed to approve expense request' });
    }
  }
);

/**
 * POST /api/expense-requests/:id/reject
 * Reject expense request
 */
router.post(
  '/:id/reject',
  authenticate,
  requirePermission('expense_requests:approve'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const userId = req.user!.id;
      const companyId = req.companyId;

      if (!rejection_reason || rejection_reason.trim().length === 0) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      // Get REJECTED status ID
      const statusQuery = `SELECT id FROM request_statuses WHERE code = 'REJECTED'`;
      const statusResult = await pool.query(statusQuery);
      const rejectedStatusId = statusResult.rows[0]?.id;

      if (!rejectedStatusId) {
        return res.status(500).json({ error: 'REJECTED status not found in system' });
      }

      // Update request status
      const updateQuery = `
        UPDATE expense_requests
        SET status_id = $1, rejected_at = NOW(), rejected_by = $2, 
            rejection_reason = $3, updated_by = $2
        WHERE id = $4 AND company_id = $5 AND deleted_at IS NULL
          AND status_id = (SELECT id FROM request_statuses WHERE code = 'SUBMITTED')
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        rejectedStatusId, userId, rejection_reason, id, companyId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Expense request not found or cannot be rejected (must be in SUBMITTED status)'
        });
      }

      res.json({
        message: 'Expense request rejected',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error rejecting expense request:', error);
      res.status(500).json({ error: 'Failed to reject expense request' });
    }
  }
);

/**
 * POST /api/expense-requests/:id/print
 * Mark expense request as printed and increment print count
 */
router.post(
  '/:id/print',
  authenticate,
  requireAnyPermission(['expense_requests:view', 'expense_requests:manage']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');

      // Update print tracking
      const updateQuery = `
        UPDATE expense_requests
        SET 
          is_printed = true,
          print_count = COALESCE(print_count, 0) + 1,
          first_printed_at = CASE WHEN first_printed_at IS NULL THEN NOW() ELSE first_printed_at END,
          first_printed_by = CASE WHEN first_printed_by IS NULL THEN $1 ELSE first_printed_by END,
          last_printed_at = NOW(),
          last_printed_by = $1
        WHERE id = $2 
          AND deleted_at IS NULL
          ${!isSuperAdmin && companyId ? 'AND company_id = $3' : ''}
        RETURNING *
      `;

      const params = !isSuperAdmin && companyId ? [userId, id, companyId] : [userId, id];
      const result = await pool.query(updateQuery, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense request not found' });
      }

      res.json({
        message: 'Expense request marked as printed',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error marking expense request as printed:', error);
      res.status(500).json({ error: 'Failed to mark expense request as printed' });
    }
  }
);

/**
 * POST /api/expense-requests/:id/restore
 * Restore a soft-deleted expense request
 */
router.post(
  '/:id/restore',
  authenticate,
  requireAnyPermission(['expense_requests:delete', 'expense_requests:manage']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const companyId = req.companyId;
      const isSuperAdmin = req.user!.roles?.includes('super_admin');

      // Restore by clearing deleted_at
      const updateQuery = `
        UPDATE expense_requests
        SET 
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = $1,
          updated_at = NOW()
        WHERE id = $2 
          AND deleted_at IS NOT NULL
          ${!isSuperAdmin && companyId ? 'AND company_id = $3' : ''}
        RETURNING *
      `;

      const params = !isSuperAdmin && companyId ? [userId, id, companyId] : [userId, id];
      const result = await pool.query(updateQuery, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deleted expense request not found' });
      }

      res.json({
        message: 'Expense request restored',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error restoring expense request:', error);
      res.status(500).json({ error: 'Failed to restore expense request' });
    }
  }
);

export default router;
