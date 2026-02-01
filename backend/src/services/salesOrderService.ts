/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES ORDER SERVICE                                                       ║
 * ║  Manages order lifecycle with credit check and inventory reservation       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { DocumentNumberService } from './documentNumberService';
import { CustomerService } from './customerService';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface OrderItem {
  lineNumber: number;
  quotationItemId?: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  description?: string;
  uomId?: number;
  orderedQty: number;
  unitPrice: number;
  priceSource?: 'PRICE_LIST' | 'CUSTOMER_SPECIAL' | 'PROMOTION' | 'MANUAL_OVERRIDE';
  originalPrice?: number;
  costPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRateId?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  requestedDate?: Date;
  promisedDate?: Date;
  warehouseId?: number;
  revenueAccountId?: number;
  costCenterId?: number;
  notes?: string;
}

export interface CreateOrderInput {
  companyId: number;
  branchId?: number;
  orderDate: Date;
  requestedDeliveryDate?: Date;
  promisedDeliveryDate?: Date;
  customerId: number;
  customerPoNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  quotationId?: number;
  currencyId?: number;
  exchangeRate?: number;
  priceListId?: number;
  discountPercent?: number;
  discountAmount?: number;
  freightAmount?: number;
  paymentTermsId?: number;
  deliveryTerms?: string;
  warehouseId?: number;
  notes?: string;
  internalNotes?: string;
  salesRepId?: number;
  costCenterId?: number;
  items: OrderItem[];
  createdBy: number;
  skipCreditCheck?: boolean; // For users with credit_override permission
  creditOverrideReason?: string;
}

export interface CreditCheckResult {
  passed: boolean;
  creditPolicy: 'STRICT' | 'SOFT' | 'IGNORE';
  creditLimit: number;
  currentBalance: number;
  orderAmount: number;
  availableCredit: number;
  exceedsBy: number;
  requiresApproval: boolean;
  blockedReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SalesOrderService {
  
  /**
   * Create a new sales order with credit check
   */
  async create(input: CreateOrderInput): Promise<{ id: number; orderNumber: string; creditCheckResult: CreditCheckResult }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get customer details
      const customerResult = await client.query(
        'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
        [input.customerId]
      );
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }
      
      const customer = customerResult.rows[0];
      
      // Calculate totals
      const { subtotal, taxAmount, total, totalQty } = this.calculateTotals(input.items, input.discountPercent, input.discountAmount, input.freightAmount);
      
      // Perform credit check
      const creditCheckResult = await this.performCreditCheck(customer, total, input.skipCreditCheck);
      
      // Determine initial status based on credit check
      let initialStatus = 'DRAFT';
      if (creditCheckResult.creditPolicy === 'STRICT' && !creditCheckResult.passed && !input.skipCreditCheck) {
        throw new Error(`Credit limit exceeded. Available credit: ${creditCheckResult.availableCredit}. Order amount: ${total}`);
      }
      
      if (creditCheckResult.requiresApproval) {
        initialStatus = 'PENDING_APPROVAL';
      }
      
      // Generate order number
      const orderNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'sales_order');
      const orderNumber = orderNumberResult.number;
      
      // Insert order header
      const orderResult = await client.query(`
        INSERT INTO sales_orders (
          company_id, branch_id, order_number, order_date, requested_delivery_date, promised_delivery_date,
          customer_id, customer_code, customer_name, customer_name_ar, customer_po_number,
          billing_address, shipping_address,
          quotation_id,
          credit_check_passed, credit_check_result, credit_override_reason,
          currency_id, exchange_rate, price_list_id,
          subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount,
          total_qty_ordered, delivery_status, invoice_status,
          payment_terms_id, delivery_terms, warehouse_id,
          notes, internal_notes, sales_rep_id, cost_center_id,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
        RETURNING id
      `, [
        input.companyId, input.branchId, orderNumber, input.orderDate, input.requestedDeliveryDate, input.promisedDeliveryDate,
        input.customerId, customer.code, customer.name, customer.name_ar, input.customerPoNumber,
        input.billingAddress || customer.billing_address, input.shippingAddress || customer.shipping_address,
        input.quotationId,
        creditCheckResult.passed, JSON.stringify(creditCheckResult), input.creditOverrideReason,
        input.currencyId, input.exchangeRate || 1, input.priceListId,
        subtotal, input.discountPercent || 0, input.discountAmount || 0, taxAmount, input.freightAmount || 0, total,
        totalQty, 'PENDING', 'PENDING',
        input.paymentTermsId, input.deliveryTerms, input.warehouseId,
        input.notes, input.internalNotes, input.salesRepId, input.costCenterId,
        initialStatus, input.createdBy
      ]);
      
      const orderId = orderResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertOrderItem(client, orderId, item);
      }
      
      await client.query('COMMIT');
      
      return { id: orderId, orderNumber, creditCheckResult };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Approve a sales order (for orders requiring credit approval)
   */
  async approve(id: number, userId: number, overrideReason?: string): Promise<void> {
    const order = await this.getById(id);
    if (!order) throw new Error('Order not found');
    
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(order.status)) {
      throw new Error(`Cannot approve order in status: ${order.status}`);
    }
    
    await pool.query(`
      UPDATE sales_orders SET
        status = 'APPROVED',
        credit_approved_by = $1,
        credit_approved_at = CURRENT_TIMESTAMP,
        credit_override_reason = COALESCE($2, credit_override_reason),
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $3
    `, [userId, overrideReason, id]);
    
    // Reserve inventory based on policy
    await this.checkAndReserveInventory(id, userId);
  }
  
  /**
   * Confirm sales order
   */
  async confirm(id: number, userId: number): Promise<void> {
    const order = await this.getById(id);
    if (!order) throw new Error('Order not found');
    
    if (!['APPROVED', 'DRAFT'].includes(order.status)) {
      throw new Error(`Cannot confirm order in status: ${order.status}`);
    }
    
    await pool.query(`
      UPDATE sales_orders SET
        status = 'CONFIRMED',
        confirmed_by = $1,
        confirmed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2
    `, [userId, id]);
  }
  
  /**
   * Cancel sales order
   */
  async cancel(id: number, reason: string, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const order = await this.getById(id);
      if (!order) throw new Error('Order not found');
      
      if (['INVOICED', 'CANCELLED'].includes(order.status)) {
        throw new Error(`Cannot cancel order in status: ${order.status}`);
      }
      
      // Release inventory reservations
      await client.query(`
        UPDATE inventory_reservations SET
          status = 'CANCELLED',
          cancelled_by = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancel_reason = 'Order cancelled'
        WHERE source_type = 'sales_order' AND source_id = $2 AND status = 'ACTIVE'
      `, [userId, id]);
      
      // Update order item reserved quantities
      await client.query(`
        UPDATE sales_order_items SET reserved_qty = 0 WHERE order_id = $1
      `, [id]);
      
      // Update order status
      await client.query(`
        UPDATE sales_orders SET
          status = 'CANCELLED',
          cancelled_by = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $3
      `, [userId, reason, id]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get order by ID with full details
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT so.*,
             c.code as customer_code_db, c.name as customer_name_db, c.credit_policy,
             u.first_name || ' ' || u.last_name as sales_rep_name,
             sq.quotation_number,
             w.name as warehouse_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_rep_id = u.id
      LEFT JOIN sales_quotations sq ON so.quotation_id = sq.id
      LEFT JOIN warehouses w ON so.warehouse_id = w.id
      WHERE so.id = $1 AND so.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const order = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT soi.*,
             i.code as item_code_db, i.name as item_name_db, i.name_ar as item_name_ar,
             uom.name as uom_name, uom.symbol as uom_symbol,
             w.name as warehouse_name
      FROM sales_order_items soi
      LEFT JOIN items i ON soi.item_id = i.id
      LEFT JOIN units_of_measure uom ON soi.uom_id = uom.id
      LEFT JOIN warehouses w ON soi.warehouse_id = w.id
      WHERE soi.order_id = $1
      ORDER BY soi.line_number
    `, [id]);
    
    order.items = itemsResult.rows;
    
    return order;
  }
  
  /**
   * Get deliverable items from order
   */
  async getDeliverableItems(orderId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT soi.*,
             i.code as item_code_db, i.name as item_name_db,
             uom.name as uom_name,
             (soi.ordered_qty - soi.delivered_qty) as pending_qty
      FROM sales_order_items soi
      LEFT JOIN items i ON soi.item_id = i.id
      LEFT JOIN units_of_measure uom ON soi.uom_id = uom.id
      WHERE soi.order_id = $1 AND (soi.ordered_qty - soi.delivered_qty) > 0
      ORDER BY soi.line_number
    `, [orderId]);
    
    return result.rows;
  }
  
  /**
   * Get invoiceable items from order
   */
  async getInvoiceableItems(orderId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT soi.*,
             i.code as item_code_db, i.name as item_name_db,
             uom.name as uom_name,
             (soi.delivered_qty - soi.invoiced_qty) as pending_qty
      FROM sales_order_items soi
      LEFT JOIN items i ON soi.item_id = i.id
      LEFT JOIN units_of_measure uom ON soi.uom_id = uom.id
      WHERE soi.order_id = $1 AND (soi.delivered_qty - soi.invoiced_qty) > 0
      ORDER BY soi.line_number
    `, [orderId]);
    
    return result.rows;
  }
  
  /**
   * Update order delivery progress
   */
  async updateDeliveryProgress(orderId: number, itemId: number, deliveredQty: number, client?: any): Promise<void> {
    const conn = client || pool;
    
    await conn.query(`
      UPDATE sales_order_items SET
        delivered_qty = delivered_qty + $1
      WHERE order_id = $2 AND item_id = $3
    `, [deliveredQty, orderId, itemId]);
    
    // Recalculate totals and status
    await this.recalculateOrderProgress(orderId, conn);
  }
  
  /**
   * Update order invoice progress
   */
  async updateInvoiceProgress(orderId: number, itemId: number, invoicedQty: number, client?: any): Promise<void> {
    const conn = client || pool;
    
    await conn.query(`
      UPDATE sales_order_items SET
        invoiced_qty = invoiced_qty + $1
      WHERE order_id = $2 AND item_id = $3
    `, [invoicedQty, orderId, itemId]);
    
    // Recalculate totals and status
    await this.recalculateOrderProgress(orderId, conn);
  }
  
  /**
   * List orders with filters
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    salesRepId?: number;
    fromDate?: Date;
    toDate?: Date;
    deliveryStatus?: string;
    invoiceStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['so.company_id = $1', 'so.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`so.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`so.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.salesRepId) {
      conditions.push(`so.sales_rep_id = $${paramIndex++}`);
      params.push(filters.salesRepId);
    }
    
    if (filters.fromDate) {
      conditions.push(`so.order_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`so.order_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.deliveryStatus) {
      conditions.push(`so.delivery_status = $${paramIndex++}`);
      params.push(filters.deliveryStatus);
    }
    
    if (filters.invoiceStatus) {
      conditions.push(`so.invoice_status = $${paramIndex++}`);
      params.push(filters.invoiceStatus);
    }
    
    if (filters.search) {
      conditions.push(`(
        so.order_number ILIKE $${paramIndex} OR
        so.customer_name ILIKE $${paramIndex} OR
        so.customer_po_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales_orders so WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get data
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT so.*,
             c.code as customer_code_db, c.name as customer_name_db,
             u.first_name || ' ' || u.last_name as sales_rep_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_rep_id = u.id
      WHERE ${whereClause}
      ORDER BY so.order_date DESC, so.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async performCreditCheck(customer: any, orderAmount: number, skipCheck?: boolean): Promise<CreditCheckResult> {
    const creditPolicy = customer.credit_policy || 'SOFT';
    const creditLimit = Number(customer.credit_limit) || 0;
    const currentBalance = Number(customer.current_balance) || 0;
    const availableCredit = creditLimit - currentBalance;
    const exceedsBy = orderAmount - availableCredit;
    
    // If IGNORE policy or skip requested
    if (creditPolicy === 'IGNORE' || skipCheck) {
      return {
        passed: true,
        creditPolicy,
        creditLimit,
        currentBalance,
        orderAmount,
        availableCredit,
        exceedsBy: Math.max(0, exceedsBy),
        requiresApproval: false
      };
    }
    
    const passed = orderAmount <= availableCredit;
    
    return {
      passed,
      creditPolicy,
      creditLimit,
      currentBalance,
      orderAmount,
      availableCredit,
      exceedsBy: passed ? 0 : exceedsBy,
      requiresApproval: !passed && creditPolicy === 'SOFT',
      blockedReason: !passed && creditPolicy === 'STRICT' 
        ? `Credit limit exceeded by ${exceedsBy.toFixed(2)}` 
        : undefined
    };
  }
  
  private async checkAndReserveInventory(orderId: number, userId: number): Promise<void> {
    const order = await this.getById(orderId);
    if (!order) return;
    
    // Get company's sales settings
    const settingsResult = await pool.query(
      'SELECT inventory_reservation_policy FROM sales_settings WHERE company_id = $1',
      [order.company_id]
    );
    
    const policy = settingsResult.rows[0]?.inventory_reservation_policy || 'RESERVE_ON_SO';
    
    if (policy !== 'RESERVE_ON_SO') return; // Only reserve if policy says so
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const item of order.items) {
        const warehouseId = item.warehouse_id || order.warehouse_id;
        if (!warehouseId) continue;
        
        // Create reservation
        const reservationResult = await client.query(`
          INSERT INTO inventory_reservations (
            company_id, item_id, warehouse_id, uom_id, reserved_qty,
            source_type, source_id, source_line_id, source_number,
            customer_id, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          order.company_id, item.item_id, warehouseId, item.uom_id, item.ordered_qty,
          'sales_order', orderId, item.id, order.order_number,
          order.customer_id, 'ACTIVE', userId
        ]);
        
        // Update order item with reservation reference
        await client.query(`
          UPDATE sales_order_items SET
            reservation_id = $1,
            reserved_qty = $2
          WHERE id = $3
        `, [reservationResult.rows[0].id, item.ordered_qty, item.id]);
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  private async recalculateOrderProgress(orderId: number, client?: any): Promise<void> {
    const conn = client || pool;
    
    // Get aggregated quantities
    const result = await conn.query(`
      SELECT 
        SUM(ordered_qty) as total_ordered,
        SUM(delivered_qty) as total_delivered,
        SUM(invoiced_qty) as total_invoiced
      FROM sales_order_items
      WHERE order_id = $1
    `, [orderId]);
    
    const { total_ordered, total_delivered, total_invoiced } = result.rows[0];
    
    // Determine delivery status
    let deliveryStatus = 'PENDING';
    if (total_delivered >= total_ordered) {
      deliveryStatus = 'COMPLETE';
    } else if (total_delivered > 0) {
      deliveryStatus = 'PARTIAL';
    }
    
    // Determine invoice status
    let invoiceStatus = 'PENDING';
    if (total_invoiced >= total_ordered) {
      invoiceStatus = 'COMPLETE';
    } else if (total_invoiced > 0) {
      invoiceStatus = 'PARTIAL';
    }
    
    // Determine order status
    let orderStatus = null;
    if (deliveryStatus === 'COMPLETE' && invoiceStatus === 'COMPLETE') {
      orderStatus = 'INVOICED';
    } else if (deliveryStatus === 'COMPLETE') {
      orderStatus = 'DELIVERED';
    } else if (deliveryStatus === 'PARTIAL') {
      orderStatus = 'PARTIALLY_DELIVERED';
    }
    
    // Update order
    await conn.query(`
      UPDATE sales_orders SET
        total_qty_delivered = $1,
        total_qty_invoiced = $2,
        delivery_status = $3,
        invoice_status = $4,
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [total_delivered, total_invoiced, deliveryStatus, invoiceStatus, orderStatus, orderId]);
  }
  
  private calculateTotals(items: OrderItem[], discountPercent?: number, discountAmount?: number, freightAmount?: number) {
    let subtotal = 0;
    let taxAmount = 0;
    let totalQty = 0;
    
    for (const item of items) {
      subtotal += item.lineTotal;
      taxAmount += item.taxAmount || 0;
      totalQty += item.orderedQty;
    }
    
    let headerDiscount = 0;
    if (discountAmount) {
      headerDiscount = discountAmount;
    } else if (discountPercent) {
      headerDiscount = subtotal * (discountPercent / 100);
    }
    
    const total = subtotal - headerDiscount + taxAmount + (freightAmount || 0);
    
    return { subtotal, taxAmount, total, totalQty };
  }
  
  private async insertOrderItem(client: any, orderId: number, item: OrderItem) {
    await client.query(`
      INSERT INTO sales_order_items (
        order_id, line_number, quotation_item_id,
        item_id, item_code, item_name, description,
        uom_id, ordered_qty,
        unit_price, price_source, original_price, cost_price,
        discount_percent, discount_amount, tax_rate_id, tax_rate, tax_amount,
        line_total, requested_date, promised_date, warehouse_id,
        revenue_account_id, cost_center_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `, [
      orderId, item.lineNumber, item.quotationItemId,
      item.itemId, item.itemCode, item.itemName, item.description,
      item.uomId, item.orderedQty,
      item.unitPrice, item.priceSource || 'PRICE_LIST', item.originalPrice, item.costPrice,
      item.discountPercent || 0, item.discountAmount || 0, item.taxRateId, item.taxRate || 0, item.taxAmount || 0,
      item.lineTotal, item.requestedDate, item.promisedDate, item.warehouseId,
      item.revenueAccountId, item.costCenterId, item.notes
    ]);
  }
}

export default new SalesOrderService();
