/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES QUOTATION SERVICE                                                   ║
 * ║  Manages quotation lifecycle, pricing, and conversion to orders            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { DocumentNumberService } from './documentNumberService';
import { PriceListService } from './priceListService';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface QuotationItem {
  lineNumber: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  description?: string;
  uomId?: number;
  quantity: number;
  unitPrice: number;
  priceSource?: 'PRICE_LIST' | 'CUSTOMER_SPECIAL' | 'PROMOTION' | 'MANUAL_OVERRIDE';
  originalPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRateId?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  requestedDate?: Date;
  warehouseId?: number;
  notes?: string;
}

export interface CreateQuotationInput {
  companyId: number;
  branchId?: number;
  quotationDate: Date;
  validUntil?: Date;
  customerId?: number;
  customerName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  rfqReference?: string;
  currencyId?: number;
  exchangeRate?: number;
  priceListId?: number;
  discountPercent?: number;
  discountAmount?: number;
  freightAmount?: number;
  paymentTermsId?: number;
  deliveryTerms?: string;
  warrantyTerms?: string;
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  salesRepId?: number;
  items: QuotationItem[];
  createdBy: number;
}

export interface UpdateQuotationInput {
  branchId?: number;
  validUntil?: Date;
  customerId?: number;
  customerName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  rfqReference?: string;
  currencyId?: number;
  exchangeRate?: number;
  priceListId?: number;
  discountPercent?: number;
  discountAmount?: number;
  freightAmount?: number;
  paymentTermsId?: number;
  deliveryTerms?: string;
  warrantyTerms?: string;
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  salesRepId?: number;
  items?: QuotationItem[];
  updatedBy: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SalesQuotationService {
  
  /**
   * Create a new quotation
   */
  async create(input: CreateQuotationInput): Promise<{ id: number; quotationNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate quotation number
      const docNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'sales_quotation');
      const quotationNumber = docNumberResult.number;
      
      // Calculate totals
      const { subtotal, taxAmount, total } = this.calculateTotals(input.items, input.discountPercent, input.discountAmount, input.freightAmount);
      
      // Insert quotation header
      const insertResult = await client.query(`
        INSERT INTO sales_quotations (
          company_id, branch_id, quotation_number, quotation_date, valid_until,
          customer_id, customer_name, contact_person, contact_email, contact_phone,
          billing_address, shipping_address, rfq_reference,
          currency_id, exchange_rate, price_list_id,
          subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount,
          payment_terms_id, delivery_terms, warranty_terms,
          notes, internal_notes, terms_and_conditions,
          sales_rep_id, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
        RETURNING id
      `, [
        input.companyId, input.branchId, quotationNumber, input.quotationDate, input.validUntil,
        input.customerId, input.customerName, input.contactPerson, input.contactEmail, input.contactPhone,
        input.billingAddress, input.shippingAddress, input.rfqReference,
        input.currencyId, input.exchangeRate || 1, input.priceListId,
        subtotal, input.discountPercent || 0, input.discountAmount || 0, taxAmount, input.freightAmount || 0, total,
        input.paymentTermsId, input.deliveryTerms, input.warrantyTerms,
        input.notes, input.internalNotes, input.termsAndConditions,
        input.salesRepId, 'DRAFT', input.createdBy
      ]);
      
      const quotationId = insertResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertQuotationItem(client, quotationId, item);
      }
      
      await client.query('COMMIT');
      
      return { id: quotationId, quotationNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update an existing quotation
   */
  async update(id: number, input: UpdateQuotationInput): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if quotation is editable
      const quotation = await this.getById(id);
      if (!quotation) {
        throw new Error('Quotation not found');
      }
      if (!['DRAFT'].includes(quotation.status)) {
        throw new Error(`Cannot update quotation in status: ${quotation.status}`);
      }
      
      // Calculate totals if items provided
      let totals;
      if (input.items) {
        totals = this.calculateTotals(input.items, input.discountPercent, input.discountAmount, input.freightAmount);
      }
      
      // Update header
      await client.query(`
        UPDATE sales_quotations SET
          branch_id = COALESCE($1, branch_id),
          valid_until = COALESCE($2, valid_until),
          customer_id = COALESCE($3, customer_id),
          customer_name = COALESCE($4, customer_name),
          contact_person = COALESCE($5, contact_person),
          contact_email = COALESCE($6, contact_email),
          contact_phone = COALESCE($7, contact_phone),
          billing_address = COALESCE($8, billing_address),
          shipping_address = COALESCE($9, shipping_address),
          rfq_reference = COALESCE($10, rfq_reference),
          currency_id = COALESCE($11, currency_id),
          exchange_rate = COALESCE($12, exchange_rate),
          price_list_id = COALESCE($13, price_list_id),
          subtotal = COALESCE($14, subtotal),
          discount_percent = COALESCE($15, discount_percent),
          discount_amount = COALESCE($16, discount_amount),
          tax_amount = COALESCE($17, tax_amount),
          freight_amount = COALESCE($18, freight_amount),
          total_amount = COALESCE($19, total_amount),
          payment_terms_id = COALESCE($20, payment_terms_id),
          delivery_terms = COALESCE($21, delivery_terms),
          warranty_terms = COALESCE($22, warranty_terms),
          notes = COALESCE($23, notes),
          internal_notes = COALESCE($24, internal_notes),
          terms_and_conditions = COALESCE($25, terms_and_conditions),
          sales_rep_id = COALESCE($26, sales_rep_id),
          revision_number = revision_number + 1,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $27
        WHERE id = $28
      `, [
        input.branchId, input.validUntil,
        input.customerId, input.customerName, input.contactPerson, input.contactEmail, input.contactPhone,
        input.billingAddress, input.shippingAddress, input.rfqReference,
        input.currencyId, input.exchangeRate, input.priceListId,
        totals?.subtotal, input.discountPercent, input.discountAmount, totals?.taxAmount, input.freightAmount, totals?.total,
        input.paymentTermsId, input.deliveryTerms, input.warrantyTerms,
        input.notes, input.internalNotes, input.termsAndConditions,
        input.salesRepId, input.updatedBy, id
      ]);
      
      // Update items if provided
      if (input.items) {
        // Delete existing items
        await client.query('DELETE FROM sales_quotation_items WHERE quotation_id = $1', [id]);
        
        // Insert new items
        for (const item of input.items) {
          await this.insertQuotationItem(client, id, item);
        }
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
   * Get quotation by ID
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT sq.*,
             c.code as customer_code, c.name as customer_name_db, c.name_ar as customer_name_ar,
             u.first_name || ' ' || u.last_name as sales_rep_name,
             pl.name as price_list_name
      FROM sales_quotations sq
      LEFT JOIN customers c ON sq.customer_id = c.id
      LEFT JOIN users u ON sq.sales_rep_id = u.id
      LEFT JOIN price_lists pl ON sq.price_list_id = pl.id
      WHERE sq.id = $1 AND sq.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const quotation = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT sqi.*,
             i.code as item_code_db, i.name as item_name_db, i.name_ar as item_name_ar,
             uom.name as uom_name, uom.symbol as uom_symbol
      FROM sales_quotation_items sqi
      LEFT JOIN items i ON sqi.item_id = i.id
      LEFT JOIN units_of_measure uom ON sqi.uom_id = uom.id
      WHERE sqi.quotation_id = $1
      ORDER BY sqi.line_number
    `, [id]);
    
    quotation.items = itemsResult.rows;
    
    return quotation;
  }
  
  /**
   * Send quotation to customer
   */
  async send(id: number, userId: number): Promise<void> {
    const quotation = await this.getById(id);
    if (!quotation) throw new Error('Quotation not found');
    if (!['DRAFT'].includes(quotation.status)) {
      throw new Error(`Cannot send quotation in status: ${quotation.status}`);
    }
    
    await pool.query(`
      UPDATE sales_quotations SET
        status = 'SENT',
        sent_at = CURRENT_TIMESTAMP,
        sent_by = $1,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2
    `, [userId, id]);
  }
  
  /**
   * Mark quotation as accepted
   */
  async accept(id: number, acceptedBy: string, userId: number): Promise<void> {
    const quotation = await this.getById(id);
    if (!quotation) throw new Error('Quotation not found');
    if (!['SENT'].includes(quotation.status)) {
      throw new Error(`Cannot accept quotation in status: ${quotation.status}`);
    }
    
    await pool.query(`
      UPDATE sales_quotations SET
        status = 'ACCEPTED',
        accepted_at = CURRENT_TIMESTAMP,
        accepted_by = $1,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $2
      WHERE id = $3
    `, [acceptedBy, userId, id]);
  }
  
  /**
   * Reject quotation
   */
  async reject(id: number, reason: string, userId: number): Promise<void> {
    const quotation = await this.getById(id);
    if (!quotation) throw new Error('Quotation not found');
    if (!['SENT'].includes(quotation.status)) {
      throw new Error(`Cannot reject quotation in status: ${quotation.status}`);
    }
    
    await pool.query(`
      UPDATE sales_quotations SET
        status = 'REJECTED',
        rejected_at = CURRENT_TIMESTAMP,
        rejection_reason = $1,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $2
      WHERE id = $3
    `, [reason, userId, id]);
  }
  
  /**
   * Convert quotation to sales order
   */
  async convertToOrder(id: number, userId: number): Promise<{ orderId: number; orderNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const quotation = await this.getById(id);
      if (!quotation) throw new Error('Quotation not found');
      if (!['ACCEPTED', 'SENT'].includes(quotation.status)) {
        throw new Error(`Cannot convert quotation in status: ${quotation.status}`);
      }
      
      if (!quotation.customer_id) {
        throw new Error('Cannot convert quotation without a customer');
      }
      
      // Generate order number
      const orderResult2 = await DocumentNumberService.generateNumber(quotation.company_id, 'sales_order');
      const orderNumber = orderResult2.number;
      
      // Create sales order header
      const orderResult = await client.query(`
        INSERT INTO sales_orders (
          company_id, branch_id, order_number, order_date, requested_delivery_date,
          customer_id, customer_code, customer_name, customer_name_ar,
          billing_address, shipping_address,
          quotation_id, quotation_number,
          currency_id, exchange_rate, price_list_id,
          subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount,
          payment_terms_id, delivery_terms, warehouse_id,
          notes, internal_notes, sales_rep_id,
          status, created_by
        )
        SELECT 
          company_id, branch_id, $1, CURRENT_DATE, valid_until,
          customer_id, $2, customer_name, $3,
          billing_address, shipping_address,
          id, quotation_number,
          currency_id, exchange_rate, price_list_id,
          subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount,
          payment_terms_id, delivery_terms, NULL,
          notes, internal_notes, sales_rep_id,
          'DRAFT', $4
        FROM sales_quotations
        WHERE id = $5
        RETURNING id
      `, [orderNumber, quotation.customer_code, quotation.customer_name_ar, userId, id]);
      
      const orderId = orderResult.rows[0].id;
      
      // Copy items
      await client.query(`
        INSERT INTO sales_order_items (
          order_id, line_number, quotation_item_id,
          item_id, item_code, item_name, item_name_ar, description,
          uom_id, ordered_qty,
          unit_price, price_source, original_price,
          discount_percent, discount_amount,
          tax_rate_id, tax_rate, tax_amount,
          line_total, requested_date, warehouse_id, notes
        )
        SELECT 
          $1, line_number, id,
          item_id, item_code, item_name, item_name_ar, description,
          uom_id, quantity,
          unit_price, price_source, original_price,
          discount_percent, discount_amount,
          tax_rate_id, tax_rate, tax_amount,
          line_total, requested_date, warehouse_id, notes
        FROM sales_quotation_items
        WHERE quotation_id = $2
        ORDER BY line_number
      `, [orderId, id]);
      
      // Update quotation status
      await client.query(`
        UPDATE sales_quotations SET
          status = 'CONVERTED',
          converted_to_order_id = $1,
          converted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE id = $3
      `, [orderId, userId, id]);
      
      await client.query('COMMIT');
      
      return { orderId, orderNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * List quotations with filters
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    salesRepId?: number;
    fromDate?: Date;
    toDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['sq.company_id = $1', 'sq.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`sq.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`sq.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.salesRepId) {
      conditions.push(`sq.sales_rep_id = $${paramIndex++}`);
      params.push(filters.salesRepId);
    }
    
    if (filters.fromDate) {
      conditions.push(`sq.quotation_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`sq.quotation_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.search) {
      conditions.push(`(
        sq.quotation_number ILIKE $${paramIndex} OR
        sq.customer_name ILIKE $${paramIndex} OR
        sq.rfq_reference ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales_quotations sq WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get data
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT sq.*,
             c.code as customer_code, c.name as customer_name_db,
             u.first_name || ' ' || u.last_name as sales_rep_name
      FROM sales_quotations sq
      LEFT JOIN customers c ON sq.customer_id = c.id
      LEFT JOIN users u ON sq.sales_rep_id = u.id
      WHERE ${whereClause}
      ORDER BY sq.quotation_date DESC, sq.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  /**
   * Get prices from price list for customer
   */
  async getItemPrices(companyId: number, customerId: number | null, itemIds: number[]): Promise<Map<number, { price: number; priceSource: string }>> {
    const result = new Map<number, { price: number; priceSource: string }>();
    
    for (const itemId of itemIds) {
      const priceResult = await PriceListService.getPrice(companyId, itemId, 1, customerId || undefined);
      if (priceResult) {
        result.set(itemId, {
          price: priceResult.unit_price,
          priceSource: priceResult.price_list_id ? 'PRICE_LIST' : 'MANUAL_OVERRIDE'
        });
      }
    }
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateTotals(items: QuotationItem[], discountPercent?: number, discountAmount?: number, freightAmount?: number) {
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      subtotal += item.lineTotal;
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
  
  private async insertQuotationItem(client: any, quotationId: number, item: QuotationItem) {
    await client.query(`
      INSERT INTO sales_quotation_items (
        quotation_id, line_number, item_id, item_code, item_name, description,
        uom_id, quantity, unit_price, price_source, original_price,
        discount_percent, discount_amount, tax_rate_id, tax_rate, tax_amount,
        line_total, requested_date, warehouse_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      quotationId, item.lineNumber, item.itemId, item.itemCode, item.itemName, item.description,
      item.uomId, item.quantity, item.unitPrice, item.priceSource || 'PRICE_LIST', item.originalPrice,
      item.discountPercent || 0, item.discountAmount || 0, item.taxRateId, item.taxRate || 0, item.taxAmount || 0,
      item.lineTotal, item.requestedDate, item.warehouseId, item.notes
    ]);
  }
}

export default new SalesQuotationService();
