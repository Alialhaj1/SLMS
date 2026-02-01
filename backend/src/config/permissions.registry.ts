/**
 * 🔐 PERMISSIONS REGISTRY
 * =====================================================
 * Single Source of Truth for ALL permissions in the system
 * 
 * Structure: [module].[screen].[section].[element].[action]
 * 
 * Rules:
 * 1. Every UI element MUST reference a permission from here
 * 2. This file generates granular_permissions table
 * 3. Super Admin bypasses all checks (handled in middleware)
 * 4. Keys are also used for translations (i18n.registry.ts)
 */

export interface PermissionNode {
  // Actions
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
  import?: boolean;
  print?: boolean;
  approve?: boolean;
  reject?: boolean;
  post?: boolean;
  reverse?: boolean;
  cancel?: boolean;
  restore?: boolean;
  
  // Nested nodes (screens, sections, fields)
  [key: string]: boolean | PermissionNode | undefined;
}

export interface PermissionDefinition {
  code: string;
  module: string;
  category: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  isDangerous?: boolean;
  requiresApproval?: boolean;
}

/**
 * 📋 PERMISSION TREE
 * Each leaf node generates a permission
 */
export const PERMISSIONS_TREE: Record<string, PermissionNode> = {
  // =====================================================
  // 📊 DASHBOARD MODULE
  // =====================================================
  dashboard: {
    view: true,
    
    cards: {
      revenue: { view: true },
      expenses: { view: true },
      profit: { view: true },
      cash: { view: true },
      receivables: { view: true },
      payables: { view: true },
      inventory: { view: true },
      orders: { view: true },
    },
    
    charts: {
      salesTrend: { view: true },
      expenseBreakdown: { view: true },
      cashFlow: { view: true },
    },
    
    widgets: {
      recentTransactions: { view: true },
      pendingApprovals: { view: true },
      alerts: { view: true },
    },
  },

  // =====================================================
  // 📚 MASTER DATA MODULE
  // =====================================================
  master: {
    // Chart of Accounts
    accounts: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
      import: true,
      
      tree: { view: true },
      ledger: { view: true },
      
      fields: {
        code: { view: true, edit: true },
        name: { view: true, edit: true },
        nameAr: { view: true, edit: true },
        balance: { view: true },
        type: { view: true, edit: true },
      },
    },

    // Customers
    customers: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
      import: true,
      
      balance: { view: true, adjust: true },
      creditLimit: { view: true, edit: true },
      statement: { view: true, print: true },
      
      fields: {
        code: { view: true, edit: true },
        name: { view: true, edit: true },
        phone: { view: true, edit: true },
        email: { view: true, edit: true },
        address: { view: true, edit: true },
        taxNumber: { view: true, edit: true },
      },
    },

    // Vendors
    vendors: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
      import: true,
      
      balance: { view: true, adjust: true },
      statement: { view: true, print: true },
      
      fields: {
        code: { view: true, edit: true },
        name: { view: true, edit: true },
        phone: { view: true, edit: true },
        taxNumber: { view: true, edit: true },
      },
    },

    // Items / Products
    items: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
      import: true,
      
      pricing: { view: true, edit: true },
      cost: { view: true, edit: true },
      stock: { view: true },
      
      fields: {
        code: { view: true, edit: true },
        name: { view: true, edit: true },
        barcode: { view: true, edit: true },
        price: { view: true, edit: true },
        cost: { view: true, edit: true },
        quantity: { view: true },
      },
    },

    // Warehouses
    warehouses: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      
      stock: { view: true },
      transfer: { create: true, approve: true },
    },

    // Cost Centers
    costCenters: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },

    // Currencies
    currencies: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      
      rates: { view: true, edit: true },
    },

    // Payment Terms
    paymentTerms: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
  },

  // =====================================================
  // 📒 ACCOUNTING MODULE
  // =====================================================
  accounting: {
    // Journal Entries
    journal: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
      print: true,
      
      post: true,
      reverse: true,
      approve: true,
      reject: true,
      
      lines: {
        view: true,
        add: true,
        edit: true,
        delete: true,
        
        amount: { view: true, edit: true },
        account: { view: true, edit: true },
        costCenter: { view: true, edit: true },
      },
    },

    // Fiscal Years
    fiscalYears: {
      view: true,
      create: true,
      edit: true,
      close: true,
      reopen: true,
    },

    // Accounting Periods
    periods: {
      view: true,
      create: true,
      edit: true,
      close: true,
      reopen: true,
    },

    // Bank Accounts
    bank: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      
      reconcile: true,
      statement: { view: true, import: true },
    },
  },

  // =====================================================
  // 💰 SALES MODULE
  // =====================================================
  sales: {
    // Quotations
    quotation: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      print: true,
      
      approve: true,
      reject: true,
      convertToOrder: true,
    },

    // Sales Orders
    order: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      print: true,
      
      approve: true,
      cancel: true,
      convertToInvoice: true,
    },

    // Sales Invoices
    invoice: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      print: true,
      export: true,
      
      post: true,
      cancel: true,
      
      discount: { apply: true, override: true },
      
      lines: {
        price: { view: true, edit: true },
        quantity: { view: true, edit: true },
        discount: { view: true, edit: true },
      },
    },

    // Sales Returns
    return: {
      view: true,
      create: true,
      approve: true,
    },

    // Receipt Vouchers
    receipt: {
      view: true,
      create: true,
      print: true,
      approve: true,
    },
  },

  // =====================================================
  // 🛒 PURCHASES MODULE
  // =====================================================
  purchases: {
    // Purchase Requests
    request: {
      view: true,
      create: true,
      edit: true,
      approve: true,
      reject: true,
    },

    // Purchase Orders
    order: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      print: true,
      
      approve: true,
      cancel: true,
    },

    // Purchase Invoices
    invoice: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      print: true,
      
      post: true,
      approve: true,
    },

    // Purchase Returns
    return: {
      view: true,
      create: true,
      approve: true,
    },

    // Payment Vouchers
    payment: {
      view: true,
      create: true,
      print: true,
      approve: true,
    },
  },

  // =====================================================
  // 📦 INVENTORY MODULE
  // =====================================================
  inventory: {
    // Stock View
    stock: {
      view: true,
      export: true,
    },

    // Stock Transfer
    transfer: {
      view: true,
      create: true,
      approve: true,
    },

    // Stock Adjustment
    adjustment: {
      view: true,
      create: true,
      approve: true,
    },

    // Stock Count
    count: {
      view: true,
      create: true,
      approve: true,
    },
  },

  // =====================================================
  // 📊 REPORTS MODULE
  // =====================================================
  reports: {
    // Financial Reports
    financial: {
      view: true,
      export: true,
      print: true,
      
      trialBalance: { view: true },
      balanceSheet: { view: true },
      incomeStatement: { view: true },
      cashFlow: { view: true },
    },

    // Sales Reports
    sales: {
      view: true,
      export: true,
      
      bySalesman: { view: true },
      byCustomer: { view: true },
      byItem: { view: true },
    },

    // Purchase Reports
    purchases: {
      view: true,
      export: true,
    },

    // Inventory Reports
    inventory: {
      view: true,
      export: true,
      
      stockLevel: { view: true },
      movement: { view: true },
      valuation: { view: true },
    },

    // Aging Reports
    aging: {
      view: true,
      export: true,
      
      receivables: { view: true },
      payables: { view: true },
    },
  },

  // =====================================================
  // 👥 USERS & ACCESS MODULE
  // =====================================================
  users: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    
    activate: true,
    deactivate: true,
    unlock: true,
    resetPassword: true,
    
    assignRoles: true,
    assignCompanies: true,
    
    loginHistory: { view: true },
    activity: { view: true },
  },

  roles: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    
    assignPermissions: true,
    clone: true,
  },

  // =====================================================
  // ⚙️ SYSTEM ADMINISTRATION
  // =====================================================
  system: {
    companies: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },

    branches: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },

    settings: {
      view: true,
      edit: true,
    },

    auditLogs: {
      view: true,
      export: true,
    },

    backup: {
      create: true,
      restore: true,
    },

    numberSeries: {
      view: true,
      create: true,
      edit: true,
    },
  },

  // =====================================================
  // 🔔 NOTIFICATIONS
  // =====================================================
  notifications: {
    view: true,
    viewAll: true,
    create: true,
    delete: true,
    manage: true,
  },

  // =====================================================
  // 🔄 LEGACY COMPATIBILITY (match existing backend usage)
  // These aliases ensure existing API routes work
  // TODO: Migrate to new format (system.auditLogs.view)
  // =====================================================
  
  // Audit Logs (legacy: audit_logs.view)
  audit_logs: {
    view: true,
    export: true,
  },

  // Branches (legacy: branches.view)
  branches: {
    view: true,
    create: true,
    edit: true,
    delete: true,
  },

  // Companies (legacy: companies.view)
  companies: {
    view: true,
    create: true,
    edit: true,
    delete: true,
  },

  // Password Requests
  password_requests: {
    view: true,
    approve: true,
    reject: true,
  },

  // System Settings (legacy: system_settings.view)
  system_settings: {
    view: true,
    edit: true,
  },

  // =====================================================
  // 🗑️ SOFT DELETE PERMISSIONS
  // =====================================================
  
  // Add restore and view_deleted to users
  // Already in users: but adding explicit ones
};

// Add soft delete permissions to users module
PERMISSIONS_TREE.users = {
  ...PERMISSIONS_TREE.users,
  restore: true,
  view_deleted: true,
  permanent_delete: true,
  manage_status: true,
};

// Add soft delete permissions to roles module
PERMISSIONS_TREE.roles = {
  ...PERMISSIONS_TREE.roles,
  restore: true,
  view_deleted: true,
};

/**
 * 🔧 Flatten permission tree to array of codes
 */
export function flattenPermissions(
  tree: Record<string, PermissionNode>,
  prefix: string = ''
): string[] {
  const permissions: string[] = [];

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'boolean') {
      if (value) {
        permissions.push(path);
      }
    } else if (typeof value === 'object' && value !== null) {
      permissions.push(...flattenPermissions(value as Record<string, PermissionNode>, path));
    }
  }

  return permissions;
}

/**
 * 📋 Get all permissions as flat array
 */
export function getAllPermissions(): string[] {
  return flattenPermissions(PERMISSIONS_TREE);
}

/**
 * 🏷️ Generate permission definitions with metadata
 */
export function getPermissionDefinitions(): PermissionDefinition[] {
  const codes = getAllPermissions();
  
  return codes.map(code => {
    const parts = code.split('.');
    const module = parts[0];
    const action = parts[parts.length - 1];
    const category = parts.length > 2 ? parts[1] : module;
    
    // Mark dangerous permissions
    const dangerousActions = ['delete', 'post', 'reverse', 'restore', 'approve'];
    const isDangerous = dangerousActions.includes(action);
    
    // Mark permissions that require approval
    const approvalActions = ['post', 'reverse', 'approve'];
    const requiresApproval = approvalActions.includes(action);

    return {
      code,
      module,
      category,
      nameEn: formatPermissionName(code, 'en'),
      nameAr: formatPermissionName(code, 'ar'),
      isDangerous,
      requiresApproval,
    };
  });
}

/**
 * 📝 Format permission name for display
 */
function formatPermissionName(code: string, lang: 'en' | 'ar'): string {
  const parts = code.split('.');
  
  // Basic English formatting
  if (lang === 'en') {
    return parts
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/([A-Z])/g, ' $1'))
      .join(' > ');
  }
  
  // Arabic will be filled from i18n registry
  return code;
}

/**
 * ✅ Check if a permission code is valid
 */
export function isValidPermission(code: string): boolean {
  return getAllPermissions().includes(code);
}

/**
 * 🔍 Get permissions by module
 */
export function getPermissionsByModule(module: string): string[] {
  return getAllPermissions().filter(p => p.startsWith(module + '.'));
}

// Export for use in middleware
export default PERMISSIONS_TREE;
