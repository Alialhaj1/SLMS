/**
 * 🔐 usePermissions Hook
 * =====================================================
 * Provides permission checking for React components
 * 
 * Usage:
 *   const { can, canAny, canAll, isSuperAdmin } = usePermissions();
 *   
 *   if (can('accounting.journal.post')) { ... }
 *   if (canAny(['sales.invoice.create', 'sales.order.create'])) { ... }
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Permission } from '../types/permissions';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
} from '../types/permissions';

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
const SUPER_ADMIN_ROLES = [
  'super_admin',
  'super admin',
  'admin',
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
}

export function usePermissions(): PermissionCheckResult {
  const { user, loading: isLoading } = useAuth();

  // Get user's permissions from JWT token
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
    return set;
  }, [userPermissions, normalizePermission]);

  // Check if user is super admin
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    
    // Check by role name
    if (Array.isArray(user.roles)) {
      return user.roles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : (role?.name ?? role?.role_name ?? role?.role);
        return SUPER_ADMIN_ROLES.includes(normalizeRoleName(roleName));
      });
    }
    
    // Check by flag (may not exist in all User types)
    const userAny = user as any;
    if (userAny.is_super_admin || userAny.isSuperAdmin) {
      return true;
    }
    
    // Check for wildcard permission
    if (userPermissions.includes('*:*' as Permission)) {
      return true;
    }
    
    return false;
  }, [user, userPermissions]);

  /**
   * NEW: Check permission using dot notation
   * e.g., 'accounting.journal.post'
   */
  const can = useCallback((permission: string): boolean => {
    // Super admin bypasses all checks
    if (isSuperAdmin) return true;

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
  }, [isSuperAdmin, normalizePermission, normalizedUserPermissions]);

  /**
   * NEW: Check if user has ANY of the permissions
   */
  const canAny = useCallback((permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some(p => can(p));
  }, [can, isSuperAdmin]);

  /**
   * NEW: Check if user has ALL of the permissions
   */
  const canAll = useCallback((permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.every(p => can(p));
  }, [can, isSuperAdmin]);

  /**
   * Check if permission involves a dangerous action
   */
  const isDangerous = useCallback((permission: string): boolean => {
    const action = permission.split('.').pop() || permission.split(':').pop() || '';
    return DANGEROUS_ACTIONS.includes(action);
  }, []);

  // Legacy functions (keep for backward compatibility)
  const hasPermission = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    // Use the same logic as `can` so menu/sidebar and route guards behave consistently
    return can(String(permission));
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some((p) => can(String(p)));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.every((p) => can(String(p)));
  };

  return {
    // New API (dot notation)
    can,
    canAny,
    canAll,
    isDangerous,
    isSuperAdmin,
    // Legacy API (colon notation)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions,
    loading: isLoading || false,
  };
}
