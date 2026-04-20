/**
 * ============================================================================
 * Security Monitor Routes — §6.8 Tenant Security Dashboard
 * ============================================================================
 *
 * Provides tenant-scoped security analytics:
 *   - Security overview KPIs (login stats, failed attempts, MFA adoption)
 *   - Recent login activity across the tenant
 *   - Failed login attempts (potential threats)
 *   - Locked/disabled user accounts
 *   - MFA adoption statistics
 *   - Active sessions across tenant
 *
 * All queries are strictly tenant-scoped via tenant_id.
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
// GET /api/security-monitor/overview
// Security dashboard KPIs
// ────────────────────────────────────────────
router.get(
  '/overview',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalUsers,
        activeUsers,
        lockedUsers,
        disabledUsers,
        mfaEnabled,
        loginsLast24h,
        failedLoginsLast24h,
        activeSessions,
        loginsLast7d,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL AND is_locked = true`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = false`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL AND mfa_enabled = true`,
          [tenantId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM login_history lh
           JOIN users u ON u.id = lh.user_id
           WHERE u.tenant_id = $1 AND lh.created_at >= $2 AND lh.success = true`,
          [tenantId, last24h]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM login_history lh
           JOIN users u ON u.id = lh.user_id
           WHERE u.tenant_id = $1 AND lh.created_at >= $2 AND lh.success = false`,
          [tenantId, last24h]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           WHERE u.tenant_id = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL`,
          [tenantId]
        ),
        pool.query(
          `SELECT
             DATE(lh.created_at) AS date,
             COUNT(*) FILTER (WHERE lh.success = true) AS successful,
             COUNT(*) FILTER (WHERE lh.success = false) AS failed
           FROM login_history lh
           JOIN users u ON u.id = lh.user_id
           WHERE u.tenant_id = $1 AND lh.created_at >= $2
           GROUP BY DATE(lh.created_at)
           ORDER BY date ASC`,
          [tenantId, last7d]
        ),
      ]);

      const total = parseInt(totalUsers.rows[0]?.count || '0');
      const mfaCount = parseInt(mfaEnabled.rows[0]?.count || '0');

      return sendSuccess(res, {
        users: {
          total,
          active: parseInt(activeUsers.rows[0]?.count || '0'),
          locked: parseInt(lockedUsers.rows[0]?.count || '0'),
          disabled: parseInt(disabledUsers.rows[0]?.count || '0'),
        },
        mfa: {
          enabled: mfaCount,
          adoptionRate: total > 0 ? Math.round((mfaCount / total) * 100) : 0,
        },
        logins: {
          last24h: {
            successful: parseInt(loginsLast24h.rows[0]?.count || '0'),
            failed: parseInt(failedLoginsLast24h.rows[0]?.count || '0'),
          },
          trend7d: loginsLast7d.rows.map((r: any) => ({
            date: r.date,
            successful: parseInt(r.successful || '0'),
            failed: parseInt(r.failed || '0'),
          })),
        },
        activeSessions: parseInt(activeSessions.rows[0]?.count || '0'),
      });
    } catch (error) {
      logger.error('Error fetching security overview:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch security overview', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/security-monitor/login-activity
// Recent login activity across the tenant
// ────────────────────────────────────────────
router.get(
  '/login-activity',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const successFilter = req.query.success as string;

      let whereClause = `WHERE u.tenant_id = $1 AND u.deleted_at IS NULL`;
      const params: any[] = [tenantId];

      if (successFilter === 'true') {
        whereClause += ` AND lh.success = true`;
      } else if (successFilter === 'false') {
        whereClause += ` AND lh.success = false`;
      }

      const [countResult, dataResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM login_history lh
           JOIN users u ON u.id = lh.user_id
           ${whereClause}`,
          params
        ),
        pool.query(
          `SELECT
             lh.id,
             lh.user_id,
             u.username,
             u.email,
             lh.ip_address,
             lh.user_agent,
             lh.success,
             lh.failure_reason,
             lh.created_at
           FROM login_history lh
           JOIN users u ON u.id = lh.user_id
           ${whereClause}
           ORDER BY lh.created_at DESC
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
      logger.error('Error fetching login activity:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch login activity', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/security-monitor/failed-logins
// Failed login attempts (security threats)
// ────────────────────────────────────────────
router.get(
  '/failed-logins',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const hours = Math.min(168, parseInt(req.query.hours as string) || 24);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Aggregate failed attempts by user and IP
      const result = await pool.query(
        `SELECT
           u.id AS user_id,
           u.username,
           u.email,
           u.is_locked,
           lh.ip_address,
           COUNT(*) AS attempt_count,
           MAX(lh.created_at) AS last_attempt,
           ARRAY_AGG(DISTINCT lh.failure_reason) FILTER (WHERE lh.failure_reason IS NOT NULL) AS failure_reasons
         FROM login_history lh
         JOIN users u ON u.id = lh.user_id
         WHERE u.tenant_id = $1 AND lh.success = false AND lh.created_at >= $2
         GROUP BY u.id, u.username, u.email, u.is_locked, lh.ip_address
         ORDER BY COUNT(*) DESC
         LIMIT 50`,
        [tenantId, since]
      );

      return sendSuccess(res, {
        period: `Last ${hours} hours`,
        since,
        entries: result.rows.map((r: any) => ({
          userId: r.user_id,
          username: r.username,
          email: r.email,
          isLocked: r.is_locked,
          ipAddress: r.ip_address,
          attemptCount: parseInt(r.attempt_count || '0'),
          lastAttempt: r.last_attempt,
          failureReasons: r.failure_reasons || [],
        })),
      });
    } catch (error) {
      logger.error('Error fetching failed logins:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch failed logins', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/security-monitor/locked-accounts
// Currently locked user accounts
// ────────────────────────────────────────────
router.get(
  '/locked-accounts',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const result = await pool.query(
        `SELECT
           u.id,
           u.username,
           u.email,
           u.is_locked,
           u.is_active,
           u.locked_at,
           u.lock_reason,
           u.failed_login_attempts,
           u.last_login,
           u.created_at
         FROM users u
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
           AND (u.is_locked = true OR u.is_active = false)
         ORDER BY u.locked_at DESC NULLS LAST, u.username ASC`,
        [tenantId]
      );

      return sendSuccess(res, result.rows);
    } catch (error) {
      logger.error('Error fetching locked accounts:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch locked accounts', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/security-monitor/mfa-stats
// MFA adoption statistics
// ────────────────────────────────────────────
router.get(
  '/mfa-stats',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const result = await pool.query(
        `SELECT
           COUNT(*) AS total_users,
           COUNT(*) FILTER (WHERE mfa_enabled = true) AS mfa_enabled,
           COUNT(*) FILTER (WHERE mfa_enabled = false OR mfa_enabled IS NULL) AS mfa_disabled,
           COUNT(*) FILTER (WHERE is_active = true) AS active_users,
           COUNT(*) FILTER (WHERE is_active = true AND mfa_enabled = true) AS active_with_mfa
         FROM users
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId]
      );

      const stats = result.rows[0];
      const total = parseInt(stats?.total_users || '0');
      const enabled = parseInt(stats?.mfa_enabled || '0');
      const activeTotal = parseInt(stats?.active_users || '0');
      const activeWithMfa = parseInt(stats?.active_with_mfa || '0');

      // Users without MFA (for admin follow-up)
      const usersWithoutMfa = await pool.query(
        `SELECT id, username, email, last_login, created_at
         FROM users
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true
           AND (mfa_enabled = false OR mfa_enabled IS NULL)
         ORDER BY last_login DESC NULLS LAST
         LIMIT 20`,
        [tenantId]
      );

      return sendSuccess(res, {
        totals: {
          totalUsers: total,
          mfaEnabled: enabled,
          mfaDisabled: parseInt(stats?.mfa_disabled || '0'),
          adoptionRate: total > 0 ? Math.round((enabled / total) * 100) : 0,
          activeAdoptionRate: activeTotal > 0 ? Math.round((activeWithMfa / activeTotal) * 100) : 0,
        },
        usersWithoutMfa: usersWithoutMfa.rows,
      });
    } catch (error) {
      logger.error('Error fetching MFA stats:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch MFA stats', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/security-monitor/active-sessions
// Active sessions across tenant
// ────────────────────────────────────────────
router.get(
  '/active-sessions',
  authenticate,
  requireTenantUser,
  requirePermission('security_monitor:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const [countResult, dataResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           WHERE u.tenant_id = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL`,
          [tenantId]
        ),
        pool.query(
          `SELECT
             rt.id AS session_id,
             rt.user_id,
             u.username,
             u.email,
             rt.ip_address,
             rt.user_agent,
             rt.created_at AS session_started,
             rt.expires_at AS session_expires
           FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           WHERE u.tenant_id = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL
           ORDER BY rt.created_at DESC
           LIMIT $2 OFFSET $3`,
          [tenantId, limit, offset]
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
      logger.error('Error fetching active sessions:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch active sessions', 500);
    }
  }
);

export default router;
