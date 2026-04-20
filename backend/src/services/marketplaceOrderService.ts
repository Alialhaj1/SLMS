/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE ORDER SERVICE                                                ║
 * ║  Order splitting engine: one checkout → N vendor sub-orders              ║
 * ║  Handles: cart grouping, order creation, status tracking, fulfillment   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { sendOrderConfirmationEmail } from './emailTransportService';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface MarketplaceCheckoutParams {
  storeCustomerId: number;
  billingAddressId: number;
  shippingAddressId: number;
  paymentGateway: string;
  customerNotes?: string;
  couponCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface VendorGroup {
  vendorId: number;
  vendorName: string;
  companyId: number;
  commissionRate: number;
  items: CartItemWithVendor[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  commissionAmount: number;
  vendorPayout: number;
}

interface CartItemWithVendor {
  cartItemId: number;
  listingId: number;
  vendorId: number;
  itemId: number;
  variantId: number | null;
  itemName: string;
  itemNameAr: string;
  itemCode: string;
  imageUrl: string | null;
  quantity: number;
  uomId: number | null;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  warehouseId: number | null;
}

export interface MarketplaceCheckoutResult {
  marketplaceOrder: any;
  vendorSubOrders: any[];
  paymentUrl?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MARKETPLACE CHECKOUT — Groups cart by vendor, creates split orders
// ════════════════════════════════════════════════════════════════════════════

export async function processMarketplaceCheckout(
  params: MarketplaceCheckoutParams
): Promise<MarketplaceCheckoutResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '30s'");

    const {
      storeCustomerId, billingAddressId, shippingAddressId,
      paymentGateway, customerNotes, ipAddress, userAgent
    } = params;

    // ═══════════════════════════════════════════════════════════════════
    // 1. Get customer's active marketplace cart with vendor info
    // ═══════════════════════════════════════════════════════════════════
    const cartResult = await client.query(`
      SELECT c.id as cart_id, c.subtotal, c.discount_amount, c.tax_amount,
             c.total, c.currency_id, c.coupon_id
      FROM carts c
      WHERE c.store_customer_id = $1 AND c.status = 'active'
      ORDER BY c.updated_at DESC LIMIT 1
    `, [storeCustomerId]);

    if (cartResult.rows.length === 0) throw new Error('Cart is empty');
    const cart = cartResult.rows[0];

    // Get cart items WITH vendor information via listings
    const cartItemsResult = await client.query(`
      SELECT ci.*,
             ml.vendor_id, ml.listing_title as item_name, ml.listing_title_ar as item_name_ar,
             ml.images, ml.warehouse_id as listing_warehouse_id,
             mv.commission_rate as vendor_commission_rate,
             mv.vendor_name, mv.company_id as vendor_company_id,
             i.code as item_code
      FROM cart_items ci
      JOIN marketplace_listings ml ON ml.id = ci.listing_id
      JOIN marketplace_vendors mv ON mv.id = ml.vendor_id
      JOIN items i ON i.id = ci.item_id
      WHERE ci.cart_id = $1
      ORDER BY ml.vendor_id, ci.id
    `, [cart.cart_id]);

    if (cartItemsResult.rows.length === 0) throw new Error('Cart is empty');

    // ═══════════════════════════════════════════════════════════════════
    // 2. LOCK INVENTORY for all items (across all vendors)
    // ═══════════════════════════════════════════════════════════════════
    const itemIds = cartItemsResult.rows.map((r: any) => r.item_id);
    const lockedStock = await client.query(`
      SELECT iw.item_id, iw.warehouse_id,
             iw.qty_on_hand as stock,
             COALESCE(iw.qty_reserved, 0) as reserved
      FROM item_warehouse iw
      WHERE iw.item_id = ANY($1)
      FOR UPDATE OF iw
    `, [itemIds]);

    const stockMap = new Map<string, { stock: number; reserved: number }>();
    for (const row of lockedStock.rows) {
      const key = `${row.item_id}-${row.warehouse_id || 'all'}`;
      const existing = stockMap.get(key);
      if (existing) {
        existing.stock += parseFloat(row.stock);
        existing.reserved += parseFloat(row.reserved);
      } else {
        stockMap.set(key, { stock: parseFloat(row.stock), reserved: parseFloat(row.reserved) });
      }
    }

    // Total stock per item (across warehouses)
    const totalStockMap = new Map<number, number>();
    for (const row of lockedStock.rows) {
      const current = totalStockMap.get(row.item_id) || 0;
      totalStockMap.set(row.item_id, current + parseFloat(row.stock) - parseFloat(row.reserved));
    }

    // Validate stock
    for (const item of cartItemsResult.rows) {
      const available = totalStockMap.get(item.item_id) || 0;
      if (available < parseFloat(item.quantity)) {
        throw new Error(
          `Insufficient stock for "${item.item_name}". Available: ${Math.max(0, available)}, Requested: ${item.quantity}`
        );
      }
    }

    // Reserve inventory
    for (const item of cartItemsResult.rows) {
      await client.query(`
        UPDATE item_warehouse
        SET qty_reserved = COALESCE(qty_reserved, 0) + $1, updated_at = NOW()
        WHERE item_id = $2
        AND id = (
          SELECT id FROM item_warehouse
          WHERE item_id = $2 AND qty_on_hand - COALESCE(qty_reserved, 0) >= $1
          ORDER BY qty_on_hand DESC LIMIT 1
        )
      `, [parseFloat(item.quantity), item.item_id]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. GROUP CART ITEMS BY VENDOR
    // ═══════════════════════════════════════════════════════════════════
    const mpConfig = await client.query('SELECT * FROM marketplace_config WHERE id = 1');
    const defaultCommission = mpConfig.rows[0]?.default_commission_rate || 10;

    const vendorGroups = new Map<number, VendorGroup>();

    for (const row of cartItemsResult.rows) {
      const vendorId = row.vendor_id;
      const commissionRate = row.vendor_commission_rate ?? defaultCommission;
      const lineTotal = parseFloat(row.line_total);
      const taxAmount = parseFloat(row.tax_amount || 0);
      const discountAmount = parseFloat(row.discount_amount || 0);

      let group = vendorGroups.get(vendorId);
      if (!group) {
        group = {
          vendorId,
          vendorName: row.vendor_name,
          companyId: row.vendor_company_id,
          commissionRate,
          items: [],
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          shippingAmount: 0,
          total: 0,
          commissionAmount: 0,
          vendorPayout: 0,
        };
        vendorGroups.set(vendorId, group);
      }

      const images = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
      const primaryImage = images.find((i: any) => i.isPrimary) || images[0];

      group.items.push({
        cartItemId: row.id,
        listingId: row.listing_id,
        vendorId,
        itemId: row.item_id,
        variantId: row.variant_id || null,
        itemName: row.item_name,
        itemNameAr: row.item_name_ar || '',
        itemCode: row.item_code,
        imageUrl: primaryImage?.url || null,
        quantity: parseFloat(row.quantity),
        uomId: row.uom_id || null,
        unitPrice: parseFloat(row.unit_price),
        discountPercent: parseFloat(row.discount_percent || 0),
        discountAmount,
        taxRate: parseFloat(row.tax_rate || 0),
        taxAmount,
        lineTotal,
        warehouseId: row.listing_warehouse_id || null,
      });

      group.subtotal += lineTotal;
      group.taxAmount += taxAmount;
      group.discountAmount += discountAmount;
    }

    // Calculate commission per vendor group
    for (const group of vendorGroups.values()) {
      group.total = group.subtotal + group.taxAmount - group.discountAmount + group.shippingAmount;
      group.commissionAmount = Math.round(group.total * group.commissionRate) / 100;
      group.vendorPayout = group.total - group.commissionAmount;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. VALIDATE ADDRESSES
    // ═══════════════════════════════════════════════════════════════════
    const billingAddr = await client.query(
      'SELECT * FROM store_customer_addresses WHERE id = $1 AND store_customer_id = $2',
      [billingAddressId, storeCustomerId]
    );
    const shippingAddr = await client.query(
      'SELECT * FROM store_customer_addresses WHERE id = $1 AND store_customer_id = $2',
      [shippingAddressId, storeCustomerId]
    );
    if (billingAddr.rows.length === 0 || shippingAddr.rows.length === 0) {
      throw new Error('Invalid address');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. GENERATE MARKETPLACE ORDER NUMBER
    // ═══════════════════════════════════════════════════════════════════
    const seqResult = await client.query(`
      INSERT INTO marketplace_sequences (seq_type, prefix, next_value)
      VALUES ('order', 'MKT', 2)
      ON CONFLICT (seq_type)
      DO UPDATE SET next_value = marketplace_sequences.next_value + 1
      RETURNING next_value - 1 as current_value, prefix
    `);
    const seq = seqResult.rows[0];
    const orderNumber = `${seq.prefix}-${String(seq.current_value).padStart(6, '0')}`;

    // ═══════════════════════════════════════════════════════════════════
    // 6. CREATE MASTER MARKETPLACE ORDER
    // ═══════════════════════════════════════════════════════════════════
    let masterSubtotal = 0;
    let masterTax = 0;
    let masterDiscount = 0;
    let masterShipping = 0;
    let platformFee = 0;

    for (const group of vendorGroups.values()) {
      masterSubtotal += group.subtotal;
      masterTax += group.taxAmount;
      masterDiscount += group.discountAmount;
      masterShipping += group.shippingAmount;
      platformFee += group.commissionAmount;
    }
    const masterTotal = masterSubtotal + masterTax - masterDiscount + masterShipping;

    const masterOrderResult = await client.query(`
      INSERT INTO marketplace_orders (
        store_customer_id, order_number,
        subtotal, discount_amount, tax_amount, shipping_amount, platform_fee, total,
        currency_id, billing_address, shipping_address,
        payment_status, payment_gateway,
        status, customer_notes, ip_address, user_agent, vendor_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, 'unpaid', $12,
        'pending', $13, $14, $15, $16
      ) RETURNING *
    `, [
      storeCustomerId, orderNumber,
      masterSubtotal, masterDiscount, masterTax, masterShipping, platformFee, masterTotal,
      cart.currency_id || null,
      JSON.stringify(billingAddr.rows[0]), JSON.stringify(shippingAddr.rows[0]),
      paymentGateway,
      customerNotes || null, ipAddress || null, userAgent || null,
      vendorGroups.size,
    ]);

    const masterOrder = masterOrderResult.rows[0];

    // ═══════════════════════════════════════════════════════════════════
    // 7. CREATE VENDOR SUB-ORDERS + ERP SALES ORDERS
    // ═══════════════════════════════════════════════════════════════════
    const vendorSubOrders: any[] = [];
    let vendorIndex = 1;

    for (const group of vendorGroups.values()) {
      const subOrderNumber = `${orderNumber}-V${vendorIndex}`;

      // ── Create marketplace_order_vendors row ──
      const subOrderResult = await client.query(`
        INSERT INTO marketplace_order_vendors (
          marketplace_order_id, vendor_id, sub_order_number,
          subtotal, discount_amount, tax_amount, shipping_amount, total,
          commission_rate, commission_amount, vendor_payout,
          status, settlement_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'pending')
        RETURNING *
      `, [
        masterOrder.id, group.vendorId, subOrderNumber,
        group.subtotal, group.discountAmount, group.taxAmount,
        group.shippingAmount, group.total,
        group.commissionRate, group.commissionAmount, group.vendorPayout,
      ]);

      const subOrder = subOrderResult.rows[0];

      // ── Create marketplace_order_items ──
      for (const item of group.items) {
        await client.query(`
          INSERT INTO marketplace_order_items (
            marketplace_order_id, order_vendor_id, listing_id,
            item_id, variant_id, item_name, item_name_ar, item_code, image_url,
            quantity, uom_id, unit_price, discount_percent, discount_amount,
            tax_rate, tax_amount, line_total, warehouse_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          masterOrder.id, subOrder.id, item.listingId,
          item.itemId, item.variantId, item.itemName, item.itemNameAr,
          item.itemCode, item.imageUrl,
          item.quantity, item.uomId, item.unitPrice,
          item.discountPercent, item.discountAmount,
          item.taxRate, item.taxAmount, item.lineTotal,
          item.warehouseId,
        ]);
      }

      // ── Create ERP Sales Order in vendor's company ──
      const erpCustomerId = await ensureErpCustomerForVendor(
        client, storeCustomerId, group.companyId
      );

      const salesOrderId = await createVendorSalesOrder(
        client, subOrder, group, erpCustomerId,
        billingAddr.rows[0], shippingAddr.rows[0]
      );

      // Link sub-order to ERP sales order
      await client.query(
        'UPDATE marketplace_order_vendors SET sales_order_id = $1 WHERE id = $2',
        [salesOrderId, subOrder.id]
      );

      vendorSubOrders.push({ ...subOrder, salesOrderId });
      vendorIndex++;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. CONVERT CART
    // ═══════════════════════════════════════════════════════════════════
    await client.query(
      "UPDATE carts SET status = 'converted', updated_at = NOW() WHERE id = $1",
      [cart.cart_id]
    );

    await client.query('COMMIT');

    // ─── Non-blocking: send confirmation email ───
    try {
      const customer = await pool.query(
        'SELECT first_name, last_name, email FROM store_customers WHERE id = $1',
        [storeCustomerId]
      );
      if (customer.rows[0]?.email) {
        const allItems = Array.from(vendorGroups.values()).flatMap(g =>
          g.items.map(i => ({ name: i.itemName, quantity: i.quantity, price: i.unitPrice }))
        );
        sendOrderConfirmationEmail({
          customerEmail: customer.rows[0].email,
          customerName: `${customer.rows[0].first_name} ${customer.rows[0].last_name || ''}`.trim(),
          orderNumber,
          total: masterTotal,
          currencyCode: 'SAR',
          items: allItems,
          storeName: 'SLMS Marketplace',
        }).catch(err => console.error('Email send failed:', err.message));
      }
    } catch {
      // Non-critical
    }

    return {
      marketplaceOrder: {
        id: masterOrder.id,
        orderNumber,
        status: masterOrder.status,
        total: masterTotal,
        vendorCount: vendorGroups.size,
        paymentGateway,
      },
      vendorSubOrders,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Ensure ERP customer exists in vendor's company
// ════════════════════════════════════════════════════════════════════════════

async function ensureErpCustomerForVendor(
  client: any,
  storeCustomerId: number,
  vendorCompanyId: number
): Promise<number> {
  // Check if customer already exists in this vendor's company
  const existing = await client.query(`
    SELECT c.id FROM customers c
    JOIN store_customers sc ON sc.erp_customer_id = c.id
    WHERE sc.id = $1 AND c.company_id = $2
  `, [storeCustomerId, vendorCompanyId]);

  if (existing.rows.length > 0) return existing.rows[0].id;

  // Get store customer details
  const sc = await client.query(
    'SELECT * FROM store_customers WHERE id = $1',
    [storeCustomerId]
  );
  if (sc.rows.length === 0) throw new Error('Store customer not found');
  const c = sc.rows[0];

  // Check if email already exists in vendor's customer list
  const emailCheck = await client.query(
    'SELECT id FROM customers WHERE company_id = $1 AND email = $2',
    [vendorCompanyId, c.email]
  );
  if (emailCheck.rows.length > 0) return emailCheck.rows[0].id;

  // Generate customer code
  const codeResult = await client.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1 as next_code FROM customers WHERE company_id = $1 AND code LIKE 'MKT-%'",
    [vendorCompanyId]
  );
  const customerCode = `MKT-${String(codeResult.rows[0].next_code).padStart(5, '0')}`;

  const result = await client.query(`
    INSERT INTO customers (company_id, code, name, name_ar, email, phone, customer_type, status)
    VALUES ($1, $2, $3, $3, $4, $5, 'individual', 'active')
    RETURNING id
  `, [vendorCompanyId, customerCode, `${c.first_name} ${c.last_name || ''}`.trim(), c.email, c.phone]);

  return result.rows[0].id;
}

// ════════════════════════════════════════════════════════════════════════════
// Create ERP Sales Order in vendor's company
// ════════════════════════════════════════════════════════════════════════════

async function createVendorSalesOrder(
  client: any,
  subOrder: any,
  group: VendorGroup,
  customerId: number,
  billingAddress: any,
  shippingAddress: any
): Promise<number> {
  const soNumberResult = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1 as next_num
    FROM sales_orders WHERE company_id = $1 AND order_number LIKE 'SO-%'
  `, [group.companyId]);
  const soNumber = `SO-${String(soNumberResult.rows[0].next_num).padStart(6, '0')}`;

  const billingStr = [billingAddress.address_line1, billingAddress.city, billingAddress.state].filter(Boolean).join(', ');
  const shippingStr = [shippingAddress.address_line1, shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ');

  const soResult = await client.query(`
    INSERT INTO sales_orders (
      company_id, order_number, order_date,
      customer_id, billing_address, shipping_address,
      subtotal, discount_amount, tax_amount, freight_amount, total_amount,
      status, source, notes, created_by
    ) VALUES (
      $1, $2, NOW(), $3, $4, $5,
      $6, $7, $8, $9, $10,
      'confirmed', 'marketplace', $11, 1
    ) RETURNING id
  `, [
    group.companyId, soNumber, customerId, billingStr, shippingStr,
    group.subtotal, group.discountAmount, group.taxAmount,
    group.shippingAmount, group.total,
    `Marketplace sub-order: ${subOrder.sub_order_number}`,
  ]);

  const salesOrderId = soResult.rows[0].id;

  // Create sales order line items
  let lineNumber = 1;
  for (const item of group.items) {
    await client.query(`
      INSERT INTO sales_order_items (
        sales_order_id, line_number, item_id, item_code, item_name,
        ordered_qty, unit_price, discount_percent, discount_amount,
        tax_rate, tax_amount, line_total, warehouse_id, uom_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      salesOrderId, lineNumber++, item.itemId, item.itemCode, item.itemName,
      item.quantity, item.unitPrice, item.discountPercent, item.discountAmount,
      item.taxRate, item.taxAmount, item.lineTotal,
      item.warehouseId || null, item.uomId || null,
    ]);
  }

  return salesOrderId;
}

// ════════════════════════════════════════════════════════════════════════════
// ORDER QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get marketplace order with all vendor sub-orders (customer view)
 */
export async function getMarketplaceOrder(orderId: number, customerId?: number): Promise<any | null> {
  const conditions = ['mo.id = $1 AND mo.deleted_at IS NULL'];
  const params: any[] = [orderId];
  if (customerId) {
    conditions.push('mo.store_customer_id = $2');
    params.push(customerId);
  }

  const result = await pool.query(`
    SELECT mo.*
    FROM marketplace_orders mo
    WHERE ${conditions.join(' AND ')}
  `, params);

  if (result.rows.length === 0) return null;
  const order = result.rows[0];

  // Get vendor sub-orders
  const subOrders = await pool.query(`
    SELECT mov.*,
           mv.vendor_name, mv.vendor_name_ar, mv.slug as vendor_slug, mv.logo_url as vendor_logo
    FROM marketplace_order_vendors mov
    JOIN marketplace_vendors mv ON mv.id = mov.vendor_id
    WHERE mov.marketplace_order_id = $1
    ORDER BY mov.id
  `, [orderId]);

  // Get items per sub-order
  for (const sub of subOrders.rows) {
    const items = await pool.query(`
      SELECT moi.*
      FROM marketplace_order_items moi
      WHERE moi.order_vendor_id = $1
      ORDER BY moi.id
    `, [sub.id]);
    sub.items = items.rows;
  }

  return { ...order, vendorSubOrders: subOrders.rows };
}

/**
 * List customer's marketplace orders
 */
export async function listCustomerOrders(
  customerId: number,
  page: number = 1,
  limit: number = 10
): Promise<{ orders: any[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM marketplace_orders WHERE store_customer_id = $1 AND deleted_at IS NULL',
    [customerId]
  );

  const result = await pool.query(`
    SELECT mo.*
    FROM marketplace_orders mo
    WHERE mo.store_customer_id = $1 AND mo.deleted_at IS NULL
    ORDER BY mo.created_at DESC
    LIMIT $2 OFFSET $3
  `, [customerId, limit, offset]);

  return {
    orders: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * List vendor's sub-orders (vendor dashboard)
 */
export async function listVendorOrders(
  vendorId: number,
  filters: { status?: string; page?: number; limit?: number } = {}
): Promise<{ orders: any[]; total: number }> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions = ['mov.vendor_id = $1'];
  const params: any[] = [vendorId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`mov.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM marketplace_order_vendors mov WHERE ${whereClause}`,
    params
  );

  const result = await pool.query(`
    SELECT mov.*, mo.order_number as master_order_number,
           mo.billing_address, mo.shipping_address,
           sc.first_name as customer_name, sc.email as customer_email
    FROM marketplace_order_vendors mov
    JOIN marketplace_orders mo ON mo.id = mov.marketplace_order_id
    JOIN store_customers sc ON sc.id = mo.store_customer_id
    WHERE ${whereClause}
    ORDER BY mov.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, limit, offset]);

  // Attach items
  for (const order of result.rows) {
    const items = await pool.query(
      'SELECT * FROM marketplace_order_items WHERE order_vendor_id = $1',
      [order.id]
    );
    order.items = items.rows;
  }

  return {
    orders: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Update vendor sub-order status (vendor action: confirm, ship, etc.)
 */
export async function updateVendorOrderStatus(
  subOrderId: number,
  vendorId: number,
  status: string,
  extras?: { trackingNumber?: string; shippingProvider?: string; vendorNotes?: string; cancelReason?: string }
): Promise<any> {
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
    refunded: [],
  };

  // Get current status
  const current = await pool.query(
    'SELECT status FROM marketplace_order_vendors WHERE id = $1 AND vendor_id = $2',
    [subOrderId, vendorId]
  );
  if (current.rows.length === 0) throw new Error('Sub-order not found');

  const currentStatus = current.rows[0].status;
  if (!validTransitions[currentStatus]?.includes(status)) {
    throw new Error(`Invalid status transition: ${currentStatus} → ${status}`);
  }

  const updates: string[] = ['status = $1', 'updated_at = NOW()'];
  const params: any[] = [status];
  let paramIndex = 2;

  if (status === 'shipped') {
    updates.push(`shipped_at = NOW()`);
    if (extras?.trackingNumber) {
      updates.push(`tracking_number = $${paramIndex++}`);
      params.push(extras.trackingNumber);
    }
    if (extras?.shippingProvider) {
      updates.push(`shipping_provider = $${paramIndex++}`);
      params.push(extras.shippingProvider);
    }
  }

  if (status === 'delivered') {
    updates.push('delivered_at = NOW()');
    // Make eligible for settlement after hold period
    const config = await pool.query('SELECT settlement_hold_days FROM marketplace_config WHERE id = 1');
    const holdDays = config.rows[0]?.settlement_hold_days || 7;
    updates.push(`settlement_status = 'eligible'`);
    updates.push(`settlement_eligible_at = NOW() + INTERVAL '${holdDays} days'`);
  }

  if (status === 'cancelled' && extras?.cancelReason) {
    updates.push(`cancel_reason = $${paramIndex++}`);
    params.push(extras.cancelReason);
  }

  if (extras?.vendorNotes) {
    updates.push(`vendor_notes = $${paramIndex++}`);
    params.push(extras.vendorNotes);
  }

  params.push(subOrderId, vendorId);
  const result = await pool.query(`
    UPDATE marketplace_order_vendors
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND vendor_id = $${paramIndex}
    RETURNING *
  `, params);

  // Update master order status based on all sub-orders
  if (result.rows.length > 0) {
    await syncMasterOrderStatus(result.rows[0].marketplace_order_id);
  }

  return result.rows[0];
}

/**
 * Sync master order status based on vendor sub-order statuses
 */
async function syncMasterOrderStatus(masterOrderId: number): Promise<void> {
  const subOrders = await pool.query(
    'SELECT status FROM marketplace_order_vendors WHERE marketplace_order_id = $1',
    [masterOrderId]
  );

  const statuses = subOrders.rows.map((r: any) => r.status);

  let masterStatus: string;
  if (statuses.every((s: string) => s === 'delivered')) {
    masterStatus = 'delivered';
  } else if (statuses.every((s: string) => s === 'cancelled')) {
    masterStatus = 'cancelled';
  } else if (statuses.every((s: string) => ['shipped', 'delivered'].includes(s))) {
    masterStatus = 'shipped';
  } else if (statuses.some((s: string) => s === 'shipped') && statuses.some((s: string) => !['shipped', 'delivered'].includes(s))) {
    masterStatus = 'partially_shipped';
  } else if (statuses.every((s: string) => ['confirmed', 'processing', 'shipped', 'delivered'].includes(s))) {
    masterStatus = 'confirmed';
  } else {
    masterStatus = 'pending';
  }

  await pool.query(
    'UPDATE marketplace_orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [masterStatus, masterOrderId]
  );
}

export default {
  processMarketplaceCheckout,
  getMarketplaceOrder,
  listCustomerOrders,
  listVendorOrders,
  updateVendorOrderStatus,
};
