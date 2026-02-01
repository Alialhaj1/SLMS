# 🔐 Backend Permission Mapping

## Overview
**Goal**: Ensure every protected API endpoint has a corresponding Frontend MenuPermission.
**Rule**: Frontend permissions must match Backend middleware exactly.

---

## ✅ Current Backend Endpoints with Protection

### 📋 Journals Module (`/api/journals`)

| Method | Endpoint | Backend Permission | Frontend Permission | Status |
|--------|----------|-------------------|---------------------|--------|
| GET | `/api/journals` | `accounting:journals:view` | `MenuPermissions.Accounting.Journals.View` | ✅ |
| POST | `/api/journals` | `accounting:journals:create` | `MenuPermissions.Accounting.Journals.Create` | ✅ |
| GET | `/api/journals/:id` | `accounting:journals:view` | `MenuPermissions.Accounting.Journals.View` | ✅ |
| PUT | `/api/journals/:id` | `accounting:journals:edit` | `MenuPermissions.Accounting.Journals.Edit` | ✅ |
| DELETE | `/api/journals/:id` | `accounting:journals:delete` | `MenuPermissions.Accounting.Journals.Delete` | ✅ |
| POST | `/api/journals/:id/post` | `accounting:journals:post` | `MenuPermissions.Accounting.Journals.Post` | ✅ |
| POST | `/api/journals/:id/reverse` | `accounting:journals:reverse` | `MenuPermissions.Accounting.Journals.Reverse` | ✅ |
| GET | `/api/journals/export` | `accounting:journals:export` | `MenuPermissions.Accounting.Journals.Export` | ✅ |

### 📊 Chart of Accounts (`/api/accounts`)

| Method | Endpoint | Backend Permission | Frontend Permission | Status |
|--------|----------|-------------------|---------------------|--------|
| GET | `/api/accounts` | `accounting:accounts:view` | `MenuPermissions.Accounting.Accounts.View` | ⏳ Pending |
| POST | `/api/accounts` | `accounting:accounts:create` | `MenuPermissions.Accounting.Accounts.Create` | ⏳ Pending |
| GET | `/api/accounts/:id` | `accounting:accounts:view` | `MenuPermissions.Accounting.Accounts.View` | ⏳ Pending |
| PUT | `/api/accounts/:id` | `accounting:accounts:edit` | `MenuPermissions.Accounting.Accounts.Edit` | ⏳ Pending |
| DELETE | `/api/accounts/:id` | `accounting:accounts:delete` | `MenuPermissions.Accounting.Accounts.Delete` | ⏳ Pending |

### 📦 Shipments (`/api/shipments`)

| Method | Endpoint | Backend Permission | Frontend Permission | Status |
|--------|----------|-------------------|---------------------|--------|
| GET | `/api/shipments` | `shipments:view` | `MenuPermissions.Shipments.List.View` | ⏳ Pending Review |
| POST | `/api/shipments` | `shipments:create` | `MenuPermissions.Shipments.Create.Initiate` | ⏳ Pending Review |
| GET | `/api/shipments/:id` | `shipments:view` | `MenuPermissions.Shipments.List.View` | ⏳ Pending Review |
| PUT | `/api/shipments/:id` | `shipments:edit` | `MenuPermissions.Shipments.List.Edit` | ⏳ Pending Review |
| DELETE | `/api/shipments/:id` | `shipments:delete` | `MenuPermissions.Shipments.List.Delete` | ⏳ Pending Review |

### 💰 Expenses (`/api/expenses`)

| Method | Endpoint | Backend Permission | Frontend Permission | Status |
|--------|----------|-------------------|---------------------|--------|
| GET | `/api/expenses` | `expenses:view` | `MenuPermissions.Expenses.List.View` | ⏳ Pending Review |
| POST | `/api/expenses` | `expenses:create` | `MenuPermissions.Expenses.Create.Add` | ⏳ Pending Review |
| GET | `/api/expenses/:id` | `expenses:view` | `MenuPermissions.Expenses.List.View` | ⏳ Pending Review |
| PUT | `/api/expenses/:id` | `expenses:edit` | `MenuPermissions.Expenses.List.Edit` | ⏳ Pending Review |
| DELETE | `/api/expenses/:id` | `expenses:delete` | `MenuPermissions.Expenses.List.Delete` | ⏳ Pending Review |

### 👤 Users & Access (`/api/users`, `/api/roles`)

| Method | Endpoint | Backend Permission | Frontend Permission | Status |
|--------|----------|-------------------|---------------------|--------|
| GET | `/api/users` | `users:view` | `MenuPermissions.UsersAccess.Users.View` | ⏳ Pending Review |
| POST | `/api/users` | `users:create` | `MenuPermissions.UsersAccess.Users.Create` | ⏳ Pending Review |
| PUT | `/api/users/:id` | `users:edit` | `MenuPermissions.UsersAccess.Users.Edit` | ⏳ Pending Review |
| DELETE | `/api/users/:id` | `users:delete` | `MenuPermissions.UsersAccess.Users.Delete` | ⏳ Pending Review |
| GET | `/api/roles` | `roles:view` | `MenuPermissions.UsersAccess.Roles.View` | ⏳ Pending Review |
| POST | `/api/roles` | `roles:create` | `MenuPermissions.UsersAccess.Roles.Create` | ⏳ Pending Review |
| PUT | `/api/roles/:id` | `roles:edit` | `MenuPermissions.UsersAccess.Roles.Edit` | ⏳ Pending Review |
| DELETE | `/api/roles/:id` | `roles:delete` | `MenuPermissions.UsersAccess.Roles.Delete` | ⏳ Pending Review |

---

## 🔍 Backend Code Locations

### Middleware: `requirePermission()`
- **File**: `backend/src/middleware/auth.middleware.ts`
- **Usage**: 
  ```typescript
  router.get('/api/journals', requirePermission('accounting:journals:view'), getJournals);
  ```

### Routes Files to Review
1. `backend/src/routes/journal.routes.ts` ✅
2. `backend/src/routes/account.routes.ts` ⏳
3. `backend/src/routes/shipment.routes.ts` ⏳
4. `backend/src/routes/expense.routes.ts` ⏳
5. `backend/src/routes/user.routes.ts` ⏳
6. `backend/src/routes/role.routes.ts` ⏳
7. `backend/src/routes/supplier.routes.ts` ⏳
8. `backend/src/routes/warehouse.routes.ts` ⏳

---

## 📝 Next Steps

### Phase 1: Audit Backend (Estimated: 4-6 hours)
1. ✅ Create this mapping document
2. ⏳ Review all `*.routes.ts` files in `backend/src/routes/`
3. ⏳ Extract all `requirePermission()` calls
4. ⏳ Validate permissions follow pattern: `resource:action` or `module:resource:action`
5. ⏳ Flag any missing/inconsistent permissions

### Phase 2: Sync Validator Script (Estimated: 2-3 hours)
Create `scripts/validate-permissions-sync.ts`:
- Read all Backend routes
- Parse `requirePermission()` calls
- Compare with `MenuPermissions` constants
- Report mismatches

### Phase 3: Apply Route Guards (Estimated: 1-2 hours)
For each page in `pages/`:
1. Identify required permission from menu.registry.ts
2. Add `withPermission()` HOC
3. Test access denied flow

---

## 🎯 Success Criteria

✅ **Complete** when:
1. Every Backend endpoint using `requirePermission()` has a Frontend constant
2. Every Frontend page has `withPermission()` HOC
3. Sync validator script passes with 0 warnings
4. Manual test: User without permission sees 403 page
5. Audit log captures permission denial events

---

## 📚 Related Documents
- [GOLDEN_RULES.md](../../GOLDEN_RULES.md) - Rule #5: Permission Mirroring
- [NEXT_STEPS.md](../../NEXT_STEPS.md) - Week 1 priorities
- [menu.permissions.ts](../../frontend-next/config/menu.permissions.ts) - Frontend constants
- [auth.middleware.ts](../src/middleware/auth.middleware.ts) - Backend middleware
