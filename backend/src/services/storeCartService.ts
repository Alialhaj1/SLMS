/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE CART SERVICE                                                       ║
 * ║  Shopping cart management — guest + authenticated, stock validation,     ║
 * ║  price calculation, coupon application, cart merge on login              ║
 * ║  Supports both single-store and marketplace (multi-vendor) items        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

interface AddToCartItemParams {
  itemId: number;
  variantId?: number | null;
  quantity: number;
  uomId?: number | null;
  listingId?: number | null;    // marketplace listing ID
  vendorId?: number | null;     // marketplace vendor ID
}

// ════════════════════════════════════════════════════════════════════════════
// Get or Create Cart
// ════════════════════════════════════════════════════════════════════════════

export async function getOrCreateCart(
  companyId: number,
  storeId: number,
  storeCustomerId: number | null,
  sessionId: string | null
): Promise<any> {
  // Try to find existing active cart
  let cart;
  if (storeCustomerId) {
    const result = await pool.query(`
      SELECT * FROM carts 
      WHERE store_id = $1 AND store_customer_id = $2 AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `, [storeId, storeCustomerId]);
    cart = result.rows[0];
  } else if (sessionId) {
    const result = await pool.query(`
      SELECT * FROM carts 
      WHERE store_id = $1 AND session_id = $2 AND status = 'active' AND store_customer_id IS NULL
      ORDER BY updated_at DESC LIMIT 1
    `, [storeId, sessionId]);
    cart = result.rows[0];
  }

  if (cart) return cart;

  // Create new cart
  const result = await pool.query(`
    INSERT INTO carts (store_id, company_id, store_customer_id, session_id, currency_id)
    SELECT $1, $2, $3, $4, s.default_currency_id
    FROM stores s WHERE s.id = $1
    RETURNING *
  `, [storeId, companyId, storeCustomerId || null, sessionId || null]);

  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Get Cart with Items (includes marketplace vendor info when available)
// ════════════════════════════════════════════════════════════════════════════

export async function getCartWithItems(companyId: number, cartId: number): Promise<any> {
  const cartResult = await pool.query(`
    SELECT c.*, cur.code as currency_code, cur.symbol as currency_symbol,
      co.code as coupon_code, co.discount_type as coupon_type, co.discount_value as coupon_value
    FROM carts c
    LEFT JOIN currencies cur ON c.currency_id = cur.id
    LEFT JOIN coupons co ON c.coupon_id = co.id
    WHERE c.id = $1
  `, [cartId]);

  if (cartResult.rows.length === 0) return null;

  const cart = cartResult.rows[0];

  const itemsResult = await pool.query(`
    SELECT ci.*,
      i.name as item_name, i.name_ar as item_name_ar,
      i.code as item_code, i.barcode,
      iv.variant_name as variant_name,
      u.name as uom_name, u.name_ar as uom_name_ar,
      COALESCE(
        (SELECT pi.url FROM product_images pi WHERE pi.item_id = ci.item_id AND pi.is_primary = true LIMIT 1),
        (SELECT pi.url FROM product_images pi WHERE pi.item_id = ci.item_id ORDER BY pi.sort_order LIMIT 1)
      ) as image_url,
      COALESCE(
        (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = ci.item_id),
        0
      ) as available_stock,
      -- Marketplace vendor info (when item was added from marketplace)
      mv.id as vendor_id_resolved,
      mv.vendor_name, mv.vendor_name_ar, mv.slug as vendor_slug,
      ml.listing_title, ml.listing_title_ar, ml.price as listing_price
    FROM cart_items ci
    JOIN items i ON ci.item_id = i.id
    LEFT JOIN item_variants iv ON ci.variant_id = iv.id
    LEFT JOIN units u ON ci.uom_id = u.id
    LEFT JOIN marketplace_listings ml ON ci.listing_id = ml.id
    LEFT JOIN marketplace_vendors mv ON ci.vendor_id = mv.id
    WHERE ci.cart_id = $1
    ORDER BY ci.created_at ASC
  `, [cartId]);

  // Group items by vendor for multi-vendor display
  const hasMarketplaceItems = itemsResult.rows.some(r => r.vendor_id != null);

  return {
    id: cart.id,
    status: cart.status,
    subtotal: parseFloat(cart.subtotal) || 0,
    discountAmount: parseFloat(cart.discount_amount) || 0,
    taxAmount: parseFloat(cart.tax_amount) || 0,
    shippingAmount: parseFloat(cart.shipping_amount) || 0,
    total: parseFloat(cart.total) || 0,
    currencyCode: cart.currency_code,
    currencySymbol: cart.currency_symbol,
    coupon: cart.coupon_id ? {
      code: cart.coupon_code,
      type: cart.coupon_type,
      value: parseFloat(cart.coupon_value),
    } : null,
    hasMarketplaceItems,
    itemCount: itemsResult.rows.length,
    items: itemsResult.rows.map((item) => ({
      id: item.id,
      itemId: item.item_id,
      variantId: item.variant_id,
      listingId: item.listing_id || null,
      vendorId: item.vendor_id || null,
      itemCode: item.item_code,
      itemName: item.item_name,
      itemNameAr: item.item_name_ar,
      variantName: item.variant_name,
      quantity: parseFloat(item.quantity),
      uomName: item.uom_name,
      uomNameAr: item.uom_name_ar,
      unitPrice: parseFloat(item.unit_price),
      discountPercent: parseFloat(item.discount_percent) || 0,
      discountAmount: parseFloat(item.discount_amount) || 0,
      taxRate: parseFloat(item.tax_rate) || 0,
      taxAmount: parseFloat(item.tax_amount) || 0,
      lineTotal: parseFloat(item.line_total),
      imageUrl: item.image_url,
      availableStock: parseFloat(item.available_stock),
      inStock: parseFloat(item.available_stock) >= parseFloat(item.quantity),
      // Marketplace vendor info
      vendor: item.vendor_id ? {
        id: item.vendor_id_resolved,
        name: item.vendor_name,
        nameAr: item.vendor_name_ar,
        slug: item.vendor_slug,
      } : null,
      listingTitle: item.listing_title || null,
      listingTitleAr: item.listing_title_ar || null,
    })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Add Item to Cart (supports both store items and marketplace listings)
// ════════════════════════════════════════════════════════════════════════════

export async function addToCart(
  companyId: number,
  cartId: number,
  params: AddToCartItemParams
): Promise<void> {
  const { itemId, variantId, quantity, uomId, listingId, vendorId } = params;

  let unitPrice: number;
  let availableStock: number;
  let effectiveUomId: number | null = uomId || null;
  let effectiveVendorId: number | null = vendorId || null;
  let effectiveListingId: number | null = listingId || null;

  if (listingId) {
    // ── Marketplace listing: validate from marketplace_listings ──
    const listingResult = await pool.query(`
      SELECT ml.id, ml.vendor_id, ml.item_id, ml.variant_id, ml.price,
        ml.stock_source, ml.warehouse_id, ml.manual_stock,
        ml.status, ml.is_published,
        mv.status as vendor_status,
        i.sales_uom_id, i.is_active,
        CASE 
          WHEN ml.stock_source = 'manual' THEN COALESCE(ml.manual_stock, 0)
          WHEN ml.stock_source = 'warehouse' AND ml.warehouse_id IS NOT NULL THEN
            COALESCE((SELECT iw.qty_on_hand FROM item_warehouse iw 
              WHERE iw.item_id = ml.item_id AND iw.warehouse_id = ml.warehouse_id), 0)
          ELSE COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = ml.item_id), 0)
        END as available_stock
      FROM marketplace_listings ml
      JOIN marketplace_vendors mv ON ml.vendor_id = mv.id
      JOIN items i ON ml.item_id = i.id
      WHERE ml.id = $1 AND ml.status = 'approved' AND ml.is_published = true
    `, [listingId]);

    if (listingResult.rows.length === 0) {
      throw new Error('Listing not found or not available');
    }

    const listing = listingResult.rows[0];
    if (listing.vendor_status !== 'active') {
      throw new Error('Vendor is not active');
    }

    unitPrice = parseFloat(listing.price);
    availableStock = parseFloat(listing.available_stock);
    effectiveUomId = effectiveUomId || listing.sales_uom_id;
    effectiveVendorId = listing.vendor_id;
    effectiveListingId = listing.id;

    if (availableStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableStock}`);
    }
  } else {
    // ── Standard store item: validate from items table ──
    const itemResult = await pool.query(`
      SELECT i.id, i.base_selling_price, i.sales_uom_id, i.is_sellable, i.is_active,
        COALESCE(
          (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = i.id),
          0
        ) as available_stock
      FROM items i
      WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL
    `, [itemId, companyId]);

    if (itemResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const item = itemResult.rows[0];
    if (!item.is_sellable || !item.is_active) {
      throw new Error('Product is not available for sale');
    }

    unitPrice = parseFloat(item.base_selling_price) || 0;
    availableStock = parseFloat(item.available_stock);
    effectiveUomId = effectiveUomId || item.sales_uom_id;

    if (availableStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableStock}`);
    }
  }

  const lineTotal = unitPrice * quantity;

  // Check if item already in cart (upsert) — match on item+variant+listing
  const existingItem = await pool.query(`
    SELECT id, quantity FROM cart_items
    WHERE cart_id = $1 AND item_id = $2 
      AND COALESCE(variant_id, 0) = COALESCE($3, 0)
      AND COALESCE(listing_id, 0) = COALESCE($4, 0)
  `, [cartId, itemId, variantId || null, effectiveListingId || null]);

  if (existingItem.rows.length > 0) {
    const newQty = parseFloat(existingItem.rows[0].quantity) + quantity;
    if (availableStock < newQty) {
      throw new Error(`Insufficient stock. Available: ${availableStock}`);
    }

    await pool.query(`
      UPDATE cart_items 
      SET quantity = $1, line_total = $2, unit_price = $3, updated_at = NOW()
      WHERE id = $4
    `, [newQty, unitPrice * newQty, unitPrice, existingItem.rows[0].id]);
  } else {
    await pool.query(`
      INSERT INTO cart_items (cart_id, item_id, variant_id, quantity, uom_id, 
        unit_price, line_total, vendor_id, listing_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [cartId, itemId, variantId || null, quantity, effectiveUomId,
        unitPrice, lineTotal, effectiveVendorId, effectiveListingId]);
  }

  // Recalculate cart totals
  await recalculateCart(cartId);
}

// ════════════════════════════════════════════════════════════════════════════
// Update Cart Item Quantity
// ════════════════════════════════════════════════════════════════════════════

export async function updateCartItem(
  companyId: number,
  cartItemId: number,
  quantity: number
): Promise<void> {
  // Get cart item with stock info (supports marketplace listings)
  const item = await pool.query(`
    SELECT ci.item_id, ci.cart_id, ci.listing_id,
      CASE 
        WHEN ci.listing_id IS NOT NULL THEN (
          SELECT CASE 
            WHEN ml.stock_source = 'manual' THEN COALESCE(ml.manual_stock, 0)
            ELSE COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = ci.item_id), 0)
          END
          FROM marketplace_listings ml WHERE ml.id = ci.listing_id
        )
        ELSE COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = ci.item_id), 0)
      END as available_stock
    FROM cart_items ci WHERE ci.id = $1
  `, [cartItemId]);

  if (item.rows.length === 0) throw new Error('Cart item not found');

  const cartId = item.rows[0].cart_id;

  if (quantity <= 0) {
    await pool.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
    await recalculateCart(cartId);
    return;
  }

  if (parseFloat(item.rows[0].available_stock) < quantity) {
    throw new Error(`Insufficient stock. Available: ${item.rows[0].available_stock}`);
  }

  await pool.query(`
    UPDATE cart_items 
    SET quantity = $1, line_total = unit_price * $1, updated_at = NOW()
    WHERE id = $2
  `, [quantity, cartItemId]);

  await recalculateCart(cartId);
}

// ════════════════════════════════════════════════════════════════════════════
// Remove Cart Item
// ════════════════════════════════════════════════════════════════════════════

export async function removeCartItem(companyId: number, cartItemId: number): Promise<void> {
  const item = await pool.query('SELECT cart_id FROM cart_items WHERE id = $1', [cartItemId]);
  if (item.rows.length === 0) return;
  const cartId = item.rows[0].cart_id;
  await pool.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
  await recalculateCart(cartId);
}

// ════════════════════════════════════════════════════════════════════════════
// Apply Coupon
// ════════════════════════════════════════════════════════════════════════════

export async function applyCoupon(
  companyId: number,
  cartId: number,
  couponCode: string,
  storeCustomerId?: number | null
): Promise<void> {
  // Get cart to check store_id and subtotal
  const cartResult = await pool.query(
    'SELECT id, store_id, subtotal FROM carts WHERE id = $1', [cartId]
  );
  if (cartResult.rows.length === 0) throw new Error('Cart not found');
  const cart = cartResult.rows[0];

  // Validate coupon — supports scoped coupons (store/vendor/platform)
  const coupon = await pool.query(`
    SELECT * FROM coupons 
    WHERE code = $1 
      AND is_active = true 
      AND deleted_at IS NULL
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR times_used < usage_limit)
      AND (
        (store_id = $2)
        OR (COALESCE(coupon_scope, 'store') = 'platform')
      )
  `, [couponCode.toUpperCase(), cart.store_id]);

  if (coupon.rows.length === 0) {
    throw new Error('Invalid or expired coupon code');
  }

  const c = coupon.rows[0];

  // Check per-customer limit
  if (storeCustomerId && c.usage_per_customer) {
    const usageResult = await pool.query(`
      SELECT COUNT(*) as used 
      FROM coupon_usage 
      WHERE coupon_id = $1 AND store_customer_id = $2
    `, [c.id, storeCustomerId]);
    if (parseInt(usageResult.rows[0].used) >= c.usage_per_customer) {
      throw new Error('Coupon usage limit reached');
    }
  }

  // Check minimum order
  if (c.min_order_amount && parseFloat(cart.subtotal) < parseFloat(c.min_order_amount)) {
    throw new Error(`Minimum order amount: ${c.min_order_amount}`);
  }

  // Apply coupon to cart
  await pool.query(
    'UPDATE carts SET coupon_id = $1, updated_at = NOW() WHERE id = $2',
    [c.id, cartId]
  );

  await recalculateCart(cartId);
}

// ════════════════════════════════════════════════════════════════════════════
// Remove Coupon
// ════════════════════════════════════════════════════════════════════════════

export async function removeCoupon(companyId: number, cartId: number): Promise<void> {
  await pool.query(
    'UPDATE carts SET coupon_id = NULL, discount_amount = 0, updated_at = NOW() WHERE id = $1',
    [cartId]
  );
  await recalculateCart(cartId);
}

// ════════════════════════════════════════════════════════════════════════════
// Merge Guest Cart into Customer Cart (on login)
// ════════════════════════════════════════════════════════════════════════════

export async function mergeCarts(
  companyId: number,
  storeId: number,
  storeCustomerId: number,
  sessionId: string
): Promise<void> {
  // Find guest cart
  const guestCart = await pool.query(`
    SELECT id FROM carts 
    WHERE store_id = $1 AND session_id = $2 AND store_customer_id IS NULL AND status = 'active'
    LIMIT 1
  `, [storeId, sessionId]);

  if (guestCart.rows.length === 0) return;

  // Find or create customer cart
  const customerCart = await getOrCreateCart(companyId, storeId, storeCustomerId, null);

  // Move items from guest to customer cart (skip duplicates, preserve vendor/listing)
  await pool.query(`
    INSERT INTO cart_items (cart_id, item_id, variant_id, quantity, uom_id, 
      unit_price, line_total, vendor_id, listing_id)
    SELECT $1, gi.item_id, gi.variant_id, gi.quantity, gi.uom_id, 
      gi.unit_price, gi.line_total, gi.vendor_id, gi.listing_id
    FROM cart_items gi
    WHERE gi.cart_id = $2
    ON CONFLICT (cart_id, item_id, variant_id) DO UPDATE SET
      quantity = GREATEST(cart_items.quantity, EXCLUDED.quantity),
      line_total = cart_items.unit_price * GREATEST(cart_items.quantity, EXCLUDED.quantity),
      updated_at = NOW()
  `, [customerCart.id, guestCart.rows[0].id]);

  // Mark guest cart as converted
  await pool.query(
    "UPDATE carts SET status = 'converted', updated_at = NOW() WHERE id = $1",
    [guestCart.rows[0].id]
  );

  await recalculateCart(customerCart.id);
}

// ════════════════════════════════════════════════════════════════════════════
// Recalculate Cart Totals
// ════════════════════════════════════════════════════════════════════════════

async function recalculateCart(cartId: number): Promise<void> {
  // Sum items
  const totals = await pool.query(`
    SELECT 
      COALESCE(SUM(line_total), 0) as subtotal,
      COALESCE(SUM(tax_amount), 0) as tax_total
    FROM cart_items WHERE cart_id = $1
  `, [cartId]);

  const subtotal = parseFloat(totals.rows[0].subtotal);
  const taxAmount = parseFloat(totals.rows[0].tax_total);

  // Calculate discount from coupon
  const cart = await pool.query(`
    SELECT c.coupon_id, co.discount_type, co.discount_value, co.max_discount_amount
    FROM carts c
    LEFT JOIN coupons co ON c.coupon_id = co.id
    WHERE c.id = $1
  `, [cartId]);

  let discountAmount = 0;
  if (cart.rows[0].coupon_id) {
    const coupon = cart.rows[0];
    if (coupon.discount_type === 'percent') {
      discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100);
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = Math.min(parseFloat(coupon.discount_value), subtotal);
    }
  }

  const total = subtotal - discountAmount + taxAmount;

  await pool.query(`
    UPDATE carts SET 
      subtotal = $1, discount_amount = $2, tax_amount = $3, 
      total = $4, updated_at = NOW()
    WHERE id = $5
  `, [subtotal, discountAmount, taxAmount, Math.max(total, 0), cartId]);
}

export default {
  getOrCreateCart,
  getCartWithItems,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
  removeCoupon,
  mergeCarts,
};
