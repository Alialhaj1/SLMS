/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES INVOICE SERVICE                                                     ║
 * ║  Manages sales invoice lifecycle with GL posting and AR updates            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { DocumentNumberService } from './documentNumberService';
import { SalesOrderService } from './salesOrderService';
import { CustomerService } from './customerService';
import { JournalEntryService, JournalEntryHeader, JournalEntryLine } from './journalEntryService';

// Instance for services with instance methods
const salesOrderService = new SalesOrderService();

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface InvoiceItem {
  lineNumber: number;
  salesOrderItemId?: number;
  deliveryNoteItemId?: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  description?: string;
  uomId?: number;
  quantity: number;
  unitPrice: number;
  priceSource?: 'PRICE_LIST' | 'CUSTOMER_SPECIAL' | 'PROMOTION' | 'MANUAL_OVERRIDE';
  originalPrice?: number;
  costPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRateId?: number;
  taxCode?: string;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  revenueAccountId?: number;
  costCenterId?: number;
  notes?: string;
}

export interface CreateInvoiceInput {
  companyId: number;
  branchId?: number;
  invoiceDate: Date;
  dueDate: Date;
  customerId: number;
  taxRegistrationNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  salesOrderId?: number;
  deliveryNoteId?: number;
  currencyId?: number;
  exchangeRate?: number;
  discountPercent?: number;
  discountAmount?: number;
  freightAmount?: number;
  paymentTermsId?: number;
  receivableAccountId?: number;
  revenueAccountId?: number;
  notes?: string;
  internalNotes?: string;
  salesRepId?: number;
  costCenterId?: number;
  items: InvoiceItem[];
  createdBy: number;
  autoPost?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SalesInvoiceService {
  
  /**
   * Create a new sales invoice
   */
  async create(input: CreateInvoiceInput): Promise<{ id: number; invoiceNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get customer info
      const customerResult = await client.query(
        'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
        [input.customerId]
      );
      if (customerResult.rows.length === 0) throw new Error('Customer not found');
      const customer = customerResult.rows[0];
      
      // Generate invoice number
      const invoiceNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'sales_invoice');
      const invoiceNumber = invoiceNumberResult.number;
      
      // Calculate totals
      const { subtotal, taxAmount, total } = this.calculateTotals(input.items, input.discountPercent, input.discountAmount, input.freightAmount);
      
      // Get order/delivery references
      let orderNumber = null;
      let deliveryNumber = null;
      if (input.salesOrderId) {
        const orderResult = await client.query('SELECT order_number FROM sales_orders WHERE id = $1', [input.salesOrderId]);
        orderNumber = orderResult.rows[0]?.order_number;
      }
      if (input.deliveryNoteId) {
        const deliveryResult = await client.query('SELECT delivery_number FROM delivery_notes WHERE id = $1', [input.deliveryNoteId]);
        deliveryNumber = deliveryResult.rows[0]?.delivery_number;
      }
      
      // Insert invoice header
      const invoiceResult = await client.query(`
        INSERT INTO sales_invoices (
          company_id, branch_id, invoice_number, invoice_date, due_date,
          customer_id, customer_code, customer_name, customer_name_ar, tax_registration_number,
          billing_address, shipping_address,
          sales_order_id, order_number, delivery_note_id, delivery_number,
          currency_id, exchange_rate,
          subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount,
          payment_terms_id, receivable_account_id, revenue_account_id,
          notes, internal_notes, sales_rep_id, cost_center_id,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
        RETURNING id
      `, [
        input.companyId, input.branchId, invoiceNumber, input.invoiceDate, input.dueDate,
        input.customerId, customer.code, customer.name, customer.name_ar, input.taxRegistrationNumber || customer.tax_registration_number,
        input.billingAddress || customer.billing_address, input.shippingAddress || customer.shipping_address,
        input.salesOrderId, orderNumber, input.deliveryNoteId, deliveryNumber,
        input.currencyId, input.exchangeRate || 1,
        subtotal, input.discountPercent || 0, input.discountAmount || 0, taxAmount, input.freightAmount || 0, total,
        input.paymentTermsId, input.receivableAccountId, input.revenueAccountId,
        input.notes, input.internalNotes, input.salesRepId, input.costCenterId,
        'DRAFT', input.createdBy
      ]);
      
      const invoiceId = invoiceResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertInvoiceItem(client, invoiceId, item);
      }
      
      await client.query('COMMIT');
      
      // Auto-post if requested
      if (input.autoPost) {
        await this.post(invoiceId, input.createdBy);
      }
      
      return { id: invoiceId, invoiceNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get invoice by ID with full details
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT si.*,
             c.code as customer_code_db, c.name as customer_name_db,
             so.order_number as sales_order_number,
             dn.delivery_number as delivery_note_number,
             u.first_name || ' ' || u.last_name as sales_rep_name
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN sales_orders so ON si.sales_order_id = so.id
      LEFT JOIN delivery_notes dn ON si.delivery_note_id = dn.id
      LEFT JOIN users u ON si.sales_rep_id = u.id
      WHERE si.id = $1 AND si.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const invoice = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT sii.*,
             i.code as item_code_db, i.name as item_name_db, i.name_ar as item_name_ar,
             uom.name as uom_name, uom.symbol as uom_symbol
      FROM sales_invoice_items sii
      LEFT JOIN items i ON sii.item_id = i.id
      LEFT JOIN units_of_measure uom ON sii.uom_id = uom.id
      WHERE sii.invoice_id = $1
      ORDER BY sii.line_number
    `, [id]);
    
    invoice.items = itemsResult.rows;
    
    return invoice;
  }
  
  /**
   * Approve invoice
   */
  async approve(id: number, userId: number): Promise<void> {
    const invoice = await this.getById(id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve invoice in status: ${invoice.status}`);
    }
    
    await pool.query(`
      UPDATE sales_invoices SET
        status = 'APPROVED',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2
    `, [userId, id]);
  }
  
  /**
   * Post invoice to General Ledger
   */
  async post(id: number, userId: number): Promise<{ journalEntryId: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const invoice = await this.getById(id);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.posted) throw new Error('Invoice already posted');
      if (!['DRAFT', 'APPROVED'].includes(invoice.status)) {
        throw new Error(`Cannot post invoice in status: ${invoice.status}`);
      }
      
      // Get default accounts from company settings
      const settingsResult = await client.query(
        'SELECT default_ar_account_id, default_revenue_account_id FROM sales_settings WHERE company_id = $1',
        [invoice.company_id]
      );
      const settings = settingsResult.rows[0] || {};
      
      const receivableAccountId = invoice.receivable_account_id || settings.default_ar_account_id;
      const revenueAccountId = invoice.revenue_account_id || settings.default_revenue_account_id;
      
      if (!receivableAccountId) throw new Error('No receivable account configured');
      if (!revenueAccountId) throw new Error('No revenue account configured');
      
      // Build journal entry lines
      const lines: any[] = [];
      
      // Debit: Accounts Receivable
      lines.push({
        accountId: receivableAccountId,
        debit: invoice.total_amount,
        credit: 0,
        description: `Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
        costCenterId: invoice.cost_center_id
      });
      
      // Credit: Revenue (can be broken down by item)
      const totalRevenue = Number(invoice.subtotal) - Number(invoice.discount_amount);
      lines.push({
        accountId: revenueAccountId,
        debit: 0,
        credit: totalRevenue,
        description: `Sales revenue - Invoice ${invoice.invoice_number}`,
        costCenterId: invoice.cost_center_id
      });
      
      // Credit: Tax Payable (if tax exists)
      if (Number(invoice.tax_amount) > 0) {
        // Get tax payable account from settings
        const taxAccountResult = await client.query(
          'SELECT default_tax_payable_account_id FROM sales_settings WHERE company_id = $1',
          [invoice.company_id]
        );
        const taxAccountId = taxAccountResult.rows[0]?.default_tax_payable_account_id;
        
        if (taxAccountId) {
          lines.push({
            accountId: taxAccountId,
            debit: 0,
            credit: invoice.tax_amount,
            description: `VAT on Invoice ${invoice.invoice_number}`
          });
        }
      }
      
      // Create journal entry
      const journalEntry: JournalEntryHeader = {
        company_id: invoice.company_id,
        entry_date: invoice.invoice_date,
        entry_type: 'sales_invoice' as any,
        reference_type: 'sales_invoice',
        reference_id: id,
        reference_number: invoice.invoice_number,
        description: `Sales Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
        lines: lines.map(line => ({
          account_code: '',
          account_id: line.accountId,
          description: line.description,
          debit_amount: line.debit || 0,
          credit_amount: line.credit || 0
        })),
        created_by: userId
      };
      const journalEntryId = await JournalEntryService.createEntry(journalEntry);
      
      // Update invoice
      await client.query(`
        UPDATE sales_invoices SET
          status = 'POSTED',
          posted = true,
          posted_at = CURRENT_TIMESTAMP,
          posted_by = $1,
          journal_entry_id = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $3
      `, [userId, journalEntryId, id]);
      
      // Update customer balance
      await CustomerService.updateBalance(
        invoice.customer_id, 
        invoice.company_id, 
        Number(invoice.total_amount), 
        'sales_invoice', 
        invoice.invoice_number
      );
      
      // Update sales order invoice progress
      if (invoice.sales_order_id) {
        for (const item of invoice.items) {
          if (item.sales_order_item_id) {
            await salesOrderService.updateInvoiceProgress(
              invoice.sales_order_id,
              item.item_id,
              Number(item.quantity),
              client
            );
          }
        }
      }
      
      // Mark delivery note as invoiced
      if (invoice.delivery_note_id) {
        await client.query(`
          UPDATE delivery_notes SET
            invoiced = true,
            invoice_id = $1,
            status = 'INVOICED',
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $2
          WHERE id = $3
        `, [id, userId, invoice.delivery_note_id]);
      }
      
      await client.query('COMMIT');
      
      return { journalEntryId };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Record payment against invoice
   */
  async recordPayment(id: number, amount: number, paymentReference: string, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const invoice = await this.getById(id);
      if (!invoice) throw new Error('Invoice not found');
      if (!invoice.posted) throw new Error('Invoice must be posted before recording payment');
      
      const balanceDue = Number(invoice.total_amount) - Number(invoice.paid_amount);
      if (amount > balanceDue) {
        throw new Error(`Payment amount ${amount} exceeds balance due ${balanceDue}`);
      }
      
      const newPaidAmount = Number(invoice.paid_amount) + amount;
      const newStatus = newPaidAmount >= Number(invoice.total_amount) ? 'PAID' : 'PARTIALLY_PAID';
      
      // Update invoice
      await client.query(`
        UPDATE sales_invoices SET
          paid_amount = $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $3
        WHERE id = $4
      `, [newPaidAmount, newStatus, userId, id]);
      
      // Update customer balance (reduce)
      await CustomerService.updateBalance(
        invoice.customer_id, 
        invoice.company_id, 
        -amount, 
        'payment', 
        invoice.invoice_number
      );
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Void an invoice
   */
  async void(id: number, reason: string, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const invoice = await this.getById(id);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.voided) throw new Error('Invoice already voided');
      if (Number(invoice.paid_amount) > 0) {
        throw new Error('Cannot void invoice with payments. Create a credit note instead.');
      }
      
      // Reverse journal entry if posted
      if (invoice.journal_entry_id) {
        await JournalEntryService.reverseEntry(invoice.journal_entry_id, userId, 'Invoice voided', client);
      }
      
      // Reverse customer balance
      if (invoice.posted) {
        await CustomerService.updateBalance(
          invoice.customer_id, 
          invoice.company_id, 
          -Number(invoice.total_amount), 
          'invoice_void', 
          invoice.invoice_number
        );
      }
      
      // Update invoice
      await client.query(`
        UPDATE sales_invoices SET
          status = 'VOID',
          voided = true,
          voided_by = $1,
          voided_at = CURRENT_TIMESTAMP,
          void_reason = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $3
      `, [userId, reason, id]);
      
      // Unmark delivery note as invoiced
      if (invoice.delivery_note_id) {
        await client.query(`
          UPDATE delivery_notes SET
            invoiced = false,
            invoice_id = NULL,
            status = 'DELIVERED',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [invoice.delivery_note_id]);
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create invoice from delivery note
   */
  async createFromDeliveryNote(deliveryNoteId: number, invoiceDate: Date, dueDate: Date, createdBy: number): Promise<{ id: number; invoiceNumber: string }> {
    const deliveryResult = await pool.query(`
      SELECT dn.*, so.price_list_id, so.payment_terms_id, so.sales_rep_id, so.cost_center_id
      FROM delivery_notes dn
      LEFT JOIN sales_orders so ON dn.sales_order_id = so.id
      WHERE dn.id = $1 AND dn.deleted_at IS NULL
    `, [deliveryNoteId]);
    
    if (deliveryResult.rows.length === 0) throw new Error('Delivery note not found');
    const delivery = deliveryResult.rows[0];
    
    if (delivery.invoiced) throw new Error('Delivery note already invoiced');
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT dni.*, soi.unit_price, soi.discount_percent, soi.discount_amount,
             soi.tax_rate_id, soi.tax_rate, soi.price_source, soi.original_price, soi.cost_price,
             soi.revenue_account_id, soi.cost_center_id
      FROM delivery_note_items dni
      LEFT JOIN sales_order_items soi ON dni.sales_order_item_id = soi.id
      WHERE dni.delivery_note_id = $1
      ORDER BY dni.line_number
    `, [deliveryNoteId]);
    
    const items: InvoiceItem[] = itemsResult.rows.map((item, index) => {
      const unitPrice = Number(item.unit_price) || 0;
      const quantity = Number(item.delivered_qty);
      const discountPercent = Number(item.discount_percent) || 0;
      const discountAmount = Number(item.discount_amount) || (unitPrice * quantity * discountPercent / 100);
      const taxRate = Number(item.tax_rate) || 0;
      const lineSubtotal = (unitPrice * quantity) - discountAmount;
      const taxAmount = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + taxAmount;
      
      return {
        lineNumber: index + 1,
        salesOrderItemId: item.sales_order_item_id,
        deliveryNoteItemId: item.id,
        itemId: item.item_id,
        itemCode: item.item_code,
        itemName: item.item_name,
        uomId: item.uom_id,
        quantity,
        unitPrice,
        priceSource: item.price_source || 'PRICE_LIST',
        originalPrice: item.original_price,
        costPrice: item.cost_price,
        discountPercent: item.discount_percent,
        discountAmount,
        taxRateId: item.tax_rate_id,
        taxRate,
        taxAmount,
        lineTotal,
        revenueAccountId: item.revenue_account_id,
        costCenterId: item.cost_center_id
      };
    });
    
    return this.create({
      companyId: delivery.company_id,
      branchId: delivery.branch_id,
      invoiceDate,
      dueDate,
      customerId: delivery.customer_id,
      salesOrderId: delivery.sales_order_id,
      deliveryNoteId,
      paymentTermsId: delivery.payment_terms_id,
      salesRepId: delivery.sales_rep_id,
      costCenterId: delivery.cost_center_id,
      items,
      createdBy
    });
  }
  
  /**
   * List invoices with filters
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    salesRepId?: number;
    fromDate?: Date;
    toDate?: Date;
    dueFromDate?: Date;
    dueToDate?: Date;
    overdue?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['si.company_id = $1', 'si.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`si.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`si.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.salesRepId) {
      conditions.push(`si.sales_rep_id = $${paramIndex++}`);
      params.push(filters.salesRepId);
    }
    
    if (filters.fromDate) {
      conditions.push(`si.invoice_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`si.invoice_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.dueFromDate) {
      conditions.push(`si.due_date >= $${paramIndex++}`);
      params.push(filters.dueFromDate);
    }
    
    if (filters.dueToDate) {
      conditions.push(`si.due_date <= $${paramIndex++}`);
      params.push(filters.dueToDate);
    }
    
    if (filters.overdue) {
      conditions.push(`si.due_date < CURRENT_DATE AND si.balance_due > 0`);
    }
    
    if (filters.search) {
      conditions.push(`(
        si.invoice_number ILIKE $${paramIndex} OR
        si.customer_name ILIKE $${paramIndex} OR
        si.order_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales_invoices si WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get data
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT si.*,
             c.code as customer_code_db, c.name as customer_name_db,
             u.first_name || ' ' || u.last_name as sales_rep_name,
             CASE WHEN si.due_date < CURRENT_DATE AND si.balance_due > 0 THEN true ELSE false END as is_overdue,
             CASE WHEN si.due_date < CURRENT_DATE AND si.balance_due > 0 THEN CURRENT_DATE - si.due_date ELSE 0 END as days_overdue
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.sales_rep_id = u.id
      WHERE ${whereClause}
      ORDER BY si.invoice_date DESC, si.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateTotals(items: InvoiceItem[], discountPercent?: number, discountAmount?: number, freightAmount?: number) {
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineSubtotal = item.lineTotal - (item.taxAmount || 0);
      subtotal += lineSubtotal;
      taxAmount += item.taxAmount || 0;
    }
    
    let headerDiscount = 0;
    if (discountAmount) {
      headerDiscount = discountAmount;
    } else if (discountPercent) {
      headerDiscount = subtotal * (discountPercent / 100);
    }
    
    const total = subtotal - headerDiscount + taxAmount + (freightAmount || 0);
    
    return { subtotal, taxAmount, total };
  }
  
  private async insertInvoiceItem(client: any, invoiceId: number, item: InvoiceItem) {
    await client.query(`
      INSERT INTO sales_invoice_items (
        invoice_id, line_number, sales_order_item_id, delivery_note_item_id,
        item_id, item_code, item_name, description,
        uom_id, quantity,
        unit_price, price_source, original_price, cost_price,
        discount_percent, discount_amount,
        tax_rate_id, tax_code, tax_rate, tax_amount,
        line_total, revenue_account_id, cost_center_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    `, [
      invoiceId, item.lineNumber, item.salesOrderItemId, item.deliveryNoteItemId,
      item.itemId, item.itemCode, item.itemName, item.description,
      item.uomId, item.quantity,
      item.unitPrice, item.priceSource || 'PRICE_LIST', item.originalPrice, item.costPrice,
      item.discountPercent || 0, item.discountAmount || 0,
      item.taxRateId, item.taxCode, item.taxRate || 0, item.taxAmount || 0,
      item.lineTotal, item.revenueAccountId, item.costCenterId, item.notes
    ]);
  }
}

export default new SalesInvoiceService();
