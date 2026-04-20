/**
 * ============================================================================
 * Webhook API — Architecture §11.1
 * ============================================================================
 * Base URL: /api/v1/webhooks/*
 * Access:   External systems + API Key authentication
 *
 * Provides inbound webhook endpoints for:
 *   - Shipment status updates from carriers
 *   - Payment confirmations from payment gateways
 *   - Customs clearance notifications
 *
 * Authentication: API Key via X-API-Key header or ?api_key query param
 * ============================================================================
 */

import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ─────────────────────────────────────────────────
// Webhook API Key Verification Middleware
// ─────────────────────────────────────────────────
async function verifyWebhookApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

  if (!apiKey) {
    return sendError(res, 'MISSING_API_KEY', 'X-API-Key header or api_key query parameter required', 401);
  }

  try {
    // Validate against api_keys table (hashed comparison)
    const result = await pool.query(
      `SELECT ak.id, ak.tenant_id, ak.name, ak.permissions, ak.is_active,
              ak.rate_limit_per_minute, ak.last_used_at
       FROM api_keys ak
       WHERE ak.key_hash = encode(digest($1, 'sha256'), 'hex')
         AND ak.is_active = true
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
         AND ak.deleted_at IS NULL`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'INVALID_API_KEY', 'Invalid or expired API key', 401);
    }

    const key = result.rows[0];

    // Tag request with webhook context
    (req as any).webhookContext = {
      apiKeyId: key.id,
      tenantId: key.tenant_id,
      keyName: key.name,
      permissions: key.permissions,
    };

    // Update last_used_at (fire-and-forget)
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]).catch(() => {});

    next();
  } catch (error) {
    logger.error('Webhook API key verification failed:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Authentication failed', 500);
  }
}

// Apply API key verification to all webhook routes
router.use(verifyWebhookApiKey);

// ─────────────────────────────────────────────────
// POST /api/v1/webhooks/shipment-update
// Receive shipment status update from carrier
// ─────────────────────────────────────────────────
router.post('/shipment-update', async (req: Request, res: Response) => {
  try {
    const ctx = (req as any).webhookContext;
    const { tracking_number, status, carrier_code, timestamp, details } = req.body;

    if (!tracking_number || !status) {
      return sendError(res, 'VALIDATION_ERROR', 'tracking_number and status are required', 400, [
        ...(!tracking_number ? [{ field: 'tracking_number', message: 'Required' }] : []),
        ...(!status ? [{ field: 'status', message: 'Required' }] : []),
      ]);
    }

    // Log the webhook event
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data, ip_address, user_agent, tenant_id)
       VALUES (NULL, 'webhook_received', 'shipments', $1, $2, $3, $4, $5)`,
      [
        tracking_number,
        JSON.stringify({ status, carrier_code, timestamp, details, api_key: ctx.keyName }),
        req.ip,
        req.headers['user-agent'],
        ctx.tenantId,
      ]
    );

    logger.info(`Webhook: shipment-update for ${tracking_number}, status=${status}, tenant=${ctx.tenantId}`);

    return sendSuccess(res, {
      received: true,
      tracking_number,
      status,
      processed_at: new Date().toISOString(),
    }, 200, undefined, 'Webhook received successfully', 'WEBHOOK_RECEIVED');
  } catch (error) {
    logger.error('Webhook shipment-update error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
});

// ─────────────────────────────────────────────────
// POST /api/v1/webhooks/payment-confirmation
// Receive payment confirmation from payment gateway
// ─────────────────────────────────────────────────
router.post('/payment-confirmation', async (req: Request, res: Response) => {
  try {
    const ctx = (req as any).webhookContext;
    const { reference_number, amount, currency, gateway, transaction_id } = req.body;

    if (!reference_number || !amount) {
      return sendError(res, 'VALIDATION_ERROR', 'reference_number and amount are required', 400);
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data, ip_address, user_agent, tenant_id)
       VALUES (NULL, 'webhook_received', 'payments', $1, $2, $3, $4, $5)`,
      [
        reference_number,
        JSON.stringify({ amount, currency, gateway, transaction_id, api_key: ctx.keyName }),
        req.ip,
        req.headers['user-agent'],
        ctx.tenantId,
      ]
    );

    logger.info(`Webhook: payment-confirmation for ${reference_number}, amount=${amount} ${currency}`);

    return sendSuccess(res, {
      received: true,
      reference_number,
      processed_at: new Date().toISOString(),
    }, 200, undefined, 'Payment webhook received', 'WEBHOOK_RECEIVED');
  } catch (error) {
    logger.error('Webhook payment-confirmation error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
});

// ─────────────────────────────────────────────────
// POST /api/v1/webhooks/customs-notification
// Receive customs clearance notification
// ─────────────────────────────────────────────────
router.post('/customs-notification', async (req: Request, res: Response) => {
  try {
    const ctx = (req as any).webhookContext;
    const { declaration_number, status, office_code, cleared_at } = req.body;

    if (!declaration_number || !status) {
      return sendError(res, 'VALIDATION_ERROR', 'declaration_number and status are required', 400);
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data, ip_address, user_agent, tenant_id)
       VALUES (NULL, 'webhook_received', 'customs_declarations', $1, $2, $3, $4, $5)`,
      [
        declaration_number,
        JSON.stringify({ status, office_code, cleared_at, api_key: ctx.keyName }),
        req.ip,
        req.headers['user-agent'],
        ctx.tenantId,
      ]
    );

    logger.info(`Webhook: customs-notification for ${declaration_number}, status=${status}`);

    return sendSuccess(res, {
      received: true,
      declaration_number,
      processed_at: new Date().toISOString(),
    }, 200, undefined, 'Customs webhook received', 'WEBHOOK_RECEIVED');
  } catch (error) {
    logger.error('Webhook customs-notification error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
});

export default router;
