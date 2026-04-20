/**
 * ============================================================================
 * Tenant Roles Routes — §9.2 / §9.3 Tenant Role Management
 * ============================================================================
 *
 * Full CRUD for tenant-scoped roles + analytics:
 *   - List roles with module coverage statistics
 *   - Create / Update / Delete custom tenant roles
 *   - Manage role permissions and module gates
 *   - Permissions grouped by enabled modules
 *   - Role usage summary (users per role, module coverage)
 *   - Seed system roles for a tenant
 *
 * The main platform-level CRUD for roles is in roles.ts.
 * This route provides tenant-admin operations for their own roles.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireTenantUser } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { auditLog } from '../middleware/auditLog';
import { logger } from '../utils/logger';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createTenantRoleSchema = z.object({
  name: z.string().min(2).max(100),
  name_ar: z.string().min(2).max(255).optional(),
  name_en: z.string().min(2).max(255).optional(),
  description: z.string().max(500).optional(),
  description_ar: z.string().max(500).optional(),
  hierarchy_level: z.number().int().min(1).max(10).default(5),
  module_gates: z.array(z.string()).optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
  permissions: z.array(z.string()).optional(), // permission_code strings
});

const updateTenantRoleSchema = createTenantRoleSchema.partial();

// ────────────────────────────────────────────
// GET /api/tenant-roles
// List roles with module coverage statistics
// ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      // Fetch roles with user counts and permission counts
      const rolesResult = await pool.query(
        `SELECT
           r.id,
           r.name,
           r.name_ar,
           r.name_en,
           r.display_name,
           r.description,
           r.description_ar,
           r.hierarchy_level,
           r.is_system,
           r.role_type,
           r.tenant_id,
           r.module_gates,
           r.created_at,
           r.updated_at,
           (SELECT COUNT(DISTINCT ur.user_id)
            FROM user_roles ur
            JOIN users u ON u.id = ur.user_id
            WHERE ur.role_id = r.id AND u.tenant_id = $1 AND u.deleted_at IS NULL
           ) AS user_count,
           (SELECT COUNT(*)
            FROM role_permissions rp
            WHERE rp.role_id = r.id
           ) AS permission_count,
           (SELECT ARRAY_AGG(DISTINCT p.module_code)
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id AND p.module_code IS NOT NULL
           ) AS module_codes
         FROM roles r
         WHERE r.deleted_at IS NULL
           AND r.tenant_id = $1
         ORDER BY r.hierarchy_level ASC, r.name ASC`,
        [tenantId]
      );

      // Fetch enabled modules for this tenant for cross-referencing
      const enabledModules = await pool.query(
        `SELECT module_code FROM tenant_modules
         WHERE tenant_id = $1 AND is_enabled = true`,
        [tenantId]
      );
      const enabledSet = new Set(enabledModules.rows.map((r: any) => r.module_code));

      const roles = rolesResult.rows.map((r: any) => {
        const moduleCodes = r.module_codes || [];
        return {
          id: r.id,
          name: r.name,
          display_name: r.display_name || r.name_en || r.name,
          name_ar: r.name_ar,
          description: r.description,
          description_ar: r.description_ar,
          hierarchy_level: r.hierarchy_level,
          is_system: r.is_system,
          role_type: r.role_type,
          tenant_id: r.tenant_id,
          module_gates: r.module_gates || [],
          user_count: parseInt(r.user_count || '0'),
          permission_count: parseInt(r.permission_count || '0'),
          moduleCoverage: moduleCodes,
          enabledModuleCoverage: moduleCodes.filter((c: string) => enabledSet.has(c)),
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });

      return sendSuccess(res, roles);
    } catch (error) {
      logger.error('Error fetching tenant roles:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch roles', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-roles/module-permissions (& alias /permissions)
// Permissions grouped by enabled modules
// ────────────────────────────────────────────
const handleGroupedPermissions = async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      // Get enabled modules
      const enabledModules = await pool.query(
        `SELECT tm.module_code, m.module_name, m.name_ar, m.icon_name, m.category
         FROM tenant_modules tm
         JOIN modules m ON m.module_code = tm.module_code
         WHERE tm.tenant_id = $1 AND tm.is_enabled = true AND m.is_active = true
         ORDER BY m.sort_order, m.module_name`,
        [tenantId]
      );

      // Get permissions filtered by enabled modules + shared domain
      const permissions = await pool.query(
        `SELECT
           p.id,
           p.permission_code,
           p.resource,
           p.action,
           p.description,
           COALESCE(p.module_code, 'core') AS module_code,
           p.domain
         FROM permissions p
         WHERE p.domain IN ('tenant', 'shared')
           AND (
             p.module_code IS NULL
             OR p.module_code IN (
               SELECT module_code FROM tenant_modules WHERE tenant_id = $1 AND is_enabled = true
             )
             OR p.module_code = 'core'
           )
         ORDER BY p.module_code, p.resource, p.action`,
        [tenantId]
      );

      // Group by module, then by resource
      const grouped: Record<string, { module: any; resourceMap: Record<string, any[]> }> = {};
      for (const mod of enabledModules.rows) {
        grouped[mod.module_code] = {
          module: {
            code: mod.module_code,
            name: mod.module_name,
            nameAr: mod.name_ar,
            icon: mod.icon_name,
            category: mod.category,
          },
          resourceMap: {},
        };
      }
      // Ensure 'core' is always included
      if (!grouped['core']) {
        grouped['core'] = {
          module: { code: 'core', name: 'Core System', nameAr: 'النظام الأساسي', icon: 'cog', category: 'system' },
          resourceMap: {},
        };
      }

      for (const p of permissions.rows) {
        const key = p.module_code || 'core';
        if (!grouped[key]) {
          grouped[key] = {
            module: { code: key, name: key, nameAr: key, icon: null, category: 'other' },
            resourceMap: {},
          };
        }
        const resource = p.resource || 'general';
        if (!grouped[key].resourceMap[resource]) {
          grouped[key].resourceMap[resource] = [];
        }
        grouped[key].resourceMap[resource].push({
          id: p.id,
          permission_code: p.permission_code,
          action: p.action,
          description: p.description,
          domain: p.domain,
        });
      }

      // Transform to PermissionModule[] shape expected by frontend
      const result = Object.values(grouped).map(g => ({
        module_code: g.module.code,
        module_name: g.module.name,
        module_name_ar: g.module.nameAr,
        module_icon: g.module.icon,
        module_category: g.module.category,
        resources: Object.entries(g.resourceMap).map(([resource, actions]) => ({
          resource,
          actions,
        })),
      }));

      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error fetching module permissions:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch module permissions', 500);
    }
};

const groupedPermMiddleware = [authenticate, requireTenantUser, requirePermission('roles:view'), handleGroupedPermissions];
router.get('/module-permissions', ...groupedPermMiddleware);
router.get('/permissions', ...groupedPermMiddleware);

// ────────────────────────────────────────────
// GET /api/tenant-roles/summary
// Role usage overview for tenant admin
// ────────────────────────────────────────────
router.get(
  '/summary',
  authenticate,
  requireTenantUser,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      // Total roles available to this tenant
      const totalRoles = await pool.query(
        `SELECT COUNT(*) AS count FROM roles
         WHERE deleted_at IS NULL AND (tenant_id = $1 OR tenant_id IS NULL)`,
        [tenantId]
      );

      // System vs custom roles
      const roleBreakdown = await pool.query(
        `SELECT
           CASE WHEN is_system THEN 'system' ELSE 'custom' END AS type,
           COUNT(*) AS count
         FROM roles
         WHERE deleted_at IS NULL AND (tenant_id = $1 OR tenant_id IS NULL)
         GROUP BY is_system`,
        [tenantId]
      );

      // Users per role
      const usersPerRole = await pool.query(
        `SELECT
           r.id,
           r.name,
           r.name_ar,
           COUNT(DISTINCT ur.user_id) AS user_count
         FROM roles r
         LEFT JOIN user_roles ur ON ur.role_id = r.id
         LEFT JOIN users u ON u.id = ur.user_id AND u.tenant_id = $1 AND u.deleted_at IS NULL
         WHERE r.deleted_at IS NULL AND (r.tenant_id = $1 OR r.tenant_id IS NULL)
         GROUP BY r.id, r.name, r.name_ar
         ORDER BY COUNT(DISTINCT ur.user_id) DESC`,
        [tenantId]
      );

      // Total permissions available
      const totalPermissions = await pool.query(
        `SELECT COUNT(*) AS count FROM permissions
         WHERE domain IN ('tenant', 'shared')
           AND (
             module_code IS NULL
             OR module_code IN (SELECT module_code FROM tenant_modules WHERE tenant_id = $1 AND is_enabled = true)
             OR module_code = 'core'
           )`,
        [tenantId]
      );

      // Enabled modules count
      const enabledModules = await pool.query(
        `SELECT COUNT(*) AS count FROM tenant_modules
         WHERE tenant_id = $1 AND is_enabled = true`,
        [tenantId]
      );

      // Unassigned users (users with no roles)
      const unassignedUsers = await pool.query(
        `SELECT COUNT(*) AS count FROM users u
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL AND u.is_active = true
           AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)`,
        [tenantId]
      );

      const breakdown: Record<string, number> = {};
      for (const row of roleBreakdown.rows) {
        breakdown[row.type] = parseInt(row.count);
      }

      return sendSuccess(res, {
        totalRoles: parseInt(totalRoles.rows[0]?.count || '0'),
        systemRoles: breakdown['system'] || 0,
        customRoles: breakdown['custom'] || 0,
        totalAvailablePermissions: parseInt(totalPermissions.rows[0]?.count || '0'),
        enabledModules: parseInt(enabledModules.rows[0]?.count || '0'),
        unassignedUsers: parseInt(unassignedUsers.rows[0]?.count || '0'),
        usersPerRole: usersPerRole.rows.map((r: any) => ({
          roleId: r.id,
          name: r.name,
          nameAr: r.name_ar,
          userCount: parseInt(r.user_count || '0'),
        })),
      });
    } catch (error) {
      logger.error('Error fetching role summary:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch role summary', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-roles/system-roles
// List the §9.3 default system roles
// ────────────────────────────────────────────
router.get(
  '/system-roles',
  authenticate,
  requireTenantUser,
  requirePermission('roles:view'),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT r.id, r.name, r.name_ar, r.name_en, r.display_name,
                r.description, r.description_ar,
                r.hierarchy_level, r.can_create_roles, r.module_gates,
                (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count
         FROM roles r
         WHERE r.is_system = TRUE AND r.role_type = 'tenant' AND r.deleted_at IS NULL
         ORDER BY r.hierarchy_level ASC`
      );

      return sendSuccess(res, result.rows);
    } catch (error) {
      logger.error('Error fetching system roles:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch system roles', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-roles/:id
// Get single role with full detail
// ────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }
      const { id } = req.params;

      const roleResult = await pool.query(
        `SELECT r.*, 
                (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur
                 JOIN users u ON u.id = ur.user_id
                 WHERE ur.role_id = r.id AND u.tenant_id = $1 AND u.deleted_at IS NULL
                ) AS user_count
         FROM roles r
         WHERE r.id = $2 AND r.deleted_at IS NULL
           AND (r.tenant_id = $1 OR r.tenant_id IS NULL)`,
        [tenantId, id]
      );

      if (roleResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Role not found', 404);
      }

      const role = roleResult.rows[0];

      // Fetch assigned permissions
      const permsResult = await pool.query(
        `SELECT p.id, p.permission_code, p.resource, p.action,
                p.description, p.module_code, p.domain
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.module_code, p.resource, p.action`,
        [id]
      );

      // Fetch users with this role
      const usersResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.name_ar, u.name_en, u.status,
                u.employee_id, u.avatar_url, u.profile_image
         FROM user_roles ur
         JOIN users u ON u.id = ur.user_id
         WHERE ur.role_id = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL
         ORDER BY u.full_name`,
        [id, tenantId]
      );

      return sendSuccess(res, {
        ...role,
        user_count: parseInt(role.user_count || '0'),
        permissions: permsResult.rows,
        users: usersResult.rows,
      });
    } catch (error) {
      logger.error('Error fetching tenant role detail:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch role detail', 500);
    }
  }
);

// ────────────────────────────────────────────
// POST /api/tenant-roles
// Create a new tenant-scoped custom role
// ────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_roles:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const validated = createTenantRoleSchema.parse(req.body);

      // Check duplicate name within tenant
      const existing = await pool.query(
        `SELECT id FROM roles WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND deleted_at IS NULL`,
        [validated.name, tenantId]
      );
      if (existing.rows.length > 0) {
        return sendError(res, 'DUPLICATE_ROLE', 'A role with this name already exists', 409);
      }

      // Validate module_gates against enabled modules
      if (validated.module_gates && validated.module_gates.length > 0 && !validated.module_gates.includes('*')) {
        const enabledModules = await pool.query(
          `SELECT module_code FROM tenant_modules WHERE tenant_id = $1 AND is_enabled = true`,
          [tenantId]
        );
        const enabledSet = new Set(enabledModules.rows.map((r: any) => r.module_code));
        const invalid = validated.module_gates.filter(m => !enabledSet.has(m));
        if (invalid.length > 0) {
          return sendError(res, 'INVALID_MODULES', `Module(s) not enabled: ${invalid.join(', ')}`, 400);
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const roleResult = await client.query(
          `INSERT INTO roles (name, name_ar, name_en, display_name, description, description_ar,
                              tenant_id, hierarchy_level, role_type, is_system, can_create_roles, module_gates,
                              created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'tenant', FALSE, FALSE, $9, NOW(), NOW())
           RETURNING *`,
          [
            validated.name,
            validated.name_ar || null,
            validated.name_en || validated.name,
            validated.name_en || validated.name,
            validated.description || null,
            validated.description_ar || null,
            tenantId,
            validated.hierarchy_level,
            validated.module_gates || null,
          ]
        );

        const newRole = roleResult.rows[0];

        // Assign permissions if provided (support both IDs and codes)
        if (validated.permission_ids && validated.permission_ids.length > 0) {
          for (const permId of validated.permission_ids) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
               ON CONFLICT (role_id, permission_id) DO NOTHING`,
              [newRole.id, permId]
            );
          }
        } else if (validated.permissions && validated.permissions.length > 0) {
          const permResult = await client.query(
            `SELECT id FROM permissions WHERE permission_code = ANY($1)`,
            [validated.permissions]
          );
          for (const perm of permResult.rows) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
               ON CONFLICT (role_id, permission_id) DO NOTHING`,
              [newRole.id, perm.id]
            );
          }
        }

        await client.query('COMMIT');

        return sendSuccess(res, newRole, 201, undefined, 'Role created successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, error.errors);
      }
      logger.error('Error creating tenant role:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to create role', 500);
    }
  }
);

// ────────────────────────────────────────────
// PUT /api/tenant-roles/:id
// Update a tenant-scoped role (system roles: only description)
// ────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_roles:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }
      const { id } = req.params;
      const validated = updateTenantRoleSchema.parse(req.body);

      // Fetch existing role
      const existingRole = await pool.query(
        `SELECT * FROM roles WHERE id = $1 AND deleted_at IS NULL
         AND (tenant_id = $2 OR tenant_id IS NULL)`,
        [id, tenantId]
      );
      if (existingRole.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Role not found', 404);
      }

      const role = existingRole.rows[0];

      // System roles: only allow updating description/description_ar/module_gates
      if (role.is_system) {
        const allowedSystemFields = ['description', 'description_ar', 'module_gates'];
        const attemptedFields = Object.keys(validated);
        const blocked = attemptedFields.filter(f => !allowedSystemFields.includes(f));
        if (blocked.length > 0) {
          return sendError(res, 'SYSTEM_ROLE', `Cannot modify ${blocked.join(', ')} on system roles`, 403);
        }
      }

      // Check duplicate name (exclude self)
      if (validated.name) {
        const dupe = await pool.query(
          `SELECT id FROM roles WHERE name = $1 AND id != $2
           AND (tenant_id = $3 OR tenant_id IS NULL) AND deleted_at IS NULL`,
          [validated.name, id, tenantId]
        );
        if (dupe.rows.length > 0) {
          return sendError(res, 'DUPLICATE_ROLE', 'A role with this name already exists', 409);
        }
      }

      // Build dynamic update
      const fields: string[] = [];
      const values: any[] = [];
      let paramIdx = 2;

      const fieldMap: Record<string, string> = {
        name: 'name', name_ar: 'name_ar', name_en: 'name_en',
        description: 'description', description_ar: 'description_ar',
        hierarchy_level: 'hierarchy_level', module_gates: 'module_gates',
      };

      for (const [key, col] of Object.entries(fieldMap)) {
        if ((validated as any)[key] !== undefined) {
          fields.push(`${col} = $${paramIdx}`);
          values.push((validated as any)[key]);
          paramIdx++;
        }
      }

      // Also sync display_name
      if (validated.name_en || validated.name) {
        fields.push(`display_name = $${paramIdx}`);
        values.push(validated.name_en || validated.name);
        paramIdx++;
      }

      if (fields.length === 0 && !validated.permission_ids && !validated.permissions) {
        return sendError(res, 'NO_CHANGES', 'No fields to update', 400);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (fields.length > 0) {
          fields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE roles SET ${fields.join(', ')} WHERE id = $1`,
            [id, ...values]
          );
        }

        // Update permissions if provided (support both IDs and codes)
        if (validated.permission_ids !== undefined) {
          await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
          for (const permId of validated.permission_ids!) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
               ON CONFLICT (role_id, permission_id) DO NOTHING`,
              [id, permId]
            );
          }
        } else if (validated.permissions !== undefined) {
          // Resolve permission codes to IDs
          await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
          if (validated.permissions!.length > 0) {
            const permResult = await client.query(
              `SELECT id, permission_code FROM permissions WHERE permission_code = ANY($1)`,
              [validated.permissions]
            );
            for (const perm of permResult.rows) {
              await client.query(
                `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
                 ON CONFLICT (role_id, permission_id) DO NOTHING`,
                [id, perm.id]
              );
            }
          }
        }

        await client.query('COMMIT');

        // Re-fetch updated role
        const updated = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        return sendSuccess(res, updated.rows[0], 200, undefined, 'Role updated successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, error.errors);
      }
      logger.error('Error updating tenant role:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to update role', 500);
    }
  }
);

// ────────────────────────────────────────────
// DELETE /api/tenant-roles/:id
// Soft delete a tenant-scoped custom role
// ────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_roles:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }
      const { id } = req.params;

      const role = await pool.query(
        `SELECT * FROM roles WHERE id = $1 AND deleted_at IS NULL
         AND (tenant_id = $2 OR tenant_id IS NULL)`,
        [id, tenantId]
      );
      if (role.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Role not found', 404);
      }

      // §9.3: System roles cannot be deleted
      if (role.rows[0].is_system) {
        return sendError(res, 'SYSTEM_ROLE', 'System roles cannot be deleted', 403);
      }

      // Check if any users are assigned
      const assignedUsers = await pool.query(
        `SELECT COUNT(*) AS cnt FROM user_roles ur
         JOIN users u ON u.id = ur.user_id
         WHERE ur.role_id = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL`,
        [id, tenantId]
      );
      if (parseInt(assignedUsers.rows[0].cnt) > 0) {
        return sendError(res, 'ROLE_IN_USE',
          `Cannot delete role with ${assignedUsers.rows[0].cnt} assigned user(s). Reassign first.`, 400);
      }

      // Soft delete
      await pool.query(
        'UPDATE roles SET deleted_at = NOW() WHERE id = $1',
        [id]
      );

      return sendSuccess(res, { id: parseInt(id) }, 200, undefined, 'Role deleted successfully');
    } catch (error) {
      logger.error('Error deleting tenant role:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to delete role', 500);
    }
  }
);

// ────────────────────────────────────────────
// POST /api/tenant-roles/:id/clone
// Clone a role with all its permissions
// ────────────────────────────────────────────
router.post(
  '/:id/clone',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_roles:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }
      const { id } = req.params;
      const { name, name_ar, name_en } = req.body;

      if (!name) {
        return sendError(res, 'VALIDATION_ERROR', 'Name is required for cloned role', 400);
      }

      // Fetch source role
      const source = await pool.query(
        `SELECT * FROM roles WHERE id = $1 AND deleted_at IS NULL
         AND (tenant_id = $2 OR tenant_id IS NULL)`,
        [id, tenantId]
      );
      if (source.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Source role not found', 404);
      }

      const src = source.rows[0];

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create cloned role
        const cloneResult = await client.query(
          `INSERT INTO roles (name, name_ar, name_en, display_name, description, description_ar,
                              tenant_id, hierarchy_level, role_type, is_system, module_gates,
                              created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'tenant', FALSE, $9, NOW(), NOW())
           RETURNING *`,
          [
            name,
            name_ar || src.name_ar,
            name_en || src.name_en || name,
            name_en || name,
            src.description ? `Cloned from ${src.name}. ${src.description}` : `Cloned from ${src.name}`,
            src.description_ar,
            tenantId,
            src.hierarchy_level,
            src.module_gates,
          ]
        );
        const newRole = cloneResult.rows[0];

        // Copy permissions
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT $1, permission_id FROM role_permissions WHERE role_id = $2
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [newRole.id, id]
        );

        await client.query('COMMIT');

        return sendSuccess(res, newRole, 201, undefined, 'Role cloned successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error cloning tenant role:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to clone role', 500);
    }
  }
);

// ────────────────────────────────────────────
// PUT /api/tenant-roles/:id/permissions
// Replace all permissions for a role
// ────────────────────────────────────────────
router.put(
  '/:id/permissions',
  authenticate,
  requireTenantUser,
  requirePermission('roles:manage_permissions'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }
      const { id } = req.params;
      const { permission_ids } = req.body;

      if (!Array.isArray(permission_ids)) {
        return sendError(res, 'VALIDATION_ERROR', 'permission_ids must be an array', 400);
      }

      // Verify role exists and accessible
      const role = await pool.query(
        `SELECT * FROM roles WHERE id = $1 AND deleted_at IS NULL
         AND (tenant_id = $2 OR tenant_id IS NULL)`,
        [id, tenantId]
      );
      if (role.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Role not found', 404);
      }

      // Validate that permissions are in tenant/shared domain and enabled modules
      if (permission_ids.length > 0) {
        const validPerms = await pool.query(
          `SELECT id FROM permissions
           WHERE id = ANY($1)
             AND domain IN ('tenant', 'shared')
             AND (
               module_code IS NULL
               OR module_code IN (SELECT module_code FROM tenant_modules WHERE tenant_id = $2 AND is_enabled = true)
               OR module_code = 'core'
             )`,
          [permission_ids, tenantId]
        );
        const validIds = new Set(validPerms.rows.map((r: any) => r.id));
        const invalid = permission_ids.filter((pid: number) => !validIds.has(pid));
        if (invalid.length > 0) {
          return sendError(res, 'INVALID_PERMISSIONS',
            `${invalid.length} permission(s) are not valid for this tenant`, 400,
            { invalid_ids: invalid });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        if (permission_ids.length > 0) {
          for (const permId of permission_ids) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
               ON CONFLICT (role_id, permission_id) DO NOTHING`,
              [id, permId]
            );
          }
        }

        await client.query('COMMIT');

        const updated = await pool.query(
          `SELECT p.id, p.permission_code, p.resource, p.action, p.module_code
           FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = $1 ORDER BY p.module_code, p.resource`,
          [id]
        );

        return sendSuccess(res, {
          role_id: parseInt(id),
          permission_count: updated.rows.length,
          permissions: updated.rows,
        }, 200, undefined, 'Permissions updated');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error updating role permissions:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to update permissions', 500);
    }
  }
);

export default router;
