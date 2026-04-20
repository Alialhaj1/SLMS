/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE CHECKOUT SERVICE v2                                                ║
 * ║  Cart → Store Order → ERP Sales Order → Accounting                      ║
 * ║  ✅ Inventory locking with SELECT FOR UPDATE (race condition fix)        ║
 * ║  ✅ Full accounting sync (Payment Voucher + Journal Entry)              ║
 * ║  ✅ Stock reservation during checkout                                    ║
 * ║  ✅ Inventory deduction after payment                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { getCartWithItems, getOrCreateCart } from './storeCartService';
import { sendOrderConfirmationEmail, sendPaymentReceivedEmail } from './emailTransportService';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

interface CheckoutParams {
  cartId: number;
  storeId: number;
  companyId: number;
  storeCustomerId: number;
  billingAddressId: number;
  shippingAddressId: number;
  shippingRateId?: number;
  paymentGateway: string; // 'stripe' | 'paypal' | 'mada' | 'cod'
  customerNotes?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface CheckoutResult {
  storeOrder: any;
  salesOrderId: number;
  paymentUrl?: string; // Redirect URL for online payment
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT — Main orchestrator
// ════════════════════════════════════════════════════════════════════════════

export async function processCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Set statement timeout to prevent long-held locks (30s max)
    await client.query("SET LOCAL statement_timeout = '30s'");

    const {
      cartId, storeId, companyId, storeCustomerId,
      billingAddressId, shippingAddressId, shippingRateId,
      paymentGateway, customerNotes, ipAddress, userAgent
    } = params;

    // 1. Resolve cart from customer's active cart if cartId=0
    let resolvedCartId = cartId;
    if (!resolvedCartId) {
      const activeCart = await client.query(`
        SELECT id FROM carts
        WHERE store_id = $1 AND store_customer_id = $2 AND status = 'active'
        ORDER BY updated_at DESC LIMIT 1
      `, [storeId, storeCustomerId]);
      if (activeCart.rows.length === 0) throw new Error('Cart is empty');
      resolvedCartId = activeCart.rows[0].id;
    }

    const cart = await getCartWithItems(companyId, resolvedCartId);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // ════════════════════════════════════════════════════════════════════
    // 2. LOCK INVENTORY — SELECT FOR UPDATE prevents race conditions
    //    Two users buying the same last item: one will wait, other gets error
    // ════════════════════════════════════════════════════════════════════
    const itemIds = cart.items.map((i: any) => i.itemId);
    // Lock rows first (FOR UPDATE cannot be used with GROUP BY)
    await client.query(`
      SELECT iw.id FROM item_warehouse iw
      WHERE iw.item_id = ANY($1)
      FOR UPDATE
    `, [itemIds]);
    // Now aggregate stock totals
    const lockedStock = await client.query(`
      SELECT iw.item_id, 
             SUM(iw.qty_on_hand) as stock,
             SUM(COALESCE(iw.qty_reserved, 0)) as reserved
      FROM item_warehouse iw
      WHERE iw.item_id = ANY($1)
      GROUP BY iw.item_id
    `, [itemIds]);

    const stockMap = new Map<number, { stock: number; reserved: number }>();
    for (const row of lockedStock.rows) {
      stockMap.set(row.item_id, {
        stock: parseFloat(row.stock),
        reserved: parseFloat(row.reserved),
      });
    }

    // Validate stock for ALL items (after locking — guaranteed no parallel oversell)
    for (const item of cart.items) {
      const inventory = stockMap.get(item.itemId);
      const available = inventory ? inventory.stock - inventory.reserved : 0;
      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.itemName}". Available: ${Math.max(0, available)}, Requested: ${item.quantity}`
        );
      }
    }

    // 3. RESERVE INVENTORY — Mark stock as reserved to prevent overselling
    for (const item of cart.items) {
      await client.query(`
        UPDATE item_warehouse
        SET qty_reserved = COALESCE(qty_reserved, 0) + $1,
            updated_at = NOW()
        WHERE item_id = $2
        AND id = (
          SELECT id FROM item_warehouse
          WHERE item_id = $2 AND qty_on_hand - COALESCE(qty_reserved, 0) >= $1
          ORDER BY qty_on_hand DESC LIMIT 1
        )
      `, [item.quantity, item.itemId]);
    }

    // 4. Validate addresses
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

    // 4. Calculate shipping
    let shippingAmount = 0;
    let shippingMethodName = 'Standard';
    if (shippingRateId) {
      const rate = await client.query(
        'SELECT * FROM shipping_rates WHERE id = $1',
        [shippingRateId]
      );
      if (rate.rows.length > 0) {
        const r = rate.rows[0];
        shippingMethodName = r.name;
        if (r.rate_type === 'flat') {
          shippingAmount = parseFloat(r.flat_rate) || 0;
        }
        if (r.free_shipping_above && cart.subtotal >= parseFloat(r.free_shipping_above)) {
          shippingAmount = 0;
        }
      }
    }

    // 5. Generate order number
    const seqResult = await client.query(`
      INSERT INTO store_sequences (store_id, seq_type, prefix, next_value)
      VALUES ($1, 'order', 'ORD', 2)
      ON CONFLICT (store_id, seq_type)
      DO UPDATE SET next_value = store_sequences.next_value + 1
      RETURNING next_value - 1 as current_value, prefix
    `, [storeId]);
    
    const seq = seqResult.rows[0];
    const orderNumber = `${seq.prefix}-${String(seq.current_value).padStart(6, '0')}`;

    // 6. Final totals
    const total = cart.subtotal - cart.discountAmount + cart.taxAmount + shippingAmount;

    // 7. Create store order
    const orderResult = await client.query(`
      INSERT INTO store_orders (
        store_id, company_id, store_customer_id, order_number,
        billing_address, shipping_address,
        subtotal, discount_amount, tax_amount, shipping_amount, total,
        currency_id, coupon_id, coupon_code,
        status, payment_status, payment_gateway,
        shipping_method, shipping_zone_id,
        customer_notes, ip_address, user_agent
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        'pending', 'unpaid', $15,
        $16, $17,
        $18, $19, $20
      ) RETURNING *
    `, [
      storeId, companyId, storeCustomerId, orderNumber,
      JSON.stringify(billingAddr.rows[0]), JSON.stringify(shippingAddr.rows[0]),
      cart.subtotal, cart.discountAmount, cart.taxAmount, shippingAmount, total,
      cart.currencyId || null, cart.couponId || null, cart.coupon?.code || null,
      paymentGateway,
      shippingMethodName, shippingRateId || null,
      customerNotes, ipAddress, userAgent
    ]);

    const storeOrder = orderResult.rows[0];

    // 8. Create store order items
    for (const item of cart.items) {
      await client.query(`
        INSERT INTO store_order_items (
          store_order_id, item_id, variant_id, item_code, item_name, item_name_ar,
          quantity, uom_id, unit_price, discount_percent, discount_amount,
          tax_rate, tax_amount, line_total, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        storeOrder.id, item.itemId, item.variantId || null,
        item.itemCode, item.itemName, item.itemNameAr,
        item.quantity, item.uomId || null,
        item.unitPrice, item.discountPercent, item.discountAmount,
        item.taxRate, item.taxAmount, item.lineTotal,
        item.imageUrl
      ]);
    }

    // 9. Ensure ERP customer exists (link store_customer → customers)
    const erpCustomerId = await ensureErpCustomer(client, storeCustomerId, companyId);

    // 10. Create ERP Sales Order
    const salesOrderId = await createErpSalesOrder(
      client, storeOrder, cart, erpCustomerId,
      billingAddr.rows[0], shippingAddr.rows[0],
      shippingAmount
    );

    // Link store order to ERP order
    await client.query(
      'UPDATE store_orders SET sales_order_id = $1 WHERE id = $2',
      [salesOrderId, storeOrder.id]
    );

    // 11. Record coupon usage
    if (cart.couponId) {
      await client.query(`
        INSERT INTO coupon_usage (coupon_id, store_customer_id, order_id, discount_applied)
        VALUES ($1, $2, $3, $4)
      `, [cart.couponId, storeCustomerId, storeOrder.id, cart.discountAmount]);

      await client.query(
        'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1',
        [cart.couponId]
      );
    }

    // 12. Mark cart as converted
    await client.query(
      "UPDATE carts SET status = 'converted', updated_at = NOW() WHERE id = $1",
      [resolvedCartId]
    );

    // 13. Track analytics
    await client.query(`
      INSERT INTO store_analytics_events (store_id, store_customer_id, event_type, event_data, ip_address)
      VALUES ($1, $2, 'purchase', $3, $4)
    `, [storeId, storeCustomerId,
      JSON.stringify({ orderId: storeOrder.id, total, itemCount: cart.items.length }),
      ipAddress
    ]);

    await client.query('COMMIT');

    // 14. Send order confirmation email (non-blocking, after commit)
    try {
      const customer = await pool.query(
        'SELECT first_name, last_name, email FROM store_customers WHERE id = $1',
        [storeCustomerId]
      );
      const storeName = await pool.query('SELECT name FROM stores WHERE id = $1', [storeId]);
      if (customer.rows[0]?.email) {
        sendOrderConfirmationEmail({
          customerEmail: customer.rows[0].email,
          customerName: `${customer.rows[0].first_name} ${customer.rows[0].last_name || ''}`.trim(),
          orderNumber,
          total,
          currencyCode: 'SAR',
          items: cart.items.map((i: any) => ({ name: i.itemName, quantity: i.quantity, price: i.unitPrice })),
          storeName: storeName.rows[0]?.name || 'Store',
        }).catch(err => console.error('Email send failed:', err.message));
      }
    } catch (emailErr) {
      // Non-critical — don't fail the checkout
      console.error('Order email notification error:', emailErr);
    }

    // 15. Handle payment gateway (outside transaction — order is already persisted)
    let paymentUrl: string | undefined;
    if (paymentGateway === 'cod') {
      // Cash on delivery — confirm order immediately, inventory stays reserved until delivery
      await confirmOrder(storeOrder.id);
    }
    // For online payment gateways (stripe/paypal/mada), the route layer
    // calls paymentGatewayService.createPaymentIntent() and returns the URL.
    // Stock remains reserved until webhook confirms payment or reservation expires.

    return {
      storeOrder: {
        id: storeOrder.id,
        orderNumber,
        status: storeOrder.status,
        total,
        paymentGateway,
      },
      salesOrderId,
      paymentUrl,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    // Reservations are also rolled back since they were inside the transaction
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Ensure ERP Customer exists (create if needed)
// ════════════════════════════════════════════════════════════════════════════

async function ensureErpCustomer(
  client: any,
  storeCustomerId: number,
  companyId: number
): Promise<number> {
  // Check if already linked
  const existing = await client.query(
    'SELECT erp_customer_id FROM store_customers WHERE id = $1',
    [storeCustomerId]
  );

  if (existing.rows[0]?.erp_customer_id) {
    return existing.rows[0].erp_customer_id;
  }

  // Get store customer details
  const sc = await client.query(
    'SELECT * FROM store_customers WHERE id = $1',
    [storeCustomerId]
  );

  if (sc.rows.length === 0) throw new Error('Store customer not found');
  const c = sc.rows[0];

  // Generate customer code
  const codeResult = await client.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1 as next_code FROM customers WHERE company_id = $1 AND code LIKE 'WEB-%'",
    [companyId]
  );
  const customerCode = `WEB-${String(codeResult.rows[0].next_code).padStart(5, '0')}`;

  // Create ERP customer
  const customerResult = await client.query(`
    INSERT INTO customers (company_id, code, name, name_ar, email, phone, customer_type, status)
    VALUES ($1, $2, $3, $3, $4, $5, 'individual', 'active')
    RETURNING id
  `, [companyId, customerCode, `${c.first_name} ${c.last_name || ''}`.trim(), c.email, c.phone]);

  const erpCustomerId = customerResult.rows[0].id;

  // Link
  await client.query(
    'UPDATE store_customers SET erp_customer_id = $1 WHERE id = $2',
    [erpCustomerId, storeCustomerId]
  );

  return erpCustomerId;
}

// ════════════════════════════════════════════════════════════════════════════
// Create ERP Sales Order (integrates with existing sales module)
// ════════════════════════════════════════════════════════════════════════════

async function createErpSalesOrder(
  client: any,
  storeOrder: any,
  cart: any,
  customerId: number,
  billingAddress: any,
  shippingAddress: any,
  shippingAmount: number
): Promise<number> {
  // Generate SO number
  const soNumberResult = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1 as next_num
    FROM sales_orders 
    WHERE company_id = $1 AND order_number LIKE 'SO-%'
  `, [storeOrder.company_id]);
  
  const soNumber = `SO-${String(soNumberResult.rows[0].next_num).padStart(6, '0')}`;

  const billingStr = [billingAddress.address_line1, billingAddress.city, billingAddress.state].filter(Boolean).join(', ');
  const shippingStr = [shippingAddress.address_line1, shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ');

  const soResult = await client.query(`
    INSERT INTO sales_orders (
      company_id, order_number, order_date, 
      customer_id, billing_address, shipping_address,
      status, currency_id,
      subtotal, discount_amount, tax_amount, freight_amount, total_amount,
      total_qty_ordered, delivery_status, invoice_status,
      created_at
    ) VALUES (
      $1, $2, NOW(),
      $3, $4, $5,
      'CONFIRMED', $6,
      $7, $8, $9, $10, $11,
      $12, 'PENDING', 'PENDING',
      NOW()
    ) RETURNING id
  `, [
    storeOrder.company_id, soNumber,
    customerId, billingStr, shippingStr,
    storeOrder.currency_id,
    cart.subtotal, cart.discountAmount, cart.taxAmount, shippingAmount,
    cart.subtotal - cart.discountAmount + cart.taxAmount + shippingAmount,
    cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
  ]);

  const salesOrderId = soResult.rows[0].id;

  // Create SO line items
  let lineNumber = 1;
  for (const item of cart.items) {
    await client.query(`
      INSERT INTO sales_order_items (
        order_id, line_number, item_id, item_code, item_name, item_name_ar,
        ordered_qty, unit_price, discount_percent, discount_amount,
        tax_rate, tax_amount, line_total, uom_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      salesOrderId, lineNumber++, item.itemId, item.itemCode, item.itemName, item.itemNameAr,
      item.quantity, item.unitPrice, item.discountPercent || 0, item.discountAmount || 0,
      item.taxRate || 0, item.taxAmount || 0, item.lineTotal, item.uomId || null
    ]);
  }

  return salesOrderId;
}

// ════════════════════════════════════════════════════════════════════════════
// Confirm Order (after payment or for COD)
// ════════════════════════════════════════════════════════════════════════════

export async function confirmOrder(storeOrderId: number): Promise<void> {
  await pool.query(`
    UPDATE store_orders SET status = 'confirmed', updated_at = NOW()
    WHERE id = $1
  `, [storeOrderId]);
}

// ════════════════════════════════════════════════════════════════════════════
// Handle Payment Webhook — FULL ACCOUNTING SYNC
// On success: Payment Voucher + Journal Entry + Inventory Deduction + Sales Invoice
// On failure: Release reserved inventory
// ════════════════════════════════════════════════════════════════════════════

export async function handlePaymentWebhook(
  gateway: string,
  gatewayTransactionId: string,
  status: 'success' | 'failed',
  amount: number,
  metadata: any
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '30s'");

    const orderId = metadata.storeOrderId;

    // Get order with items
    const orderResult = await client.query(
      'SELECT * FROM store_orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rows.length === 0) throw new Error('Order not found');
    const order = orderResult.rows[0];

    // Fetch ERP customer ID from store_customers (store_orders doesn't have this column)
    const erpCustResult = await client.query(
      'SELECT erp_customer_id FROM store_customers WHERE id = $1',
      [order.store_customer_id]
    );
    order.erp_customer_id = erpCustResult.rows[0]?.erp_customer_id || null;

    // Idempotency check — skip if already processed
    if (order.payment_status === 'paid' && status === 'success') {
      await client.query('COMMIT');
      return;
    }

    // Record transaction
    await client.query(`
      INSERT INTO store_payment_transactions (
        store_order_id, company_id, gateway, gateway_transaction_id,
        gateway_status, gateway_response, amount, currency_code, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7,
        (SELECT c.code FROM currencies c WHERE c.id = $8),
        $9
      )
    `, [orderId, order.company_id, gateway, gatewayTransactionId, status,
      JSON.stringify(metadata), amount, order.currency_id,
      status === 'success' ? 'captured' : 'failed']);

    const orderItems = await client.query(
      'SELECT * FROM store_order_items WHERE store_order_id = $1',
      [orderId]
    );

    if (status === 'success') {
      // ──────────────────────────────────────────────────────────────────
      // A) Update order status
      // ──────────────────────────────────────────────────────────────────
      await client.query(`
        UPDATE store_orders SET 
          payment_status = 'paid', payment_reference = $1, paid_at = NOW(), 
          status = 'confirmed', updated_at = NOW()
        WHERE id = $2
      `, [gatewayTransactionId, orderId]);

      // Update ERP Sales Order status
      if (order.sales_order_id) {
        await client.query(`
          UPDATE sales_orders SET status = 'CONFIRMED', invoice_status = 'INVOICED', updated_at = NOW()
          WHERE id = $1
        `, [order.sales_order_id]);
      }

      // ──────────────────────────────────────────────────────────────────
      // B) DEDUCT INVENTORY (move reserved → sold)
      // ──────────────────────────────────────────────────────────────────
      for (const item of orderItems.rows) {
        // Deduct from warehouse stock and release reservation
        await client.query(`
          UPDATE item_warehouse
          SET qty_on_hand = qty_on_hand - $1,
              qty_reserved = GREATEST(COALESCE(qty_reserved, 0) - $1, 0),
              updated_at = NOW()
          WHERE item_id = $2
          AND id = (
            SELECT id FROM item_warehouse
            WHERE item_id = $2 AND qty_on_hand >= $1
            ORDER BY qty_on_hand DESC LIMIT 1
            FOR UPDATE
          )
        `, [item.quantity, item.item_id]);

        // Record inventory movement for audit trail
        await client.query(`
          INSERT INTO inventory_movements (
            company_id, item_id, warehouse_id, txn_type,
            qty_delta, ref_type, ref_id, notes, occurred_at
          ) VALUES (
            $1, $2,
            (SELECT warehouse_id FROM item_warehouse WHERE item_id = $2 LIMIT 1),
            'sale_out', $3, 'store_order', $4,
            $5, NOW()
          )
        `, [order.company_id, item.item_id, -item.quantity, orderId,
          `E-commerce sale: Order ${order.order_number}`]);
      }

      // ──────────────────────────────────────────────────────────────────
      // C) CREATE PAYMENT VOUCHER (records money received)
      // ──────────────────────────────────────────────────────────────────
      const pvNumberResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM 4) AS INTEGER)), 0) + 1 as next_num
        FROM payment_vouchers WHERE company_id = $1 AND voucher_number LIKE 'PV-%'
      `, [order.company_id]);
      const pvNumber = `PV-${String(pvNumberResult.rows[0].next_num).padStart(6, '0')}`;

      // Determine payment method label based on gateway
      const gatewayMethodMap: Record<string, string> = {
        stripe: 'credit_card',
        paypal: 'paypal',
        mada: 'mada',
        cod: 'cash',
        bank_transfer: 'bank_transfer',
      };
      const paymentMethod = gatewayMethodMap[gateway] || 'bank_transfer';

      // Always attempt to create payment voucher
      await client.query(`
        INSERT INTO payment_vouchers (
          company_id, voucher_number, voucher_date, method,
          amount, currency_id,
          reference, status, created_at
        ) VALUES (
          $1, $2, NOW(), $3,
          $4, $5,
          $6, 'posted', NOW()
        )
      `, [
        order.company_id, pvNumber, paymentMethod,
        parseFloat(order.total), order.currency_id,
        `Store Order: ${order.order_number}`,
      ]);

      // Lookup cash account from default_accounts table
      const cashAccountResult = await client.query(`
        SELECT da.account_id as id FROM default_accounts da
        WHERE da.company_id = $1 AND da.account_key = 'CASH' AND da.is_active = true
        LIMIT 1
      `, [order.company_id]);
      const cashAccountId = cashAccountResult.rows[0]?.id;

      // ──────────────────────────────────────────────────────────────────
      // D) CREATE JOURNAL ENTRY (double-entry accounting)
      //    Debit: Cash/Bank, Credit: Sales Revenue
      // ──────────────────────────────────────────────────────────────────
      const revenueAccountResult = await client.query(`
        SELECT da.account_id as id FROM default_accounts da
        WHERE da.company_id = $1 AND da.account_key = 'SALES' AND da.is_active = true
        LIMIT 1
      `, [order.company_id]);

      const revenueAccountId = revenueAccountResult.rows[0]?.id;

      if (cashAccountId && revenueAccountId) {
        const jeNumberResult = await client.query(`
          SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as next_num
          FROM journal_entries WHERE company_id = $1 AND entry_number LIKE 'JE-%'
        `, [order.company_id]);
        const jeNumber = `JE-${String(jeNumberResult.rows[0].next_num).padStart(6, '0')}`;

        const jeResult = await client.query(`
          INSERT INTO journal_entries (
            company_id, entry_number, entry_date, description,
            source_document_type, source_document_id, status, total_debit, total_credit,
            created_at
          ) VALUES (
            $1, $2, NOW(), $3,
            'store_order', $4, 'posted', $5, $5,
            NOW()
          ) RETURNING id
        `, [
          order.company_id, jeNumber,
          `E-commerce sale: ${order.order_number} via ${gateway}`,
          orderId, parseFloat(order.total),
        ]);

        const jeId = jeResult.rows[0].id;

        // Debit: Cash/Bank account
        await client.query(`
          INSERT INTO journal_lines (
            journal_entry_id, line_number, account_id, debit_amount, credit_amount, description
          ) VALUES ($1, 1, $2, $3, 0, $4)
        `, [jeId, cashAccountId, parseFloat(order.total),
          `Payment received: ${order.order_number}`]);

        // Credit: Revenue account
        await client.query(`
          INSERT INTO journal_lines (
            journal_entry_id, line_number, account_id, debit_amount, credit_amount, description
          ) VALUES ($1, 2, $2, 0, $3, $4)
        `, [jeId, revenueAccountId, parseFloat(order.total),
          `Sales revenue: ${order.order_number}`]);
      }

      // ──────────────────────────────────────────────────────────────────
      // E) CREATE SALES INVOICE (auto-posted)
      // ──────────────────────────────────────────────────────────────────
      await createSalesInvoice(client, order, orderItems.rows);

      // ──────────────────────────────────────────────────────────────────
      // F) SEND PAYMENT CONFIRMATION EMAIL (non-blocking)
      // ──────────────────────────────────────────────────────────────────
      try {
        const customer = await client.query(
          'SELECT first_name, last_name, email FROM store_customers WHERE id = $1',
          [order.store_customer_id]
        );
        const storeName = await client.query('SELECT name FROM stores WHERE id = $1', [order.store_id]);
        if (customer.rows[0]?.email) {
          sendPaymentReceivedEmail({
            customerEmail: customer.rows[0].email,
            customerName: `${customer.rows[0].first_name} ${customer.rows[0].last_name || ''}`.trim(),
            orderNumber: order.order_number,
            amount: parseFloat(order.total),
            currencyCode: 'SAR',
            gateway,
            storeName: storeName.rows[0]?.name || 'Store',
          }).catch(err => console.error('Payment email failed:', err.message));
        }
      } catch (emailErr) {
        console.error('Payment email error:', emailErr);
      }

    } else {
      // ──────────────────────────────────────────────────────────────────
      // PAYMENT FAILED — Release reserved inventory
      // ──────────────────────────────────────────────────────────────────
      await client.query(`
        UPDATE store_orders SET payment_status = 'failed', updated_at = NOW()
        WHERE id = $1
      `, [orderId]);

      for (const item of orderItems.rows) {
        await client.query(`
          UPDATE item_warehouse
          SET qty_reserved = GREATEST(COALESCE(qty_reserved, 0) - $1, 0),
              updated_at = NOW()
          WHERE item_id = $2
          AND id = (
            SELECT id FROM item_warehouse
            WHERE item_id = $2
            ORDER BY qty_reserved DESC LIMIT 1
          )
        `, [item.quantity, item.item_id]);
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

// ════════════════════════════════════════════════════════════════════════════
// Create Sales Invoice (auto-posted on payment success)
// ════════════════════════════════════════════════════════════════════════════

async function createSalesInvoice(client: any, order: any, items: any[]): Promise<number> {
  const invNumberResult = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1 as next_num
    FROM sales_invoices WHERE company_id = $1 AND invoice_number LIKE 'INV-%'
  `, [order.company_id]);
  const invNumber = `INV-${String(invNumberResult.rows[0].next_num).padStart(6, '0')}`;

  const invResult = await client.query(`
    INSERT INTO sales_invoices (
      company_id, invoice_number, invoice_date, due_date,
      customer_id, sales_order_id,
      subtotal, discount_amount, tax_amount, total_amount,
      currency_id, status, created_at
    ) VALUES (
      $1, $2, NOW(), NOW() + INTERVAL '30 days',
      $3, $4,
      $5, $6, $7, $8,
      $9, 'posted', NOW()
    ) RETURNING id
  `, [
    order.company_id, invNumber,
    order.erp_customer_id || null, order.sales_order_id,
    parseFloat(order.subtotal), parseFloat(order.discount_amount),
    parseFloat(order.tax_amount), parseFloat(order.total),
    order.currency_id,
  ]);

  const invoiceId = invResult.rows[0].id;

  for (const item of items) {
    await client.query(`
      INSERT INTO sales_invoice_items (
        invoice_id, item_id, item_code, item_name,
        quantity, unit_price, discount_amount, tax_amount, line_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      invoiceId, item.item_id, item.item_code, item.item_name,
      item.quantity, parseFloat(item.unit_price),
      parseFloat(item.discount_amount), parseFloat(item.tax_amount),
      parseFloat(item.line_total),
    ]);
  }

  // Link invoice to store order
  await client.query(
    'UPDATE store_orders SET sales_invoice_id = $1 WHERE id = $2',
    [invoiceId, order.id]
  );

  return invoiceId;
}

// ════════════════════════════════════════════════════════════════════════════
// Get Store Orders (customer's order history)
// ════════════════════════════════════════════════════════════════════════════

export async function getCustomerOrders(
  storeCustomerId: number,
  page: number = 1,
  limit: number = 10
): Promise<{ data: any[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM store_orders WHERE store_customer_id = $1 AND deleted_at IS NULL',
    [storeCustomerId]
  );

  const result = await pool.query(`
    SELECT so.*, 
      cur.code as currency_code, cur.symbol as currency_symbol,
      (SELECT COUNT(*) FROM store_order_items soi WHERE soi.store_order_id = so.id) as item_count
    FROM store_orders so
    LEFT JOIN currencies cur ON so.currency_id = cur.id
    WHERE so.store_customer_id = $1 AND so.deleted_at IS NULL
    ORDER BY so.created_at DESC
    LIMIT $2 OFFSET $3
  `, [storeCustomerId, limit, offset]);

  return {
    data: result.rows.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      paymentStatus: o.payment_status,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discount_amount),
      taxAmount: parseFloat(o.tax_amount),
      shippingAmount: parseFloat(o.shipping_amount),
      total: parseFloat(o.total),
      currencyCode: o.currency_code,
      currencySymbol: o.currency_symbol,
      itemCount: parseInt(o.item_count),
      trackingNumber: o.tracking_number,
      estimatedDeliveryDate: o.estimated_delivery_date,
      createdAt: o.created_at,
    })),
    total: parseInt(countResult.rows[0].count),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Release expired reservations (run via cron every 15 minutes)
// ════════════════════════════════════════════════════════════════════════════

export async function releaseExpiredReservations(expiryMinutes: number = 30): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find orders that are still unpaid past the reservation window
    const expired = await client.query(`
      SELECT so.id, soi.item_id, soi.quantity
      FROM store_orders so
      JOIN store_order_items soi ON soi.store_order_id = so.id
      WHERE so.payment_status IN ('unpaid', 'failed')
        AND so.status = 'pending'
        AND so.created_at < NOW() - ($1 || ' minutes')::INTERVAL
        AND so.deleted_at IS NULL
    `, [expiryMinutes]);

    for (const row of expired.rows) {
      await client.query(`
        UPDATE item_warehouse
        SET qty_reserved = GREATEST(COALESCE(qty_reserved, 0) - $1, 0),
            updated_at = NOW()
        WHERE item_id = $2
        AND id = (
          SELECT id FROM item_warehouse WHERE item_id = $2
          ORDER BY qty_reserved DESC LIMIT 1
        )
      `, [row.quantity, row.item_id]);
    }

    // Cancel the expired orders
    const cancelledOrders = await client.query(`
      UPDATE store_orders
      SET status = 'cancelled', payment_status = 'expired', updated_at = NOW()
      WHERE payment_status IN ('unpaid', 'failed')
        AND status = 'pending'
        AND created_at < NOW() - ($1 || ' minutes')::INTERVAL
        AND deleted_at IS NULL
      RETURNING id
    `, [expiryMinutes]);

    await client.query('COMMIT');
    return cancelledOrders.rowCount || 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  processCheckout,
  confirmOrder,
  handlePaymentWebhook,
  getCustomerOrders,
  releaseExpiredReservations,
};
