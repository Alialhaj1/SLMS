/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  E-COMMERCE ADMIN ROUTES                                                ║
 * ║  /api/ecommerce/*                                                      ║
 * ║  ERP-authenticated routes for managing the e-commerce store             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();

// All ecommerce admin routes require ERP authentication
router.use(authenticate);

// ════════════════════════════════════════════════════════════════════════════
// STORE SETTINGS
// ════════════════════════════════════════════════════════════════════════════

router.get('/settings', requirePermission('store:view'), async (req: Request, res: Response) => {
  try {
    const store = await pool.query(
      `SELECT id, company_id, store_name, store_name_ar,
              slug AS store_slug,
              logo_url AS store_logo_url,
              banner_url AS store_banner_url,
              support_email AS contact_email,
              support_phone AS contact_phone,
              timezone, meta_title, meta_description, social_links,
              is_active, is_published, default_language
       FROM stores WHERE deleted_at IS NULL ORDER BY id LIMIT 1`
    );
    if (!store.rows[0]) {
      return res.json({});
    }
    const storeId = store.rows[0].id;

    // Get key-value settings
    const settings = await pool.query(
      `SELECT setting_key, setting_value FROM store_settings WHERE store_id = $1`,
      [storeId]
    );

    // Merge store record with settings
    const result: any = { ...store.rows[0] };
    for (const s of settings.rows) {
      result[s.setting_key] = s.setting_value;
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', requirePermission('store:manage'), async (req: Request, res: Response) => {
  try {
    const {
      store_name, store_slug, store_description, store_logo_url, store_banner_url,
      currency, timezone, primary_color, secondary_color,
      contact_email, contact_phone, address,
      meta_title, meta_description,
      enable_reviews, enable_wishlist, enable_guest_checkout, enable_tax, tax_rate,
      min_order_amount, free_shipping_threshold,
      payment_methods, social_links,
      notify_order_confirmation, notify_shipping_update, notify_review_request, notify_low_stock,
    } = req.body;

    // Upsert the store record
    let storeResult = await pool.query(
      `SELECT id FROM stores WHERE deleted_at IS NULL ORDER BY id LIMIT 1`
    );

    if (!storeResult.rows[0]) {
      // Create store
      storeResult = await pool.query(
        `INSERT INTO stores (company_id, store_name, slug, support_email, support_phone, timezone, meta_title, meta_description, social_links, is_active)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
        [store_name || 'My Store', store_slug || 'my-store', contact_email, contact_phone, timezone, meta_title, meta_description, JSON.stringify(social_links || {})]
      );
    } else {
      await pool.query(
        `UPDATE stores SET
          store_name = COALESCE($1, store_name),
          slug = COALESCE($2, slug),
          support_email = COALESCE($3, support_email),
          support_phone = COALESCE($4, support_phone),
          timezone = COALESCE($5, timezone),
          meta_title = COALESCE($6, meta_title),
          meta_description = COALESCE($7, meta_description),
          social_links = COALESCE($8, social_links),
          logo_url = COALESCE($9, logo_url),
          banner_url = COALESCE($10, banner_url),
          updated_at = NOW()
        WHERE id = $11`,
        [store_name, store_slug, contact_email, contact_phone, timezone, meta_title, meta_description,
         social_links ? JSON.stringify(social_links) : null, store_logo_url, store_banner_url, storeResult.rows[0].id]
      );
    }

    const storeId = storeResult.rows[0].id;

    // Save key-value settings
    const kvSettings: Record<string, any> = {
      currency, primary_color, secondary_color, address, store_description,
      enable_reviews, enable_wishlist, enable_guest_checkout, enable_tax, tax_rate,
      min_order_amount, free_shipping_threshold, payment_methods,
      notify_order_confirmation, notify_shipping_update, notify_review_request, notify_low_stock,
    };

    for (const [key, value] of Object.entries(kvSettings)) {
      if (value !== undefined && value !== null) {
        await pool.query(
          `INSERT INTO store_settings (store_id, setting_key, setting_value, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (store_id, setting_key) DO UPDATE SET setting_value = $3, updated_at = NOW()`,
          [storeId, key, JSON.stringify(value)]
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS (store view of ERP items)
// ════════════════════════════════════════════════════════════════════════════

router.get('/products', requirePermission('store_products:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;

    let where = 'i.deleted_at IS NULL AND i.is_sellable = true';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (i.name ILIKE $${paramIdx} OR i.name_ar ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status === 'active') {
      where += ` AND i.is_active = true`;
    } else if (status === 'inactive') {
      where += ` AND i.is_active = false`;
    } else if (status === 'featured') {
      where += ` AND i.is_featured = true`;
    } else if (status === 'low_stock') {
      where += ` AND EXISTS (SELECT 1 FROM item_warehouse iw2 WHERE iw2.item_id = i.id HAVING SUM(iw2.qty_on_hand) > 0 AND SUM(iw2.qty_on_hand) < 10)`;
    }

    const countQ = await pool.query(`SELECT COUNT(*) FROM items i WHERE ${where}`, params);
    const total = parseInt(countQ.rows[0].count, 10);

    const dataQ = await pool.query(`
      SELECT i.id, i.code, i.barcode, i.name, i.name_ar, i.is_active,
             COALESCE(i.is_featured, false) as is_featured,
             i.item_type, i.track_inventory,
             ic.name as category_name,
             COALESCE(
               (SELECT url FROM product_images pi WHERE pi.item_id = i.id AND pi.is_primary = true LIMIT 1),
               i.image_url
             ) as image_url,
             COALESCE(
               (SELECT ip.price FROM item_prices ip
                JOIN price_lists pl ON pl.id = ip.price_list_id AND pl.is_default = true
                WHERE ip.item_id = i.id LIMIT 1),
               0
             ) as price,
             COALESCE(
               (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = i.id),
               0
             ) as stock_quantity,
             COALESCE(
               (SELECT AVG(sr.rating) FROM store_reviews sr WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
               0
             ) as avg_rating,
             COALESCE(
               (SELECT COUNT(*) FROM store_reviews sr WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
               0
             ) as review_count,
             COALESCE(
               (SELECT SUM(soi.quantity) FROM store_order_items soi
                JOIN store_orders so ON so.id = soi.store_order_id AND so.deleted_at IS NULL
                WHERE soi.item_id = i.id),
               0
             ) as total_sales
      FROM items i
      LEFT JOIN item_categories ic ON ic.id = i.category_id
      WHERE ${where}
      ORDER BY i.updated_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    res.json({
      data: dataQ.rows,
      pagination: { page, pageSize: limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', requirePermission('store_products:manage'), async (req: Request, res: Response) => {
  try {
    // Soft-delete (mark as not sellable in store context)
    await pool.query(
      `UPDATE items SET is_sellable = false, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDERS (store orders)
// ════════════════════════════════════════════════════════════════════════════

router.get('/orders', requirePermission('store_orders:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;

    let where = 'so.deleted_at IS NULL';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (so.order_number ILIKE $${paramIdx} OR sc.first_name ILIKE $${paramIdx} OR sc.email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status && status !== 'all') {
      where += ` AND so.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    const countQ = await pool.query(
      `SELECT COUNT(*) FROM store_orders so LEFT JOIN store_customers sc ON sc.id = so.store_customer_id WHERE ${where}`,
      params
    );
    const total = parseInt(countQ.rows[0].count, 10);

    const dataQ = await pool.query(`
      SELECT so.id, so.order_number, so.status, so.payment_status,
             so.subtotal, so.discount_amount, so.tax_amount, so.shipping_amount,
             so.total as total_amount,
             COALESCE(cur.code, 'SAR') as currency,
             so.payment_method, so.shipping_method, so.tracking_number,
             so.created_at, so.updated_at,
             sc.first_name || ' ' || COALESCE(sc.last_name, '') as customer_name,
             sc.email as customer_email,
             (SELECT COUNT(*) FROM store_order_items soi WHERE soi.store_order_id = so.id) as items_count
      FROM store_orders so
      LEFT JOIN store_customers sc ON sc.id = so.store_customer_id
      LEFT JOIN currencies cur ON cur.id = so.currency_id
      WHERE ${where}
      ORDER BY so.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    res.json({
      data: dataQ.rows,
      pagination: { page, pageSize: limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/orders/:id/status', requirePermission('store_orders:manage'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const extra: any = {};
    if (status === 'shipped') extra.shipped_at = new Date();
    if (status === 'delivered') extra.delivered_at = new Date();

    const setClauses = [`status = $1`, `updated_at = NOW()`];
    const params: any[] = [status];
    let paramIdx = 2;

    if (extra.shipped_at) {
      setClauses.push(`shipped_at = $${paramIdx}`);
      params.push(extra.shipped_at);
      paramIdx++;
    }
    if (extra.delivered_at) {
      setClauses.push(`delivered_at = $${paramIdx}`);
      params.push(extra.delivered_at);
      paramIdx++;
    }

    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE store_orders SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS (store customers)
// ════════════════════════════════════════════════════════════════════════════

router.get('/customers', requirePermission('store_customers:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const tier = req.query.tier as string;

    let where = 'sc.deleted_at IS NULL';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (sc.first_name ILIKE $${paramIdx} OR sc.last_name ILIKE $${paramIdx} OR sc.email ILIKE $${paramIdx} OR sc.phone ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // tier filter via preferences JSONB if stored
    if (tier && tier !== 'all') {
      where += ` AND sc.preferences->>'tier' = $${paramIdx}`;
      params.push(tier);
      paramIdx++;
    }

    const countQ = await pool.query(`SELECT COUNT(*) FROM store_customers sc WHERE ${where}`, params);
    const total = parseInt(countQ.rows[0].count, 10);

    const dataQ = await pool.query(`
      SELECT sc.id, sc.email, sc.first_name, sc.last_name, sc.phone,
             sc.avatar_url,
             sc.is_active, sc.email_verified as is_verified, sc.last_login_at, sc.created_at,
             sc.preferences,
             COALESCE(sc.preferences->>'tier', 'new') as loyalty_tier,
             (SELECT sca.city FROM store_customer_addresses sca WHERE sca.store_customer_id = sc.id AND sca.is_default_shipping = true LIMIT 1) as city,
             (SELECT sca.country_code FROM store_customer_addresses sca WHERE sca.store_customer_id = sc.id AND sca.is_default_shipping = true LIMIT 1) as country,
             (SELECT COUNT(*) FROM store_orders so WHERE so.store_customer_id = sc.id AND so.deleted_at IS NULL) as total_orders,
             (SELECT COALESCE(SUM(so.total), 0) FROM store_orders so WHERE so.store_customer_id = sc.id AND so.deleted_at IS NULL AND so.payment_status = 'paid') as total_spent,
             (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(so.total), 0) / COUNT(*), 2) ELSE 0 END FROM store_orders so WHERE so.store_customer_id = sc.id AND so.deleted_at IS NULL AND so.payment_status = 'paid') as avg_order_value,
             (SELECT COALESCE(cur.code, 'SAR') FROM store_orders so LEFT JOIN currencies cur ON cur.id = so.currency_id WHERE so.store_customer_id = sc.id AND so.deleted_at IS NULL LIMIT 1) as currency,
             (SELECT MAX(so.created_at) FROM store_orders so WHERE so.store_customer_id = sc.id AND so.deleted_at IS NULL) as last_order_date
      FROM store_customers sc
      WHERE ${where}
      ORDER BY sc.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    res.json({
      data: dataQ.rows,
      pagination: { page, pageSize: limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COUPONS
// ════════════════════════════════════════════════════════════════════════════

router.get('/coupons', requirePermission('store_coupons:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let where = 'c.deleted_at IS NULL';
    const params: any[] = [];
    let paramIdx = 1;

    if (status === 'active') {
      where += ` AND c.is_active = true AND (c.expires_at IS NULL OR c.expires_at > NOW())`;
    } else if (status === 'expired') {
      where += ` AND c.expires_at IS NOT NULL AND c.expires_at <= NOW()`;
    } else if (status === 'inactive') {
      where += ` AND c.is_active = false`;
    }

    const countQ = await pool.query(`SELECT COUNT(*) FROM coupons c WHERE ${where}`, params);
    const total = parseInt(countQ.rows[0].count, 10);

    const dataQ = await pool.query(`
      SELECT c.id, c.code, c.description as name, c.description_ar as name_ar,
             c.discount_type as type, c.discount_value as value,
             c.max_discount_amount as max_discount,
             c.min_order_amount, c.usage_limit, c.usage_per_customer as per_customer_limit,
             c.times_used as used_count, c.is_active,
             c.starts_at, c.expires_at, c.applies_to as applicable_to,
             c.created_at, c.updated_at,
             (SELECT COUNT(*) FROM coupon_usage cu WHERE cu.coupon_id = c.id) as times_redeemed
      FROM coupons c
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    res.json({
      data: dataQ.rows,
      pagination: { page, pageSize: limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/coupons', requirePermission('store_coupons:manage'), async (req: Request, res: Response) => {
  try {
    const {
      code, name, name_ar, type, value, min_order_amount, max_discount,
      usage_limit, per_customer_limit, starts_at, expires_at, applicable_to,
    } = req.body;

    if (!code || !type) {
      return res.status(400).json({ error: 'code and type are required' });
    }

    // Get store
    const store = await pool.query(`SELECT id, company_id FROM stores WHERE deleted_at IS NULL ORDER BY id LIMIT 1`);
    if (!store.rows[0]) {
      return res.status(400).json({ error: 'No store configured' });
    }

    const userId = (req as any).user?.id || (req as any).user?.sub;
    const result = await pool.query(`
      INSERT INTO coupons (
        store_id, company_id, code, description, description_ar,
        discount_type, discount_value, max_discount_amount,
        min_order_amount, usage_limit, usage_per_customer,
        starts_at, expires_at, applies_to, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15)
      RETURNING *
    `, [
      store.rows[0].id, store.rows[0].company_id,
      code.toUpperCase(), name, name_ar,
      type, value || 0, max_discount,
      min_order_amount || 0, usage_limit, per_customer_limit || 1,
      starts_at || new Date(), expires_at,
      applicable_to || 'all', userId,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.constraint === 'uq_coupons_code') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/coupons/:id', requirePermission('store_coupons:manage'), async (req: Request, res: Response) => {
  try {
    const {
      code, name, name_ar, type, value, min_order_amount, max_discount,
      usage_limit, per_customer_limit, starts_at, expires_at, applicable_to,
    } = req.body;

    const result = await pool.query(`
      UPDATE coupons SET
        code = COALESCE($1, code),
        description = COALESCE($2, description),
        description_ar = COALESCE($3, description_ar),
        discount_type = COALESCE($4, discount_type),
        discount_value = COALESCE($5, discount_value),
        max_discount_amount = $6,
        min_order_amount = COALESCE($7, min_order_amount),
        usage_limit = $8,
        usage_per_customer = COALESCE($9, usage_per_customer),
        starts_at = COALESCE($10, starts_at),
        expires_at = $11,
        applies_to = COALESCE($12, applies_to),
        updated_at = NOW()
      WHERE id = $13 AND deleted_at IS NULL
      RETURNING *
    `, [
      code?.toUpperCase(), name, name_ar,
      type, value, max_discount,
      min_order_amount, usage_limit, per_customer_limit,
      starts_at, expires_at,
      applicable_to, req.params.id,
    ]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.constraint === 'uq_coupons_code') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/coupons/:id', requirePermission('store_coupons:manage'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE coupons SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════════════════

router.get('/reviews', requirePermission('store_reviews:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const rating = req.query.rating as string;
    const search = req.query.search as string;

    let where = 'sr.deleted_at IS NULL';
    const params: any[] = [];
    let paramIdx = 1;

    if (status === 'approved') {
      where += ` AND sr.is_approved = true`;
    } else if (status === 'pending') {
      where += ` AND sr.is_approved IS NULL`;
    } else if (status === 'rejected') {
      where += ` AND sr.is_approved = false`;
    } else if (status === 'flagged') {
      where += ` AND sr.is_featured = true`;
    }

    if (rating) {
      where += ` AND sr.rating = $${paramIdx}`;
      params.push(parseInt(rating, 10));
      paramIdx++;
    }

    if (search) {
      where += ` AND (sr.title ILIKE $${paramIdx} OR sr.body ILIKE $${paramIdx} OR i.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countQ = await pool.query(
      `SELECT COUNT(*) FROM store_reviews sr LEFT JOIN items i ON i.id = sr.item_id WHERE ${where}`,
      params
    );
    const total = parseInt(countQ.rows[0].count, 10);

    const dataQ = await pool.query(`
      SELECT sr.id, sr.rating, sr.title, sr.body as comment, sr.is_approved,
             sr.is_verified_purchase, sr.helpful_count,
             sr.is_featured,
             sr.created_at, sr.updated_at,
             i.name as product_name, i.name_ar as product_name_ar,
             COALESCE(
               (SELECT pi2.url FROM product_images pi2 WHERE pi2.item_id = i.id AND pi2.is_primary = true LIMIT 1),
               i.image_url
             ) as product_image_url,
             sc.first_name || ' ' || COALESCE(sc.last_name, '') as customer_name,
             sc.email as customer_email
      FROM store_reviews sr
      LEFT JOIN items i ON i.id = sr.item_id
      LEFT JOIN store_customers sc ON sc.id = sr.store_customer_id
      WHERE ${where}
      ORDER BY sr.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    res.json({
      data: dataQ.rows,
      pagination: { page, pageSize: limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/reviews/:id/approve', requirePermission('store_reviews:manage'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE store_reviews SET is_approved = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/reviews/:id/reject', requirePermission('store_reviews:manage'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE store_reviews SET is_approved = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SHIPPING ZONES
// ════════════════════════════════════════════════════════════════════════════

router.get('/shipping-zones', requirePermission('store_shipping:view'), async (req: Request, res: Response) => {
  try {
    const zones = await pool.query(`
      SELECT sz.*,
             COALESCE(json_agg(
               json_build_object('id', sr.id, 'name', sr.name, 'name_ar', sr.name_ar,
                 'type', sr.rate_type, 'price', sr.flat_rate,
                 'estimated_days_min', sr.min_delivery_days, 'estimated_days_max', sr.max_delivery_days,
                 'is_active', sr.is_active)
             ) FILTER (WHERE sr.id IS NOT NULL), '[]') as rates
      FROM shipping_zones sz
      LEFT JOIN shipping_rates sr ON sr.shipping_zone_id = sz.id
      WHERE sz.deleted_at IS NULL
      GROUP BY sz.id
      ORDER BY sz.sort_order, sz.id
    `);
    res.json({ data: zones.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shipping-zones', requirePermission('store_shipping:manage'), async (req: Request, res: Response) => {
  try {
    const { name, name_ar, countries, is_active, rates } = req.body;

    const store = await pool.query(`SELECT id, company_id FROM stores WHERE deleted_at IS NULL ORDER BY id LIMIT 1`);
    if (!store.rows[0]) {
      return res.status(400).json({ error: 'No store configured' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const zone = await client.query(`
        INSERT INTO shipping_zones (store_id, company_id, name, name_ar, countries, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [store.rows[0].id, store.rows[0].company_id, name, name_ar, JSON.stringify(countries || []), is_active !== false]);

      if (rates && rates.length > 0) {
        for (const rate of rates) {
          await client.query(`
            INSERT INTO shipping_rates (shipping_zone_id, name, name_ar, rate_type, flat_rate, min_delivery_days, max_delivery_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [zone.rows[0].id, rate.name, rate.name_ar, rate.type || 'flat', rate.price, rate.estimated_days_min, rate.estimated_days_max]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json(zone.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/shipping-zones/:id', requirePermission('store_shipping:manage'), async (req: Request, res: Response) => {
  try {
    const { name, name_ar, countries, is_active, rates } = req.body;
    const zoneId = parseInt(req.params.id, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE shipping_zones SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          countries = COALESCE($3, countries),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
        WHERE id = $5
      `, [name, name_ar, countries ? JSON.stringify(countries) : null, is_active, zoneId]);

      // Replace rates if provided
      if (rates) {
        await client.query(`DELETE FROM shipping_rates WHERE shipping_zone_id = $1`, [zoneId]);
        for (const rate of rates) {
          await client.query(`
            INSERT INTO shipping_rates (shipping_zone_id, name, name_ar, rate_type, flat_rate, min_delivery_days, max_delivery_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [zoneId, rate.name, rate.name_ar, rate.type || 'flat', rate.price, rate.estimated_days_min, rate.estimated_days_max]);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shipping-zones/:id', requirePermission('store_shipping:manage'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE shipping_zones SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════

router.get('/analytics', requirePermission('store_analytics:view'), async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    let interval = '30 days';
    if (period === '7d') interval = '7 days';
    else if (period === '90d') interval = '90 days';
    else if (period === '1y') interval = '1 year';

    const since = `NOW() - INTERVAL '${interval}'`;

    const [revenueQ, ordersQ, customersQ, topProductsQ, recentOrdersQ] = await Promise.all([
      // Revenue
      pool.query(`
        SELECT 
          COALESCE(SUM(total), 0) as total,
          COALESCE(AVG(total), 0) as avg_order_value
        FROM store_orders
        WHERE deleted_at IS NULL AND payment_status = 'paid' AND created_at >= ${since}
      `),
      // Orders
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
        FROM store_orders
        WHERE deleted_at IS NULL AND created_at >= ${since}
      `),
      // Customers
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= ${since}) as new_customers
        FROM store_customers
        WHERE deleted_at IS NULL
      `),
      // Top products
      pool.query(`
        SELECT i.name, i.name_ar,
               SUM(soi.quantity) as sales,
               SUM(soi.line_total) as revenue
        FROM store_order_items soi
        JOIN store_orders so ON so.id = soi.store_order_id
        JOIN items i ON i.id = soi.item_id
        WHERE so.deleted_at IS NULL AND so.created_at >= ${since}
        GROUP BY i.id, i.name, i.name_ar
        ORDER BY revenue DESC
        LIMIT 10
      `),
      // Recent orders
      pool.query(`
        SELECT so.id, so.order_number,
               sc.first_name || ' ' || COALESCE(sc.last_name, '') as customer,
               so.total as amount, so.status, so.created_at as date
        FROM store_orders so
        LEFT JOIN store_customers sc ON sc.id = so.store_customer_id
        WHERE so.deleted_at IS NULL
        ORDER BY so.created_at DESC
        LIMIT 10
      `),
    ]);

    // Revenue over time for chart
    const revenueChartQ = await pool.query(`
      SELECT DATE(created_at) as date,
             COALESCE(SUM(total), 0) as revenue,
             COUNT(*) as orders
      FROM store_orders
      WHERE deleted_at IS NULL AND payment_status = 'paid' AND created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Page views
    const pageViewsQ = await pool.query(`
      SELECT COUNT(*) as total
      FROM store_analytics_events
      WHERE event_type = 'page_view' AND created_at >= ${since}
    `);

    const rev = revenueQ.rows[0];
    const ord = ordersQ.rows[0];
    const cust = customersQ.rows[0];
    const pv = pageViewsQ.rows[0];

    res.json({
      revenue: { total: parseFloat(rev.total), change: 0, data: revenueChartQ.rows },
      orders: { total: parseInt(ord.total, 10), change: 0, data: revenueChartQ.rows },
      customers: { total: parseInt(cust.total, 10), change: 0, newCustomers: parseInt(cust.new_customers, 10) },
      avgOrderValue: { total: parseFloat(rev.avg_order_value), change: 0 },
      conversionRate: { total: 0, change: 0 },
      pageViews: { total: parseInt(pv.total, 10), change: 0 },
      topProducts: topProductsQ.rows,
      topCategories: [],
      recentOrders: recentOrdersQ.rows,
      trafficSources: [],
      deviceBreakdown: [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
