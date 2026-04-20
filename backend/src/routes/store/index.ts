/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE API ROUTER — Main Entry Point                                     ║
 * ║  /api/store/:storeSlug/*                                                ║
 * ║  Combines all store sub-routes into a single router                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router } from 'express';
import productsRouter from './products';
import authRouter from './auth';
import cartRouter from './cart';
import checkoutRouter from './checkout';
import ordersRouter from './orders';
import wishlistRouter from './wishlist';
import reviewsRouter from './reviews';
import shippingRouter from './shipping';
import {
  storeBrowseRateLimiter,
  storeAuthRateLimiter,
  storeCheckoutRateLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

// All store routes are scoped under /:storeSlug
// Read endpoints — generous limits
router.use('/:storeSlug/products', storeBrowseRateLimiter, productsRouter);
router.use('/:storeSlug/shipping', storeBrowseRateLimiter, shippingRouter);
router.use('/:storeSlug/reviews', storeBrowseRateLimiter, reviewsRouter);

// Auth — strict brute-force protection
router.use('/:storeSlug/auth', storeAuthRateLimiter, authRouter);

// Cart & checkout — moderate limits
router.use('/:storeSlug/cart', storeCheckoutRateLimiter, cartRouter);
router.use('/:storeSlug/checkout', checkoutRouter); // Checkout has its own webhook bypass

// Authenticated endpoints — moderate limits
router.use('/:storeSlug/orders', storeCheckoutRateLimiter, ordersRouter);
router.use('/:storeSlug/wishlist', storeCheckoutRateLimiter, wishlistRouter);

export default router;
