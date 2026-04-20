/**
 * ============================================================================
 * API v1 Grouped Router — Architecture §11.1
 * ============================================================================
 * Canonical URL groups per §11.1:
 *
 *   /api/v1/platform/*   → Platform Admins (JWT scope=platform)
 *   /api/v1/tenant/*     → Tenant Users (JWT scope=tenant)
 *   /api/v1/auth/*       → Public/Auth (rate-limited)
 *   /api/v1/public/*     → Public (no authentication)
 *   /api/v1/webhooks/*   → External systems (API Key)
 *
 * Strategy:
 *   This router is mounted at /api/v1 and provides §11.1 group-prefixed access
 *   to ALL existing routes. It works alongside the flat /api/* routes for
 *   full backward compatibility.
 *
 * How it works:
 *   /api/v1/tenant/shipments    → routes to shipmentsRouter
 *   /api/v1/platform/tenants    → routes to tenantsRouter
 *   /api/v1/auth/login          → routes to authRouter
 *   /api/v1/public/countries    → routes to countriesRouter
 *   /api/v1/webhooks/shipment-update → routes to webhooksRouter
 *
 * Backward compat (via rewrite in app.ts):
 *   /api/v1/shipments           → still works (flat path, rewritten to /api/shipments)
 * ============================================================================
 */

import { Router } from 'express';

// ─────────────────────────────────────────────────
// Auth Group Routers
// ─────────────────────────────────────────────────
import authRouter from './auth';
import mfaRouter from './mfa';
import passwordResetRouter from './passwordReset';

// ─────────────────────────────────────────────────
// Public Group Routers (no auth required)
// ─────────────────────────────────────────────────
import lookupDataRouter from './lookupData';
import tenantsPublicRouter from './tenantsPublic';
import healthRouter from './health';
import healthDetailedRouter from './healthDetailed';

// ─────────────────────────────────────────────────
// Platform Group Routers (super admin / platform scope)
// ─────────────────────────────────────────────────
import platformUsersRouter from './platformUsers';
import platformDashboardRouter from './platformDashboard';
import platformSettingsRouter from './platformSettings';
import platformMonitoringRouter from './platformMonitoring';
import platformSuperAdminsRouter from './platformSuperAdmins';
import platformModulesRouter from './platformModules';
import platformTenantWizardRouter from './platformTenantWizard';
import platformImpersonationRouter from './platformImpersonation';
import platformTenantRequestsRouter from './platformTenantRequests';
import tenantsRouter from './tenants';
import subscriptionPlansRouter from './subscriptionPlans';
import tenantSchemasRouter from './tenantSchemas';
import impersonationGovernanceRouter from './impersonationGovernance';
import platformAuditRouter from './platformAudit';

// ─────────────────────────────────────────────────
// Webhook Group Router
// ─────────────────────────────────────────────────
import webhooksRouter from './webhooks';

const v1Router = Router();

// ═══════════════════════════════════════════════════
// §11.1 — AUTH GROUP: /api/v1/auth/*
// ═══════════════════════════════════════════════════
v1Router.use('/auth', authRouter);
v1Router.use('/auth', mfaRouter);
v1Router.use('/auth/password-reset', passwordResetRouter);

// ═══════════════════════════════════════════════════
// §11.1 — PUBLIC GROUP: /api/v1/public/*
// ═══════════════════════════════════════════════════
v1Router.use('/public/health', healthRouter);
v1Router.use('/public/health/detailed', healthDetailedRouter);
v1Router.use('/public/lookup', lookupDataRouter);
v1Router.use('/public/tenants', tenantsPublicRouter);

// ═══════════════════════════════════════════════════
// §11.1 — PLATFORM GROUP: /api/v1/platform/*
// ═══════════════════════════════════════════════════
v1Router.use('/platform/users', platformUsersRouter);
v1Router.use('/platform', platformDashboardRouter);
v1Router.use('/platform/settings', platformSettingsRouter);
v1Router.use('/platform/tenant-requests', platformTenantRequestsRouter);
v1Router.use('/platform/monitoring', platformMonitoringRouter);
v1Router.use('/platform/super-admins', platformSuperAdminsRouter);
v1Router.use('/platform/modules', platformModulesRouter);
v1Router.use('/platform/tenants/wizard', platformTenantWizardRouter);
v1Router.use('/platform/impersonation', platformImpersonationRouter);
v1Router.use('/platform/impersonation-logs', impersonationGovernanceRouter);
v1Router.use('/platform/tenants', tenantsRouter);
v1Router.use('/platform/subscription-plans', subscriptionPlansRouter);
v1Router.use('/platform/tenant-schemas', tenantSchemasRouter);
v1Router.use('/platform/audit', platformAuditRouter);

// ═══════════════════════════════════════════════════
// §11.1 — WEBHOOK GROUP: /api/v1/webhooks/*
// ═══════════════════════════════════════════════════
v1Router.use('/webhooks', webhooksRouter);

// ═══════════════════════════════════════════════════
// §11.1 — TENANT GROUP: /api/v1/tenant/*
// ═══════════════════════════════════════════════════
// Tenant routes are the bulk of the system. Instead of importing all ~200+
// routers here, we use URL rewriting in app.ts:
//   /api/v1/tenant/shipments → /api/shipments (where existing routes handle it)
//
// This middleware strips the /tenant prefix and forwards to app-level routes.
// It MUST be mounted last in this router (catch-all for /tenant/*).
v1Router.use('/tenant', (req, _res, next) => {
  // Tag as tenant-scope request
  (req as any).apiGroup = 'tenant';
  // The remaining URL after /tenant is already the resource path
  // e.g., /tenant/shipments → req.url = /shipments
  // Express already stripped /tenant from req.url via the mount point
  next('router'); // Skip back to app-level routing for the rewritten path
});

export default v1Router;
