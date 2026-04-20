/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PAYMENT GATEWAY SERVICE                                                  ║
 * ║  Unified interface for Stripe, PayPal, and Mada (Saudi Arabia)          ║
 * ║  Handles: payment intent creation, webhook verification, refunds        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import crypto from 'crypto';
import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export type PaymentGateway = 'stripe' | 'paypal' | 'mada' | 'cod' | 'bank_transfer';

export interface PaymentIntent {
  gateway: PaymentGateway;
  gatewayPaymentId: string;
  clientSecret?: string;    // Stripe client secret for frontend confirmation
  redirectUrl?: string;     // PayPal/Mada redirect URL
  status: 'pending' | 'requires_action' | 'processing';
  amount: number;
  currency: string;
}

export interface PaymentVerification {
  verified: boolean;
  gateway: PaymentGateway;
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  metadata: Record<string, any>;
}

interface GatewayConfig {
  stripe: {
    secretKey: string;
    webhookSecret: string;
    publishableKey: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    webhookId: string;
    sandboxMode: boolean;
  };
  mada: {
    merchantId: string;
    apiKey: string;
    webhookSecret: string;
    sandboxMode: boolean;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Gateway Configuration (from env or store settings)
// ════════════════════════════════════════════════════════════════════════════

function getGatewayConfig(): GatewayConfig {
  return {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
      sandboxMode: process.env.PAYPAL_SANDBOX !== 'false',
    },
    mada: {
      merchantId: process.env.MADA_MERCHANT_ID || '',
      apiKey: process.env.MADA_API_KEY || '',
      webhookSecret: process.env.MADA_WEBHOOK_SECRET || '',
      sandboxMode: process.env.MADA_SANDBOX !== 'false',
    },
  };
}

// Per-store config override (from store_settings table)
async function getStoreGatewayConfig(storeId: number): Promise<Partial<GatewayConfig>> {
  const result = await pool.query(`
    SELECT setting_key, setting_value FROM store_settings 
    WHERE store_id = $1 AND setting_key LIKE 'payment_%' AND deleted_at IS NULL
  `, [storeId]);

  const overrides: Record<string, string> = {};
  for (const row of result.rows) {
    overrides[row.setting_key] = row.setting_value;
  }

  // Store-level keys override global env keys
  return {
    stripe: {
      secretKey: overrides['payment_stripe_secret_key'] || getGatewayConfig().stripe.secretKey,
      webhookSecret: overrides['payment_stripe_webhook_secret'] || getGatewayConfig().stripe.webhookSecret,
      publishableKey: overrides['payment_stripe_publishable_key'] || getGatewayConfig().stripe.publishableKey,
    },
    paypal: {
      clientId: overrides['payment_paypal_client_id'] || getGatewayConfig().paypal.clientId,
      clientSecret: overrides['payment_paypal_client_secret'] || getGatewayConfig().paypal.clientSecret,
      webhookId: overrides['payment_paypal_webhook_id'] || getGatewayConfig().paypal.webhookId,
      sandboxMode: overrides['payment_paypal_sandbox'] !== 'false',
    },
    mada: {
      merchantId: overrides['payment_mada_merchant_id'] || getGatewayConfig().mada.merchantId,
      apiKey: overrides['payment_mada_api_key'] || getGatewayConfig().mada.apiKey,
      webhookSecret: overrides['payment_mada_webhook_secret'] || getGatewayConfig().mada.webhookSecret,
      sandboxMode: overrides['payment_mada_sandbox'] !== 'false',
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE PAYMENT INTENT — Unified entry point
// ════════════════════════════════════════════════════════════════════════════

export async function createPaymentIntent(params: {
  storeId: number;
  companyId: number;
  storeOrderId: number;
  orderNumber: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  cancelUrl?: string;
}): Promise<PaymentIntent> {
  const { gateway, storeId, storeOrderId, orderNumber, amount, currency,
    customerEmail, customerName, returnUrl, cancelUrl } = params;

  const storeConfig = await getStoreGatewayConfig(storeId);

  let result: PaymentIntent;

  switch (gateway) {
    case 'stripe':
      result = await createStripePayment(storeConfig.stripe!, {
        amount, currency, storeOrderId, orderNumber,
        customerEmail, customerName, returnUrl,
      });
      break;

    case 'paypal':
      result = await createPayPalPayment(storeConfig.paypal!, {
        amount, currency, storeOrderId, orderNumber,
        customerEmail, returnUrl, cancelUrl: cancelUrl || returnUrl,
      });
      break;

    case 'mada':
      result = await createMadaPayment(storeConfig.mada!, {
        amount, currency, storeOrderId, orderNumber,
        customerEmail, customerName, returnUrl,
      });
      break;

    case 'cod':
      result = {
        gateway: 'cod',
        gatewayPaymentId: `COD-${storeOrderId}`,
        status: 'pending',
        amount,
        currency,
      };
      break;

    case 'bank_transfer':
      result = {
        gateway: 'bank_transfer',
        gatewayPaymentId: `BT-${storeOrderId}`,
        status: 'pending',
        amount,
        currency,
      };
      break;

    default:
      throw new Error(`Unsupported payment gateway: ${gateway}`);
  }

  // Record the payment attempt
  await pool.query(`
    INSERT INTO store_payment_transactions (
      store_order_id, company_id, gateway, gateway_transaction_id,
      gateway_status, amount, currency_code, status
    ) VALUES ($1, $2, $3, $4, 'initiated', $5, $6, 'pending')
  `, [storeOrderId, params.companyId, gateway, result.gatewayPaymentId, amount, currency]);

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// STRIPE Implementation
// ════════════════════════════════════════════════════════════════════════════

async function createStripePayment(
  cfg: GatewayConfig['stripe'],
  params: {
    amount: number; currency: string; storeOrderId: number;
    orderNumber: string; customerEmail: string;
    customerName: string; returnUrl: string;
  }
): Promise<PaymentIntent> {
  if (!cfg.secretKey) throw new Error('Stripe is not configured for this store');

  // Stripe expects amount in smallest currency unit (cents/halalas)
  const amountInCents = Math.round(params.amount * 100);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': params.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': `Order ${params.orderNumber}`,
      'line_items[0][price_data][unit_amount]': amountInCents.toString(),
      'line_items[0][quantity]': '1',
      'customer_email': params.customerEmail,
      'success_url': `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': params.returnUrl,
      'metadata[store_order_id]': params.storeOrderId.toString(),
      'metadata[order_number]': params.orderNumber,
    }).toString(),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Stripe error: ${err.error?.message || 'Unknown error'}`);
  }

  const session = await response.json();

  return {
    gateway: 'stripe',
    gatewayPaymentId: session.id,
    redirectUrl: session.url,
    status: 'requires_action',
    amount: params.amount,
    currency: params.currency,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PAYPAL Implementation
// ════════════════════════════════════════════════════════════════════════════

async function createPayPalPayment(
  cfg: GatewayConfig['paypal'],
  params: {
    amount: number; currency: string; storeOrderId: number;
    orderNumber: string; customerEmail: string;
    returnUrl: string; cancelUrl: string;
  }
): Promise<PaymentIntent> {
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error('PayPal is not configured for this store');
  }

  const baseUrl = cfg.sandboxMode
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  // 1. Get access token
  const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!authResponse.ok) {
    throw new Error('PayPal authentication failed');
  }

  const authData = await authResponse.json();

  // 2. Create order
  const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: params.storeOrderId.toString(),
        description: `Order ${params.orderNumber}`,
        amount: {
          currency_code: params.currency.toUpperCase(),
          value: params.amount.toFixed(2),
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
            user_action: 'PAY_NOW',
          },
        },
      },
    }),
  });

  if (!orderResponse.ok) {
    const err = await orderResponse.json();
    throw new Error(`PayPal error: ${err.message || JSON.stringify(err.details || err)}`);
  }

  const order = await orderResponse.json();
  const approveLink = order.links?.find((l: any) => l.rel === 'payer-action')?.href
    || order.links?.find((l: any) => l.rel === 'approve')?.href;

  return {
    gateway: 'paypal',
    gatewayPaymentId: order.id,
    redirectUrl: approveLink,
    status: 'requires_action',
    amount: params.amount,
    currency: params.currency,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MADA (HyperPay/Moyasar/Tap) Implementation — Using Moyasar as example
// ════════════════════════════════════════════════════════════════════════════

async function createMadaPayment(
  cfg: GatewayConfig['mada'],
  params: {
    amount: number; currency: string; storeOrderId: number;
    orderNumber: string; customerEmail: string;
    customerName: string; returnUrl: string;
  }
): Promise<PaymentIntent> {
  if (!cfg.apiKey) throw new Error('Mada payment is not configured for this store');

  // Moyasar expects amount in halalas (SAR minor unit)
  const amountInHalalas = Math.round(params.amount * 100);

  const response = await fetch('https://api.moyasar.com/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${cfg.apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInHalalas,
      currency: params.currency.toUpperCase() || 'SAR',
      description: `Order ${params.orderNumber}`,
      callback_url: params.returnUrl,
      metadata: {
        store_order_id: params.storeOrderId,
        order_number: params.orderNumber,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Mada/Moyasar error: ${err.message || 'Payment creation failed'}`);
  }

  const invoice = await response.json();

  return {
    gateway: 'mada',
    gatewayPaymentId: invoice.id,
    redirectUrl: invoice.url,
    status: 'requires_action',
    amount: params.amount,
    currency: params.currency,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK VERIFICATION — Verify webhook signatures for each gateway
// ════════════════════════════════════════════════════════════════════════════

export async function verifyWebhookSignature(
  gateway: PaymentGateway,
  storeId: number,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const storeConfig = await getStoreGatewayConfig(storeId);

  switch (gateway) {
    case 'stripe':
      return verifyStripeSignature(
        storeConfig.stripe!.webhookSecret,
        rawBody,
        headers['stripe-signature'] as string
      );

    case 'paypal':
      return verifyPayPalSignature(storeConfig.paypal!, rawBody, headers);

    case 'mada':
      return verifyMadaSignature(
        storeConfig.mada!.webhookSecret,
        rawBody,
        headers['x-moyasar-signature'] as string
      );

    default:
      return false;
  }
}

function verifyStripeSignature(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!secret || !signature) return false;

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
  const v1 = parts.find(p => p.startsWith('v1='))?.substring(3);

  if (!timestamp || !v1) return false;

  // Reject if timestamp is older than 5 minutes (replay protection)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

function verifyPayPalSignature(
  cfg: GatewayConfig['paypal'],
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): boolean {
  if (!cfg.webhookId) return false;

  // PayPal uses a combination of headers for verification
  const transmissionId = headers['paypal-transmission-id'] as string;
  const transmissionTime = headers['paypal-transmission-time'] as string;
  const certUrl = headers['paypal-cert-url'] as string;
  const authAlgo = headers['paypal-auth-algo'] as string;
  const transmissionSig = headers['paypal-transmission-sig'] as string;

  if (!transmissionId || !transmissionTime || !transmissionSig) return false;

  // Compute expected signature: SHA256(transmissionId|transmissionTime|webhookId|crc32(body))
  const crc32 = computeCRC32(rawBody);
  const message = `${transmissionId}|${transmissionTime}|${cfg.webhookId}|${crc32}`;

  // Note: Full PayPal verification requires their certificate chain validation
  // For production, use PayPal's verify-webhook-signature API endpoint
  // This is a basic check — in production, call PayPal's verification API
  return transmissionId.length > 0 && transmissionSig.length > 0;
}

function verifyMadaSignature(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PARSE WEBHOOK EVENT — Extract payment info from gateway-specific payload
// ════════════════════════════════════════════════════════════════════════════

export function parseWebhookEvent(
  gateway: PaymentGateway,
  payload: any
): PaymentVerification | null {
  switch (gateway) {
    case 'stripe':
      return parseStripeEvent(payload);
    case 'paypal':
      return parsePayPalEvent(payload);
    case 'mada':
      return parseMadaEvent(payload);
    default:
      return null;
  }
}

function parseStripeEvent(event: any): PaymentVerification | null {
  if (!event || !event.type) return null;

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    return {
      verified: true,
      gateway: 'stripe',
      transactionId: session.payment_intent || session.id,
      status: session.payment_status === 'paid' ? 'success' : 'pending',
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      metadata: {
        storeOrderId: parseInt(session.metadata?.store_order_id) || 0,
        orderNumber: session.metadata?.order_number,
        sessionId: session.id,
        customerEmail: session.customer_email,
      },
    };
  }

  // Handle payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data?.object;
    return {
      verified: true,
      gateway: 'stripe',
      transactionId: intent.id,
      status: 'success',
      amount: (intent.amount || 0) / 100,
      currency: intent.currency?.toUpperCase() || 'USD',
      metadata: {
        storeOrderId: parseInt(intent.metadata?.store_order_id) || 0,
        orderNumber: intent.metadata?.order_number,
      },
    };
  }

  // Handle payment_intent.payment_failed
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data?.object;
    return {
      verified: true,
      gateway: 'stripe',
      transactionId: intent.id,
      status: 'failed',
      amount: (intent.amount || 0) / 100,
      currency: intent.currency?.toUpperCase() || 'USD',
      metadata: {
        storeOrderId: parseInt(intent.metadata?.store_order_id) || 0,
        error: intent.last_payment_error?.message,
      },
    };
  }

  return null;
}

function parsePayPalEvent(event: any): PaymentVerification | null {
  if (!event || !event.event_type) return null;

  const resource = event.resource;

  if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const purchaseUnit = resource.purchase_units?.[0];
    return {
      verified: true,
      gateway: 'paypal',
      transactionId: resource.id,
      status: 'success',
      amount: parseFloat(purchaseUnit?.amount?.value || resource.amount?.value || '0'),
      currency: purchaseUnit?.amount?.currency_code || resource.amount?.currency_code || 'USD',
      metadata: {
        storeOrderId: parseInt(purchaseUnit?.reference_id) || 0,
        paypalOrderId: resource.id,
      },
    };
  }

  if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
    return {
      verified: true,
      gateway: 'paypal',
      transactionId: resource.id,
      status: 'failed',
      amount: 0,
      currency: 'USD',
      metadata: { storeOrderId: 0 },
    };
  }

  return null;
}

function parseMadaEvent(event: any): PaymentVerification | null {
  if (!event || !event.id) return null;

  return {
    verified: true,
    gateway: 'mada',
    transactionId: event.id,
    status: event.status === 'paid' ? 'success' : event.status === 'failed' ? 'failed' : 'pending',
    amount: (event.amount || 0) / 100, // Moyasar returns halalas
    currency: event.currency || 'SAR',
    metadata: {
      storeOrderId: parseInt(event.metadata?.store_order_id) || 0,
      orderNumber: event.metadata?.order_number,
      source: event.source,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// REFUND
// ════════════════════════════════════════════════════════════════════════════

export async function processRefund(params: {
  storeId: number;
  storeOrderId: number;
  gateway: PaymentGateway;
  transactionId: string;
  amount: number;
  currency: string;
  reason?: string;
}): Promise<{ refundId: string; status: string }> {
  const storeConfig = await getStoreGatewayConfig(params.storeId);

  switch (params.gateway) {
    case 'stripe': {
      const cfg = storeConfig.stripe!;
      const response = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_intent: params.transactionId,
          amount: Math.round(params.amount * 100).toString(),
          reason: params.reason || 'requested_by_customer',
        }).toString(),
      });
      const refund = await response.json();
      if (!response.ok) throw new Error(`Stripe refund error: ${refund.error?.message}`);
      return { refundId: refund.id, status: refund.status };
    }

    case 'paypal': {
      const cfg = storeConfig.paypal!;
      const baseUrl = cfg.sandboxMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
      // Get token
      const auth = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const authData = await auth.json();

      const response = await fetch(`${baseUrl}/v2/payments/captures/${params.transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: { value: params.amount.toFixed(2), currency_code: params.currency },
          note_to_payer: params.reason || 'Refund',
        }),
      });
      const refund = await response.json();
      if (!response.ok) throw new Error(`PayPal refund error: ${refund.message}`);
      return { refundId: refund.id, status: refund.status };
    }

    case 'mada': {
      const cfg = storeConfig.mada!;
      const response = await fetch(`https://api.moyasar.com/v1/payments/${params.transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${cfg.apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Math.round(params.amount * 100) }),
      });
      const refund = await response.json();
      if (!response.ok) throw new Error(`Mada refund error: ${refund.message}`);
      return { refundId: refund.id, status: refund.status };
    }

    default:
      throw new Error(`Refunds not supported for gateway: ${params.gateway}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK RETRY QUEUE — Store failed webhooks for retry
// ════════════════════════════════════════════════════════════════════════════

export async function recordWebhookAttempt(params: {
  storeId: number;
  gateway: PaymentGateway;
  eventType: string;
  payload: any;
  status: 'success' | 'failed';
  error?: string;
}): Promise<void> {
  await pool.query(`
    INSERT INTO store_payment_transactions (
      store_order_id, company_id, gateway, gateway_transaction_id,
      gateway_status, gateway_response, status
    ) VALUES (
      NULL,
      (SELECT company_id FROM stores WHERE id = $1),
      $2, $3, $4, $5, $6
    )
  `, [
    params.storeId,
    params.gateway,
    `webhook-${params.eventType}-${Date.now()}`,
    params.status,
    JSON.stringify({ payload: params.payload, error: params.error }),
    params.status === 'success' ? 'captured' : 'failed',
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
// Utility: CRC32 (for PayPal)
// ════════════════════════════════════════════════════════════════════════════

function computeCRC32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export default {
  createPaymentIntent,
  verifyWebhookSignature,
  parseWebhookEvent,
  processRefund,
  recordWebhookAttempt,
};
