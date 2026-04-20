/**
 * ============================================================================
 * Enhanced Permissions Hook - RBAC Integration
 * ============================================================================
 * Integrates with the SLMS RBAC system for real-time permission checking
 * Replaces the mock permissions with actual JWT-based permission validation
 */

import { useAuth } from '../contexts/AuthContext';
import { 
  hasPermission as checkPermission, 
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  isPlatformUser,
  isPlatformAdmin,
  isSuperAdmin,
  MODULE_PERMISSIONS,
  UserWithPermissions,
  PermissionCheck,
} from '../lib/rbac';

// ============================================================================
// Enhanced usePermissions Hook
// ============================================================================

export function usePermissions(): PermissionCheck {
  const { user } = useAuth();

  // If no user, return all false
  if (!user) {
    return {
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      canAccess: () => false,
      isPlatform: false,
      isAdmin: false,
      isSuperAdmin: false,
    };
  }

  // Get user permissions from JWT or roles
  const userPermissions = user.permissions || [];
  const userRoles = user.roles || [];

  // Super admin bypasses all checks (as per specification)
  const isSuper = isSuperAdmin(user);
  if (isSuper) {
    return {
      hasPermission: () => true,
      hasAnyPermission: () => true,
      hasAllPermissions: () => true,
      canAccess: () => true,
      isPlatform: isPlatformUser(user),
      isAdmin: true,
      isSuperAdmin: true,
    };
  }

  // Normal permission checking
  return {
    hasPermission: (permission: string) => {
      return checkPermission(userPermissions, permission);
    },

    hasAnyPermission: (permissions: string[]) => {
      return checkAnyPermission(userPermissions, permissions);
    },

    hasAllPermissions: (permissions: string[]) => {
      return checkAllPermissions(userPermissions, permissions);
    },

    canAccess: (module: keyof typeof MODULE_PERMISSIONS) => {
      const modulePermissions = MODULE_PERMISSIONS[module];
      return checkAnyPermission(userPermissions, modulePermissions);
    },

    isPlatform: isPlatformUser(user),
    
    isAdmin: isPlatformAdmin(user) || userRoles.includes('tenant_admin'),
    
    isSuperAdmin: isSuper,
  };
}

// ============================================================================
// Permission HOC for Route Protection
// ============================================================================

interface WithPermissionProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ComponentType;
}

export function withPermissions<T extends object>(
  Component: React.ComponentType<T>,
  options: WithPermissionProps
) {
  return function PermissionWrapper(props: T) {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    
    // Check single permission
    if (options.permission && !hasPermission(options.permission)) {
      const Fallback = options.fallback || (() => null);
      return <Fallback />;
    }
    
    // Check multiple permissions
    if (options.permissions) {
      const hasAccess = options.requireAll 
        ? hasAllPermissions(options.permissions)
        : hasAnyPermission(options.permissions);
        
      if (!hasAccess) {
        const Fallback = options.fallback || (() => null);
        return <Fallback />;
      }
    }
    
    return <Component {...props} />;
  };
}

// ============================================================================
// Permission Component for Conditional Rendering
// ============================================================================

interface PermissionProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Permission({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  
  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
      
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
}

// ============================================================================
// Role-based Component
// ============================================================================

interface RoleProps {
  roles: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Role({
  roles,
  requireAll = false,
  fallback = null,
  children,
}: RoleProps) {
  const { user } = useAuth();
  
  if (!user || !user.roles) {
    return <>{fallback}</>;
  }
  
  const hasRole = requireAll
    ? roles.every(role => user.roles!.includes(role))
    : roles.some(role => user.roles!.includes(role));
    
  if (!hasRole) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// ============================================================================
// Platform-only Component
// ============================================================================

interface PlatformOnlyProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PlatformOnly({ fallback = null, children }: PlatformOnlyProps) {
  const { isPlatform } = usePermissions();
  
  if (!isPlatform) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// ============================================================================
// Tenant-only Component  
// ============================================================================

interface TenantOnlyProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function TenantOnly({ fallback = null, children }: TenantOnlyProps) {
  const { isPlatform } = usePermissions();
  
  if (isPlatform) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// ============================================================================
// Permission Utility Hook for Button States
// ============================================================================

export function usePermissionStates() {
  const permissions = usePermissions();
  
  return {
    ...permissions,
    
    // Get button props based on permission
    getButtonProps: (permission: string, disabled: boolean = false) => ({
      disabled: disabled || !permissions.hasPermission(permission),
      'data-permission': permission,
      'data-permission-granted': permissions.hasPermission(permission),
    }),
    
    // Get link props based on permission
    getLinkProps: (permission: string) => ({
      'data-permission': permission,
      'data-permission-granted': permissions.hasPermission(permission),
      style: permissions.hasPermission(permission) ? {} : { display: 'none' },
    }),
  };
}

export default usePermissions;