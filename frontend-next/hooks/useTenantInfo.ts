import { useMemo } from 'react';
import { useAuth } from './useAuth';

interface TenantInfo {
  id: number;
  name?: string;
  subscription_plan?: string;
  max_users?: number;
  account_manager?: {
    name: string;
    email: string;
  };
}

interface UseTenantInfoResult {
  /** True when the logged-in user belongs to a tenant (has tenant_id) */
  isTenantUser: boolean;
  /** Basic tenant metadata (null for platform users) */
  tenantInfo: TenantInfo | null;
  /** Whether the tenant can still create new users (under max_users limit) */
  canCreateUser: boolean;
  /** How many more users the tenant can create (null if unlimited / platform) */
  usersRemaining: number | null;
  /** Max users allowed by the tenant's subscription plan (null if unlimited) */
  maxUsers: number | null;
}

/**
 * Hook that exposes tenant-specific info derived from the current user profile.
 * Platform users (super_admin with no tenant_id) get isTenantUser = false
 * and unlimited creation capabilities.
 */
export function useTenantInfo(): UseTenantInfoResult {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !user.tenant_id) {
      return {
        isTenantUser: false,
        tenantInfo: null,
        canCreateUser: true,
        usersRemaining: null,
        maxUsers: null,
      };
    }

    const tenantInfo: TenantInfo = {
      id: user.tenant_id,
      name: (user as any).tenant_name,
      subscription_plan: (user as any).subscription_plan,
      max_users: (user as any).max_users,
      account_manager: (user as any).account_manager,
    };

    const maxUsers = tenantInfo.max_users ?? null;
    // If we don't know the current count or there's no limit, allow creation
    const currentCount = (user as any).tenant_user_count ?? 0;
    const usersRemaining = maxUsers !== null ? Math.max(0, maxUsers - currentCount) : null;
    const canCreateUser = maxUsers === null || usersRemaining === null || usersRemaining > 0;

    return {
      isTenantUser: true,
      tenantInfo,
      canCreateUser,
      usersRemaining,
      maxUsers,
    };
  }, [user]);
}
