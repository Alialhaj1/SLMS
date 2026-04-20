/**
 * ============================================================================
 * RBAC Middleware v2 — Architecture §4
 * ============================================================================
 *
 * Implements comprehensive permission system with:
 *   §4.1  7-level role hierarchy (God → View Only)
 *   §4.2  Permission format with wildcard support (shipments.*, *.read)
 *   §4.3  Module-level gating (requireModule middleware in moduleGating.ts)
 *   Backward-compatible with legacy resource:action format
 *
 * Changes from v1:
 *   - Replaced suffix matching with proper wildcard matching via PermissionService
 *   - Permissions loaded via PermissionService (module-gated + cached)
 *   - Hierarchy enforcement in requireHierarchy middleware
 *   - All matching delegated to matchPermission() for consistency
 *   - Super admin bypass unchanged (platform user + super_admin role)
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import {
  PermissionService,
  matchPermission,
  hasPermissionMatch,
  hasAnyPermissionMatch,
  RoleHierarchy,
  SUPER_ADMIN_ROLE_NAMES,
} from '../services/permissionService';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type PermissionAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'cancel'
  | 'export' | 'import' | 'print' | 'download' | 'submit'
  | 'receive' | 'ship' | 'adjust' | 'count'
  | 'post' | 'reverse' | 'reconcile' | 'close' | 'reopen'
  | 'manage' | 'view_all' | 'audit' | 'backup';

export type PermissionResource = string;
export type Permission = `${PermissionResource}:${PermissionAction}` | string;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    full_name?: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
    tenant_id?: number | null;
    login_context?: 'platform' | 'tenant';
    session_id?: string;
    hierarchy_level?: number;
    enabled_modules?: string[];
    is_tenant_admin?: boolean;
  };
}

// ────────────────────────────────────────────
// Permission Constants — backward compat
// ────────────────────────────────────────────

export const PERMISSIONS = {
  // Shipments Module (شحنات)
  SHIPMENTS_VIEW: 'shipments:view',
  SHIPMENTS_CREATE: 'shipments:create',
  SHIPMENTS_EDIT: 'shipments:edit',
  SHIPMENTS_DELETE: 'shipments:delete',
  SHIPMENTS_APPROVE: 'shipments:approve',
  SHIPMENTS_CANCEL: 'shipments:cancel',

  // Accounting Module (محاسبة)
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE: 'accounting:create',
  ACCOUNTING_EDIT: 'accounting:edit',
  ACCOUNTING_DELETE: 'accounting:delete',
  ACCOUNTING_APPROVE: 'accounting:approve',

  // Customs Module (جمارك)
  CUSTOMS_VIEW: 'customs:view',
  CUSTOMS_CREATE: 'customs:create',
  CUSTOMS_EDIT: 'customs:edit',
  CUSTOMS_DELETE: 'customs:delete',
  CUSTOMS_SUBMIT: 'customs:submit',

  // Inventory Module (مستودع)
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_RECEIVE: 'inventory:receive',
  INVENTORY_SHIP: 'inventory:ship',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_COUNT: 'inventory:count',

  // Administration (إدارة)
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT: 'admin:audit',

  // Platform (منصة) - Super admin only
  PLATFORM_TENANTS: 'platform:tenants',
  PLATFORM_USERS: 'platform:users',
  PLATFORM_SYSTEM: 'platform:system',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  PLATFORM_SUPPORT: 'platform_support',
  TENANT_OWNER: 'tenant_owner',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  TENANT_USER: 'tenant_user',
  TENANT_CUSTOMS: 'tenant_customs',
  TENANT_WAREHOUSE: 'tenant_warehouse',
  TENANT_ACCOUNTING: 'tenant_accounting',
  VIEW_ONLY: 'view_only',
} as const;

// Re-export hierarchy levels so consumers don't need to import permissionService
export { RoleHierarchy };

// ────────────────────────────────────────────
// Internal Helpers
// ────────────────────────────────────────────

function isSuperAdmin(user: AuthRequest['user']): boolean {
  if (!user) return false;
  return PermissionService.isSuperAdmin(user.roles, user.tenant_id);
}

/**
 * Tenant admin bypass: users with is_tenant_admin=true have full access
 * within their own tenant scope (equivalent to super_admin but scoped to tenant).
 * These users are still blocked from platform-only routes by auth.ts context check.
 */
function isTenantAdmin(user: AuthRequest['user']): boolean {
  if (!user) return false;
  
  // Primary check: is_tenant_admin flag from JWT
  const val = (user as any).is_tenant_admin;
  const tid = user.tenant_id;
  if (val === true && !!tid) return true;
  
  // Fallback: check roles array in JWT for 'tenant_admin' role
  // This covers tokens issued before is_tenant_admin was added to JWT payload
  if (tid && Array.isArray((user as any).roles)) {
    const roles: string[] = (user as any).roles;
    if (roles.includes('tenant_admin')) return true;
  }
  
  return false;
}

/**
 * Log super_admin bypass for audit trail (F03 — M01 fix).
 * Fires asynchronously so it doesn't block the request.
 */
function logSuperAdminBypass(req: AuthRequest, bypassedCheck: string): void {
  const user = req.user;
  if (!user) return;
  setImmediate(async () => {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, tenant_id, entity, created_at)
         VALUES ($1, 'SUPER_ADMIN_BYPASS', $2, $3, $4, $5, $6, NOW())`,
        [
          user.id,
          `${req.method} ${req.path}`,
          req.ip || 'unknown',
          (req.get('User-Agent') || '').substring(0, 500),
          user.tenant_id || null,
          JSON.stringify({ bypassed_check: bypassedCheck, roles: user.roles }),
        ]
      );
    } catch (e) {
      logger.warn('Failed to log super_admin bypass', { error: e });
    }
  });
}

/**
 * Load and cache permissions on the request's user object.
 * Uses PermissionService which respects module gating + domain filtering.
 */
async function ensureUserPermissions(req: AuthRequest): Promise<string[]> {
  const user = req.user;
  if (!user) return [];

  // Already loaded this request cycle
  const existing = user.permissions;
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const permSet = await PermissionService.loadPermissions(user.id, user.tenant_id);
  user.permissions = permSet.permissions;
  user.hierarchy_level = permSet.hierarchyLevel;
  user.enabled_modules = permSet.enabledModules;
  return permSet.permissions;
}

/**
 * Legacy-compatible function: load user permissions by userId.
 * Used by routes that need permissions outside the request cycle.
 */
async function loadUserPermissions(userId: number, tenantId?: number | null): Promise<string[]> {
  const permSet = await PermissionService.loadPermissions(userId, tenantId ?? null);
  return permSet.permissions;
}

// ────────────────────────────────────────────
// Core Middleware: requirePermission
// ────────────────────────────────────────────

/**
 * RBAC Middleware — Check if user has required permission.
 *
 * Usage:
 *   requirePermission('shipments:create')
 *   requirePermission('shipments.purchase_orders.approve')
 *   requirePermission('shipments.*')  — any shipments permission
 *
 * Features:
 *   - Super admin bypass (platform users only)
 *   - Wildcard matching (shipments.*, *.read, *)
 *   - Module-gated permission loading
 *   - Audit logging on denial
 */
export const requirePermission = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // Super admin bypass (platform super_admin only)
      if (isSuperAdmin(user)) {
        logSuperAdminBypass(req, `permission:${permission}`);
        return next();
      }

      // Tenant admin bypass: full access within own tenant
      if (isTenantAdmin(user)) {
        return next();
      }

      // Load permissions (cached, module-gated)
      const userPermissions = await ensureUserPermissions(req);

      // Wildcard-aware matching
      const granted = hasPermissionMatch(userPermissions, permission);

      if (!granted) {
        await logPermissionDenial({
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          permission,
          method: req.method,
          path: req.path,
          ip: req.ip,
          user_agent: req.get('User-Agent') || '',
          roles: user.roles,
          session_id: user.session_id,
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          error_ar: 'غير مصرح لك بهذا الإجراء',
          message: `You don't have permission: ${permission}`,
          message_ar: `ليس لديك صلاحية: ${getPermissionNameAr(permission)}`,
          code: 'PERMISSION_DENIED',
          required_permission: permission,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', { permission, error });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

// ────────────────────────────────────────────
// Core Middleware: requireAnyPermission
// ────────────────────────────────────────────

/**
 * Check if user has ANY of the specified permissions (OR logic).
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isSuperAdmin(user)) {
        logSuperAdminBypass(req, `anyPermission:${permissions.join('|')}`);
        return next();
      }

      if (isTenantAdmin(user)) {
        return next();
      }

      const userPermissions = await ensureUserPermissions(req);

      const granted = hasAnyPermissionMatch(userPermissions, permissions);

      if (!granted) {
        await logPermissionDenial({
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          permission: permissions.join('|'),
          method: req.method,
          path: req.path,
          ip: req.ip,
          user_agent: req.get('User-Agent') || '',
          roles: user.roles,
          session_id: user.session_id,
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          error_ar: 'غير مصرح لك بأي من هذه الإجراءات',
          message: `You don't have any of the required permissions: ${permissions.join(', ')}`,
          message_ar: `ليس لديك أي من الصلاحيات المطلوبة: ${permissions.map(getPermissionNameAr).join('، ')}`,
          code: 'PERMISSION_DENIED',
          required_permissions: permissions,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed (any)', { permissions, error });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        error_ar: 'خطأ داخلي في النظام',
        code: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

// ────────────────────────────────────────────
// Hierarchy Middleware — §4.1
// ────────────────────────────────────────────

/**
 * Require the user's hierarchy level to be at least `minLevel`.
 *
 * Usage:
 *   requireHierarchy(RoleHierarchy.TENANT_ADMIN)  // level >= 2
 *   requireHierarchy(RoleHierarchy.PLATFORM_ADMIN) // level >= 5
 */
export const requireHierarchy = (minLevel: number) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      if (isSuperAdmin(user)) {
        logSuperAdminBypass(req, `hierarchy:${minLevel}`);
        return next();
      }

      if (isTenantAdmin(user)) {
        return next();
      }

      // Ensure permissions are loaded (which also loads hierarchy_level)
      await ensureUserPermissions(req);

      const level = user.hierarchy_level ?? 0;
      if (level < minLevel) {
        await logPermissionDenial({
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          permission: `HIERARCHY_LEVEL_${minLevel}`,
          method: req.method,
          path: req.path,
          ip: req.ip,
          user_agent: req.get('User-Agent') || '',
          roles: user.roles,
          session_id: user.session_id,
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient role level',
          error_ar: 'مستوى الصلاحية غير كافٍ',
          message: `This action requires role hierarchy level ${minLevel} or higher`,
          message_ar: `هذا الإجراء يتطلب مستوى صلاحية ${minLevel} أو أعلى`,
          code: 'HIERARCHY_INSUFFICIENT',
          required_level: minLevel,
          current_level: level,
        });
      }

      next();
    } catch (error) {
      logger.error('Hierarchy check failed', { minLevel, error });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'HIERARCHY_CHECK_ERROR',
      });
    }
  };
};

// ────────────────────────────────────────────
// Context Middleware
// ────────────────────────────────────────────

/**
 * Platform-only access (tenant_id = null)
 */
export const requirePlatformUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_ar: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED',
      });
    }

    if (user.tenant_id !== null && user.tenant_id !== undefined) {
      await logPermissionDenial({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        permission: 'PLATFORM_ACCESS',
        method: req.method,
        path: req.path,
        ip: req.ip,
        user_agent: req.get('User-Agent') || '',
        roles: user.roles,
        session_id: user.session_id,
      });

      return res.status(403).json({
        success: false,
        error: 'Platform access required',
        error_ar: 'الوصول للمنصة مطلوب',
        code: 'PLATFORM_ACCESS_REQUIRED',
      });
    }

    next();
  } catch (error) {
    logger.error('Platform access check failed', { error });
    return res.status(500).json({
      success: false,
      error: 'Platform access check failed',
      error_ar: 'فشل التحقق من الوصول للمنصة',
      code: 'PLATFORM_CHECK_ERROR',
    });
  }
};

/**
 * Tenant-only access (tenant_id != null)
 */
export const requireTenantUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_ar: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED',
      });
    }

    if (user.tenant_id === null || user.tenant_id === undefined) {
      await logPermissionDenial({
        user_id: user.id,
        tenant_id: user.tenant_id ?? null,
        email: user.email,
        permission: 'TENANT_ACCESS',
        method: req.method,
        path: req.path,
        ip: req.ip,
        user_agent: req.get('User-Agent') || '',
        roles: user.roles,
        session_id: user.session_id,
      });

      return res.status(403).json({
        success: false,
        error: 'Tenant access required',
        error_ar: 'الوصول للشركة مطلوب',
        code: 'TENANT_ACCESS_REQUIRED',
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant access check failed', { error });
    return res.status(500).json({
      success: false,
      error: 'Tenant access check failed',
      error_ar: 'فشل التحقق من الوصول للشركة',
      code: 'TENANT_CHECK_ERROR',
    });
  }
};

// ────────────────────────────────────────────
// Audit Logging
// ────────────────────────────────────────────

interface PermissionDenialLog {
  user_id: number;
  tenant_id: number | null | undefined;
  email: string;
  permission: string;
  method: string;
  path: string;
  ip: string | undefined;
  user_agent: string;
  roles: string[];
  session_id?: string;
}

async function logPermissionDenial(data: PermissionDenialLog): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, tenant_id, action, resource,
        details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        data.user_id,
        data.tenant_id ?? null,
        'PERMISSION_DENIED',
        data.permission,
        JSON.stringify({
          email: data.email,
          method: data.method,
          path: data.path,
          roles: data.roles,
          session_id: data.session_id,
          severity: 'WARNING',
        }),
        data.ip || null,
        data.user_agent,
      ]
    );
  } catch (error) {
    logger.error('Failed to log permission denial', { error });
  }
}

// ────────────────────────────────────────────
// Arabic Translations
// ────────────────────────────────────────────

function getPermissionNameAr(permission: string): string {
  const translations: Record<string, string> = {
    'shipments:view': 'عرض الشحنات',
    'shipments:create': 'إنشاء شحنة',
    'shipments:edit': 'تعديل الشحنات',
    'shipments:delete': 'حذف الشحنات',
    'shipments:approve': 'اعتماد الشحنات',
    'shipments:cancel': 'إلغاء الشحنات',
    'accounting:view': 'عرض المحاسبة',
    'accounting:create': 'إنشاء قيود محاسبية',
    'accounting:edit': 'تعديل المحاسبة',
    'accounting:delete': 'حذف القيود',
    'accounting:approve': 'اعتماد القيود',
    'customs:view': 'عرض الجمارك',
    'customs:create': 'إنشاء بيانات جمركية',
    'customs:edit': 'تعديل الجمارك',
    'customs:delete': 'حذف البيانات الجمركية',
    'customs:submit': 'تقديم البيانات الجمركية',
    'inventory:view': 'عرض المستودع',
    'inventory:receive': 'استلام البضائع',
    'inventory:ship': 'شحن البضائع',
    'inventory:adjust': 'تعديل المخزون',
    'inventory:count': 'جرد المخزون',
    'admin:users': 'إدارة المستخدمين',
    'admin:roles': 'إدارة الأدوار',
    'admin:settings': 'إدارة الإعدادات',
    'admin:audit': 'سجل التدقيق',
    'platform:tenants': 'إدارة الشركات',
    'platform:users': 'إدارة مستخدمي المنصة',
    'platform:system': 'إدارة النظام',
  };

  return translations[permission] || permission;
}

// ────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────

export {
  loadUserPermissions,
  ensureUserPermissions,
  matchPermission,
  hasPermissionMatch,
  hasAnyPermissionMatch,
};
