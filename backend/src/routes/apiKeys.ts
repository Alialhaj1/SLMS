/**
 * API Key Management Routes
 * 
 * Architecture Spec §2.1 — API Access Portal
 * 
 * Endpoints:
 *   POST   /api/api-keys          → Create a new API key
 *   GET    /api/api-keys          → List user's API keys
 *   GET    /api/api-keys/:keyId   → Get a single API key
 *   DELETE /api/api-keys/:keyId   → Revoke an API key
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { ApiKeyService } from '../services/apiKeyService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/api-keys
 * Create a new API key. The full key is returned ONCE.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, scopes, rate_limit_per_minute, ip_whitelist, expires_in_days } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'API key name is required', 400);
    }

    if (scopes && !Array.isArray(scopes)) {
      return sendError(res, 'VALIDATION_ERROR', 'Scopes must be an array', 400);
    }

    const result = await ApiKeyService.createKey({
      name: name.trim(),
      description,
      userId: user.id,
      tenantId: user.tenant_id || null,
      scopes: scopes || ['*'],
      rateLimitPerMinute: rate_limit_per_minute || 60,
      ipWhitelist: ip_whitelist,
      expiresInDays: expires_in_days,
    });

    return sendSuccess(res, {
      message: 'API key created successfully. Store the key securely — it will not be shown again.',
      key: result.key,
      key_id: result.keyId,
      ...result.record,
    }, 201);
  } catch (error: any) {
    logger.error('Create API key failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to create API key', 500);
  }
});

/**
 * GET /api/api-keys
 * List API keys for the current user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const keys = await ApiKeyService.listByUser(user.id, user.tenant_id);

    return sendSuccess(res, {
      data: keys,
      total: keys.length,
    }, 200);
  } catch (error: any) {
    logger.error('List API keys failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to list API keys', 500);
  }
});

/**
 * GET /api/api-keys/:keyId
 * Get a single API key.
 */
router.get('/:keyId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { keyId } = req.params;

    const key = await ApiKeyService.getByKeyId(keyId);
    if (!key) {
      return sendError(res, 'NOT_FOUND', 'API key not found', 404);
    }

    // Only allow owner or platform admin to view
    if (key.userId !== user.id) {
      const roles: string[] = user.roles || [];
      const isAdmin = roles.some((r: string) => ['super_admin', 'system_admin'].includes(r));
      if (!isAdmin) {
        return sendError(res, 'FORBIDDEN', 'Not authorized to view this API key', 403);
      }
    }

    return sendSuccess(res, key, 200);
  } catch (error: any) {
    logger.error('Get API key failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to get API key', 500);
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Revoke an API key.
 */
router.delete('/:keyId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { keyId } = req.params;

    // Verify ownership
    const key = await ApiKeyService.getByKeyId(keyId);
    if (!key) {
      return sendError(res, 'NOT_FOUND', 'API key not found', 404);
    }

    if (key.userId !== user.id) {
      const roles: string[] = user.roles || [];
      const isAdmin = roles.some((r: string) => ['super_admin', 'system_admin'].includes(r));
      if (!isAdmin) {
        return sendError(res, 'FORBIDDEN', 'Not authorized to revoke this API key', 403);
      }
    }

    const revoked = await ApiKeyService.revokeKey(keyId, user.id);
    if (!revoked) {
      return sendError(res, 'NOT_FOUND', 'API key not found or already revoked', 404);
    }

    return sendSuccess(res, { message: 'API key revoked successfully' }, 200);
  } catch (error: any) {
    logger.error('Revoke API key failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to revoke API key', 500);
  }
});

export default router;
