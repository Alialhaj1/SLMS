# 🛡️ Global Route Guard Strategy

## Overview
This document defines the **protection strategy** for all routes in the application.  
Every page must follow these rules to prevent accidental security gaps.

---

## 🎯 Protection Rules

### ✅ Protected Routes (Require Authentication + Permission)

All routes under these paths **MUST** use `withPermission()` HOC:

| Path Pattern | Protection Level | Required Permission | Example |
|-------------|------------------|---------------------|---------|
| `/dashboard/**` | **Required** | Based on feature | `MenuPermissions.Dashboard.View` |
| `/accounting/**` | **Required** | Module-specific | `MenuPermissions.Accounting.Journals.View` |
| `/expenses/**` | **Required** | Module-specific | `MenuPermissions.Expenses.View` |
| `/shipments/**` | **Required** | Module-specific | `MenuPermissions.Shipments.View` |
| `/warehouses/**` | **Required** | Module-specific | `MenuPermissions.Warehouses.View` |
| `/suppliers/**` | **Required** | Module-specific | `MenuPermissions.Suppliers.View` |
| `/master-data/**` | **Required** | Module-specific | `MenuPermissions.MasterData.Items.View` |
| `/users/**` | **Required** | Admin only | `MenuPermissions.Users.View` |
| `/roles/**` | **Required** | Admin only | `MenuPermissions.Roles.View` |
| `/settings/**` | **Required** | Admin only | `MenuPermissions.System.Settings.View` |
| `/companies/**` | **Required** | Super Admin | `MenuPermissions.System.Companies.View` |
| `/audit-logs/**` | **Required** | Admin only | `MenuPermissions.System.AuditLogs.View` |

---

### 🔓 Public Routes (No Authentication Required)

These routes are accessible without login:

| Path | Purpose | Auth Required |
|------|---------|---------------|
| `/auth/login` | Login page | ❌ No |
| `/auth/forgot-password` | Password reset request | ❌ No |
| `/auth/reset-password` | Password reset form (with token) | ❌ No |
| `/public/**` | Public resources (if any) | ❌ No |
| `/404` | Not Found page | ❌ No |
| `/403` | Access Denied page | ❌ No |
| `/500` | Server Error page | ❌ No |

---

### 🟡 Semi-Protected Routes (Auth Only, No Permission Check)

These routes require authentication but no specific permission:

| Path | Purpose | Notes |
|------|---------|-------|
| `/profile` | User profile management | Any authenticated user |
| `/change-password` | Password change | Any authenticated user |
| `/notifications` | User's own notifications | Any authenticated user |

---

## 📋 Implementation Checklist

### For Every New Page:

1. **Identify the route category**:
   - Is it protected? → Use `withPermission()`
   - Is it public? → No HOC needed
   - Is it semi-protected? → Use `withAuth()` (authentication only)

2. **Choose the correct permission**:
   ```typescript
   // ✅ Correct - Use MenuPermissions constant
   export default withPermission(
     MenuPermissions.Accounting.Journals.View,
     JournalsPage
   );
   
   // ❌ Wrong - Never hardcode strings
   export default withPermission('accounting:journal:view', JournalsPage);
   ```

3. **Document in this file**:
   - Add new protected routes to the table above
   - Update sync validator if needed

4. **Test**:
   - Login as user without permission → Should see `/403`
   - Login as user with permission → Should see page
   - Not logged in → Should redirect to `/auth/login`

---

## 🔒 Automatic Protection Strategy

### Option A: Explicit Protection (Current Approach)
- Every protected page must explicitly use `withPermission()`
- **Pros**: Clear, explicit, easy to understand
- **Cons**: Easy to forget on new pages

### Option B: Default Protection (Middleware Approach) - FUTURE
```typescript
// In _app.tsx or middleware
const publicPaths = ['/auth', '/public', '/404', '/403', '/500'];
const semiProtectedPaths = ['/profile', '/notifications'];

if (!publicPaths.includes(path)) {
  // Apply default authentication check
  if (!semiProtectedPaths.includes(path)) {
    // Apply permission check based on route
  }
}
```

**Status**: Not implemented yet. Consider for v2.0.

---

## 🚨 Security Rules (NEVER VIOLATE)

### 1. **Never skip `withPermission()` on protected routes**
```typescript
// ❌ FORBIDDEN
export default function AdminPage() { ... }

// ✅ REQUIRED
export default withPermission(MenuPermissions.Users.View, AdminPage);
```

### 2. **Never trust Frontend-only permission checks**
Backend **MUST** have matching `requirePermission()` middleware:
```typescript
// Backend route
router.get('/api/journals', 
  requirePermission('accounting:journal:view'), // ✅ Required
  getJournals
);
```

### 3. **Never reuse permissions across unrelated resources**
```typescript
// ❌ Wrong - Same permission for different resources
const JournalsPermission = 'accounting:view';
const AccountsPermission = 'accounting:view'; // ❌ Too generic

// ✅ Correct - Specific permissions
const JournalsPermission = 'accounting:journal:view';
const AccountsPermission = 'accounting:accounts:view';
```

### 4. **Never bypass permissions for "convenience"**
```typescript
// ❌ FORBIDDEN
if (user.role === 'admin') {
  // Skip permission check - NEVER DO THIS
  return <AdminPanel />;
}

// ✅ REQUIRED
// Let the permission system handle it
export default withPermission(MenuPermissions.Admin.Panel, AdminPanel);
```

---

## 🎯 Success Criteria

Route protection is **complete** when:

1. ✅ Every protected route has `withPermission()` HOC
2. ✅ Every Frontend permission matches a Backend `requirePermission()`
3. ✅ Sync validator passes with 100% match
4. ✅ Manual test: User without permission sees `/403`
5. ✅ Audit logs capture permission denial events
6. ✅ This strategy document is updated with new routes

---

## 📊 Current Status

- **Total Protected Routes**: ~40 (estimated from menu structure)
- **Routes with `withPermission()`**: 1 ([accounting/journals/index.tsx](../pages/accounting/journals/index.tsx))
- **Sync Status**: ✅ 100% (63 Backend ↔ 63 Frontend permissions)
- **Next Action**: Apply `withPermission()` to remaining routes

---

## 🔧 Validation Commands

```bash
# Check permission sync (Backend ↔ Frontend)
npm run permissions:sync

# Validate menu structure
npm run menu:validate

# Type check
npm run type-check

# Full validation
npm run validate:all # (To be created)
```

---

## 📚 Related Documents

- [GOLDEN_RULES.md](../../GOLDEN_RULES.md) - Rule #5: Permission Mirroring
- [NEXT_STEPS.md](../../NEXT_STEPS.md) - Security Hardening roadmap
- [menu.permissions.ts](../config/menu.permissions.ts) - Permission constants
- [withPermission.tsx](../utils/withPermission.tsx) - Route guard HOC
- [PERMISSION_MAPPING.md](../../backend/docs/PERMISSION_MAPPING.md) - Backend mapping

---

## 🚀 Next Steps

1. **Week 1 Priority** (Now):
   - Apply `withPermission()` to all existing pages (40 routes)
   - Estimated time: 1-2 hours

2. **Week 2**:
   - Create automated test: "Ensure all non-public routes have protection"
   - Add pre-commit hook: Run `permissions:sync` before every commit

3. **Week 3+**:
   - Consider middleware-based automatic protection (Option B above)
   - Add ESLint rule: Flag pages without `withPermission()` in protected paths

---

**Last Updated**: December 22, 2025  
**Status**: ✅ Strategy Defined | ⏳ Implementation In Progress
