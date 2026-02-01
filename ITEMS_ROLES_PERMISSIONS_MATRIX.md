# 🔐 Items Module - Roles & Permissions Matrix

**Purpose**: Define granular access control for Items module based on user roles.

**Last Updated**: January 31, 2026

---

## 📊 Permission Codes Structure

**Format**: `resource:action` or `resource:action_detail`

**Example**: `master:items:edit_policies` = Edit locked policy fields for items with movements

---

## 🎭 Role Definitions

| **Role** | **Scope** | **Typical Users** |
|---|---|---|
| **super_admin** | Full system access, bypasses all checks | System owner, CTO |
| **admin** | Company-wide admin, can override locks | Finance Manager, Operations Director |
| **warehouse_manager** | Manage items, inventory, movements | Warehouse Supervisor |
| **inventory_clerk** | Data entry, view-only on locked items | Inventory Assistant, Stock Clerk |
| **accountant** | View items, approve GL account assignments | Chief Accountant, Finance Team |
| **viewer** | Read-only access to items | Sales Team, Reports Only |

---

## 📋 Complete Permissions Matrix

### 1. Item Basic Operations

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| View items list | `master:items:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View item profile | `master:items:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create new item | `master:items:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit item (basic fields) | `master:items:edit` | ✅ | ✅ | ✅ | ✅¹ | ❌ | ❌ |
| Delete item (no movements) | `master:items:delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deactivate item | `master:items:deactivate` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Notes**:
- ¹ Inventory Clerk can only edit if item has no movements

---

### 2. Policy Fields (Phase 2 Locked Fields)

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| Edit base_uom (no movement) | `master:items:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit base_uom (has movement) | `master:items:edit_policies` | ✅ | ✅ | ⚠️² | ❌ | ❌ | ❌ |
| Edit tracking_policy (no movement) | `master:items:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit tracking_policy (has movement) | `master:items:edit_policies` | ✅ | ✅ | ⚠️² | ❌ | ❌ | ❌ |
| Edit valuation_method (no movement) | `master:items:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit valuation_method (has movement) | `master:items:edit_policies` | ✅ | ✅ | ⚠️² | ❌ | ❌ | ❌ |
| Edit is_composite (no movement) | `master:items:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit is_composite (has movement) | `master:items:edit_policies` | ✅ | ✅ | ⚠️² | ❌ | ❌ | ❌ |

**Notes**:
- ² Warehouse Manager requires approval workflow (Phase 3 enhancement)

---

### 3. Advanced Operations

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| Force delete (has movements) | `master:items:force_delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Restore deleted item | `master:items:restore` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archive item | `master:items:archive` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unarchive item | `master:items:unarchive` | ✅ | ✅ | ⚠️³ | ❌ | ❌ | ❌ |
| View audit trail | `master:items:audit` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export items data | `master:items:export` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Notes**:
- ³ Warehouse Manager can unarchive only if approved by admin

---

### 4. Item Groups Management

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| View groups | `master:items:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create group | `master:items:edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit group | `master:items:edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change parent_id (has items) | `master:items:edit_policies` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete group (has items) | `master:items:force_delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete group (empty) | `master:items:delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### 5. GL Account Assignments (Accounting Integration)

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| View GL accounts | `master:items:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign inventory_account | `master:items:edit_gl_accounts` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Assign cogs_account | `master:items:edit_gl_accounts` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Assign adjustment_account | `master:items:edit_gl_accounts` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

### 6. Diagnostics & Reporting (Phase 3)

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| View diagnostics tab | `master:items:diagnostics` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Fix diagnostic errors | `master:items:edit` | ✅ | ✅ | ✅ | ❌ | ⚠️⁴ | ❌ |
| Run item health report | `master:items:reports` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View movement analytics | `master:items:analytics` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notes**:
- ⁴ Accountant can fix only GL account related errors

---

### 7. Lifecycle State Transitions (Phase 3)

| **Action** | **Permission Code** | **super_admin** | **admin** | **warehouse_manager** | **inventory_clerk** | **accountant** | **viewer** |
|---|---|---|---|---|---|---|---|
| Draft → Active | `master:items:activate` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Active → Frozen | `master:items:freeze` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Frozen → Active | `master:items:activate` | ✅ | ✅ | ⚠️⁵ | ❌ | ❌ | ❌ |
| Active → Discontinued | `master:items:discontinue` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discontinued → Archived | `master:items:archive` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archived → Active | `master:items:unarchive` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- ⁵ Warehouse Manager requires diagnostics errors to be resolved first

---

## 🔧 Implementation Guide

### Backend Permission Seeds (SQL)

```sql
-- Phase 2 Permissions (Already Implemented)
INSERT INTO permissions (permission_code, resource, action, description, description_ar) VALUES
  ('master:items:view', 'items', 'view', 'View items and profiles', 'عرض الأصناف'),
  ('master:items:create', 'items', 'create', 'Create new items', 'إنشاء أصناف جديدة'),
  ('master:items:edit', 'items', 'edit', 'Edit item basic fields', 'تعديل الأصناف'),
  ('master:items:delete', 'items', 'delete', 'Delete items without movements', 'حذف الأصناف'),
  ('master:items:restore', 'items', 'restore', 'Restore deleted items', 'استعادة الأصناف المحذوفة');

-- Phase 3 Permissions (New)
INSERT INTO permissions (permission_code, resource, action, description, description_ar) VALUES
  ('master:items:edit_policies', 'items', 'edit_policies', 'Edit locked policy fields', 'تعديل حقول السياسات المقفلة'),
  ('master:items:edit_gl_accounts', 'items', 'edit_gl_accounts', 'Edit GL account assignments', 'تعديل حسابات دليل الحسابات'),
  ('master:items:force_delete', 'items', 'force_delete', 'Delete items with movements', 'حذف أصناف لها حركات'),
  ('master:items:deactivate', 'items', 'deactivate', 'Deactivate active items', 'إيقاف الأصناف النشطة'),
  ('master:items:archive', 'items', 'archive', 'Archive items', 'أرشفة الأصناف'),
  ('master:items:unarchive', 'items', 'unarchive', 'Unarchive items', 'إلغاء أرشفة الأصناف'),
  ('master:items:diagnostics', 'items', 'diagnostics', 'View diagnostics tab', 'عرض تبويب التشخيص'),
  ('master:items:reports', 'items', 'reports', 'Run item reports', 'تشغيل تقارير الأصناف'),
  ('master:items:analytics', 'items', 'analytics', 'View movement analytics', 'عرض تحليلات الحركات'),
  ('master:items:audit', 'items', 'audit', 'View audit trail', 'عرض سجل التدقيق'),
  ('master:items:export', 'items', 'export', 'Export items data', 'تصدير بيانات الأصناف'),
  ('master:items:activate', 'items', 'activate', 'Activate draft items', 'تفعيل الأصناف'),
  ('master:items:freeze', 'items', 'freeze', 'Freeze items', 'تجميد الأصناف'),
  ('master:items:discontinue', 'items', 'discontinue', 'Discontinue items', 'إيقاف الأصناف تدريجياً');
```

---

### Role Permission Assignments (SQL)

```sql
-- Admin Role (All Permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
WHERE permission_code LIKE 'master:items:%';

-- Warehouse Manager Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'warehouse_manager'),
  id
FROM permissions
WHERE permission_code IN (
  'master:items:view',
  'master:items:create',
  'master:items:edit',
  'master:items:delete',
  'master:items:deactivate',
  'master:items:restore',
  'master:items:archive',
  'master:items:diagnostics',
  'master:items:reports',
  'master:items:analytics',
  'master:items:audit',
  'master:items:export',
  'master:items:activate',
  'master:items:freeze',
  'master:items:discontinue'
);

-- Inventory Clerk Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'inventory_clerk'),
  id
FROM permissions
WHERE permission_code IN (
  'master:items:view',
  'master:items:create',
  'master:items:edit',
  'master:items:analytics',
  'master:items:export'
);

-- Accountant Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'accountant'),
  id
FROM permissions
WHERE permission_code IN (
  'master:items:view',
  'master:items:edit_gl_accounts',
  'master:items:diagnostics',
  'master:items:reports',
  'master:items:analytics',
  'master:items:audit',
  'master:items:export'
);

-- Viewer Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'viewer'),
  id
FROM permissions
WHERE permission_code IN (
  'master:items:view',
  'master:items:analytics'
);
```

---

## 🧪 Testing Scenarios

### Test Case 1: Inventory Clerk Cannot Edit Locked Item
```javascript
// User: inventory_clerk
// Item: has_movement = true

PUT /api/master/items/123 { base_uom_id: 2 }

Expected Response:
{
  "success": false,
  "error": {
    "code": "ITEM_POLICY_LOCKED",
    "message": "Cannot modify policy fields after item has movements",
    "required_permission": "master:items:edit_policies"
  }
}
```

---

### Test Case 2: Admin Can Override Lock
```javascript
// User: admin (has master:items:edit_policies)
// Item: has_movement = true

PUT /api/master/items/123 { base_uom_id: 2 }

Expected Response:
{
  "success": true,
  "data": { ... },
  "warning": "Policy field changed after movements - audit logged"
}
```

---

### Test Case 3: Accountant Can Edit GL Accounts Only
```javascript
// User: accountant
// Item: any

PUT /api/master/items/123 { inventory_account_id: 456 }
✅ Expected: Success

PUT /api/master/items/123 { name: "New Name" }
❌ Expected: 403 Forbidden (missing master:items:edit)
```

---

## 📊 Permission Usage Report

**Query to track permission usage**:
```sql
SELECT 
  p.permission_code,
  p.description,
  COUNT(DISTINCT al.user_id) as users_count,
  COUNT(al.id) as total_uses,
  MAX(al.timestamp) as last_used
FROM audit_logs al
JOIN permissions p ON al.permission_code = p.permission_code
WHERE al.timestamp >= NOW() - INTERVAL '30 days'
  AND p.permission_code LIKE 'master:items:%'
GROUP BY p.permission_code, p.description
ORDER BY total_uses DESC;
```

---

## 🔐 Security Best Practices

1. **Principle of Least Privilege**: Users get only permissions they need
2. **Separation of Duties**: Accountants can't create items, Warehouse can't edit GL accounts
3. **Audit Trail**: All permission usage logged in `audit_logs` table
4. **Permission Inheritance**: `super_admin` bypasses all checks (hardcoded)
5. **Dynamic Checks**: `has_movement` check happens at runtime, not cached
6. **Error Transparency**: Clear error messages with required_permission field

---

## 📝 Frontend Permission Checks

```tsx
// hooks/usePermissions.ts enhancement
export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission: string) => {
    if (user.roles.includes('super_admin')) return true;
    return user.permissions.includes(permission);
  };
  
  const canEditPolicies = (item: Item) => {
    if (!item.has_movement) {
      return hasPermission('master:items:edit');
    }
    return hasPermission('master:items:edit_policies');
  };
  
  const canDelete = (item: Item) => {
    if (!item.has_movement) {
      return hasPermission('master:items:delete');
    }
    return hasPermission('master:items:force_delete');
  };
  
  return { hasPermission, canEditPolicies, canDelete };
};
```

---

## 🎯 Summary

**Total Permissions**: 18 (5 Phase 2 + 13 Phase 3)  
**Roles Covered**: 6 (super_admin, admin, warehouse_manager, inventory_clerk, accountant, viewer)  
**Permission Layers**: 3 (basic operations, policy fields, advanced operations)  

**Key Principle**: **Locked items require elevated permissions** (`edit_policies` vs `edit`)

**Next Steps**:
1. Add permission seeds to migration
2. Update backend middleware to check `edit_policies` for locked items
3. Update frontend `usePermissions` hook with `canEditPolicies` function
4. Test all 3 scenarios (no movement, has movement + no permission, has movement + permission)
