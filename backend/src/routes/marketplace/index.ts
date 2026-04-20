/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE ROUTER — Main Entry Point                                   ║
 * ║  /api/marketplace/*                                                     ║
 * ║  Combines admin, vendor dashboard, and public storefront routes         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router } from 'express';
import adminRouter from './admin';
import vendorRouter from './vendor';
import storefrontRouter from './storefront';
import {
  storeBrowseRateLimiter,
  storeCheckoutRateLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

// Admin — ERP authenticated with marketplace permissions
router.use('/admin', adminRouter);

// Vendor Dashboard — ERP authenticated, scoped to vendor's company
router.use('/vendor', vendorRouter);

// Storefront — Public browsing + authenticated checkout
router.use('/storefront', storeBrowseRateLimiter, storefrontRouter);

export default router;
