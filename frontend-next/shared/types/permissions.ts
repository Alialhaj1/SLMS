/**
 * 🔐 PERMISSIONS TYPES
 * ====================
 * Single Source of Truth for all permission codes
 * 
 * Usage:
 * - withPermission(Permission.ITEMS_VIEW, Component)
 * - hasPermission(Permission.ITEMS_CREATE)
 * - Menu items filtering
 */

// ═══════════════════════════════════════════════════════════════
// PERMISSION ENUM - Use across all frontend
// ═══════════════════════════════════════════════════════════════

export const Permission = {
  // ── Master Data ─────────────────────────────────────────────
  ITEMS_VIEW: 'items.view',
  ITEMS_CREATE: 'items.create',
  ITEMS_UPDATE: 'items.update',
  ITEMS_DELETE: 'items.delete',

  ITEM_TYPES_VIEW: 'item_types.view',
  ITEM_TYPES_MANAGE: 'item_types.manage',

  ITEM_GROUPS_VIEW: 'item_groups.view',
  ITEM_GROUPS_MANAGE: 'item_groups.manage',

  ITEM_CATEGORIES_VIEW: 'item_categories.view',
  ITEM_CATEGORIES_MANAGE: 'item_categories.manage',

  UNITS_VIEW: 'units.view',
  UNITS_MANAGE: 'units.manage',

  COUNTRIES_VIEW: 'countries.view',
  COUNTRIES_MANAGE: 'countries.manage',

  HARVEST_SCHEDULES_VIEW: 'harvest_schedules.view',
  HARVEST_SCHEDULES_MANAGE: 'harvest_schedules.manage',

  // ── Procurement ─────────────────────────────────────────────
  VENDORS_VIEW: 'vendors.view',
  VENDORS_CREATE: 'vendors.create',
  VENDORS_UPDATE: 'vendors.update',
  VENDORS_DELETE: 'vendors.delete',

  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_APPROVE: 'purchases.approve',
  PURCHASES_DELETE: 'purchases.delete',

  PURCHASE_ORDERS_VIEW: 'purchase_orders.view',
  PURCHASE_ORDERS_CREATE: 'purchase_orders.create',
  PURCHASE_ORDERS_APPROVE: 'purchase_orders.approve',

  PURCHASE_INVOICES_VIEW: 'purchase_invoices.view',
  PURCHASE_INVOICES_CREATE: 'purchase_invoices.create',
  PURCHASE_INVOICES_APPROVE: 'purchase_invoices.approve',

  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_APPROVE: 'payments.approve',

  // ── Inventory ───────────────────────────────────────────────
  STOCK_VIEW: 'stock.view',
  STOCK_ADJUST: 'stock.adjust',
  STOCK_TRANSFER: 'stock.transfer',

  STOCK_MOVEMENTS_VIEW: 'stock_movements.view',
  STOCK_MOVEMENTS_CREATE: 'stock_movements.create',

  WAREHOUSES_VIEW: 'warehouses.view',
  WAREHOUSES_MANAGE: 'warehouses.manage',

  // ── Finance ─────────────────────────────────────────────────
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_MANAGE: 'accounts.manage',

  JOURNALS_VIEW: 'journals.view',
  JOURNALS_CREATE: 'journals.create',
  JOURNALS_APPROVE: 'journals.approve',

  COST_CENTERS_VIEW: 'cost_centers.view',
  COST_CENTERS_MANAGE: 'cost_centers.manage',

  CURRENCIES_VIEW: 'currencies.view',
  CURRENCIES_MANAGE: 'currencies.manage',

  // ── Reports ─────────────────────────────────────────────────
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  PROCUREMENT_REPORTS_VIEW: 'procurement_reports.view',
  INVENTORY_REPORTS_VIEW: 'inventory_reports.view',
  FINANCIAL_REPORTS_VIEW: 'financial_reports.view',

  // ── Administration ──────────────────────────────────────────
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',

  COMPANIES_VIEW: 'companies.view',
  COMPANIES_MANAGE: 'companies.manage',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  AUDIT_LOGS_VIEW: 'audit_logs.view',

} as const;

// Type helper for permission values
export type PermissionCode = typeof Permission[keyof typeof Permission];

// ═══════════════════════════════════════════════════════════════
// ROLE TYPES
// ═══════════════════════════════════════════════════════════════

export type RoleName = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';

export interface Role {
  id: number;
  name: RoleName;
  display_name: string;
  display_name_ar?: string;
  permissions: PermissionCode[];
  is_system?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Check if permission code matches pattern
 * Example: matchesPattern('items.view', 'items.*') => true
 */
export function permissionMatches(permission: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) {
    const resource = pattern.slice(0, -2);
    return permission.startsWith(resource + '.');
  }
  return permission === pattern;
}

/**
 * Group permissions by resource
 * Example: groupByResource(['items.view', 'items.create']) => { items: ['view', 'create'] }
 */
export function groupPermissionsByResource(
  permissions: PermissionCode[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  
  for (const perm of permissions) {
    const [resource, action] = perm.split('.');
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(action);
  }
  
  return grouped;
}
