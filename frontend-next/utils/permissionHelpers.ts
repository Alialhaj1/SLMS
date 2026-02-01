/**
 * 🔐 Permission Helper Utilities
 * =====================================================
 * Helper functions for permission checks in components
 */

// Super Admin role names
const SUPER_ADMIN_ROLES = [
  'super_admin',
  'Super Admin',
  'Admin',
  'system_admin',
  'System Admin',
];

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(roles?: string[]): boolean {
  if (!roles) return false;
  return roles.some(role => SUPER_ADMIN_ROLES.includes(role));
}

/**
 * Check if user has wildcard permission
 */
export function hasWildcardPermission(permissions?: string[]): boolean {
  if (!permissions) return false;
  return permissions.includes('*:*') || 
         permissions.includes('*.*') ||
         permissions.includes('admin:*') ||
         permissions.includes('system:*');
}

/**
 * Check if user has a specific permission
 * Includes Super Admin bypass and wildcard support
 */
export function hasPermission(
  permission: string, 
  userRoles?: string[], 
  userPermissions?: string[]
): boolean {
  // Super Admin bypasses all checks
  if (isSuperAdmin(userRoles)) return true;
  
  // Wildcard permission grants all access
  if (hasWildcardPermission(userPermissions)) return true;
  
  // Check exact permission
  if (userPermissions?.includes(permission)) return true;
  
  return false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
  permissions: string[],
  userRoles?: string[],
  userPermissions?: string[]
): boolean {
  // Super Admin bypasses all checks
  if (isSuperAdmin(userRoles)) return true;
  
  // Wildcard permission grants all access
  if (hasWildcardPermission(userPermissions)) return true;
  
  // Check if user has any of the permissions
  return permissions.some(permission => userPermissions?.includes(permission));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
  permissions: string[],
  userRoles?: string[],
  userPermissions?: string[]
): boolean {
  // Super Admin bypasses all checks
  if (isSuperAdmin(userRoles)) return true;
  
  // Wildcard permission grants all access
  if (hasWildcardPermission(userPermissions)) return true;
  
  // Check if user has all permissions
  return permissions.every(permission => userPermissions?.includes(permission));
}
