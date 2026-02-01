import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { Permission } from '../../types/permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate Component
 * Controls rendering based on user permissions
 * 
 * Usage:
 * - Single permission: <PermissionGate permission="users:create">...</PermissionGate>
 * - Multiple (any): <PermissionGate permission={["users:create", "users:edit"]}>...</PermissionGate>
 * - Multiple (all): <PermissionGate permission={["users:create", "users:edit"]} requireAll>...</PermissionGate>
 * - With fallback: <PermissionGate permission="users:view" fallback={<div>Access Denied</div>}>...</PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  requireAll = false,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  if (!permission) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (Array.isArray(permission)) {
    hasAccess = requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  } else {
    hasAccess = hasPermission(permission);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
