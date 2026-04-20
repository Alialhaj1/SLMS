/**
 * ============================================================================
 * Module Gating Middleware — Architecture §4.3
 * ============================================================================
 *
 * Controls access to API routes based on tenant module enablement.
 * A module must be:
 *   1. Active at platform level (modules.is_active = true)
 *   2. Either core (modules.is_core = true) OR enabled for the tenant (tenant_modules)
 *
 * Usage:
 *   router.use('/api/shipments', requireModule('shipments'), shipmentRoutes);
 *   router.post('/customs/declare', requireModule('customs'), handler);
 *
 * Platform users (tenant_id = null) bypass module gating.
 * ============================================================================
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PermissionService } from '../services/permissionService';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
    tenant_id?: number | null;
    login_context?: 'platform' | 'tenant';
  };
}

// ────────────────────────────────────────────
// Module Route Mapping — which routes map to which modules
// ────────────────────────────────────────────

/**
 * Map API path prefixes to module codes.
 * Used by the automatic module gating middleware.
 */
export const MODULE_ROUTE_MAP: Record<string, string> = {
  '/api/shipments':       'shipments',
  '/api/tracking':        'shipments',
  '/api/logistics':       'shipments',
  '/api/procurement':     'procurement',
  '/api/purchase-orders': 'procurement',
  '/api/vendors':         'procurement',
  '/api/suppliers':       'procurement',
  '/api/customs':         'customs',
  '/api/accounting':      'accounting',
  '/api/expenses':        'accounting',
  '/api/invoices':        'accounting',
  '/api/journal':         'accounting',
  '/api/journals':        'accounting',
  '/api/chart-of-accounts': 'accounting',
  '/api/warehouses':      'warehousing',
  '/api/inventory':       'warehousing',
  '/api/stock':           'warehousing',
  '/api/zatca':           'zatca',
  '/api/e-invoice':       'zatca',
  '/api/crm':             'crm',
  '/api/customers':       'crm',
  '/api/contacts':        'crm',
  '/api/reports':         'reports',
  '/api/analytics':       'reports',
};

// ────────────────────────────────────────────
// Middleware: requireModule
// ────────────────────────────────────────────

/**
 * Factory middleware that checks if a specific module is enabled for the
 * current tenant. Returns 403 if module is not enabled.
 *
 * Platform users bypass this check entirely.
 *
 * @param moduleCode - Module code to check (e.g., 'shipments', 'accounting')
 */
export function requireModule(moduleCode: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;

      // No user = unauthenticated (shouldn't hit this if authenticate runs first)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // Platform users bypass module gating
      if (!user.tenant_id) {
        return next();
      }

      const enabled = await PermissionService.isModuleEnabled(user.tenant_id, moduleCode);

      if (!enabled) {
        logger.warn('Module access denied', {
          userId: user.id,
          tenantId: user.tenant_id,
          module: moduleCode,
          path: req.originalUrl || req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: 'MODULE_NOT_ENABLED',
          error_ar: 'الوحدة غير مفعلة',
          message: `Module '${moduleCode}' is not enabled for your organization`,
          message_ar: `الوحدة '${moduleCode}' غير مفعلة لمؤسستكم`,
          code: 'MODULE_NOT_ENABLED',
          module: moduleCode,
        });
      }

      next();
    } catch (error) {
      logger.error('Module gating check failed', { moduleCode, error });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'MODULE_CHECK_ERROR',
      });
    }
  };
}

// ────────────────────────────────────────────
// Middleware: autoModuleGating
// ────────────────────────────────────────────

/**
 * Global middleware that automatically determines the module from the
 * request path and checks if it's enabled. Apply early in the pipeline.
 *
 * This is a convenience alternative to manually adding requireModule()
 * to every route. It uses MODULE_ROUTE_MAP to resolve paths → modules.
 *
 * Paths not in MODULE_ROUTE_MAP are passed through (no gating).
 */
export function autoModuleGating(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthRequest).user;

  // No user or platform user → skip
  if (!user || !user.tenant_id) {
    return next();
  }

  const requestPath = req.originalUrl || req.path;

  // Find matching module for this path
  let moduleCode: string | null = null;
  for (const [prefix, code] of Object.entries(MODULE_ROUTE_MAP)) {
    if (requestPath.startsWith(prefix)) {
      moduleCode = code;
      break;
    }
  }

  // No module mapping → pass through (core/system routes)
  if (!moduleCode) {
    return next();
  }

  // Async check
  PermissionService.isModuleEnabled(user.tenant_id, moduleCode)
    .then(enabled => {
      if (!enabled) {
        logger.warn('Auto module gating blocked request', {
          userId: user.id,
          tenantId: user.tenant_id,
          module: moduleCode,
          path: requestPath,
        });

        return res.status(403).json({
          success: false,
          error: 'MODULE_NOT_ENABLED',
          error_ar: 'الوحدة غير مفعلة',
          message: `Module '${moduleCode}' is not enabled for your organization`,
          message_ar: `الوحدة '${moduleCode}' غير مفعلة لمؤسستكم`,
          code: 'MODULE_NOT_ENABLED',
          module: moduleCode,
        });
      }
      next();
    })
    .catch(error => {
      logger.error('Auto module gating failed', { moduleCode, error });
      // Fail open for auto-gating (explicit requireModule still blocks)
      next();
    });
}

export default requireModule;
