/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE WISHLIST ROUTES                                                   ║
 * ║  /api/store/:storeSlug/wishlist                                         ║
 * ║  Customer wishlist management                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, requireStoreCustomer } from '../../middleware/storeAuth';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);
router.use(requireStoreCustomer);

// ═══════════════════════════════════════════════════════════════════════════
// GET /wishlist — List wishlist items
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;

    const result = await pool.query(
      `SELECT w.id, w.item_id, w.variant_id, w.created_at,
              i.name as item_name, i.name_ar as item_name_ar, COALESCE(ps.slug, i.code) as slug,
              COALESCE(i.sales_price, 0) as price,
              (SELECT url FROM product_images pi WHERE pi.item_id = i.id AND pi.is_primary = true LIMIT 1) as image_url,
              COALESCE(SUM(iw.qty_on_hand), 0) > 0 as in_stock
       FROM store_wishlists w
       JOIN items i ON i.id = w.item_id AND i.company_id = $2
       LEFT JOIN product_seo ps ON ps.item_id = i.id AND ps.company_id = i.company_id
       LEFT JOIN item_warehouse iw ON iw.item_id = i.id
       WHERE w.store_customer_id = $1
       GROUP BY w.id, w.item_id, w.variant_id, w.created_at, i.id, i.name, i.name_ar, ps.slug, i.code, i.sales_price
       ORDER BY w.created_at DESC`,
      [customer!.sub, store.companyId]
    );

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /wishlist — Add item to wishlist
// ═══════════════════════════════════════════════════════════════════════════
router.post('/', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const { itemId, variantId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Upsert (ignore if already exists)
    await pool.query(
      `INSERT INTO store_wishlists (store_customer_id, store_id, item_id, variant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (store_customer_id, item_id, COALESCE(variant_id, 0)) DO NOTHING`,
      [customer!.sub, store.id, parseInt(itemId), variantId ? parseInt(variantId) : null]
    );

    res.status(201).json({ message: 'Added to wishlist' });
  } catch (error: any) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /wishlist/:itemId — Remove item from wishlist
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/:itemId', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const itemId = parseInt(req.params.itemId);

    await pool.query(
      `DELETE FROM store_wishlists WHERE store_customer_id = $1 AND store_id = $2 AND item_id = $3`,
      [customer!.sub, store.id, itemId]
    );

    res.json({ message: 'Removed from wishlist' });
  } catch (error: any) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
