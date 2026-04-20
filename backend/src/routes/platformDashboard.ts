/**
 * ============================================================
 * Platform Admin Dashboard Routes
 * ============================================================
 * 
 * Architecture Document Section 5: Platform Layer
 * "إدارة كاملة للمنصة والعملاء والبيانات المرجعية"
 * 
 * Platform Admin (admin.slms.sa) screens:
 *   - Dashboard overview with KPIs
 *   - Tenant analytics (active, trial, expired)
 *   - Revenue metrics
 *   - System health metrics
 *   - User growth trends
 *   - Storage usage per tenant
 * 
 * Access: Platform admins only (tenant_id = null, super_admin/platform_admin)
 * 
 * Part of P1: Platform Layer
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePlatformUser } from '../middleware/rbac';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// All platform routes require platform user (tenant_id = null)
router.use(authenticate, requirePlatformUser as any);

// ────────────────────────────────────────────
// GET /api/platform/dashboard — Main overview KPIs
// ────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Parallel queries for performance
    const [
      tenantStats,
      userStats,
      revenueStats,
      recentActivity,
      planDistribution,
      growthTrend,
    ] = await Promise.all([
      // Tenant KPIs
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active_tenants,
          COUNT(*) FILTER (WHERE status = 'trial') AS trial_tenants,
          COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_tenants,
          COUNT(*) FILTER (WHERE status = 'locked') AS locked_tenants,
          COUNT(*) FILTER (WHERE status = 'terminated') AS terminated_tenants,
          COUNT(*) AS total_tenants,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS new_this_week
        FROM tenants
        WHERE deleted_at IS NULL
      `),

      // User KPIs
      pool.query(`
        SELECT
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) AS active_users,
          COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_users,
          COUNT(*) FILTER (WHERE status = 'locked') AS locked_users,
          COUNT(*) FILTER (WHERE tenant_id IS NULL) AS platform_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days') AS active_last_week
        FROM users
        WHERE deleted_at IS NULL
      `),

      // Revenue placeholder (from subscription plans)
      pool.query(`
        SELECT
          COALESCE(SUM(sp.price_monthly), 0) AS monthly_recurring_revenue,
          COALESCE(SUM(sp.price_yearly / 12), 0) AS annual_monthly_equivalent,
          COUNT(t.id) AS paying_tenants
        FROM tenants t
        JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.status = 'active'
          AND t.deleted_at IS NULL
          AND sp.plan_code != 'free'
      `).catch(() => ({ rows: [{ monthly_recurring_revenue: 0, annual_monthly_equivalent: 0, paying_tenants: 0 }] })),

      // Recent activity (last 10 events)
      pool.query(`
        SELECT 
          al.action, al.resource, al.resource_id,
          al.created_at, al.ip_address,
          u.email AS user_email,
          u.full_name AS user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] })),

      // Plan distribution
      pool.query(`
        SELECT 
          COALESCE(sp.plan_name, 'No Plan') AS plan_name,
          COALESCE(sp.plan_code, 'none') AS plan_code,
          COUNT(t.id) AS tenant_count
        FROM tenants t
        LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.deleted_at IS NULL
        GROUP BY sp.name, sp.code
        ORDER BY tenant_count DESC
      `).catch(() => ({ rows: [] })),

      // Growth trend (last 6 months)
      pool.query(`
        SELECT 
          DATE_TRUNC('month', created_at) AS month,
          COUNT(*) AS new_tenants
        FROM tenants
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
          AND deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `).catch(() => ({ rows: [] })),
    ]);

    sendSuccess(res, {
      tenants: {
        total: parseInt(tenantStats.rows[0].total_tenants) || 0,
        active: parseInt(tenantStats.rows[0].active_tenants) || 0,
        trial: parseInt(tenantStats.rows[0].trial_tenants) || 0,
        suspended: parseInt(tenantStats.rows[0].suspended_tenants) || 0,
        locked: parseInt(tenantStats.rows[0].locked_tenants) || 0,
        terminated: parseInt(tenantStats.rows[0].terminated_tenants) || 0,
        newThisMonth: parseInt(tenantStats.rows[0].new_this_month) || 0,
        newThisWeek: parseInt(tenantStats.rows[0].new_this_week) || 0,
      },
      users: {
        total: parseInt(userStats.rows[0].total_users) || 0,
        active: parseInt(userStats.rows[0].active_users) || 0,
        inactive: parseInt(userStats.rows[0].inactive_users) || 0,
        locked: parseInt(userStats.rows[0].locked_users) || 0,
        platform: parseInt(userStats.rows[0].platform_users) || 0,
        newThisMonth: parseInt(userStats.rows[0].new_this_month) || 0,
        activeLastWeek: parseInt(userStats.rows[0].active_last_week) || 0,
      },
      revenue: {
        mrr: parseFloat(revenueStats.rows[0]?.monthly_recurring_revenue) || 0,
        annualEquivalent: parseFloat(revenueStats.rows[0]?.annual_monthly_equivalent) || 0,
        payingTenants: parseInt(revenueStats.rows[0]?.paying_tenants) || 0,
      },
      recentActivity: recentActivity.rows,
      planDistribution: planDistribution.rows,
      growthTrend: growthTrend.rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Platform dashboard error', { error });
    sendError(res, 'PLATFORM_DASHBOARD_ERROR', 'Failed to load platform dashboard', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/platform/analytics/tenants — Detailed tenant analytics
// ────────────────────────────────────────────
router.get('/analytics/tenants', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;

    const [tenantDetails, storageUsage, topTenants] = await Promise.all([
      pool.query(`
        SELECT 
          t.id, t.name, t.company_code, t.status, t.plan, t.created_at,
          sp.plan_name AS plan_name,
          t.max_users, t.max_companies,
          (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS user_count,
          (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id AND deleted_at IS NULL) AS company_count,
          (SELECT MAX(al.created_at) FROM audit_logs al JOIN users u ON al.user_id = u.id WHERE u.tenant_id = t.id) AS last_activity
        FROM tenants t
        LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.deleted_at IS NULL
        ORDER BY t.created_at DESC
      `),

      // Storage per tenant (approximate from audit_logs + uploads count)
      pool.query(`
        SELECT 
          u.tenant_id,
          COUNT(al.id) AS audit_count,
          t.name AS tenant_name
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        JOIN tenants t ON u.tenant_id = t.id
        WHERE al.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY u.tenant_id, t.name
        ORDER BY audit_count DESC
        LIMIT 20
      `).catch(() => ({ rows: [] })),

      // Top tenants by activity
      pool.query(`
        SELECT 
          u.tenant_id,
          t.name AS tenant_name,
          COUNT(al.id) AS activity_count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        JOIN tenants t ON u.tenant_id = t.id
        WHERE al.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY u.tenant_id, t.name
        ORDER BY activity_count DESC
        LIMIT 10
      `).catch(() => ({ rows: [] })),
    ]);

    sendSuccess(res, {
      tenants: tenantDetails.rows,
      storageUsage: storageUsage.rows,
      topByActivity: topTenants.rows,
      period: `${days}d`,
    });
  } catch (error) {
    logger.error('Tenant analytics error', { error });
    sendError(res, 'TENANT_ANALYTICS_ERROR', 'Failed to load tenant analytics', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/platform/analytics/system — System health
// ────────────────────────────────────────────
router.get('/analytics/system', async (req: Request, res: Response) => {
  try {
    const [dbStats, tableStats, connectionStats] = await Promise.all([
      pool.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) AS db_size,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
          (SELECT COUNT(*) FROM pg_stat_activity) AS total_connections,
          (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') AS max_connections,
          version() AS pg_version
      `),

      pool.query(`
        SELECT 
          relname AS table_name,
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 20
      `),

      pool.query(`
        SELECT
          state, COUNT(*) AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `).catch(() => ({ rows: [] })),
    ]);

    sendSuccess(res, {
      database: {
        size: dbStats.rows[0]?.db_size,
        activeConnections: parseInt(dbStats.rows[0]?.active_connections) || 0,
        totalConnections: parseInt(dbStats.rows[0]?.total_connections) || 0,
        maxConnections: parseInt(dbStats.rows[0]?.max_connections) || 0,
        version: dbStats.rows[0]?.pg_version,
      },
      topTables: tableStats.rows,
      connectionStates: connectionStats.rows,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    });
  } catch (error) {
    logger.error('System analytics error', { error });
    sendError(res, 'SYSTEM_ANALYTICS_ERROR', 'Failed to load system analytics', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/platform/analytics/security — Security events
// ────────────────────────────────────────────
router.get('/analytics/security', async (req: Request, res: Response) => {
  try {
    const [failedLogins, permissionDenials, suspiciousActivity] = await Promise.all([
      pool.query(`
        SELECT 
          email, ip_address, failure_reason, created_at
        FROM failed_login_attempts
        ORDER BY created_at DESC
        LIMIT 50
      `).catch(() => ({ rows: [] })),

      pool.query(`
        SELECT 
          al.action, al.resource, al.ip_address, al.created_at,
          u.email AS user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action LIKE '%denied%' OR al.action LIKE '%unauthorized%'
        ORDER BY al.created_at DESC
        LIMIT 50
      `).catch(() => ({ rows: [] })),

      // Multiple failed logins from same IP
      pool.query(`
        SELECT 
          ip_address, COUNT(*) AS attempt_count,
          MAX(created_at) AS last_attempt
        FROM failed_login_attempts
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        ORDER BY attempt_count DESC
      `).catch(() => ({ rows: [] })),
    ]);

    sendSuccess(res, {
      failedLogins: failedLogins.rows,
      permissionDenials: permissionDenials.rows,
      suspiciousIPs: suspiciousActivity.rows,
    });
  } catch (error) {
    logger.error('Security analytics error', { error });
    sendError(res, 'SECURITY_ANALYTICS_ERROR', 'Failed to load security analytics', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/platform/analytics/login-heatmap — Login heatmap (hour × day-of-week)
// ────────────────────────────────────────────
router.get('/analytics/login-heatmap', async (req: Request, res: Response) => {
  try {
    const period = req.query.period === '7d' ? '7 days' : '30 days';

    const result = await pool.query(`
      SELECT
        EXTRACT(DOW FROM created_at)::int AS day_of_week,
        EXTRACT(HOUR FROM created_at)::int AS hour_of_day,
        COUNT(*) AS login_count
      FROM login_history
      WHERE activity_type = 'login_success'
        AND created_at >= CURRENT_DATE - INTERVAL '${period}'
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
    `);

    sendSuccess(res, { heatmap: result.rows, period });
  } catch (error) {
    logger.error('Login heatmap error', { error });
    sendSuccess(res, { heatmap: [], period: '30 days' });
  }
});

// ────────────────────────────────────────────
// GET /api/platform/analytics/module-usage — Module adoption stats
// ────────────────────────────────────────────
router.get('/analytics/module-usage', async (req: Request, res: Response) => {
  try {
    const totalTenantsResult = await pool.query(
      "SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL"
    );
    const totalTenants = parseInt(totalTenantsResult.rows[0].count) || 1;

    const result = await pool.query(`
      SELECT
        m.module_code,
        m.module_name,
        m.is_core,
        COUNT(tm.tenant_id) FILTER (WHERE tm.is_enabled = true) AS enabled_count,
        ROUND(
          COUNT(tm.tenant_id) FILTER (WHERE tm.is_enabled = true) * 100.0 / $1, 1
        ) AS adoption_pct
      FROM modules m
      LEFT JOIN tenant_modules tm ON tm.module_code = m.module_code AND tm.deleted_at IS NULL
      WHERE m.deleted_at IS NULL
      GROUP BY m.module_code, m.module_name, m.is_core
      ORDER BY enabled_count DESC
    `, [totalTenants]);

    sendSuccess(res, { modules: result.rows, totalTenants });
  } catch (error) {
    logger.error('Module usage error', { error });
    sendSuccess(res, { modules: [], totalTenants: 0 });
  }
});

export default router;
