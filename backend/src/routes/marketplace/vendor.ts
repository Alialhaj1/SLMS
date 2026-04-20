/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  VENDOR DASHBOARD ROUTES                                                 ║
 * ║  /api/marketplace/vendor/*                                              ║
 * ║  ERP-authenticated routes for vendor self-service                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import * as vendorService from '../../services/marketplaceVendorService';
import * as listingService from '../../services/marketplaceListingService';
import * as orderService from '../../services/marketplaceOrderService';
import * as walletService from '../../services/vendorWalletService';

const router = Router();

// All vendor routes require ERP authentication
router.use(authenticate);

// ════════════════════════════════════════════════════════════════════════════
// Vendor context middleware — resolves vendor from user's company
// ════════════════════════════════════════════════════════════════════════════

async function resolveVendorContext(req: Request, res: Response, next: Function) {
  try {
    const user = (req as any).user;
    if (!user?.company_id) {
      return res.status(403).json({ error: 'No company context' });
    }
    const vendor = await vendorService.getVendorByCompanyId(user.company_id);
    if (!vendor) {
      return res.status(403).json({ error: 'Not a marketplace vendor' });
    }
    if (vendor.status !== 'active') {
      return res.status(403).json({ error: `Vendor account is ${vendor.status}` });
    }
    (req as any).vendor = vendor;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

router.use(resolveVendorContext);

// ════════════════════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════════════════════

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorById((req as any).vendor.id);
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.updateVendorProfile((req as any).vendor.id, req.body);
    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await vendorService.getVendorStats((req as any).vendor.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LISTINGS
// ════════════════════════════════════════════════════════════════════════════

router.get('/listings', async (req: Request, res: Response) => {
  try {
    const result = await listingService.searchListings({
      vendorId: (req as any).vendor.id,
      search: req.query.search as string,
      status: req.query.status as string,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/listings', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.createListing({
      ...req.body,
      vendorId: (req as any).vendor.id,
    });
    res.status(201).json(listing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(parseInt(req.params.id, 10));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.vendor_id !== (req as any).vendor.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(listing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(parseInt(req.params.id, 10));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.vendor_id !== (req as any).vendor.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await listingService.updateListing(
      parseInt(req.params.id, 10),
      (req as any).vendor.id,
      req.body
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/listings/:id/publish', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(parseInt(req.params.id, 10));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.vendor_id !== (req as any).vendor.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const published = req.body.published !== false;
    const updated = await listingService.toggleListingPublish(parseInt(req.params.id, 10), (req as any).vendor.id, published);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(parseInt(req.params.id, 10));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.vendor_id !== (req as any).vendor.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await listingService.deleteListing(parseInt(req.params.id, 10), (req as any).vendor.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const result = await orderService.listVendorOrders(
      (req as any).vendor.id,
      {
        status: req.query.status as string,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 20,
      }
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, trackingNumber, shippingProvider, vendorNotes, cancelReason } = req.body;
    const updated = await orderService.updateVendorOrderStatus(
      parseInt(req.params.id, 10),
      (req as any).vendor.id,
      status,
      { trackingNumber, shippingProvider, vendorNotes, cancelReason }
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// WALLET & PAYOUTS
// ════════════════════════════════════════════════════════════════════════════

router.get('/wallet', async (req: Request, res: Response) => {
  try {
    const wallet = await walletService.getWalletSummary((req as any).vendor.id);
    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const result = await walletService.getTransactions({
      vendorId: (req as any).vendor.id,
      type: req.query.type as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payouts', async (req: Request, res: Response) => {
  try {
    const result = await walletService.listPayouts(
      (req as any).vendor.id,
      req.query.status as string,
      parseInt(req.query.page as string, 10) || 1,
      parseInt(req.query.limit as string, 10) || 20
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payouts', async (req: Request, res: Response) => {
  try {
    const amount = req.body.amount ? parseFloat(req.body.amount) : undefined;
    const payout = await walletService.requestPayout((req as any).vendor.id, amount);
    res.status(201).json(payout);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
