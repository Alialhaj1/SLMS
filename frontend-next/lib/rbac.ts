/**
 * ============================================================================
 * SLMS RBAC PERMISSION SYSTEM - Arabic Specification
 * ============================================================================
 * Permission format: module:action (e.g., shipments:create)
 * Roles: super_admin, platform_admin, tenant_admin, tenant_manager, tenant_user
 * 
 * As per specification:
 * - tenant_id=null means platform user (super_admin/platform_admin)
 * - All tenant operations require tenant_id in JWT
 * - Permissions are module:action format
 * - Frontend hides unauthorized elements completely (not disabled)
 */

// ============================================================================
// Permission Definitions
// ============================================================================

export const PERMISSIONS = {
  // Shipments Module
  SHIPMENTS_VIEW: 'shipments:view',
  SHIPMENTS_CREATE: 'shipments:create',
  SHIPMENTS_EDIT: 'shipments:edit',
  SHIPMENTS_DELETE: 'shipments:delete',
  SHIPMENTS_APPROVE: 'shipments:approve',
  SHIPMENTS_CANCEL: 'shipments:cancel',

  // Accounting Module
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE: 'accounting:create',
  ACCOUNTING_EDIT: 'accounting:edit',
  ACCOUNTING_DELETE: 'accounting:delete',
  ACCOUNTING_APPROVE: 'accounting:approve',

  // Customs Module
  CUSTOMS_VIEW: 'customs:view',
  CUSTOMS_CREATE: 'customs:create',
  CUSTOMS_EDIT: 'customs:edit',
  CUSTOMS_DELETE: 'customs:delete',
  CUSTOMS_SUBMIT: 'customs:submit',

  // Inventory/Warehouse Module
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_RECEIVE: 'inventory:receive',
  INVENTORY_SHIP: 'inventory:ship',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_COUNT: 'inventory:count',

  // Suppliers Module
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_EDIT: 'suppliers:edit',
  SUPPLIERS_DELETE: 'suppliers:delete',

  // Customers Module
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_EDIT: 'customers:edit',
  CUSTOMERS_DELETE: 'customers:delete',

  // Reports Module
  REPORTS_VIEW: 'reports:view',
  REPORTS_FINANCIAL: 'reports:financial',
  REPORTS_OPERATIONAL: 'reports:operational',
  REPORTS_EXPORT: 'reports:export',

  // Administration Module
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_BACKUP: 'admin:backup',

  // Platform Administration (super_admin only)
  PLATFORM_TENANTS: 'platform:tenants',
  PLATFORM_USERS: 'platform:users',
  PLATFORM_BILLING: 'platform:billing',
  PLATFORM_ANALYTICS: 'platform:analytics',
  PLATFORM_SYSTEM: 'platform:system',
} as const;

// ============================================================================
// Role Definitions
// ============================================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin', 
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  TENANT_USER: 'tenant_user',
  TENANT_CUSTOMS: 'tenant_customs',
  TENANT_WAREHOUSE: 'tenant_warehouse',
  TENANT_ACCOUNTING: 'tenant_accounting',
} as const;

// ============================================================================
// Role-Permission Mappings (as per specification table)
// ============================================================================

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin - All permissions
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  // Platform Admin - Platform operations only
  [ROLES.PLATFORM_ADMIN]: [
    PERMISSIONS.PLATFORM_TENANTS,
    PERMISSIONS.PLATFORM_USERS,
    PERMISSIONS.PLATFORM_BILLING,
    PERMISSIONS.PLATFORM_ANALYTICS,
    PERMISSIONS.PLATFORM_SYSTEM,
    PERMISSIONS.ADMIN_AUDIT,
  ],

  // Tenant Admin - All tenant operations
  [ROLES.TENANT_ADMIN]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.SHIPMENTS_CREATE,
    PERMISSIONS.SHIPMENTS_EDIT, 
    PERMISSIONS.SHIPMENTS_DELETE,
    PERMISSIONS.SHIPMENTS_APPROVE,
    PERMISSIONS.SHIPMENTS_CANCEL,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE,
    PERMISSIONS.ACCOUNTING_EDIT,
    PERMISSIONS.ACCOUNTING_DELETE,
    PERMISSIONS.ACCOUNTING_APPROVE,
    PERMISSIONS.CUSTOMS_VIEW,
    PERMISSIONS.CUSTOMS_CREATE,
    PERMISSIONS.CUSTOMS_EDIT,
    PERMISSIONS.CUSTOMS_DELETE,
    PERMISSIONS.CUSTOMS_SUBMIT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_SHIP,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_COUNT,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_EDIT,
    PERMISSIONS.SUPPLIERS_DELETE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_FINANCIAL,
    PERMISSIONS.REPORTS_OPERATIONAL,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.ADMIN_ROLES,
    PERMISSIONS.ADMIN_SETTINGS,
    PERMISSIONS.ADMIN_AUDIT,
  ],

  // Tenant Manager - Operations management
  [ROLES.TENANT_MANAGER]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.SHIPMENTS_CREATE,
    PERMISSIONS.SHIPMENTS_EDIT,
    PERMISSIONS.SHIPMENTS_APPROVE,
    PERMISSIONS.CUSTOMS_VIEW,
    PERMISSIONS.CUSTOMS_CREATE,
    PERMISSIONS.CUSTOMS_EDIT,
    PERMISSIONS.CUSTOMS_SUBMIT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_SHIP,
    PERMISSIONS.INVENTORY_COUNT,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_EDIT,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_OPERATIONAL,
  ],

  // Tenant User - Basic operations
  [ROLES.TENANT_USER]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],

  // Tenant Customs Officer
  [ROLES.TENANT_CUSTOMS]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.CUSTOMS_VIEW,
    PERMISSIONS.CUSTOMS_CREATE,
    PERMISSIONS.CUSTOMS_EDIT,
    PERMISSIONS.CUSTOMS_SUBMIT,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],

  // Tenant Warehouse Staff
  [ROLES.TENANT_WAREHOUSE]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_SHIP,
    PERMISSIONS.INVENTORY_COUNT,
    PERMISSIONS.SUPPLIERS_VIEW,
  ],

  // Tenant Accounting
  [ROLES.TENANT_ACCOUNTING]: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE,
    PERMISSIONS.ACCOUNTING_EDIT,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_FINANCIAL,
  ],
};

// ============================================================================
// Permission Checking Utilities
// ============================================================================

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userPermissions: string[], 
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get all permissions for multiple roles
 */
export function getMultiRolePermissions(roles: string[]): string[] {
  const allPermissions = new Set<string>();
  
  roles.forEach(role => {
    const rolePerms = getRolePermissions(role);
    rolePerms.forEach(perm => allPermissions.add(perm));
  });
  
  return Array.from(allPermissions);
}

/**
 * Check if user is platform user (no tenant_id)
 */
export function isPlatformUser(user: { tenant_id?: number | null }): boolean {
  return !user.tenant_id;
}

/**
 * Check if user has platform admin privileges
 */
export function isPlatformAdmin(user: { roles?: string[], tenant_id?: number | null }): boolean {
  if (!isPlatformUser(user)) return false;
  
  return user.roles?.some(role => 
    role === ROLES.SUPER_ADMIN || role === ROLES.PLATFORM_ADMIN
  ) || false;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: { roles?: string[] }): boolean {
  return user.roles?.includes(ROLES.SUPER_ADMIN) || false;
}

// ============================================================================
// Module Permission Groups
// ============================================================================

export const MODULE_PERMISSIONS = {
  SHIPMENTS: [
    PERMISSIONS.SHIPMENTS_VIEW,
    PERMISSIONS.SHIPMENTS_CREATE,
    PERMISSIONS.SHIPMENTS_EDIT,
    PERMISSIONS.SHIPMENTS_DELETE,
    PERMISSIONS.SHIPMENTS_APPROVE,
    PERMISSIONS.SHIPMENTS_CANCEL,
  ],
  
  ACCOUNTING: [
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE,
    PERMISSIONS.ACCOUNTING_EDIT,
    PERMISSIONS.ACCOUNTING_DELETE,
    PERMISSIONS.ACCOUNTING_APPROVE,
  ],
  
  CUSTOMS: [
    PERMISSIONS.CUSTOMS_VIEW,
    PERMISSIONS.CUSTOMS_CREATE,
    PERMISSIONS.CUSTOMS_EDIT,
    PERMISSIONS.CUSTOMS_DELETE,
    PERMISSIONS.CUSTOMS_SUBMIT,
  ],
  
  INVENTORY: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_SHIP,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_COUNT,
  ],
  
  ADMIN: [
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.ADMIN_ROLES,
    PERMISSIONS.ADMIN_SETTINGS,
    PERMISSIONS.ADMIN_AUDIT,
    PERMISSIONS.ADMIN_BACKUP,
  ],
  
  PLATFORM: [
    PERMISSIONS.PLATFORM_TENANTS,
    PERMISSIONS.PLATFORM_USERS,
    PERMISSIONS.PLATFORM_BILLING,
    PERMISSIONS.PLATFORM_ANALYTICS,
    PERMISSIONS.PLATFORM_SYSTEM,
  ],
} as const;

// ============================================================================
// Types
// ============================================================================

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = typeof ROLES[keyof typeof ROLES];

export interface UserWithPermissions {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  tenant_id?: number | null;
  login_context?: 'platform' | 'tenant';
}

export interface PermissionCheck {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccess: (module: keyof typeof MODULE_PERMISSIONS) => boolean;
  isPlatform: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// ============================================================================
// Export Types & Constants
// ============================================================================

export default {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  MODULE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  getMultiRolePermissions,
  isPlatformUser,
  isPlatformAdmin,
  isSuperAdmin,
};