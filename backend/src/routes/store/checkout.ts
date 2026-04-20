/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE CHECKOUT ROUTES                                                   ║
 * ║  /api/store/:storeSlug/checkout                                         ║
 * ║  Cart → Order conversion, payment processing, webhook handling          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, requireStoreCustomer } from '../../middleware/storeAuth';
import storeCheckoutService from '../../services/storeCheckoutService';
import paymentGatewayService, { PaymentGateway } from '../../services/paymentGatewayService';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);

// ═══════════════════════════════════════════════════════════════════════════
// POST /checkout — Process checkout (create order from cart)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const {
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      shippingMethod,
      notes,
      returnUrl,
    } = req.body;

    if (!shippingAddressId || !paymentMethod) {
      return res.status(400).json({ error: 'Shipping address and payment method are required' });
    }

    // 1. Create the order (with inventory locking)
    const order = await storeCheckoutService.processCheckout({
      cartId: 0, // Will be resolved from customer's active cart
      storeId: store.id,
      companyId: store.companyId,
      storeCustomerId: customer!.sub,
      billingAddressId: billingAddressId ? parseInt(billingAddressId) : parseInt(shippingAddressId),
      shippingAddressId: parseInt(shippingAddressId),
      shippingRateId: shippingMethod ? parseInt(shippingMethod) : undefined,
      paymentGateway: paymentMethod,
      customerNotes: notes,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // 2. Create payment intent (for non-COD gateways)
    let paymentUrl: string | undefined;
    if (paymentMethod !== 'cod' && paymentMethod !== 'bank_transfer') {
      const customerInfo = await pool.query(
        'SELECT email, first_name, last_name FROM store_customers WHERE id = $1',
        [customer!.sub]
      );
      const c = customerInfo.rows[0];

      const payment = await paymentGatewayService.createPaymentIntent({
        storeId: store.id,
        companyId: store.companyId,
        storeOrderId: order.storeOrder.id,
        orderNumber: order.storeOrder.orderNumber,
        gateway: paymentMethod as PaymentGateway,
        amount: order.storeOrder.total,
        currency: store.defaultCurrencyId ? 'SAR' : 'USD', // Will be resolved from store settings
        customerEmail: c.email,
        customerName: `${c.first_name} ${c.last_name || ''}`.trim(),
        returnUrl: returnUrl || `${req.headers.origin}/store/${store.slug}/orders`,
      });

      paymentUrl = payment.redirectUrl;
    }

    res.status(201).json({
      data: {
        ...order.storeOrder,
        salesOrderId: order.salesOrderId,
        paymentUrl,
      },
    });
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('cart') || msg.includes('stock') || msg.includes('address')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /checkout/webhook/:gateway — Payment gateway webhook (verified)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook/:gateway', async (req: Request, res: Response) => {
  const gateway = req.params.gateway as PaymentGateway;
  const { store } = req.storeContext!;

  try {
    // 1. Verify webhook signature
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const verified = await paymentGatewayService.verifyWebhookSignature(
      gateway, store.id, rawBody, req.headers
    );

    if (!verified) {
      console.error(`Webhook signature verification failed for ${gateway}`);
      await paymentGatewayService.recordWebhookAttempt({
        storeId: store.id,
        gateway,
        eventType: 'signature_failed',
        payload: req.body,
        status: 'failed',
        error: 'Signature verification failed',
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 2. Parse the webhook event
    const event = paymentGatewayService.parseWebhookEvent(gateway, req.body);
    if (!event) {
      // Unknown event type — acknowledge but skip
      return res.status(200).json({ received: true, processed: false });
    }

    // 3. Process the payment result
    await storeCheckoutService.handlePaymentWebhook(
      gateway,
      event.transactionId,
      event.status as 'success' | 'failed',
      event.amount,
      { storeOrderId: event.metadata.storeOrderId, ...event.metadata }
    );

    // 4. Record successful webhook
    await paymentGatewayService.recordWebhookAttempt({
      storeId: store.id,
      gateway,
      eventType: event.status,
      payload: req.body,
      status: 'success',
    });

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`Webhook processing error (${gateway}):`, error);

    // Record failed webhook for retry
    await paymentGatewayService.recordWebhookAttempt({
      storeId: store.id,
      gateway,
      eventType: 'processing_error',
      payload: req.body,
      status: 'failed',
      error: error.message,
    }).catch(() => {}); // Don't fail the response

    // Always return 200 to prevent gateway retries flooding
    res.status(200).json({ received: true, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /checkout/confirm/:orderId — Confirm pending order
// ═══════════════════════════════════════════════════════════════════════════
router.post('/confirm/:orderId', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { store, customer } = req.storeContext!;
    const orderId = parseInt(req.params.orderId);

    // Verify order belongs to customer
    const check = await pool.query(
      `SELECT id FROM store_orders WHERE id = $1 AND store_customer_id = $2 AND company_id = $3`,
      [orderId, customer!.sub, store.companyId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await storeCheckoutService.confirmOrder(orderId);
    res.json({ message: 'Order confirmed' });
  } catch (error: any) {
    console.error('Confirm order error:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

export default router;
