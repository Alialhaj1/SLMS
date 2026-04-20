/**
 * API Key Authentication Middleware
 * 
 * Authenticates requests using API keys for external integrations.
 * Architecture Spec §2.1 — API Access Portal
 * 
 * Supported headers:
 * - X-API-Key: slms_xxxx_yyyy
 * - Authorization: ApiKey slms_xxxx_yyyy
 * 
 * Populates req.user with API key owner details + scope='api'.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKeyService';
import pool from '../db';
import { logger } from '../utils/logger';

/**
 * Middleware that authenticates via API key.
 * Falls through to next() with no req.user if no API key header is present,
 * allowing it to be chained before JWT auth for dual-auth support.
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return next(); // No API key present — let downstream middleware handle auth
  }

  const ipAddress = req.ip || 'unknown';

  ApiKeyService.authenticate(apiKey, ipAddress)
    .then(async (keyRecord) => {
      if (!keyRecord) {
        return res.status(401).json({
          error: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
        });
      }

      // Load user data for the key owner
      try {
        const userResult = await pool.query(
          'SELECT id, email, full_name, tenant_id FROM users WHERE id = $1 AND deleted_at IS NULL',
          [keyRecord.userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            error: 'API_KEY_USER_NOT_FOUND',
            message: 'API key owner account not found',
          });
        }

        const user = userResult.rows[0];

        // Load roles for the key owner
        const rolesResult = await pool.query(
          'SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
          [user.id]
        );
        const roles = rolesResult.rows.map((r: any) => r.name);

        // Populate req.user with API scope context
        (req as any).user = {
          id: user.id,
          sub: user.id,
          email: user.email,
          roles,
          tenant_id: keyRecord.tenantId || user.tenant_id,
          login_context: 'api',
          scope: 'api',
          api_key_id: keyRecord.keyId,
          api_key_scopes: keyRecord.scopes,
          api_key_rate_limit: keyRecord.rateLimitPerMinute,
        };

        next();
      } catch (error) {
        logger.error('API key auth user lookup failed', error as Error);
        return res.status(500).json({
          error: 'AUTH_ERROR',
          message: 'Authentication processing failed',
        });
      }
    })
    .catch((error) => {
      logger.error('API key authentication error', error as Error);
      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: 'Authentication processing failed',
      });
    });
}

/**
 * Middleware that requires a specific API key scope.
 * Must be used after authenticateApiKey.
 */
export function requireApiScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.scope !== 'api') {
      return res.status(403).json({
        error: 'API_KEY_REQUIRED',
        message: 'This endpoint requires API key authentication',
      });
    }

    const scopes: string[] = user.api_key_scopes || [];
    // Wildcard grants all access
    if (scopes.includes('*')) return next();
    // Direct match
    if (scopes.includes(scope)) return next();
    // Resource wildcard
    const [resource] = scope.split(':');
    if (scopes.includes(`${resource}:*`)) return next();

    return res.status(403).json({
      error: 'INSUFFICIENT_SCOPE',
      message: `API key does not have required scope: ${scope}`,
    });
  };
}

/**
 * Extract API key from request headers.
 */
function extractApiKey(req: Request): string | null {
  // Check X-API-Key header
  const xApiKey = req.headers['x-api-key'] as string | undefined;
  if (xApiKey && xApiKey.startsWith('slms_')) {
    return xApiKey;
  }

  // Check Authorization: ApiKey header
  const authHeader = req.headers.authorization as string | undefined;
  if (authHeader && authHeader.startsWith('ApiKey ')) {
    const key = authHeader.substring(7).trim();
    if (key.startsWith('slms_')) {
      return key;
    }
  }

  return null;
}
