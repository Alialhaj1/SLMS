import { useMemo } from 'react';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import type { UserProfile } from '../lib/authService';

// Super Admin role names
const SUPER_ADMIN_ROLES = [
  'super_admin',
  'Super Admin',
  'Admin',
  'system_admin',
  'System Admin',
];

type LegacyUseAuthResult = {
  user: UserProfile | null;
  loading: boolean;
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
  const { user, loading, logout, isAuthenticated } = useAuthContext();

  const normalizedUser = useMemo(() => {
    if (!user) return null;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    const isSuperAdmin = roles.some((role) => SUPER_ADMIN_ROLES.includes(role));

    if (!isSuperAdmin) {
      return {
        ...user,
        roles,
        permissions,
      };
    }

    // Super admin: ensure wildcard permissions exist for any legacy checks.
    const expanded = new Set<string>(permissions);
    expanded.add('*:*');
    expanded.add('*.*');
    expanded.add('admin:*');
    expanded.add('system:*');

    return {
      ...user,
      roles,
      permissions: Array.from(expanded),
    };
  }, [user]);

  return {
    user: normalizedUser,
    loading,
    isAuthenticated,
    logout: () => {
      void logout();
    },
  };
}
