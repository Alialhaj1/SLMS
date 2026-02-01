/**
 * User Service
 * Business logic for user management
 */

import pool from '../db';
import bcrypt from 'bcryptjs';
import { softDelete, restore } from '../utils/softDelete';

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role_ids: number[];
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  role_ids?: number[];
  profile_image?: string | null;
  preferred_language?: 'en' | 'ar';
}

export class UserService {
  static async hasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
    if (!roleNames || roleNames.length === 0) return false;

    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
           AND r.name = ANY($2::text[])
       ) as has_role`,
      [userId, roleNames]
    );

    return Boolean(result.rows?.[0]?.has_role);
  }

  /**
   * Get user by ID
   */
  static async getById(userId: number, includePassword = false) {
    const fields = includePassword 
      ? 'u.id, u.email, u.password, u.full_name, u.status, u.created_at, u.deleted_at'
      : 'u.id, u.email, u.full_name, u.status, u.created_at, u.deleted_at';

    const result = await pool.query(
      `SELECT ${fields},
              array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
              (
                SELECT array_agg(DISTINCT perm)
                FROM user_roles ur2
                JOIN roles r2 ON ur2.role_id = r2.id
                CROSS JOIN LATERAL jsonb_array_elements_text(r2.permissions) AS perm
                WHERE ur2.user_id = u.id
              ) as permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       GROUP BY u.id`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all users (excluding deleted by default)
   */
  static async getAll(options: {
    includeDeleted?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    excludeRoleNames?: string[];
  } = {}) {
    const { includeDeleted = false, status, search, limit, offset, excludeRoleNames } = options;

    let query = `
      SELECT 
        u.id, u.email, u.full_name, u.status,
        u.failed_login_count, u.locked_until,
        u.last_login_at, u.last_login_ip,
        u.disabled_at, u.disabled_by, u.disable_reason,
        u.deleted_at, u.created_at,
        array_agg(DISTINCT r.name) as roles,
        disabler.email as disabled_by_email
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN users disabler ON u.disabled_by = disabler.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!includeDeleted) {
      conditions.push('u.deleted_at IS NULL');
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (excludeRoleNames && excludeRoleNames.length > 0) {
      conditions.push(
        `NOT EXISTS (
           SELECT 1
           FROM user_roles urx
           JOIN roles rx ON rx.id = urx.role_id
           WHERE urx.user_id = u.id
             AND rx.name = ANY($${paramIndex}::text[])
         )`
      );
      params.push(excludeRoleNames);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY u.id, disabler.email ORDER BY u.created_at DESC';

    // Add pagination if provided
    if (limit !== undefined && offset !== undefined) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Count users (for pagination)
   */
  static async count(options: {
    includeDeleted?: boolean;
    status?: string;
    search?: string;
    excludeRoleNames?: string[];
  } = {}): Promise<number> {
    const { includeDeleted = false, status, search, excludeRoleNames } = options;

    let query = 'SELECT COUNT(DISTINCT u.id) as total FROM users u';

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!includeDeleted) {
      conditions.push('u.deleted_at IS NULL');
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (excludeRoleNames && excludeRoleNames.length > 0) {
      conditions.push(
        `NOT EXISTS (
           SELECT 1
           FROM user_roles urx
           JOIN roles rx ON rx.id = urx.role_id
           WHERE urx.user_id = u.id
             AND rx.name = ANY($${paramIndex}::text[])
         )`
      );
      params.push(excludeRoleNames);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Create new user
   */
  static async create(data: CreateUserData, createdBy: number) {
    const { email, password, full_name, role_ids } = data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if email exists (email is UNIQUE, so soft-deleted rows still block inserts)
      const existing = await client.query(
        'SELECT id, deleted_at FROM users WHERE email = $1',
        [email]
      );

      // Hash password (used for both insert + restore)
      const hashedPassword = await bcrypt.hash(password, 10);

      let user: any;
      let wasRestored = false;

      if (existing.rows.length > 0) {
        const existingUser = existing.rows[0];

        // If not deleted => conflict
        if (!existingUser.deleted_at) {
          throw new Error('EMAIL_EXISTS');
        }

        // Restore soft-deleted user instead of inserting a new row
        const restoredResult = await client.query(
          `UPDATE users
           SET deleted_at = NULL,
               deleted_by = NULL,
               password = $1,
               full_name = $2,
               status = 'active',
               disabled_at = NULL,
               disabled_by = NULL,
               disable_reason = NULL,
               failed_login_count = 0,
               last_failed_login_at = NULL,
               locked_until = NULL,
               status_updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING id, email, full_name, status, created_at`,
          [hashedPassword, full_name, existingUser.id]
        );

        user = restoredResult.rows[0];
  wasRestored = true;

        // Mark as restored in deleted_records history (best-effort)
        await client.query(
          `UPDATE deleted_records
           SET restored_at = NOW(), restored_by = $1
           WHERE table_name = 'users'
             AND record_id = $2
             AND restored_at IS NULL`,
          [createdBy, user.id]
        );
      } else {
        // Insert user
        const userResult = await client.query(
          `INSERT INTO users (email, password, full_name, status)
           VALUES ($1, $2, $3, 'active')
           RETURNING id, email, full_name, status, created_at`,
          [email, hashedPassword, full_name]
        );

        user = userResult.rows[0];
      }

      // Assign roles (replace any existing roles)
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [user.id]);

      // Assign roles
      if (Array.isArray(role_ids) && role_ids.length > 0) {
        // Filter out null/undefined values
        const validRoleIds = role_ids.filter((id: any) => id != null);
        for (const roleId of validRoleIds) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [user.id, roleId]
          );
        }
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdBy, wasRestored ? 'RESTORE_USER' : 'CREATE_USER', 'user', user.id, JSON.stringify(user)]
      );

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user
   */
  static async update(userId: number, data: UpdateUserData, updatedBy: number) {
    const { email, full_name, role_ids, profile_image, preferred_language } = data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check user exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      // Update user - build dynamic update
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      if (full_name !== undefined) {
        updateFields.push(`full_name = $${paramIndex++}`);
        updateValues.push(full_name);
      }
      if (profile_image !== undefined) {
        updateFields.push(`profile_image = $${paramIndex++}`);
        updateValues.push(profile_image);
      }
      if (preferred_language !== undefined) {
        updateFields.push(`preferred_language = $${paramIndex++}`);
        updateValues.push(preferred_language);
      }

      // Add userId as last parameter
      updateValues.push(userId);

      const result = await client.query(
        `UPDATE users 
         SET ${updateFields.length > 0 ? updateFields.join(', ') : 'id = id'}
         WHERE id = $${paramIndex}
         RETURNING id, email, full_name, status, profile_image, preferred_language`,
        updateValues
      );

      const user = result.rows[0];

      // Update roles if provided
      if (role_ids) {
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        
        // Filter out null/undefined values
        const validRoleIds = role_ids.filter((id: any) => id != null);
        
        for (const roleId of validRoleIds) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [userId, roleId]
          );
        }
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [updatedBy, 'UPDATE_USER', 'user', userId, JSON.stringify(user)]
      );

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete user
   */
  static async softDelete(userId: number, deletedBy: number, reason?: string) {
    await softDelete({
      tableName: 'users',
      recordId: userId,
      deletedBy,
      reason,
    });
  }

  /**
   * Restore soft deleted user
   */
  static async restore(userId: number, restoredBy: number) {
    await restore({
      tableName: 'users',
      recordId: userId,
      restoredBy,
    });
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Update password
   */
  static async updatePassword(
    userId: number,
    newPassword: string,
    updatedBy: number,
    options?: { mustChangePassword?: boolean }
  ) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password = $1,
           must_change_password = COALESCE($2, must_change_password)
       WHERE id = $3`,
      [hashedPassword, options?.mustChangePassword ?? null, userId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        updatedBy,
        'UPDATE_PASSWORD',
        'user',
        userId,
        JSON.stringify({
          changed_at: new Date(),
          must_change_password: options?.mustChangePassword,
        }),
      ]
    );
  }
}
