# §16 — خارطة التطوير التدريجي | Development Roadmap

> آخر تحديث: 2026-03-01 | Last Updated: 2026-03-01

---

## 📊 ملخص التقدم | Progress Summary

| المقياس | القيمة |
|---------|--------|
| **إجمالي المراحل** | 10 |
| **إجمالي الشاشات** | 35 (§16.2 core) + 165 (master data) |
| **مكتملة بالكامل (COMPLETE)** | 27 |
| **وظيفية (FUNCTIONAL)** | 4 |
| **هيكلية (STUB)** | 4 |
| **لم تبدأ (NOT_STARTED)** | 0 |
| **التقدم الإجمالي** | **~89%** |

---

## §16.1 المراحل بالأولوية | Phases by Priority

### 🔴 المرحلة 1 — الأساس | Foundation ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 1-2 | حرج (Critical) | تسجيل الدخول + JWT + عزل البيانات + إدارة المستأجرين |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| تسجيل الدخول | `/login` | ✅ COMPLETE | Multi-stage: Company → Creds → MFA |
| لوحة تحكم المنصة | `/admin/dashboard` | 🟡 FUNCTIONAL | Real data, needs chart library |
| إدارة المستأجرين | `/admin/tenants` | ✅ COMPLETE | Full CRUD + impersonation |
| لوحة التحكم (عميل) | `/dashboard` | ✅ COMPLETE | 10+ KPIs, charts, alerts |

**Backend APIs:** `/api/auth/*`, `/api/tenants`, `/api/dashboard/*`, `/api/admin/platform/*`

---

### 🔴 المرحلة 2 — العمليات | Operations ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 3-4 | حرج (Critical) | لوحة التحكم + الشحنات + أوامر الشراء + تتبع الشحنات |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| قائمة الشحنات | `/shipments` | ✅ COMPLETE | Pagination, filters, status colors |
| إنشاء شحنة | `/shipments/create` | ✅ COMPLETE | Multi-step wizard, PO auto-fill (1074 lines) |
| تفاصيل شحنة | `/shipments/[id]` | ✅ COMPLETE | Items/costs/bills/containers tabs (2156 lines) |
| تتبع الشحنات | `/shipments/tracking` | ✅ COMPLETE | Search by number/BL/container, timeline |
| أوامر الشراء | `/procurement/purchase-orders` | ✅ COMPLETE | Filters, approval workflows |
| إنشاء أمر شراء | `/procurement/purchase-orders/new` | 🟡 FUNCTIONAL | Delegates to 764-line component |

**Backend APIs:** `/api/shipments/*`, `/api/procurement/purchase-orders/*`, `/api/shipment-events`

---

### 🟠 المرحلة 3 — الجمارك | Customs ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 5 | عالي (High) | البيانات الجمركية + رموز HS + حساب الرسوم |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| البيانات الجمركية | `/customs/declarations` | ✅ COMPLETE | Enterprise-grade, 1519 lines |
| حساب الرسوم | `/customs/duty-calculation` | ✅ COMPLETE | HS picker, API calculation, history |

**Backend APIs:** `/api/customs-declarations`, `/api/customs-duty-calculation`, `/api/customs-tariffs`

---

### 🟠 المرحلة 4 — المالية | Finance ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 6-7 | عالي (High) | القيود + شجرة الحسابات + المدفوعات + خطابات الاعتماد |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| القيود اليومية | `/accounting/journals` | ✅ COMPLETE | Search, filters, post/cancel/delete |
| شجرة الحسابات | `/master/chart-of-accounts` | ✅ COMPLETE | Tree view, CRUD, seeding (937 lines) |
| المدفوعات | `/procurement/payments` | ✅ COMPLETE | Vendor/status/date filters |
| خطابات الاعتماد | `/finance/letters-of-credit` | ✅ COMPLETE | Dashboard KPIs, CRUD (1021 lines) |

**Backend APIs:** `/api/accounting/journal-entries`, `/api/accounts`, `/api/procurement/payments`, `/api/letters-of-credit`

---

### 🟡 المرحلة 5 — المستودعات | Warehouses 🔄 75%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 8 | متوسط (Medium) | الاستلام + المخزون + التحويلات + الجرد |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| استلام البضاعة | `/inventory/shipment-receiving` | 🟡 FUNCTIONAL | Quality checks, sample data fallback |
| إدارة المخزون | `/inventory` | ✅ COMPLETE | Stock movements |
| تحويلات المخزون | `/inventory/transfers` | ✅ COMPLETE | Transfer workflow |
| الجرد | `/inventory/stocktaking` | ⬜ Needs verification | — |

**Backend APIs:** `/api/inventory/*`, `/api/warehouses`

---

### 🟡 المرحلة 6 — التقارير | Reports ✅ 95%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 9 | متوسط (Medium) | ميزان المراجعة + ميزانية عمومية + قائمة دخل + KPIs |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| ميزان المراجعة | `/accounting/reports/trial-balance` | ✅ COMPLETE | Filters, Excel export, hierarchy |
| الميزانية العمومية | `/accounting/reports/balance-sheet` | ✅ COMPLETE | A=L+E check, hierarchical |
| مؤشرات الأداء | `/dashboard/kpis` | 🟡 FUNCTIONAL | Real data, hardcoded trends |

**Backend APIs:** `/api/reports/trial-balance`, `/api/reports/balance-sheet`, dashboard endpoints

---

### 🟢 المرحلة 7 — المبيعات/CRM | Sales/CRM ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 10 | عادي (Normal) | فواتير المبيعات + عروض الأسعار + إدارة العملاء |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| فواتير المبيعات | `/sales/invoices` | ✅ COMPLETE | Full CRUD |
| عروض الأسعار | `/sales/quotations` | ✅ COMPLETE | Full CRUD |
| إدارة العملاء | `/crm/customers` | ✅ COMPLETE | Full CRUD |

**Backend APIs:** `/api/sales/invoices`, `/api/sales/quotations`, `/api/sales/customers`

---

### 🟢 المرحلة 8 — الموارد البشرية/الأصول | HR/Assets 🔄 60%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 11 | عادي (Normal) | الموظفون + الرواتب + الأصول + الإهلاك |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| الموظفون | `/hr/employees` | ✅ COMPLETE | Full CRUD |
| الرواتب | `/hr/payroll` | ⬜ STUB | Needs payroll processing |
| الأصول الثابتة | `/assets` | ✅ COMPLETE | Full CRUD |
| الإهلاك | `/assets/depreciation` | ⬜ STUB | Needs schedule + auto-journal |

**Backend APIs:** `/api/hr/*`, `/api/assets`

---

### 🟢 المرحلة 9 — البيانات الأساسية | Master Data ✅ 100%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 12-13 | عادي (Normal) | 130+ شاشة قاموس البيانات |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| البيانات الأساسية | `/master/*` | ✅ COMPLETE | ~165 pages, `useMasterData` hook |
| الأدوار والصلاحيات | `/admin/roles` | ✅ COMPLETE | Templates, clone, tenant-aware |
| سجلات التدقيق | `/admin/audit-logs` | ✅ COMPLETE | Filters, CSV export |
| إعدادات النظام | `/settings` | ✅ COMPLETE | Company info, 2FA, timezone |

**Backend APIs:** `/api/master/*`, `/api/roles`, `/api/audit-logs`, `/api/settings`

---

### 🔵 المرحلة 10 — التكاملات | Integrations 🔄 30%

| الأسبوع | الأولوية | المكونات |
|---------|----------|----------|
| 14-15 | إضافي (Optional) | ZATCA + البنوك + بوابات الدفع + شركات الشحن |

| الشاشة | URL | الحالة | ملاحظات |
|--------|-----|--------|---------|
| تكامل ZATCA | `/integrations/zatca` | ⬜ STUB | Needs ZATCA SDK |
| تكامل البنوك | `/integrations/banks` | ⬜ STUB | File import/export |
| بوابات الدفع | `/integrations/payments` | ⬜ STUB | Moyasar, Tap, etc. |
| شركات الشحن | `/integrations/carriers` | ⬜ STUB | Maersk, MSC APIs |

**Backend APIs:** Pending

---

## §16.2 القائمة التفصيلية للشاشات | Detailed Screen Index

| # | الشاشة | URL | الأولوية | الحالة | الشاشات المرتبطة |
|---|--------|-----|----------|--------|------------------|
| 1 | تسجيل الدخول | `/login` | P0 | ✅ | JWT + tenants |
| 2 | لوحة تحكم المنصة | `/admin/dashboard` | P0 | 🟡 | tenants + audit |
| 3 | إدارة المستأجرين | `/admin/tenants` | P0 | ✅ | tenant_users + plans |
| 4 | لوحة التحكم (عميل) | `/dashboard` | P0 | ✅ | shipments + finance |
| 5 | قائمة الشحنات | `/shipments` | P1 | ✅ | ports + shipping_co + customs |
| 6 | إنشاء شحنة | `/shipments/create` | P1 | ✅ | purchase_orders + items |
| 7 | تفاصيل شحنة | `/shipments/[id]` | P1 | ✅ | tracking + documents + costs |
| 8 | تتبع الشحنات | `/shipments/tracking` | P1 | ✅ | shipment_stages |
| 9 | أوامر الشراء | `/procurement/purchase-orders` | P1 | ✅ | vendors + items + workflows |
| 10 | إنشاء أمر شراء | `/procurement/purchase-orders/new` | P1 | 🟡 | items + currencies + vendors |
| 11 | البيانات الجمركية | `/customs/declarations` | P2 | ✅ | hs_codes + tariffs + shipments |
| 12 | حساب الرسوم | `/customs/duty-calculation` | P2 | ✅ | hs_codes + tariff_rates |
| 13 | القيود اليومية | `/accounting/journals` | P2 | ✅ | chart_of_accounts |
| 14 | شجرة الحسابات | `/master/chart-of-accounts` | P2 | ✅ | journal_lines |
| 15 | المدفوعات | `/procurement/payments` | P2 | ✅ | vendors + bank_accounts |
| 16 | خطابات الاعتماد | `/finance/letters-of-credit` | P3 | ✅ | banks + shipments |
| 17 | استلام البضاعة | `/inventory/shipment-receiving` | P3 | 🟡 | warehouses + shipments |
| 18 | ميزان المراجعة | `/accounting/reports/trial-balance` | P3 | ✅ | chart_of_accounts |
| 19 | الميزانية العمومية | `/accounting/reports/balance-sheet` | P3 | ✅ | journal_lines |
| 20 | مؤشرات الأداء | `/dashboard/kpis` | P3 | 🟡 | all |
| 21 | الأدوار والصلاحيات | `/admin/roles` | P1 | ✅ | tenant_users |
| 22 | سجلات التدقيق | `/admin/audit-logs` | P1 | ✅ | all |
| 23 | إعدادات النظام | `/settings` | P2 | ✅ | tenants |
| 24 | البيانات الأساسية | `/master/*` | P4 | ✅ | all (~165 pages) |

---

## 🔑 Legend

| الرمز | المعنى |
|-------|--------|
| ✅ | مكتملة بالكامل (COMPLETE) — API + validation + error handling |
| 🟡 | وظيفية (FUNCTIONAL) — working but missing minor features |
| ⬜ | هيكلية (STUB) — page exists, needs implementation |
| 🔴 | لم تبدأ (NOT_STARTED) — no page file |

---

## 📈 Phase Completion Chart

```
Phase 1  (Foundation)   ████████████████████ 100%  🔴 Critical
Phase 2  (Operations)   ████████████████████ 100%  🔴 Critical
Phase 3  (Customs)      ████████████████████ 100%  🟠 High
Phase 4  (Finance)      ████████████████████ 100%  🟠 High
Phase 5  (Warehouses)   ███████████████░░░░░  75%  🟡 Medium
Phase 6  (Reports)      ███████████████████░  95%  🟡 Medium
Phase 7  (Sales/CRM)    ████████████████████ 100%  🟢 Normal
Phase 8  (HR/Assets)    ████████████░░░░░░░░  60%  🟢 Normal
Phase 9  (Master Data)  ████████████████████ 100%  🟢 Normal
Phase 10 (Integrations) ██████░░░░░░░░░░░░░░  30%  🔵 Optional
```

---

## 🎯 Remaining Work (Priority Order)

### High Priority (FUNCTIONAL → COMPLETE)
1. **Admin Dashboard** (`/admin/dashboard`) — Add Recharts chart rendering
2. **PO Creation** (`/procurement/purchase-orders/new`) — Strengthen form validation
3. **Shipment Receiving** (`/inventory/shipment-receiving`) — Remove sample data fallback, ensure API stability
4. **KPI Dashboard** (`/dashboard/kpis`) — Dynamic trend calculation, date filtering

### Medium Priority (STUB → FUNCTIONAL)
5. **Payroll** (`/hr/payroll`) — Full payroll processing workflow
6. **Depreciation** (`/assets/depreciation`) — Schedule generation, auto-journal creation

### Low Priority (Phase 10 — Integrations)
7. **ZATCA** (`/integrations/zatca`) — Saudi e-invoicing SDK
8. **Bank Integration** (`/integrations/banks`) — Statement import/export
9. **Payment Gateways** (`/integrations/payments`) — Moyasar, Tap integration
10. **Shipping Carriers** (`/integrations/carriers`) — Maersk, MSC API tracking

---

## 🛠️ Technical Notes

### Navigation Structure
All §16.2 URLs are registered in:
- **Pages**: `frontend-next/pages/` (511 files)
- **Sidebar**: `frontend-next/config/menu.registry.ts` (3573 lines, 13 top-level sections)
- **Backend**: `backend/src/app.ts` (200+ route registrations)

### Programmatic Access
```typescript
import { DEVELOPMENT_ROADMAP, getRoadmapSummary, getIncompleteScreens } from '@/config/roadmap';

const summary = getRoadmapSummary();
console.log(`Progress: ${summary.overallProgress}%`);
console.log(`Incomplete: ${getIncompleteScreens().length} screens`);
```

### Related Specifications
- §14 — API Structure (v1 versioning, rate limiting, pagination)
- §15 — Core Database Structure (12 tables, tenant isolation)
- Backend routes: `backend/src/routes/` (~230 files)
- Menu config: `frontend-next/config/menu.registry.ts`
