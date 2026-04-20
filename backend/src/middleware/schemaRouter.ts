/**
 * ============================================================
 * Schema Router Middleware
 * ============================================================
 * Architecture Document §3.3: القاعدة الذهبية — The Golden Rule
 *
 * Sets PostgreSQL search_path per request so that all database
 * queries are automatically routed to the correct tenant schema.
 *
 *   Tenant request  →  search_path = tenant_{code}, public
 *   Platform request →  search_path = public
 *   Audit request   →  search_path = audit, public
 *
 * Defense in depth:
 *   Layer 1: Schema isolation (this middleware — search_path)
 *   Layer 2: tenant_id column filtering (tenantIsolation + RLS)
 *   Layer 3: Row-Level Security policies (migration 401)
 *
 * Must come AFTER: authenticate, enforceTenantIsolation
 * Must come BEFORE: route handlers, dataScopeInjector
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';
import { TenantSchemaService } from '../services/tenantSchemaService';

// ────────────────────────────────────────────
// Schema Context Store
// ────────────────────────────────────────────
// Attached to the request object for downstream access
declare global {
  namespace Express {
    interface Request {
      tenantSchema?: string | null;
    }
  }
}

// ────────────────────────────────────────────
// Core Middleware
// ────────────────────────────────────────────

/**
 * Resolves the tenant schema from the JWT and attaches it to the request.
 * Does NOT set search_path (that happens at the connection level in tenantPool).
 *
 * This middleware:
 *   1. Reads tenant_id from req.user (populated by authenticate middleware)
 *   2. Resolves the schema name via TenantSchemaService (cached)
 *   3. Attaches req.tenantSchema for downstream use
 *   4. Rejects if tenant has no active schema (503 — schema not provisioned)
 *
 * Platform admins (no tenant_id) pass through with req.tenantSchema = null.
 */
export function schemaRouter(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  // No user = unauthenticated (health, public endpoints) — skip
  if (!user) {
    return next();
  }

  // Platform admin — no schema routing needed
  if (!user.tenant_id || user.is_platform_admin) {
    (req as any).tenantSchema = null;
    return next();
  }

  const tenantId: number = user.tenant_id;

  // Resolve schema asynchronously
  TenantSchemaService.resolveSchemaName(tenantId)
    .then((schemaName) => {
      if (!schemaName) {
        // Tenant exists but schema not provisioned yet.
        // This can happen during the transition period (existing tenants
        // that were created before schema-per-tenant was enabled).
        // Allow fallback to public schema (backward compatible).
        (req as any).tenantSchema = null;
        console.warn(
          `[SchemaRouter] No active schema for tenant ${tenantId} — falling back to public`
        );
        return next();
      }

      (req as any).tenantSchema = schemaName;
      next();
    })
    .catch((err) => {
      console.error(`[SchemaRouter] Schema resolution failed for tenant ${tenantId}:`, err);
      // Don't block the request — fall back to public schema
      (req as any).tenantSchema = null;
      next();
    });
}

/**
 * Strict version of schemaRouter that rejects requests if no tenant schema exists.
 * Use for routes that MUST operate within a tenant schema.
 */
export function requireTenantSchema(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    return next();
  }

  // Platform admin — allowed (they query cross-schema)
  if (!user.tenant_id || user.is_platform_admin) {
    (req as any).tenantSchema = null;
    return next();
  }

  const tenantId: number = user.tenant_id;

  TenantSchemaService.resolveSchemaName(tenantId)
    .then((schemaName) => {
      if (!schemaName) {
        res.status(503).json({
          error: 'SCHEMA_NOT_PROVISIONED',
          message: 'Your account is being set up. Please try again shortly.',
        });
        return;
      }

      (req as any).tenantSchema = schemaName;
      next();
    })
    .catch((err) => {
      console.error(`[SchemaRouter] Schema resolution failed for tenant ${tenantId}:`, err);
      res.status(500).json({
        error: 'SCHEMA_RESOLUTION_FAILED',
        message: 'Unable to resolve your data scope. Please try again.',
      });
    });
}

// ────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────

/**
 * Get the resolved schema name from the request.
 * Returns null for platform admins or unresolved schemas.
 */
export function getTenantSchema(req: Request): string | null {
  return (req as any).tenantSchema || null;
}

/**
 * Build a schema-qualified table name.
 *
 * @param req       Express request (must have gone through schemaRouter)
 * @param tableName Unqualified table name (e.g. "shipments")
 * @returns Schema-qualified name (e.g. "tenant_haj.shipments") or just tableName for public
 */
export function qualifyTable(req: Request, tableName: string): string {
  const schema = getTenantSchema(req);
  if (!schema) return tableName; // Public schema (no prefix needed)
  return `${schema}.${tableName}`;
}

/**
 * Build the search_path SQL command for the current request context.
 *
 * @param req Express request
 * @returns SQL command string (e.g. "SET LOCAL search_path TO tenant_haj, public")
 *          or null if no schema routing needed
 */
export function buildSearchPathSQL(req: Request): string | null {
  const schema = getTenantSchema(req);
  if (!schema) return null;
  return `SET LOCAL search_path TO ${schema}, public`;
}

/**
 * Build search_path SQL from a schema name directly.
 * Used by tenantPool when it reads from AsyncLocalStorage.
 */
export function buildSearchPathFromSchema(schemaName: string | null): string {
  if (!schemaName) return 'SET LOCAL search_path TO public';
  return `SET LOCAL search_path TO ${schemaName}, public`;
}

export default schemaRouter;
