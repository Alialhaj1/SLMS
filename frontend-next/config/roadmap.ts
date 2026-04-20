/**
 * ============================================================================
 * §16 — خارطة التطوير التدريجي  (Development Roadmap)
 * ============================================================================
 * Machine-readable tracking of all phases, screens, and their status.
 *
 * Priority levels:
 *   P0 = حرج (Critical)    — Must exist for system to function
 *   P1 = حرج (Critical)    — Core operational screens
 *   P2 = عالي (High)       — Important business modules
 *   P3 = متوسط (Medium)    — Supporting modules
 *   P4 = عادي (Normal)     — Reference/master data, enhancements
 *   P5 = إضافي (Optional)  — External integrations, nice-to-haves
 *
 * Implementation status:
 *   COMPLETE    — Fully functional with API, validation, error handling
 *   FUNCTIONAL  — Working but missing minor features (e.g. no chart lib, hardcoded fallbacks)
 *   STUB        — Page exists but placeholder only
 *   NOT_STARTED — Page does not exist yet
 * ============================================================================
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type ScreenStatus = 'COMPLETE' | 'FUNCTIONAL' | 'STUB' | 'NOT_STARTED';
export type PhaseStatus = 'DONE' | 'IN_PROGRESS' | 'NOT_STARTED';
export type PhasePriority = 'critical' | 'high' | 'medium' | 'normal' | 'optional';

export interface Screen {
  /** Unique key for this screen */
  key: string;
  /** Screen name (Arabic) */
  nameAr: string;
  /** Screen name (English) */
  nameEn: string;
  /** Next.js page URL */
  url: string;
  /** Priority level */
  priority: Priority;
  /** Current implementation status */
  status: ScreenStatus;
  /** Related data tables / modules */
  relatedModules: string[];
  /** Corresponding backend API routes */
  apiRoutes?: string[];
  /** Notes on what's missing or needs improvement */
  notes?: string;
}

export interface Phase {
  /** Phase number (1-10) */
  number: number;
  /** Phase name (Arabic) */
  nameAr: string;
  /** Phase name (English) */
  nameEn: string;
  /** Priority classification */
  priority: PhasePriority;
  /** Planned week range */
  weeks: string;
  /** Overall phase status */
  status: PhaseStatus;
  /** Percentage complete (0-100) */
  progress: number;
  /** Individual screens in this phase */
  screens: Screen[];
}

// ─── Phase Definitions ──────────────────────────────────────────────────────

export const DEVELOPMENT_ROADMAP: Phase[] = [
  // ═══════════════════════════════════════════════════════════
  // Phase 1 — الأساس (Foundation)
  // ═══════════════════════════════════════════════════════════
  {
    number: 1,
    nameAr: 'الأساس',
    nameEn: 'Foundation',
    priority: 'critical',
    weeks: '1-2',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'login',
        nameAr: 'تسجيل الدخول',
        nameEn: 'Login',
        url: '/login',
        priority: 'P0',
        status: 'COMPLETE',
        relatedModules: ['JWT', 'tenants'],
        apiRoutes: ['/api/auth/login', '/api/auth/verify-company', '/api/auth/mfa/verify'],
        notes: 'Multi-stage tenant login: Company ID → Credentials → MFA. Full auth flow.',
      },
      {
        key: 'admin-dashboard',
        nameAr: 'لوحة تحكم المنصة',
        nameEn: 'Platform Dashboard',
        url: '/admin/dashboard',
        priority: 'P0',
        status: 'FUNCTIONAL',
        relatedModules: ['tenants', 'audit_logs'],
        apiRoutes: ['/api/admin/platform/stats', '/api/admin/platform/charts'],
        notes: 'Fetches real data. Chart rendering may need Recharts integration.',
      },
      {
        key: 'admin-tenants',
        nameAr: 'إدارة المستأجرين',
        nameEn: 'Tenant Management',
        url: '/admin/tenants',
        priority: 'P0',
        status: 'COMPLETE',
        relatedModules: ['tenant_users', 'subscription_plans'],
        apiRoutes: ['/api/tenants'],
        notes: 'Full CRUD, suspend/activate, impersonation banner.',
      },
      {
        key: 'client-dashboard',
        nameAr: 'لوحة التحكم (عميل)',
        nameEn: 'Client Dashboard',
        url: '/dashboard',
        priority: 'P0',
        status: 'COMPLETE',
        relatedModules: ['shipments', 'finance'],
        apiRoutes: ['/api/dashboard/stats', '/api/dashboard/alerts'],
        notes: '10+ KPI StatCards, DashboardCharts, SmartAlerts, growth calculations.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 2 — العمليات (Operations)
  // ═══════════════════════════════════════════════════════════
  {
    number: 2,
    nameAr: 'العمليات',
    nameEn: 'Operations',
    priority: 'critical',
    weeks: '3-4',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'shipments-list',
        nameAr: 'قائمة الشحنات',
        nameEn: 'Shipments List',
        url: '/shipments',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['ports', 'shipping_companies', 'customs'],
        apiRoutes: ['/api/shipments'],
        notes: 'Pagination, sorting, filtering, status colors. Fallback sample data.',
      },
      {
        key: 'shipments-create',
        nameAr: 'إنشاء شحنة',
        nameEn: 'Create Shipment',
        url: '/shipments/create',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['purchase_orders', 'items'],
        apiRoutes: ['/api/shipments', '/api/master/*'],
        notes: 'Multi-step wizard with PO auto-fill, dynamic lookups.',
      },
      {
        key: 'shipments-detail',
        nameAr: 'تفاصيل شحنة',
        nameEn: 'Shipment Details',
        url: '/shipments/[id]',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['tracking', 'documents', 'costs'],
        apiRoutes: ['/api/shipments/:id', '/api/shipments/:id/items', '/api/shipments/:id/costs'],
        notes: '2156 lines. Tabs: items, costs, shipping bills, containers, documents. Full CRUD.',
      },
      {
        key: 'shipments-tracking',
        nameAr: 'تتبع الشحنات',
        nameEn: 'Shipment Tracking',
        url: '/shipments/tracking',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['shipment_stages'],
        apiRoutes: ['/api/shipments/:id', '/api/shipment-events'],
        notes: 'Search by number/BL/container. Events timeline, status-colored.',
      },
      {
        key: 'purchase-orders-list',
        nameAr: 'أوامر الشراء',
        nameEn: 'Purchase Orders',
        url: '/purchasing/orders',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['vendors', 'items', 'workflows'],
        apiRoutes: ['/api/procurement/purchase-orders'],
        notes: 'Search, filters, approval/rejection modals, delete confirmation.',
      },
      {
        key: 'purchase-orders-new',
        nameAr: 'إنشاء أمر شراء',
        nameEn: 'Create Purchase Order',
        url: '/purchasing/orders/new',
        priority: 'P1',
        status: 'FUNCTIONAL',
        relatedModules: ['items', 'currencies', 'vendors'],
        apiRoutes: ['/api/procurement/purchase-orders'],
        notes: 'Delegates to ProfessionalPurchaseOrderForm (764 lines). Uses usePurchaseOrderForm hook.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 3 — الجمارك (Customs)
  // ═══════════════════════════════════════════════════════════
  {
    number: 3,
    nameAr: 'الجمارك',
    nameEn: 'Customs',
    priority: 'high',
    weeks: '5',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'customs-declarations',
        nameAr: 'البيانات الجمركية',
        nameEn: 'Customs Declarations',
        url: '/customs/declarations',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['hs_codes', 'tariffs', 'shipments'],
        apiRoutes: ['/api/customs-declarations'],
        notes: '1519 lines. Enterprise-grade: one-per-shipment validation, duty calc, Saudi ports.',
      },
      {
        key: 'duty-calculation',
        nameAr: 'حساب الرسوم',
        nameEn: 'Duty Calculation',
        url: '/customs/duty-calculation',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['hs_codes', 'tariff_rates'],
        apiRoutes: ['/api/customs-duty-calculation'],
        notes: 'HS code picker, country/date selection, API calculation, results history.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 4 — المالية (Finance)
  // ═══════════════════════════════════════════════════════════
  {
    number: 4,
    nameAr: 'المالية',
    nameEn: 'Finance',
    priority: 'high',
    weeks: '6-7',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'journals',
        nameAr: 'القيود اليومية',
        nameEn: 'Journal Entries',
        url: '/accounting/journals',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['chart_of_accounts'],
        apiRoutes: ['/api/accounting/journal-entries'],
        notes: 'Search, filters, post/cancel/delete with confirmation, DataTablePro.',
      },
      {
        key: 'chart-of-accounts',
        nameAr: 'شجرة الحسابات',
        nameEn: 'Chart of Accounts',
        url: '/master/chart-of-accounts',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['journal_lines'],
        apiRoutes: ['/api/accounts'],
        notes: '937 lines. Hierarchical tree view, CRUD, parent selection, default chart seeding.',
      },
      {
        key: 'payments',
        nameAr: 'المدفوعات',
        nameEn: 'Payments',
        url: '/procurement/payments',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['vendors', 'bank_accounts'],
        apiRoutes: ['/api/procurement/payments'],
        notes: 'Vendor/status/date filters, delete/unpost confirmation, allocation tracking.',
      },
      {
        key: 'letters-of-credit',
        nameAr: 'خطابات الاعتماد',
        nameEn: 'Letters of Credit',
        url: '/finance/letters-of-credit',
        priority: 'P3',
        status: 'COMPLETE',
        relatedModules: ['banks', 'shipments'],
        apiRoutes: ['/api/letters-of-credit'],
        notes: '1021 lines. Dashboard KPIs, alerts, CRUD, status filtering, amount tracking.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 5 — المستودعات (Warehouses)
  // ═══════════════════════════════════════════════════════════
  {
    number: 5,
    nameAr: 'المستودعات',
    nameEn: 'Warehouses',
    priority: 'medium',
    weeks: '8',
    status: 'IN_PROGRESS',
    progress: 75,
    screens: [
      {
        key: 'shipment-receiving',
        nameAr: 'استلام البضاعة',
        nameEn: 'Shipment Receiving',
        url: '/inventory/shipment-receiving',
        priority: 'P3',
        status: 'FUNCTIONAL',
        relatedModules: ['warehouses', 'shipments'],
        apiRoutes: ['/api/inventory/shipments/pending'],
        notes: 'Quality check workflow. Falls back to sample data on API failure.',
      },
      {
        key: 'inventory-management',
        nameAr: 'إدارة المخزون',
        nameEn: 'Inventory Management',
        url: '/inventory',
        priority: 'P3',
        status: 'COMPLETE',
        relatedModules: ['warehouses', 'items'],
        apiRoutes: ['/api/inventory/stock-movements'],
      },
      {
        key: 'stock-transfers',
        nameAr: 'تحويلات المخزون',
        nameEn: 'Stock Transfers',
        url: '/inventory/transfers',
        priority: 'P3',
        status: 'COMPLETE',
        relatedModules: ['warehouses'],
        apiRoutes: ['/api/inventory/stock-movements'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 6 — التقارير (Reports)
  // ═══════════════════════════════════════════════════════════
  {
    number: 6,
    nameAr: 'التقارير',
    nameEn: 'Reports',
    priority: 'medium',
    weeks: '9',
    status: 'DONE',
    progress: 95,
    screens: [
      {
        key: 'trial-balance',
        nameAr: 'ميزان المراجعة',
        nameEn: 'Trial Balance',
        url: '/accounting/reports/trial-balance',
        priority: 'P3',
        status: 'COMPLETE',
        relatedModules: ['chart_of_accounts'],
        apiRoutes: ['/api/reports/trial-balance'],
        notes: 'Date/account filters, balanced indicator, Excel export, hierarchical display.',
      },
      {
        key: 'balance-sheet',
        nameAr: 'الميزانية العمومية',
        nameEn: 'Balance Sheet',
        url: '/accounting/reports/balance-sheet',
        priority: 'P3',
        status: 'COMPLETE',
        relatedModules: ['journal_lines'],
        apiRoutes: ['/api/reports/balance-sheet'],
        notes: 'Assets=Liabilities+Equity check, variance display, hierarchical accounts.',
      },
      {
        key: 'kpis',
        nameAr: 'مؤشرات الأداء',
        nameEn: 'KPI Dashboard',
        url: '/dashboard/kpis',
        priority: 'P3',
        status: 'FUNCTIONAL',
        relatedModules: ['all'],
        apiRoutes: ['/api/shipments', '/api/warehouses', '/api/items'],
        notes: 'Fetches 3 real endpoints. Hardcoded trend percentages, no date filtering.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 7 — المبيعات/CRM (Sales/CRM)
  // ═══════════════════════════════════════════════════════════
  {
    number: 7,
    nameAr: 'المبيعات/CRM',
    nameEn: 'Sales/CRM',
    priority: 'normal',
    weeks: '10',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'sales-invoices',
        nameAr: 'فواتير المبيعات',
        nameEn: 'Sales Invoices',
        url: '/sales/invoices',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['customers', 'items'],
        apiRoutes: ['/api/sales/invoices'],
      },
      {
        key: 'sales-quotations',
        nameAr: 'عروض الأسعار',
        nameEn: 'Sales Quotations',
        url: '/sales/quotations',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['customers', 'items'],
        apiRoutes: ['/api/sales/quotations'],
      },
      {
        key: 'customers',
        nameAr: 'إدارة العملاء',
        nameEn: 'Customer Management',
        url: '/crm/customers',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['contacts'],
        apiRoutes: ['/api/sales/customers'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 8 — HR/الأصول (HR/Assets)
  // ═══════════════════════════════════════════════════════════
  {
    number: 8,
    nameAr: 'الموارد البشرية والأصول',
    nameEn: 'HR & Assets',
    priority: 'normal',
    weeks: '11',
    status: 'IN_PROGRESS',
    progress: 60,
    screens: [
      {
        key: 'employees',
        nameAr: 'الموظفون',
        nameEn: 'Employees',
        url: '/hr/employees',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['departments'],
        apiRoutes: ['/api/hr/employees'],
      },
      {
        key: 'payroll',
        nameAr: 'الرواتب',
        nameEn: 'Payroll',
        url: '/hr/payroll',
        priority: 'P4',
        status: 'STUB',
        relatedModules: ['employees'],
        apiRoutes: [],
        notes: 'Page exists but needs full payroll processing workflow.',
      },
      {
        key: 'fixed-assets',
        nameAr: 'الأصول الثابتة',
        nameEn: 'Fixed Assets',
        url: '/assets',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['depreciation'],
        apiRoutes: ['/api/assets'],
      },
      {
        key: 'depreciation',
        nameAr: 'الإهلاك',
        nameEn: 'Depreciation',
        url: '/assets/depreciation',
        priority: 'P4',
        status: 'STUB',
        relatedModules: ['fixed_assets', 'journal_entries'],
        apiRoutes: [],
        notes: 'Needs depreciation schedule and auto-journal creation.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 9 — البيانات الأساسية (Master Data)
  // ═══════════════════════════════════════════════════════════
  {
    number: 9,
    nameAr: 'البيانات الأساسية',
    nameEn: 'Master Data',
    priority: 'normal',
    weeks: '12-13',
    status: 'DONE',
    progress: 100,
    screens: [
      {
        key: 'master-data-all',
        nameAr: 'قاموس البيانات (130+ شاشة)',
        nameEn: 'Data Dictionary (130+ screens)',
        url: '/master/*',
        priority: 'P4',
        status: 'COMPLETE',
        relatedModules: ['all'],
        apiRoutes: ['/api/master/*'],
        notes: '~165 page files covering all reference data. Full CRUD via useMasterData hook.',
      },
      {
        key: 'roles-management',
        nameAr: 'الأدوار والصلاحيات',
        nameEn: 'Roles & Permissions',
        url: '/admin/roles',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['tenant_users'],
        apiRoutes: ['/api/roles', '/api/tenant-roles'],
        notes: 'CRUD, templates, clone, permission assignment, tenant-aware.',
      },
      {
        key: 'audit-logs',
        nameAr: 'سجلات التدقيق',
        nameEn: 'Audit Logs',
        url: '/admin/audit-logs',
        priority: 'P1',
        status: 'COMPLETE',
        relatedModules: ['all'],
        apiRoutes: ['/api/audit-logs'],
        notes: 'Filters, color-coded action badges, CSV export, paginated.',
      },
      {
        key: 'system-settings',
        nameAr: 'إعدادات النظام',
        nameEn: 'System Settings',
        url: '/settings',
        priority: 'P2',
        status: 'COMPLETE',
        relatedModules: ['tenants'],
        apiRoutes: ['/api/settings'],
        notes: 'Company info, timezone, currency, 2FA, session timeout.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Phase 10 — التكاملات (Integrations)
  // ═══════════════════════════════════════════════════════════
  {
    number: 10,
    nameAr: 'التكاملات',
    nameEn: 'Integrations',
    priority: 'optional',
    weeks: '14-15',
    status: 'IN_PROGRESS',
    progress: 30,
    screens: [
      {
        key: 'zatca-integration',
        nameAr: 'تكامل ZATCA',
        nameEn: 'ZATCA Integration',
        url: '/integrations/zatca',
        priority: 'P5',
        status: 'STUB',
        relatedModules: ['invoices', 'tax'],
        apiRoutes: [],
        notes: 'Saudi tax authority e-invoicing. Needs ZATCA SDK integration.',
      },
      {
        key: 'bank-integration',
        nameAr: 'تكامل البنوك',
        nameEn: 'Bank Integration',
        url: '/integrations/banks',
        priority: 'P5',
        status: 'STUB',
        relatedModules: ['bank_accounts', 'payments'],
        apiRoutes: [],
        notes: 'Bank file import/export, statement reconciliation.',
      },
      {
        key: 'payment-gateways',
        nameAr: 'بوابات الدفع',
        nameEn: 'Payment Gateways',
        url: '/integrations/payments',
        priority: 'P5',
        status: 'STUB',
        relatedModules: ['payments'],
        apiRoutes: [],
        notes: 'Online payment processing (Moyasar, Tap, etc.).',
      },
      {
        key: 'shipping-carriers',
        nameAr: 'شركات الشحن',
        nameEn: 'Shipping Carriers',
        url: '/integrations/carriers',
        priority: 'P5',
        status: 'STUB',
        relatedModules: ['shipments', 'tracking'],
        apiRoutes: [],
        notes: 'Carrier API tracking (Maersk, MSC, etc.).',
      },
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Get overall roadmap progress (0-100) */
export function getRoadmapProgress(): number {
  const totalScreens = DEVELOPMENT_ROADMAP.reduce(
    (sum, phase) => sum + phase.screens.length, 0
  );
  const completedScreens = DEVELOPMENT_ROADMAP.reduce(
    (sum, phase) =>
      sum +
      phase.screens.filter(
        (s) => s.status === 'COMPLETE' || s.status === 'FUNCTIONAL'
      ).length,
    0
  );
  return Math.round((completedScreens / totalScreens) * 100);
}

/** Get screens by priority */
export function getScreensByPriority(priority: Priority): Screen[] {
  return DEVELOPMENT_ROADMAP.flatMap((phase) =>
    phase.screens.filter((screen) => screen.priority === priority)
  );
}

/** Get screens that still need work */
export function getIncompleteScreens(): Screen[] {
  return DEVELOPMENT_ROADMAP.flatMap((phase) =>
    phase.screens.filter(
      (s) => s.status === 'STUB' || s.status === 'NOT_STARTED'
    )
  );
}

/** Get screens by status */
export function getScreensByStatus(status: ScreenStatus): Screen[] {
  return DEVELOPMENT_ROADMAP.flatMap((phase) =>
    phase.screens.filter((s) => s.status === status)
  );
}

/** Get phase by number */
export function getPhase(number: number): Phase | undefined {
  return DEVELOPMENT_ROADMAP.find((p) => p.number === number);
}

/** Summary statistics */
export function getRoadmapSummary() {
  const screens = DEVELOPMENT_ROADMAP.flatMap((p) => p.screens);
  return {
    totalPhases: DEVELOPMENT_ROADMAP.length,
    totalScreens: screens.length,
    complete: screens.filter((s) => s.status === 'COMPLETE').length,
    functional: screens.filter((s) => s.status === 'FUNCTIONAL').length,
    stub: screens.filter((s) => s.status === 'STUB').length,
    notStarted: screens.filter((s) => s.status === 'NOT_STARTED').length,
    overallProgress: getRoadmapProgress(),
    phaseProgress: DEVELOPMENT_ROADMAP.map((p) => ({
      phase: p.number,
      name: p.nameEn,
      progress: p.progress,
      status: p.status,
    })),
  };
}
