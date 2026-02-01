# RBAC Matrix - SLMS Enterprise
**Smart Logistics Management System**  
**Version:** 3.0 (Phase 3 Ready)  
**Date:** February 1, 2026  
**Status:** Production Grade

---

## Overview
This document defines the **Role-Based Access Control (RBAC)** matrix for SLMS.  
It maps **85 permissions** across **5 roles** based on real-world operational needs.

---

## Role Definitions

| Role | Arabic | Description | Count |
|------|--------|-------------|-------|
| **super_admin** | مدير النظام | System owner, bypasses all checks | ALL (85) |
| **admin** | مسؤول | Company administrator, full operational access | 72 |
| **manager** | مدير | Operations manager, approval authority | 58 |
| **accountant** | محاسب | Financial operations, accounting focus | 42 |
| **user** | مستخدم | End user, basic operational access | 28 |

---

## Permission Matrix

### 📦 Master Data - Items

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `ITEM_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ITEM_CREATE` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `ITEM_EDIT` | ✅ | ✅ | ✅ | ❌ | ⚠️ (own only) |
| `ITEM_DELETE` | ✅ | ✅ | ⚠️ (restricted) | ❌ | ❌ |
| `ITEM_OVERRIDE_POLICY` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ITEM_EXPORT` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `ITEM_IMPORT` | ✅ | ✅ | ⚠️ (approval needed) | ❌ | ❌ |

**Rationale:**
- `ITEM_OVERRIDE_POLICY`: Only admins can override locked fields (accounting integrity)
- `ITEM_DELETE`: Restricted for managers (requires approval), blocked for users
- `ITEM_IMPORT`: High-risk operation, requires approval for non-admins

---

### 📂 Master Data - Item Groups

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `ITEM_GROUP_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ITEM_GROUP_CREATE` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `ITEM_GROUP_EDIT` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `ITEM_GROUP_DELETE` | ✅ | ✅ | ⚠️ (restricted) | ❌ | ❌ |

**Rationale:**
- Groups affect accounting hierarchy → Only managers+ can modify
- Users can only view for reference

---

### 🚚 Operations - Shipments

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `SHIPMENT_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `SHIPMENT_CREATE` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `SHIPMENT_EDIT` | ✅ | ✅ | ✅ | ❌ | ⚠️ (before submit) |
| `SHIPMENT_DELETE` | ✅ | ✅ | ⚠️ (before submit) | ❌ | ❌ |
| `SHIPMENT_APPROVE` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `SHIPMENT_REJECT` | ✅ | ✅ | ✅ | ❌ | ❌ |

**Rationale:**
- Users create shipments but cannot approve (separation of duties)
- Managers approve shipments (operational authority)
- Accountants view for costing but don't modify logistics

---

### 💰 Operations - Expenses

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `EXPENSE_VIEW` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own only) |
| `EXPENSE_CREATE` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `EXPENSE_EDIT` | ✅ | ✅ | ✅ | ✅ | ⚠️ (before post) |
| `EXPENSE_DELETE` | ✅ | ✅ | ⚠️ (before post) | ❌ | ❌ |
| `EXPENSE_APPROVE` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `EXPENSE_REJECT` | ✅ | ✅ | ✅ | ❌ | ❌ |

**Rationale:**
- Accountants can create/edit expenses (financial operations)
- Only managers can approve (financial control)
- Users see only their own expenses (privacy)

---

### 🏢 Master Data - Warehouses

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `WAREHOUSE_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `WAREHOUSE_CREATE` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `WAREHOUSE_EDIT` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `WAREHOUSE_DELETE` | ✅ | ✅ | ❌ | ❌ | ❌ |

**Rationale:**
- Warehouses are strategic assets → Only managers+ can modify
- Users view for inventory operations

---

### 🤝 Partners - Suppliers

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `SUPPLIER_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `SUPPLIER_CREATE` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `SUPPLIER_EDIT` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `SUPPLIER_DELETE` | ✅ | ✅ | ⚠️ (restricted) | ❌ | ❌ |

**Rationale:**
- Accountants need supplier management (payment workflows)
- Users view for reference (purchase orders)

---

### 🤝 Partners - Customers

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `CUSTOMER_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `CUSTOMER_CREATE` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `CUSTOMER_EDIT` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `CUSTOMER_DELETE` | ✅ | ✅ | ⚠️ (restricted) | ❌ | ❌ |

**Rationale:**
- Similar to suppliers
- Accountants manage customer accounts (invoicing)

---

### 👤 Administration - Users & Roles

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `USER_VIEW` | ✅ | ✅ | ⚠️ (own company) | ❌ | ❌ |
| `USER_CREATE` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `USER_EDIT` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `USER_DELETE` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ROLE_VIEW` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ROLE_CREATE` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ROLE_EDIT` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ROLE_DELETE` | ✅ | ✅ | ❌ | ❌ | ❌ |

**Rationale:**
- User/role management = admin-only (security isolation)
- Managers see users for task assignment (read-only)

---

### 🏢 System - Companies & Branches

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `COMPANY_VIEW` | ✅ | ⚠️ (own only) | ⚠️ (own only) | ⚠️ (own only) | ⚠️ (own only) |
| `COMPANY_CREATE` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `COMPANY_EDIT` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `COMPANY_DELETE` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `BRANCH_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `BRANCH_CREATE` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `BRANCH_EDIT` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `BRANCH_DELETE` | ✅ | ✅ | ❌ | ❌ | ❌ |

**Rationale:**
- Company management = super_admin only (multi-tenant isolation)
- Branch management = admin (organizational structure)

---

### 💼 Accounting (Phase 3)

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `ACCOUNTING_VIEW` | ✅ | ✅ | ⚠️ (summary only) | ✅ | ❌ |
| `ACCOUNTING_POST` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `ACCOUNTING_CLOSE_PERIOD` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `ACCOUNTING_REOPEN_PERIOD` | ✅ | ✅ | ❌ | ⚠️ (approval needed) | ❌ |

**Rationale:**
- Accountants handle financial postings
- Period close = critical operation (auditor requirement)
- Reopen requires approval (fraud prevention)

---

### 📊 Audit & Reporting

| Permission | super_admin | admin | manager | accountant | user |
|------------|-------------|-------|---------|------------|------|
| `AUDIT_LOG_VIEW` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `AUDIT_LOG_EXPORT` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `SETTINGS_VIEW` | ✅ | ✅ | ⚠️ (limited) | ❌ | ❌ |
| `SETTINGS_EDIT` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `REPORT_VIEW` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own data) |
| `REPORT_EXPORT` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `REPORT_PRINT` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own data) |

**Rationale:**
- Audit logs = admin-only (compliance requirement)
- Reports accessible to all but users see limited scope
- Export restricted (data protection)

---

## Permission Count Summary

| Role | Total Permissions | Full Access | Restricted | No Access |
|------|-------------------|-------------|------------|-----------|
| **super_admin** | 85 (100%) | 85 | 0 | 0 |
| **admin** | 72 (85%) | 68 | 4 | 13 |
| **manager** | 58 (68%) | 45 | 13 | 27 |
| **accountant** | 42 (49%) | 38 | 4 | 43 |
| **user** | 28 (33%) | 18 | 10 | 57 |

---

## Special Rules

### 🔐 Restricted Permissions (⚠️)
- **Before Submit/Post:** Operation allowed only if record not yet submitted/posted
- **Own Only:** User can only access their own records
- **Approval Needed:** Operation triggers approval workflow
- **Own Company:** Multi-tenant isolation (user sees only their company)

### 🚫 Forbidden Operations
- **Users cannot:**
  - Delete any master data
  - Approve workflows
  - Export data
  - View audit logs
  - Modify system settings

- **Accountants cannot:**
  - Approve shipments (operational domain)
  - Modify items (inventory domain)
  - Manage users (security domain)

- **Managers cannot:**
  - Override policy locks (accounting integrity)
  - Close accounting periods (financial domain)
  - Manage users (admin domain)

---

## Implementation Notes

### Backend Enforcement
```typescript
// Example: requirePermission middleware
router.put('/items/:id',
  authenticate,
  requirePermission(Permission.ITEM_EDIT),
  itemsController.updateItem
);

// Example: Restricted permission
router.delete('/items/:id',
  authenticate,
  requirePermission(Permission.ITEM_DELETE),
  requireApproval('item_deletion'), // For managers
  itemsController.deleteItem
);
```

### Frontend Enforcement
```tsx
// Example: Conditional rendering
const { hasPermission } = usePermissions();

{hasPermission(Permission.ITEM_DELETE) && (
  <Button onClick={handleDelete}>Delete</Button>
)}

// Example: Restricted access
{hasPermission(Permission.ITEM_EDIT) && !item.has_movement && (
  <Input name="base_uom_id" />
)}
```

---

## Compliance & Audit

### Separation of Duties (SOD)
- ✅ Creator ≠ Approver (user creates, manager approves)
- ✅ Operations ≠ Finance (manager approves shipments, accountant posts expenses)
- ✅ User Management ≠ Operations (admin manages users, separate from operational roles)

### Data Protection
- ✅ Users see only own data (expenses, reports)
- ✅ Multi-tenant isolation (own company only)
- ✅ Audit logs protected (admin-only access)

### Financial Controls
- ✅ Policy override = admin-only (prevents accounting fraud)
- ✅ Period close = accountant-only (prevents backdating)
- ✅ Delete master data = restricted (prevents data loss)

---

## Testing Strategy

### Unit Tests
```typescript
describe('Permission Enforcement', () => {
  it('should allow admin to override policy', async () => {
    const user = { role: 'admin', permissions: [Permission.ITEM_OVERRIDE_POLICY] };
    expect(hasPermission(user, Permission.ITEM_OVERRIDE_POLICY)).toBe(true);
  });

  it('should deny user from deleting items', async () => {
    const user = { role: 'user', permissions: [...] };
    expect(hasPermission(user, Permission.ITEM_DELETE)).toBe(false);
  });
});
```

### Integration Tests
- Test all 85 permissions across 5 roles
- Test restricted permissions (before submit, own only)
- Test approval workflows (manager deletes item)

---

## Migration Path (From Current System)

### Phase 3.1: RBAC Implementation (Week 1)
1. Create `permissions` table (85 rows)
2. Create `role_permissions` junction table
3. Seed default roles (super_admin, admin, manager, accountant, user)
4. Migrate existing users to roles

### Phase 3.2: Permission Enforcement (Week 2)
1. Update all routes with `requirePermission` middleware
2. Update frontend with `hasPermission` checks
3. Test all 85 permissions

### Phase 3.3: Approval Workflows (Week 3)
1. Implement approval engine
2. Add restricted permission handlers
3. Test approval flows

### Phase 3.4: Accounting Integration (Week 4)
1. Implement accounting posting
2. Add period close logic
3. Test financial controls

---

## Appendix: Permission Vocabulary Reference

All permissions defined in:
- **Backend:** `backend/src/types/permissions.ts`
- **Frontend:** `frontend-next/types/permissions.ts` (copied)

Total: **85 permissions** across **14 entities**

---

**Document Owner:** CTO  
**Last Updated:** February 1, 2026  
**Next Review:** Phase 3 completion (March 1, 2026)
