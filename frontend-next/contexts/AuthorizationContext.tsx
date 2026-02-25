/**
 * Authorization Context - Multi-tenant authorization state
 * Derives RBAC flags and permission helpers from the authenticated user profile.
 * Wraps AuthProvider and must be nested inside it in _app.tsx.
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// Super admin role names (lowercase, platform-only)
const SUPER_ADMIN_ROLES = ['super_admin', 'super admin', 'system_admin', 'system admin'];

// ===========================
// Types
// ===========================

export interface UserContext {
  company_name?: string | null;
  branch_name?: string | null;
  tenant_id?: number | null;
  company_id?: number | null;
  login_context?: 'platform' | 'tenant';
}

export interface AuthorizationContextType {
  userContext: UserContext | null;
  isPlatformUser: boolean;
  isTenantUser: boolean;
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasModule: (module: string) => boolean;
  hasFeature: (feature: string) => boolean;
  isPlatformAdmin: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
}

// ===========================
// Context
// ===========================

const AuthorizationContext = createContext<AuthorizationContextType | undefined>(undefined);

// ===========================
// Provider
// ===========================

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // Re-evaluate on auth:login events (same-tab; StorageEvent only fires cross-tab)
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('auth:login', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('auth:login', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  // Normalise role value to lowercase string
  const normalizeRole = (role: unknown): string => {
    if (typeof role === 'string') return role.trim().toLowerCase();
    if (role && typeof role === 'object') {
      const r = role as any;
      return String(r.name ?? r.role_name ?? r.role ?? '').trim().toLowerCase();
    }
    return '';
  };

  const roles = useMemo(() => {
    if (!user?.roles) return [] as string[];
    return (user.roles as unknown[]).map(normalizeRole).filter(Boolean);
  }, [user]);

  // --- Derived booleans ---

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    if (user.tenant_id) return false; // tenant users are never super admin
    if (roles.some((r) => SUPER_ADMIN_ROLES.includes(r))) return true;
    if ((user as any).is_super_admin) return true;
    return false;
  }, [user, roles]);

  const isPlatformAdmin = useMemo(() => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.is_platform_admin) return true;
    return false;
  }, [user, isSuperAdmin]);

  const isPlatformUser = useMemo(() => {
    if (!user) return false;
    if (isPlatformAdmin) return true;
    if (user.is_platform_user) return true;
    if (!user.tenant_id && user.login_context === 'platform') return true;
    return false;
  }, [user, isPlatformAdmin]);

  const isTenantUser = useMemo(() => {
    if (!user) return false;
    if (isPlatformUser) return false; // platform users are not tenant users
    if (user.tenant_id) return true;
    if (user.login_context === 'tenant') return true;
    return false;
  }, [user, isPlatformUser]);

  const isTenantAdmin = useMemo(() => {
    if (!user) return false;
    if (user.is_tenant_admin) return true;
    if (user.tenant_id && roles.includes('admin')) return true;
    return false;
  }, [user, roles]);

  // --- Permission helpers ---

  const normalizedPerms = useMemo(() => {
    if (!user?.permissions) return new Set<string>();
    return new Set(
      (user.permissions as string[]).map((p) => p.toLowerCase().replace(/\./g, ':').replace(/-/g, '_'))
    );
  }, [user]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin) return true;
      if (!permission) return false;
      const norm = permission.toLowerCase().replace(/\./g, ':').replace(/-/g, '_');
      if (normalizedPerms.has('*:*') || normalizedPerms.has('*.*')) return true;
      if (normalizedPerms.has(norm)) return true;
      const parts = norm.split(':');
      for (let i = parts.length - 1; i >= 1; i--) {
        if (normalizedPerms.has(parts.slice(0, i).join(':') + ':*')) return true;
      }
      return false;
    },
    [isSuperAdmin, normalizedPerms],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.every((p) => hasPermission(p));
    },
    [isSuperAdmin, hasPermission],
  );

  const hasModule = useCallback(
    (module: string): boolean => {
      if (isSuperAdmin || isPlatformAdmin) return true;
      if (!user?.enabled_modules) return true; // no restriction = all modules
      return user.enabled_modules.includes(module);
    },
    [user, isSuperAdmin, isPlatformAdmin],
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (isSuperAdmin) return true;
      return hasPermission(feature) || hasModule(feature);
    },
    [isSuperAdmin, hasPermission, hasModule],
  );

  // --- User context (lightweight object consumed by UI) ---

  const userContext = useMemo<UserContext | null>(() => {
    if (!user) return null;
    return {
      company_name: user.company_name ?? null,
      branch_name: (user as any).branch_name ?? null,
      tenant_id: user.tenant_id ?? null,
      company_id: user.company_id ?? null,
      login_context: user.login_context,
    };
  }, [user]);

  // --- Memoised value ---

  const value = useMemo<AuthorizationContextType>(
    () => ({
      userContext,
      isPlatformUser,
      isTenantUser,
      hasPermission,
      hasAllPermissions,
      hasModule,
      hasFeature,
      isPlatformAdmin,
      isSuperAdmin,
      isTenantAdmin,
    }),
    [userContext, isPlatformUser, isTenantUser, hasPermission, hasAllPermissions, hasModule, hasFeature, isPlatformAdmin, isSuperAdmin, isTenantAdmin],
  );

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

// ===========================
// Hook
// ===========================

export function useAuthorization(): AuthorizationContextType {
  const context = useContext(AuthorizationContext);
  if (context === undefined) {
    throw new Error('useAuthorization must be used within an AuthorizationProvider');
  }
  return context;
}
