import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export type PermissionAction = 
  | 'view' | 'create' | 'edit' | 'delete' 
  | 'export' | 'import' | 'print' | 'download' 
  | 'pdf' | 'lock' | 'freeze' | 'approve'
  | 'reject' | 'manage' | 'view_all' | 'cancel'
  | 'post' | 'reverse' | 'reconcile' | 'close' | 'reopen';

export type PermissionResource = string;

export type Permission = `${PermissionResource}:${PermissionAction}` | string;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions?: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

async function loadUserPermissions(userId: number): Promise<string[]> {
  const result = await pool.query(
    `
    SELECT DISTINCT permission_code
    FROM (
      SELECT p.permission_code
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1

      UNION

      SELECT jsonb_array_elements_text(r.permissions) as permission_code
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    ) t
    ORDER BY permission_code
    `,
    [userId]
  );

  return (result.rows || [])
    .map((r: any) => r.permission_code)
    .filter((p: any) => typeof p === 'string' && p.length > 0);
}

async function ensureUserPermissions(req: AuthRequest): Promise<string[]> {
  const user = req.user;
  if (!user) return [];

  const existing = user.permissions;
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const perms = await loadUserPermissions(user.id);
  user.permissions = perms;
  return perms;
}

/**
 * RBAC Middleware - Check if user has required permission
 * Usage: requirePermission('users:create')
 * 
 * Security Features:
 * - Validates user authentication
 * - Checks permissions from JWT token
 * - Super admin bypass for system operations
 * - Audit logging for permission denials
 */
export const requirePermission = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin has all permissions (bypass permission checks)
      const SUPER_ADMIN_ROLES = ['super_admin', 'super admin', 'admin', 'system_admin', 'system admin'];
      const isSuperAdmin = (user.roles || []).some(role => {
        const normalized = String(role || '').trim().toLowerCase();
        return SUPER_ADMIN_ROLES.includes(normalized);
      });
      if (isSuperAdmin) {
        return next();
      }

      // Permissions are loaded on-demand (JWT is intentionally small)
      const userPermissions = await ensureUserPermissions(req);

      // Check if user has the required permission
      if (!userPermissions.includes(permission)) {
        // Log permission denial for security audit
        console.warn(`Permission denied: User ${user.id} (${user.email}) attempted ${permission} on ${req.method} ${req.path}`);
        
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden',
          message: `You don't have permission: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Super admin bypass
      const SUPER_ADMIN_ROLES = ['super_admin', 'super admin', 'admin', 'system_admin', 'system admin'];
      const isSuperAdmin = (user.roles || []).some(role => {
        const normalized = String(role || '').trim().toLowerCase();
        return SUPER_ADMIN_ROLES.includes(normalized);
      });
      if (isSuperAdmin) {
        return next();
      }

      // Permissions are loaded on-demand (JWT is intentionally small)
      const userPermissions = await ensureUserPermissions(req);

      const hasPermission = permissions.some(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You don't have any of the required permissions: ${permissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};
