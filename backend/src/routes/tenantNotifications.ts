/**
 * ============================================================================
 * Tenant Notifications Routes — §6.7 Notification Management
 * ============================================================================
 *
 * Provides:
 *   - List notifications for current user (paginated, filterable)
 *   - Unread notification count (badge)
 *   - Mark notifications as read (single/all)
 *   - Dismiss notifications
 *   - Notification preferences (per-channel, per-category)
 *
 * Uses the existing `notifications` table (migration 014 + 364 adds tenant_id).
 * Uses `tenant_notification_preferences` table (migration 407).
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

const NOTIFICATION_CATEGORIES = [
  'security', 'system', 'shipments', 'approvals', 'reports',
  'procurement', 'accounting', 'inventory', 'customs', 'general',
];

const NOTIFICATION_CHANNELS = ['email', 'in_app', 'sms', 'push'];

// ────────────────────────────────────────────
// GET /api/tenant-notifications
// List notifications for current user
// ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireTenantUser,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const unreadOnly = req.query.unread === 'true';
      const category = req.query.category as string;

      let whereClause = `WHERE n.tenant_id = $1 AND (n.target_user_id = $2 OR n.target_user_id IS NULL)`;
      const params: any[] = [tenantId, userId];

      if (unreadOnly) {
        whereClause += ` AND n.read_at IS NULL`;
      }

      if (category) {
        params.push(category);
        whereClause += ` AND n.category = $${params.length}`;
      }

      const [countResult, dataResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM notifications n ${whereClause}`,
          params
        ),
        pool.query(
          `SELECT
             n.id,
             n.type,
             n.category,
             n.title_key,
             n.message_key,
             n.payload AS data,
             n.target_user_id,
             n.read_at,
             n.dismissed_at,
             n.created_at
           FROM notifications n
           ${whereClause}
           ORDER BY n.created_at DESC
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
      logger.error('Error fetching notifications:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch notifications', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-notifications/unread-count
// Badge count for unread notifications
// ────────────────────────────────────────────
router.get(
  '/unread-count',
  authenticate,
  requireTenantUser,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM notifications
         WHERE tenant_id = $1 AND (target_user_id = $2 OR target_user_id IS NULL)
           AND read_at IS NULL AND dismissed_at IS NULL`,
        [tenantId, userId]
      );

      return sendSuccess(res, {
        unreadCount: parseInt(result.rows[0]?.count || '0'),
      });
    } catch (error) {
      logger.error('Error fetching unread count:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch unread count', 500);
    }
  }
);

// ────────────────────────────────────────────
// PATCH /api/tenant-notifications/:id/read
// Mark a single notification as read
// ────────────────────────────────────────────
router.patch(
  '/:id/read',
  authenticate,
  requireTenantUser,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return sendError(res, 'INVALID_ID', 'Invalid notification ID', 400);
      }

      const result = await pool.query(
        `UPDATE notifications
         SET read_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND (target_user_id = $3 OR target_user_id IS NULL)
           AND read_at IS NULL
         RETURNING id, read_at`,
        [notificationId, tenantId, userId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Notification not found or already read', 404);
      }

      return sendSuccess(res, result.rows[0], 200, undefined, 'Notification marked as read');
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to mark notification', 500);
    }
  }
);

// ────────────────────────────────────────────
// POST /api/tenant-notifications/mark-all-read
// Mark all notifications as read
// ────────────────────────────────────────────
router.post(
  '/mark-all-read',
  authenticate,
  requireTenantUser,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const result = await pool.query(
        `UPDATE notifications
         SET read_at = NOW()
         WHERE tenant_id = $1 AND (target_user_id = $2 OR target_user_id IS NULL)
           AND read_at IS NULL
         RETURNING id`,
        [tenantId, userId]
      );

      return sendSuccess(res, {
        markedCount: result.rows.length,
      }, 200, undefined, `${result.rows.length} notification(s) marked as read`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to mark notifications', 500);
    }
  }
);

// ────────────────────────────────────────────
// DELETE /api/tenant-notifications/:id
// Dismiss a notification
// ────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireTenantUser,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return sendError(res, 'INVALID_ID', 'Invalid notification ID', 400);
      }

      const result = await pool.query(
        `UPDATE notifications
         SET dismissed_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND (target_user_id = $3 OR target_user_id IS NULL)
           AND dismissed_at IS NULL
         RETURNING id`,
        [notificationId, tenantId, userId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Notification not found or already dismissed', 404);
      }

      return sendSuccess(res, result.rows[0], 200, undefined, 'Notification dismissed');
    } catch (error) {
      logger.error('Error dismissing notification:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to dismiss notification', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-notifications/preferences
// Get notification preferences for current user
// ────────────────────────────────────────────
router.get(
  '/preferences',
  authenticate,
  requireTenantUser,
  requirePermission('notifications:manage'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const result = await pool.query(
        `SELECT id, channel, category, is_enabled, updated_at
         FROM tenant_notification_preferences
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY category, channel`,
        [tenantId, userId]
      );

      // Build a matrix: category → channel → enabled
      const matrix: Record<string, Record<string, boolean>> = {};
      for (const cat of NOTIFICATION_CATEGORIES) {
        matrix[cat] = {};
        for (const ch of NOTIFICATION_CHANNELS) {
          matrix[cat][ch] = true; // default enabled if no preference set
        }
      }
      for (const row of result.rows) {
        if (!matrix[row.category]) matrix[row.category] = {};
        matrix[row.category][row.channel] = row.is_enabled;
      }

      return sendSuccess(res, {
        preferences: result.rows,
        matrix,
        categories: NOTIFICATION_CATEGORIES,
        channels: NOTIFICATION_CHANNELS,
      });
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch preferences', 500);
    }
  }
);

// ────────────────────────────────────────────
// PUT /api/tenant-notifications/preferences
// Update notification preferences
// ────────────────────────────────────────────
router.put(
  '/preferences',
  authenticate,
  requireTenantUser,
  requirePermission('notifications:manage'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      const { preferences } = req.body;
      if (!Array.isArray(preferences)) {
        return sendError(res, 'VALIDATION_ERROR', 'preferences must be an array', 400);
      }

      // Validate each preference
      for (const pref of preferences) {
        if (!NOTIFICATION_CHANNELS.includes(pref.channel)) {
          return sendError(res, 'VALIDATION_ERROR', `Invalid channel: ${pref.channel}`, 400);
        }
        if (!NOTIFICATION_CATEGORIES.includes(pref.category)) {
          return sendError(res, 'VALIDATION_ERROR', `Invalid category: ${pref.category}`, 400);
        }
        if (typeof pref.is_enabled !== 'boolean') {
          return sendError(res, 'VALIDATION_ERROR', 'is_enabled must be boolean', 400);
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results: any[] = [];
        for (const pref of preferences) {
          const result = await client.query(
            `INSERT INTO tenant_notification_preferences (tenant_id, user_id, channel, category, is_enabled, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (tenant_id, user_id, channel, category)
             DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
             RETURNING id, channel, category, is_enabled`,
            [tenantId, userId, pref.channel, pref.category, pref.is_enabled]
          );
          results.push(result.rows[0]);
        }

        await client.query('COMMIT');

        return sendSuccess(res, {
          updated: results.length,
          preferences: results,
        }, 200, undefined, 'Preferences updated');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to update preferences', 500);
    }
  }
);

export default router;
