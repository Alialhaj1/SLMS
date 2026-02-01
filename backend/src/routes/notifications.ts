/**
 * Notifications Routes
 * Purpose: In-app notification system with user ownership checks
 * Security: Users can only access their own notifications (unless admin)
 */

import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

// =============================================
// Types
// =============================================

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

// =============================================
// User Endpoints (Authentication Required)
// =============================================

/**
 * GET /api/notifications
 * Get notifications for authenticated user
 * Includes both direct user notifications and role-based notifications
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit, offset } = getPaginationParams(req.query);
    const { unread_only, type, category } = req.query;

    // Validate query parameters
    const validCategories = ['security', 'admin', 'user', 'system'];
    if (category && !validCategories.includes(category as string)) {
      return sendError(res, 'VALIDATION_ERROR', `Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    // Get notifications
    const { notifications, total } = await NotificationService.getUserNotifications({
      userId,
      unreadOnly: unread_only === 'true',
      type: type as string,
      category: category as string,
      limit,
      offset
    });

    // Transform notifications for frontend compatibility
    const transformedNotifications = notifications.map(n => ({
      ...n,
      is_read: n.read_at !== null,
      is_dismissed: n.dismissed_at !== null
    }));

    return sendPaginated(res, transformedNotifications, page, limit, total);

  } catch (error: any) {
    const userId = req.user!.id;
    logger.error('Get notifications failed', error, { userId });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch notifications', 500);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for badge
 * Fast endpoint optimized for frequent polling
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await NotificationService.getUnreadCount(userId);

    return sendSuccess(res, { count }, 200);

  } catch (error: any) {
    const userId = req.user!.id;
    logger.error('Get unread count failed', error, { userId });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch unread count', 500);
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 * Security: User can only mark their own notifications
 */
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(notificationId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid notification ID', 400);
    }

    const success = await NotificationService.markAsRead(notificationId, userId);

    if (!success) {
      return sendError(res, 'NOT_FOUND', 'Notification not found or already read', 404);
    }

    return sendSuccess(res, { message: 'Notification marked as read' }, 200);

  } catch (error: any) {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;
    logger.error('Mark as read failed', error, { notificationId, userId });
    return sendError(res, 'SERVER_ERROR', 'Failed to mark notification as read', 500);
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */
router.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await NotificationService.markAllAsRead(userId);

    return sendSuccess(res, { 
      message: `${count} notification(s) marked as read`,
      count 
    }, 200);

  } catch (error: any) {
    const userId = req.user!.id;
    logger.error('Mark all as read failed', error, { userId });
    return sendError(res, 'SERVER_ERROR', 'Failed to mark all notifications as read', 500);
  }
});

/**
 * POST /api/notifications/:id/dismiss
 * Dismiss notification (hide from user)
 * Security: User can only dismiss their own notifications
 */
router.post('/:id/dismiss', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(notificationId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid notification ID', 400);
    }

    const success = await NotificationService.dismiss(notificationId, userId);

    if (!success) {
      return sendError(res, 'NOT_FOUND', 'Notification not found', 404);
    }

    return sendSuccess(res, { message: 'Notification dismissed' }, 200);

  } catch (error: any) {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;
    logger.error('Dismiss notification failed', error, { notificationId, userId });
    return sendError(res, 'SERVER_ERROR', 'Failed to dismiss notification', 500);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification permanently
 * Permission: notifications:delete (Admin only)
 */
router.delete('/:id', authenticate, requirePermission('notifications:delete'), async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid notification ID', 400);
    }

    const success = await NotificationService.delete(notificationId);

    if (!success) {
      return sendError(res, 'NOT_FOUND', 'Notification not found', 404);
    }

    return sendSuccess(res, { message: 'Notification deleted' }, 200);

  } catch (error: any) {
    const notificationId = parseInt(req.params.id);
    logger.error('Delete notification failed', error, { notificationId });
    return sendError(res, 'SERVER_ERROR', 'Failed to delete notification', 500);
  }
});

// =============================================
// Admin Endpoints
// =============================================

/**
 * GET /api/notifications/statistics
 * Get notification statistics for admin dashboard
 * Permission: notifications:view_all
 */
router.get('/statistics', authenticate, requirePermission('notifications:view_all'), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await NotificationService.getStatistics();

    return sendSuccess(res, stats, 200);

  } catch (error: any) {
    logger.error('Get notification statistics failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch statistics', 500);
  }
});

/**
 * POST /api/notifications/cleanup
 * Clean up expired notifications
 * Permission: notifications:manage
 */
router.post('/cleanup', authenticate, requirePermission('notifications:manage'), async (req: AuthRequest, res: Response) => {
  try {
    const count = await NotificationService.cleanupExpired();

    return sendSuccess(res, { 
      message: `${count} expired notification(s) removed`,
      count 
    }, 200);

  } catch (error: any) {
    logger.error('Cleanup expired notifications failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to cleanup notifications', 500);
  }
});

export default router;
