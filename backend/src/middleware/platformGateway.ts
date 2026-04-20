/**
 * ============================================================
 * Platform Gateway Middleware — Architecture §5
 * ============================================================
 *
 * Guards ALL /api/platform/* routes:
 *   1. Requires authentication (JWT)
 *   2. Requires platform user (tenant_id = null)
 *   3. Checks required platform.* permission
 *
 * Usage:
 *   router.use(platformGate('platform.tenants.read'));
 *   router.use(platformGateAny(['platform.tenants.read', 'platform.tenants.create']));
 *
 * The base `platformGuard` (no permission) just enforces platform user access.
 * ============================================================
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PermissionService, hasPermissionMatch, hasAnyPermissionMatch } from '../services/permissionService';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Base guard: authenticate + platform user check
// ────────────────────────────────────────────

/**
 * Bare platform check — verifies user has no tenant_id.
 * Does NOT check specific permissions.
 */
export function platformGuard(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      error_ar: 'المصادقة مطلوبة',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  if (user.tenant_id !== null && user.tenant_id !== undefined) {
    res.status(403).json({
      success: false,
      error: 'Platform access required — this endpoint is restricted to platform administrators',
      error_ar: 'الوصول مقتصر على مديري المنصة',
      code: 'PLATFORM_ACCESS_REQUIRED',
    });
    return;
  }

  next();
}

// ────────────────────────────────────────────
// Permission-gated guard
// ────────────────────────────────────────────

/**
 * Factory: requires platform user + specific permission.
 *
 * Example: `platformGate('platform.tenants.create')`
 */
export function platformGate(permission: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    // 1) Auth check
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_ar: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // 2) Platform check
    if (user.tenant_id !== null && user.tenant_id !== undefined) {
      res.status(403).json({
        success: false,
        error: 'Platform access required',
        error_ar: 'الوصول مقتصر على مديري المنصة',
        code: 'PLATFORM_ACCESS_REQUIRED',
      });
      return;
    }

    // 3) Super admin bypass — always has all platform permissions
    const isSuperAdmin = (user.roles || []).some(
      (r: string) => r.toLowerCase() === 'super_admin'
    );
    if (isSuperAdmin) {
      return next();
    }

    // 4) Load permissions from PermissionService (cached)
    try {
      const permSet = await PermissionService.loadPermissions(user.id, null);
      if (hasPermissionMatch(permSet.permissions, permission)) {
        return next();
      }
    } catch {
      // If service fails, fall back to inline permissions array
      const inlinePerms: string[] = user.permissions || [];
      if (hasPermissionMatch(inlinePerms, permission)) {
        return next();
      }
    }

    // 5) Denied
    logger.warn({
      event: 'platform_permission_denied',
      userId: user.id,
      email: user.email,
      required: permission,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      error: `Missing required permission: ${permission}`,
      error_ar: `لا تملك الصلاحية المطلوبة: ${permission}`,
      code: 'PERMISSION_DENIED',
      required_permission: permission,
    });
  };
}

/**
 * Factory: requires platform user + ANY of the specified permissions.
 */
export function platformGateAny(permissions: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    if (user.tenant_id !== null && user.tenant_id !== undefined) {
      res.status(403).json({ success: false, error: 'Platform access required', code: 'PLATFORM_ACCESS_REQUIRED' });
      return;
    }

    const isSuperAdmin = (user.roles || []).some(
      (r: string) => r.toLowerCase() === 'super_admin'
    );
    if (isSuperAdmin) return next();

    try {
      const permSet = await PermissionService.loadPermissions(user.id, null);
      if (hasAnyPermissionMatch(permSet.permissions, permissions)) {
        return next();
      }
    } catch {
      const inlinePerms: string[] = user.permissions || [];
      if (hasAnyPermissionMatch(inlinePerms, permissions)) {
        return next();
      }
    }

    res.status(403).json({
      success: false,
      error: `Missing required permissions: ${permissions.join(' or ')}`,
      code: 'PERMISSION_DENIED',
      required_permissions: permissions,
    });
  };
}
