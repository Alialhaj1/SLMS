/**
 * Tenant Isolation Middleware
 * Ensures tenant users can only access their own tenant's data.
 * Platform admins (tenant_id = null) bypass isolation.
 */

import { Request, Response, NextFunction } from 'express';

export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  // No user (unauthenticated) — skip, let auth middleware handle it
  if (!user) {
    return next();
  }

  // Platform admin — bypass tenant isolation
  if (!user.tenant_id || user.is_platform_admin) {
    return next();
  }

  // Inject tenantId into request for downstream queries
  (req as any).tenantId = user.tenant_id;

  // Check X-Tenant-Id header matches user's tenant (if provided)
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && Number(headerTenantId) !== user.tenant_id) {
    res.status(403).json({ error: 'TENANT_ACCESS_DENIED', message: 'Cannot access another tenant\'s data' });
    return;
  }

  next();
}

/**
 * Returns the tenant_id from the authenticated user, or null for platform users.
 * Use in route handlers to scope queries by tenant.
 */
export function getIsolatedTenantId(req: Request): number | null {
  const user = (req as any).user;
  if (!user) return null;
  return user.tenant_id || (req as any).tenantId || null;
}

/**
 * Returns the tenant_id that should be written into new records.
 * Same as getIsolatedTenantId but semantically for INSERT operations.
 */
export function getInsertTenantId(req: Request): number | null {
  return getIsolatedTenantId(req);
}

/**
 * Build a WHERE-clause fragment that filters by tenant_id.
 * Platform users (tenant_id = null) get an unrestricted clause ('1=1').
 *
 * @param req        Express request (must have gone through authenticate + enforceTenantIsolation)
 * @param columnName The SQL column to filter on (default: 'tenant_id')
 * @param paramIndex The positional $N index to start from (default: 1)
 * @returns { clause: string; params: any[]; nextIndex: number }
 */
export function buildTenantFilter(
  req: Request,
  columnName: string = 'tenant_id',
  paramIndex: number = 1
): { clause: string; params: any[]; nextIndex: number } {
  const tenantId = getIsolatedTenantId(req);
  if (tenantId === null || tenantId === undefined) {
    // Platform user — restrict to platform-level (non-tenant) records only.
    // This prevents platform admin from seeing tenant operational data
    // in routes that use buildTenantFilter (e.g. companies list).
    const user = (req as any).user;
    const isPlatformAdmin = user && !user.tenant_id &&
      (user.is_platform_admin || (user.roles && user.roles.includes('super_admin')));
    if (isPlatformAdmin) {
      return { clause: `${columnName} IS NULL`, params: [], nextIndex: paramIndex };
    }
    // No user / unauthenticated — no restriction (handled by auth middleware)
    return { clause: '1=1', params: [], nextIndex: paramIndex };
  }
  return {
    clause: `${columnName} = $${paramIndex}`,
    params: [tenantId],
    nextIndex: paramIndex + 1
  };
}
