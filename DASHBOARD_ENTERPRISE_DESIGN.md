# 🎯 لوحة التحكم الاحترافية - Premium Logistics Dashboard

## Enterprise-Grade Logistics ERP Dashboard Design

---

## 📐 1. WIREFRAME - التصميم الهيكلي

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    HEADER                                        │
│  [≡] [Logo SLMS]     [🏢 Company ▼] [🔍 Global Search...    ]    [🌐] [🌙] [🔔5] [👤▼] │
└─────────────────────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────────────────────────┐
│              │                                                                   │
│   SIDEBAR    │  ┌─────────────────────────────────────────────────────────────┐ │
│              │  │  📊 EXECUTIVE OVERVIEW (KPI CARDS)                          │ │
│  [⭐ Fav]    │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │ │
│  [🏠 Home]   │  │  │ 🚚 45   │ │ ⚠️ 3    │ │ 💰 250K │ │ 📋 12   │           │ │
│  [📦 Ship]   │  │  │ Active  │ │ Delayed │ │ Total   │ │ Pending │           │ │
│  [💵 Fin]    │  │  │ Ships.  │ │ Ships.  │ │ Cost    │ │ Approvals│          │ │
│  [📊 Reports]│  │  │ +12% ↑  │ │ -5% ↓   │ │ +8% ↑   │ │ +2 new  │           │ │
│  [⚙️ Settings]│ │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │ │
│              │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │ │
│              │  │  │ 🏗️ 8    │ │ 📜 5    │ │ 🏭 23   │ │ 💳 15   │           │ │
│              │  │  │ Active  │ │ Active  │ │ Supplier│ │ Pending │           │ │
│              │  │  │ Projects│ │ L/Cs    │ │ Orders  │ │ Payments│           │ │
│              │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │ │
│              │  └─────────────────────────────────────────────────────────────┘ │
│              │                                                                   │
│              │  ┌──────────────────────────────┐ ┌────────────────────────────┐ │
│              │  │  🚚 LOGISTICS SNAPSHOT        │ │  💰 FINANCIAL PULSE        │ │
│              │  │  ┌──────────────────────────┐│ │  ┌────────────────────────┐│ │
│              │  │  │   [Shipment Status Pie]  ││ │  │  [Cash Flow Line Chart]││ │
│              │  │  │                          ││ │  │                        ││ │
│              │  │  │   🟢 Delivered: 45%      ││ │  │  ████▓▓▓░░░            ││ │
│              │  │  │   🟡 In Transit: 30%    ││ │  │  Revenue vs Expenses   ││ │
│              │  │  │   🔵 Pending: 15%       ││ │  │                        ││ │
│              │  │  │   🔴 Delayed: 10%       ││ │  │                        ││ │
│              │  │  └──────────────────────────┘│ │  └────────────────────────┘│ │
│              │  │                              │ │                            │ │
│              │  │  📅 Upcoming Arrivals        │ │  💳 Payment Summary        │ │
│              │  │  ├─ SHP-001: Jan 26 (2 days)│ │  │  Due Today:   $45,000  │ │
│              │  │  ├─ SHP-002: Jan 28 (4 days)│ │  │  This Week:   $120,000 │ │
│              │  │  └─ SHP-003: Feb 01 (7 days)│ │  │  Overdue:     $8,500   │ │
│              │  └──────────────────────────────┘ └────────────────────────────┘ │
│              │                                                                   │
│              │  ┌──────────────────────────────┐ ┌────────────────────────────┐ │
│              │  │  📦 PROCUREMENT OVERVIEW      │ │  ⚡ QUICK ACTIONS          │ │
│              │  │                              │ │  ┌──────┐ ┌──────┐        │ │
│              │  │  POs in Progress:       23  │ │  │➕ New │ │➕ New │        │ │
│              │  │  Unpaid Invoices:       15  │ │  │ Ship  │ │ B/L   │        │ │
│              │  │  Top Supplier: ABC Trading  │ │  └──────┘ └──────┘        │ │
│              │  │  Delayed Suppliers:      3  │ │  ┌──────┐ ┌──────┐        │ │
│              │  │                              │ │  │➕ Exp │ │➕ Pay │        │ │
│              │  └──────────────────────────────┘ │  │ ense  │ │ ment  │        │ │
│              │                                   │  └──────┘ └──────┘        │ │
│              │  ┌──────────────────────────────┐ │  ┌──────┐ ┌──────┐        │ │
│              │  │  🏗️ PROJECTS STATUS          │ │  │➕ PO  │ │➕ L/C │        │ │
│              │  │                              │ │  │      │ │      │        │ │
│              │  │  [Project Progress Bars]    │ │  └──────┘ └──────┘        │ │
│              │  │  ████████░░ 80% - Proj A    │ └────────────────────────────┘ │
│              │  │  ██████░░░░ 60% - Proj B    │                               │
│              │  │  ████░░░░░░ 40% - Proj C    │ ┌────────────────────────────┐ │
│              │  └──────────────────────────────┘ │  ⚠️ ALERTS & RISKS         │ │
│              │                                   │  🔴 Customs delay - SHP-05 │ │
│              │  ┌──────────────────────────────┐ │  🟡 Doc expiring - 3 days  │ │
│              │  │  📊 INTERACTIVE REPORTS       │ │  🟡 Budget exceeded - P02 │ │
│              │  │  [📈 Today] [📊 Month] [🔧]  │ │  🟢 All ports operational  │ │
│              │  │  [Export PDF] [Export Excel] │ │                            │ │
│              │  └──────────────────────────────┘ └────────────────────────────┘ │
│              │                                                                   │
└──────────────┴───────────────────────────────────────────────────────────────────┘
                                        FOOTER
                         © 2026 SLMS - All rights reserved
```

---

## 🏗️ 2. COMPONENT ARCHITECTURE

### 📁 File Structure

```
frontend-next/
├── pages/
│   └── dashboard/
│       └── index.tsx                 # Main Dashboard Page (enhanced)
│
├── components/
│   └── dashboard/
│       ├── index.ts                  # Barrel exports
│       │
│       ├── StatCard.tsx              # ✅ EXISTS - Enhanced KPI Card
│       ├── ActivityTimeline.tsx      # ✅ EXISTS - Recent Activity
│       ├── QuickActions.tsx          # ✅ EXISTS - Quick Action Buttons
│       │
│       ├── KPIGrid.tsx               # 🆕 KPI Cards Container (8 cards)
│       ├── LogisticsSnapshot.tsx     # 🆕 Shipment Status Widget
│       ├── FinancialPulse.tsx        # 🆕 Financial Overview Widget
│       ├── ProcurementOverview.tsx   # 🆕 Purchase Orders Widget
│       ├── ProjectsStatus.tsx        # 🆕 Projects Progress Widget
│       ├── AlertsPanel.tsx           # 🆕 Alerts & Risks Widget
│       ├── InteractiveReports.tsx    # 🆕 Reports Shortcuts Widget
│       ├── ShipmentTimeline.tsx      # 🆕 Upcoming Arrivals List
│       ├── PaymentSummary.tsx        # 🆕 Payment Due Summary
│       │
│       └── charts/
│           ├── ShipmentStatusChart.tsx   # 🆕 Pie/Donut Chart
│           ├── CashFlowChart.tsx         # 🆕 Line Chart
│           ├── ExpenseBreakdownChart.tsx # 🆕 Bar Chart
│           └── ProjectProgressBar.tsx    # 🆕 Progress Bars
│
├── hooks/
│   ├── useDashboardData.ts           # 🆕 Unified Dashboard Data Hook
│   └── useDashboardAlerts.ts         # 🆕 Real-time Alerts Hook
│
└── lib/
    └── dashboardService.ts           # ✅ EXISTS - Enhanced API Service
```

---

## 🔌 3. API ENDPOINTS

### Backend Routes: `backend/src/routes/dashboard.ts`

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/dashboard/overview` | GET | Executive KPIs (8 cards) | `dashboard:view` |
| `/api/dashboard/logistics` | GET | Shipment stats & timeline | `dashboard:view` |
| `/api/dashboard/financial` | GET | Cash flow & payments | `dashboard:view` |
| `/api/dashboard/procurement` | GET | PO stats & supplier data | `dashboard:view` |
| `/api/dashboard/projects` | GET | Projects progress | `dashboard:view` |
| `/api/dashboard/alerts` | GET | Active alerts & risks | `dashboard:view` |
| `/api/dashboard/badges` | GET | ✅ EXISTS - Sidebar badges | `dashboard:view` |
| `/api/dashboard/stats` | GET | ✅ EXISTS - Legacy stats | `dashboard:view` |

### API Response Schemas

```typescript
// GET /api/dashboard/overview
interface OverviewResponse {
  kpis: {
    activeShipments: { value: number; change: number; trend: 'up' | 'down' };
    delayedShipments: { value: number; change: number; trend: 'up' | 'down' };
    totalShipmentCost: { value: number; change: number; trend: 'up' | 'down'; currency: string };
    pendingApprovals: { value: number; newCount: number };
    activeProjects: { value: number; change: number };
    activeLettersOfCredit: { value: number; totalValue: number; currency: string };
    supplierOrders: { value: number; pending: number };
    pendingPayments: { value: number; totalAmount: number; currency: string };
  };
  lastUpdated: string;
}

// GET /api/dashboard/logistics
interface LogisticsResponse {
  statusDistribution: {
    delivered: number;
    inTransit: number;
    pending: number;
    delayed: number;
    customs: number;
  };
  upcomingArrivals: {
    id: number;
    shipmentNumber: string;
    expectedDate: string;
    daysRemaining: number;
    port: string;
  }[];
  topPorts: { port: string; count: number }[];
  delayedContainers: number;
}

// GET /api/dashboard/financial
interface FinancialResponse {
  cashFlow: {
    date: string;
    income: number;
    expenses: number;
  }[];
  paymentSummary: {
    dueToday: number;
    dueThisWeek: number;
    overdue: number;
    currency: string;
  };
  expensesByType: { type: string; amount: number }[];
  exchangeRateDiff: number;
  profitByShipment: { shipmentId: number; profit: number }[];
}

// GET /api/dashboard/alerts
interface AlertsResponse {
  alerts: {
    id: number;
    type: 'customs' | 'document' | 'clearance' | 'budget' | 'operational';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    messageAr: string;
    resourceType: string;
    resourceId: number;
    createdAt: string;
  }[];
  systemHealth: 'healthy' | 'warning' | 'critical';
}
```

---

## 🧩 4. COMPONENT SPECIFICATIONS

### 4.1 KPIGrid Component

```tsx
// components/dashboard/KPIGrid.tsx
interface KPICardData {
  key: string;
  titleKey: string;          // i18n key
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType;
  iconBgColor: string;
  iconColor: string;
  change?: number;           // percentage change
  trend?: 'up' | 'down';
  href: string;              // navigation link
  permission?: string;       // required permission to show
}

const KPI_CARDS: KPICardData[] = [
  {
    key: 'activeShipments',
    titleKey: 'dashboard.kpi.activeShipments',
    icon: TruckIcon,
    iconBgColor: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    href: '/shipments',
    permission: 'shipments:view',
  },
  {
    key: 'delayedShipments',
    titleKey: 'dashboard.kpi.delayedShipments',
    icon: ExclamationTriangleIcon,
    iconBgColor: 'bg-red-100 dark:bg-red-900',
    iconColor: 'text-red-600 dark:text-red-400',
    href: '/shipments?status=delayed',
    permission: 'shipments:view',
  },
  // ... 6 more cards
];
```

### 4.2 LogisticsSnapshot Component

```tsx
// components/dashboard/LogisticsSnapshot.tsx
interface LogisticsSnapshotProps {
  statusDistribution: Record<string, number>;
  upcomingArrivals: Arrival[];
  loading?: boolean;
}

// Features:
// - Donut chart for shipment status (using recharts)
// - Timeline list for upcoming arrivals
// - Click-through to shipment details
// - RTL support for Arabic
// - Color coding: 🟢 Delivered, 🟡 In Transit, 🔵 Pending, 🔴 Delayed
```

### 4.3 FinancialPulse Component

```tsx
// components/dashboard/FinancialPulse.tsx
interface FinancialPulseProps {
  cashFlow: CashFlowData[];
  paymentSummary: PaymentSummary;
  loading?: boolean;
}

// Features:
// - Line chart for cash flow (30 days)
// - Payment due cards (Today, This Week, Overdue)
// - Currency formatting based on locale
// - Quick action buttons: Create Payment, Transfer Request
```

### 4.4 AlertsPanel Component

```tsx
// components/dashboard/AlertsPanel.tsx
interface Alert {
  id: number;
  type: 'customs' | 'document' | 'clearance' | 'budget' | 'operational';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  messageAr: string;
  resourceType: string;
  resourceId: number;
}

// Features:
// - Severity color coding: 🔴 Critical, 🟡 Warning, 🟢 Info
// - Click to navigate to related resource
// - Auto-refresh every 60 seconds
// - Expandable for more details
// - Mark as read/dismissed
```

### 4.5 QuickActions Component (Enhanced)

```tsx
// components/dashboard/QuickActions.tsx (ENHANCED)
const QUICK_ACTIONS = [
  { key: 'newShipment', icon: PlusIcon, href: '/shipments/create', permission: 'shipments:create' },
  { key: 'newBillOfLading', icon: DocumentIcon, href: '/shipping-bills/create', permission: 'shipping_bills:create' },
  { key: 'newExpense', icon: CurrencyDollarIcon, href: '/expenses/create', permission: 'shipment_expenses:create' },
  { key: 'newPayment', icon: CreditCardIcon, href: '/finance/payments/create', permission: 'vendor_payments:create' },
  { key: 'newTransfer', icon: ArrowsRightLeftIcon, href: '/finance/transfers/create', permission: 'transfer_requests:create' },
  { key: 'newCustomsDeclaration', icon: DocumentCheckIcon, href: '/customs/declarations/create', permission: 'customs_declarations:create' },
  { key: 'newProject', icon: FolderPlusIcon, href: '/projects/create', permission: 'projects:create' },
  { key: 'newLC', icon: BanknotesIcon, href: '/finance/lc/create', permission: 'letters_of_credit:create' },
];

// Features:
// - Floating action button group
// - Permission-based visibility
// - Hover tooltips
// - Keyboard shortcuts (future)
```

---

## 🌐 5. I18N TRANSLATIONS

### English (`locales/translations.ts` - en)

```typescript
dashboard: {
  title: 'Dashboard',
  welcome: 'Welcome back, {name}',
  lastUpdated: 'Last updated: {time}',
  
  // KPI Cards
  kpi: {
    activeShipments: 'Active Shipments',
    delayedShipments: 'Delayed Shipments',
    totalShipmentCost: 'Total Shipment Cost',
    pendingApprovals: 'Pending Approvals',
    activeProjects: 'Active Projects',
    activeLettersOfCredit: 'Active L/Cs',
    supplierOrders: 'Supplier Orders',
    pendingPayments: 'Pending Payments',
  },
  
  // Widgets
  logistics: {
    title: 'Logistics Snapshot',
    shipmentStatus: 'Shipment Status',
    upcomingArrivals: 'Upcoming Arrivals',
    daysRemaining: '{days} days',
    delivered: 'Delivered',
    inTransit: 'In Transit',
    pending: 'Pending',
    delayed: 'Delayed',
    customs: 'At Customs',
    topPorts: 'Most Used Ports',
    delayedContainers: 'Delayed Containers',
  },
  
  financial: {
    title: 'Financial Pulse',
    cashFlow: 'Cash Flow',
    paymentSummary: 'Payment Summary',
    dueToday: 'Due Today',
    dueThisWeek: 'Due This Week',
    overdue: 'Overdue',
    expensesByType: 'Expenses by Type',
    exchangeRateDiff: 'Exchange Rate Difference',
  },
  
  procurement: {
    title: 'Procurement Overview',
    posInProgress: 'POs in Progress',
    unpaidInvoices: 'Unpaid Invoices',
    topSupplier: 'Top Supplier',
    delayedSuppliers: 'Delayed Suppliers',
  },
  
  projects: {
    title: 'Projects Status',
    progress: 'Progress',
    linkedShipments: 'Linked Shipments',
    totalCost: 'Total Cost',
  },
  
  alerts: {
    title: 'Alerts & Risks',
    customs: 'Customs Alert',
    document: 'Document Expiring',
    clearance: 'Clearance Delay',
    budget: 'Budget Exceeded',
    operational: 'Operational Risk',
    systemHealth: 'System Health',
    healthy: 'All Systems Operational',
    warning: 'Some Issues Detected',
    critical: 'Critical Issues',
  },
  
  quickActions: {
    title: 'Quick Actions',
    newShipment: 'New Shipment',
    newBillOfLading: 'New Bill of Lading',
    newExpense: 'New Expense',
    newPayment: 'New Payment',
    newTransfer: 'Transfer Request',
    newCustomsDeclaration: 'Customs Declaration',
    newProject: 'New Project',
    newLC: 'New Letter of Credit',
  },
  
  reports: {
    title: 'Reports',
    today: 'Today',
    thisMonth: 'This Month',
    custom: 'Custom',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
  },
}
```

### Arabic (`locales/translations.ts` - ar)

```typescript
dashboard: {
  title: 'لوحة التحكم',
  welcome: 'مرحباً بعودتك، {name}',
  lastUpdated: 'آخر تحديث: {time}',
  
  // KPI Cards
  kpi: {
    activeShipments: 'الشحنات النشطة',
    delayedShipments: 'الشحنات المتأخرة',
    totalShipmentCost: 'إجمالي تكلفة الشحنات',
    pendingApprovals: 'الموافقات المعلقة',
    activeProjects: 'المشاريع النشطة',
    activeLettersOfCredit: 'الاعتمادات المستندية',
    supplierOrders: 'طلبات الموردين',
    pendingPayments: 'المدفوعات المعلقة',
  },
  
  // Widgets
  logistics: {
    title: 'لمحة اللوجستيات',
    shipmentStatus: 'حالة الشحنات',
    upcomingArrivals: 'الوصول المتوقع',
    daysRemaining: '{days} أيام',
    delivered: 'تم التسليم',
    inTransit: 'في الطريق',
    pending: 'قيد الانتظار',
    delayed: 'متأخر',
    customs: 'في الجمارك',
    topPorts: 'الموانئ الأكثر استخداماً',
    delayedContainers: 'الحاويات المتأخرة',
  },
  
  financial: {
    title: 'النبض المالي',
    cashFlow: 'التدفق النقدي',
    paymentSummary: 'ملخص المدفوعات',
    dueToday: 'مستحقة اليوم',
    dueThisWeek: 'مستحقة هذا الأسبوع',
    overdue: 'متأخرة',
    expensesByType: 'المصروفات حسب النوع',
    exchangeRateDiff: 'فرق سعر الصرف',
  },
  
  procurement: {
    title: 'نظرة على المشتريات',
    posInProgress: 'أوامر الشراء قيد التنفيذ',
    unpaidInvoices: 'الفواتير غير المسددة',
    topSupplier: 'أفضل مورد',
    delayedSuppliers: 'الموردين المتأخرين',
  },
  
  projects: {
    title: 'حالة المشاريع',
    progress: 'التقدم',
    linkedShipments: 'الشحنات المرتبطة',
    totalCost: 'التكلفة الإجمالية',
  },
  
  alerts: {
    title: 'التنبيهات والمخاطر',
    customs: 'تنبيه جمركي',
    document: 'وثيقة ستنتهي',
    clearance: 'تأخير تخليص',
    budget: 'تجاوز الميزانية',
    operational: 'مخاطر تشغيلية',
    systemHealth: 'صحة النظام',
    healthy: 'جميع الأنظمة تعمل',
    warning: 'بعض المشاكل المكتشفة',
    critical: 'مشاكل حرجة',
  },
  
  quickActions: {
    title: 'الإجراءات السريعة',
    newShipment: 'شحنة جديدة',
    newBillOfLading: 'بوليصة شحن جديدة',
    newExpense: 'مصروف جديد',
    newPayment: 'دفعة جديدة',
    newTransfer: 'طلب تحويل',
    newCustomsDeclaration: 'بيان جمركي',
    newProject: 'مشروع جديد',
    newLC: 'اعتماد مستندي جديد',
  },
  
  reports: {
    title: 'التقارير',
    today: 'اليوم',
    thisMonth: 'هذا الشهر',
    custom: 'مخصص',
    exportPdf: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
  },
}
```

---

## 🔐 6. PERMISSIONS INTEGRATION

### Permission Mapping

```typescript
// config/dashboardPermissions.ts
export const DASHBOARD_PERMISSIONS = {
  // KPI Cards
  'kpi.activeShipments': 'shipments:view',
  'kpi.delayedShipments': 'shipments:view',
  'kpi.totalShipmentCost': 'shipment_expenses:view',
  'kpi.pendingApprovals': 'approvals:view',
  'kpi.activeProjects': 'projects:view',
  'kpi.activeLettersOfCredit': 'letters_of_credit:view',
  'kpi.supplierOrders': 'purchase_orders:view',
  'kpi.pendingPayments': 'vendor_payments:view',
  
  // Widgets
  'widget.logistics': 'shipments:view',
  'widget.financial': 'finance:view',
  'widget.procurement': 'purchase_orders:view',
  'widget.projects': 'projects:view',
  'widget.alerts': 'dashboard:view',
  
  // Quick Actions
  'action.newShipment': 'shipments:create',
  'action.newBillOfLading': 'shipping_bills:create',
  'action.newExpense': 'shipment_expenses:create',
  'action.newPayment': 'vendor_payments:create',
  'action.newTransfer': 'transfer_requests:create',
  'action.newCustomsDeclaration': 'customs_declarations:create',
  'action.newProject': 'projects:create',
  'action.newLC': 'letters_of_credit:create',
};
```

### Usage in Components

```tsx
// Example: Permission-aware KPI rendering
const { hasPermission } = usePermissions();

const visibleKPIs = KPI_CARDS.filter(kpi => 
  !kpi.permission || hasPermission(kpi.permission)
);

return (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {visibleKPIs.map(kpi => (
      <StatCard key={kpi.key} {...kpi} />
    ))}
  </div>
);
```

---

## 🎨 7. UI/UX SPECIFICATIONS

### Color Palette

```css
/* Primary Logistics Theme */
--primary-50: #eff6ff;
--primary-500: #3b82f6;  /* Main Blue */
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Status Colors */
--success: #10b981;      /* Green - Delivered */
--warning: #f59e0b;      /* Yellow - In Transit */
--danger: #ef4444;       /* Red - Delayed */
--info: #3b82f6;         /* Blue - Pending */
--purple: #8b5cf6;       /* Purple - Customs */

/* Alert Severity */
--critical: #dc2626;     /* 🔴 Critical */
--warning-alert: #f59e0b; /* 🟡 Warning */
--info-alert: #22c55e;   /* 🟢 Info */
```

### Responsive Breakpoints

```css
/* Mobile First */
sm: 640px   /* 2 columns KPI */
md: 768px   /* 2 columns widgets */
lg: 1024px  /* 4 columns KPI, 2 columns widgets */
xl: 1280px  /* Full layout */
2xl: 1536px /* Extra spacing */
```

### Animation Specifications

```css
/* Micro-interactions */
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-out;
}

.kpi-value {
  animation: countUp 0.5s ease-out;
}

.alert-pulse {
  animation: pulse 2s infinite;
}

/* Skeleton Loading */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 📊 8. CHARTING LIBRARY

### Recommended: Recharts

```bash
npm install recharts
```

### Chart Components

```tsx
// Shipment Status Pie Chart
<ResponsiveContainer width="100%" height={200}>
  <PieChart>
    <Pie
      data={statusData}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={40}
      outerRadius={80}
    >
      {statusData.map((entry, index) => (
        <Cell key={index} fill={COLORS[entry.status]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>

// Cash Flow Line Chart
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={cashFlowData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="income" stroke="#10b981" />
    <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
  </LineChart>
</ResponsiveContainer>
```

---

## 🚀 9. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- [ ] Extend dashboard API endpoints
- [ ] Create KPIGrid component with 8 cards
- [ ] Add i18n translations (EN/AR)
- [ ] Permission-based visibility

### Phase 2: Widgets (Week 2)
- [ ] LogisticsSnapshot (status chart + arrivals)
- [ ] FinancialPulse (cash flow + payments)
- [ ] AlertsPanel (real-time alerts)
- [ ] Enhanced QuickActions

### Phase 3: Advanced (Week 3)
- [ ] ProcurementOverview widget
- [ ] ProjectsStatus widget
- [ ] Interactive charts (Recharts)
- [ ] Drill-down navigation

### Phase 4: Polish (Week 4)
- [ ] Dark mode refinements
- [ ] RTL layout fixes
- [ ] Performance optimization (caching)
- [ ] WebSocket for real-time updates
- [ ] User layout preferences (drag & drop)

---

## ✅ 10. ACCEPTANCE CRITERIA

1. ✅ All 8 KPI cards display accurate data
2. ✅ Charts render correctly in both themes
3. ✅ Arabic translations complete and RTL layout works
4. ✅ Permission-based hiding works (no 403 errors)
5. ✅ Page loads in < 2 seconds
6. ✅ Responsive on mobile/tablet/desktop
7. ✅ Quick actions navigate correctly
8. ✅ Alerts show with correct severity colors
9. ✅ Data refreshes without full page reload
10. ✅ Export to PDF/Excel works
