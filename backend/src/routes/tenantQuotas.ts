/**
 * ============================================================
 * Tenant Quotas & Usage Routes
 * ============================================================
 * 
 * Provides real-time quota usage for tenants:
 *   - Current usage vs. plan limits
 *   - Usage history and trends
 *   - Quota warnings and alerts
 * 
 * Accessible by:
 *   - Tenant admins: view their own tenant's quotas
 *   - Platform admins: view any tenant's quotas
 * 
 * Part of P1: Platform Layer
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// GET /api/tenant-quotas — Current tenant's quota usage
// ────────────────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenant_id;

    if (!tenantId) {
      // Platform admin — show all tenants overview
      const result = await pool.query(`
        SELECT 
          t.id, t.name, t.company_code, t.status,
          sp.name AS plan_name, sp.code AS plan_code,
          COALESCE(t.max_users, sp.max_users, 999) AS max_users,
          COALESCE(t.max_companies, sp.max_companies, 999) AS max_companies,
          COALESCE(sp.max_branches, 999) AS max_branches,
          COALESCE(sp.max_storage_mb, 10240) AS max_storage_mb,
          (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_users,
          (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_companies,
          (SELECT COUNT(*) FROM branches b JOIN companies c ON b.company_id = c.id WHERE c.tenant_id = t.id AND b.deleted_at IS NULL) AS current_branches
        FROM tenants t
        LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.deleted_at IS NULL
        ORDER BY t.name
      `);

      return sendSuccess(res, {
        tenants: result.rows.map(r => ({
          ...r,
          usage: {
            users: { current: parseInt(r.current_users), limit: parseInt(r.max_users), percentage: Math.round((parseInt(r.current_users) / parseInt(r.max_users)) * 100) },
            companies: { current: parseInt(r.current_companies), limit: parseInt(r.max_companies), percentage: Math.round((parseInt(r.current_companies) / parseInt(r.max_companies)) * 100) },
            branches: { current: parseInt(r.current_branches), limit: parseInt(r.max_branches), percentage: Math.round((parseInt(r.current_branches) / parseInt(r.max_branches)) * 100) },
          },
        })),
      });
    }

    // Tenant user — show own quotas
    const result = await pool.query(`
      SELECT 
        t.id, t.name, t.status,
        sp.name AS plan_name, sp.code AS plan_code,
        sp.features,
        COALESCE(t.max_users, sp.max_users, 999) AS max_users,
        COALESCE(t.max_companies, sp.max_companies, 999) AS max_companies,
        COALESCE(sp.max_branches, 999) AS max_branches,
        COALESCE(sp.max_storage_mb, 10240) AS max_storage_mb,
        COALESCE(sp.max_api_calls_per_day, 10000) AS max_api_calls,
        t.subscription_expires_at,
        t.trial_ends_at,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_users,
        (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_companies,
        (SELECT COUNT(*) FROM branches b JOIN companies c ON b.company_id = c.id WHERE c.tenant_id = t.id AND b.deleted_at IS NULL) AS current_branches,
        (SELECT COUNT(*) FROM roles WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_roles
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      WHERE t.id = $1
    `, [tenantId]);

    if (result.rows.length === 0) {
      return sendError(res, 'TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    const t = result.rows[0];

    sendSuccess(res, {
      tenant: {
        id: t.id,
        name: t.name,
        status: t.status,
        plan: {
          name: t.plan_name,
          code: t.plan_code,
          features: t.features || {},
        },
        subscription: {
          expiresAt: t.subscription_expires_at,
          trialEndsAt: t.trial_ends_at,
        },
      },
      quotas: {
        users: {
          current: parseInt(t.current_users),
          limit: parseInt(t.max_users),
          percentage: Math.round((parseInt(t.current_users) / parseInt(t.max_users)) * 100),
          remaining: parseInt(t.max_users) - parseInt(t.current_users),
        },
        companies: {
          current: parseInt(t.current_companies),
          limit: parseInt(t.max_companies),
          percentage: Math.round((parseInt(t.current_companies) / parseInt(t.max_companies)) * 100),
          remaining: parseInt(t.max_companies) - parseInt(t.current_companies),
        },
        branches: {
          current: parseInt(t.current_branches),
          limit: parseInt(t.max_branches),
          percentage: Math.round((parseInt(t.current_branches) / parseInt(t.max_branches)) * 100),
          remaining: parseInt(t.max_branches) - parseInt(t.current_branches),
        },
        storage: {
          current: 0, // TODO: Calculate from uploads
          limit: parseInt(t.max_storage_mb),
          percentage: 0,
          remaining: parseInt(t.max_storage_mb),
        },
        apiCalls: {
          current: 0, // TODO: Track from rate limiter
          limit: parseInt(t.max_api_calls),
          percentage: 0,
          remaining: parseInt(t.max_api_calls),
        },
      },
      warnings: generateWarnings(t),
    });
  } catch (error) {
    logger.error('Tenant quotas error', { error });
    sendError(res, 'QUOTAS_ERROR', 'Failed to load quotas', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/tenant-quotas/:tenantId — Specific tenant quotas (platform admin)
// ────────────────────────────────────────────
router.get('/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const requestedTenantId = parseInt(req.params.tenantId);

    // Only platform admins can view other tenants' quotas
    if (user.tenant_id && user.tenant_id !== requestedTenantId) {
      return sendError(res, 'ACCESS_DENIED', 'Access denied', 403);
    }

    const result = await pool.query(`
      SELECT 
        t.id, t.name, t.company_code, t.status,
        sp.name AS plan_name, sp.code AS plan_code, sp.features,
        COALESCE(t.max_users, sp.max_users, 999) AS max_users,
        COALESCE(t.max_companies, sp.max_companies, 999) AS max_companies,
        COALESCE(sp.max_branches, 999) AS max_branches,
        COALESCE(sp.max_storage_mb, 10240) AS max_storage_mb,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_users,
        (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id AND deleted_at IS NULL) AS current_companies,
        (SELECT COUNT(*) FROM branches b JOIN companies c ON b.company_id = c.id WHERE c.tenant_id = t.id AND b.deleted_at IS NULL) AS current_branches
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      WHERE t.id = $1
    `, [requestedTenantId]);

    if (result.rows.length === 0) {
      return sendError(res, 'TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    const t = result.rows[0];
    sendSuccess(res, {
      tenant: { id: t.id, name: t.name, code: t.company_code, status: t.status },
      plan: { name: t.plan_name, code: t.plan_code, features: t.features },
      usage: {
        users: { current: parseInt(t.current_users), limit: parseInt(t.max_users) },
        companies: { current: parseInt(t.current_companies), limit: parseInt(t.max_companies) },
        branches: { current: parseInt(t.current_branches), limit: parseInt(t.max_branches) },
      },
    });
  } catch (error) {
    logger.error('Tenant quota detail error', { error });
    sendError(res, 'QUOTA_DETAIL_ERROR', 'Failed to load tenant quota', 500);
  }
});

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
function generateWarnings(t: any): { level: string; message: string; message_ar: string }[] {
  const warnings: { level: string; message: string; message_ar: string }[] = [];
  const userPct = (parseInt(t.current_users) / parseInt(t.max_users)) * 100;
  const companyPct = (parseInt(t.current_companies) / parseInt(t.max_companies)) * 100;

  if (userPct >= 90) {
    warnings.push({
      level: userPct >= 100 ? 'critical' : 'warning',
      message: `User limit at ${Math.round(userPct)}% (${t.current_users}/${t.max_users})`,
      message_ar: `حد المستخدمين ${Math.round(userPct)}% (${t.current_users}/${t.max_users})`,
    });
  }

  if (companyPct >= 90) {
    warnings.push({
      level: companyPct >= 100 ? 'critical' : 'warning',
      message: `Company limit at ${Math.round(companyPct)}% (${t.current_companies}/${t.max_companies})`,
      message_ar: `حد الشركات ${Math.round(companyPct)}% (${t.current_companies}/${t.max_companies})`,
    });
  }

  if (t.subscription_expires_at) {
    const daysLeft = Math.ceil((new Date(t.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      warnings.push({ level: 'critical', message: 'Subscription expired', message_ar: 'انتهى الاشتراك' });
    } else if (daysLeft <= 7) {
      warnings.push({ level: 'warning', message: `Subscription expires in ${daysLeft} days`, message_ar: `ينتهي الاشتراك خلال ${daysLeft} أيام` });
    } else if (daysLeft <= 30) {
      warnings.push({ level: 'info', message: `Subscription expires in ${daysLeft} days`, message_ar: `ينتهي الاشتراك خلال ${daysLeft} يوم` });
    }
  }

  if (t.trial_ends_at) {
    const trialDaysLeft = Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (trialDaysLeft > 0 && trialDaysLeft <= 3) {
      warnings.push({ level: 'warning', message: `Trial ends in ${trialDaysLeft} days`, message_ar: `تنتهي الفترة التجريبية خلال ${trialDaysLeft} أيام` });
    }
  }

  return warnings;
}

export default router;
