/**
 * Roles Management API Routes
 * Phase 4B Feature 1: Role Templates
 * Endpoints: GET /api/roles/templates, POST /api/roles/from-template
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { companyScopeGuard } from '../middleware/companyScopeGuard';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { RoleService } from '../services/roleService';
import { auditLog } from '../middleware/auditLog';
const router = Router();

const SUPER_ADMIN_ROLE_NAMES = ['super_admin', 'Super Admin'];
function isSuperAdminRequest(req: any): boolean {
  return Array.isArray(req.user?.roles) && req.user.roles.includes('super_admin');
}

/** Extract tenant_id from isolation middleware (secure). */
function getRequestTenantId(req: any): number | null {
  return getIsolatedTenantId(req);
}

function isReservedSuperAdminRoleName(name: any): boolean {
  const normalized = String(name ?? '').trim().toLowerCase();
  return normalized === 'super_admin' || normalized === 'super admin';
}

// =============================================
// GET /api/roles/permissions - List all available permissions
// =============================================
router.get(
  '/permissions',
  authenticate,
  requirePermission('roles:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getRequestTenantId(req);
      const { grouped, module_filter } = req.query;

      // Base fields: include module_code for module grouping
      const baseFields = `
        p.id, 
        p.permission_code, 
        p.resource, 
        p.action, 
        p.description,
        p.domain,
        p.module_code,
        COALESCE(m.module_name, p.module, 'general') as module_name,
        m.category as module_category,
        m.icon_name as module_icon,
        m.is_core as module_is_core
      `;

      let query: string;
      let params: any[] = [];
      let paramIdx = 1;

      if (tenantId) {
        // Tenant users: only tenant/user permissions, optionally filtered by enabled modules
        query = `SELECT ${baseFields}
          FROM permissions p
          LEFT JOIN modules m ON p.module_code = m.module_code
          WHERE p.domain IN ('tenant', 'user')`;

        // If module_filter=enabled, only show permissions for modules enabled for the tenant
        if (module_filter === 'enabled') {
          // Try tenant_id first, fallback to company_id
          const companyId = (req as any).companyId;
          query += ` AND (
            p.module_code IS NULL 
            OR p.module_code IN (
              SELECT DISTINCT tm.module_code FROM tenant_modules tm 
              WHERE (tm.tenant_id = $${paramIdx} OR tm.company_id = $${paramIdx + 1}) 
                AND tm.is_enabled = true
            )
            OR m.is_core = true
          )`;
          params.push(tenantId, companyId || 0);
          paramIdx += 2;
        }
      } else {
        // Platform users see ALL permissions
        query = `SELECT ${baseFields}
          FROM permissions p
          LEFT JOIN modules m ON p.module_code = m.module_code`;
      }

      query += ` ORDER BY COALESCE(m.category, 'zzz'), COALESCE(m.module_name, p.module, 'general'), p.resource, p.action`;

      const result = await pool.query(query, params);

      // If grouped=true, return permissions in Module → Resource → Action hierarchy
      if (grouped === 'true') {
        const modules: Record<string, any> = {};
        // Track seen permission codes to avoid duplicates
        const seenPermCodes = new Set<string>();
        
        for (const row of result.rows) {
          // Skip duplicate permission codes
          if (seenPermCodes.has(row.permission_code)) continue;
          seenPermCodes.add(row.permission_code);

          // Normalize module key to lowercase to prevent duplicates (e.g., 'customs' vs 'Customs')
          const rawKey = row.module_code || row.module_name || 'general';
          const moduleKey = String(rawKey).toLowerCase().replace(/\s+/g, '_');
          if (!modules[moduleKey]) {
            // Use module_code if available, otherwise derive a unique code from module_name
            const derivedCode = row.module_code || (row.module_name ? row.module_name.toLowerCase().replace(/\s+/g, '_') : 'general');
            modules[moduleKey] = {
              module_code: derivedCode,
              module_name: row.module_name || 'General',
              module_category: row.module_category || 'other',
              module_icon: row.module_icon || 'Cog6ToothIcon',
              is_core: row.module_is_core || false,
              resources: {},
            };
          }
          
          const resource = row.resource;
          if (!modules[moduleKey].resources[resource]) {
            modules[moduleKey].resources[resource] = {
              resource,
              actions: [],
            };
          }
          
          modules[moduleKey].resources[resource].actions.push({
            id: row.id,
            permission_code: row.permission_code,
            action: row.action,
            description: row.description,
            domain: row.domain,
          });
        }

        // Convert to array format
        const groupedData = Object.values(modules).map((mod: any) => ({
          ...mod,
          resources: Object.values(mod.resources),
        }));

        return res.json({
          data: groupedData,
          total: result.rows.length,
          format: 'grouped',
        });
      }

      // Flat format (backward compatible)
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
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { template_id, role_name, company_id } = req.body;
      const tenantId = getRequestTenantId(req);

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

      // Tenant isolation: enforce tenant's own company_id
      const effectiveCompanyId = tenantId
        ? (req.user as any)?.company_id || null
        : (company_id || null);

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

      let permissions = templateResult.rows[0].permissions;

      // Tenant users: filter out platform permissions
      if (tenantId) {
        const platformPerms = await pool.query(
          "SELECT permission_code FROM permissions WHERE domain = 'platform'"
        );
        const platformPermCodes = new Set(platformPerms.rows.map((r: any) => r.permission_code));
        if (Array.isArray(permissions)) {
          permissions = permissions.filter((p: string) => !platformPermCodes.has(p));
        }
      }

      // 2. Check if role name already exists (scoped to tenant)
      let existingRole;
      if (tenantId) {
        existingRole = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND deleted_at IS NULL',
          [role_name, tenantId]
        );
      } else {
        existingRole = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL)',
          [role_name, effectiveCompanyId]
        );
      }

      if (existingRole.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists for this company'
        });
      }

      // 3. Create new role from template
      const newRoleResult = await pool.query(
        `INSERT INTO roles (name, permissions, company_id, tenant_id, created_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, permissions, company_id, created_at`,
        [role_name, JSON.stringify(permissions), effectiveCompanyId, tenantId, req.user!.id]
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
  companyScopeGuard,
  async (req: Request, res: Response) => {
    try {
      const { company_id, search, includeDeleted } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      const excludeNames = isSuperAdminRequest(req) ? undefined : SUPER_ADMIN_ROLE_NAMES;
      const tenantId = getRequestTenantId(req);

      // Use active company from header/context if not explicitly passed
      const effectiveCompanyId = company_id 
        ? parseInt(company_id as string) 
        : (req as any).companyId || undefined;

      // Use RoleService to get roles with pagination
      // Tenant users see system roles + their own custom roles
      const [roles, total] = await Promise.all([
        RoleService.getAll({
          companyId: effectiveCompanyId,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeNames,
          tenantId,
          limit,
          offset
        }),
        RoleService.count({
          companyId: effectiveCompanyId,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeNames,
          tenantId
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

      // Tenant isolation: tenant users can only view system roles or their own tenant's roles
      const tenantId = getRequestTenantId(req);
      if (tenantId && role.tenant_id !== null && role.tenant_id !== tenantId) {
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
  auditLog,
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

      // Tenant isolation: tenant users can only edit their own custom roles
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const roleCheck = await pool.query('SELECT tenant_id FROM roles WHERE id = $1', [roleId]);
        if (roleCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Role not found' });
        }
        const roleTenantId = roleCheck.rows[0].tenant_id;
        // Tenant users can only edit roles belonging to their tenant (not system roles or other tenants' roles)
        if (roleTenantId === null || roleTenantId !== tenantId) {
          return res.status(403).json({ success: false, error: 'لا يمكنك تعديل هذا الدور' });
        }
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

      // Check if name is already used by another active role
      // Scope to the same tenant_id as the role being edited (avoid cross-tenant false conflicts)
      const roleTenantRow = tenantId
        ? { tenant_id: tenantId } // already verified above
        : (await pool.query('SELECT tenant_id FROM roles WHERE id = $1', [roleId])).rows[0];

      if (!roleTenantRow) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      let nameCheckQuery: string;
      let nameCheckParams: any[];
      if (roleTenantRow.tenant_id) {
        // Tenant-scoped: check within same tenant + system roles
        nameCheckQuery = 'SELECT id FROM roles WHERE name = $1 AND id != $2 AND deleted_at IS NULL AND (tenant_id = $3 OR tenant_id IS NULL)';
        nameCheckParams = [name, roleId, roleTenantRow.tenant_id];
      } else {
        // System role (tenant_id IS NULL): only check other system roles
        nameCheckQuery = 'SELECT id FROM roles WHERE name = $1 AND id != $2 AND deleted_at IS NULL AND tenant_id IS NULL';
        nameCheckParams = [name, roleId];
      }
      const nameCheck = await pool.query(nameCheckQuery, nameCheckParams);

      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }

      // Tenant users: filter out platform permissions from the update
      let filteredPermissions = permissions;
      if (tenantId) {
        const platformPerms = await pool.query(
          "SELECT id FROM permissions WHERE domain = 'platform'"
        );
        const platformPermIds = new Set(platformPerms.rows.map((r: any) => r.id));
        filteredPermissions = permissions.filter((pid: number) => !platformPermIds.has(pid));
      }

      // Use RoleService to update role
      const updatedRole = await RoleService.update(
        roleId,
        {
          name,
          permissions: filteredPermissions,
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
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { name, permissions, company_id, description } = req.body;
      const tenantId = getRequestTenantId(req);

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

      // Validate body company_id belongs to the tenant (if specified)
      let safeCompanyId = company_id;
      if (tenantId && company_id) {
        const companyCheck = await pool.query(
          'SELECT id FROM companies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
          [company_id, tenantId]
        );
        if (companyCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Cannot create role for a company outside your tenant'
          });
        }
      } else if (tenantId && !company_id) {
        // For tenant users without explicit company_id, use middleware context
        safeCompanyId = (req as any).companyId || null;
      }

      // Tenant users: filter out any platform permissions they shouldn't assign
      let filteredPermissions = permissions;
      if (tenantId) {
        const allowedPerms = await pool.query(
          `SELECT permission_code FROM permissions WHERE domain IN ('tenant', 'user')`
        );
        const allowedSet = new Set(allowedPerms.rows.map((r: any) => r.permission_code));
        filteredPermissions = permissions.filter((p: string) => allowedSet.has(p));
      }

      // Check duplicate (scoped to tenant)
      let existing;
      if (tenantId) {
        existing = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND deleted_at IS NULL',
          [name, tenantId]
        );
      } else {
        existing = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL',
          [name, safeCompanyId || null]
        );
      }

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }

      // Use RoleService to create role (with tenant_id for tenant users)
      const newRole = await RoleService.create(
        {
          name,
          permissions: filteredPermissions,
          company_id: safeCompanyId,
          description,
          tenant_id: tenantId
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
  auditLog,
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

      // Tenant isolation: tenant users can only delete their own custom roles
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const roleOwner = await pool.query(
          'SELECT tenant_id FROM roles WHERE id = $1',
          [roleId]
        );
        if (roleOwner.rows.length > 0 && roleOwner.rows[0].tenant_id !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'لا يمكن حذف أدوار النظام أو أدوار عملاء آخرين'
          });
        }
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
      const tenantId = getRequestTenantId(req);

      const sourceRoleResult = await pool.query(
        'SELECT id, name, company_id, tenant_id FROM roles WHERE id = $1',
        [id]
      );

      if (sourceRoleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Source role not found'
        });
      }

      const sourceRole = sourceRoleResult.rows[0];

      // Tenant isolation: tenant users can only clone system roles or their own tenant's roles
      if (tenantId && sourceRole.tenant_id !== null && sourceRole.tenant_id !== tenantId) {
        return res.status(404).json({
          success: false,
          error: 'Source role not found'
        });
      }

      if (!isSuperAdminRequest(req) && isReservedSuperAdminRoleName(sourceRole.name)) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Check if cloned name already exists (scoped to tenant)
      let duplicateCheck;
      if (tenantId) {
        duplicateCheck = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND deleted_at IS NULL',
          [name.trim(), tenantId]
        );
      } else {
        duplicateCheck = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND (company_id = $2 OR company_id IS NULL)',
          [name.trim(), sourceRole.company_id || null]
        );
      }

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
        'SELECT id, name, deleted_at, tenant_id FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      const role = roleCheck.rows[0];

      // Tenant isolation: tenant users can only restore their own tenant's roles
      const tenantId = getRequestTenantId(req);
      if (tenantId && role.tenant_id !== null && role.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

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
      const tenantId = getRequestTenantId(req);

      let query = `
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
      `;
      const params: any[] = [];

      // Tenant isolation: only show tenant's own deleted roles (+ system roles)
      if (tenantId) {
        query += ` AND (r.tenant_id IS NULL OR r.tenant_id = $1)`;
        params.push(tenantId);
      }

      query += ` ORDER BY r.deleted_at DESC`;

      const result = await pool.query(query, params);

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
