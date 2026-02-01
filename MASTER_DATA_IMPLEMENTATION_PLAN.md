# MASTER DATA IMPLEMENTATION PLAN (A-Z)
## Smart Logistics Management System (SLMS)

**Status**: Planning Phase
**Date**: December 27, 2025
**Scope**: 100+ Master Data Entities across 10 Categories
**Priority**: HIGH - Foundation for entire ERP system

---

## 📊 EXECUTIVE SUMMARY

This document outlines the complete master data implementation roadmap for SLMS. It covers:
- **100+ entities** across 10 categories
- **Full RBAC integration** with 500+ permission codes
- **Complete i18n** (English + Arabic RTL)
- **Production-ready** implementation with security, validation, and audit trails

### Current Status
✅ **15 Pages Completed** (Phase 1 partial):
- Printed Templates, Digital Signatures, UI Themes (System Setup)
- Regions, Border Points, Time Zones, Address Types, Contact Methods (Reference)
- Ports, Customs Offices, Payment Terms (Reference)
- Customer Groups (Customers)
- Countries, Cities, Currencies (Reference - existing)

❌ **~85 Pages Remaining** across all phases

---

## 🎯 EXECUTION STRATEGY

### Sequential Implementation (10 Phases)

#### **PHASE 1: System & Settings (11 pages)** - Priority: CRITICAL
Foundation layer. Must complete before other phases.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Companies | ⏳ In Progress | `/api/master/companies` | companies:* | Multi-tenant core |
| Branches | ⏳ In Progress | `/api/master/branches` | branches:* | Location-based |
| Users | ⏳ In Progress | `/api/master/users` | users:* | Employee users |
| Roles & Permissions | ⏳ In Progress | `/api/master/roles` | roles:* | RBAC system |
| System Setup | 📅 Pending | `/api/master/system-setup` | system:* | Configuration |
| Numbering Series | 📅 Pending | `/api/master/numbering-series` | numbering:* | Auto-numbering |
| Languages | 📅 Pending | `/api/master/languages` | languages:* | i18n support |
| Default UI Theme | ✅ Completed | `/api/master/ui-themes` | themes:* | Already done |
| Backup & Security | 📅 Pending | `/api/master/backup-settings` | backup:* | System security |
| System Policies | 📅 Pending | `/api/master/policies` | policies:* | Global policies |
| Printed Templates | ✅ Completed | `/api/master/printed-templates` | templates:* | Already done |

**Blocking Dependencies**: None (independent)
**Required by**: All other phases
**Estimated Timeline**: 3-4 days

---

#### **PHASE 2: Reference Data (12 pages)** - Priority: HIGH
Core lookup data. Required for most transactions.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Countries | ✅ Completed | `/api/master/countries` | countries:* | Already done |
| Cities | ✅ Completed | `/api/master/cities` | cities:* | Already done |
| Regions / Zones | ✅ Completed | `/api/master/regions` | regions:* | Already done |
| Ports & Airports | ✅ Completed | `/api/master/ports` | ports:* | Already done |
| Border Points | ✅ Completed | `/api/master/border-points` | border_points:* | Already done |
| Customs Offices | ✅ Completed | `/api/master/customs-offices` | customs_offices:* | Already done |
| Currencies | ✅ Completed | `/api/master/currencies` | currencies:* | Already done |
| Exchange Rates | 📅 Pending | `/api/master/exchange-rates` | exchange_rates:* | Daily updates |
| Time Zones | ✅ Completed | `/api/master/time-zones` | time_zones:* | Already done |
| Address Types | ✅ Completed | `/api/master/address-types` | address_types:* | Already done |
| Contact Methods | ✅ Completed | `/api/master/contact-methods` | contact_methods:* | Already done |
| Digital Signatures | ✅ Completed | `/api/master/digital-signatures` | signatures:* | Already done |

**Blocking Dependencies**: PHASE 1 (companies, system setup)
**Required by**: PHASE 3, 4, 5, 6
**Estimated Timeline**: 1-2 days

---

#### **PHASE 3: Items & Inventory (14 pages)** - Priority: HIGH
Inventory management system core.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Items / Products | 📅 Pending | `/api/master/items` | items:* | Core product data |
| Item Types | 📅 Pending | `/api/master/item-types` | item_types:* | Classification |
| Item Groups | 📅 Pending | `/api/master/item-groups` | item_groups:* | Grouping |
| Categories / Grades | 📅 Pending | `/api/master/item-categories` | item_categories:* | Quality grades |
| Units of Measure | 📅 Pending | `/api/master/units-of-measure` | uom:* | Qty units |
| Warehouses | 📅 Pending | `/api/master/warehouses` | warehouses:* | Storage locations |
| Warehouse Types | 📅 Pending | `/api/master/warehouse-types` | warehouse_types:* | Classification |
| Bin / Shelf / Zone | 📅 Pending | `/api/master/storage-locations` | storage_locations:* | Fine locations |
| Batch Numbers | 📅 Pending | `/api/master/batch-numbers` | batches:* | Traceability |
| Serial Numbers | 📅 Pending | `/api/master/serial-numbers` | serials:* | Individual tracking |
| Min / Max Stock | 📅 Pending | `/api/master/stock-levels` | stock_levels:* | Reorder points |
| Inventory Policies | 📅 Pending | `/api/master/inventory-policies` | inv_policies:* | Business rules |
| Valuation Methods | 📅 Pending | `/api/master/valuation-methods` | valuation:* | FIFO/LIFO/WAC |
| Reorder Rules | 📅 Pending | `/api/master/reorder-rules` | reorder:* | Auto-purchasing |

**Blocking Dependencies**: PHASE 1, PHASE 2 (countries, units, warehouses)
**Required by**: Inventory transactions, Purchasing, Sales
**Estimated Timeline**: 5-7 days

---

#### **PHASE 4: Customers & Suppliers (14 pages)** - Priority: HIGH
Party master data.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Customers | 📅 Pending | `/api/master/customers` | customers:* | Core customer data |
| Customer Categories | 📅 Pending | `/api/master/customer-categories` | customer_categories:* | Segmentation |
| Customer Types | 📅 Pending | `/api/master/customer-types` | customer_types:* | Retail/Wholesale |
| Customer Status | 📅 Pending | `/api/master/customer-status` | customer_status:* | Active/Inactive |
| Suppliers | 📅 Pending | `/api/master/suppliers` | suppliers:* | Core supplier data |
| Supplier Categories | 📅 Pending | `/api/master/supplier-categories` | supplier_categories:* | Segmentation |
| Supplier Types | 📅 Pending | `/api/master/supplier-types` | supplier_types:* | Manufacturing/Trading |
| Supplier Status | 📅 Pending | `/api/master/supplier-status` | supplier_status:* | Active/Inactive |
| Customer Groups | ✅ Completed | `/api/master/customer-groups` | customer_groups:* | Already done |
| Payment Terms | ✅ Completed | `/api/master/payment-terms` | payment_terms:* | Already done |
| Payment Methods | 📅 Pending | `/api/master/payment-methods` | payment_methods:* | Cash/Check/Wire |
| Delivery Terms | 📅 Pending | `/api/master/delivery-terms` | delivery_terms:* | Incoterms |
| Discount Agreements | 📅 Pending | `/api/master/discount-agreements` | discounts:* | Volume discounts |
| Credit Limits | 📅 Pending | `/api/master/credit-limits` | credit_limits:* | AR/AP controls |

**Blocking Dependencies**: PHASE 1, PHASE 2 (countries, cities)
**Required by**: Sales, Purchasing, AR/AP
**Estimated Timeline**: 4-5 days

---

#### **PHASE 5: Accounting & Finance (14 pages)** - Priority: CRITICAL
Core financial system.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Chart of Accounts | 📅 Pending | `/api/master/chart-of-accounts` | coa:* | GL structure |
| Default Accounts | 📅 Pending | `/api/master/default-accounts` | default_accounts:* | Auto-posting |
| Cost Centers | 📅 Pending | `/api/master/cost-centers` | cost_centers:* | Profit analysis |
| Profit Centers | 📅 Pending | `/api/master/profit-centers` | profit_centers:* | Business units |
| Fiscal Periods | 📅 Pending | `/api/master/fiscal-periods` | fiscal_periods:* | Accounting periods |
| Cheque Books | 📅 Pending | `/api/master/cheque-books` | cheque_books:* | Check control |
| Voucher Types | 📅 Pending | `/api/master/voucher-types` | voucher_types:* | JE/PV/CV/CV types |
| Debit Notes | 📅 Pending | `/api/master/debit-notes` | debit_notes:* | Purchase returns |
| Credit Notes | 📅 Pending | `/api/master/credit-notes` | credit_notes:* | Sales returns |
| Journal Types | 📅 Pending | `/api/master/journal-types` | journal_types:* | JE/PJ/CV types |
| Parallel Currencies | 📅 Pending | `/api/master/parallel-currencies` | parallel_currencies:* | Multi-currency |
| Accrual Policies | 📅 Pending | `/api/master/accrual-policies` | accruals:* | Revenue recognition |
| Bank Reconciliation | 📅 Pending | `/api/master/bank-reconciliation` | bank_recon:* | Bank matching |
| Expense Allocation | 📅 Pending | `/api/master/expense-allocation` | expense_allocation:* | Cost distribution |

**Blocking Dependencies**: PHASE 1, PHASE 2 (currencies), PHASE 4 (suppliers/customers)
**Required by**: GL, AR, AP, Bank, Treasury
**Estimated Timeline**: 6-8 days

---

#### **PHASE 6: Logistics & Import (17 pages)** - Priority: HIGH
Shipping and customs.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Shipping Lines | 📅 Pending | `/api/master/shipping-lines` | shipping_lines:* | Carriers |
| Shipping Categories | 📅 Pending | `/api/master/shipping-categories` | shipping_categories:* | Classification |
| Forwarders | 📅 Pending | `/api/master/forwarders` | forwarders:* | Freight forwarders |
| Container Types | 📅 Pending | `/api/master/container-types` | container_types:* | 20ft/40ft/Other |
| HS Codes | 📅 Pending | `/api/master/hs-codes` | hs_codes:* | Tariff codes |
| Tariffs | 📅 Pending | `/api/master/tariffs` | tariffs:* | Duty rates |
| Clearing Agents | 📅 Pending | `/api/master/clearing-agents` | clearing_agents:* | Customs brokers |
| Clearance Status | 📅 Pending | `/api/master/clearance-status` | clearance_status:* | Workflow statuses |
| BL Types | 📅 Pending | `/api/master/bl-types` | bl_types:* | Master/House BL |
| Incoterms | 📅 Pending | `/api/master/incoterms` | incoterms:* | Trade terms |
| Shipping Methods | 📅 Pending | `/api/master/shipping-methods` | shipping_methods:* | Air/Sea/Land |
| Insurance Types | 📅 Pending | `/api/master/insurance-types` | insurance_types:* | Coverage types |
| Insurance Companies | 📅 Pending | `/api/master/insurance-companies` | insurance_companies:* | Providers |
| Arrival Points | 📅 Pending | `/api/master/arrival-points` | arrival_points:* | Destinations |
| Departure Points | 📅 Pending | `/api/master/departure-points` | departure_points:* | Origins |
| Shipping Schedules | 📅 Pending | `/api/master/shipping-schedules` | schedules:* | Route schedules |
| Shipment Status | 📅 Pending | `/api/master/shipment-status` | shipment_status:* | Workflow |
| Shipment Types | 📅 Pending | `/api/master/shipment-types` | shipment_types:* | Air/Sea/Land |

**Blocking Dependencies**: PHASE 1, PHASE 2 (countries, ports), PHASE 4 (customers, suppliers)
**Required by**: Shipment management, Customs clearing
**Estimated Timeline**: 7-9 days

---

#### **PHASE 7: Tax & Zakat (7 pages)** - Priority: HIGH
Compliance & regulatory.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Tax Types | 📅 Pending | `/api/master/tax-types` | tax_types:* | VAT/GST/Other |
| Tax Rates | 📅 Pending | `/api/master/tax-rates` | tax_rates:* | 5%/15%/etc |
| Tax Codes | 📅 Pending | `/api/master/tax-codes` | tax_codes:* | GL mapping |
| Tax Item Categories | 📅 Pending | `/api/master/tax-item-categories` | tax_categories:* | Taxable items |
| Tax Zones | 📅 Pending | `/api/master/tax-zones` | tax_zones:* | Regional taxes |
| Tax Exemptions | 📅 Pending | `/api/master/tax-exemptions` | tax_exemptions:* | Exempt items |
| Zakat Codes | 📅 Pending | `/api/master/zakat-codes` | zakat_codes:* | Zakat categories |

**Blocking Dependencies**: PHASE 1, PHASE 2 (countries), PHASE 5 (chart of accounts)
**Required by**: Sales, Purchasing, Tax reporting
**Estimated Timeline**: 2-3 days

---

#### **PHASE 8: HR (10 pages)** - Priority: MEDIUM
Human resources management.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Employees | 📅 Pending | `/api/master/employees` | employees:* | Staff directory |
| Departments | 📅 Pending | `/api/master/departments` | departments:* | Org structure |
| Job Titles | 📅 Pending | `/api/master/job-titles` | job_titles:* | Designations |
| Contract Types | 📅 Pending | `/api/master/contract-types` | contract_types:* | Full-time/Part-time |
| Contract Status | 📅 Pending | `/api/master/contract-status` | contract_status:* | Active/Terminated |
| Responsibility Centers | 📅 Pending | `/api/master/responsibility-centers` | resp_centers:* | Cost allocation |
| Allowances | 📅 Pending | `/api/master/allowances` | allowances:* | Salary components |
| Deductions | 📅 Pending | `/api/master/deductions` | deductions:* | Tax/Insurance |
| Payroll Schedules | 📅 Pending | `/api/master/payroll-schedules` | payroll_schedules:* | Monthly/Weekly |
| Attendance Setup | 📅 Pending | `/api/master/attendance-setup` | attendance:* | Check-in/out |

**Blocking Dependencies**: PHASE 1, PHASE 5 (cost centers, default accounts)
**Required by**: Payroll, HR transactions
**Estimated Timeline**: 4-5 days

---

#### **PHASE 9: Documents & Templates (9 pages)** - Priority: MEDIUM
Document management.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Document Types | 📅 Pending | `/api/master/document-types` | document_types:* | Classification |
| Document Status | 📅 Pending | `/api/master/document-status` | document_status:* | Workflow |
| Approval Workflows | 📅 Pending | `/api/master/approval-workflows` | approvals:* | Multi-level |
| Contract Templates | 📅 Pending | `/api/master/contract-templates` | contract_templates:* | Legal docs |
| Conformity Certificates | 📅 Pending | `/api/master/conformity-certs` | certificates:* | Quality certs |
| Certificate of Origin | 📅 Pending | `/api/master/coo-certificates` | coo:* | Export docs |
| Import Licenses | 📅 Pending | `/api/master/import-licenses` | import_licenses:* | Regulatory |
| Export Licenses | 📅 Pending | `/api/master/export-licenses` | export_licenses:* | Regulatory |
| Report Types | 📅 Pending | `/api/master/report-types` | report_types:* | Custom reports |

**Blocking Dependencies**: PHASE 1, PHASE 4 (customers/suppliers)
**Required by**: Document workflows, Reporting
**Estimated Timeline**: 3-4 days

---

#### **PHASE 10: Control & Permissions (10 pages)** - Priority: CRITICAL
Governance & audit.

| Entity | Status | API Endpoint | Permission Group | Notes |
|--------|--------|--------------|------------------|-------|
| Record Status | 📅 Pending | `/api/master/record-status` | record_status:* | Active/Inactive |
| Date Controls | 📅 Pending | `/api/master/date-controls` | date_controls:* | Period locks |
| Enable/Disable Rules | 📅 Pending | `/api/master/enable-disable-rules` | controls:* | Feature toggles |
| Request/Approve/Execute | 📅 Pending | `/api/master/workflows` | workflows:* | 3-way approval |
| Permission Matrix | 📅 Pending | `/api/master/permission-matrix` | permissions:* | RBAC matrix |
| Audit Trails | 📅 Pending | `/api/master/audit-trails` | audits:* | Change logs |
| User Activity Logs | 📅 Pending | `/api/master/activity-logs` | activity_logs:* | Usage tracking |
| Data Backup Schedules | 📅 Pending | `/api/master/backup-schedules` | backups:* | Disaster recovery |
| System Health Dashboard | 📅 Pending | `/api/master/system-health` | system:* | Monitoring |
| Integration Endpoints | 📅 Pending | `/api/master/integration-endpoints` | integrations:* | 3rd-party APIs |

**Blocking Dependencies**: PHASE 1 (all - must be last)
**Required by**: All other systems
**Estimated Timeline**: 4-5 days

---

## 📋 PERMISSION STRUCTURE

### Permission Naming Convention
```
{entity}:{action}

Examples:
companies:view
companies:create
companies:edit
companies:delete
companies:export
companies:import
items:print
customers:toggle
```

### Permission Levels (All Required)
- **view** - Read access
- **create** - Create new records
- **edit** - Modify existing records
- **delete** - Delete/soft-delete records
- **export** - Export to Excel/CSV
- **import** - Bulk import
- **print** - Print/PDF
- **toggle** - Enable/disable
- **approve** - Approval workflows
- **audit** - View audit trails

### Role Mapping (Example)
```
SUPER_ADMIN: * (all permissions)
ADMIN: most permissions except system:* and backup:*
MANAGER: view/create/edit on assigned areas
USER: view only on assigned records
AUDITOR: view/audit only
GUEST: minimal view
```

---

## 🔐 SECURITY REQUIREMENTS (Non-Negotiable)

### Backend
- ✅ JWT token validation on every endpoint
- ✅ Permission check before query execution
- ✅ SQL injection prevention (parameterized queries)
- ✅ RBAC enforcement at DB layer
- ✅ Audit trail creation for mutations
- ✅ Soft delete support (not hard delete)
- ✅ Rate limiting on public endpoints

### Frontend
- ✅ Route guards (middleware)
- ✅ Component-level permission checks
- ✅ Button/menu visibility based on permissions
- ✅ Form validation before submission
- ✅ Error boundary wrapping
- ✅ Secure token storage (localStorage with refresh logic)
- ✅ Session timeout handling

### Data Validation
- ✅ Required field validation
- ✅ Unique constraint checks
- ✅ Business rule validation
- ✅ Date range validation (start < end)
- ✅ Numeric range validation
- ✅ Regex pattern validation (email, phone)
- ✅ Foreign key integrity

---

## 🌍 i18n REQUIREMENTS (100% Mandatory)

### Files to Update
- `frontend-next/locales/en.json` (English)
- `frontend-next/locales/ar.json` (Arabic - RTL)

### Translation Keys Required (Per Entity)
```
{
  "master.{entity}.title": "Entity Title",
  "master.{entity}.description": "Short description",
  "master.{entity}.fields.{fieldName}": "Field Label",
  "master.{entity}.columns.{columnName}": "Column Header",
  "master.{entity}.buttons.create": "Create {Entity}",
  "master.{entity}.buttons.edit": "Edit {Entity}",
  "master.{entity}.buttons.delete": "Delete {Entity}",
  "master.{entity}.buttons.export": "Export {Entity}",
  "master.{entity}.messages.created": "{Entity} created successfully",
  "master.{entity}.messages.updated": "{Entity} updated successfully",
  "master.{entity}.messages.deleted": "{Entity} deleted successfully",
  "master.{entity}.messages.error": "Error: {error message}",
  "master.{entity}.validation.required": "{Field} is required",
  "master.{entity}.validation.unique": "{Field} must be unique",
  "master.{entity}.tooltips.{field}": "Help text for field"
}
```

### Arabic RTL Support
- ✅ All text components use `dir="rtl"` when needed
- ✅ Flexbox/Grid layouts support RTL reversal
- ✅ Icon positioning adjusted for RTL
- ✅ Date formatting respects locale
- ✅ Number formatting respects locale

---

## 🗄️ BACKEND API SPECIFICATION

### Standard CRUD Endpoints (Per Entity)
```typescript
// LIST with filters, search, pagination
GET /api/master/{entity}
  ?page=1&limit=50&search=query&sort=name&order=asc
  ?filter[status]=active&filter[category]=1
Response: { data: [], total: 100, page: 1, limit: 50 }

// CREATE
POST /api/master/{entity}
Body: { name, code, description, ... }
Response: { data: { id, ... }, message: "Created" }

// READ (single)
GET /api/master/{entity}/{id}
Response: { data: { id, name, ... } }

// UPDATE
PUT /api/master/{entity}/{id}
Body: { name, code, description, ... }
Response: { data: { id, ... }, message: "Updated" }

// DELETE (soft)
DELETE /api/master/{entity}/{id}
Response: { message: "Deleted" }

// EXPORT
GET /api/master/{entity}/export?format=csv&filter=...
Response: CSV file download

// BULK IMPORT
POST /api/master/{entity}/import
Body: FormData (CSV file)
Response: { imported: 100, skipped: 5, errors: [...] }
```

### Permission Middleware
```typescript
// Every endpoint protected with:
router.get('/{entity}', authenticate, requirePermission('{entity}:view'), handler);
router.post('/{entity}', authenticate, requirePermission('{entity}:create'), handler);
router.put('/{entity}/{id}', authenticate, requirePermission('{entity}:edit'), handler);
router.delete('/{entity}/{id}', authenticate, requirePermission('{entity}:delete'), handler);
```

---

## 🎨 FRONTEND IMPLEMENTATION PATTERN

### File Structure (Per Entity Page)
```
pages/master/
├── {entity-name}.tsx          # Main page component
├── [id].tsx                   # Detail/edit page
├── components/
│   ├── {Entity}Form.tsx       # Create/Edit form
│   ├── {Entity}Table.tsx      # List view table
│   ├── {Entity}Filters.tsx    # Advanced filters
│   └── {Entity}Detail.tsx     # View detail modal
└── hooks/
    └── use{Entity}Data.tsx    # React Query hook
```

### Component Template
```typescript
// pages/master/{entity-name}.tsx
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';
import { useLocale } from '@/hooks/useLocale';
import MainLayout from '@/components/layout/MainLayout';

export default function {Entity}Page() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useLocale();

  // Check permissions
  if (!hasPermission('{entity}:view')) {
    return <AccessDenied />;
  }

  return (
    <MainLayout>
      <div className="p-6">
        <h1>{t('master.{entity}.title')}</h1>
        <Button 
          disabled={!hasPermission('{entity}:create')}
          onClick={() => setCreateOpen(true)}
        >
          {t('master.{entity}.buttons.create')}
        </Button>
        {/* Table, filters, etc. */}
      </div>
    </MainLayout>
  );
}
```

---

## ✅ DEFINITION OF DONE (DoD)

Each page/entity is only considered COMPLETE when:

✅ **Backend API** exists and works
```
- All 5 CRUD endpoints functional
- Permission checks working
- Validation working
- Error handling working
```

✅ **Frontend Page** created
```
- List view with table
- Create/Edit modal
- Delete confirmation
- Advanced filters
- Search functionality
- Pagination
- Export button (if permission)
```

✅ **Permissions** configured
```
- All permission codes created in DB
- Backend endpoints protected
- Frontend buttons conditional
- RBAC tested
```

✅ **Translations** complete
```
- 100% English (en.json)
- 100% Arabic (ar.json)
- All titles, labels, buttons, messages
- RTL support verified
```

✅ **Validation** working
```
- Required fields validated
- Unique constraints checked
- Business rules enforced
- Error messages displayed
```

✅ **Testing** complete
```
- Manual testing pass
- API response verified
- Permission checking verified
- i18n display verified
```

✅ **Documentation** written
```
- Purpose documented
- Fields documented
- Business rules documented
- Examples provided
```

---

## 📅 TIMELINE

### Quick Wins (Days 1-2)
- PHASE 1: System & Settings (critical path)
- PHASE 2: Reference Data (mostly already done)
- **Output**: 23 pages

### Foundation Build (Days 3-8)
- PHASE 3: Items & Inventory
- PHASE 4: Customers & Suppliers
- PHASE 5: Accounting & Finance
- **Output**: 42 pages (65 total)

### Compliance & Extensions (Days 9-12)
- PHASE 6: Logistics & Import
- PHASE 7: Tax & Zakat
- **Output**: 24 pages (89 total)

### Final Phases (Days 13-16)
- PHASE 8: HR
- PHASE 9: Documents & Templates
- **Output**: 19 pages (108 total)

### Governance Layer (Days 17-18)
- PHASE 10: Control & Permissions
- **Output**: 10 pages (118 total)

### Testing & Documentation (Days 19-20)
- UAT preparation
- API documentation
- User guide creation

---

## 🚀 GETTING STARTED (Today)

### Immediate Actions (Next 2 Hours)

1. **Update menu.registry.ts** with all 100+ entities
2. **Create permission constants** in menu.permissions.ts
3. **Add i18n keys** to en.json and ar.json
4. **Create API endpoint specifications** (SQL migrations needed)
5. **Setup standardized page template**

### First Sprint (Next 3 Days)

1. Complete PHASE 1: System & Settings (11 pages)
2. Verify PHASE 2 completion (12 pages)
3. Begin PHASE 3: Items (start with Items/Products, Item Groups)
4. API backend implementation for high-priority entities

### Success Metrics

- ✅ All 15 current pages fully functional
- ✅ PHASE 1 (11 pages) completed and tested
- ✅ All permission codes created (100+)
- ✅ All i18n keys added (1000+)
- ✅ Zero hardcoded strings
- ✅ Zero 401/403 errors on valid requests

---

## 📞 SUPPORT & ESCALATIONS

### Blockers
- Missing backend endpoints → Create migration + API endpoint
- i18n key not found → Add to en.json and ar.json
- Permission denied → Check RBAC configuration
- API errors → Check backend logs

### Dependencies
- All phases depend on PHASE 1 completion
- PHASE 3+ depend on PHASE 2 completion
- PHASE 6 depends on PHASE 4 completion

---

**Last Updated**: December 27, 2025
**Owner**: Development Team
**Status**: PLANNING PHASE - Ready for Execution
