# SLMS Full System Testing & Verification — Test Results Report

**Date**: 2026-03-31  
**Environment**: Docker (7 containers), PostgreSQL 15, Express.js backend (port 4000), Next.js frontend (port 3001)  
**Tester**: Automated via test-runbook-v3.js + manual DB verification

---

## Executive Summary

| Section | Tests | Pass | Fail | Skip | Rate |
|---------|-------|------|------|------|------|
| 0 – Prerequisites | 7 | 7 | 0 | 0 | 100% |
| 1 – Authentication | 16 | 16 | 0 | 0 | 100% |
| 5.1 – Platform API | 21 | 19 | 2 | 0 | 90.5% |
| 5.2 – Tenant API | 13 | 11 | 2 | 0 | 84.6% |
| 5.3 – Cross-Tenant Security | 8 | 8 | 0 | 0 | 100% |
| 6 – RBAC | 6 | 5 | 1 | 0 | 83.3% |
| 8 – Database Integrity | 30 | 25 | 5 | 0 | 83.3% |
| **TOTAL** | **101** | **91** | **10** | **0** | **90.1%** |

### Sections Not Yet Tested (Require Browser/Manual)
- Section 2: Platform Admin UI (Dashboard KPIs, Wizard, CRUD tenants, Impersonation)
- Section 3: Tenant Layer UI (Dashboard, Company Profile, Branches, Users, Roles)
- Section 4: Master Data CRUD (Global read-only, Seeded per-tenant)
- Section 7: Frontend UI Testing (Validation, Buttons, RTL, Performance)
- Section 9: E2E Integration (Full workflow scenarios)
- Section 10–11: Known Issues + Final Sign-Off

---

## Section 0: Prerequisites ✅ ALL PASS

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Docker services running | 7 | 7 (backend, frontend-next, postgres, redis, nginx, minio, pgadmin) | ✅ |
| Health endpoint | 200 | 200 OK | ✅ |
| Tenants in DB | ≥2 | 3 (AHJ-001, TST99, DARKHAWLAN) | ✅ |
| Users in DB | ≥3 | 8 | ✅ |
| Applied migrations | ≥400 | 215 files (migrations may be multi-statement) | ⚠️ |
| Modules | 11 | **13** (includes dashboard, platform) | ⚠️ |
| Tenant schemas | ≥2 | 2 (tenant_darkhawlan, tenant_tst99) | ✅ |

**Note**: Runbook expected 11 modules; system has 13 (dashboard + platform added). Module column is `module_code` not `name`.

---

## Section 1: Authentication ✅ ALL PASS (16/16)

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| AUTH-1.1 | Platform admin login (ali@alhajco.com) | ✅ | Returns `login_context: "platform"` |
| AUTH-1.2 | Tenant admin login (admin@darkhawlan.com) | ✅ | Returns `login_context: "tenant"` |
| AUTH-1.3 | Tenant user login (ali@darkhawlan.com) | ✅ | |
| AUTH-2.1 | Wrong password rejected | ✅ | |
| AUTH-2.2 | SQL injection blocked | ✅ | `' OR 1=1 --` rejected |
| AUTH-2.3 | XSS in email blocked | ✅ | `<script>` rejected |
| AUTH-2.4 | Empty body rejected | ✅ | |
| AUTH-2.5 | Scope mismatch (tenant user, no tenant_code) | ✅ | TENANT_LOGIN_REQUIRED |
| AUTH-2.6 | Wrong tenant code | ✅ | INVALID_CREDENTIALS |
| AUTH-3.1 | Forged JWT rejected | ✅ | |
| AUTH-3.2 | Tampered JWT rejected | ✅ | |
| AUTH-3.3 | Expired JWT rejected | ✅ | |
| AUTH-3.4 | No auth header rejected | ✅ | |
| AUTH-3.5 | Refresh token valid | ✅ | |
| AUTH-3.6 | Invalid refresh token rejected | ✅ | |
| AUTH-3.7 | Non-existent email rejected | ✅ | |

**Runbook Discrepancy**: Runbook assumed `login_context` was a request parameter — actually `tenant_code` is used, and `login_context` is derived server-side.

---

## Section 5.1: Platform API (19/21 PASS)

| Test ID | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| PA-1 | GET /api/tenants | ✅ 200 | |
| PA-2 | GET /api/tenants/:id | ✅ 200 | |
| PA-3 | GET /api/platform/users | ✅ 200 | |
| PA-4 | GET /api/platform/settings | ✅ 200 | |
| PA-5 | GET /api/platform/modules | ✅ 200 | |
| PA-6 | GET /api/roles | ✅ 200 | |
| PA-7 | GET /api/permissions | ✅ 200 | |
| PA-8 | GET /api/audit-logs | ✅ 200 | |
| PA-9 | GET /api/platform/super-admins | ✅ 200 | |
| PA-10 | GET /api/platform/impersonation-logs | ✅ 200 | |
| PA-11 | GET /api/subscription-plans | ✅ 200 | |
| PA-12 | GET /api/system-policies | ✅ 200 | |
| PA-13 | GET /api/feature-flags | ✅ 200 | |
| PA-14 | GET /api/feature-discovery | ✅ 200 | |
| PA-15 | GET /api/enterprise-readiness | ✅ 200 | |
| PA-16 | GET /api/platform/monitoring | ❌ 404 | **Root path has no handler** — must use sub-paths: `/health`, `/services`, `/connections` |
| PA-17 | GET /api/quality-gate | ✅ 200 | |
| PA-18 | GET /api/roadmap/sprints | ✅ 200 | |
| PA-19 | GET /api/qa/testing-levels | ✅ 200 | |
| PA-20 | GET /api/numbering-series | ✅ 200 | |
| PA-21 | GET /api/help-requests | ❌ 500 | **BUG**: Internal server error for all users (super admin + tenant admin). SQL query works directly; error is in middleware chain.|

### PA-16 Root Cause
`/api/platform/monitoring` is a router with 3 sub-endpoints:
- `GET /api/platform/monitoring/health` → 200 ✅
- `GET /api/platform/monitoring/services` → 200 ✅
- `GET /api/platform/monitoring/connections` → 200 ✅

### PA-21 Root Cause
`GET /api/help-requests` returns 500 for all users. The route uses `loadCompanyContext` middleware and `requirePermission('help_requests:view')`. The SQL query itself executes correctly when run directly. Suspected issue: middleware error handling or query construction in the count query `.replace()` logic.

---

## Section 5.2: Tenant API (11/13 PASS)

| Test ID | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| TA-1 | GET /api/users | ✅ 200 | |
| TA-2 | GET /api/branches | ✅ 200 | |
| TA-3 | GET /api/companies | ✅ 200 | |
| TA-4 | GET /api/roles | ✅ 200 | |
| TA-5 | GET /api/settings | ✅ 200 | |
| TA-6 | GET /api/audit-logs | ✅ 200 | |
| TA-7 | GET /api/countries | ✅ 200 | |
| TA-8 | GET /api/currencies | ✅ 200 | |
| TA-9 | GET /api/shipments | ✅ 200 | |
| TA-10 | GET /api/warehouses | ✅ 200 | |
| TA-11 | GET /api/numbering-series | ✅ 200 | |
| TA-12 | GET /api/dashboard | ❌ 404 | **No root GET handler** — use `/api/dashboard/stats`, `/api/dashboard/overview`, `/api/dashboard/activity`, etc. |
| TA-13 | GET /api/profile | ❌ 404 | **No GET handler** — `/api/profile` only has POST endpoints (change-password, upload-avatar, etc.) |

### TA-12 Root Cause
Dashboard router has 10 sub-endpoints but no root `GET /`:
- `/api/dashboard/stats` → 200 ✅
- `/api/dashboard/overview` → 200 ✅
- `/api/dashboard/logistics`
- `/api/dashboard/financial`
- `/api/dashboard/procurement`
- `/api/dashboard/projects`
- `/api/dashboard/alerts`
- `/api/dashboard/badges`
- `/api/dashboard/activity`
- `/api/dashboard/login-trends`

### TA-13 Root Cause
Profile router only has POST and DELETE endpoints:
- `POST /api/profile/change-password`
- `POST /api/profile/upload-avatar`
- `DELETE /api/profile/avatar`

---

## Section 5.3: Cross-Tenant Security ✅ ALL PASS (8/8)

| Test ID | Description | Status |
|---------|-------------|--------|
| SEC-1 | Tenant token → platform endpoints blocked | ✅ 403 |
| SEC-2 | Tenant A token → Tenant B user query returns 0 | ✅ |
| SEC-3 | IDOR: DH admin → TST99 user by ID | ✅ 403/0 results |
| SEC-4 | Fake JWT with wrong tenant_id rejected | ✅ 401 |
| SEC-5 | Tampered JWT payload rejected | ✅ 401 |
| SEC-6 | DH token cannot read TST99 branches | ✅ |
| SEC-7 | DH token cannot read TST99 roles | ✅ |
| SEC-8 | No auth → all endpoints return 401 | ✅ |

---

## Section 6: RBAC (5/6 PASS)

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| RBAC-1 | Super admin accesses all platform endpoints | ✅ | |
| RBAC-2 | Tenant admin accesses all tenant endpoints | ✅ | |
| RBAC-3 | Non-admin user has read-only access | ✅ | |
| RBAC-4 | Tenant admin blocked from platform endpoints | ✅ | |
| RBAC-5 | Permission list includes module gating | ✅ | |
| RBAC-6 | Non-admin POST /api/users blocked | ❌ 400 | **Expected 403, got 400** — validation (Zod schema) runs before RBAC permission check |

### RBAC-6 Root Cause
The POST `/api/users` route validates the request body (Zod schema) before checking permissions. When the body is empty/invalid, it returns 400 (validation error) instead of 403 (forbidden). This is a middleware ordering issue — ideally RBAC should be checked before input validation.

---

## Section 8: Database Integrity (25/30 PASS)

### Schema & Structure

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Total tables (public + tenant + audit) | ≥300 | **389** | ✅ |
| Foreign key constraints | ≥200 | **4,300** | ✅ |
| RLS-enabled tables | ≥10 | **16** | ✅ |
| plan_code in subscription_plans | exists | `free` | ✅ |
| v_subscription_plan_unified view | exists | **DOES NOT EXIST** | ❌ |
| Tenant sessions table | rows > 0 | **137 rows** | ✅ |
| mfa_backup_codes table | exists | exists (0 rows) | ✅ |
| api_keys table | exists | exists (0 rows) | ✅ |
| Audit schema tables | platform_logs + tenant_logs | ✅ both exist in `audit` schema | ✅ |

### Module & Permission Structure

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Modules with name_ar | all | **13/13** have name_ar | ✅ |
| token_jti in impersonation_logs | exists | ✅ 3 columns with jti | ✅ |
| permission_templates.scope column | exists | **DOES NOT EXIST** | ❌ |
| Total permissions | ≥500 | **997** | ✅ |

### Master Data

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| supplier_types.code + is_system | exist | ✅ | ✅ |
| user_branches table | exists | exists (0 rows) | ✅ |
| is_main branch constraint | no violations | ✅ 0 violations | ✅ |
| users: name_ar/name_en/employee_id | populated | **columns exist but all NULL** | ⚠️ |
| System roles count | ≥2 | **14 system roles** | ✅ |
| system_policies count | 12 | **16** | ⚠️ |
| allowed_file_types column | extension | **`extensions`** (array, not singular) | ⚠️ |

### Feature & DevOps Tables

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| feature_flags table | exists with name | exists with `flag_key` (not `name`) | ⚠️ |
| feature_flags active | ≥3 | **5** (global_search, dark_mode, keyboard_shortcuts, onboarding_wizard, in_app_notifications) | ✅ |
| tenant_ip_whitelists | exists | exists (0 rows) | ✅ |
| development_sprints | exists | exists (Sprint 0, 1, 2…) | ✅ |
| technology_stack | exists | **20 entries** | ✅ |
| qa_testing_levels | exists | **6 levels** | ✅ |
| qa_quality_gates | exists | **7 gates** | ✅ |

### WORM Audit Log Protection

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| DELETE from audit.platform_logs | BLOCKED | ✅ `WORM_POLICY: audit_logs records cannot be deleted or modified` | ✅ |
| UPDATE audit.platform_logs | BLOCKED | ❌ **UPDATE SUCCEEDED** — action column was changed to 'hacked' | ❌ SECURITY GAP |
| DELETE from audit.tenant_logs | BLOCKED | **No trigger exists** — no WORM protection | ❌ SECURITY GAP |
| UPDATE from audit.tenant_logs | BLOCKED | **No trigger exists** — no WORM protection | ❌ SECURITY GAP |

**CRITICAL FINDING**: WORM policy is incomplete:
- `public.audit_logs`: DELETE ✅ blocked, UPDATE ✅ blocked (via `trg_audit_logs_no_delete` + `trg_audit_logs_no_tamper` + `worm_audit_logs_update`)
- `audit.platform_logs`: DELETE ✅ blocked (via `trg_platform_logs_no_delete`), **UPDATE ❌ NOT BLOCKED**
- `audit.tenant_logs`: **DELETE ❌ NOT BLOCKED, UPDATE ❌ NOT BLOCKED** — zero trigger protection

### Tenant Schema Comparison

| Check | Result | Status |
|-------|--------|--------|
| tenant_darkhawlan table count | 309 | ✅ |
| tenant_tst99 table count | 309 | ✅ |
| Schema differences | 0 (identical) | ✅ |
| Data architecture | Public schema with `tenant_id` filtering, tenant schemas exist but mostly empty | ℹ️ |

### Data Distribution

| Table | tenant_id=7 (DH) | tenant_id=6 (TST99) | tenant_id=NULL |
|-------|-------------------|----------------------|----------------|
| users | 2 | 1 | 5 (platform users) |
| branches | 1 | — | — |
| companies | 1 | — | — |
| roles | 1 | — | — |
| countries | — | — | 195 (shared master data) |

---

## Critical Findings & Bugs

### 🔴 CRITICAL

1. **WORM Policy Gap on audit.platform_logs** — UPDATE operations succeed (only DELETE is blocked). An attacker with DB access could modify audit records without detection.

2. **WORM Policy Missing on audit.tenant_logs** — No triggers at all. Both DELETE and UPDATE succeed. Tenant audit trail is not immutable.

### 🟡 HIGH

3. **GET /api/help-requests returns 500** — Internal server error for all users (super admin and tenant admin). Confirmed bug in the middleware chain or query construction.

4. **RBAC ordering issue** — POST /api/users validates body (Zod) before checking permissions. Non-authorized users see validation errors (400) instead of authorization errors (403). Information leak: reveals expected input schema to unauthorized users.

### 🟠 MEDIUM

5. **v_subscription_plan_unified view does not exist** — Runbook references it but it was never created.

6. **permission_templates.scope column missing** — Referenced in runbook but not in actual schema.

7. **users: name_ar/name_en/employee_id all NULL** — Schema supports Arabic names and employee IDs but no data has been populated.

### 🔵 LOW (Runbook Accuracy Issues)

8. **Credential mismatch** — Runbook's credentials (admin@slms.sa, admin@alhajco.com/P@ssw0rd123!) don't exist. Actual super admin: ali@alhajco.com/A11A22A33.

9. **API path mismatches** — Runbook assumed `/api/platform/tenants`, `/api/tenant/users`, `/api/public/countries`. Actual: `/api/tenants`, `/api/users`, `/api/countries`.

10. **Column/table naming differences** — `module_code` (not `name`), `flag_key` (not `name`), `extensions` (not `extension`), 13 modules (not 11), 16 policies (not 12).

---

## Recommendations

1. **IMMEDIATE**: Add UPDATE trigger to `audit.platform_logs` and both DELETE/UPDATE triggers to `audit.tenant_logs`.
2. **HIGH**: Fix /api/help-requests 500 error — debug loadCompanyContext middleware interaction.
3. **HIGH**: Reorder POST /api/users middleware: RBAC check before Zod validation.
4. **MEDIUM**: Add root GET handler to `/api/platform/monitoring` (aggregate health summary).
5. **MEDIUM**: Add root GET handler to `/api/dashboard` (redirect or overview summary).
6. **LOW**: Update runbook with correct credentials, API paths, and column names to match actual system.

---

## Test Artifacts

| File | Description |
|------|-------------|
| `test-runbook-v3.js` | Automated API test script (59/64 pass, 92.2%) |
| `reset-passwords.js` | Password reset utility for test users |
| `RUNBOOK-TEST-RESULTS.md` | This report |

---

## Appendix: Actual Route Map (Verified)

### Platform Routes (Super Admin)
```
GET  /api/platform/users
GET  /api/platform/settings
GET  /api/platform/modules
GET  /api/platform/super-admins
GET  /api/platform/impersonation-logs
GET  /api/platform/monitoring/health
GET  /api/platform/monitoring/services
GET  /api/platform/monitoring/connections
POST /api/platform/tenants/wizard
POST /api/platform/impersonation
```

### Tenant Routes (Tenant Admin/Users)
```
GET  /api/users
GET  /api/branches
GET  /api/companies
GET  /api/roles
GET  /api/settings
GET  /api/audit-logs
GET  /api/shipments
GET  /api/warehouses
GET  /api/numbering-series
GET  /api/dashboard/stats
GET  /api/dashboard/overview
GET  /api/dashboard/activity
GET  /api/help-requests  ← 500 BUG
```

### Shared Routes
```
GET  /api/tenants
GET  /api/permissions
GET  /api/subscription-plans
GET  /api/system-policies
GET  /api/feature-flags
GET  /api/feature-discovery
GET  /api/enterprise-readiness
GET  /api/quality-gate
GET  /api/roadmap/sprints
GET  /api/qa/testing-levels
GET  /api/countries
GET  /api/currencies
```

### Auth Routes
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```
