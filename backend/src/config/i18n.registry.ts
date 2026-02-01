/**
 * 🌍 I18N REGISTRY
 * =====================================================
 * Single Source of Truth for ALL translations
 * 
 * Keys match permissions.registry.ts for auto-linking
 * 
 * Structure:
 * - modules: Module names
 * - screens: Screen titles
 * - actions: Action labels (buttons)
 * - fields: Field labels
 * - messages: System messages
 * - errors: Error messages
 */

export type Language = 'en' | 'ar';

export interface TranslationNode {
  [key: string]: string | TranslationNode;
}

/**
 * 📋 MODULES - Top level navigation
 */
export const MODULES: Record<string, Record<Language, string>> = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  master: { en: 'Master Data', ar: 'البيانات الرئيسية' },
  accounting: { en: 'Accounting', ar: 'المحاسبة' },
  sales: { en: 'Sales', ar: 'المبيعات' },
  purchases: { en: 'Purchases', ar: 'المشتريات' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  reports: { en: 'Reports', ar: 'التقارير' },
  users: { en: 'Users', ar: 'المستخدمون' },
  roles: { en: 'Roles', ar: 'الأدوار' },
  system: { en: 'System', ar: 'النظام' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },
};

/**
 * 📱 SCREENS - Page titles and descriptions
 */
export const SCREENS: Record<string, Record<Language, { title: string; description?: string }>> = {
  // Dashboard
  'dashboard': { 
    en: { title: 'Dashboard', description: 'Overview of business metrics' }, 
    ar: { title: 'لوحة التحكم', description: 'نظرة عامة على مؤشرات الأعمال' } 
  },

  // Master Data - Accounts
  'master.accounts': { 
    en: { title: 'Chart of Accounts', description: 'Manage accounting accounts' }, 
    ar: { title: 'شجرة الحسابات', description: 'إدارة الحسابات المحاسبية' } 
  },
  'master.accounts.tree': { 
    en: { title: 'Account Tree', description: 'Hierarchical view of accounts' }, 
    ar: { title: 'شجرة الحسابات', description: 'عرض هرمي للحسابات' } 
  },
  'master.accounts.ledger': { 
    en: { title: 'Account Ledger', description: 'Account transaction history' }, 
    ar: { title: 'كشف حساب', description: 'تاريخ حركات الحساب' } 
  },

  // Master Data - Customers
  'master.customers': { 
    en: { title: 'Customers', description: 'Manage customer accounts' }, 
    ar: { title: 'العملاء', description: 'إدارة حسابات العملاء' } 
  },
  'master.customers.statement': { 
    en: { title: 'Customer Statement', description: 'Customer transaction history' }, 
    ar: { title: 'كشف حساب عميل', description: 'تاريخ معاملات العميل' } 
  },

  // Master Data - Vendors
  'master.vendors': { 
    en: { title: 'Vendors', description: 'Manage vendor accounts' }, 
    ar: { title: 'الموردون', description: 'إدارة حسابات الموردين' } 
  },
  'master.vendors.statement': { 
    en: { title: 'Vendor Statement', description: 'Vendor transaction history' }, 
    ar: { title: 'كشف حساب مورد', description: 'تاريخ معاملات المورد' } 
  },

  // Master Data - Items
  'master.items': { 
    en: { title: 'Items', description: 'Manage products and services' }, 
    ar: { title: 'الأصناف', description: 'إدارة المنتجات والخدمات' } 
  },

  // Master Data - Warehouses
  'master.warehouses': { 
    en: { title: 'Warehouses', description: 'Manage storage locations' }, 
    ar: { title: 'المستودعات', description: 'إدارة مواقع التخزين' } 
  },

  // Master Data - Cost Centers
  'master.costCenters': { 
    en: { title: 'Cost Centers', description: 'Manage cost centers' }, 
    ar: { title: 'مراكز التكلفة', description: 'إدارة مراكز التكلفة' } 
  },

  // Master Data - Currencies
  'master.currencies': { 
    en: { title: 'Currencies', description: 'Manage currencies and rates' }, 
    ar: { title: 'العملات', description: 'إدارة العملات وأسعار الصرف' } 
  },

  // Master Data - Payment Terms
  'master.paymentTerms': { 
    en: { title: 'Payment Terms', description: 'Manage payment conditions' }, 
    ar: { title: 'شروط الدفع', description: 'إدارة شروط السداد' } 
  },

  // Accounting - Journal Entries
  'accounting.journal': { 
    en: { title: 'Journal Entries', description: 'Manage accounting entries' }, 
    ar: { title: 'القيود المحاسبية', description: 'إدارة قيود اليومية' } 
  },

  // Accounting - Fiscal Years
  'accounting.fiscalYears': { 
    en: { title: 'Fiscal Years', description: 'Manage accounting periods' }, 
    ar: { title: 'السنوات المالية', description: 'إدارة الفترات المحاسبية' } 
  },

  // Accounting - Periods
  'accounting.periods': { 
    en: { title: 'Accounting Periods', description: 'Monthly/quarterly periods' }, 
    ar: { title: 'الفترات المحاسبية', description: 'الفترات الشهرية/الربعية' } 
  },

  // Accounting - Bank
  'accounting.bank': { 
    en: { title: 'Bank Accounts', description: 'Manage bank accounts' }, 
    ar: { title: 'الحسابات البنكية', description: 'إدارة الحسابات البنكية' } 
  },

  // Sales - Quotations
  'sales.quotation': { 
    en: { title: 'Quotations', description: 'Sales quotations' }, 
    ar: { title: 'عروض الأسعار', description: 'عروض أسعار المبيعات' } 
  },

  // Sales - Orders
  'sales.order': { 
    en: { title: 'Sales Orders', description: 'Customer orders' }, 
    ar: { title: 'أوامر البيع', description: 'طلبات العملاء' } 
  },

  // Sales - Invoices
  'sales.invoice': { 
    en: { title: 'Sales Invoices', description: 'Customer invoices' }, 
    ar: { title: 'فواتير المبيعات', description: 'فواتير العملاء' } 
  },

  // Sales - Returns
  'sales.return': { 
    en: { title: 'Sales Returns', description: 'Customer returns' }, 
    ar: { title: 'مرتجعات المبيعات', description: 'مرتجعات العملاء' } 
  },

  // Sales - Receipts
  'sales.receipt': { 
    en: { title: 'Receipt Vouchers', description: 'Customer payments' }, 
    ar: { title: 'سندات القبض', description: 'مقبوضات العملاء' } 
  },

  // Purchases - Requests
  'purchases.request': { 
    en: { title: 'Purchase Requests', description: 'Internal purchase requests' }, 
    ar: { title: 'طلبات الشراء', description: 'طلبات الشراء الداخلية' } 
  },

  // Purchases - Orders
  'purchases.order': { 
    en: { title: 'Purchase Orders', description: 'Vendor orders' }, 
    ar: { title: 'أوامر الشراء', description: 'طلبات الموردين' } 
  },

  // Purchases - Invoices
  'purchases.invoice': { 
    en: { title: 'Purchase Invoices', description: 'Vendor invoices' }, 
    ar: { title: 'فواتير المشتريات', description: 'فواتير الموردين' } 
  },

  // Purchases - Returns
  'purchases.return': { 
    en: { title: 'Purchase Returns', description: 'Vendor returns' }, 
    ar: { title: 'مرتجعات المشتريات', description: 'مرتجعات للموردين' } 
  },

  // Purchases - Payments
  'purchases.payment': { 
    en: { title: 'Payment Vouchers', description: 'Vendor payments' }, 
    ar: { title: 'سندات الصرف', description: 'مدفوعات الموردين' } 
  },

  // Inventory
  'inventory.stock': { 
    en: { title: 'Stock View', description: 'Current stock levels' }, 
    ar: { title: 'عرض المخزون', description: 'مستويات المخزون الحالية' } 
  },
  'inventory.transfer': { 
    en: { title: 'Stock Transfer', description: 'Transfer between warehouses' }, 
    ar: { title: 'تحويل مخزني', description: 'التحويل بين المستودعات' } 
  },
  'inventory.adjustment': { 
    en: { title: 'Stock Adjustment', description: 'Adjust stock quantities' }, 
    ar: { title: 'تسوية المخزون', description: 'تعديل كميات المخزون' } 
  },
  'inventory.count': { 
    en: { title: 'Stock Count', description: 'Physical inventory count' }, 
    ar: { title: 'جرد المخزون', description: 'الجرد الفعلي للمخزون' } 
  },

  // Reports
  'reports.financial': { 
    en: { title: 'Financial Reports', description: 'Accounting reports' }, 
    ar: { title: 'التقارير المالية', description: 'التقارير المحاسبية' } 
  },
  'reports.financial.trialBalance': { 
    en: { title: 'Trial Balance', description: 'Account balances' }, 
    ar: { title: 'ميزان المراجعة', description: 'أرصدة الحسابات' } 
  },
  'reports.financial.balanceSheet': { 
    en: { title: 'Balance Sheet', description: 'Financial position' }, 
    ar: { title: 'الميزانية العمومية', description: 'المركز المالي' } 
  },
  'reports.financial.incomeStatement': { 
    en: { title: 'Income Statement', description: 'Profit and loss' }, 
    ar: { title: 'قائمة الدخل', description: 'الأرباح والخسائر' } 
  },
  'reports.financial.cashFlow': { 
    en: { title: 'Cash Flow Statement', description: 'Cash movements' }, 
    ar: { title: 'قائمة التدفقات النقدية', description: 'حركة النقد' } 
  },
  'reports.sales': { 
    en: { title: 'Sales Reports', description: 'Sales analysis' }, 
    ar: { title: 'تقارير المبيعات', description: 'تحليل المبيعات' } 
  },
  'reports.purchases': { 
    en: { title: 'Purchase Reports', description: 'Purchase analysis' }, 
    ar: { title: 'تقارير المشتريات', description: 'تحليل المشتريات' } 
  },
  'reports.inventory': { 
    en: { title: 'Inventory Reports', description: 'Stock analysis' }, 
    ar: { title: 'تقارير المخزون', description: 'تحليل المخزون' } 
  },
  'reports.aging': { 
    en: { title: 'Aging Reports', description: 'Receivables and payables aging' }, 
    ar: { title: 'تقارير أعمار الديون', description: 'أعمار المديونيات والمستحقات' } 
  },

  // Users & Roles
  'users': { 
    en: { title: 'User Management', description: 'Manage system users' }, 
    ar: { title: 'إدارة المستخدمين', description: 'إدارة مستخدمي النظام' } 
  },
  'roles': { 
    en: { title: 'Role Management', description: 'Manage roles and permissions' }, 
    ar: { title: 'إدارة الأدوار', description: 'إدارة الأدوار والصلاحيات' } 
  },

  // System
  'system.companies': { 
    en: { title: 'Companies', description: 'Manage companies' }, 
    ar: { title: 'الشركات', description: 'إدارة الشركات' } 
  },
  'system.branches': { 
    en: { title: 'Branches', description: 'Manage branches' }, 
    ar: { title: 'الفروع', description: 'إدارة الفروع' } 
  },
  'system.settings': { 
    en: { title: 'System Settings', description: 'Configure system' }, 
    ar: { title: 'إعدادات النظام', description: 'تكوين النظام' } 
  },
  'system.auditLogs': { 
    en: { title: 'Audit Logs', description: 'System activity logs' }, 
    ar: { title: 'سجل المراجعة', description: 'سجل نشاط النظام' } 
  },
  'system.backup': { 
    en: { title: 'Backup & Restore', description: 'Data backup' }, 
    ar: { title: 'النسخ الاحتياطي', description: 'نسخ البيانات احتياطيًا' } 
  },
};

/**
 * 🔘 ACTIONS - Button labels
 */
export const ACTIONS: Record<string, Record<Language, string>> = {
  view: { en: 'View', ar: 'عرض' },
  create: { en: 'Create', ar: 'إنشاء' },
  edit: { en: 'Edit', ar: 'تعديل' },
  delete: { en: 'Delete', ar: 'حذف' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  close: { en: 'Close', ar: 'إغلاق' },
  export: { en: 'Export', ar: 'تصدير' },
  import: { en: 'Import', ar: 'استيراد' },
  print: { en: 'Print', ar: 'طباعة' },
  search: { en: 'Search', ar: 'بحث' },
  filter: { en: 'Filter', ar: 'تصفية' },
  reset: { en: 'Reset', ar: 'إعادة تعيين' },
  refresh: { en: 'Refresh', ar: 'تحديث' },
  back: { en: 'Back', ar: 'رجوع' },
  next: { en: 'Next', ar: 'التالي' },
  previous: { en: 'Previous', ar: 'السابق' },
  submit: { en: 'Submit', ar: 'إرسال' },
  approve: { en: 'Approve', ar: 'اعتماد' },
  reject: { en: 'Reject', ar: 'رفض' },
  post: { en: 'Post', ar: 'ترحيل' },
  unpost: { en: 'Unpost', ar: 'إلغاء الترحيل' },
  reverse: { en: 'Reverse', ar: 'عكس' },
  duplicate: { en: 'Duplicate', ar: 'نسخ' },
  clone: { en: 'Clone', ar: 'استنساخ' },
  activate: { en: 'Activate', ar: 'تفعيل' },
  deactivate: { en: 'Deactivate', ar: 'تعطيل' },
  lock: { en: 'Lock', ar: 'قفل' },
  unlock: { en: 'Unlock', ar: 'فتح القفل' },
  restore: { en: 'Restore', ar: 'استعادة' },
  archive: { en: 'Archive', ar: 'أرشفة' },
  confirm: { en: 'Confirm', ar: 'تأكيد' },
  add: { en: 'Add', ar: 'إضافة' },
  remove: { en: 'Remove', ar: 'إزالة' },
  select: { en: 'Select', ar: 'اختيار' },
  selectAll: { en: 'Select All', ar: 'تحديد الكل' },
  deselectAll: { en: 'Deselect All', ar: 'إلغاء تحديد الكل' },
  upload: { en: 'Upload', ar: 'رفع' },
  download: { en: 'Download', ar: 'تحميل' },
  copy: { en: 'Copy', ar: 'نسخ' },
  paste: { en: 'Paste', ar: 'لصق' },
  convertToOrder: { en: 'Convert to Order', ar: 'تحويل لأمر' },
  convertToInvoice: { en: 'Convert to Invoice', ar: 'تحويل لفاتورة' },
  reconcile: { en: 'Reconcile', ar: 'مطابقة' },
  adjust: { en: 'Adjust', ar: 'تسوية' },
  resetPassword: { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
  assignRoles: { en: 'Assign Roles', ar: 'تعيين الأدوار' },
  assignPermissions: { en: 'Assign Permissions', ar: 'تعيين الصلاحيات' },
  viewDetails: { en: 'View Details', ar: 'عرض التفاصيل' },
  showMore: { en: 'Show More', ar: 'عرض المزيد' },
  showLess: { en: 'Show Less', ar: 'عرض أقل' },
  expandAll: { en: 'Expand All', ar: 'توسيع الكل' },
  collapseAll: { en: 'Collapse All', ar: 'طي الكل' },
};

/**
 * 📝 COMMON FIELDS - Shared field labels
 */
export const FIELDS: Record<string, Record<Language, string>> = {
  id: { en: 'ID', ar: 'المعرف' },
  code: { en: 'Code', ar: 'الكود' },
  name: { en: 'Name', ar: 'الاسم' },
  nameEn: { en: 'Name (English)', ar: 'الاسم (إنجليزي)' },
  nameAr: { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
  description: { en: 'Description', ar: 'الوصف' },
  status: { en: 'Status', ar: 'الحالة' },
  type: { en: 'Type', ar: 'النوع' },
  category: { en: 'Category', ar: 'الفئة' },
  date: { en: 'Date', ar: 'التاريخ' },
  createdAt: { en: 'Created At', ar: 'تاريخ الإنشاء' },
  updatedAt: { en: 'Updated At', ar: 'تاريخ التحديث' },
  createdBy: { en: 'Created By', ar: 'أنشأ بواسطة' },
  updatedBy: { en: 'Updated By', ar: 'عدل بواسطة' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  active: { en: 'Active', ar: 'نشط' },
  inactive: { en: 'Inactive', ar: 'غير نشط' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  quantity: { en: 'Quantity', ar: 'الكمية' },
  price: { en: 'Price', ar: 'السعر' },
  unitPrice: { en: 'Unit Price', ar: 'سعر الوحدة' },
  total: { en: 'Total', ar: 'الإجمالي' },
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  grandTotal: { en: 'Grand Total', ar: 'الإجمالي الكلي' },
  discount: { en: 'Discount', ar: 'الخصم' },
  tax: { en: 'Tax', ar: 'الضريبة' },
  taxRate: { en: 'Tax Rate', ar: 'نسبة الضريبة' },
  net: { en: 'Net', ar: 'الصافي' },
  gross: { en: 'Gross', ar: 'الإجمالي' },
  currency: { en: 'Currency', ar: 'العملة' },
  exchangeRate: { en: 'Exchange Rate', ar: 'سعر الصرف' },
  balance: { en: 'Balance', ar: 'الرصيد' },
  debit: { en: 'Debit', ar: 'مدين' },
  credit: { en: 'Credit', ar: 'دائن' },
  account: { en: 'Account', ar: 'الحساب' },
  accountCode: { en: 'Account Code', ar: 'كود الحساب' },
  accountName: { en: 'Account Name', ar: 'اسم الحساب' },
  customer: { en: 'Customer', ar: 'العميل' },
  vendor: { en: 'Vendor', ar: 'المورد' },
  item: { en: 'Item', ar: 'الصنف' },
  warehouse: { en: 'Warehouse', ar: 'المستودع' },
  branch: { en: 'Branch', ar: 'الفرع' },
  company: { en: 'Company', ar: 'الشركة' },
  costCenter: { en: 'Cost Center', ar: 'مركز التكلفة' },
  documentNo: { en: 'Document No.', ar: 'رقم المستند' },
  referenceNo: { en: 'Reference No.', ar: 'رقم المرجع' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  mobile: { en: 'Mobile', ar: 'الجوال' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  address: { en: 'Address', ar: 'العنوان' },
  city: { en: 'City', ar: 'المدينة' },
  country: { en: 'Country', ar: 'الدولة' },
  postalCode: { en: 'Postal Code', ar: 'الرمز البريدي' },
  taxNumber: { en: 'Tax Number', ar: 'الرقم الضريبي' },
  creditLimit: { en: 'Credit Limit', ar: 'حد الائتمان' },
  paymentTerms: { en: 'Payment Terms', ar: 'شروط الدفع' },
  dueDate: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  barcode: { en: 'Barcode', ar: 'الباركود' },
  sku: { en: 'SKU', ar: 'رمز المنتج' },
  unit: { en: 'Unit', ar: 'الوحدة' },
  cost: { en: 'Cost', ar: 'التكلفة' },
  avgCost: { en: 'Average Cost', ar: 'متوسط التكلفة' },
  reorderLevel: { en: 'Reorder Level', ar: 'حد إعادة الطلب' },
  minStock: { en: 'Minimum Stock', ar: 'الحد الأدنى' },
  maxStock: { en: 'Maximum Stock', ar: 'الحد الأقصى' },
  onHand: { en: 'On Hand', ar: 'الكمية المتاحة' },
  reserved: { en: 'Reserved', ar: 'الكمية المحجوزة' },
  available: { en: 'Available', ar: 'الكمية القابلة للبيع' },
  period: { en: 'Period', ar: 'الفترة' },
  fiscalYear: { en: 'Fiscal Year', ar: 'السنة المالية' },
  openingBalance: { en: 'Opening Balance', ar: 'الرصيد الافتتاحي' },
  closingBalance: { en: 'Closing Balance', ar: 'الرصيد الختامي' },
  posted: { en: 'Posted', ar: 'مرحل' },
  draft: { en: 'Draft', ar: 'مسودة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  pending: { en: 'Pending', ar: 'معلق' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  closed: { en: 'Closed', ar: 'مغلق' },
  open: { en: 'Open', ar: 'مفتوح' },
  parent: { en: 'Parent', ar: 'الأب' },
  level: { en: 'Level', ar: 'المستوى' },
  isParent: { en: 'Is Parent', ar: 'هل أب' },
  hasChildren: { en: 'Has Children', ar: 'له فروع' },
};

/**
 * 💬 MESSAGES - System messages
 */
export const MESSAGES: Record<string, Record<Language, string>> = {
  // Success messages
  'success.created': { en: 'Created successfully', ar: 'تم الإنشاء بنجاح' },
  'success.updated': { en: 'Updated successfully', ar: 'تم التحديث بنجاح' },
  'success.deleted': { en: 'Deleted successfully', ar: 'تم الحذف بنجاح' },
  'success.saved': { en: 'Saved successfully', ar: 'تم الحفظ بنجاح' },
  'success.posted': { en: 'Posted successfully', ar: 'تم الترحيل بنجاح' },
  'success.reversed': { en: 'Reversed successfully', ar: 'تم العكس بنجاح' },
  'success.approved': { en: 'Approved successfully', ar: 'تم الاعتماد بنجاح' },
  'success.rejected': { en: 'Rejected successfully', ar: 'تم الرفض بنجاح' },
  'success.exported': { en: 'Exported successfully', ar: 'تم التصدير بنجاح' },
  'success.imported': { en: 'Imported successfully', ar: 'تم الاستيراد بنجاح' },
  'success.login': { en: 'Login successful', ar: 'تم تسجيل الدخول بنجاح' },
  'success.logout': { en: 'Logged out successfully', ar: 'تم تسجيل الخروج بنجاح' },
  'success.passwordReset': { en: 'Password reset successfully', ar: 'تم إعادة تعيين كلمة المرور بنجاح' },

  // Confirmation messages
  'confirm.delete': { en: 'Are you sure you want to delete?', ar: 'هل أنت متأكد من الحذف؟' },
  'confirm.post': { en: 'Are you sure you want to post?', ar: 'هل أنت متأكد من الترحيل؟' },
  'confirm.reverse': { en: 'Are you sure you want to reverse?', ar: 'هل أنت متأكد من العكس؟' },
  'confirm.approve': { en: 'Are you sure you want to approve?', ar: 'هل أنت متأكد من الاعتماد؟' },
  'confirm.cancel': { en: 'Are you sure you want to cancel?', ar: 'هل أنت متأكد من الإلغاء؟' },
  'confirm.logout': { en: 'Are you sure you want to logout?', ar: 'هل أنت متأكد من تسجيل الخروج؟' },
  'confirm.unsavedChanges': { en: 'You have unsaved changes. Are you sure you want to leave?', ar: 'لديك تغييرات غير محفوظة. هل أنت متأكد من المغادرة؟' },

  // Loading messages
  'loading.data': { en: 'Loading data...', ar: 'جاري تحميل البيانات...' },
  'loading.saving': { en: 'Saving...', ar: 'جاري الحفظ...' },
  'loading.processing': { en: 'Processing...', ar: 'جاري المعالجة...' },
  'loading.exporting': { en: 'Exporting...', ar: 'جاري التصدير...' },

  // Empty states
  'empty.noData': { en: 'No data available', ar: 'لا توجد بيانات' },
  'empty.noResults': { en: 'No results found', ar: 'لم يتم العثور على نتائج' },
  'empty.noItems': { en: 'No items', ar: 'لا توجد عناصر' },

  // Info messages
  'info.noPermission': { en: 'You do not have permission to perform this action', ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء' },
  'info.sessionExpired': { en: 'Your session has expired. Please login again', ar: 'انتهت جلستك. الرجاء تسجيل الدخول مرة أخرى' },
  'info.requiredFields': { en: 'Please fill in all required fields', ar: 'يرجى ملء جميع الحقول المطلوبة' },
};

/**
 * ❌ ERROR MESSAGES
 */
export const ERRORS: Record<string, Record<Language, string>> = {
  'error.general': { en: 'An error occurred', ar: 'حدث خطأ' },
  'error.network': { en: 'Network error. Please check your connection', ar: 'خطأ في الشبكة. يرجى التحقق من الاتصال' },
  'error.server': { en: 'Server error. Please try again later', ar: 'خطأ في الخادم. يرجى المحاولة لاحقًا' },
  'error.notFound': { en: 'Not found', ar: 'غير موجود' },
  'error.unauthorized': { en: 'Unauthorized', ar: 'غير مصرح' },
  'error.forbidden': { en: 'Access denied', ar: 'الوصول مرفوض' },
  'error.validation': { en: 'Validation error', ar: 'خطأ في التحقق' },
  'error.duplicate': { en: 'Duplicate entry', ar: 'إدخال مكرر' },
  'error.required': { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
  'error.invalidEmail': { en: 'Invalid email address', ar: 'بريد إلكتروني غير صالح' },
  'error.invalidPhone': { en: 'Invalid phone number', ar: 'رقم هاتف غير صالح' },
  'error.minLength': { en: 'Minimum length is {min} characters', ar: 'الحد الأدنى للطول هو {min} حرف' },
  'error.maxLength': { en: 'Maximum length is {max} characters', ar: 'الحد الأقصى للطول هو {max} حرف' },
  'error.invalidCredentials': { en: 'Invalid username or password', ar: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
  'error.accountLocked': { en: 'Account is locked', ar: 'الحساب مقفل' },
  'error.accountInactive': { en: 'Account is inactive', ar: 'الحساب غير نشط' },
  'error.balanceNotZero': { en: 'Debit and credit must be equal', ar: 'يجب أن يتساوى المدين والدائن' },
  'error.periodClosed': { en: 'Accounting period is closed', ar: 'الفترة المحاسبية مغلقة' },
  'error.insufficientStock': { en: 'Insufficient stock quantity', ar: 'الكمية غير متوفرة في المخزون' },
  'error.fileTooBig': { en: 'File is too large', ar: 'الملف كبير جدًا' },
  'error.invalidFileType': { en: 'Invalid file type', ar: 'نوع الملف غير صالح' },
  'error.cannotDeleteParent': { en: 'Cannot delete: has child records', ar: 'لا يمكن الحذف: يحتوي على سجلات فرعية' },
  'error.cannotDeleteUsed': { en: 'Cannot delete: record is in use', ar: 'لا يمكن الحذف: السجل قيد الاستخدام' },
};

/**
 * 📅 DATE/TIME FORMATS
 */
export const DATE_FORMATS: Record<Language, { date: string; time: string; datetime: string }> = {
  en: { date: 'MM/DD/YYYY', time: 'hh:mm A', datetime: 'MM/DD/YYYY hh:mm A' },
  ar: { date: 'DD/MM/YYYY', time: 'HH:mm', datetime: 'DD/MM/YYYY HH:mm' },
};

/**
 * 🔧 HELPER FUNCTIONS
 */

/**
 * Get translation for a key
 */
export function t(
  key: string, 
  lang: Language = 'en', 
  params?: Record<string, string | number>
): string {
  // Try screens
  const screenParts = key.split('.');
  let screen = SCREENS[key];
  if (screen) {
    return screen[lang]?.title || key;
  }

  // Try actions
  const action = ACTIONS[key];
  if (action) {
    return action[lang] || key;
  }

  // Try fields
  const field = FIELDS[key];
  if (field) {
    return field[lang] || key;
  }

  // Try messages
  const message = MESSAGES[key];
  if (message) {
    let text = message[lang] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }

  // Try errors
  const error = ERRORS[key];
  if (error) {
    let text = error[lang] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }

  // Try modules
  const module = MODULES[key];
  if (module) {
    return module[lang] || key;
  }

  return key;
}

/**
 * Get all translations for a module
 */
export function getModuleTranslations(module: string, lang: Language = 'en'): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(SCREENS).forEach(([key, value]) => {
    if (key.startsWith(module + '.') || key === module) {
      result[key] = value[lang]?.title || key;
    }
  });

  return result;
}

/**
 * Get screen info including title and description
 */
export function getScreenInfo(key: string, lang: Language = 'en'): { title: string; description?: string } {
  const screen = SCREENS[key];
  if (screen) {
    return screen[lang] || { title: key };
  }
  return { title: key };
}

export default { t, MODULES, SCREENS, ACTIONS, FIELDS, MESSAGES, ERRORS };
