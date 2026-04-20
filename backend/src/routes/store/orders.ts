/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE ORDERS ROUTES                                                     ║
 * ║  /api/store/:storeSlug/orders                                           ║
 * ║  Customer order history and tracking                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, requireStoreCustomer } from '../../middleware/storeAuth';
import storeCheckoutService from '../../services/storeCheckoutService';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);
router.use(requireStoreCustomer);

// ═══════════════════════════════════════════════════════════════════════════
// GET /orders — List customer orders
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const orders = await storeCheckoutService.getCustomerOrders(customer!.sub, page, limit);
    res.json(orders);
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /orders/:id — Get single order detail
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const orderId = parseInt(req.params.id);

    const orderResult = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'id', oi.id,
                'itemName', oi.item_name,
                'variantName', oi.variant_name,
                'sku', oi.sku,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price,
                'totalPrice', oi.total_price
              )) as items
       FROM store_orders o
       LEFT JOIN store_order_items oi ON oi.store_order_id = o.id
       WHERE o.id = $1 AND o.store_customer_id = $2 AND o.company_id = $3
       GROUP BY o.id`,
      [orderId, customer!.sub, store.companyId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get payment transactions
    const payments = await pool.query(
      `SELECT gateway, transaction_id, status, amount, currency, created_at
       FROM store_payment_transactions
       WHERE store_order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    );

    res.json({
      data: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        subtotal: order.subtotal,
        shippingCost: order.shipping_cost,
        taxAmount: order.tax_amount,
        discountAmount: order.discount_amount,
        totalAmount: order.total_amount,
        currency: order.currency_code,
        notes: order.customer_notes,
        items: order.items.filter((i: any) => i.id !== null),
        payments: payments.rows,
        createdAt: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: 'Failed to load order details' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /orders/:id/cancel — Cancel order (if still pending)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const orderId = parseInt(req.params.id);

    const check = await pool.query(
      `SELECT id, status FROM store_orders WHERE id = $1 AND store_customer_id = $2 AND company_id = $3`,
      [orderId, customer!.sub, store.companyId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(check.rows[0].status)) {
      return res.status(400).json({ error: 'Only pending or confirmed orders can be cancelled' });
    }

    await pool.query(
      `UPDATE store_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    res.json({ message: 'Order cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /orders/:id/tracking — Order tracking timeline
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:id/tracking', async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const orderId = parseInt(req.params.id);

    // Verify ownership
    const orderResult = await pool.query(
      `SELECT id, order_number, status, payment_status, tracking_number,
              estimated_delivery_date, shipped_at, delivered_at, paid_at, created_at
       FROM store_orders
       WHERE id = $1 AND store_customer_id = $2 AND company_id = $3`,
      [orderId, customer!.sub, store.companyId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Build timeline from order status
    const timeline: Array<{ step: string; status: string; date: string | null; description: string }> = [];

    timeline.push({
      step: 'ordered',
      status: 'completed',
      date: order.created_at,
      description: `Order ${order.order_number} placed`,
    });

    if (order.payment_status === 'paid') {
      timeline.push({
        step: 'paid',
        status: 'completed',
        date: order.paid_at,
        description: 'Payment confirmed',
      });
    } else if (order.payment_status === 'failed') {
      timeline.push({
        step: 'paid',
        status: 'failed',
        date: null,
        description: 'Payment failed',
      });
    } else {
      timeline.push({
        step: 'paid',
        status: order.status === 'cancelled' ? 'cancelled' : 'pending',
        date: null,
        description: 'Awaiting payment',
      });
    }

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIndex = statusOrder.indexOf(order.status);

    timeline.push({
      step: 'processing',
      status: currentIndex >= 2 ? 'completed' : (currentIndex >= 1 ? 'in-progress' : 'pending'),
      date: null,
      description: 'Order is being prepared',
    });

    timeline.push({
      step: 'shipped',
      status: currentIndex >= 3 ? 'completed' : 'pending',
      date: order.shipped_at,
      description: order.tracking_number
        ? `Shipped — Tracking: ${order.tracking_number}`
        : 'Package shipped',
    });

    timeline.push({
      step: 'delivered',
      status: currentIndex >= 4 ? 'completed' : 'pending',
      date: order.delivered_at,
      description: order.estimated_delivery_date
        ? `Estimated delivery: ${new Date(order.estimated_delivery_date).toLocaleDateString()}`
        : 'Package delivered',
    });

    res.json({
      data: {
        orderNumber: order.order_number,
        status: order.status,
        trackingNumber: order.tracking_number,
        estimatedDeliveryDate: order.estimated_delivery_date,
        timeline,
      },
    });
  } catch (error: any) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: 'Failed to load tracking info' });
  }
});

export default router;
