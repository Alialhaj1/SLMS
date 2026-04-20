/**
 * ============================================================
 * Subscription Enforcement Middleware
 * ============================================================
 * 
 * Architecture Document Section 1.3 — Request Flow Step 5
 * Enforces subscription plan limits:
 *   - max_users:      blocks user creation when limit reached
 *   - max_companies:  blocks company creation when limit reached 
 *   - status checks:  blocks all mutations on expired subscriptions
 *   - feature gates:  blocks access to premium features
 * 
 * Works with:
 *   - tenants table:            plan, status, max_users, max_companies
 *   - subscription_plans table: features, limits
 * 
 * Part of P1: Platform Layer
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Cache for tenant subscription limits
// ────────────────────────────────────────────
interface TenantLimits {
  tenantId: number;
  plan: string;
  status: string;
  maxUsers: number;
  maxCompanies: number;
  maxBranches: number;
  maxStorageMb: number;
  currentUsers: number;
  currentCompanies: number;
  expiresAt: Date | null;
  fetchedAt: number;
}

const limitsCache = new Map<number, TenantLimits>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getTenantLimits(tenantId: number): Promise<TenantLimits | null> {
  // Check cache
  const cached = limitsCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    // Fetch tenant limits + current usage in a single query
    const result = await pool.query(`
      SELECT 
        t.id AS tenant_id,
        COALESCE(t.plan, 'basic') AS plan,
        COALESCE(t.status, 'active') AS status,
        COALESCE(t.max_users, 999) AS max_users,
        COALESCE(t.max_companies, 999) AS max_companies,
        COALESCE(sp.max_branches, 999) AS max_branches,
        COALESCE(sp.max_storage_mb, 10240) AS max_storage_mb,
        COALESCE(sp.expires_at, NULL) AS expires_at,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_users,
        (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_companies
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      WHERE t.id = $1
    `, [tenantId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const limits: TenantLimits = {
      tenantId,
      plan: row.plan,
      status: row.status,
      maxUsers: parseInt(row.max_users) || 999,
      maxCompanies: parseInt(row.max_companies) || 999,
      maxBranches: parseInt(row.max_branches) || 999,
      maxStorageMb: parseInt(row.max_storage_mb) || 10240,
      currentUsers: parseInt(row.current_users) || 0,
      currentCompanies: parseInt(row.current_companies) || 0,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      fetchedAt: Date.now(),
    };

    limitsCache.set(tenantId, limits);
    return limits;
  } catch (error) {
    // If subscription_plans table doesn't exist yet, return defaults
    if ((error as any)?.code === '42P01') {
      const defaults: TenantLimits = {
        tenantId,
        plan: 'basic',
        status: 'active',
        maxUsers: 999,
        maxCompanies: 999,
        maxBranches: 999,
        maxStorageMb: 10240,
        currentUsers: 0,
        currentCompanies: 0,
        expiresAt: null,
        fetchedAt: Date.now(),
      };
      limitsCache.set(tenantId, defaults);
      return defaults;
    }
    logger.error('Failed to fetch tenant limits', { tenantId, error });
    return null;
  }
}

/**
 * Invalidate cached limits (call after user/company creation/deletion)
 */
export function invalidateTenantLimits(tenantId: number): void {
  limitsCache.delete(tenantId);
}

// ────────────────────────────────────────────
// Subscription Status Enforcement
// ────────────────────────────────────────────

/**
 * Blocks ALL write operations for expired/cancelled subscriptions.
 * Allows read-only access for data retrieval.
 */
export function enforceSubscriptionStatus(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || !user.tenant_id) return next(); // Platform admins bypass

  const tenantId = user.tenant_id;
  
  // Only block mutations (GET/HEAD/OPTIONS pass through)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  getTenantLimits(tenantId).then(limits => {
    if (!limits) return next();

    // Check subscription expiry
    if (limits.expiresAt && limits.expiresAt < new Date()) {
      return res.status(402).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please renew to continue.',
        message_ar: 'انتهى اشتراكك. يرجى التجديد للمتابعة.',
        plan: limits.plan,
        expiresAt: limits.expiresAt.toISOString(),
      });
    }

    // Check subscription status
    if (['cancelled', 'terminated'].includes(limits.status)) {
      return res.status(402).json({
        error: 'SUBSCRIPTION_CANCELLED',
        message: 'Your subscription has been cancelled. Contact support.',
        message_ar: 'تم إلغاء اشتراكك. تواصل مع الدعم.',
        status: limits.status,
      });
    }

    next();
  }).catch(() => next());
}

// ────────────────────────────────────────────
// Resource Limit Enforcement
// ────────────────────────────────────────────

/**
 * Checks if the tenant has reached their user limit.
 * Apply to: POST /api/users (user creation routes only)
 */
export function enforceUserLimit(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || !user.tenant_id) return next();

  // Only check on POST (creation)
  if (req.method !== 'POST') return next();

  getTenantLimits(user.tenant_id).then(limits => {
    if (!limits) return next();

    if (limits.currentUsers >= limits.maxUsers) {
      logger.warn('User limit reached', {
        tenantId: user.tenant_id,
        current: limits.currentUsers,
        max: limits.maxUsers,
        plan: limits.plan,
      });

      return res.status(403).json({
        error: 'USER_LIMIT_REACHED',
        message: `Maximum users (${limits.maxUsers}) reached for your ${limits.plan} plan. Upgrade to add more users.`,
        message_ar: `تم الوصول للحد الأقصى من المستخدمين (${limits.maxUsers}) لخطتك (${limits.plan}). قم بالترقية لإضافة المزيد.`,
        current: limits.currentUsers,
        limit: limits.maxUsers,
        plan: limits.plan,
      });
    }

    next();
  }).catch(() => next());
}

/**
 * Checks if the tenant has reached their company limit.
 * Apply to: POST /api/companies, POST /api/tenant/companies
 */
export function enforceCompanyLimit(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || !user.tenant_id) return next();

  if (req.method !== 'POST') return next();

  getTenantLimits(user.tenant_id).then(limits => {
    if (!limits) return next();

    if (limits.currentCompanies >= limits.maxCompanies) {
      logger.warn('Company limit reached', {
        tenantId: user.tenant_id,
        current: limits.currentCompanies,
        max: limits.maxCompanies,
        plan: limits.plan,
      });

      return res.status(403).json({
        error: 'COMPANY_LIMIT_REACHED',
        message: `Maximum companies (${limits.maxCompanies}) reached for your ${limits.plan} plan. Upgrade to add more.`,
        message_ar: `تم الوصول للحد الأقصى من الشركات (${limits.maxCompanies}) لخطتك (${limits.plan}). قم بالترقية لإضافة المزيد.`,
        current: limits.currentCompanies,
        limit: limits.maxCompanies,
        plan: limits.plan,
      });
    }

    next();
  }).catch(() => next());
}

// ────────────────────────────────────────────
// Feature Gate Middleware
// ────────────────────────────────────────────

/**
 * Factory: Create a middleware that blocks access based on plan features.
 * 
 * Usage:
 *   router.post('/reports/custom', requireFeature('custom_reports'), handler);
 *   router.get('/ai/suggestions',  requireFeature('ai_features'), handler);
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.tenant_id) return next(); // Platform admins bypass

    try {
      const result = await pool.query(`
        SELECT sp.features
        FROM tenants t
        JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.id = $1
      `, [user.tenant_id]);

      if (result.rows.length === 0) return next(); // No plan = allow

      const features = result.rows[0].features;
      
      // features is JSONB: { "custom_reports": true, "ai_features": false, ... }
      if (features && features[featureName] === false) {
        return res.status(403).json({
          error: 'FEATURE_NOT_AVAILABLE',
          message: `This feature (${featureName}) is not available on your plan.`,
          message_ar: `هذه الميزة (${featureName}) غير متاحة في خطتك الحالية.`,
          feature: featureName,
          upgrade_url: '/settings/subscription',
        });
      }

      next();
    } catch {
      next(); // Allow on error (graceful degradation)
    }
  };
}

// ────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────
export default {
  enforceSubscriptionStatus,
  enforceUserLimit,
  enforceCompanyLimit,
  requireFeature,
  invalidateTenantLimits,
};
