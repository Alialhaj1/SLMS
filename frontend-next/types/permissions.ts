// Enterprise Permission System
// Granular RBAC with 12+ actions per resource

export type PermissionAction = 
  | 'create'
  | 'view'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'print'
  | 'download'
  | 'pdf'
  | 'lock'
  | 'freeze'
  | 'approve'
  | 'reject'
  | 'post'
  | 'reverse'
  | 'reconcile'
  | 'close'
  | 'reopen'
  | 'manage_status'
  | 'assign_roles'
  | 'view_activity'
  | 'assign_permissions'
  | 'clone'
  | 'view_templates'
  | 'restore'
  | 'permanent_delete'
  | 'view_deleted'
  | 'manage'
  | 'view_all';

export type PermissionResource =
  // System Administration
  | 'companies'
  | 'branches'
  | 'users'
  | 'roles'
  | 'system_setup'
  | 'numbering_series'
  | 'audit_logs'
  | 'system_settings'
  | 'notifications'
  | 'password_requests'
  | 'dashboard'
  
  // Accounting
  | 'accounting'
  | 'master'
  | 'reports'
  
  // Master Data
  | 'countries'
  | 'cities'
  | 'ports'
  | 'currencies'
  | 'exchange_rates'
  
  // Inventory
  | 'items'
  | 'item_groups'
  | 'warehouses'
  | 'stock_adjustments'
  
  // CRM
  | 'customers'
  | 'suppliers'
  | 'payment_terms'
  
  // Operations
  | 'shipments'
  | 'expenses'
  | 'credit_limits'
  
  // Finance
  | 'chart_of_accounts'
  | 'cost_centers'
  | 'fiscal_periods'
  | 'vouchers'
  | 'journal_entries'
  
  // Logistics
  | 'shipments'
  | 'shipping_lines'
  | 'containers'
  | 'customs_clearance'
  
  // Tax & Zakat
  | 'tax_codes'
  | 'tax_rates'
  | 'zakat_codes'
  
  // HR
  | 'employees'
  | 'departments'
  | 'contracts'
  | 'payroll'
  
  // Documents
  | 'documents'
  | 'workflows'
  | 'approvals'
  | 'certificates'
  
  // Reports
  | 'financial_reports'
  | 'inventory_reports'
  | 'sales_reports'
  | 'analytics';

// Flexible permission type - allows both strict types and custom strings
export type Permission = `${PermissionResource}:${PermissionAction}` | string;

export interface RolePermissions {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Permission matrix helper
export const createPermission = (resource: PermissionResource, action: PermissionAction): Permission => {
  return `${resource}:${action}`;
};

// Check if user has permission
export const hasPermission = (userPermissions: Permission[], required: Permission): boolean => {
  return userPermissions.includes(required);
};

// Check if user has any of the permissions
export const hasAnyPermission = (userPermissions: Permission[], required: Permission[]): boolean => {
  return required.some(perm => userPermissions.includes(perm));
};

// Check if user has all permissions
export const hasAllPermissions = (userPermissions: Permission[], required: Permission[]): boolean => {
  return required.every(perm => userPermissions.includes(perm));
};

// Get all actions for a resource
export const getResourceActions = (resource: PermissionResource): PermissionAction[] => {
  return [
    'create',
    'view',
    'edit',
    'delete',
    'export',
    'import',
    'print',
    'download',
    'pdf',
    'lock',
    'freeze',
    'approve',
  ];
};

// Predefined role templates
export const ROLE_TEMPLATES = {
  super_admin: {
    name: 'Super Administrator',
    description: 'Full system access',
    allPermissions: true,
  },
  system_admin: {
    name: 'System Administrator',
    description: 'System configuration and user management',
    resources: ['users', 'roles', 'system_setup', 'audit_logs', 'branches', 'companies'],
  },
  finance_manager: {
    name: 'Finance Manager',
    description: 'Financial operations and reporting',
    resources: ['chart_of_accounts', 'cost_centers', 'vouchers', 'journal_entries', 'financial_reports'],
  },
  inventory_manager: {
    name: 'Inventory Manager',
    description: 'Inventory and warehouse management',
    resources: ['items', 'warehouses', 'stock_adjustments', 'inventory_reports'],
  },
  logistics_manager: {
    name: 'Logistics Manager',
    description: 'Shipment and logistics operations',
    resources: ['shipments', 'shipping_lines', 'containers', 'customs_clearance'],
  },
  sales_manager: {
    name: 'Sales Manager',
    description: 'Customer and sales operations',
    resources: ['customers', 'payment_terms', 'sales_reports'],
  },
  accountant: {
    name: 'Accountant',
    description: 'Accounting entries and reports',
    resources: ['vouchers', 'journal_entries', 'financial_reports'],
    actions: ['view', 'create', 'edit', 'print', 'pdf'],
  },
  warehouse_staff: {
    name: 'Warehouse Staff',
    description: 'Warehouse operations',
    resources: ['items', 'warehouses', 'stock_adjustments'],
    actions: ['view', 'create', 'edit'],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    allResources: true,
    actions: ['view'],
  },
};
