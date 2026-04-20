/**
 * ============================================================================
 * ENHANCED PERMISSIONS HOOK - Arabic Specification Implementation
 * ============================================================================
 * Features:
 * - Real backend integration with RBAC system
 * - Permission caching with automatic refresh
 * - Role-based access control with hierarchical permissions
 * - Arabic permission name translations
 * - Platform vs tenant user distinction
 * - Loading states and error handling
 * - Permission group organization
 * - Bulk permission checking
 * - Permission denial logging
 * - Backward compatibility with existing API
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useLocale } from '../contexts/LocaleContext';
import type { Permission } from '../types/permissions';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
} from '../types/permissions';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserPermission {
  permission_code: string;
  resource: string;
  action: string;
  description: string;
  description_ar?: string;
  granted_at: string;
  granted_by?: string;
  role_name?: string;
}

export interface PermissionGroup {
  name: string;
  name_ar?: string;
  permissions: UserPermission[];
  description?: string;
  description_ar?: string;
}

export interface PermissionState {
  permissions: UserPermission[];
  groups: PermissionGroup[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  cacheExpiry: number;
}

// Dangerous actions that require confirmation
const DANGEROUS_ACTIONS = [
  'delete',
  'post',
  'reverse',
  'restore',
  'approve',
  'reject',
  'cancel',
  'close',
  'reopen',
];

// Super admin role names (normalized to lowercase for case-insensitive matching)
// NOTE: 'admin' is NOT included — it's used for tenant admins who must NOT bypass permissions
const SUPER_ADMIN_ROLES = [
  'super_admin',
  'super admin',
  'system_admin',
  'system admin',
];

const normalizeRoleName = (roleName: unknown): string => {
  if (typeof roleName !== 'string') return '';
  return roleName.trim().toLowerCase();
};

export interface PermissionCheckResult {
  /** Check if user has a specific permission (new dot notation) */
  can: (permission: string) => boolean;
  /** Check if user has ANY of the permissions */
  canAny: (permissions: string[]) => boolean;
  /** Check if user has ALL of the permissions */
  canAll: (permissions: string[]) => boolean;
  /** Check if permission is dangerous (requires confirmation) */
  isDangerous: (permission: string) => boolean;
  /** Check if user is super admin (bypasses all checks) */
  isSuperAdmin: boolean;
  /** Check if user is tenant admin (bypasses all checks within tenant) */
  isTenantAdmin: boolean;
  /** Legacy: Check single permission */
  hasPermission: (permission: Permission) => boolean;
  /** Legacy: Check any permission */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Legacy: Check all permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  /** Get all user permissions */
  userPermissions: Permission[];
  /** Loading state */
  loading: boolean;
  
  // Enhanced API
  /** Enhanced user permissions with metadata */
  permissions: UserPermission[];
  /** Permission groups organized by resource */
  groups: PermissionGroup[];
  /** User roles */
  roles: string[];
  /** Is platform user (not tenant-bound) */
  isPlatformUser: boolean;
  /** Error state */
  error: string | null;
  /** Refresh permissions from server */
  refreshPermissions: () => Promise<void>;
  /** Clear permission cache */
  clearCache: () => void;
  /** Get permissions by resource */
  getPermissionsByResource: (resource: string) => UserPermission[];
  /** Get permission name with Arabic translation */
  getPermissionName: (permission: string, arabic?: boolean) => string;
  /** Check resource access */
  checkResourceAccess: (resource: string, action?: string) => boolean;
}

// ============================================================================
// Permission Utilities
// ============================================================================

class PermissionUtils {
  /**
   * Parse permission string into resource and action
   */
  static parsePermission(permission: string): { resource: string; action: string } {
    const [resource, action] = permission.split(':');
    return { resource: resource || '', action: action || '' };
  }
  
  /**
   * Check if user has platform-level access (tenant_id is null)
   */
  static isPlatformUser(user: any): boolean {
    return user && (user.tenant_id === null || user.tenant_id === undefined);
  }
  
  /**
   * Check if user is super admin
   */
  static isSuperAdmin(user: any): boolean {
    return user && user.roles && user.roles.includes('super_admin');
  }
  
  /**
   * Group permissions by resource
   */
  static groupPermissionsByResource(permissions: UserPermission[]): PermissionGroup[] {
    const groups: { [key: string]: UserPermission[] } = {};
    
    permissions.forEach(permission => {
      const { resource } = this.parsePermission(permission.permission_code);
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
    });
    
    return Object.entries(groups).map(([resource, perms]) => ({
      name: resource,
      name_ar: this.getResourceNameArabic(resource),
      permissions: perms,
      description: this.getResourceDescription(resource),
      description_ar: this.getResourceDescriptionArabic(resource),
    }));
  }
  
  /**
   * Get Arabic name for resource
   */
  static getResourceNameArabic(resource: string): string {
    const resourceNames: { [key: string]: string } = {
      companies: 'الشركات',
      users: 'المستخدمون',
      roles: 'الأدوار',
      permissions: 'الصلاحيات',
      shipments: 'الشحنات',
      suppliers: 'الموردون',  
      warehouses: 'المستودعات',
      customers: 'العملاء',
      branches: 'الفروع',
      expenses: 'المصروفات',
      expense_types: 'أنواع المصروفات',
      customs: 'الجمارك',
      reports: 'التقارير',
      audit_logs: 'سجلات المراجعة',
      settings: 'الإعدادات',
      notifications: 'الإشعارات',
      dashboard: 'لوحة التحكم',
    };
    
    return resourceNames[resource] || resource;
  }
  
  /**
   * Get resource description
   */
  static getResourceDescription(resource: string): string {
    const descriptions: { [key: string]: string } = {
      companies: 'Company management and configuration',
      users: 'User accounts and access management',
      roles: 'Role definitions and assignments',
      permissions: 'Permission management and assignments',
      shipments: 'Shipment tracking and management',
      suppliers: 'Supplier information and relationships',
      warehouses: 'Warehouse operations and inventory',
      customers: 'Customer relationship management',
      branches: 'Branch locations and management',
      expenses: 'Expense tracking and management',
      expense_types: 'Expense category management',
      customs: 'Customs documentation and processes',
      reports: 'Business intelligence and reporting',
      audit_logs: 'System audit and compliance logs',
      settings: 'System configuration and preferences',
      notifications: 'Notification management',
      dashboard: 'Dashboard and analytics access',
    };
    
    return descriptions[resource] || `${resource} management`;
  }
  
  /**
   * Get Arabic resource description
   */
  static getResourceDescriptionArabic(resource: string): string {
    const descriptions: { [key: string]: string } = {
      companies: 'إدارة وتكوين الشركات',
      users: 'إدارة حسابات المستخدمين والوصول',
      roles: 'تعريف الأدوار والتعيينات',
      permissions: 'إدارة وتعيين الصلاحيات',
      shipments: 'تتبع وإدارة الشحنات',
      suppliers: 'معلومات وعلاقات الموردين',
      warehouses: 'عمليات المستودعات والمخزون',
      customers: 'إدارة علاقات العملاء',
      branches: 'مواقع وإدارة الفروع',
      expenses: 'تتبع وإدارة المصروفات',
      expense_types: 'إدارة فئات المصروفات',
      customs: 'وثائق وعمليات الجمارك',
      reports: 'ذكاء الأعمال والتقارير',
      audit_logs: 'سجلات مراجعة النظام والامتثال',
      settings: 'تكوين النظام والتفضيلات',
      notifications: 'إدارة الإشعارات',
      dashboard: 'الوصول إلى لوحة التحكم والتحليلات',
    };
    
    return descriptions[resource] || `إدارة ${this.getResourceNameArabic(resource)}`;
  }
}
// ============================================================================
// Enhanced usePermissions Hook
// ============================================================================

export function usePermissions(): PermissionCheckResult {
  const { user, token, loading: isLoading } = useAuth();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [state, setState] = useState<PermissionState>({
    permissions: [],
    groups: [],
    loading: false,
    error: null,
    lastFetched: null,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
  });
  
  // Check if cache is valid
  const isCacheValid = useMemo(() => {
    if (!state.lastFetched) return false;
    return Date.now() - state.lastFetched < state.cacheExpiry;
  }, [state.lastFetched, state.cacheExpiry]);
  
  // Fetch user permissions from backend
  const fetchPermissions = useCallback(async () => {
    if (!user || !token) {
      setState(prev => ({
        ...prev,
        permissions: [],
        groups: [],
        loading: false,
        error: null,
      }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('http://localhost:4000/api/me/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(isRTL ? 'غير مخول للوصول' : 'Unauthorized access');
        }
        throw new Error(isRTL ? 'فشل في تحميل الصلاحيات' : 'Failed to load permissions');
      }
      
      const data = await response.json();
      const permissions: UserPermission[] = data.permissions || [];
      const groups = PermissionUtils.groupPermissionsByResource(permissions);
      
      setState(prev => ({
        ...prev,
        permissions,
        groups,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      }));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [user, token, isRTL]);
  
  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, lastFetched: null }));
    await fetchPermissions();
  }, [fetchPermissions]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    setState(prev => ({ ...prev, lastFetched: null, permissions: [], groups: [] }));
  }, []);

  // Get user's permissions from JWT token (legacy support)
  const getUserPermissions = (): Permission[] => {
    if (!user) return [];
    
    // If user has permissions array in token, use it
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions as Permission[];
    }
    
    // Get permissions from roles
    if (user.roles && Array.isArray(user.roles)) {
      const perms: Permission[] = [];
      user.roles.forEach((role: any) => {
        if (role && Array.isArray(role.permissions)) {
          perms.push(...role.permissions);
        }
      });
      if (perms.length > 0) {
        return [...new Set(perms)] as Permission[];
      }
      
      // Fallback: Super admin has ALL permissions
      const roleNames = user.roles.map((r: any) => 
        typeof r === 'string' ? r : (r?.name ?? r?.role_name ?? r?.role)
      );
      if (roleNames.some((name: string) => SUPER_ADMIN_ROLES.includes(normalizeRoleName(name)))) {
        return ['*:*' as unknown as Permission];
      }
    }
    
    return [];
  };

  const userPermissions = getUserPermissions();
  
  // Get user roles
  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user]);
  
  // Check if user is platform user
  const isPlatformUser = useMemo(() => {
    return PermissionUtils.isPlatformUser(user);
  }, [user]);

  const normalizePermission = useCallback((permission: unknown): string => {
    if (typeof permission !== 'string') return '';
    return permission
      .trim()
      .toLowerCase()
      // Treat dot/colon as equivalent separators
      .replace(/\./g, ':')
      // Treat dash/underscore as equivalent (backend/DB seeds vary)
      .replace(/-/g, '_');
  }, []);

  const normalizedUserPermissions = useMemo(() => {
    const set = new Set<string>();
    for (const p of userPermissions) {
      const n = normalizePermission(p);
      if (n) set.add(n);
    }
    // Also add permissions from enhanced state
    for (const p of state.permissions) {
      const n = normalizePermission(p.permission_code);
      if (n) set.add(n);
    }
    return set;
  }, [userPermissions, normalizePermission, state.permissions]);

  // Check if user is super admin
  // IMPORTANT: Must be a platform user (no tenant_id) to be considered super admin
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    
    // Tenant users are NEVER super admins, even if they have 'admin' role
    const userAny = user as any;
    if (userAny.tenant_id) return false;
    
    // Check by role name (platform users only)
    if (Array.isArray(user.roles)) {
      const hasSuperAdminRole = user.roles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : (role?.name ?? role?.role_name ?? role?.role);
        return SUPER_ADMIN_ROLES.includes(normalizeRoleName(roleName));
      });
      if (hasSuperAdminRole) return true;
    }
    
    // Check by flag (may not exist in all User types)
    if (userAny.is_super_admin || userAny.isSuperAdmin) {
      return true;
    }
    
    // Check for wildcard permission
    if (userPermissions.includes('*:*' as Permission)) {
      return true;
    }
    
    return false;
  }, [user, userPermissions]);

  // Check if user is tenant admin (has full access within their tenant)
  const isTenantAdmin = useMemo(() => {
    if (!user) return false;
    const userAny = user as any;
    
    // Must be a tenant user (has tenant_id)
    if (!userAny.tenant_id) return false;
    
    // Check is_tenant_admin flag
    if (userAny.is_tenant_admin === true) return true;
    
    // Check by role name
    if (Array.isArray(user.roles)) {
      const hasTenantAdminRole = user.roles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : (role?.name ?? role?.role_name ?? role?.role);
        return roleName === 'tenant_admin';
      });
      if (hasTenantAdminRole) return true;
    }
    
    return false;
  }, [user]);

  // Fetch permissions on mount and when user changes.
  // Skip for super/tenant admins — can() always returns true for them,
  // so fetching would only cause the sidebar to flash skeleton for no reason.
  useEffect(() => {
    if (user && token && !isCacheValid && !isTenantAdmin && !isSuperAdmin) {
      fetchPermissions();
    }
  }, [user, token, fetchPermissions, isCacheValid, isTenantAdmin, isSuperAdmin]);

  /**
   * NEW: Check permission using dot notation
   * e.g., 'accounting.journal.post'
   */
  const can = useCallback((permission: string): boolean => {
    // Super admin or tenant admin bypasses all checks
    if (isSuperAdmin) return true;
    if (isTenantAdmin) return true;

    const raw = (permission ?? '').toString().trim();
    if (!raw) return false;

    const rawNorm = normalizePermission(raw);
    if (!rawNorm) return false;
    
    // Check for global wildcard permissions
    if (normalizedUserPermissions.has('*:*') || normalizedUserPermissions.has('*.*')) return true;
    
    // Exact match (with normalization)
    if (normalizedUserPermissions.has(rawNorm)) return true;

    // Check wildcard patterns
    // Normalize to colon-separated parts: resource:subresource:action
    const parts = rawNorm.split(':').filter(Boolean);
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join(':');
      const wildcard = `${prefix}:*`;
      if (normalizedUserPermissions.has(wildcard)) return true;
    }
    
    return false;
  }, [isSuperAdmin, isTenantAdmin, normalizePermission, normalizedUserPermissions]);

  /**
   * NEW: Check if user has ANY of the permissions
   */
  const canAny = useCallback((permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (isTenantAdmin) return true;
    return permissions.some(p => can(p));
  }, [can, isSuperAdmin, isTenantAdmin]);

  /**
   * NEW: Check if user has ALL of the permissions
   */
  const canAll = useCallback((permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (isTenantAdmin) return true;
    return permissions.every(p => can(p));
  }, [can, isSuperAdmin, isTenantAdmin]);

  /**
   * Check if permission involves a dangerous action
   */
  const isDangerous = useCallback((permission: string): boolean => {
    const action = permission.split('.').pop() || permission.split(':').pop() || '';
    return DANGEROUS_ACTIONS.includes(action);
  }, []);

  // Legacy functions (keep for backward compatibility)
  // Memoized so useMenu's useMemo doesn't recompute on every render
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (isSuperAdmin || isTenantAdmin) return true;
    return can(String(permission));
  }, [isSuperAdmin, isTenantAdmin, can]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (isSuperAdmin || isTenantAdmin) return true;
    return permissions.some((p) => can(String(p)));
  }, [isSuperAdmin, isTenantAdmin, can]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    if (isSuperAdmin || isTenantAdmin) return true;
    return permissions.every((p) => can(String(p)));
  }, [isSuperAdmin, isTenantAdmin, can]);
  
  // Enhanced API functions
  
  // Get permissions by resource
  const getPermissionsByResource = useCallback((resource: string): UserPermission[] => {
    return state.permissions.filter(permission => {
      const { resource: permResource } = PermissionUtils.parsePermission(permission.permission_code);
      return permResource === resource;
    });
  }, [state.permissions]);
  
  // Get permission name with translation
  const getPermissionName = useCallback((permission: string, arabic = isRTL): string => {
    const { resource, action } = PermissionUtils.parsePermission(permission);
    
    if (arabic) {
      const resourceName = PermissionUtils.getResourceNameArabic(resource);
      const actionNames: { [key: string]: string } = {
        view: 'عرض',
        create: 'إنشاء',
        edit: 'تعديل',
        delete: 'حذف',
        manage: 'إدارة',
        export: 'تصدير',
        import: 'استيراد',
      };
      const actionName = actionNames[action] || action;
      return `${actionName} ${resourceName}`;
    } else {
      return permission.replace(':', ' ').replace('_', ' ');
    }
  }, [isRTL]);
  
  // Check resource access
  const checkResourceAccess = useCallback((resource: string, action?: string): boolean => {
    if (!user) return false;
    
    // Super admin or tenant admin bypasses all permission checks
    if (isSuperAdmin || isTenantAdmin) return true;
    
    if (action) {
      return can(`${resource}:${action}`);
    }
    
    // Check if user has any permission for this resource
    return state.permissions.some(permission => {
      const { resource: permResource } = PermissionUtils.parsePermission(permission.permission_code);
      return permResource === resource;
    });
  }, [user, isSuperAdmin, isTenantAdmin, can, state.permissions]);

  return {
    // New API (dot notation)
    can,
    canAny,
    canAll,
    isDangerous,
    isSuperAdmin,
    isTenantAdmin,
    // Legacy API (colon notation)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions,
    loading: isLoading || state.loading,
    
    // Enhanced API
    permissions: state.permissions,
    groups: state.groups,
    roles,
    isPlatformUser,
    error: state.error,
    refreshPermissions,
    clearCache,
    getPermissionsByResource,
    getPermissionName,
    checkResourceAccess,
  };
}

// ============================================================================
// Import React components (ensure these are available)
// ============================================================================

import { useRouter } from 'next/router';

// ============================================================================
// Permission Gate Components
// ============================================================================

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  showFallback?: boolean;
  children: React.ReactNode;
}

/**
 * Permission gate component - conditionally renders children based on permissions
 */
export function PermissionGate({
  permission,
  permissions = [],
  mode = 'any',
  fallback = null,
  showFallback = true,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  const hasAccess = useMemo(() => {
    if (permission) {
      return can(permission);
    }

    if (permissions.length === 0) {
      return true; // No permissions required
    }

    return mode === 'any' ? canAny(permissions) : canAll(permissions);
  }, [permission, permissions, mode, can, canAny, canAll]);

  if (hasAccess) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string | string[],
  options: {
    mode?: 'any' | 'all';
    fallback?: React.ComponentType<P>;
    fallbackProps?: Partial<P>;
  } = {}
) {
  const { mode = 'any', fallback: FallbackComponent, fallbackProps } = options;
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate
        permissions={permissions}
        mode={mode}
        fallback={
          FallbackComponent ? <FallbackComponent {...props} {...fallbackProps} /> : null
        }
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook for conditional permission-based effects
 */
export function usePermissionEffect(
  permission: string | string[],
  callback: () => void | (() => void),
  deps: React.DependencyList = []
) {
  const { can, canAny } = usePermissions();

  const hasPermission = useMemo(() => {
    if (typeof permission === 'string') {
      return can(permission);
    }
    return canAny(permission);
  }, [permission, can, canAny]);

  useEffect(() => {
    if (hasPermission) {
      return callback();
    }
  }, [hasPermission, ...deps]);
}

/**
 * Permission-aware router guard hook
 */
export function usePermissionGuard(
  requiredPermission: string | string[],
  redirectTo: string = '/unauthorized'
) {
  const router = useRouter();
  const { can, canAny, loading } = usePermissions();

  const hasPermission = useMemo(() => {
    if (typeof requiredPermission === 'string') {
      return can(requiredPermission);
    }
    return canAny(requiredPermission);
  }, [requiredPermission, can, canAny]);

  useEffect(() => {
    if (!loading && !hasPermission) {
      router.replace(redirectTo);
    }
  }, [loading, hasPermission, router, redirectTo]);

  return { hasPermission, loading };
}

/**
 * Utility function to create permission-based menu items
 */
export function createPermissionMenu(
  items: Array<{
    key: string;
    label: string;
    permission?: string;
    permissions?: string[];
    mode?: 'any' | 'all';
    icon?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    children?: Array<any>;
  }>
): Array<any> {
  const { can, canAny, canAll } = usePermissions();

  return items.filter((item) => {
    if (item.permission) {
      return can(item.permission);
    }

    if (item.permissions && item.permissions.length > 0) {
      const mode = item.mode || 'any';
      return mode === 'any'
        ? canAny(item.permissions)
        : canAll(item.permissions);
    }

    return true; // No permissions required
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: createPermissionMenu(item.children),
      };
    }
    return item;
  });
}