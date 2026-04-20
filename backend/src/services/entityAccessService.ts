/**
 * Entity Access Service
 * =====================
 * Manages granular access control for branches, warehouses, and cost centers.
 * 
 * Permissions per entity:
 *   can_read    — View data related to this entity
 *   can_create  — Create new records in this entity
 *   can_update  — Edit existing records
 *   can_delete  — Delete/archive records
 *   can_approve — Approve submitted documents
 *   can_reject  — Reject submitted documents
 *   can_endorse — Final endorsement (Financial Manager level)
 */

import pool from '../db';
import { clearBranchAccessCache } from '../middleware/branchAccess';

export type EntityType = 'branch' | 'warehouse' | 'cost_center';

export interface EntityPermissions {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_endorse: boolean;
}

export interface EntityAccessRecord extends EntityPermissions {
  id: number;
  user_id: number;
  entity_type: EntityType;
  entity_id: number;
  entity_name?: string;
  entity_name_ar?: string;
  entity_code?: string;
  is_active: boolean;
  is_home_branch?: boolean;
  assigned_by: number | null;
  assigned_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAccessSummary {
  user_id: number;
  email: string;
  full_name: string;
  branches: EntityAccessRecord[];
  warehouses: EntityAccessRecord[];
  cost_centers: EntityAccessRecord[];
}

const TABLE_MAP: Record<EntityType, { table: string; fk: string; entityTable: string }> = {
  branch: { table: 'user_branches', fk: 'branch_id', entityTable: 'branches' },
  warehouse: { table: 'user_warehouses', fk: 'warehouse_id', entityTable: 'warehouses' },
  cost_center: { table: 'user_cost_centers', fk: 'cost_center_id', entityTable: 'cost_centers' },
};

const PERM_COLUMNS = ['can_read', 'can_create', 'can_update', 'can_delete', 'can_approve', 'can_reject', 'can_endorse'];

class EntityAccessService {

  /**
   * Get all entity access records for a user
   */
  async getUserAccess(userId: number, tenantId: number): Promise<UserAccessSummary> {
    const userResult = await pool.query(
      `SELECT id, email, full_name FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    const [branches, warehouses, costCenters] = await Promise.all([
      this.getAccessByType(userId, tenantId, 'branch'),
      this.getAccessByType(userId, tenantId, 'warehouse'),
      this.getAccessByType(userId, tenantId, 'cost_center'),
    ]);

    return {
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      branches,
      warehouses,
      cost_centers: costCenters,
    };
  }

  /**
   * Get access records for a specific entity type
   */
  async getAccessByType(userId: number, tenantId: number, entityType: EntityType): Promise<EntityAccessRecord[]> {
    const { table, fk, entityTable } = TABLE_MAP[entityType];
    const extraCols = entityType === 'branch' ? ', ua.is_home_branch' : '';

    const result = await pool.query(
      `SELECT ua.id, ua.user_id, ua.${fk} AS entity_id,
              ua.can_read, ua.can_create, ua.can_update, ua.can_delete,
              ua.can_approve, ua.can_reject, ua.can_endorse,
              ua.is_active, ua.assigned_by, ua.created_at, ua.updated_at${extraCols},
              e.name AS entity_name, e.name_ar AS entity_name_ar, e.code AS entity_code,
              assigner.full_name AS assigned_by_name
       FROM ${table} ua
       INNER JOIN ${entityTable} e ON ua.${fk} = e.id
       INNER JOIN companies c ON e.company_id = c.id
       LEFT JOIN users assigner ON ua.assigned_by = assigner.id
       WHERE ua.user_id = $1 AND c.tenant_id = $2
         AND e.deleted_at IS NULL
       ORDER BY e.name ASC`,
      [userId, tenantId]
    );

    return result.rows.map((r: any) => ({
      ...r,
      entity_type: entityType,
    }));
  }

  /**
   * Get all users with their access to a specific entity
   */
  async getEntityUsers(entityType: EntityType, entityId: number, tenantId: number): Promise<any[]> {
    const { table, fk } = TABLE_MAP[entityType];
    const extraCols = entityType === 'branch' ? ', ua.is_home_branch' : '';

    const result = await pool.query(
      `SELECT ua.id, ua.user_id, ua.${fk} AS entity_id,
              ua.can_read, ua.can_create, ua.can_update, ua.can_delete,
              ua.can_approve, ua.can_reject, ua.can_endorse,
              ua.is_active${extraCols},
              u.email, u.full_name, u.status AS user_status,
              assigner.full_name AS assigned_by_name, ua.created_at
       FROM ${table} ua
       INNER JOIN users u ON ua.user_id = u.id
       LEFT JOIN users assigner ON ua.assigned_by = assigner.id
       WHERE ua.${fk} = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL
       ORDER BY u.full_name ASC`,
      [entityId, tenantId]
    );

    return result.rows;
  }

  /**
   * Assign or update entity access for a user
   */
  async assignAccess(
    userId: number,
    entityType: EntityType,
    entityId: number,
    permissions: Partial<EntityPermissions>,
    assignedBy: number,
    isHomeBranch?: boolean
  ): Promise<EntityAccessRecord> {
    const { table, fk } = TABLE_MAP[entityType];

    // Build the permissions with defaults
    const perms: EntityPermissions = {
      can_read: permissions.can_read ?? false,
      can_create: permissions.can_create ?? false,
      can_update: permissions.can_update ?? false,
      can_delete: permissions.can_delete ?? false,
      can_approve: permissions.can_approve ?? false,
      can_reject: permissions.can_reject ?? false,
      can_endorse: permissions.can_endorse ?? false,
    };

    // Compute legacy access_level for backward compatibility
    const accessLevel = this.computeAccessLevel(perms);

    let query: string;
    let params: any[];

    if (entityType === 'branch') {
      // Handle is_home_branch
      if (isHomeBranch) {
        await pool.query(
          `UPDATE user_branches SET is_home_branch = false WHERE user_id = $1 AND is_home_branch = true`,
          [userId]
        );
      }

      query = `
        INSERT INTO ${table} (user_id, ${fk}, can_read, can_create, can_update, can_delete,
          can_approve, can_reject, can_endorse, is_active, is_home_branch, access_level, assigned_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)
        ON CONFLICT (user_id, ${fk})
        DO UPDATE SET
          can_read = EXCLUDED.can_read, can_create = EXCLUDED.can_create,
          can_update = EXCLUDED.can_update, can_delete = EXCLUDED.can_delete,
          can_approve = EXCLUDED.can_approve, can_reject = EXCLUDED.can_reject,
          can_endorse = EXCLUDED.can_endorse, is_active = true,
          is_home_branch = EXCLUDED.is_home_branch, access_level = EXCLUDED.access_level,
          assigned_by = EXCLUDED.assigned_by, updated_at = NOW()
        RETURNING *`;
      params = [
        userId, entityId,
        perms.can_read, perms.can_create, perms.can_update, perms.can_delete,
        perms.can_approve, perms.can_reject, perms.can_endorse,
        isHomeBranch ?? false, accessLevel, assignedBy,
      ];
    } else {
      query = `
        INSERT INTO ${table} (user_id, ${fk}, can_read, can_create, can_update, can_delete,
          can_approve, can_reject, can_endorse, is_active, assigned_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
        ON CONFLICT (user_id, ${fk})
        DO UPDATE SET
          can_read = EXCLUDED.can_read, can_create = EXCLUDED.can_create,
          can_update = EXCLUDED.can_update, can_delete = EXCLUDED.can_delete,
          can_approve = EXCLUDED.can_approve, can_reject = EXCLUDED.can_reject,
          can_endorse = EXCLUDED.can_endorse, is_active = true,
          assigned_by = EXCLUDED.assigned_by, updated_at = NOW()
        RETURNING *`;
      params = [
        userId, entityId,
        perms.can_read, perms.can_create, perms.can_update, perms.can_delete,
        perms.can_approve, perms.can_reject, perms.can_endorse,
        assignedBy,
      ];
    }

    const result = await pool.query(query, params);

    // Clear branch access cache
    if (entityType === 'branch') {
      clearBranchAccessCache(userId);
    }

    return { ...result.rows[0], entity_type: entityType };
  }

  /**
   * Bulk assign access - assign a user to multiple entities at once
   */
  async bulkAssign(
    userId: number,
    entityType: EntityType,
    assignments: Array<{ entity_id: number; permissions: Partial<EntityPermissions>; is_home_branch?: boolean }>,
    assignedBy: number
  ): Promise<{ assigned: number[]; failed: number[] }> {
    const assigned: number[] = [];
    const failed: number[] = [];

    for (const assignment of assignments) {
      try {
        await this.assignAccess(
          userId, entityType, assignment.entity_id,
          assignment.permissions, assignedBy, assignment.is_home_branch
        );
        assigned.push(assignment.entity_id);
      } catch {
        failed.push(assignment.entity_id);
      }
    }

    return { assigned, failed };
  }

  /**
   * Remove entity access for a user
   */
  async removeAccess(userId: number, entityType: EntityType, entityId: number): Promise<boolean> {
    const { table, fk } = TABLE_MAP[entityType];

    const result = await pool.query(
      `DELETE FROM ${table} WHERE user_id = $1 AND ${fk} = $2 RETURNING id`,
      [userId, entityId]
    );

    if (entityType === 'branch') {
      clearBranchAccessCache(userId);
    }

    return result.rows.length > 0;
  }

  /**
   * Deactivate entity access (soft remove)
   */
  async deactivateAccess(userId: number, entityType: EntityType, entityId: number): Promise<boolean> {
    const { table, fk } = TABLE_MAP[entityType];

    const result = await pool.query(
      `UPDATE ${table} SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND ${fk} = $2 RETURNING id`,
      [userId, entityId]
    );

    if (entityType === 'branch') {
      clearBranchAccessCache(userId);
    }

    return result.rows.length > 0;
  }

  /**
   * Check if a user has a specific permission on an entity
   */
  async checkPermission(
    userId: number,
    entityType: EntityType,
    entityId: number,
    permission: keyof EntityPermissions,
    tenantId: number
  ): Promise<boolean> {
    // Check if user is tenant_admin (bypass)
    const adminCheck = await pool.query(
      `SELECT is_tenant_admin FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [userId, tenantId]
    );
    if (adminCheck.rows[0]?.is_tenant_admin) return true;

    const { table, fk } = TABLE_MAP[entityType];
    const result = await pool.query(
      `SELECT ${permission} FROM ${table} WHERE user_id = $1 AND ${fk} = $2 AND is_active = true`,
      [userId, entityId]
    );

    return result.rows[0]?.[permission] === true;
  }

  /**
   * Get all accessible entities of a type for a user (with filter by permission)
   */
  async getAccessibleEntities(
    userId: number,
    tenantId: number,
    entityType: EntityType,
    requiredPermission: keyof EntityPermissions = 'can_read'
  ): Promise<Array<{ entity_id: number; permissions: EntityPermissions }>> {
    // Check tenant_admin
    const adminCheck = await pool.query(
      `SELECT is_tenant_admin FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [userId, tenantId]
    );

    const { table, fk, entityTable } = TABLE_MAP[entityType];

    if (adminCheck.rows[0]?.is_tenant_admin) {
      // Return all entities for the tenant with full permissions
      const result = await pool.query(
        `SELECT e.id AS entity_id FROM ${entityTable} e
         INNER JOIN companies c ON e.company_id = c.id
         WHERE c.tenant_id = $1 AND e.deleted_at IS NULL AND e.is_active = true`,
        [tenantId]
      );
      return result.rows.map((r: any) => ({
        entity_id: r.entity_id,
        permissions: { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_reject: true, can_endorse: true },
      }));
    }

    const result = await pool.query(
      `SELECT ua.${fk} AS entity_id,
              ua.can_read, ua.can_create, ua.can_update, ua.can_delete,
              ua.can_approve, ua.can_reject, ua.can_endorse
       FROM ${table} ua
       INNER JOIN ${entityTable} e ON ua.${fk} = e.id
       INNER JOIN companies c ON e.company_id = c.id
       WHERE ua.user_id = $1 AND c.tenant_id = $2
         AND ua.is_active = true AND e.deleted_at IS NULL AND e.is_active = true
         AND ua.${requiredPermission} = true`,
      [userId, tenantId]
    );

    return result.rows.map((r: any) => ({
      entity_id: r.entity_id,
      permissions: {
        can_read: r.can_read,
        can_create: r.can_create,
        can_update: r.can_update,
        can_delete: r.can_delete,
        can_approve: r.can_approve,
        can_reject: r.can_reject,
        can_endorse: r.can_endorse,
      },
    }));
  }

  /**
   * Compute legacy access_level from granular permissions
   */
  private computeAccessLevel(perms: EntityPermissions): string {
    if (perms.can_approve || perms.can_reject || perms.can_endorse) return 'full';
    if (perms.can_create || perms.can_update || perms.can_delete) return 'write';
    return 'read';
  }
}

export default new EntityAccessService();
