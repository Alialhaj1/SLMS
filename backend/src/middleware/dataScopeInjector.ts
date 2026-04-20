/**
 * ============================================================
 * Data Scope Injector Middleware
 * ============================================================
 * 
 * Architecture Document Section 1.3, Step 6:
 * "حقن WHERE tenant_id = ? في كل استعلام"
 * 
 * This middleware sets PostgreSQL session variables for RLS:
 *   - app.tenant_id   — current tenant (from JWT)
 *   - app.company_id  — current company (from context resolution)
 *   - app.user_id     — current user (from JWT)
 *   - app.is_platform_admin — platform admin flag
 * 
 * These session variables are used by:
 *   1. PostgreSQL Row-Level Security policies (migration 401)
 *   2. TenantPool wrapper for automatic query scoping
 *   3. Helper functions in tenantIsolation.ts
 * 
 * Uses AsyncLocalStorage for request-scoped context propagation
 * to the database layer without modifying every route handler.
 * 
 * Part of P0: Complete Data Isolation Strategy
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// ────────────────────────────────────────────
// Tenant Context Store (AsyncLocalStorage)
// ────────────────────────────────────────────
export interface TenantContext {
  tenantId: number | null;
  companyId: number | null;
  userId: number | null;
  isPlatformAdmin: boolean;
  sessionId?: string;
  loginContext?: 'platform' | 'tenant';
  /** Schema name resolved by schemaRouter (e.g. 'tenant_haj'). Null = public. */
  tenantSchema?: string | null;
}

export const tenantContextStore = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context from AsyncLocalStorage.
 * Returns null if no context is available (e.g., during startup).
 */
export function getCurrentTenantContext(): TenantContext | null {
  return tenantContextStore.getStore() || null;
}

/**
 * Get the current tenant ID from the async context.
 * Used by TenantPool to set session variables on DB connections.
 */
export function getContextTenantId(): number | null {
  const ctx = tenantContextStore.getStore();
  return ctx?.tenantId || null;
}

/**
 * Check if current context is a platform admin.
 */
export function isContextPlatformAdmin(): boolean {
  const ctx = tenantContextStore.getStore();
  return ctx?.isPlatformAdmin || false;
}

// ────────────────────────────────────────────
// Middleware: Data Scope Injector
// ────────────────────────────────────────────

/**
 * Injects tenant context into AsyncLocalStorage for the entire
 * request lifecycle. This enables the database layer to automatically
 * scope queries to the correct tenant without explicit passing.
 * 
 * Must come AFTER authenticate + enforceTenantIsolation + resolveCompanyContext.
 * 
 * Request Flow (from arch doc section 1.3):
 *   Step 4: Tenant Extractor → extracts tenant_id from JWT
 *   Step 5: Permission Guard → checks permissions
 *   Step 6: Data Scope Injector → THIS MIDDLEWARE
 */
export function dataScopeInjector(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  // No user = no context (public/health endpoints)
  if (!user) {
    return next();
  }

  const context: TenantContext = {
    tenantId: user.tenant_id || (req as any).tenantId || null,
    companyId: (req as any).companyId || user.company_id || user.companyId || null,
    userId: user.id || null,
    isPlatformAdmin: !user.tenant_id && (
      (user.roles || []).some((r: string) => ['super_admin', 'system_admin', 'platform_admin'].includes(r)) ||
      user.is_platform_admin === true
    ),
    sessionId: user.session_id,
    loginContext: user.login_context || (user.tenant_id ? 'tenant' : 'platform'),
    tenantSchema: (req as any).tenantSchema || null,
  };

  // Run the rest of the request inside the AsyncLocalStorage context
  tenantContextStore.run(context, () => {
    next();
  });
}

/**
 * Express middleware wrapper that ensures the response lifecycle
 * (including async handlers) runs within the tenant context.
 */
export function dataScopeInjectorAsync(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  if (!user) {
    return next();
  }

  const context: TenantContext = {
    tenantId: user.tenant_id || (req as any).tenantId || null,
    companyId: (req as any).companyId || user.company_id || user.companyId || null,
    userId: user.id || null,
    isPlatformAdmin: !user.tenant_id && (
      (user.roles || []).some((r: string) => ['super_admin', 'system_admin', 'platform_admin'].includes(r)) ||
      user.is_platform_admin === true
    ),
    sessionId: user.session_id,
    loginContext: user.login_context || (user.tenant_id ? 'tenant' : 'platform'),
  };

  // Attach context to request for backward compatibility
  (req as any).tenantContext = context;
  (req as any).tenantId = context.tenantId;
  
  tenantContextStore.run(context, () => {
    next();
  });
}

export default dataScopeInjector;
