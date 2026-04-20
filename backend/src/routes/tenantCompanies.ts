/**
 * ============================================================================
 * Tenant Companies Routes — §6.2 Company Profile (Read-Only)
 * ============================================================================
 *
 * Provides read-only views of:
 *   - Tenant profile (name, plan, subscription, limits/usage)
 *   - Companies under the tenant
 *   - Enabled modules
 *   - Subscription details
 *
 * All data is READ-ONLY for tenant users.
 * Company/plan changes require platform admin action.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireTenantUser } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { logger } from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// GET /api/tenant/companies/profile
// Tenant profile overview (name, plan, status, usage stats)
// ────────────────────────────────────────────
router.get(
  '/profile',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_profile:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      // Fetch tenant with subscription plan
      const tenantResult = await pool.query(
        `SELECT
           t.id,
           t.company_code,
           t.name,
           t.name_ar,
           t.plan,
           t.status,
           t.slug,
           t.logo_url,
           t.primary_color,
           t.secondary_color,
           t.max_users,
           t.max_companies,
           t.settings,
           t.created_at,
           sp.plan_name AS plan_name,
           sp.description AS plan_description,
           sp.max_users AS plan_max_users,
           sp.max_companies AS plan_max_companies,
           sp.max_branches AS plan_max_branches,
           sp.max_storage_mb AS plan_max_storage_mb,
           sp.features AS plan_features,
           sp.price_monthly,
           sp.price_yearly
         FROM tenants t
         LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
         WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return sendError(res, 'TENANT_NOT_FOUND', 'Tenant not found', 404);
      }

      const tenant = tenantResult.rows[0];

      // Fetch usage statistics
      const [usersCount, companiesCount, branchesCount] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM users
           WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM companies
           WHERE tenant_id = $1 AND deleted_at IS NULL`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM branches b
           JOIN companies c ON c.id = b.company_id
           WHERE c.tenant_id = $1 AND b.deleted_at IS NULL`,
          [tenantId]
        ),
      ]);

      // Fetch enabled modules
      const modulesResult = await pool.query(
        `SELECT
           m.module_code,
           m.module_name,
           m.name_ar,
           m.description,
           m.description_ar,
           m.icon_name,
           m.category,
           m.is_core,
           tm.is_enabled,
           tm.created_at AS enabled_at
         FROM tenant_modules tm
         JOIN modules m ON m.module_code = tm.module_code
         WHERE tm.tenant_id = $1 AND tm.is_enabled = true AND m.is_active = true
         ORDER BY m.sort_order, m.module_name`,
        [tenantId]
      );

      const profile = {
        tenant: {
          id: tenant.id,
          companyCode: tenant.company_code,
          name: tenant.name,
          nameAr: tenant.name_ar,
          status: tenant.status,
          slug: tenant.slug,
          logoUrl: tenant.logo_url,
          primaryColor: tenant.primary_color,
          secondaryColor: tenant.secondary_color,
          createdAt: tenant.created_at,
        },
        subscription: {
          plan: tenant.plan,
          planName: tenant.plan_name,
          planDescription: tenant.plan_description,
          priceMonthly: tenant.price_monthly,
          priceYearly: tenant.price_yearly,
          features: tenant.plan_features || {},
        },
        limits: {
          maxUsers: tenant.max_users || tenant.plan_max_users,
          maxCompanies: tenant.max_companies || tenant.plan_max_companies,
          maxBranches: tenant.plan_max_branches,
          maxStorageMb: tenant.plan_max_storage_mb,
        },
        usage: {
          currentUsers: parseInt(usersCount.rows[0]?.count || '0'),
          currentCompanies: parseInt(companiesCount.rows[0]?.count || '0'),
          currentBranches: parseInt(branchesCount.rows[0]?.count || '0'),
        },
        modules: modulesResult.rows.map((m: any) => ({
          code: m.module_code,
          name: m.module_name,
          nameAr: m.name_ar,
          description: m.description,
          descriptionAr: m.description_ar,
          icon: m.icon_name,
          category: m.category,
          isCore: m.is_core,
          enabledAt: m.enabled_at,
        })),
      };

      return sendSuccess(res, profile, 200, undefined, 'Tenant profile retrieved');
    } catch (error) {
      logger.error('Error fetching tenant profile:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch tenant profile', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant/companies
// List all companies under this tenant (read-only)
// ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('companies:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();

      let whereClause = 'WHERE c.tenant_id = $1 AND c.deleted_at IS NULL';
      const params: any[] = [tenantId];

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (c.name ILIKE $${params.length} OR c.code ILIKE $${params.length} OR c.name_ar ILIKE $${params.length})`;
      }

      const [countResult, dataResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM companies c ${whereClause}`,
          params
        ),
        pool.query(
          `SELECT
             c.id,
             c.code,
             c.name,
             c.name_ar,
             c.legal_name,
             c.tax_number,
             c.registration_number,
             c.country,
             c.city,
             c.address,
             c.phone,
             c.email,
             c.website,
             c.currency,
             c.is_active,
             c.is_default,
             c.logo_url,
             c.created_at,
             c.updated_at,
             (SELECT COUNT(*) FROM branches b WHERE b.company_id = c.id AND b.deleted_at IS NULL) AS branch_count,
             (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.deleted_at IS NULL AND u.status = 'active') AS user_count
           FROM companies c
           ${whereClause}
           ORDER BY c.is_default DESC, c.name ASC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.total || '0');

      return sendSuccess(res, dataResult.rows, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error('Error fetching tenant companies:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch companies', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant/companies/modules
// List enabled modules for this tenant
// (MUST be before /:id to avoid Express matching "modules" as :id)
// ────────────────────────────────────────────
router.get(
  '/modules',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_profile:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const result = await pool.query(
        `SELECT
           m.module_code,
           m.module_name,
           m.name_ar,
           m.description,
           m.description_ar,
           m.icon_name,
           m.category,
           m.is_core,
           m.sort_order,
           tm.is_enabled,
           tm.created_at AS enabled_at,
           (SELECT COUNT(*) FROM permissions p
            WHERE p.module_code = m.module_code AND p.domain IN ('tenant', 'shared')
           ) AS permission_count
         FROM modules m
         LEFT JOIN tenant_modules tm ON tm.module_code = m.module_code AND tm.tenant_id = $1
         WHERE m.is_active = true
         ORDER BY m.sort_order, m.module_name`,
        [tenantId]
      );

      const modules = result.rows.map((m: any) => ({
        code: m.module_code,
        name: m.module_name,
        nameAr: m.name_ar,
        description: m.description,
        descriptionAr: m.description_ar,
        icon: m.icon_name,
        category: m.category,
        isCore: m.is_core,
        isEnabled: m.is_enabled === true,
        enabledAt: m.enabled_at,
        permissionCount: parseInt(m.permission_count || '0'),
      }));

      return sendSuccess(res, modules);
    } catch (error) {
      logger.error('Error fetching tenant modules:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch modules', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant/companies/subscription
// Subscription details + usage metrics
// (MUST be before /:id to avoid Express matching "subscription" as :id)
// ────────────────────────────────────────────
router.get(
  '/subscription',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_profile:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const tenantResult = await pool.query(
        `SELECT
           t.id,
           t.plan,
           t.status,
           t.max_users,
           t.max_companies,
           t.created_at AS tenant_created_at,
           sp.id AS plan_id,
           sp.plan_name AS plan_name,
           sp.description AS plan_description,
           sp.max_users AS plan_max_users,
           sp.max_companies AS plan_max_companies,
           sp.max_branches AS plan_max_branches,
           sp.max_storage_mb AS plan_max_storage_mb,
           sp.features,
           sp.price_monthly,
           sp.price_yearly
         FROM tenants t
         LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
         WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return sendError(res, 'TENANT_NOT_FOUND', 'Tenant not found', 404);
      }

      const t = tenantResult.rows[0];

      // Fetch current usage
      const [users, companies, branches] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM companies WHERE tenant_id = $1 AND deleted_at IS NULL`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM branches b
           JOIN companies c ON c.id = b.company_id
           WHERE c.tenant_id = $1 AND b.deleted_at IS NULL`,
          [tenantId]
        ),
      ]);

      // Fetch subscription history (last 10 changes)
      let history: any[] = [];
      try {
        const historyResult = await pool.query(
          `SELECT id, change_type, old_plan_id, new_plan_id, reason, changed_by, created_at
           FROM subscription_history
           WHERE tenant_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [tenantId]
        );
        history = historyResult.rows;
      } catch {
        // subscription_history may not exist yet
      }

      const subscription = {
        plan: {
          id: t.plan_id,
          code: t.plan,
          name: t.plan_name,
          description: t.plan_description,
          priceMonthly: t.price_monthly,
          priceYearly: t.price_yearly,
          features: t.features || {},
        },
        status: t.status,
        limits: {
          maxUsers: t.max_users || t.plan_max_users,
          maxCompanies: t.max_companies || t.plan_max_companies,
          maxBranches: t.plan_max_branches,
          maxStorageMb: t.plan_max_storage_mb,
        },
        usage: {
          currentUsers: parseInt(users.rows[0]?.count || '0'),
          currentCompanies: parseInt(companies.rows[0]?.count || '0'),
          currentBranches: parseInt(branches.rows[0]?.count || '0'),
        },
        history,
      };

      return sendSuccess(res, subscription);
    } catch (error) {
      logger.error('Error fetching subscription details:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch subscription', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant/companies/:id
// Single company detail (read-only)
// ────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('companies:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return sendError(res, 'INVALID_ID', 'Invalid company ID', 400);
      }

      const result = await pool.query(
        `SELECT
           c.*,
           (SELECT COUNT(*) FROM branches b WHERE b.company_id = c.id AND b.deleted_at IS NULL) AS branch_count,
           (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.deleted_at IS NULL AND u.status = 'active') AS user_count
         FROM companies c
         WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
        [companyId, tenantId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'COMPANY_NOT_FOUND', 'Company not found', 404);
      }

      return sendSuccess(res, result.rows[0]);
    } catch (error) {
      logger.error('Error fetching company detail:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch company', 500);
    }
  }
);

export default router;
