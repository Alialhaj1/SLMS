import { useMemo } from 'react';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import type { UserProfile } from '../lib/authService';

// Super Admin role names - 'Admin' excluded because it's used for tenant admins
const SUPER_ADMIN_ROLES = [
  'super_admin',
  'Super Admin',
  'system_admin',
  'System Admin',
];

type LegacyUseAuthResult = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  /** True once fresh profile from API has been loaded (not just cached) */
  profileReady: boolean;
  logout: () => void;
  isAuthenticated: boolean;
};

/**
 * Legacy-compatible `useAuth` hook.
 *
 * IMPORTANT: This hook intentionally delegates to `AuthContext` to avoid
 * duplicated `/api/me` calls and keep RBAC state consistent across the app.
 */
export function useAuth(): LegacyUseAuthResult {
  const { user, token, loading, logout, isAuthenticated, profileReady } = useAuthContext();

  const normalizedUser = useMemo(() => {
    if (!user) return null;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    // Super admin check: must have super_admin role AND be a platform user (no tenant_id)
    const isSuperAdmin = !user.tenant_id && roles.some((role) => SUPER_ADMIN_ROLES.includes(role));

    // Tenant admin check: has tenant_id AND is_tenant_admin flag
    const userAny = user as any;
    const isTenantAdmin = !!userAny.tenant_id && (
      userAny.is_tenant_admin === true ||
      roles.includes('tenant_admin')
    );

    if (!isSuperAdmin && !isTenantAdmin) {
      return {
        ...user,
        roles,
        permissions,
      };
    }

    // Super admin or tenant admin: ensure wildcard permissions exist for permission checks.
    const expanded = new Set<string>(permissions);
    expanded.add('*:*');
    expanded.add('*.*');
    if (isSuperAdmin) {
      expanded.add('admin:*');
      expanded.add('system:*');
    }

    return {
      ...user,
      roles,
      permissions: Array.from(expanded),
    };
  }, [user]);

  return {
    user: normalizedUser,
    token,
    loading,
    profileReady,
    isAuthenticated,
    logout: () => {
      void logout();
    },
  };
}
