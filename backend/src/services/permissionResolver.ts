/**
 * Permission Resolver
 * Caches and resolves user permissions from the database.
 * Provides cache invalidation when roles/permissions change.
 */
import pool from '../db';
import { logger } from '../utils/logger';

// In-memory permission cache: userId -> permissions[]
const permissionCache = new Map<number, { permissions: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PermissionResolver {
  /**
   * Resolve all permission codes for a user.
   */
  static async resolve(userId: number): Promise<string[]> {
    // Check cache
    const cached = permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.permissions;
    }

    try {
      const result = await pool.query(
        `SELECT DISTINCT p.permission_code
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1 AND p.deleted_at IS NULL`,
        [userId]
      );

      const permissions = result.rows.map((r: any) => r.permission_code);
      permissionCache.set(userId, { permissions, timestamp: Date.now() });
      return permissions;
    } catch (error) {
      logger.error('PermissionResolver.resolve error:', error);
      return [];
    }
  }

  /**
   * Check if a user has a specific permission.
   */
  static async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    const permissions = await this.resolve(userId);
    return permissions.includes(permissionCode);
  }

  /**
   * Invalidate cache for a specific user.
   */
  static invalidate(userId: number): void {
    permissionCache.delete(userId);
  }

  /**
   * Invalidate entire permission cache (e.g., after role/permission changes).
   */
  static invalidateAll(): void {
    permissionCache.clear();
    logger.info('Permission cache invalidated');
  }
}
