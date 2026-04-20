/**
 * Role Service
 * Business logic for role management
 */

import pool from '../db';
import { softDelete, restore } from '../utils/softDelete';
import { PermissionResolver } from './permissionResolver';

export interface CreateRoleData {
  name: string;
  display_name?: string;
  description?: string;
  permissions: string[];
  company_id?: number;
  tenant_id?: number | null;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
  module_gates?: string[];
}

export class RoleService {
  static async isRoleName(roleId: number, roleNames: string[]): Promise<boolean> {
    if (!roleNames || roleNames.length === 0) return false;
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM roles WHERE id = $1 AND name = ANY($2::text[])) as matches',
      [roleId, roleNames]
    );
    return Boolean(result.rows?.[0]?.matches);
  }

  /**
   * Get role by ID
   */
  static async getById(roleId: number) {
    const result = await pool.query(
      `SELECT r.id, r.name, r.description, r.permissions, r.company_id, r.tenant_id,
              r.module_gates, r.created_at, r.updated_at, r.deleted_at,
              c.name as company_name,
              jsonb_array_length(r.permissions) as permission_count,
              COUNT(DISTINCT u.id) as user_count
       FROM roles r
       LEFT JOIN companies c ON r.company_id = c.id
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       LEFT JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL
       WHERE r.id = $1 AND r.deleted_at IS NULL
       GROUP BY r.id, c.name`,
      [roleId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all roles (excluding deleted by default)
   */
  static async getAll(options: {
    includeDeleted?: boolean;
    companyId?: number;
    search?: string;
    limit?: number;
    offset?: number;
    excludeNames?: string[];
    tenantId?: number | null;
  } = {}) {
    const { includeDeleted = false, companyId, search, limit, offset, excludeNames, tenantId } = options;

    let query = `
      SELECT 
        r.id, r.name, r.display_name, r.description, r.permissions, r.company_id,
        r.tenant_id, r.is_system, r.role_type,
        r.created_at, r.updated_at, r.deleted_at,
        c.name as company_name,
        t.name as tenant_name,
        jsonb_array_length(r.permissions) as permission_count,
        COUNT(DISTINCT u.id) as user_count
      FROM roles r
      LEFT JOIN companies c ON r.company_id = c.id
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN user_roles ur ON ur.role_id = r.id
      LEFT JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!includeDeleted) {
      conditions.push('r.deleted_at IS NULL');
    }

    if (companyId) {
      conditions.push(`r.company_id = $${paramIndex}`);
      params.push(companyId);
      paramIndex++;
    }

    if (search) {
      conditions.push(`r.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (excludeNames && excludeNames.length > 0) {
      conditions.push(`NOT (r.name = ANY($${paramIndex}::text[]))`);
      params.push(excludeNames);
      paramIndex++;
    }

    // Tenant isolation: system roles (tenant_id IS NULL) + tenant's own custom roles
    // *** CRITICAL: Exclude platform roles for tenant users ***
    if (tenantId !== undefined && tenantId !== null) {
      conditions.push(`(r.tenant_id IS NULL OR r.tenant_id = $${paramIndex})`);
      params.push(tenantId);
      paramIndex++;
      // Platform roles must NEVER appear for tenant users
      conditions.push("r.role_type != 'platform'");
    } else {
      // Platform admin (tenantId is null): only see system roles (tenant_id IS NULL)
      // Do NOT show tenant-specific custom roles
      conditions.push(`r.tenant_id IS NULL`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id, c.name, t.name ORDER BY r.created_at DESC';

    // Add pagination if provided
    if (limit !== undefined && offset !== undefined) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Count roles (for pagination)
   */
  static async count(options: { includeDeleted?: boolean; companyId?: number; search?: string; excludeNames?: string[]; tenantId?: number | null } = {}): Promise<number> {
    const { includeDeleted = false, companyId, search, excludeNames, tenantId } = options;

    let query = 'SELECT COUNT(DISTINCT r.id) as total FROM roles r';

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!includeDeleted) {
      conditions.push('r.deleted_at IS NULL');
    }

    if (companyId) {
      conditions.push(`r.company_id = $${paramIndex}`);
      params.push(companyId);
      paramIndex++;
    }

    if (search) {
      conditions.push(`r.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (excludeNames && excludeNames.length > 0) {
      conditions.push(`NOT (r.name = ANY($${paramIndex}::text[]))`);
      params.push(excludeNames);
      paramIndex++;
    }

    // Tenant isolation for count: system roles + tenant's own custom roles
    // *** CRITICAL: Exclude platform roles for tenant users ***
    if (tenantId !== undefined && tenantId !== null) {
      conditions.push(`(r.tenant_id IS NULL OR r.tenant_id = $${paramIndex})`);
      params.push(tenantId);
      paramIndex++;
      // Platform roles must NEVER appear for tenant users
      conditions.push("r.role_type != 'platform'");
    } else {
      // Platform admin: only count system roles (tenant_id IS NULL)
      conditions.push(`r.tenant_id IS NULL`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Create new role
   */
  static async create(data: CreateRoleData, createdBy: number) {
    const { name, display_name, description, permissions, company_id, tenant_id } = data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if role name exists (scoped to tenant if provided)
      const existing = tenant_id
        ? await client.query(
            'SELECT id FROM roles WHERE name = $1 AND deleted_at IS NULL AND (tenant_id = $2 OR tenant_id IS NULL)',
            [name, tenant_id]
          )
        : await client.query(
            'SELECT id FROM roles WHERE name = $1 AND deleted_at IS NULL',
            [name]
          );

      if (existing.rows.length > 0) {
        throw new Error('ROLE_EXISTS');
      }

      // Create role
      const result = await client.query(
        `INSERT INTO roles (name, display_name, description, permissions, company_id, tenant_id)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING id, name, display_name, description, permissions, company_id, tenant_id, created_at`,
        [name, display_name || null, description || null, JSON.stringify(permissions), company_id || null, tenant_id || null]
      );

      const role = result.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdBy, 'CREATE_ROLE', 'role', role.id, JSON.stringify(role)]
      );

      await client.query('COMMIT');

      // Invalidate permission caches (role changes affect all users with this role)
      PermissionResolver.invalidateAll();

      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update role
   */
  static async update(roleId: number, data: UpdateRoleData, updatedBy: number) {
    const { name, description, permissions, module_gates } = data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check role exists
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE id = $1 AND deleted_at IS NULL',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Update role
      const result = await client.query(
        `UPDATE roles 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             permissions = COALESCE($3::jsonb, permissions),
             module_gates = COALESCE($5::text[], module_gates),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, description, permissions, company_id, module_gates, updated_at`,
        [name, description, permissions ? JSON.stringify(permissions) : null, roleId, module_gates || null]
      );

      const role = result.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [updatedBy, 'UPDATE_ROLE', 'role', roleId, JSON.stringify(role)]
      );

      await client.query('COMMIT');

      // Invalidate permission caches
      PermissionResolver.invalidateAll();

      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete role
   */
  static async softDelete(roleId: number, deletedBy: number, reason?: string) {
    // Check if role has users
    const usersWithRole = await pool.query(
      `SELECT COUNT(*) as count
       FROM user_roles ur
       INNER JOIN users u ON u.id = ur.user_id
       WHERE ur.role_id = $1
         AND u.deleted_at IS NULL`,
      [roleId]
    );

    if (parseInt(usersWithRole.rows[0].count) > 0) {
      throw new Error('ROLE_IN_USE');
    }

    await softDelete({
      tableName: 'roles',
      recordId: roleId,
      deletedBy,
      reason,
    });

    // Invalidate permission caches
    PermissionResolver.invalidateAll();
  }

  /**
   * Restore soft deleted role
   */
  static async restore(roleId: number, restoredBy: number) {
    await restore({
      tableName: 'roles',
      recordId: roleId,
      restoredBy,
    });

    // Invalidate permission caches
    PermissionResolver.invalidateAll();
  }

  /**
   * Clone role
   */
  static async clone(sourceRoleId: number, newName: string, description: string | undefined, createdBy: number) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get source role
      const sourceRole = await client.query(
        'SELECT permissions FROM roles WHERE id = $1 AND deleted_at IS NULL',
        [sourceRoleId]
      );

      if (sourceRole.rows.length === 0) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Check new name doesn't exist
      const existing = await client.query(
        'SELECT id FROM roles WHERE name = $1 AND deleted_at IS NULL',
        [newName]
      );

      if (existing.rows.length > 0) {
        throw new Error('ROLE_EXISTS');
      }

      // Create cloned role
      const result = await client.query(
        `INSERT INTO roles (name, description, permissions)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id, name, description, permissions, created_at`,
        [newName, description || `Cloned from role ${sourceRoleId}`, JSON.stringify(sourceRole.rows[0].permissions)]
      );

      const newRole = result.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          createdBy,
          'CLONE_ROLE',
          'role',
          newRole.id,
          JSON.stringify({ source_role_id: sourceRoleId, new_role: newRole })
        ]
      );

      await client.query('COMMIT');
      return newRole;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get role permissions
   */
  static async getPermissions(roleId: number): Promise<string[]> {
    const result = await pool.query(
      'SELECT permissions FROM roles WHERE id = $1 AND deleted_at IS NULL',
      [roleId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows[0].permissions || [];
  }
}
