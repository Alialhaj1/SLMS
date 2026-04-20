/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE REVIEWS ROUTES                                                    ║
 * ║  /api/store/:storeSlug/reviews                                          ║
 * ║  Product reviews and ratings                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, storeCustomerAuth, requireStoreCustomer } from '../../middleware/storeAuth';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);

// ═══════════════════════════════════════════════════════════════════════════
// GET /reviews/:itemId — Get reviews for a product (public)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:itemId', storeCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const itemId = parseInt(req.params.itemId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [reviewsResult, countResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.title, r.comment, r.is_verified_purchase, r.created_at,
                sc.first_name
         FROM store_reviews r
         JOIN store_customers sc ON sc.id = r.store_customer_id
         WHERE r.item_id = $1 AND r.store_id = $2 AND r.is_approved = true
         ORDER BY r.created_at DESC
         LIMIT $3 OFFSET $4`,
        [itemId, store.id, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM store_reviews WHERE item_id = $1 AND store_id = $2 AND is_approved = true`,
        [itemId, store.id]
      ),
      pool.query(
        `SELECT 
           COALESCE(AVG(rating), 0) as average_rating,
           COUNT(*) as total_reviews,
           COUNT(*) FILTER (WHERE rating = 5) as five_star,
           COUNT(*) FILTER (WHERE rating = 4) as four_star,
           COUNT(*) FILTER (WHERE rating = 3) as three_star,
           COUNT(*) FILTER (WHERE rating = 2) as two_star,
           COUNT(*) FILTER (WHERE rating = 1) as one_star
         FROM store_reviews WHERE item_id = $1 AND store_id = $2 AND is_approved = true`,
        [itemId, store.id]
      ),
    ]);

    res.json({
      data: {
        reviews: reviewsResult.rows,
        stats: statsResult.rows[0],
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /reviews/:itemId — Submit a review (auth required)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/:itemId', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const itemId = parseInt(req.params.itemId);
    const { rating, title, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if customer already reviewed this item
    const existing = await pool.query(
      `SELECT id FROM store_reviews WHERE store_customer_id = $1 AND item_id = $2 AND store_id = $3`,
      [customer!.sub, itemId, store.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }

    // Check if this is a verified purchase
    const purchaseCheck = await pool.query(
      `SELECT 1 FROM store_orders o
       JOIN store_order_items oi ON oi.store_order_id = o.id
       WHERE o.store_customer_id = $1 AND oi.item_id = $2 AND o.status NOT IN ('cancelled')
       LIMIT 1`,
      [customer!.sub, itemId]
    );

    const isVerifiedPurchase = purchaseCheck.rows.length > 0;

    const result = await pool.query(
      `INSERT INTO store_reviews (store_id, store_customer_id, item_id, rating, title, body, is_verified_purchase, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
       RETURNING id, rating, title, body as comment, is_verified_purchase, created_at`,
      [store.id, customer!.sub, itemId, rating, title?.trim() || null, comment?.trim() || null, isVerifiedPurchase]
    );

    res.status(201).json({
      data: result.rows[0],
      message: 'Review submitted and pending approval',
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
