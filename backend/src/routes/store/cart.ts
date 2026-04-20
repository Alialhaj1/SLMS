/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE CART ROUTES                                                       ║
 * ║  /api/store/:storeSlug/cart                                             ║
 * ║  Supports both guest and authenticated customers                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, storeCustomerAuth, requireStoreCustomer } from '../../middleware/storeAuth';
import storeCartService from '../../services/storeCartService';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);
router.use(storeCustomerAuth); // optional — guests get session-based carts

// ═══════════════════════════════════════════════════════════════════════════
// GET /cart — Get current cart
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const sessionId = req.headers['x-session-id'] as string;

    const customerId = customer?.sub || null;
    if (!customerId && !sessionId) {
      return res.json({ data: { items: [], subtotal: 0, total: 0 } });
    }

    const cart = await storeCartService.getOrCreateCart(store.companyId, store.id, customerId, sessionId);
    const fullCart = await storeCartService.getCartWithItems(store.companyId, cart.id);

    res.json({ data: fullCart });
  } catch (error: any) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /cart/items — Add item to cart
// ═══════════════════════════════════════════════════════════════════════════
router.post('/items', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const sessionId = req.headers['x-session-id'] as string;
    const { itemId, variantId, quantity, listingId, vendorId } = req.body;

    if (!itemId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Item ID and quantity are required' });
    }

    const customerId = customer?.sub || null;
    if (!customerId && !sessionId) {
      return res.status(400).json({ error: 'Session ID or authentication required' });
    }

    const cart = await storeCartService.getOrCreateCart(store.companyId, store.id, customerId, sessionId);
    await storeCartService.addToCart(store.companyId, cart.id, {
      itemId: parseInt(itemId),
      variantId: variantId ? parseInt(variantId) : null,
      quantity: parseInt(quantity),
      listingId: listingId ? parseInt(listingId) : null,
      vendorId: vendorId ? parseInt(vendorId) : null,
    });

    const fullCart = await storeCartService.getCartWithItems(store.companyId, cart.id);
    res.json({ data: fullCart });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('stock') || error.message?.includes('available')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /cart/items/:cartItemId — Update cart item quantity
// ═══════════════════════════════════════════════════════════════════════════
router.put('/items/:cartItemId', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const { quantity } = req.body;
    const cartItemId = parseInt(req.params.cartItemId);

    if (!quantity || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    await storeCartService.updateCartItem(store.companyId, cartItemId, parseInt(quantity));

    // Re-fetch full cart
    const cartResult = await pool.query(
      `SELECT cart_id FROM cart_items WHERE id = $1`, [cartItemId]
    );
    if (cartResult.rows.length > 0) {
      const fullCart = await storeCartService.getCartWithItems(store.companyId, cartResult.rows[0].cart_id);
      return res.json({ data: fullCart });
    }

    res.json({ message: 'Cart updated' });
  } catch (error: any) {
    if (error.message?.includes('stock') || error.message?.includes('available')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /cart/items/:cartItemId — Remove item from cart
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/items/:cartItemId', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const cartItemId = parseInt(req.params.cartItemId);

    await storeCartService.removeCartItem(store.companyId, cartItemId);
    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /cart/coupon — Apply coupon to cart
// ═══════════════════════════════════════════════════════════════════════════
router.post('/coupon', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const sessionId = req.headers['x-session-id'] as string;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const customerId = customer?.sub || null;
    const cart = await storeCartService.getOrCreateCart(store.companyId, store.id, customerId, sessionId);
    await storeCartService.applyCoupon(store.companyId, cart.id, code.toUpperCase().trim(), customerId);

    const fullCart = await storeCartService.getCartWithItems(store.companyId, cart.id);
    res.json({ data: fullCart });
  } catch (error: any) {
    if (error.message?.includes('coupon') || error.message?.includes('expired') || error.message?.includes('minimum')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /cart/coupon — Remove coupon from cart
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/coupon', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const sessionId = req.headers['x-session-id'] as string;

    const customerId = customer?.sub || null;
    const cart = await storeCartService.getOrCreateCart(store.companyId, store.id, customerId, sessionId);
    await storeCartService.removeCoupon(store.companyId, cart.id);

    const fullCart = await storeCartService.getCartWithItems(store.companyId, cart.id);
    res.json({ data: fullCart });
  } catch (error: any) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /cart/merge — Merge guest cart into customer cart (on login)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/merge', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required for cart merge' });
    }

    await storeCartService.mergeCarts(store.companyId, store.id, customer!.sub, sessionId);

    const cart = await storeCartService.getOrCreateCart(store.companyId, store.id, customer!.sub, null);
    const fullCart = await storeCartService.getCartWithItems(store.companyId, cart.id);
    res.json({ data: fullCart });
  } catch (error: any) {
    console.error('Merge cart error:', error);
    res.status(500).json({ error: 'Failed to merge carts' });
  }
});

// Need pool import for cart item lookup
import pool from '../../db';

export default router;
