/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  DELIVERY NOTE SERVICE                                                     ║
 * ║  Manages goods dispatch from sales orders with inventory posting           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { DocumentNumberService } from './documentNumberService';
import { SalesOrderService } from './salesOrderService';

// Instance for services with instance methods
const salesOrderService = new SalesOrderService();

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface DeliveryItem {
  lineNumber: number;
  salesOrderItemId: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  uomId?: number;
  orderedQty: number;
  deliveredQty: number;
  unitPrice?: number;
  lineTotal?: number;
  warehouseId?: number;
  binLocation?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  notes?: string;
}

export interface CreateDeliveryNoteInput {
  companyId: number;
  branchId?: number;
  deliveryDate: Date;
  customerId: number;
  salesOrderId: number;
  shippingAddress?: string;
  shipVia?: string;
  carrierName?: string;
  trackingNumber?: string;
  warehouseId: number;
  driverName?: string;
  vehicleNumber?: string;
  notes?: string;
  internalNotes?: string;
  items: DeliveryItem[];
  createdBy: number;
  postInventory?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class DeliveryNoteService {
  
  /**
   * Create a new delivery note from sales order
   */
  async create(input: CreateDeliveryNoteInput): Promise<{ id: number; deliveryNumber: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate sales order
      const order = await salesOrderService.getById(input.salesOrderId);
      if (!order) throw new Error('Sales order not found');
      if (!['APPROVED', 'CONFIRMED', 'PARTIALLY_DELIVERED'].includes(order.status)) {
        throw new Error(`Cannot create delivery from order in status: ${order.status}`);
      }
      
      // Generate delivery number
      const deliveryNumberResult = await DocumentNumberService.generateNumber(input.companyId, 'delivery_note');
      const deliveryNumber = deliveryNumberResult.number;
      
      // Calculate subtotal
      const subtotal = input.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      
      // Get customer info
      const customerResult = await client.query(
        'SELECT code, name FROM customers WHERE id = $1',
        [input.customerId]
      );
      const customer = customerResult.rows[0];
      
      // Insert delivery note header
      const deliveryResult = await client.query(`
        INSERT INTO delivery_notes (
          company_id, branch_id, delivery_number, delivery_date,
          customer_id, customer_code, customer_name,
          sales_order_id, order_number,
          shipping_address, ship_via, carrier_name, tracking_number,
          warehouse_id, driver_name, vehicle_number,
          subtotal, notes, internal_notes,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, [
        input.companyId, input.branchId, deliveryNumber, input.deliveryDate,
        input.customerId, customer.code, customer.name,
        input.salesOrderId, order.order_number,
        input.shippingAddress || order.shipping_address, input.shipVia, input.carrierName, input.trackingNumber,
        input.warehouseId, input.driverName, input.vehicleNumber,
        subtotal, input.notes, input.internalNotes,
        'DRAFT', input.createdBy
      ]);
      
      const deliveryId = deliveryResult.rows[0].id;
      
      // Insert items
      for (const item of input.items) {
        await this.insertDeliveryItem(client, deliveryId, item);
      }
      
      await client.query('COMMIT');
      
      // Post inventory if requested
      if (input.postInventory) {
        await this.postInventory(deliveryId, input.createdBy);
      }
      
      return { id: deliveryId, deliveryNumber };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get delivery note by ID
   */
  async getById(id: number): Promise<any> {
    const result = await pool.query(`
      SELECT dn.*,
             c.code as customer_code_db, c.name as customer_name_db,
             so.order_number as sales_order_number,
             w.name as warehouse_name
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      LEFT JOIN sales_orders so ON dn.sales_order_id = so.id
      LEFT JOIN warehouses w ON dn.warehouse_id = w.id
      WHERE dn.id = $1 AND dn.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const deliveryNote = result.rows[0];
    
    // Get items
    const itemsResult = await pool.query(`
      SELECT dni.*,
             i.code as item_code_db, i.name as item_name_db,
             uom.name as uom_name, uom.symbol as uom_symbol,
             w.name as warehouse_name
      FROM delivery_note_items dni
      LEFT JOIN items i ON dni.item_id = i.id
      LEFT JOIN units_of_measure uom ON dni.uom_id = uom.id
      LEFT JOIN warehouses w ON dni.warehouse_id = w.id
      WHERE dni.delivery_note_id = $1
      ORDER BY dni.line_number
    `, [id]);
    
    deliveryNote.items = itemsResult.rows;
    
    return deliveryNote;
  }
  
  /**
   * Mark delivery as dispatched
   */
  async dispatch(id: number, userId: number): Promise<void> {
    const delivery = await this.getById(id);
    if (!delivery) throw new Error('Delivery note not found');
    if (delivery.status !== 'READY') {
      throw new Error(`Cannot dispatch delivery in status: ${delivery.status}`);
    }
    
    await pool.query(`
      UPDATE delivery_notes SET
        status = 'DISPATCHED',
        dispatched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2
    `, [userId, id]);
  }
  
  /**
   * Mark delivery as delivered (confirmed receipt)
   */
  async confirmDelivery(id: number, receivedBy: string, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const delivery = await this.getById(id);
      if (!delivery) throw new Error('Delivery note not found');
      if (!['DISPATCHED', 'READY', 'DRAFT'].includes(delivery.status)) {
        throw new Error(`Cannot confirm delivery in status: ${delivery.status}`);
      }
      
      // Update delivery status
      await client.query(`
        UPDATE delivery_notes SET
          status = 'DELIVERED',
          delivered_at = CURRENT_TIMESTAMP,
          received_by = $1,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE id = $3
      `, [receivedBy, userId, id]);
      
      // Update sales order delivery progress
      for (const item of delivery.items) {
        if (item.sales_order_item_id) {
          await salesOrderService.updateDeliveryProgress(
            delivery.sales_order_id,
            item.item_id,
            Number(item.delivered_qty),
            client
          );
        }
      }
      
      // Release fulfilled reservations
      await this.releaseReservations(id, client);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Post inventory (goods issue)
   */
  async postInventory(id: number, userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const delivery = await this.getById(id);
      if (!delivery) throw new Error('Delivery note not found');
      if (delivery.inventory_posted) {
        throw new Error('Inventory already posted');
      }
      
      // Post inventory transactions for each item
      for (const item of delivery.items) {
        const warehouseId = item.warehouse_id || delivery.warehouse_id;
        
        // Create goods issue transaction (negative quantity)
        const txnResult = await client.query(`
          INSERT INTO inventory_transactions (
            company_id, item_id, warehouse_id, uom_id,
            transaction_type, quantity, reference_type, reference_id,
            batch_number, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          delivery.company_id,
          item.item_id,
          warehouseId,
          item.uom_id,
          'GOODS_ISSUE',
          -Number(item.delivered_qty), // Negative for goods out
          'delivery_note',
          id,
          item.batch_number,
          `Delivery ${delivery.delivery_number}`,
          userId
        ]);
        
        // Update delivery item with transaction reference
        await client.query(`
          UPDATE delivery_note_items SET inventory_transaction_id = $1 WHERE id = $2
        `, [txnResult.rows[0].id, item.id]);
      }
      
      // Update delivery note
      await client.query(`
        UPDATE delivery_notes SET
          status = 'READY',
          inventory_posted = true,
          inventory_posted_at = CURRENT_TIMESTAMP,
          inventory_posted_by = $1,
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
   * Create delivery note from sales order (auto-fill items)
   */
  async createFromOrder(orderId: number, warehouseId: number, createdBy: number): Promise<{ id: number; deliveryNumber: string }> {
    const order = await salesOrderService.getById(orderId);
    if (!order) throw new Error('Sales order not found');
    
    // Get deliverable items
    const deliverableItems = await salesOrderService.getDeliverableItems(orderId);
    
    if (deliverableItems.length === 0) {
      throw new Error('No items to deliver');
    }
    
    const items: DeliveryItem[] = deliverableItems.map((item, index) => ({
      lineNumber: index + 1,
      salesOrderItemId: item.id,
      itemId: item.item_id,
      itemCode: item.item_code,
      itemName: item.item_name,
      uomId: item.uom_id,
      orderedQty: Number(item.ordered_qty),
      deliveredQty: Number(item.pending_qty),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.pending_qty) * Number(item.unit_price),
      warehouseId: item.warehouse_id || warehouseId
    }));
    
    return this.create({
      companyId: order.company_id,
      branchId: order.branch_id,
      deliveryDate: new Date(),
      customerId: order.customer_id,
      salesOrderId: orderId,
      shippingAddress: order.shipping_address,
      warehouseId,
      items,
      createdBy
    });
  }
  
  /**
   * List delivery notes with filters
   */
  async list(companyId: number, filters: {
    status?: string;
    customerId?: number;
    salesOrderId?: number;
    warehouseId?: number;
    fromDate?: Date;
    toDate?: Date;
    invoiced?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const conditions = ['dn.company_id = $1', 'dn.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`dn.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.customerId) {
      conditions.push(`dn.customer_id = $${paramIndex++}`);
      params.push(filters.customerId);
    }
    
    if (filters.salesOrderId) {
      conditions.push(`dn.sales_order_id = $${paramIndex++}`);
      params.push(filters.salesOrderId);
    }
    
    if (filters.warehouseId) {
      conditions.push(`dn.warehouse_id = $${paramIndex++}`);
      params.push(filters.warehouseId);
    }
    
    if (filters.fromDate) {
      conditions.push(`dn.delivery_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      conditions.push(`dn.delivery_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }
    
    if (filters.invoiced !== undefined) {
      conditions.push(`dn.invoiced = $${paramIndex++}`);
      params.push(filters.invoiced);
    }
    
    if (filters.search) {
      conditions.push(`(
        dn.delivery_number ILIKE $${paramIndex} OR
        dn.customer_name ILIKE $${paramIndex} OR
        dn.tracking_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM delivery_notes dn WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get data
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const dataResult = await pool.query(`
      SELECT dn.*,
             c.code as customer_code_db, c.name as customer_name_db,
             so.order_number,
             w.name as warehouse_name
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      LEFT JOIN sales_orders so ON dn.sales_order_id = so.id
      LEFT JOIN warehouses w ON dn.warehouse_id = w.id
      WHERE ${whereClause}
      ORDER BY dn.delivery_date DESC, dn.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { data: dataResult.rows, total };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async insertDeliveryItem(client: any, deliveryNoteId: number, item: DeliveryItem) {
    await client.query(`
      INSERT INTO delivery_note_items (
        delivery_note_id, line_number, sales_order_item_id,
        item_id, item_code, item_name,
        uom_id, ordered_qty, delivered_qty,
        unit_price, line_total,
        warehouse_id, bin_location, batch_number, serial_numbers,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      deliveryNoteId, item.lineNumber, item.salesOrderItemId,
      item.itemId, item.itemCode, item.itemName,
      item.uomId, item.orderedQty, item.deliveredQty,
      item.unitPrice || 0, item.lineTotal || 0,
      item.warehouseId, item.binLocation, item.batchNumber, item.serialNumbers,
      item.notes
    ]);
  }
  
  private async releaseReservations(deliveryNoteId: number, client: any) {
    const delivery = await this.getById(deliveryNoteId);
    if (!delivery || !delivery.sales_order_id) return;
    
    for (const item of delivery.items) {
      if (!item.sales_order_item_id) continue;
      
      // Get reservation for this order item
      const reservationResult = await client.query(`
        SELECT id, reserved_qty, fulfilled_qty FROM inventory_reservations
        WHERE source_type = 'sales_order' 
          AND source_id = $1 
          AND source_line_id = $2
          AND item_id = $3
          AND status = 'ACTIVE'
      `, [delivery.sales_order_id, item.sales_order_item_id, item.item_id]);
      
      if (reservationResult.rows.length === 0) continue;
      
      const reservation = reservationResult.rows[0];
      const newFulfilled = Number(reservation.fulfilled_qty) + Number(item.delivered_qty);
      const status = newFulfilled >= Number(reservation.reserved_qty) ? 'FULFILLED' : 'ACTIVE';
      
      await client.query(`
        UPDATE inventory_reservations SET
          fulfilled_qty = $1,
          status = $2
        WHERE id = $3
      `, [newFulfilled, status, reservation.id]);
    }
  }
}

export default new DeliveryNoteService();
