/**
 * Roles Management API Routes
 * Phase 4B Feature 1: Role Templates
 * Endpoints: GET /api/roles/templates, POST /api/roles/from-template
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { RoleService } from '../services/roleService';
const router = Router();

const SUPER_ADMIN_ROLE_NAMES = ['super_admin', 'Super Admin'];
function isSuperAdminRequest(req: any): boolean {
  return Array.isArray(req.user?.roles) && req.user.roles.includes('super_admin');
}

function isReservedSuperAdminRoleName(name: any): boolean {
  const normalized = String(name ?? '').trim().toLowerCase();
  return normalized === 'super_admin' || normalized === 'super admin';
}

// =============================================
// GET /api/permissions - List all available permissions
// =============================================
router.get(
  '/permissions',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          permission_code, 
          resource, 
          action, 
          description
        FROM permissions 
        ORDER BY resource, action`
      );

      // Return in standard format { data: [...], total: number }
      res.json({
        data: result.rows,
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch permissions',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/roles/templates - List all role templates
// =============================================
router.get(
  '/templates',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          name, 
          description, 
          permissions, 
          category, 
          is_system,
          jsonb_array_length(permissions) as permission_count,
          created_at
        FROM role_templates 
        ORDER BY 
          CASE category 
            WHEN 'administrative' THEN 1
            WHEN 'operational' THEN 2
            WHEN 'financial' THEN 3
            WHEN 'readonly' THEN 4
            ELSE 5
          END,
          name ASC`
      );

      res.json({
        success: true,
        templates: result.rows,
        count: result.rows.length
      });
    } catch (error: any) {
      console.error('Error fetching role templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch role templates',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/roles/templates/:id - Get single template details
// =============================================
router.get(
  '/templates/:id',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT 
          id, 
          name, 
          description, 
          permissions, 
          category, 
          is_system,
          jsonb_array_length(permissions) as permission_count,
          created_at
        FROM role_templates 
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        template: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error fetching role template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch role template',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/roles/from-template - Create role from template
// =============================================
router.post(
  '/from-template',
  authenticate,
  requirePermission('roles:create'),
  async (req: Request, res: Response) => {
    try {
      const { template_id, role_name, company_id } = req.body;

      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(role_name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Validation
      if (!template_id || !role_name) {
        return res.status(400).json({
          success: false,
          error: 'template_id and role_name are required'
        });
      }

      // 1. Fetch template
      const templateResult = await pool.query(
        'SELECT permissions FROM role_templates WHERE id = $1',
        [template_id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      const permissions = templateResult.permissions;

      // 2. Check if role name already exists for this company
      const existingRole = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL)',
        [role_name, company_id || null]
      );

      if (existingRole.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists for this company'
        });
      }

      // 3. Create new role from template
      const newRoleResult = await pool.query(
        `INSERT INTO roles (name, permissions, company_id, created_by) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, permissions, company_id, created_at`,
        [role_name, permissions, company_id || null, req.user!.id]
      );

      const newRole = newRoleResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'Role created successfully from template',
        role: newRole
      });
    } catch (error: any) {
      console.error('Error creating role from template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create role from template',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/roles - List all roles (with pagination, excludes deleted by default)
// =============================================
router.get(
  '/',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const { company_id, search, includeDeleted } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      const excludeNames = isSuperAdminRequest(req) ? undefined : SUPER_ADMIN_ROLE_NAMES;

      // Use RoleService to get roles with pagination
      const [roles, total] = await Promise.all([
        RoleService.getAll({
          companyId: company_id ? parseInt(company_id as string) : undefined,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeNames,
          limit,
          offset
        }),
        RoleService.count({
          companyId: company_id ? parseInt(company_id as string) : undefined,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeNames
        })
      ]);

      return sendPaginated(res, roles, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/roles/:id - Get single role details
// =============================================
router.get(
  '/:id',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const roleId = parseInt(id, 10);
      if (!Number.isFinite(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role id'
        });
      }

      if (!isSuperAdminRequest(req) && (await RoleService.isRoleName(roleId, SUPER_ADMIN_ROLE_NAMES))) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      // Use RoleService to get role
      const role = await RoleService.getById(roleId);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      res.json({
        success: true,
        role: role
      });
    } catch (error: any) {
      console.error('Error fetching role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch role',
        message: error.message
      });
    }
  }
);

// =============================================
// PUT /api/roles/:id - Update role
// =============================================
router.put(
  '/:id',
  authenticate,
  requirePermission('roles:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, permissions, company_id, description } = req.body;

      const roleId = parseInt(id, 10);
      if (!Number.isFinite(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role id'
        });
      }

      if (!isSuperAdminRequest(req) && (await RoleService.isRoleName(roleId, SUPER_ADMIN_ROLE_NAMES))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Validation
      if (!name || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'Name and permissions are required'
        });
      }

      // Non-super_admin cannot rename any role to super_admin
      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one permission is required'
        });
      }

      // Check if name is already used by another role
      const nameCheck = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }

      // Use RoleService to update role
      const updatedRole = await RoleService.update(
        roleId,
        {
          name,
          permissions,
          description
        },
        req.user!.id
      );

      res.json({
        success: true,
        role: updatedRole,
        message: 'Role updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating role:', error);

      // Handle specific errors from service
      if (error.message === 'ROLE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update role',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/roles - Create new role (manual)
// =============================================
router.post(
  '/',
  authenticate,
  requirePermission('roles:create'),
  async (req: Request, res: Response) => {
    try {
      const { name, permissions, company_id, description } = req.body;

      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Validation
      if (!name || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'name and permissions (array) are required'
        });
      }

      // Check duplicate
      const existing = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL)',
        [name, company_id || null]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }

      // Use RoleService to create role
      const newRole = await RoleService.create(
        {
          name,
          permissions,
          company_id,
          description
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        role: newRole
      });
    } catch (error: any) {
      console.error('Error creating role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create role',
        message: error.message
      });
    }
  }
);

// =============================================
// DELETE /api/roles/:id - Soft delete role
// =============================================
router.delete(
  '/:id',
  authenticate,
  requirePermission('roles:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const roleId = parseInt(id, 10);
      if (!Number.isFinite(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role id'
        });
      }

      if (!isSuperAdminRequest(req) && (await RoleService.isRoleName(roleId, SUPER_ADMIN_ROLE_NAMES))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Check if role exists and not deleted
      const roleCheck = await pool.query(
        'SELECT id, name, deleted_at FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      const role = roleCheck.rows[0];

      if (role.deleted_at) {
        return res.status(400).json({
          success: false,
          error: 'Role is already deleted'
        });
      }

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
        return res.status(409).json({
          success: false,
          error: 'Cannot delete role with assigned users',
          user_count: usersWithRole.rows[0].count
        });
      }

      // Use RoleService to soft delete
      await RoleService.softDelete(roleId, req.user!.id, reason);

      res.json({
        success: true,
        message: 'Role deleted successfully (soft delete)',
        deleted_role: { id: role.id, name: role.name }
      });
    } catch (error: any) {
      console.error('Error deleting role:', error);

      if (error?.message === 'ROLE_IN_USE') {
        // Re-check active (non-deleted) users to return a correct 409 payload
        const { id } = req.params;
        const usersWithRole = await pool.query(
          `SELECT COUNT(*) as count
           FROM user_roles ur
           INNER JOIN users u ON u.id = ur.user_id
           WHERE ur.role_id = $1
             AND u.deleted_at IS NULL`,
          [id]
        );

        return res.status(409).json({
          success: false,
          error: 'Cannot delete role with assigned users',
          user_count: usersWithRole.rows?.[0]?.count ?? '0'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete role',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/roles/:id/clone - Clone existing role
// Phase 4B Feature 2: Clone Role
// =============================================
router.post(
  '/:id/clone',
  authenticate,
  requirePermission('roles:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Role name is required'
        });
      }

      // Fetch source role to check existence
      const sourceRoleResult = await pool.query(
        'SELECT id, name, company_id FROM roles WHERE id = $1',
        [id]
      );

      if (sourceRoleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Source role not found'
        });
      }

      const sourceRole = sourceRoleResult.rows[0];

      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(sourceRole.name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Check if cloned name already exists
      const duplicateCheck = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL)',
        [name.trim(), sourceRole.company_id || null]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }

      // Use RoleService to clone role
      const clonedRole = await RoleService.clone(
        parseInt(id),
        name.trim(),
        description || `Cloned from ${sourceRole.name}`,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        message: 'Role cloned successfully',
        role: clonedRole,
        source_role: {
          id: sourceRole.id,
          name: sourceRole.name
        }
      });
    } catch (error: any) {
      console.error('Error cloning role:', error);

      // Handle specific errors from service
      if (error.message === 'ROLE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'Source role not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to clone role',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/roles/:id/restore - Restore soft deleted role
// =============================================
router.post(
  '/:id/restore',
  authenticate,
  requirePermission('roles:restore'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const roleId = parseInt(id, 10);
      if (!Number.isFinite(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role id'
        });
      }

      if (!isSuperAdminRequest(req) && (await RoleService.isRoleName(roleId, SUPER_ADMIN_ROLE_NAMES))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Check if role exists and is deleted
      const roleCheck = await pool.query(
        'SELECT id, name, deleted_at FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      const role = roleCheck.rows[0];

      if (!role.deleted_at) {
        return res.status(400).json({
          success: false,
          error: 'Role is not deleted'
        });
      }

      // Use RoleService to restore
      await RoleService.restore(parseInt(id), req.user!.id);

      res.json({
        success: true,
        message: 'Role restored successfully'
      });
    } catch (error: any) {
      console.error('Error restoring role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore role',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/roles/deleted - List deleted roles
// =============================================
router.get(
  '/deleted',
  authenticate,
  requirePermission('roles:view_deleted'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          r.id,
          r.name,
          jsonb_array_length(r.permissions) as permission_count,
          r.deleted_at,
          dr.deleted_by,
          dr.reason,
          deleter.full_name as deleted_by_name,
          deleter.email as deleted_by_email
        FROM roles r
        INNER JOIN deleted_records dr ON dr.record_id = r.id AND dr.table_name = 'roles'
        LEFT JOIN users deleter ON dr.deleted_by = deleter.id
        WHERE r.deleted_at IS NOT NULL AND dr.restored_at IS NULL
        ORDER BY r.deleted_at DESC
      `);

      res.json({
        success: true,
        roles: result.rows,
        count: result.rows.length
      });
    } catch (error: any) {
      console.error('Error fetching deleted roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deleted roles',
        message: error.message
      });
    }
  }
);

export default router;
