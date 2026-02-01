/**
 * Permission Vocabulary
 * Centralized permission codes for RBAC (Phase 3)
 * 
 * CTO Requirement: "Permission Vocabulary - ملف واحد يحتوي على: ITEM_EDIT, ITEM_DELETE, ITEM_OVERRIDE_POLICY"
 * 
 * Format: <ENTITY>_<ACTION>
 * 
 * Why this is critical:
 * - Single source of truth for all permissions
 * - Prevents typos (e.g., 'items:edit' vs 'item:edit')
 * - Makes permission changes trackable via git
 * - Enables IDE autocomplete for permission checks
 * - Simplifies testing (mock based on enum, not strings)
 */

/**
 * Permission Actions (verbs)
 */
export enum PermissionAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  OVERRIDE = 'OVERRIDE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PRINT = 'PRINT',
}

/**
 * Permission Entities (resources)
 */
export enum PermissionEntity {
  ITEM = 'ITEM',
  ITEM_GROUP = 'ITEM_GROUP',
  SHIPMENT = 'SHIPMENT',
  EXPENSE = 'EXPENSE',
  WAREHOUSE = 'WAREHOUSE',
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
  USER = 'USER',
  ROLE = 'ROLE',
  COMPANY = 'COMPANY',
  BRANCH = 'BRANCH',
  ACCOUNTING = 'ACCOUNTING',
  AUDIT_LOG = 'AUDIT_LOG',
  SETTINGS = 'SETTINGS',
  REPORT = 'REPORT',
}

/**
 * Complete Permission Vocabulary
 * Format: <ENTITY>_<ACTION>
 */
export enum Permission {
  // Items
  ITEM_VIEW = 'ITEM_VIEW',
  ITEM_CREATE = 'ITEM_CREATE',
  ITEM_EDIT = 'ITEM_EDIT',
  ITEM_DELETE = 'ITEM_DELETE',
  ITEM_OVERRIDE_POLICY = 'ITEM_OVERRIDE_POLICY', // CTO requirement: Override locked fields
  ITEM_EXPORT = 'ITEM_EXPORT',
  ITEM_IMPORT = 'ITEM_IMPORT',

  // Item Groups
  ITEM_GROUP_VIEW = 'ITEM_GROUP_VIEW',
  ITEM_GROUP_CREATE = 'ITEM_GROUP_CREATE',
  ITEM_GROUP_EDIT = 'ITEM_GROUP_EDIT',
  ITEM_GROUP_DELETE = 'ITEM_GROUP_DELETE',

  // Shipments
  SHIPMENT_VIEW = 'SHIPMENT_VIEW',
  SHIPMENT_CREATE = 'SHIPMENT_CREATE',
  SHIPMENT_EDIT = 'SHIPMENT_EDIT',
  SHIPMENT_DELETE = 'SHIPMENT_DELETE',
  SHIPMENT_APPROVE = 'SHIPMENT_APPROVE',
  SHIPMENT_REJECT = 'SHIPMENT_REJECT',

  // Expenses
  EXPENSE_VIEW = 'EXPENSE_VIEW',
  EXPENSE_CREATE = 'EXPENSE_CREATE',
  EXPENSE_EDIT = 'EXPENSE_EDIT',
  EXPENSE_DELETE = 'EXPENSE_DELETE',
  EXPENSE_APPROVE = 'EXPENSE_APPROVE',
  EXPENSE_REJECT = 'EXPENSE_REJECT',

  // Warehouses
  WAREHOUSE_VIEW = 'WAREHOUSE_VIEW',
  WAREHOUSE_CREATE = 'WAREHOUSE_CREATE',
  WAREHOUSE_EDIT = 'WAREHOUSE_EDIT',
  WAREHOUSE_DELETE = 'WAREHOUSE_DELETE',

  // Suppliers
  SUPPLIER_VIEW = 'SUPPLIER_VIEW',
  SUPPLIER_CREATE = 'SUPPLIER_CREATE',
  SUPPLIER_EDIT = 'SUPPLIER_EDIT',
  SUPPLIER_DELETE = 'SUPPLIER_DELETE',

  // Customers
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  CUSTOMER_CREATE = 'CUSTOMER_CREATE',
  CUSTOMER_EDIT = 'CUSTOMER_EDIT',
  CUSTOMER_DELETE = 'CUSTOMER_DELETE',

  // Users & Roles (Admin only)
  USER_VIEW = 'USER_VIEW',
  USER_CREATE = 'USER_CREATE',
  USER_EDIT = 'USER_EDIT',
  USER_DELETE = 'USER_DELETE',
  ROLE_VIEW = 'ROLE_VIEW',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_EDIT = 'ROLE_EDIT',
  ROLE_DELETE = 'ROLE_DELETE',

  // Companies & Branches (Super Admin only)
  COMPANY_VIEW = 'COMPANY_VIEW',
  COMPANY_CREATE = 'COMPANY_CREATE',
  COMPANY_EDIT = 'COMPANY_EDIT',
  COMPANY_DELETE = 'COMPANY_DELETE',
  BRANCH_VIEW = 'BRANCH_VIEW',
  BRANCH_CREATE = 'BRANCH_CREATE',
  BRANCH_EDIT = 'BRANCH_EDIT',
  BRANCH_DELETE = 'BRANCH_DELETE',

  // Accounting (Phase 3)
  ACCOUNTING_VIEW = 'ACCOUNTING_VIEW',
  ACCOUNTING_POST = 'ACCOUNTING_POST',
  ACCOUNTING_CLOSE_PERIOD = 'ACCOUNTING_CLOSE_PERIOD',
  ACCOUNTING_REOPEN_PERIOD = 'ACCOUNTING_REOPEN_PERIOD',

  // Audit Logs (Admin only)
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
  AUDIT_LOG_EXPORT = 'AUDIT_LOG_EXPORT',

  // Settings (Admin only)
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_EDIT = 'SETTINGS_EDIT',

  // Reports
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_EXPORT = 'REPORT_EXPORT',
  REPORT_PRINT = 'REPORT_PRINT',
}

/**
 * Permission Groups (for UI organization)
 */
export const PermissionGroups = {
  MASTER_DATA: [
    Permission.ITEM_VIEW,
    Permission.ITEM_CREATE,
    Permission.ITEM_EDIT,
    Permission.ITEM_DELETE,
    Permission.ITEM_OVERRIDE_POLICY,
    Permission.ITEM_GROUP_VIEW,
    Permission.ITEM_GROUP_CREATE,
    Permission.ITEM_GROUP_EDIT,
    Permission.ITEM_GROUP_DELETE,
    Permission.WAREHOUSE_VIEW,
    Permission.WAREHOUSE_CREATE,
    Permission.WAREHOUSE_EDIT,
    Permission.WAREHOUSE_DELETE,
  ],
  OPERATIONS: [
    Permission.SHIPMENT_VIEW,
    Permission.SHIPMENT_CREATE,
    Permission.SHIPMENT_EDIT,
    Permission.SHIPMENT_DELETE,
    Permission.SHIPMENT_APPROVE,
    Permission.SHIPMENT_REJECT,
    Permission.EXPENSE_VIEW,
    Permission.EXPENSE_CREATE,
    Permission.EXPENSE_EDIT,
    Permission.EXPENSE_DELETE,
    Permission.EXPENSE_APPROVE,
    Permission.EXPENSE_REJECT,
  ],
  PARTNERS: [
    Permission.SUPPLIER_VIEW,
    Permission.SUPPLIER_CREATE,
    Permission.SUPPLIER_EDIT,
    Permission.SUPPLIER_DELETE,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_EDIT,
    Permission.CUSTOMER_DELETE,
  ],
  ADMIN: [
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_EDIT,
    Permission.USER_DELETE,
    Permission.ROLE_VIEW,
    Permission.ROLE_CREATE,
    Permission.ROLE_EDIT,
    Permission.ROLE_DELETE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_EDIT,
    Permission.AUDIT_LOG_VIEW,
    Permission.AUDIT_LOG_EXPORT,
  ],
  SUPER_ADMIN: [
    Permission.COMPANY_VIEW,
    Permission.COMPANY_CREATE,
    Permission.COMPANY_EDIT,
    Permission.COMPANY_DELETE,
    Permission.BRANCH_VIEW,
    Permission.BRANCH_CREATE,
    Permission.BRANCH_EDIT,
    Permission.BRANCH_DELETE,
  ],
};

/**
 * Role Templates (default permissions for common roles)
 */
export const RoleTemplates = {
  SUPER_ADMIN: Object.values(Permission), // All permissions
  ADMIN: [
    ...PermissionGroups.MASTER_DATA,
    ...PermissionGroups.OPERATIONS,
    ...PermissionGroups.PARTNERS,
    ...PermissionGroups.ADMIN,
  ],
  MANAGER: [
    ...PermissionGroups.MASTER_DATA.filter((p) => p !== Permission.ITEM_DELETE),
    ...PermissionGroups.OPERATIONS,
    ...PermissionGroups.PARTNERS,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_PRINT,
  ],
  USER: [
    Permission.ITEM_VIEW,
    Permission.ITEM_GROUP_VIEW,
    Permission.SHIPMENT_VIEW,
    Permission.SHIPMENT_CREATE,
    Permission.EXPENSE_VIEW,
    Permission.EXPENSE_CREATE,
    Permission.WAREHOUSE_VIEW,
    Permission.SUPPLIER_VIEW,
    Permission.CUSTOMER_VIEW,
  ],
};

/**
 * Permission Helpers
 */
export class PermissionHelper {
  /**
   * Check if permission is admin-only
   */
  static isAdminOnly(permission: Permission): boolean {
    return PermissionGroups.ADMIN.includes(permission) || PermissionGroups.SUPER_ADMIN.includes(permission);
  }

  /**
   * Check if permission is destructive (delete, override, close period)
   */
  static isDestructive(permission: Permission): boolean {
    return [
      Permission.ITEM_DELETE,
      Permission.ITEM_OVERRIDE_POLICY,
      Permission.ITEM_GROUP_DELETE,
      Permission.SHIPMENT_DELETE,
      Permission.EXPENSE_DELETE,
      Permission.WAREHOUSE_DELETE,
      Permission.SUPPLIER_DELETE,
      Permission.CUSTOMER_DELETE,
      Permission.USER_DELETE,
      Permission.ROLE_DELETE,
      Permission.COMPANY_DELETE,
      Permission.BRANCH_DELETE,
      Permission.ACCOUNTING_CLOSE_PERIOD,
    ].includes(permission);
  }

  /**
   * Get permission display name (for UI)
   */
  static getDisplayName(permission: Permission): string {
    return permission
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Convert legacy permission format to new format
   * Example: 'items:edit' → Permission.ITEM_EDIT
   */
  static fromLegacyFormat(legacy: string): Permission | null {
    const [entity, action] = legacy.split(':');
    const permissionKey = `${entity.toUpperCase()}_${action.toUpperCase()}`;
    return Permission[permissionKey as keyof typeof Permission] || null;
  }
}

/**
 * Usage Examples:
 * 
 * // Backend middleware
 * import { Permission } from '../types/permissions';
 * 
 * router.put('/items/:id',
 *   authenticate,
 *   requirePermission(Permission.ITEM_EDIT),  // Type-safe!
 *   itemsController.updateItem
 * );
 * 
 * // Frontend permission check
 * import { Permission } from '@/types/permissions';
 * 
 * const { hasPermission } = usePermissions();
 * if (!hasPermission(Permission.ITEM_DELETE)) {
 *   return null; // Hide delete button
 * }
 * 
 * // Decision logging
 * if (!hasPermission(Permission.ITEM_OVERRIDE_POLICY)) {
 *   logDecision(userId, Permission.ITEM_OVERRIDE_POLICY, 'item', itemId, 'Insufficient permissions');
 *   return ErrorResponseBuilder.forbidden(res, { ... });
 * }
 */
