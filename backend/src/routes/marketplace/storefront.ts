/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE STOREFRONT ROUTES                                           ║
 * ║  /api/marketplace/storefront/*                                          ║
 * ║  Public-facing routes for browsing + customer routes for checkout       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { storeCustomerAuth, requireStoreCustomer } from '../../middleware/storeAuth';
import * as listingService from '../../services/marketplaceListingService';
import * as vendorService from '../../services/marketplaceVendorService';
import * as orderService from '../../services/marketplaceOrderService';
import pool from '../../db';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC — Browse Listings (no auth required)
// ════════════════════════════════════════════════════════════════════════════

router.get('/listings', async (req: Request, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
      vendorId: req.query.vendorId ? parseInt(req.query.vendorId as string, 10) : undefined,
      status: 'approved', // Only show approved listings
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      sort: req.query.sort as string,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    };
    const result = await listingService.searchListings(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/listings/:slug', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingBySlug(req.params.slug);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC — Browse Vendors
// ════════════════════════════════════════════════════════════════════════════

router.get('/vendors', async (req: Request, res: Response) => {
  try {
    const result = await vendorService.listVendors({
      status: 'active', // Only show active vendors
      search: req.query.search as string,
      isFeatured: req.query.featured === 'true' || undefined,
      sortBy: req.query.sort as any,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendors/:slug', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorBySlug(req.params.slug);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendors/:slug/listings', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorBySlug(req.params.slug);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const result = await listingService.searchListings({
      vendorId: vendor.id,
      status: 'approved',
      search: req.query.search as string,
      sortBy: req.query.sort as any,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC — Categories
// ════════════════════════════════════════════════════════════════════════════

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await listingService.listCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED — Marketplace Checkout (requires store customer auth)
// ════════════════════════════════════════════════════════════════════════════

router.post('/checkout', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).storeCustomer;
    const { shippingAddressId, billingAddressId, paymentMethod, notes } = req.body;

    const result = await orderService.processMarketplaceCheckout({
      storeCustomerId: customer.sub,
      shippingAddressId,
      billingAddressId,
      paymentGateway: paymentMethod || 'cod',
      customerNotes: notes,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED — Customer Orders
// ════════════════════════════════════════════════════════════════════════════

router.get('/my/orders', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).storeCustomer;
    const result = await orderService.listCustomerOrders(
      customer.sub,
      parseInt(req.query.page as string, 10) || 1,
      parseInt(req.query.limit as string, 10) || 20
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/orders/:id', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const order = await orderService.getMarketplaceOrder(parseInt(req.params.id, 10));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const customer = (req as any).storeCustomer;
    if (order.store_customer_id !== customer.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED — Disputes
// ════════════════════════════════════════════════════════════════════════════

router.post('/my/disputes', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).storeCustomer;
    const { marketplaceOrderId, vendorId, reason, description } = req.body;

    // Verify customer owns the order
    const order = await orderService.getMarketplaceOrder(marketplaceOrderId);
    if (!order || order.store_customer_id !== customer.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find the vendor sub-order
    const subOrder = await pool.query(
      `SELECT id FROM marketplace_order_vendors WHERE marketplace_order_id = $1 AND vendor_id = $2 LIMIT 1`,
      [marketplaceOrderId, vendorId]
    );
    if (!subOrder.rows[0]) {
      return res.status(404).json({ error: 'Vendor sub-order not found' });
    }

    const result = await pool.query(`
      INSERT INTO marketplace_disputes (
        marketplace_order_id, order_vendor_id, opened_by,
        store_customer_id, vendor_id, reason, description
      ) VALUES ($1, $2, 'customer', $3, $4, $5, $6)
      RETURNING *
    `, [marketplaceOrderId, subOrder.rows[0].id, customer.sub, vendorId, reason, description]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
