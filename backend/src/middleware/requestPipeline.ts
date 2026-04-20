/**
 * ============================================================
 * Request Pipeline Orchestrator
 * ============================================================
 * 
 * Formalizes the 9-step request flow from Architecture Document §1.3:
 * 
 *   Step 1: Load Balancer / Nginx         → routing (external)
 *   Step 2: Rate Limiter                  → 100 req/min per IP → 429
 *   Step 3: JWT Middleware                → verify signature + expiry → 401
 *   Step 4: Tenant Extractor             → extract tenant_id from JWT → 403
 *   Step 5: Permission Guard             → check permission for route → 403
 *   Step 6: Data Scope Injector          → set WHERE tenant_id = ? → Internal
 *   Step 7: Business Logic               → execute handler → 400/422
 *   Step 8: Audit Logger                 → log operation → Fire & Forget
 *   Step 9: Response                     → return result
 * 
 * This file provides:
 *   1. `createSecureRoute()` — factory for creating routes with the full pipeline
 *   2. `pipelineMiddleware()` — composable middleware chains for common patterns
 *   3. `PipelineBuilder` — fluent API for building custom pipelines
 * 
 * Part of P0: Request Flow Architecture
 * ============================================================
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate } from './auth';
import { requirePermission, requireAnyPermission, requireHierarchy } from './rbac';
import { enforceTenantIsolation } from './tenantIsolation';
import { resolveCompanyContext } from './resolveCompanyContext';
import { preloadCompanyScope } from './companyScopeGuard';
import { dataScopeInjector } from './dataScopeInjector';
import { enforceSubscriptionStatus, enforceUserLimit, enforceCompanyLimit } from './subscriptionEnforcement';
import { requireModule, autoModuleGating } from './moduleGating';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteConfig {
  /** HTTP method */
  method: HttpMethod;
  /** Route path (e.g., '/', '/:id') */
  path: string;
  /** Required permission code (e.g., 'shipments:create') */
  permission?: string;
  /** Any of these permissions (OR logic) */
  anyPermission?: string[];
  /** Required module code (e.g., 'shipments', 'accounting') */
  module?: string;
  /** Minimum hierarchy level required */
  minHierarchy?: number;
  /** Skip authentication (public endpoint) */
  public?: boolean;
  /** Skip tenant isolation (platform-only endpoint) */
  skipTenantIsolation?: boolean;
  /** Skip subscription enforcement */
  skipSubscriptionCheck?: boolean;
  /** Additional middleware to run before handler */
  middleware?: RequestHandler[];
  /** The route handler */
  handler: RequestHandler | RequestHandler[];
  /** Rate limit override for this route */
  rateLimit?: RequestHandler;
  /** Enforce user creation limit */
  enforceUserLimit?: boolean;
  /** Enforce company creation limit */
  enforceCompanyLimit?: boolean;
}

// ────────────────────────────────────────────
// Pipeline Builder — Fluent API
// ────────────────────────────────────────────

/**
 * Fluent builder for constructing middleware pipelines.
 * 
 * Usage:
 *   const pipeline = new PipelineBuilder()
 *     .authenticate()
 *     .requirePermission('shipments:create')
 *     .injectScope()
 *     .build();
 * 
 *   router.post('/shipments', ...pipeline, handler);
 */
export class PipelineBuilder {
  private middlewares: RequestHandler[] = [];

  /** Step 3: JWT Authentication */
  authenticate(): PipelineBuilder {
    this.middlewares.push(authenticate);
    return this;
  }

  /** Step 4: Tenant Context Extraction (auto via enforceTenantIsolation) */
  extractTenant(): PipelineBuilder {
    this.middlewares.push(enforceTenantIsolation);
    return this;
  }

  /** Step 5: Permission Guard (single permission) */
  requirePermission(permission: string): PipelineBuilder {
    this.middlewares.push(requirePermission(permission) as any);
    return this;
  }

  /** Step 5: Permission Guard (any of multiple permissions) */
  requireAnyPermission(permissions: string[]): PipelineBuilder {
    this.middlewares.push(requireAnyPermission(permissions) as any);
    return this;
  }

  /** Step 5a: Module Gating — check if module is enabled for tenant */
  requireModule(moduleCode: string): PipelineBuilder {
    this.middlewares.push(requireModule(moduleCode) as any);
    return this;
  }

  /** Step 5b: Hierarchy Guard — require minimum role hierarchy level */
  requireHierarchy(minLevel: number): PipelineBuilder {
    this.middlewares.push(requireHierarchy(minLevel) as any);
    return this;
  }

  /** Step 5.5: Subscription Status Check */
  checkSubscription(): PipelineBuilder {
    this.middlewares.push(enforceSubscriptionStatus);
    return this;
  }

  /** Step 5.5: User Limit Enforcement */
  checkUserLimit(): PipelineBuilder {
    this.middlewares.push(enforceUserLimit);
    return this;
  }

  /** Step 5.5: Company Limit Enforcement */
  checkCompanyLimit(): PipelineBuilder {
    this.middlewares.push(enforceCompanyLimit);
    return this;
  }

  /** Step 6: Data Scope Injection (tenant context → AsyncLocalStorage → RLS) */
  injectScope(): PipelineBuilder {
    this.middlewares.push(resolveCompanyContext);
    this.middlewares.push(preloadCompanyScope);
    this.middlewares.push(dataScopeInjector);
    return this;
  }

  /** Add custom middleware */
  use(middleware: RequestHandler): PipelineBuilder {
    this.middlewares.push(middleware);
    return this;
  }

  /** Build the middleware array */
  build(): RequestHandler[] {
    return [...this.middlewares];
  }
}

// ────────────────────────────────────────────
// Pre-built Pipeline Templates
// ────────────────────────────────────────────

/**
 * Standard authenticated + scoped pipeline (most common).
 * Steps: authenticate → tenant isolation → company context → scope injection
 */
export function standardPipeline(): RequestHandler[] {
  return new PipelineBuilder()
    .authenticate()
    .extractTenant()
    .checkSubscription()
    .injectScope()
    .build();
}

/**
 * Permission-protected pipeline (for RBAC-guarded routes).
 * Steps: authenticate → tenant → permission → subscription → scope
 */
export function permissionPipeline(permission: string): RequestHandler[] {
  return new PipelineBuilder()
    .authenticate()
    .extractTenant()
    .requirePermission(permission)
    .checkSubscription()
    .injectScope()
    .build();
}

/**
 * Read-only pipeline (GET requests — skip subscription mutation check).
 * Steps: authenticate → tenant → permission → scope
 */
export function readOnlyPipeline(permission?: string): RequestHandler[] {
  const builder = new PipelineBuilder()
    .authenticate()
    .extractTenant();
  
  if (permission) {
    builder.requirePermission(permission);
  }
  
  builder.injectScope();
  return builder.build();
}

/**
 * Platform admin pipeline (super admin only, no tenant isolation).
 * Steps: authenticate → (platform admin check via route middleware)
 */
export function platformPipeline(): RequestHandler[] {
  return [authenticate];
}

/**
 * Module-gated pipeline (check module enabled + permission).
 * Steps: authenticate → tenant → module → permission → subscription → scope
 */
export function modulePipeline(moduleCode: string, permission?: string): RequestHandler[] {
  const builder = new PipelineBuilder()
    .authenticate()
    .extractTenant()
    .requireModule(moduleCode);

  if (permission) {
    builder.requirePermission(permission);
  }

  builder.checkSubscription().injectScope();
  return builder.build();
}

// ────────────────────────────────────────────
// Route Factory — createSecureRoute
// ────────────────────────────────────────────

/**
 * Factory function to create a route with the full security pipeline.
 * 
 * Usage:
 *   const router = createSecureRouter();
 *   
 *   router.secureRoute({
 *     method: 'post',
 *     path: '/',
 *     permission: 'shipments:create',
 *     handler: async (req, res) => { ... }
 *   });
 */
export function createSecureRouter() {
  const router = Router();

  function secureRoute(config: RouteConfig): void {
    const middlewares: RequestHandler[] = [];

    // Step 2: Rate limiting (optional override)
    if (config.rateLimit) {
      middlewares.push(config.rateLimit);
    }

    // Step 3: Authentication
    if (!config.public) {
      middlewares.push(authenticate);
    }

    // Step 4: Tenant Isolation
    if (!config.public && !config.skipTenantIsolation) {
      middlewares.push(enforceTenantIsolation);
    }

    // Step 5: Permission Guard
    if (config.permission) {
      middlewares.push(requirePermission(config.permission) as any);
    } else if (config.anyPermission) {
      middlewares.push(requireAnyPermission(config.anyPermission) as any);
    }

    // Step 5a: Module Gating
    if (config.module) {
      middlewares.push(requireModule(config.module) as any);
    }

    // Step 5b: Hierarchy Guard
    if (config.minHierarchy !== undefined) {
      middlewares.push(requireHierarchy(config.minHierarchy) as any);
    }

    // Step 5.5: Subscription Enforcement
    if (!config.public && !config.skipSubscriptionCheck) {
      middlewares.push(enforceSubscriptionStatus);
    }

    // Step 5.5: Resource Limits
    if (config.enforceUserLimit) {
      middlewares.push(enforceUserLimit);
    }
    if (config.enforceCompanyLimit) {
      middlewares.push(enforceCompanyLimit);
    }

    // Step 6: Data Scope Injection
    if (!config.public) {
      middlewares.push(resolveCompanyContext);
      middlewares.push(preloadCompanyScope);
      middlewares.push(dataScopeInjector);
    }

    // Additional custom middleware
    if (config.middleware) {
      middlewares.push(...config.middleware);
    }

    // Step 7: Business Logic (handler)
    const handlers = Array.isArray(config.handler) ? config.handler : [config.handler];

    // Register route
    (router as any)[config.method](config.path, ...middlewares, ...handlers);

    logger.debug(`Route registered: ${config.method.toUpperCase()} ${config.path}`, {
      permission: config.permission || config.anyPermission,
      public: config.public,
      middlewareCount: middlewares.length,
    });
  }

  return Object.assign(router, { secureRoute });
}

// ────────────────────────────────────────────
// Pipeline Diagnostic Middleware
// ────────────────────────────────────────────

/**
 * Diagnostic middleware that logs the pipeline execution steps.
 * Add to routes during development for debugging:
 * 
 *   router.get('/debug', pipelineDiagnostic, authenticate, handler);
 */
export function pipelineDiagnostic(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const diagnostics: { step: string; time: number }[] = [];

  // Instrument response
  const originalEnd = res.end.bind(res);
  (res as any).end = function(...args: any[]) {
    diagnostics.push({ step: 'response', time: Date.now() - startTime });
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Pipeline diagnostics', {
        path: req.path,
        method: req.method,
        totalMs: Date.now() - startTime,
        steps: diagnostics,
        statusCode: res.statusCode,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
      });
    }
    
    return originalEnd(...args);
  };

  diagnostics.push({ step: 'start', time: 0 });
  next();
}

// ────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────
export {
  RouteConfig,
  HttpMethod,
};
