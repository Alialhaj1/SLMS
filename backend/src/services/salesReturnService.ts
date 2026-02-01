/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES RETURN & CREDIT NOTE SERVICE                                        ║
 * ║  Manages returns, goods receipt, and credit note issuance                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { DocumentNumberService } from './documentNumberService';
import { CustomerService } from './customerService';
import { JournalEntryService, JournalEntryHeader, JournalEntryLine } from './journalEntryService';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ReturnItem {
  lineNumber: number;
  invoiceItemId?: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  uomId?: number;
  invoicedQty?: number;
  returnedQty: number;
  itemCondition?: 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRateId?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  warehouseId?: number;
  binLocation?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  notes?: string;
}

export interface CreateReturnInput {
  companyId: number;
  branchId?: number;
  returnDate: Date;
  customerId: number;
  salesInvoiceId?: number;
  salesOrderId?: number;
  returnReasonCode?: string;
  returnReason: string;
  warehouseId: number;
  notes?: string;
  internalNotes?: string;
  items: ReturnItem[];
  createdBy: number;
  autoReceive?: boolean;
  autoCredit?: boolean;
}

export interface CreateCreditNoteInput {
  companyId: number;
  branchId?: number;
  creditNoteDate: Date;
  customerId: number;
  salesReturnId?: number;
  salesInvoiceId?: number;
  creditType: 'RETURN' | 'PRICE_ADJUSTMENT' | 'GOODWILL' | 'CORRECTION';
  reason: string;
  currencyId?: number;
  exchangeRate?: number;
  receivableAccountId?: number;
  notes?: string;
  internalNotes?: string;
  items: CreditNoteItem[];
  createdBy: number;
  autoPost?: boolean;
}

export interface CreditNoteItem {
  lineNumber: number;
  returnItemId?: number;
  invoiceItemId?: number;
  itemId?: number;
  itemCode?: string;
  itemName?: string;
  description?: string;
  uomId?: number;
  quantity?: number;
  unitPrice?: number;
  taxRateId?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES RETURN SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class SalesReturnService {
  
  /**
   * Create a new sales return
   */
  async create(input: CreateReturnInput): Promise<{ id: number; returnNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get customer info
      const customerResult = await client.query(
        'SELECT code, name FROM customers WHERE id = $1 AND deleted_at IS NULL',
        [input.customerId]
      );
      if (customerResult.rows.length === 0) throw new Error('Customer not found');
      const customer = customerResult.rows[0];
      
      // Generate return number
      const returnNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'sales_return');
      const returnNumber = returnNumberResult.number;
      
      // Get invoice/order references
      let invoiceNumber = null;
      let orderNumber = null;
      if (input.salesInvoiceId) {
        const invoiceResult = await client.query('SELECT invoice_number FROM sales_invoices WHERE id = $1', [input.salesInvoiceId]);
        invoiceNumber = invoiceResult.rows[0]?.invoice_number;
      }
      if (input.salesOrderId) {
        const orderResult = await client.query('SELECT order_number FROM sales_orders WHERE id = $1', [input.salesOrderId]);
        orderNumber = orderResult.rows[0]?.order_number;
      }
      
      // Calculate totals
      const { subtotal, taxAmount, total } = this.calculateTotals(input.items);
      
      // Insert return header
      const returnResult = await client.query(`
        INSERT INTO sales_returns (
          company_id, branch_id, return_number, return_date,
          customer_id, customer_code, customer_name,
          sales_invoice_id, invoice_number, sales_order_id, order_number,
          return_reason_code, return_reason, warehouse_id,
          subtotal, tax_amount, total_amount,
          notes, internal_notes, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, [
        input.companyId, input.branchId, returnNumber, input.returnDate,
        input.customerId, customer.code, customer.name,
        input.salesInvoiceId, invoiceNumber, input.salesOrderId, orderNumber,
        input.returnReasonCode, input.returnReason, input.warehouseId,
        subtotal, taxAmount, total,
        input.notes, input.internalNotes, 'DRAFT', input.createdBy
      ]);
      
      const returnId = returnResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertReturnItem(client, returnId, item);
      }
      
      await client.query('COMMIT');
      
      // Auto receive if requested
      if (input.autoReceive) {
        await this.receiveGoods(returnId, input.createdBy);
      }
      
      // Auto create credit note if requested
      if (input.autoCredit) {
        await this.createCreditNoteFromReturn(returnId, input.createdBy);
      }
      
      return { id: returnId, returnNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get return by ID
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT sr.*,
             c.code as customer_code_db, c.name as customer_name_db,
             si.invoice_number as invoice_number_db,
             w.name as warehouse_name
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      WHERE sr.id = $1 AND sr.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const salesReturn = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT sri.*,
             i.code as item_code_db, i.name as item_name_db,
             uom.name as uom_name, uom.symbol as uom_symbol,
             w.name as warehouse_name
      FROM sales_return_items sri
      LEFT JOIN items i ON sri.item_id = i.id
      LEFT JOIN units_of_measure uom ON sri.uom_id = uom.id
      LEFT JOIN warehouses w ON sri.warehouse_id = w.id
      WHERE sri.return_id = $1
      ORDER BY sri.line_number
    `, [id]);
    
    salesReturn.items = itemsResult.rows;
    
    return salesReturn;
  }
  
  /**
   * Approve return
   */
  async approve(id: number, userId: number): Promise<void> {
    const salesReturn = await this.getById(id);
    if (!salesReturn) throw new Error('Return not found');
    if (salesReturn.status !== 'DRAFT' && salesReturn.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve return in status: ${salesReturn.status}`);
    }
    
    await pool.query(`
      UPDATE sales_returns SET
        status = 'APPROVED',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2
    `, [userId, id]);
  }
  
  /**
   * Receive returned goods into inventory
   */
  async receiveGoods(id: number, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const salesReturn = await this.getById(id);
      if (!salesReturn) throw new Error('Return not found');
      if (salesReturn.inventory_received) throw new Error('Goods already received');
      if (!['DRAFT', 'APPROVED'].includes(salesReturn.status)) {
        throw new Error(`Cannot receive goods for return in status: ${salesReturn.status}`);
      }
      
      // Post inventory transactions
      for (const item of salesReturn.items) {
        const warehouseId = item.warehouse_id || salesReturn.warehouse_id;
        
        // Only receive items in GOOD condition
        if (item.item_condition === 'GOOD' || !item.item_condition) {
          // Create goods receipt transaction (positive quantity)
          const txnResult = await client.query(`
            INSERT INTO inventory_transactions (
              company_id, item_id, warehouse_id, uom_id,
              transaction_type, quantity, reference_type, reference_id,
              batch_number, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `, [
            salesReturn.company_id,
            item.item_id,
            warehouseId,
            item.uom_id,
            'GOODS_RETURN',
            Number(item.returned_qty), // Positive for goods in
            'sales_return',
            id,
            item.batch_number,
            `Return ${salesReturn.return_number}`,
            userId
          ]);
          
          // Update return item
          await client.query(`
            UPDATE sales_return_items SET
              received_qty = $1,
              inventory_transaction_id = $2
            WHERE id = $3
          `, [item.returned_qty, txnResult.rows[0].id, item.id]);
        }
      }
      
      // Update return
      await client.query(`
        UPDATE sales_returns SET
          status = 'RECEIVED',
          inventory_received = true,
          inventory_received_at = CURRENT_TIMESTAMP,
          inventory_received_by = $1,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $2
      `, [userId, id]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create credit note from return
   */
  async createCreditNoteFromReturn(id: number, userId: number): Promise<{ creditNoteId: number; creditNoteNumber: string }> {
    const salesReturn = await this.getById(id);
    if (!salesReturn) throw new Error('Return not found');
    if (salesReturn.credit_note_id) throw new Error('Credit note already created');
    
    const creditNoteService = new CreditNoteService();
    
    const items: CreditNoteItem[] = salesReturn.items.map((item: any, index: number) => ({
      lineNumber: index + 1,
      returnItemId: item.id,
      invoiceItemId: item.invoice_item_id,
      itemId: item.item_id,
      itemCode: item.item_code,
      itemName: item.item_name,
      uomId: item.uom_id,
      quantity: Number(item.returned_qty),
      unitPrice: Number(item.unit_price),
      taxRateId: item.tax_rate_id,
      taxRate: Number(item.tax_rate) || 0,
      taxAmount: Number(item.tax_amount) || 0,
      lineTotal: Number(item.line_total)
    }));
    
    const result = await creditNoteService.create({
      companyId: salesReturn.company_id,
      branchId: salesReturn.branch_id,
      creditNoteDate: new Date(),
      customerId: salesReturn.customer_id,
      salesReturnId: id,
      salesInvoiceId: salesReturn.sales_invoice_id,
      creditType: 'RETURN',
      reason: salesReturn.return_reason,
      notes: `Credit note for return ${salesReturn.return_number}`,
      items,
      createdBy: userId,
      autoPost: true
    });
    
    // Update return with credit note reference
    await pool.query(`
      UPDATE sales_returns SET
        status = 'CREDITED',
        credit_note_id = $1,
        credit_note_number = $2,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $3
      WHERE id = $4
    `, [result.id, result.creditNoteNumber, userId, id]);
    
    return { creditNoteId: result.id, creditNoteNumber: result.creditNoteNumber };
  }
  
  /**
   * List returns
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    salesInvoiceId?: number;
    fromDate?: Date;
    toDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['sr.company_id = $1', 'sr.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`sr.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`sr.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.salesInvoiceId) {
      conditions.push(`sr.sales_invoice_id = $${paramIndex++}`);
      params.push(filters.salesInvoiceId);
    }
    
    if (filters.fromDate) {
      conditions.push(`sr.return_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`sr.return_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.search) {
      conditions.push(`(
        sr.return_number ILIKE $${paramIndex} OR
        sr.customer_name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales_returns sr WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT sr.*,
             c.code as customer_code_db, c.name as customer_name_db
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY sr.return_date DESC, sr.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  private calculateTotals(items: ReturnItem[]) {
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineSubtotal = item.lineTotal - (item.taxAmount || 0);
      subtotal += lineSubtotal;
      taxAmount += item.taxAmount || 0;
    }
    
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }
  
  private async insertReturnItem(client: any, returnId: number, item: ReturnItem) {
    await client.query(`
      INSERT INTO sales_return_items (
        return_id, line_number, invoice_item_id,
        item_id, item_code, item_name,
        uom_id, invoiced_qty, returned_qty, item_condition,
        unit_price, discount_percent, discount_amount,
        tax_rate_id, tax_rate, tax_amount, line_total,
        warehouse_id, bin_location, batch_number, serial_numbers, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [
      returnId, item.lineNumber, item.invoiceItemId,
      item.itemId, item.itemCode, item.itemName,
      item.uomId, item.invoicedQty, item.returnedQty, item.itemCondition || 'GOOD',
      item.unitPrice, item.discountPercent || 0, item.discountAmount || 0,
      item.taxRateId, item.taxRate || 0, item.taxAmount || 0, item.lineTotal,
      item.warehouseId, item.binLocation, item.batchNumber, item.serialNumbers, item.notes
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDIT NOTE SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class CreditNoteService {
  
  /**
   * Create a new credit note
   */
  async create(input: CreateCreditNoteInput): Promise<{ id: number; creditNoteNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get customer info
      const customerResult = await client.query(
        'SELECT code, name FROM customers WHERE id = $1 AND deleted_at IS NULL',
        [input.customerId]
      );
      if (customerResult.rows.length === 0) throw new Error('Customer not found');
      const customer = customerResult.rows[0];
      
      // Generate credit note number
      const creditNoteNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'credit_note');
      const creditNoteNumber = creditNoteNumberResult.number;
      
      // Get references
      let returnNumber = null;
      let invoiceNumber = null;
      if (input.salesReturnId) {
        const returnResult = await client.query('SELECT return_number FROM sales_returns WHERE id = $1', [input.salesReturnId]);
        returnNumber = returnResult.rows[0]?.return_number;
      }
      if (input.salesInvoiceId) {
        const invoiceResult = await client.query('SELECT invoice_number FROM sales_invoices WHERE id = $1', [input.salesInvoiceId]);
        invoiceNumber = invoiceResult.rows[0]?.invoice_number;
      }
      
      // Calculate totals
      const { subtotal, taxAmount, total } = this.calculateTotals(input.items);
      
      // Insert credit note header
      const creditNoteResult = await client.query(`
        INSERT INTO credit_notes (
          company_id, branch_id, credit_note_number, credit_note_date,
          customer_id, customer_code, customer_name,
          sales_return_id, return_number, sales_invoice_id, invoice_number,
          credit_type, currency_id, exchange_rate,
          subtotal, tax_amount, total_amount,
          receivable_account_id, reason, notes, internal_notes,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id
      `, [
        input.companyId, input.branchId, creditNoteNumber, input.creditNoteDate,
        input.customerId, customer.code, customer.name,
        input.salesReturnId, returnNumber, input.salesInvoiceId, invoiceNumber,
        input.creditType, input.currencyId, input.exchangeRate || 1,
        subtotal, taxAmount, total,
        input.receivableAccountId, input.reason, input.notes, input.internalNotes,
        'DRAFT', input.createdBy
      ]);
      
      const creditNoteId = creditNoteResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertCreditNoteItem(client, creditNoteId, item);
      }
      
      await client.query('COMMIT');
      
      // Auto post if requested
      if (input.autoPost) {
        await this.post(creditNoteId, input.createdBy);
      }
      
      return { id: creditNoteId, creditNoteNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get credit note by ID
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT cn.*,
             c.code as customer_code_db, c.name as customer_name_db
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      WHERE cn.id = $1 AND cn.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const creditNote = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT cni.*,
             i.code as item_code_db, i.name as item_name_db,
             uom.name as uom_name
      FROM credit_note_items cni
      LEFT JOIN items i ON cni.item_id = i.id
      LEFT JOIN units_of_measure uom ON cni.uom_id = uom.id
      WHERE cni.credit_note_id = $1
      ORDER BY cni.line_number
    `, [id]);
    
    creditNote.items = itemsResult.rows;
    
    return creditNote;
  }
  
  /**
   * Post credit note to GL
   */
  async post(id: number, userId: number): Promise<{ journalEntryId: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const creditNote = await this.getById(id);
      if (!creditNote) throw new Error('Credit note not found');
      if (creditNote.posted) throw new Error('Credit note already posted');
      
      // Get accounts from settings
      const settingsResult = await client.query(
        'SELECT default_ar_account_id, default_revenue_account_id FROM sales_settings WHERE company_id = $1',
        [creditNote.company_id]
      );
      const settings = settingsResult.rows[0] || {};
      
      const receivableAccountId = creditNote.receivable_account_id || settings.default_ar_account_id;
      const revenueAccountId = settings.default_revenue_account_id;
      
      if (!receivableAccountId) throw new Error('No receivable account configured');
      if (!revenueAccountId) throw new Error('No revenue account configured');
      
      // Build journal entry lines (opposite of invoice)
      const lines: any[] = [];
      
      // Debit: Revenue (reversing revenue)
      lines.push({
        accountId: revenueAccountId,
        debit: Number(creditNote.subtotal),
        credit: 0,
        description: `Credit Note ${creditNote.credit_note_number} - ${creditNote.customer_name}`
      });
      
      // Credit: Accounts Receivable
      lines.push({
        accountId: receivableAccountId,
        debit: 0,
        credit: creditNote.total_amount,
        description: `Credit Note ${creditNote.credit_note_number}`
      });
      
      // Debit: Tax (if applicable)
      if (Number(creditNote.tax_amount) > 0) {
        const taxAccountResult = await client.query(
          'SELECT default_tax_payable_account_id FROM sales_settings WHERE company_id = $1',
          [creditNote.company_id]
        );
        const taxAccountId = taxAccountResult.rows[0]?.default_tax_payable_account_id;
        
        if (taxAccountId) {
          lines.push({
            accountId: taxAccountId,
            debit: creditNote.tax_amount,
            credit: 0,
            description: `VAT reversal - Credit Note ${creditNote.credit_note_number}`
          });
        }
      }
      
      // Create journal entry
      const journalEntry: JournalEntryHeader = {
        company_id: creditNote.company_id,
        entry_date: creditNote.credit_note_date,
        entry_type: 'credit_note' as any,
        reference_type: 'credit_note',
        reference_id: id,
        reference_number: creditNote.credit_note_number,
        description: `Credit Note ${creditNote.credit_note_number} - ${creditNote.customer_name}`,
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
      
      // Update credit note
      await client.query(`
        UPDATE credit_notes SET
          status = 'POSTED',
          posted = true,
          posted_at = CURRENT_TIMESTAMP,
          posted_by = $1,
          journal_entry_id = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $3
      `, [userId, journalEntryId, id]);
      
      // Update customer balance (reduce)
      await CustomerService.updateBalance(
        creditNote.customer_id, 
        creditNote.company_id, 
        -Number(creditNote.total_amount), 
        'credit_note', 
        creditNote.credit_note_number
      );
      
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
   * Apply credit note to invoice
   */
  async applyToInvoice(creditNoteId: number, invoiceId: number, amount: number, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const creditNote = await this.getById(creditNoteId);
      if (!creditNote) throw new Error('Credit note not found');
      if (!creditNote.posted) throw new Error('Credit note must be posted before applying');
      
      const availableBalance = Number(creditNote.total_amount) - Number(creditNote.applied_amount);
      if (amount > availableBalance) {
        throw new Error(`Amount ${amount} exceeds available balance ${availableBalance}`);
      }
      
      // Verify invoice
      const invoiceResult = await client.query(
        'SELECT id, balance_due FROM sales_invoices WHERE id = $1 AND customer_id = $2',
        [invoiceId, creditNote.customer_id]
      );
      if (invoiceResult.rows.length === 0) throw new Error('Invoice not found or does not belong to customer');
      
      const invoiceBalance = Number(invoiceResult.rows[0].balance_due);
      if (amount > invoiceBalance) {
        throw new Error(`Amount ${amount} exceeds invoice balance ${invoiceBalance}`);
      }
      
      // Create application record
      await client.query(`
        INSERT INTO credit_note_applications (
          credit_note_id, invoice_id, applied_amount, applied_by
        ) VALUES ($1, $2, $3, $4)
      `, [creditNoteId, invoiceId, amount, userId]);
      
      // Update credit note applied amount
      const newAppliedAmount = Number(creditNote.applied_amount) + amount;
      const creditNoteStatus = newAppliedAmount >= Number(creditNote.total_amount) ? 'APPLIED' : 'POSTED';
      
      await client.query(`
        UPDATE credit_notes SET
          applied_amount = $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $3
        WHERE id = $4
      `, [newAppliedAmount, creditNoteStatus, userId, creditNoteId]);
      
      // Update invoice paid amount
      const salesInvoiceService = await import('./salesInvoiceService');
      await salesInvoiceService.default.recordPayment(invoiceId, amount, `Credit Note ${creditNote.credit_note_number}`, userId);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * List credit notes
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    creditType?: string;
    fromDate?: Date;
    toDate?: Date;
    hasBalance?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['cn.company_id = $1', 'cn.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`cn.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`cn.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.creditType) {
      conditions.push(`cn.credit_type = $${paramIndex++}`);
      params.push(filters.creditType);
    }
    
    if (filters.fromDate) {
      conditions.push(`cn.credit_note_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`cn.credit_note_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.hasBalance) {
      conditions.push(`cn.balance > 0`);
    }
    
    if (filters.search) {
      conditions.push(`(
        cn.credit_note_number ILIKE $${paramIndex} OR
        cn.customer_name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM credit_notes cn WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT cn.*,
             c.code as customer_code_db, c.name as customer_name_db
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY cn.credit_note_date DESC, cn.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  private calculateTotals(items: CreditNoteItem[]) {
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineSubtotal = item.lineTotal - (item.taxAmount || 0);
      subtotal += lineSubtotal;
      taxAmount += item.taxAmount || 0;
    }
    
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }
  
  private async insertCreditNoteItem(client: any, creditNoteId: number, item: CreditNoteItem) {
    await client.query(`
      INSERT INTO credit_note_items (
        credit_note_id, line_number, return_item_id, invoice_item_id,
        item_id, item_code, item_name, description,
        uom_id, quantity, unit_price,
        tax_rate_id, tax_rate, tax_amount, line_total, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      creditNoteId, item.lineNumber, item.returnItemId, item.invoiceItemId,
      item.itemId, item.itemCode, item.itemName, item.description,
      item.uomId, item.quantity, item.unitPrice,
      item.taxRateId, item.taxRate || 0, item.taxAmount || 0, item.lineTotal, item.notes
    ]);
  }
}

export default { SalesReturnService: new SalesReturnService(), CreditNoteService: new CreditNoteService() };
