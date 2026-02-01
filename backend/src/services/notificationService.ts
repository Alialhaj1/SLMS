/**
 * Notification Service
 * Purpose: In-app notification system with i18n support
 * Design: Stores i18n keys + payload (no hardcoded text)
 */

import pool from '../db';

// =============================================
// Types & Interfaces
// =============================================

export interface Notification {
  id: number;
  type: string;
  category: 'security' | 'admin' | 'user' | 'system';
  priority: 'low' | 'normal' | 'high' | 'critical';
  title_key: string;
  message_key: string;
  payload: Record<string, any>;
  target_user_id: number | null;
  target_role_id: number | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  read_at: Date | null;
  dismissed_at: Date | null;
  action_url: string | null;
  created_at: Date;
  expires_at: Date | null;
}

export interface CreateNotificationOptions {
  type: string;
  category: 'security' | 'admin' | 'user' | 'system';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  titleKey: string;
  messageKey: string;
  payload?: Record<string, any>;
  targetUserId?: number;
  targetRoleId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface GetNotificationsOptions {
  userId: number;
  unreadOnly?: boolean;
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

// =============================================
// Notification Service
// =============================================

export class NotificationService {
  
  /**
   * Create notification
   * Can target specific user, role, or both
   * Always uses i18n keys, never hardcoded text
   */
  static async create(options: CreateNotificationOptions): Promise<number> {
    const {
      type,
      category,
      priority = 'normal',
      titleKey,
      messageKey,
      payload = {},
      targetUserId,
      targetRoleId,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      expiresAt
    } = options;
    
    // Validation: Must have at least one target
    if (!targetUserId && !targetRoleId) {
      throw new Error('NOTIFICATION_MUST_HAVE_TARGET');
    }
    
    const result = await pool.query(
      `INSERT INTO notifications
       (type, category, priority, title_key, message_key, payload,
        target_user_id, target_role_id, related_entity_type, related_entity_id,
        action_url, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id`,
      [
        type,
        category,
        priority,
        titleKey,
        messageKey,
        JSON.stringify(payload),
        targetUserId || null,
        targetRoleId || null,
        relatedEntityType || null,
        relatedEntityId || null,
        actionUrl || null,
        expiresAt || null
      ]
    );
    
    return result.rows[0].id;
  }
  
  /**
   * Get notifications for specific user
   * Includes both direct user notifications and role-based notifications
   * Filters by permissions (application layer should check)
   */
  static async getUserNotifications(options: GetNotificationsOptions): Promise<{
    notifications: Notification[];
    total: number;
  }> {
    const {
      userId,
      unreadOnly = false,
      type,
      category,
      limit = 20,
      offset = 0
    } = options;
    
    let whereConditions = [
      '(n.expires_at IS NULL OR n.expires_at > NOW())', // Not expired
      '(n.target_user_id = $1 OR n.target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = $1))'
    ];
    
    const queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (unreadOnly) {
      whereConditions.push('n.read_at IS NULL');
      whereConditions.push('n.dismissed_at IS NULL');
    }
    
    if (type) {
      whereConditions.push(`n.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (category) {
      whereConditions.push(`n.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Query with pagination
    const query = `
      SELECT n.*
      FROM notifications n
      WHERE ${whereClause}
      ORDER BY 
        CASE n.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    // Get count
    const countQuery = `
      SELECT COUNT(*) 
      FROM notifications n
      WHERE ${whereClause}
    `;
    
    const [notificationsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset
    ]);
    
    return {
      notifications: notificationsResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
  
  /**
   * Get unread notification count for user
   * Uses direct query for accuracy
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications n
       WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
         AND (n.target_user_id = $1 OR n.target_role_id IN (
           SELECT role_id FROM user_roles WHERE user_id = $1
         ))
         AND n.read_at IS NULL
         AND n.dismissed_at IS NULL`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }
  
  /**
   * Mark notification as read
   * Security: Verify user owns notification
   */
  static async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = $1
         AND read_at IS NULL
         AND (target_user_id = $2 OR target_role_id IN (
           SELECT role_id FROM user_roles WHERE user_id = $2
         ))
       RETURNING id`,
      [notificationId, userId]
    );
    
    return result.rowCount > 0;
  }
  
  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE read_at IS NULL
         AND (target_user_id = $1 OR target_role_id IN (
           SELECT role_id FROM user_roles WHERE user_id = $1
         ))
       RETURNING id`,
      [userId]
    );
    
    return result.rowCount;
  }
  
  /**
   * Dismiss notification (hide from user)
   * Different from marking as read - this removes it from view
   */
  static async dismiss(notificationId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notifications
       SET dismissed_at = NOW()
       WHERE id = $1
         AND (target_user_id = $2 OR target_role_id IN (
           SELECT role_id FROM user_roles WHERE user_id = $2
         ))
       RETURNING id`,
      [notificationId, userId]
    );
    
    return result.rowCount > 0;
  }
  
  /**
   * Delete notification (Admin only)
   * Requires notifications:delete permission
   */
  static async delete(notificationId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 RETURNING id',
      [notificationId]
    );
    
    return result.rowCount > 0;
  }
  
  /**
   * Notify all admins with specific permission
   * Used for system-wide admin notifications
   */
  static async notifyAdmins(
    permissionCode: string,
    notificationOptions: Omit<CreateNotificationOptions, 'targetUserId' | 'targetRoleId'>
  ): Promise<number[]> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all roles that have the specified permission
      const rolesResult = await client.query(
        `SELECT DISTINCT r.id
         FROM roles r
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE p.permission_code = $1
           AND r.deleted_at IS NULL`,
        [permissionCode]
      );
      
      if (rolesResult.rowCount === 0) {
        await client.query('COMMIT');
        return [];
      }
      
      // Create notification for each role
      const notificationIds: number[] = [];
      
      for (const role of rolesResult.rows) {
        const result = await client.query(
          `INSERT INTO notifications
           (type, category, priority, title_key, message_key, payload,
            target_role_id, related_entity_type, related_entity_id,
            action_url, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING id`,
          [
            notificationOptions.type,
            notificationOptions.category,
            notificationOptions.priority || 'normal',
            notificationOptions.titleKey,
            notificationOptions.messageKey,
            JSON.stringify(notificationOptions.payload || {}),
            role.id,
            notificationOptions.relatedEntityType || null,
            notificationOptions.relatedEntityId || null,
            notificationOptions.actionUrl || null,
            notificationOptions.expiresAt || null
          ]
        );
        
        notificationIds.push(result.rows[0].id);
      }
      
      await client.query('COMMIT');
      
      return notificationIds;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create security alert notification
   * Always high priority, targets security team
   */
  static async createSecurityAlert(
    type: string,
    titleKey: string,
    messageKey: string,
    payload: Record<string, any>,
    options?: {
      relatedEntityType?: string;
      relatedEntityId?: number;
      actionUrl?: string;
    }
  ): Promise<number[]> {
    return this.notifyAdmins('security:alerts:view', {
      type,
      category: 'security',
      priority: 'high',
      titleKey,
      messageKey,
      payload,
      ...options
    });
  }
  
  /**
   * Notify specific user
   * Convenience method for user-specific notifications
   */
  static async notifyUser(
    userId: number,
    type: string,
    category: 'user' | 'system',
    titleKey: string,
    messageKey: string,
    payload?: Record<string, any>,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      actionUrl?: string;
      relatedEntityType?: string;
      relatedEntityId?: number;
    }
  ): Promise<number> {
    return this.create({
      type,
      category,
      priority: options?.priority || 'normal',
      titleKey,
      messageKey,
      payload: payload || {},
      targetUserId: userId,
      actionUrl: options?.actionUrl,
      relatedEntityType: options?.relatedEntityType,
      relatedEntityId: options?.relatedEntityId
    });
  }
  
  /**
   * Clean up expired notifications (Maintenance task)
   * Should be run periodically (e.g., daily cron job)
   */
  static async cleanupExpired(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE expires_at IS NOT NULL
         AND expires_at < NOW()
       RETURNING id`
    );
    
    return result.rowCount;
  }
  
  /**
   * Get notification statistics for admin dashboard
   */
  static async getStatistics(): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const [totalResult, unreadResult, byCategoryResult, byPriorityResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM notifications WHERE expires_at IS NULL OR expires_at > NOW()'),
      pool.query('SELECT COUNT(*) FROM notifications WHERE read_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())'),
      pool.query(`
        SELECT category, COUNT(*) as count
        FROM notifications
        WHERE expires_at IS NULL OR expires_at > NOW()
        GROUP BY category
      `),
      pool.query(`
        SELECT priority, COUNT(*) as count
        FROM notifications
        WHERE expires_at IS NULL OR expires_at > NOW()
        GROUP BY priority
      `)
    ]);
    
    const byCategory: Record<string, number> = {};
    byCategoryResult.rows.forEach(row => {
      byCategory[row.category] = parseInt(row.count);
    });
    
    const byPriority: Record<string, number> = {};
    byPriorityResult.rows.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].count),
      unread: parseInt(unreadResult.rows[0].count),
      byCategory,
      byPriority
    };
  }
}
