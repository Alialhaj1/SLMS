/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE ADMIN ROUTES                                                ║
 * ║  /api/marketplace/admin/*                                               ║
 * ║  ERP-authenticated routes for marketplace administration                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import * as vendorService from '../../services/marketplaceVendorService';
import * as listingService from '../../services/marketplaceListingService';
import * as orderService from '../../services/marketplaceOrderService';
import * as walletService from '../../services/vendorWalletService';
import pool from '../../db';

const router = Router();

// All admin routes require ERP authentication
router.use(authenticate);

// ════════════════════════════════════════════════════════════════════════════
// PLATFORM CONFIG
// ════════════════════════════════════════════════════════════════════════════

router.get('/config', requirePermission('marketplace:view'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM marketplace_config WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/config', requirePermission('marketplace:manage'), async (req: Request, res: Response) => {
  try {
    const {
      platformName, platformNameAr, defaultCommissionRate,
      settlementHoldDays, settlementMinAmount, autoApproveVendors,
      autoApproveListings, vendorRegistrationEnabled,
    } = req.body;

    const result = await pool.query(`
      UPDATE marketplace_config SET
        platform_name = COALESCE($1, platform_name),
        platform_name_ar = COALESCE($2, platform_name_ar),
        default_commission_rate = COALESCE($3, default_commission_rate),
        settlement_hold_days = COALESCE($4, settlement_hold_days),
        settlement_min_amount = COALESCE($5, settlement_min_amount),
        auto_approve_vendors = COALESCE($6, auto_approve_vendors),
        auto_approve_listings = COALESCE($7, auto_approve_listings),
        vendor_registration_enabled = COALESCE($8, vendor_registration_enabled),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [
      platformName, platformNameAr, defaultCommissionRate,
      settlementHoldDays, settlementMinAmount, autoApproveVendors,
      autoApproveListings, vendorRegistrationEnabled,
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// VENDOR MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

router.get('/vendors', requirePermission('marketplace_vendors:view'), async (req: Request, res: Response) => {
  try {
    const { status, search, featured, verified, sort, page, limit } = req.query;
    const result = await vendorService.listVendors({
      status: status as string,
      search: search as string,
      isFeatured: featured === 'true',
      isVerified: verified === 'true',
      sortBy: sort as any,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendors/:id', requirePermission('marketplace_vendors:view'), async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorById(parseInt(req.params.id, 10));
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/vendors', requirePermission('marketplace_vendors:create'), async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/vendors/:id/status', requirePermission('marketplace_vendors:edit'), async (req: Request, res: Response) => {
  try {
    const { status, reason } = req.body;
    const vendor = await vendorService.updateVendorStatus(
      parseInt(req.params.id, 10),
      status,
      (req as any).user.id,
      reason
    );
    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/vendors/:id/stats', requirePermission('marketplace_vendors:view'), async (req: Request, res: Response) => {
  try {
    const stats = await vendorService.getVendorStats(parseInt(req.params.id, 10));
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LISTING MODERATION
// ════════════════════════════════════════════════════════════════════════════

router.get('/listings', requirePermission('marketplace_listings:view'), async (req: Request, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
      vendorId: req.query.vendorId ? parseInt(req.query.vendorId as string, 10) : undefined,
      status: req.query.status as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await listingService.searchListings(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/listings/:id', requirePermission('marketplace_listings:view'), async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(parseInt(req.params.id, 10));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/listings/:id/moderate', requirePermission('marketplace_listings:edit'), async (req: Request, res: Response) => {
  try {
    const { action, reason } = req.body;
    const listing = await listingService.moderateListing(
      parseInt(req.params.id, 10),
      action,
      (req as any).user.id,
      reason
    );
    res.json(listing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════════════════

router.get('/categories', requirePermission('marketplace_categories:view'), async (req: Request, res: Response) => {
  try {
    const categories = await listingService.listCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', requirePermission('marketplace_categories:create'), async (req: Request, res: Response) => {
  try {
    const category = await listingService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

router.get('/orders', requirePermission('marketplace_orders:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (req.query.status) {
      conditions.push(`mo.status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.vendorId) {
      conditions.push(`EXISTS (SELECT 1 FROM marketplace_order_vendors mov2 WHERE mov2.marketplace_order_id = mo.id AND mov2.vendor_id = $${idx++})`);
      params.push(parseInt(req.query.vendorId as string, 10));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM marketplace_orders mo ${where}`, params);

    const result = await pool.query(`
      SELECT mo.*, mo.total as total_amount,
        sc.first_name || ' ' || COALESCE(sc.last_name, '') as customer_name,
        sc.email as customer_email,
        (SELECT COUNT(*) FROM marketplace_order_vendors mov3 WHERE mov3.marketplace_order_id = mo.id) as vendor_count,
        (SELECT json_agg(json_build_object('id', mov4.id, 'vendor_id', mov4.vendor_id, 'vendor_name', mv.vendor_name, 'status', mov4.status, 'subtotal', mov4.subtotal))
         FROM marketplace_order_vendors mov4
         JOIN marketplace_vendors mv ON mv.id = mov4.vendor_id
         WHERE mov4.marketplace_order_id = mo.id) as sub_orders
      FROM marketplace_orders mo
      LEFT JOIN store_customers sc ON sc.id = mo.store_customer_id
      ${where}
      ORDER BY mo.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]);

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', requirePermission('marketplace_orders:view'), async (req: Request, res: Response) => {
  try {
    const order = await orderService.getMarketplaceOrder(parseInt(req.params.id, 10));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYOUTS
// ════════════════════════════════════════════════════════════════════════════

router.get('/payouts', requirePermission('marketplace_payouts:view'), async (req: Request, res: Response) => {
  try {
    const vendorId = req.query.vendorId ? parseInt(req.query.vendorId as string, 10) : undefined;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await walletService.listPayouts(vendorId, status, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/payouts/:id/process', requirePermission('marketplace_payouts:edit'), async (req: Request, res: Response) => {
  try {
    const { paymentReference } = req.body;
    if (!paymentReference) return res.status(400).json({ error: 'Payment reference required' });
    const payout = await walletService.processPayout(
      parseInt(req.params.id, 10),
      (req as any).user.id,
      paymentReference
    );
    res.json(payout);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SETTLEMENT PROCESSING (cron trigger)
// ════════════════════════════════════════════════════════════════════════════

router.post('/settlements/process', requirePermission('marketplace:manage'), async (req: Request, res: Response) => {
  try {
    const processed = await walletService.processSettlementEligibility();
    res.json({ processed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS / DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', requirePermission('marketplace:view'), async (req: Request, res: Response) => {
  try {
    const [vendors, listings, orders, revenue] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM marketplace_vendors`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review
       FROM marketplace_listings WHERE deleted_at IS NULL`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(platform_fee), 0) as total_commission
       FROM marketplace_orders WHERE created_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT
        COALESCE(SUM(amount), 0) as total_payouts,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_payouts
       FROM vendor_payouts`),
    ]);

    res.json({
      vendors: vendors.rows[0],
      listings: listings.rows[0],
      orders: orders.rows[0],
      payouts: revenue.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════════════════

router.get('/plans', requirePermission('marketplace:view'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM marketplace_plans WHERE is_active = true ORDER BY sort_order');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DISPUTES
// ════════════════════════════════════════════════════════════════════════════

router.get('/disputes', requirePermission('marketplace_disputes:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (req.query.status) {
      conditions.push(`md.status = $${idx++}`);
      params.push(req.query.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM marketplace_disputes md ${where}`, params);
    const result = await pool.query(`
      SELECT md.*, mv.vendor_name, mo.order_number
      FROM marketplace_disputes md
      LEFT JOIN marketplace_vendors mv ON mv.id = md.vendor_id
      LEFT JOIN marketplace_orders mo ON mo.id = md.marketplace_order_id
      ${where}
      ORDER BY md.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]);

    res.json({ disputes: result.rows, total: parseInt(countResult.rows[0].count, 10), page, limit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/disputes/:id/resolve', requirePermission('marketplace_disputes:edit'), async (req: Request, res: Response) => {
  try {
    const { resolution, resolutionNotes } = req.body;
    const result = await pool.query(`
      UPDATE marketplace_disputes
      SET status = 'resolved',
          resolution = $1,
          resolution_notes = $2,
          resolved_by = $3,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = $4 AND status IN ('open', 'under_review')
      RETURNING *
    `, [resolution, resolutionNotes, (req as any).user.id, parseInt(req.params.id, 10)]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Dispute not found or already resolved' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
