# تقرير الفحص الشامل لنظام SLMS
# SLMS Comprehensive System Audit Report
**Date:** 2026-03-28 | **Status:** SYSTEM FREEZE & STABILIZATION PHASE

---

## Executive Summary (الملخص التنفيذي)

| Metric | Value | Health |
|--------|-------|--------|
| **Overall System Stability** | **78%** | 🟡 MODERATE |
| Backend TSC Compilation | 0 errors | ✅ PASS |
| Docker Services | 6/6 running | ✅ PASS |
| Database Tables | 517 | ✅ HEALTHY |
| Database Views | 49 | ✅ HEALTHY |
| Database Functions | 211 | ✅ HEALTHY |
| Database Triggers | 55 | ✅ HEALTHY |
| Migrations Applied | 342 | ✅ HEALTHY |
| Frontend Pages | 492+ | ✅ COMPREHENSIVE |
| Backend Route Files | 286 (266 imported) | 🟡 3 ORPHANED |
| API Health | OK | ✅ PASS |
| Authentication | Working | ✅ PASS |
| Company Isolation | 11/12 tests pass | 🟡 1 FAIL |
| RLS Policies | 0 (none) | 🔴 CRITICAL GAP |
| Field Permissions | 0 rows seeded | 🔴 NOT ACTIVE |
| Translation Coverage | EN:6853 vs AR:5933 | 🟡 GAP: 2603 missing in AR |

---

## Phase 1: Recovery Audit (فحص الاسترداد)

### 1.1 Backend Routes
| Item | Status | Details |
|------|--------|---------|
| Total route files | 286 | In `backend/src/routes/` |
| Imported in app.ts | 266 | All resolve to existing files |
| Orphaned files | 3 | `expenses.ts`, `timeZones.ts`, `projects/index.ts` |
| Sub-module files | 17 | Used by parent `index.ts` (procurement/, sales/) |

### 1.2 Frontend Pages
| Category | Count | Status |
|----------|-------|--------|
| Total pages | 492+ | ✅ |
| Components | 111 | ✅ |
| Hooks | 18 | ✅ |
| Contexts | 6 | ✅ |
| Master data screens | 12/12 | ✅ ALL EXIST |
| Accounting screens | 6/6 | ✅ ALL EXIST |
| Logistics screens | 4/4 | ✅ ALL EXIST |
| Admin screens | 7/7 | ✅ ALL EXIST |
| Settings screens | 3/3 | ✅ ALL EXIST |

### 1.3 Database Schema
| Object Type | Count |
|-------------|-------|
| Tables | 517 |
| Views | 49 |
| Functions | 211 |
| Triggers | 55 |
| Indexes | 1772 |
| Migrations | 342 |

### 1.4 Translations
| Language | Keys | Gap |
|----------|------|-----|
| English (EN) | 6,853 | Missing in AR: **2,603** |
| Arabic (AR) | 5,933 | Missing in EN: **1,710** |

**Assessment:** 🟡 Translation gap needs attention. ~38% of EN keys missing Arabic equivalent.

---

## Phase 2: Multi-Tenant Isolation (عزل المستأجرين)

### 2.1 Tenant Distribution
| Tenant | ID | Companies | Primary Company |
|--------|-----|-----------|----------------|
| AlHaj Group | 1 | 2 | AlHaj Group - Head Office (3), HACK Corp (43) |
| Dar Khawlan | 4 | 1 | DAR KHAWLAN TRADING COMPANY (1) |
| محيط الفولاذ | 45 | 1 | شركة محيط الفولاذ (42) |

**Total:** 3 tenants, 12 companies, 63 users

### 2.2 Company Data Isolation Test
| Company | Accounts | Shipments | Vendors | Customers |
|---------|----------|-----------|---------|-----------|
| DAR KHAWLAN (1) | 852 | 0 | 772 | 0 |
| Company 16 | 55 | 12 | 43 | 14 |
| All others | 39 each | 0 | 0 | 0 |

**No cross-company data leaks detected.** All vendors, accounts, and shipments have `company_id` set.

### 2.3 Isolation Test Results (test_company_isolation)
| Test | Result |
|------|--------|
| T1: Currencies after creation | ✅ PASS (A=156, B=156) |
| T2: Tax types after creation | ✅ PASS (A=12, B=12) |
| T3: Expense categories | ✅ PASS (A=11, B=11) |
| T4: Numbering series | ✅ PASS (A=20, B=20) |
| T5: Custom tax isolation | ✅ PASS (A=1, B=0) |
| T6: Delete isolation | ✅ PASS |
| T7: Modify isolation | ✅ PASS |
| T8: Global countries | ✅ PASS (202) |
| T9: HS codes global | ✅ PASS (1152) |
| T10: Container types global | 🔴 FAIL (only 7) |
| T11: Shipping lines global | ✅ PASS (49) |
| T12: Full isolation | ✅ PASS |

**Score: 11/12 PASS**

### 2.4 Row-Level Security (RLS)
| Status | Details |
|--------|---------|
| RLS Policies | **0 policies defined** |
| Impact | 🔴 CRITICAL - No DB-level enforcement |
| Current Mitigation | Application-level WHERE clauses |

---

## Phase 3: Authentication (المصادقة)

### 3.1 Auth Flow Test
| Test | Result | Details |
|------|--------|---------|
| Backend health | ✅ | `{"status":"ok","service":"slms-backend"}` |
| Login (super_admin) | ✅ | JWT + refresh token returned |
| /api/auth/me | ✅ | Returns user + roles + permissions |
| Unauthenticated access | ✅ | `{"error":"missing auth header"}` blocked |
| JWT contains | ✅ | sub, email, roles[], jti, tenant_id, login_context |

### 3.2 User Distribution
| Status | Count |
|--------|-------|
| Active users | 63 |
| With roles assigned | 19 (via user_roles) |
| Without roles | 44 (⚠️ many test accounts) |
| Tenant admins | 2 (admin@darkhawlan, cfo@darkhawlan) |
| Super admins | 2 (ali@alhajco, aliahaj@alhajco) |

---

## Phase 4: RBAC Permissions (التحكم بالصلاحيات)

### 4.1 Role Distribution
| Role | Type | Permissions | Status |
|------|------|-------------|--------|
| مدير الشركة (Company) | Company | 1,243 | ✅ |
| company_owner | Platform | 1,219 | ✅ |
| مدير الشركة (System x2) | System | 1,219 each | ✅ |
| super_admin | System+Platform | 1,095 | ✅ |
| Admin | Platform | 970 | ✅ |
| Tenant Admin | System+Platform | 965 | ✅ |
| Accountant | Platform | 32 | 🟡 LOW |
| Viewer | Platform | 9 | 🟡 LOW |
| Logistics | Platform | 2 | 🔴 UNUSABLE |
| **7 roles with 0 permissions** | Various | 0 | 🔴 EMPTY |

### 4.2 Permission Coverage
| Resource | Permissions |
|----------|-------------|
| vendors | 29 |
| projects | 24 |
| reports | 19 |
| users | 15 |
| customers | 12 |
| roles | 12 |
| companies | 12 |
| Total unique permissions | **1,616** |
| Total role_permissions | **9,194** |

### 4.3 Critical RBAC Issues
1. **7 roles with ZERO permissions** — Warehouse, company_user, company_viewer, موظف×2, مشرف, علي
2. **Logistics role has only 2 permissions** — effectively unusable
3. **Accountant role has only 32 permissions** — may be insufficient
4. **Duplicate role names** — 3 roles named "مدير الشركة" with different scopes

---

## Phase 5: Field Permission Engine (صلاحيات الحقول)

### 5.1 Status
| Item | Status |
|------|--------|
| Table exists | ✅ `field_permissions` (10 columns) |
| Columns | resource, field_name, role_id, visibility, required_override, company_id, tenant_id |
| Data rows | **0** 🔴 |
| Backend middleware | Exists (needs verification) |
| Frontend UI | `admin/field-permissions.tsx` exists |

**Assessment:** 🔴 CRITICAL — Field permission engine table is empty. No field-level restrictions are enforced.

---

## Phase 6: Company Provisioning (تجهيز بيانات الشركة)

### 6.1 Provisioning Function
| Data Type | Provisioned | Status |
|-----------|-------------|--------|
| Currencies | ✅ ~156 per company | Working |
| Payment Methods | ✅ | Working |
| Shipping Methods | ✅ | Working (fixed) |
| Tax Types | ✅ 12 per company | Working |
| Payment Terms | ✅ | Working |
| Expense Categories | ✅ 11 per company | Working |
| Unit Types | ✅ 8 total | Working (fixed) |
| Numbering Series | ✅ 20 per company | Working |
| Vendor Categories | ✅ | Working |
| Warehouse Types | ✅ | Working |

### 6.2 is_provisioned Flag
| Company | is_provisioned |
|---------|---------------|
| All 12 companies | `false` |

**Note:** All companies have `is_provisioned=false` despite having provisioned data. The flag is never updated to `true`.

---

## Phase 7: Chart of Accounts (شجرة الحسابات)

### 7.1 Account Distribution
| Company | Total Accounts | System Accounts |
|---------|---------------|----------------|
| DAR KHAWLAN (1) | 852 | 16 |
| Company 16 | 55 | 16 |
| All others | 39 each | 16 |

### 7.2 Default Accounts (Company 1)
| Account Key | Code | Name |
|-------------|------|------|
| AP_TRADE | 2101 | Accounts Payable - Trade |
| AR_TRADE | 1201 | Accounts Receivable - Trade |
| BANK | 1112 | Bank Accounts |
| CASH | 1111 | Petty Cash |
| COGS | 5100 | Cost of Goods Sold |
| CUSTOMS | 5103 | Customs Duties |
| FREIGHT_IN | 5102 | Freight In |
| FREIGHT_OUT | 6302 | Freight Out |
| INVENTORY | 1301 | Merchandise Inventory |
| PURCHASES | 5201 | Purchases - Services |
| RETAINED_EARNINGS | 3200 | Retained Earnings |
| SALES | 4101 | Domestic Sales |
| VAT_INPUT | 1210 | VAT Receivable |
| VAT_OUTPUT | 2201 | VAT Output |

**14 default accounts properly mapped** ✅

### 7.3 Account Type Distribution (Company 1)
| Type | Count |
|------|-------|
| Payables | 779 |
| COGS | 36 |
| Cash & Bank | 6 |
| Revenue | 4 |
| Taxes Payable | 4 |
| Receivables | 4 |
| Inventory | 4 |

---

## Phase 8: Shipping & Logistics (الشحن واللوجستيات)

### 8.1 Data Inventory
| Entity | Count |
|--------|-------|
| Shipments | 12 |
| Shipment Containers | 2 (6 via sub-records) |
| Shipment Documents | 15 |
| Shipment Expenses | 22 |
| Journal Entries | 19 |
| Journal Lines | 38 |
| Shipping Methods | 70 |
| Container Types | 19 |
| Expense Categories | 456 |

### 8.2 Shipment Details
All 12 shipments belong to **company 16**, status: `pending`
- Shipment 8: 4 containers, 8 docs, 1 expense ✅
- Shipment 9: 2 containers, 4 docs, 4 expenses ✅
- Shipment 10: 3 docs, 4 expenses ✅
- Shipments 12-19: Empty (0 containers, 0 docs, 0 expenses) ⚠️

---

## Phase 9: Screen Existence Audit (فحص الشاشات)

### 9.1 Critical Screens
| Screen Category | Required | Found | Missing |
|-----------------|----------|-------|---------|
| Master Data (12) | 12 | **12** | **0** ✅ |
| Accounting (6) | 6 | **6** | **0** ✅ |
| Logistics/Shipping (4) | 4 | **4** | **0** ✅ |
| Admin (7) | 7 | **7** | **0** ✅ |
| Settings (3) | 3 | **3** | **0** ✅ |
| Dashboard | 1 | **1** | **0** ✅ |

**All 33 required screens exist.** Total system has 492+ pages across 20+ modules.

### 9.2 Notable Screen Duplications
- Companies: exists in `admin/`, `settings/`, `master/` (3 locations)
- Roles: exists in `admin/roles/`, `roles/`, `settings/roles`, `master/roles` (4 locations)
- Branches: `admin/branches.tsx` + `master/branches.tsx`

---

## Phase 10: Backup (النسخ الاحتياطي)

| Item | Count | Status |
|------|-------|--------|
| Backup history records | 91 | ✅ |
| Backup schedules | 3 | ✅ |
| Backup policies | 0 | 🟡 No policies defined |
| Backup integrity checks | 0 | 🟡 Not running |
| Backup service container | Running | ✅ |

---

## Phase 11: Performance (الأداء)

### 11.1 Database Size
| Metric | Value |
|--------|-------|
| Total DB size | **925 MB** |
| Largest table | `reference_data_versions` (650 MB, 328K rows) |
| 2nd largest | `audit_logs` (71 MB) |
| 3rd largest | `item_audit_trail` (57 MB) |

### 11.2 Index Efficiency Issues 🔴
| Table | Sequential Scans | Index Scans | Issue |
|-------|-----------------|-------------|-------|
| **exchange_rates** | **6,936,373** | 0 | 🔴 CRITICAL - no useful index |
| **companies** | 413,586 | 9 | 🔴 Heavy seq scan |
| **user_companies** | 356,172 | 0 | 🔴 No index used |
| **branches** | 337,437 | 0 | 🔴 No index used |
| **shipping_agents** | 99,846 | 0 | 🟡 |
| **tenants** | 81,955 | 0 | 🟡 |

**Actions needed:** Add composite indexes on `exchange_rates`, `user_companies`, `branches` for `company_id`/`tenant_id` columns.

### 11.3 reference_data_versions Bloat
- **650 MB** for 328K rows is excessive
- Consider archiving or partitioning this table

---

## Phase 12: Final Status Report (التقرير النهائي)

### Infrastructure Status ✅
| Service | Container | Port | Status |
|---------|-----------|------|--------|
| PostgreSQL | slms-postgres-1 | 5432 | ✅ Up 2 days |
| Backend | slms-backend-1 | 4000 | ✅ Up 43 hours |
| Frontend | slms-frontend-next-1 | 3001 | ✅ Up 43 hours |
| Redis | slms-redis-1 | 6379 | ✅ Up 2 days |
| RabbitMQ | slms-rabbitmq-1 | 5672/15672 | ✅ Up 2 days |
| Backup | slms-backup-1 | - | ✅ Up 2 days |

### Compilation ✅
- **Backend TSC:** 0 errors
- **266/266** route imports valid

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **No RLS (Row-Level Security) policies** | 🔴 CRITICAL | Direct DB access bypasses all tenant isolation |
| 2 | **Field permissions table empty (0 rows)** | 🔴 CRITICAL | No field-level restrictions enforced |
| 3 | **7 roles with 0 permissions** | 🔴 HIGH | Users assigned to these roles can't do anything |
| 4 | **exchange_rates: 6.9M seq scans, 0 idx scans** | 🔴 HIGH | Major performance bottleneck |
| 5 | **reference_data_versions: 650MB** | 🟡 MEDIUM | Table bloat affecting DB size |
| 6 | **is_provisioned never set to true** | 🟡 MEDIUM | Cannot track which companies are provisioned |
| 7 | **2,603 EN keys missing Arabic translation** | 🟡 MEDIUM | UI shows English fallback for Arabic users |
| 8 | **Container types test failing (only 7)** | 🟡 LOW | Minor global data gap |
| 9 | **3 orphaned route files** | 🟡 LOW | Dead code |
| 10 | **44 users without any role** | 🟡 LOW | Most are test accounts |

---

## Recommended Action Plan (خطة العمل)

### Priority 1 — Security (immediate)
1. ✅ Seed `field_permissions` with default rules for sensitive fields (cost_price, tax_rate, etc.)
2. ✅ Add RLS policies for critical tables (accounts, vendors, customers, shipments)
3. ✅ Assign permissions to empty roles or remove unused ones

### Priority 2 — Performance (this week)
4. ✅ Add composite index on `exchange_rates(company_id, currency_code, effective_date)`
5. ✅ Add indexes on `user_companies(user_id, company_id)`, `branches(company_id)`
6. ✅ Archive or partition `reference_data_versions` table

### Priority 3 — Data Quality (this week)
7. ✅ Update `is_provisioned` flag for all companies that have data
8. ✅ Clean up test users (44 users without roles)
9. ✅ Populate container_types global data

### Priority 4 — Localization (next sprint)
10. ✅ Add missing 2,603 Arabic translations
11. ✅ Add missing 1,710 English translations

### Priority 5 — Code Cleanup
12. ✅ Remove or integrate 3 orphaned route files
13. ✅ Consolidate duplicate page locations (companies, roles, branches)

---

## Stability Assessment

| Area | Score | Notes |
|------|-------|-------|
| Backend Code | 95% | 0 TSC errors, all routes valid |
| Database Schema | 90% | 517 tables, well-structured |
| Authentication | 90% | JWT + refresh working, MFA table ready |
| RBAC | 70% | Working but 7 empty roles, field perms empty |
| Multi-Tenant Isolation | 75% | App-level isolation works, no RLS |
| Provisioning | 85% | All data types provisioned, flag not updated |
| Accounting/COA | 85% | 14 default accounts, full COA tree |
| Shipping | 75% | CRUD works, 8/12 shipments empty |
| Screens | 95% | All critical screens exist (492+) |
| Translations | 62% | Significant AR gap |
| Performance | 65% | Critical index issues on key tables |
| Backup | 70% | Running but no policies or integrity checks |

### **Overall System Score: 78/100** 🟡

**Verdict:** System is functional but NOT production-ready. Fix the 10 critical issues above before any new feature development. Estimated stabilization: 2-3 days of focused work.

---
*Report generated: 2026-03-28 | SLMS v1.0 Stabilization Phase*
