/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE SHIPPING ROUTES                                                   ║
 * ║  /api/store/:storeSlug/shipping                                         ║
 * ║  Shipping zones, rates, and estimation                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, storeCustomerAuth } from '../../middleware/storeAuth';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);
router.use(storeCustomerAuth);

// ═══════════════════════════════════════════════════════════════════════════
// GET /shipping/zones — List available shipping zones
// ═══════════════════════════════════════════════════════════════════════════
router.get('/zones', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;

    const result = await pool.query(
      `SELECT sz.id, sz.name, sz.name_ar, sz.countries, sz.states,
              json_agg(json_build_object(
                'id', sr.id,
                'rateName', sr.name,
                'rateType', sr.rate_type,
                'price', sr.flat_rate,
                'minOrderAmount', sr.min_order_amount,
                'freeShippingAbove', sr.free_shipping_above,
                'estimatedDaysMin', sr.min_delivery_days,
                'estimatedDaysMax', sr.max_delivery_days
              ) ORDER BY sr.flat_rate ASC NULLS LAST) as rates
       FROM shipping_zones sz
       LEFT JOIN shipping_rates sr ON sr.shipping_zone_id = sz.id AND sr.is_active = true
       WHERE sz.store_id = $1 AND sz.is_active = true AND sz.deleted_at IS NULL
       GROUP BY sz.id
       ORDER BY sz.name`,
      [store.id]
    );

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get shipping zones error:', error);
    res.status(500).json({ error: 'Failed to load shipping zones' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /shipping/estimate — Estimate shipping cost
// ═══════════════════════════════════════════════════════════════════════════
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const { countryCode, region, orderAmount, totalWeight } = req.body;

    if (!countryCode) {
      return res.status(400).json({ error: 'Country code is required' });
    }

    // Find matching zone
    const zoneResult = await pool.query(
      `SELECT sz.id, sz.name
       FROM shipping_zones sz
       WHERE sz.store_id = $1 AND sz.is_active = true AND sz.deleted_at IS NULL
         AND (sz.countries @> $2::jsonb OR sz.countries = '[]'::jsonb)
       LIMIT 1`,
      [store.id, JSON.stringify([countryCode])]
    );

    if (zoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'No shipping available for this location' });
    }

    const zone = zoneResult.rows[0];

    // Get applicable rates
    const ratesResult = await pool.query(
      `SELECT id, name, rate_type, flat_rate, min_order_amount, free_shipping_above,
              min_delivery_days, max_delivery_days
       FROM shipping_rates
       WHERE shipping_zone_id = $1 AND is_active = true
         AND (min_order_amount IS NULL OR min_order_amount <= $2)
       ORDER BY flat_rate ASC NULLS LAST`,
      [zone.id, orderAmount || 0]
    );

    const rates = ratesResult.rows.map(r => {
      let cost = parseFloat(r.flat_rate) || 0;
      if (r.rate_type === 'free' || (r.free_shipping_above && orderAmount >= parseFloat(r.free_shipping_above))) {
        cost = 0;
      } else if (r.rate_type === 'weight_based' && totalWeight) {
        cost = cost * totalWeight;
      }

      return {
        id: r.id,
        name: r.name,
        type: r.rate_type,
        cost,
        estimatedDays: r.min_delivery_days && r.max_delivery_days
          ? `${r.min_delivery_days}-${r.max_delivery_days} days`
          : null,
      };
    });

    res.json({
      data: {
        zone: zone.name,
        rates,
      },
    });
  } catch (error: any) {
    console.error('Shipping estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate shipping' });
  }
});

export default router;
