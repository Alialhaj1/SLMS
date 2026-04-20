# TENANT ISOLATION AUDIT REPORT
**Date:** 2026-04-19  
**Scope:** All route files in `backend/src/routes/` + middleware chain  
**Backend:** Express + raw pg Pool, multi-tenant SaaS

---

## EXECUTIVE SUMMARY

The SLMS backend has **global tenant isolation middleware** (`enforceTenantIsolation`) and a **body sanitizer** (`sanitizeTenantFromBody`) applied to all routes. The per-route `loadCompanyContext` middleware provides **strong tenant-validated company scoping**. However, several routes bypass this protection through unsafe patterns.

**Global middleware chain (app.ts lines 655–710):**
```
authenticate → sanitizeTenantFromBody → enforceTenantIsolation → resolveCompanyContext → preloadCompanyScope
```

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 5 | Cross-tenant data exposure or broken isolation logic |
| **HIGH** | 4 | Missing tenant validation on company context |
| **MODERATE** | 12+ | Optional company filters that may return unscoped data |
| **OK** | 50+ | Properly isolated via loadCompanyContext or buildTenantFilter |

---

## CRITICAL FINDINGS

### C-1: `resolveCompanyContext` Global Middleware — No Tenant Validation on X-Company-Id Header

**File:** `backend/src/middleware/resolveCompanyContext.ts`  
**Lines:** 18–21

```ts
const headerCompanyId = req.headers['x-company-id'];
if (headerCompanyId) {
  (req as any).companyId = Number(headerCompanyId);
  return next();  // NO TENANT CHECK!
}
```

**Impact:** Any authenticated user can send `X-Company-Id: <any_number>` to set `req.companyId` to a company belonging to a different tenant. Routes that use `req.companyId` without per-route `loadCompanyContext` will query against the wrong tenant's data.

**Affected routes:** All routes that read `req.companyId` without calling `loadCompanyContext` (see C-4, C-5, H-1 through H-4).

**Fix:** Add tenant ownership check before accepting the header value:
```ts
if (headerCompanyId && user.tenant_id) {
  const check = await pool.query(
    'SELECT 1 FROM companies WHERE id = $1 AND tenant_id = $2',
    [headerCompanyId, user.tenant_id]
  );
  if (check.rows.length === 0) return next(); // reject, fall through
}
```

---

### C-2: `approvals.ts` — Super Admin Bypass Exposes Cross-Tenant Approval Requests

**File:** `backend/src/routes/approvals.ts`  
**Lines:** 54–59

```ts
const isSuperAdmin = roleNames.some(r => r.includes('super') && r.includes('admin'));
const companyFilter = isSuperAdmin ? '' : (companyId ? 'AND ar.company_id = $1' : 'AND 1=0');
```

**Impact:** A tenant's `super_admin` role matches this regex check. When matched, **ALL company_id and tenant_id filters are removed**, returning approval requests from ALL tenants across the entire platform.

**Fix:** Check platform admin status explicitly:
```ts
const isPlatformAdmin = !user.tenant_id && isSuperAdmin;
```
Only bypass filters for `isPlatformAdmin`, not all super admins.

---

### C-3: `zatcaConfig.ts` — Uses `tenant_id` as `company_id` (Broken Logic)

**File:** `backend/src/routes/zatcaConfig.ts`  
**Line:** 10, 42, 59, 91, 121

```ts
const companyId = (req as any).user?.tenant_id;  // WRONG!
// Then queries: WHERE company_id = $1 ... [companyId]
```

**Impact:** Every query filters `company_id = tenant_id`, which is semantically wrong. Tenant_id and company_id are different entities. This means:
- Queries return nothing (if no company has id == tenant_id)
- OR return data from the wrong company (if coincidentally a company id matches the tenant id)

**Also:** No `loadCompanyContext` middleware — no tenant ownership verification.

**Fix:** Add `loadCompanyContext` and use `req.companyId`.

---

### C-4: `costElementGroups.ts` — Same Broken tenant_id → company_id Pattern

**File:** `backend/src/routes/costElementGroups.ts`  
**Line:** 21

```ts
const tenantId = (req as any).user?.tenant_id;
if (tenantId) {
  params.push(tenantId);
  query += ` AND company_id = $${params.length}`;  // WRONG: filters company_id = tenant_id
}
```

**Impact:** Same as C-3. Additionally, the `COUNT` query on line ~33 has NO tenant/company filter at all:
```ts
const countResult = await pool.query(`SELECT COUNT(*) FROM cost_element_groups WHERE deleted_at IS NULL`);
```
Returns total count across ALL tenants.

---

### C-5: `vatReturns.ts` — No `loadCompanyContext`, Optional Company Filter, No Tenant Check

**File:** `backend/src/routes/vatReturns.ts`  
**Lines:** 20, 35

```ts
const companyId = (req as any).user?.companyId;  // From JWT, no tenant validation
if (companyId) { params.push(companyId); query += ` AND vr.company_id = $${++paramIdx}`; }
// When companyId is null/undefined, returns ALL vat_returns from ALL companies/tenants
```

**Impact:** 
- Company filter is optional — if user's JWT has no companyId (platform admin, new user), ALL VAT returns across ALL tenants are returned
- No loadCompanyContext means no tenant ownership check on the company
- Financial tax data exposure across tenants

---

## HIGH SEVERITY FINDINGS

### H-1: `cashRegisters.ts` — No `loadCompanyContext`, Optional Company Filter

**File:** `backend/src/routes/cashRegisters.ts`  

Uses `(req as any).user?.companyId` from JWT without `loadCompanyContext`. Company filter is conditional:
```ts
if (companyId) { query += ` AND cr.company_id = ...` }
```
Cash register data (including balances, transactions) exposed when companyId is null.

---

### H-2: `zatcaSubmissions.ts` — No `loadCompanyContext`, Optional Company Filter

**File:** `backend/src/routes/zatcaSubmissions.ts`

Same pattern as vatReturns. Uses `(req as any).user?.companyId` without `loadCompanyContext`. Tax submission data across tenants exposed when companyId is null.

---

### H-3: `paymentVouchers.ts` — tenant_id Fallback to company_id on INSERT

**File:** `backend/src/routes/paymentVouchers.ts`  
**Line:** 370

```ts
const tenantId = (req as any).tenantId || companyId;  // Falls back to companyId!
```
Then inserts into `journal_entries.tenant_id = companyId`. This writes incorrect tenant_id values, corrupting tenant isolation at the data layer.

**Note:** The same pattern exists in `cashDeposits.ts` (line ~348, ~707) and `journals.ts` uses `(req as any).tenantId || null` which is correct.

---

### H-4: `accountRequests.ts` — No Tenant/Company Filter on `tenant_requests` Table

**File:** `backend/src/routes/accountRequests.ts`  
**Lines:** 10–22

```ts
SELECT ... FROM tenant_requests WHERE deleted_at IS NULL
```

No tenant_id or company_id filter. All pending tenant registration requests are visible to any authenticated user. Should be restricted to platform admins only.

---

## MODERATE FINDINGS

### M-1: Optional Company Filter Pattern (12+ routes)

The following routes use `companyId ? 'AND company_id = ...' : ''` making the company filter conditional. When `companyId` is null, ALL records are returned. Most of these DO use `loadCompanyContext` which would typically fail if no company can be resolved, but the pattern is fragile:

| Route File | Uses loadCompanyContext? | Risk |
|---|---|---|
| `shipmentAccounting.ts` | Yes | Low — loadCompanyContext would block |
| `shipmentCockpit.ts` | Yes | Low |
| `shipmentCompliance.ts` | Yes | Low |
| `shipmentContainers.ts` | Yes, per-route | Low |
| `shipmentCostAllocations.ts` | Yes, per-route | Low |
| `shipmentDocumentRequirements.ts` | Yes, per-route | Low |
| `shipmentExpenseTypes.ts` | Yes, per-route | Low |
| `shipmentParties.ts` | Yes, per-route | Low |
| `shippingMethods.ts` | Yes, per-route | Low |
| `receiptVouchers.ts` | Yes | Low |
| `withholdingTax.ts` | Yes (`companyContext`) | Low |
| `clearanceDocuments.ts` | Check required | Medium |
| `customsFeeCategories.ts` | Check required | Medium |
| `taxCategories.ts` | Check required | Medium |
| `taxExemptions.ts` | Check required | Medium |
| `inventoryTransfers.ts` | Check required | Medium |
| `customsReports.ts` | Yes | Low (uses companyContext) |

**Recommendation:** Replace `if (companyId)` pattern with mandatory filter:
```ts
if (!companyId) return res.status(400).json({ error: 'Company context required' });
```

---

### M-2: Routes Using `req.user!.companyId` Instead of `req.companyId`

These routes use the JWT's companyId rather than the tenant-validated `req.companyId` from `loadCompanyContext`. While they do apply `loadCompanyContext` as middleware (which would reject cross-tenant access), the pattern is inconsistent:

| Route | Has loadCompanyContext? |
|---|---|
| `expenseTypes.ts` | Yes (safe, but inconsistent) |
| `paymentRequests.ts` | Yes (safe, but inconsistent) |
| `transferRequests.ts` | Yes (safe, but inconsistent) |
| `approvals.ts` (after line 37) | Yes (safe, but inconsistent) |
| `approvals.ts` `/badge-count` | **NO** — defined before `router.use(loadCompanyContext)` |

The `/badge-count` route reads `req.user!.companyId` without any tenant validation. While this only returns a count, it could reflect data from a cross-tenant company if the JWT companyId is stale.

---

### M-3: `banks.ts` — Uses `loadCompanyContext` But No Company Filter in Queries

**File:** `backend/src/routes/banks.ts`

While it imports `loadCompanyContext`, the actual SQL queries don't appear to filter by `company_id`. Banks may be a global reference table, but should be verified.

---

## PROPERLY ISOLATED ROUTES (OK)

### Routes Using `buildTenantFilter` / `getIsolatedTenantId` (Direct Tenant Isolation):
| Route | Method |
|---|---|
| `companies.ts` | `buildTenantFilter` + `buildCompanyScopeFilter` + `getInsertTenantId` |
| `auditLogs.ts` | `buildTenantFilter` on all queries |
| `branches.ts` | `getIsolatedTenantId` + manual `tenant_id` filter |
| `branding.ts` | `getIsolatedTenantId` |
| `companySettings.ts` | `getIsolatedTenantId` + company-to-tenant verification |
| `dashboard.ts` | `getIsolatedTenantId` + tenant-scoped company subquery |
| `documents.ts` | `getIsolatedTenantId` on all CRUD |
| `emailTemplates.ts` | `getIsolatedTenantId` |
| `ipWhitelist.ts` | `getIsolatedTenantId` |
| `notifications.ts` | `getIsolatedTenantId` |
| `roles.ts` | `getIsolatedTenantId` + `companyScopeGuard` |
| `users.ts` | `getIsolatedTenantId` + `companyScopeGuard` |
| `tenantCompanies.ts` | `getIsolatedTenantId` |
| `tenantRoles.ts` | `getIsolatedTenantId` |
| `tenantBackup.ts` | `getIsolatedTenantId` |
| `tenantNotifications.ts` | `getIsolatedTenantId` |
| `tenantDataExport.ts` | `getIsolatedTenantId` |
| `scheduledReports.ts` | `getIsolatedTenantId` |
| `securityMonitor.ts` | `getIsolatedTenantId` |
| `profile.ts` | `getIsolatedTenantId` |
| `subscriptionUsage.ts` | `getIsolatedTenantId` |

### Routes Using `loadCompanyContext` with Mandatory Company Filter (Indirect Tenant Isolation):
| Route | Notes |
|---|---|
| `accounts.ts` | `req.companyId` mandatory in all queries |
| `journals.ts` | `req.companyId` mandatory, writes `req.tenantId` |
| `expenseRequests.ts` | `req.companyId` mandatory |
| `expenses.ts` | `req.companyId` mandatory |
| `shipmentExpenses.ts` | `req.companyId` mandatory |
| `shipmentExpensesV2.ts` | `req.companyId` mandatory |
| `bankAccounts.ts` | `req.companyId` mandatory |
| `openingBalances.ts` | `req.companyId` mandatory |
| `budgets.ts` | `req.companyId` mandatory |
| `fiscalPeriods.ts` | `req.companyId` mandatory |
| `accountingRules.ts` | `req.companyId` mandatory |
| `cashBoxes.ts` | `req.companyId` mandatory |
| `cashDeposits.ts` | `req.companyId` mandatory |
| `chequeBooks.ts` | `req.companyId` mandatory |
| `logisticsShipments.ts` | `req.companyId` mandatory |
| `logisticsShipmentTypes.ts` | `req.companyId` mandatory |
| `exchangeRates.ts` | `req.companyId` mandatory |
| `numberingSeries.ts` | `req.companyId` mandatory |
| `approvalDocuments.ts` | `req.companyId` mandatory |
| All `finance/*` routes | `loadCompanyContext` + mandatory filter |
| All `reports/*` routes | `loadCompanyContext` + mandatory filter |

### Stub Routes (Not Yet Implemented):
These return static messages and have no data access:
- `approvalRequests.ts`, `approvalWorkflows.ts`, `bankReconciliation.ts`, `costAllocations.ts`, `subledger.ts`, `accrualDeferrals.ts`, `currencyRevaluation.ts`, `generalExpenses.ts`, `consolidation.ts`, `consolidatedReporting.ts`

---

## MIDDLEWARE ARCHITECTURE ANALYSIS

### Global Protections (app.ts):
| Middleware | Line | Protection |
|---|---|---|
| `sanitizeTenantFromBody` | 657 | Strips `tenant_id`, `company_id` from request bodies |
| `enforceTenantIsolation` | 664 | Sets `req.tenantId`, validates `X-Tenant-Id` header |
| `resolveCompanyContext` | 690 | Sets `req.companyId` — **NO tenant validation** ⚠️ |
| `preloadCompanyScope` | 693 | Populates `req.userCompanyIds` (cached) |

### Per-Route Protections:
| Middleware | Protection |
|---|---|
| `loadCompanyContext` | **Strong** — validates company belongs to user's tenant, checks user_companies access |
| `buildTenantFilter` | **Strong** — adds `tenant_id = $N` clause to SQL |
| `getIsolatedTenantId` | **Strong** — returns tenant_id from JWT for manual filtering |
| `buildCompanyScopeFilter` | **Strong** — limits to user's assigned companies |

### Gap: `resolveCompanyContext` vs `loadCompanyContext`
The global `resolveCompanyContext` is a lightweight "best-effort" resolver meant for non-critical paths. It should NOT be trusted for data access. Any route performing SQL queries MUST use `loadCompanyContext` or `buildTenantFilter`.

---

## PRIORITY REMEDIATION PLAN

### Immediate (This Sprint):
1. **Fix `resolveCompanyContext`** — Add tenant ownership check on `X-Company-Id` header
2. **Fix `approvals.ts`** — Distinguish platform super_admin from tenant super_admin
3. **Fix `zatcaConfig.ts`** — Replace `user.tenant_id` with proper `loadCompanyContext` + `req.companyId`
4. **Fix `costElementGroups.ts`** — Same as zatcaConfig
5. **Fix `vatReturns.ts`** — Add `loadCompanyContext`, make company filter mandatory
6. **Fix `zatcaSubmissions.ts`** — Same as vatReturns
7. **Fix `cashRegisters.ts`** — Same as vatReturns
8. **Fix `accountRequests.ts`** — Add platform-admin-only guard

### Short-Term (Next Sprint):
9. **Fix `paymentVouchers.ts`** tenant_id fallback — use `getIsolatedTenantId(req)` not `companyId`
10. **Audit all `if (companyId)` optional filter patterns** — make company mandatory
11. **Standardize all routes** to use `req.companyId` from `loadCompanyContext`, not `req.user.companyId`
12. **Verify `clearanceDocuments.ts`, `customsFeeCategories.ts`, `taxCategories.ts`, `taxExemptions.ts`, `inventoryTransfers.ts`** use loadCompanyContext

### Long-Term:
13. Add automated lint rule: flag any `pool.query` in routes that doesn't reference `company_id` or `tenant_id` filter
14. Add integration tests: verify tenant A cannot see tenant B's data via header manipulation
15. Consider making `loadCompanyContext` global (replacing `resolveCompanyContext`) with a whitelist of routes that don't need it

---

*Audit performed by scanning all 180+ route files in `backend/src/routes/` and subdirectories.*
