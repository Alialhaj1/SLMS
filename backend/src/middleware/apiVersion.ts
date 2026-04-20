/**
 * ============================================================================
 * API Versioning Middleware — Arabic Specification §14.1
 * ============================================================================
 * Provides /api/v1/* routing that maps to existing /api/* handlers.
 * 
 * Strategy: URL rewriting — requests to /api/v1/shipments are internally 
 * rewritten to /api/shipments so existing route handlers work unchanged.
 * This ensures:
 *   - Full backward compatibility with /api/* endpoints
 *   - New clients can use /api/v1/* per specification
 *   - All middleware (auth, tenant isolation, RBAC) still applies
 *
 * Response header: X-API-Version: v1
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Supported API versions
 */
export const API_VERSIONS = ['v1'] as const;
export type ApiVersion = typeof API_VERSIONS[number];
export const CURRENT_API_VERSION: ApiVersion = 'v1';

/**
 * Middleware that rewrites /api/v1/* URLs to /api/* and tags the request
 * with version metadata. Mount BEFORE all route handlers.
 *
 * Usage in app.ts:
 *   app.use('/api/v1', apiVersionRewrite('v1'));
 */
export function apiVersionRewrite(version: ApiVersion = 'v1') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Tag request with API version for downstream use
    (req as any).apiVersion = version;

    // Add version header to response
    res.setHeader('X-API-Version', version);

    // Rewrite URL: strip the version prefix so /api/v1/shipments → /shipments
    // (Express has already consumed '/api/v1' from the mount point, so req.url
    //  is already relative, e.g. '/shipments'. No rewriting needed.)
    next();
  };
}

/**
 * Middleware to add X-API-Version header to ALL /api/ responses,
 * indicating the server's current API version regardless of the
 * URL pattern the client used.
 */
export function apiVersionHeader(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-API-Version', CURRENT_API_VERSION);
  }
  next();
}

/**
 * Helper: extract API version from request
 */
export function getApiVersion(req: Request): ApiVersion | null {
  return (req as any).apiVersion || null;
}
