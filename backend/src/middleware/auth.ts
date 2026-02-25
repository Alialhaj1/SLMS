import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import pool from '../db';

// Cache for tenant status to avoid DB hit on every request
const tenantStatusCache = new Map<number, { status: string; checkedAt: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function getTenantStatus(tenantId: number): Promise<string | null> {
  const cached = tenantStatusCache.get(tenantId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached.status;
  }
  try {
    const result = await pool.query('SELECT status FROM tenants WHERE id = $1', [tenantId]);
    if (result.rows.length > 0) {
      const status = result.rows[0].status;
      tenantStatusCache.set(tenantId, { status, checkedAt: Date.now() });
      return status;
    }
  } catch (e) {
    // Fail closed: return 'locked' so request is blocked rather than letting unauthorized access through
    return 'locked';
  }
  return null;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization as string | undefined;
  if (!auth) return res.status(401).json({ error: 'missing auth header' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    // Map 'sub' to 'id' for compatibility with routes expecting req.user.id
    (req as any).user = {
      ...payload,
      id: payload.sub
    };

    // Enforce login_context scope: prevent cross-context API access
    // login_context is set during login and embedded in JWT
    const loginContext = payload.login_context; // 'platform' | 'tenant'
    // Use originalUrl instead of path because path is relative to the router mount point
    const requestPath = req.originalUrl || req.path;
    
    // Platform-only paths should not be accessible with tenant login_context
    const PLATFORM_ONLY_API_PATHS = ['/api/platform/', '/api/admin/', '/api/subscription-plans', '/api/data-governance'];
    // Tenant management endpoints - block tenant users except self-service paths
    const TENANT_MGMT_EXEMPT_PATHS = ['/api/tenants/my-tenant', '/api/tenants/public'];
    if (loginContext === 'tenant') {
      if (PLATFORM_ONLY_API_PATHS.some(p => requestPath.startsWith(p))) {
        return res.status(403).json({
          error: 'CONTEXT_MISMATCH',
          message: 'This endpoint requires platform login context'
        });
      }
      // Block /api/tenants/* except my-tenant and public
      if (requestPath.startsWith('/api/tenants') && !TENANT_MGMT_EXEMPT_PATHS.some(p => requestPath.startsWith(p))) {
        return res.status(403).json({
          error: 'CONTEXT_MISMATCH',
          message: 'This endpoint requires platform login context'
        });
      }
    }

    // Impersonation token restrictions: limited to 1 hour, type marked
    if (payload.type === 'impersonation') {
      // Impersonation tokens cannot access platform admin endpoints
      if (PLATFORM_ONLY_API_PATHS.some(p => requestPath.startsWith(p))) {
        return res.status(403).json({
          error: 'IMPERSONATION_RESTRICTED',
          message: 'Impersonation tokens cannot access platform admin endpoints'
        });
      }
      // Cannot change passwords or modify users during impersonation
      if (requestPath.includes('/password') && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return res.status(403).json({
          error: 'IMPERSONATION_RESTRICTED',
          message: 'Password changes are not allowed during impersonation'
        });
      }
    }
    
    // Check tenant status for tenant users
    const tenantId = payload.tenant_id;
    if (tenantId) {
      getTenantStatus(tenantId).then(status => {
        if (status === 'locked') {
          return res.status(403).json({ 
            error: 'TENANT_LOCKED',
            message: 'تم تعليق حساب شركتكم. يرجى التواصل مع مدير المنصة / Your company account has been locked. Please contact the platform administrator.'
          });
        }
        if (status === 'suspended') {
          // Suspended tenants can view but not create/update/delete
          const method = req.method.toUpperCase();
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            // Allow specific safe endpoints even when suspended
            const safePaths = ['/api/auth/', '/api/tenants/my-tenant', '/api/support-tickets'];
            const isSafe = safePaths.some(p => req.path.startsWith(p));
            if (!isSafe) {
              return res.status(403).json({
                error: 'TENANT_SUSPENDED',
                message: 'حساب شركتكم موقوف مؤقتاً. العمليات الجديدة غير متاحة / Your company account is suspended. New operations are not available.'
              });
            }
          }
        }
        if (status === 'terminated') {
          return res.status(403).json({
            error: 'TENANT_TERMINATED',
            message: 'تم إنهاء حساب شركتكم / Your company account has been terminated.'
          });
        }
        next();
      }).catch(() => {
        return res.status(503).json({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Unable to verify tenant status. Please try again.'
        });
      });
    } else {
      next();
    }
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Invalidate tenant status cache (called when tenant status changes)
export function invalidateTenantStatusCache(tenantId: number) {
  tenantStatusCache.delete(tenantId);
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'not authenticated' });
    const roles = user.roles || [];
    if (allowedRoles.length === 0) return next();
    const ok = roles.some((r: string) => allowedRoles.includes(r));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
