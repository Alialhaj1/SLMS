/**
 * Role Helper Functions
 * Provides case-insensitive role checking utilities
 */

/**
 * Check if user has a specific role (case-insensitive)
 * @param roles Array of role names from JWT
 * @param targetRole Role to check for (e.g., 'admin', 'manager', 'super_admin')
 */
export function hasRole(roles: string[] | undefined, targetRole: string): boolean {
  if (!roles || roles.length === 0) return false;
  const target = targetRole.toLowerCase();
  return roles.some(role => role.toLowerCase() === target);
}

/**
 * Check if user has any of the specified roles (case-insensitive)
 * @param roles Array of role names from JWT
 * @param targetRoles Array of roles to check for
 */
export function hasAnyRole(roles: string[] | undefined, targetRoles: string[]): boolean {
  if (!roles || roles.length === 0) return false;
  const targets = targetRoles.map(r => r.toLowerCase());
  return roles.some(role => targets.includes(role.toLowerCase()));
}

/**
 * Check if user is a super admin (case-insensitive)
 * Handles various naming: 'super_admin', 'SuperAdmin', 'SUPER_ADMIN', etc.
 */
export function isSuperAdmin(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(role => {
    const lower = role.toLowerCase().replace(/[^a-z]/g, '');
    return lower === 'superadmin';
  });
}

/**
 * Check if user is a manager or admin (case-insensitive)
 * Returns true for: admin, Admin, ADMIN, manager, Manager, etc.
 */
export function isManagerOrAdmin(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(role => {
    const lower = role.toLowerCase();
    return lower === 'admin' || lower === 'manager';
  });
}
