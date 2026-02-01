# MASTER DATA IMPLEMENTATION QUICK START GUIDE
## Get Started in 5 Minutes

**For**: Development Team
**Created**: December 27, 2025
**Duration**: Complete in 20 days (MVP: Phases 1-5)

---

## 🚀 5-Minute Onboarding

### Step 1: Read the Roadmap (2 min)
- 📄 [MASTER_DATA_IMPLEMENTATION_PLAN.md](MASTER_DATA_IMPLEMENTATION_PLAN.md) - Strategy & approach
- 📋 [MASTER_DATA_ENTITY_INVENTORY.md](MASTER_DATA_ENTITY_INVENTORY.md) - All 118 entities detailed
- ✅ [MASTER_DATA_IMPLEMENTATION_CHECKLIST.md](MASTER_DATA_IMPLEMENTATION_CHECKLIST.md) - Progress tracking

### Step 2: Understand the Structure (2 min)

**10 Phases** organized by dependency:
```
PHASE 1: System & Settings        (11 entities)  → Foundation
    ↓
PHASE 2: Reference Data           (12 entities)  → Lookups
    ↓
PHASE 3: Items & Inventory        (14 entities)  → Products
    ↓
PHASE 4: Customers & Suppliers    (14 entities)  → Parties
    ↓
PHASE 5: Accounting & Finance     (14 entities)  → GL
    ↓
PHASE 6: Logistics & Import       (17 entities)  → Shipping
    ↓
PHASE 7: Tax & Zakat             (7 entities)   → Compliance
    ↓
PHASE 8: HR                       (10 entities)  → Payroll
    ↓
PHASE 9: Documents & Templates    (9 entities)   → Workflows
    ↓
PHASE 10: Control & Permissions   (10 entities)  → Governance
```

### Step 3: Get Current Status (1 min)

**Already Completed** (23/69 MVP):
- ✅ Phase 1: 10/11 (Default UI Theme, Printed Templates)
- ✅ Phase 2: 11/12 (All except Exchange Rates)
- ✅ Phase 4: 2/14 (Customer Groups, Payment Terms)

**Remaining for MVP** (46/69):
- ⏳ Phase 1: 1/11 (Companies, Branches, Users, Roles, System Setup, Numbering Series, Languages, Backup, Policies)
- ⏳ Phase 3: 14/14 (All items & inventory)
- ⏳ Phase 4: 12/14 (Customers, Suppliers, Payment Methods, etc.)
- ⏳ Phase 5: 14/14 (Chart of Accounts, GL setup, Fiscal Periods, etc.)

---

## 📋 IMPLEMENTATION WORKFLOW (For Each Entity)

### Step 1: Backend API (2 hours)
```bash
# 1. Create database migration
backend/migrations/XXX_create_tablename.sql
- CREATE TABLE {entity_name}
- Add primary key, foreign keys, indexes
- Add audit columns (created_at, updated_at, deleted_at)

# 2. Create REST API endpoints
backend/src/routes/{entity-name}.ts
- GET /api/master/{entity-name} (list with filters, pagination)
- POST /api/master/{entity-name} (create)
- GET /api/master/{entity-name}/:id (read)
- PUT /api/master/{entity-name}/:id (update)
- DELETE /api/master/{entity-name}/:id (soft delete)

# 3. Add permission checks
Add middleware: requirePermission('{entity}:view'), requirePermission('{entity}:create'), etc.

# 4. Test endpoints
curl -H "Authorization: Bearer {token}" http://localhost:4000/api/master/{entity-name}
```

### Step 2: Frontend Page (1.5 hours)
```bash
# 1. Create page component
frontend-next/pages/master/{entity-name}.tsx

import MasterDataLayout from '@/components/layout/MasterDataLayout';
import { useMasterData } from '@/hooks/useMasterData';

export default function {Entity}Page() {
  const { data, loading, create, update, delete: deleteEntity } = useMasterData('{entity-name}');
  
  return (
    <MasterDataLayout
      title={t('master.{entity}.title')}
      onCreateClick={...}
      onEditClick={...}
      data={data}
      loading={loading}
    >
      {/* Table, modals, filters */}
    </MasterDataLayout>
  );
}

# 2. Create forms
frontend-next/pages/master/components/{Entity}Form.tsx
- Input fields
- Validation
- Submit handling

# 3. Create table component
frontend-next/pages/master/components/{Entity}Table.tsx
- Column definitions
- Row actions (edit, delete)
- Status badges

# 4. Test in browser
http://localhost:3001/master/{entity-name}
```

### Step 3: Permissions (30 minutes)
```typescript
// 1. Add to menu.permissions.ts
export const MenuPermissions = {
  MasterData: {
    // ... existing
    {EntityName}: {
      View: '{entity}:view' as const,
      Create: '{entity}:create' as const,
      Edit: '{entity}:edit' as const,
      Delete: '{entity}:delete' as const,
      Export: '{entity}:export' as const,
    },
  },
};

// 2. Verify permission codes created in DB
INSERT INTO permissions (permission_code, resource, action, description)
VALUES ('{entity}:view', '{entity}', 'view', 'View {Entity}');
INSERT INTO permissions (permission_code, resource, action, description)
VALUES ('{entity}:create', '{entity}', 'create', 'Create {Entity}');
// ... etc for edit, delete, export

// 3. Assign to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.permission_code IN ('{entity}:view', '{entity}:create', '{entity}:edit', '{entity}:delete');

// 4. Test in UI
- Try page with admin role → should see all buttons
- Try page with manager role → should see limited buttons
- Try page with user role → should see view only
```

### Step 4: Translations (30 minutes)
```json
// 1. Add to frontend-next/locales/en.json
{
  "master": {
    "{entity}": {
      "title": "Entity Title",
      "description": "Short description",
      "fields": {
        "{fieldName}": "Field Label",
        "{fieldName}": "Another Field"
      },
      "columns": {
        "id": "ID",
        "name": "Name",
        "code": "Code",
        "status": "Status"
      },
      "buttons": {
        "create": "Create {Entity}",
        "edit": "Edit {Entity}",
        "delete": "Delete {Entity}",
        "export": "Export {Entity}"
      },
      "messages": {
        "created": "{Entity} created successfully",
        "updated": "{Entity} updated successfully",
        "deleted": "{Entity} deleted successfully",
        "error": "Error: {error}"
      },
      "validation": {
        "required": "{Field} is required",
        "unique": "{Field} must be unique",
        "invalidFormat": "{Field} format is invalid"
      }
    }
  }
}

// 2. Add to frontend-next/locales/ar.json
{
  "master": {
    "{entity}": {
      "title": "عنوان الكيان",
      "fields": {
        "{fieldName}": "تسمية الحقل"
      }
      // ... continue for all keys
    }
  }
}

// 3. Test RTL support
- Switch language to Arabic in UI
- Verify all text appears in Arabic
- Verify layout adjusts for RTL (right-to-left)
```

### Step 5: Testing (1 hour)
```
Manual Testing Checklist:

DATA OPERATIONS:
□ List view shows data from API
□ Create button opens form
□ Create form submits and adds to list
□ Edit button shows current data
□ Edit form submits and updates list
□ Delete button shows confirmation
□ Delete confirmation removes from list
□ Pagination works (page 2, etc.)
□ Search filters data correctly
□ Sort by column works

PERMISSIONS:
□ Admin can see all buttons
□ Manager can see limited buttons
□ User can see view only
□ API returns 403 when permission denied
□ Frontend hides buttons without permission

TRANSLATIONS:
□ English labels display correctly
□ Arabic labels display correctly
□ RTL layout for Arabic
□ All error messages translated
□ All button labels translated

VALIDATION:
□ Required fields show error
□ Unique fields validate
□ Business rules enforced
□ Error messages shown to user

UI/UX:
□ Loading spinners show during API calls
□ Toast notifications for success/error
□ Forms have clear labels
□ Status badges display correctly
□ Modal opens/closes smoothly
```

---

## 🔧 STANDARDIZED PAGE TEMPLATE

Use this template for all new master data pages:

```typescript
// pages/master/{entity-name}.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { MasterDataTable } from '@/components/master-data/MasterDataTable';
import { {Entity}Form } from '@/components/{Entity}Form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';
import { useLocale } from '@/hooks/useLocale';
import { useMasterData } from '@/hooks/useMasterData';

export default function {Entity}Page() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useLocale();
  const { data, loading, create, update, delete: deleteEntity } = useMasterData('{entity-name}');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (!hasPermission('{entity}:view')) {
    return <div className="p-6">Access Denied</div>;
  }

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEntity(deleteId);
      showToast('success', t('master.{entity}.messages.deleted'));
      setDeleteId(null);
    } catch (error) {
      showToast('error', t('master.{entity}.messages.error'));
    }
  };

  const columns = [
    { key: 'id', label: t('common.id'), sortable: true },
    { key: 'name', label: t('master.{entity}.columns.name'), sortable: true },
    { key: 'code', label: t('master.{entity}.columns.code'), sortable: true },
    { key: 'status', label: t('master.{entity}.columns.status'), render: (val) => (
      <span className={val === 'active' ? 'text-green-600' : 'text-red-600'}>
        {val === 'active' ? '✓' : '✗'}
      </span>
    )},
  ];

  return (
    <MainLayout>
      <Head>
        <title>{t('master.{entity}.title')} - SLMS</title>
      </Head>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('master.{entity}.title')}</h1>
          {hasPermission('{entity}:create') && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              {t('master.{entity}.buttons.create')}
            </Button>
          )}
        </div>

        <MasterDataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={(row) => setEditingId(row.id)}
          onDelete={(row) => setDeleteId(row.id)}
          hasEditPermission={hasPermission('{entity}:edit')}
          hasDeletePermission={hasPermission('{entity}:delete')}
        />

        {/* Create/Edit Modal */}
        {(isCreateModalOpen || editingId) && (
          <{Entity}Form
            initialData={editingId ? data.find((d) => d.id === editingId) : undefined}
            onSubmit={editingId ? update : create}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingId(null);
            }}
            onSuccess={(action) => {
              showToast('success', t(`master.{entity}.messages.${action}`));
              setIsCreateModalOpen(false);
              setEditingId(null);
            }}
          />
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteId}
          title={t('common.confirmDelete')}
          message={t('master.{entity}.messages.deleteConfirm')}
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
          variant="danger"
        />
      </div>
    </MainLayout>
  );
}
```

---

## 📊 DAILY STANDUP CHECKLIST

### Morning (9 AM)
- [ ] Review tasks from MASTER_DATA_IMPLEMENTATION_CHECKLIST.md
- [ ] Check for blocked items
- [ ] Verify all PRs merged from yesterday
- [ ] Start day's most critical entity implementation

### End of Day (5 PM)
- [ ] Update checklist with completed items
- [ ] Mark any blocked issues
- [ ] Commit code to branch
- [ ] Write brief status update
- [ ] Flag any dependencies needed for next day

### Weekly (Friday)
- [ ] Merge all PRs to main
- [ ] Update progress percentage
- [ ] Review next week's priorities
- [ ] Identify risks/blockers
- [ ] Plan weekend if needed

---

## 🆘 TROUBLESHOOTING

### Problem: "Permission Denied" errors
**Solution**:
1. Check permissions table has permission code
2. Check role_permissions table maps role to permission
3. Check frontend MenuPermissions.ts matches backend
4. Restart backend to refresh permission cache

### Problem: API endpoint returns 404
**Solution**:
1. Check migration has been applied: `SELECT * FROM migrations WHERE filename LIKE '%entity%'`
2. Check API endpoint is registered in `src/app.ts`: `app.use('/api/master/entity', entityRouter);`
3. Restart backend: `docker-compose restart slms-backend`

### Problem: Translation keys not showing
**Solution**:
1. Check translation key exists in en.json/ar.json
2. Verify key path matches usage: `t('master.{entity}.title')`
3. Restart frontend: `docker-compose restart slms-frontend-next-1`
4. Clear browser cache: Ctrl+Shift+Delete

### Problem: Form validation not working
**Solution**:
1. Check validation rules in form component
2. Check API validation on backend
3. Check error message translations exist
4. Check form state is being updated correctly

### Problem: Delete not working
**Solution**:
1. Check soft_delete_at column exists in table
2. Check middleware applies soft delete (WHERE deleted_at IS NULL)
3. Check permission delete:{entity} is assigned
4. Check DELETE endpoint calls soft delete, not hard delete

---

## 📱 MOBILE-FIRST TESTING

After implementing each entity, test on:
- ✅ Desktop (1920x1080) - Full UI
- ✅ Tablet (768x1024) - 2-column layouts
- ✅ Mobile (375x667) - Single column, hamburger menu

Use browser dev tools: `F12` → Toggle device toolbar → Select device

---

## 🎯 SUCCESS CRITERIA

### Per Entity (Definition of Done)
✅ Backend API responds correctly
✅ Frontend page displays data
✅ Permissions evaluated correctly
✅ Translations complete (EN + AR)
✅ Validations working
✅ Manual testing passed
✅ No console errors
✅ Zero hardcoded strings

### Per Phase
✅ All entities implemented
✅ All APIs tested with Postman
✅ All pages merged to main
✅ All permissions verified
✅ All translations verified
✅ UAT documentation ready

### Overall MVP (Phases 1-5)
✅ 69 entities completed
✅ 500+ permission codes working
✅ 1000+ translation keys localized
✅ Zero security vulnerabilities
✅ Production-ready code quality
✅ Team trained and ready for UAT

---

## 🔗 KEY LINKS

| Link | Purpose |
|------|---------|
| `MASTER_DATA_IMPLEMENTATION_PLAN.md` | Detailed roadmap & architecture |
| `MASTER_DATA_ENTITY_INVENTORY.md` | All 118 entities with specs |
| `MASTER_DATA_IMPLEMENTATION_CHECKLIST.md` | Daily progress tracking |
| `frontend-next/config/menu.permissions.ts` | Permission constants |
| `backend/src/routes/` | All API endpoints |
| `frontend-next/pages/master/` | All master data pages |
| `frontend-next/locales/en.json` | English translations |
| `frontend-next/locales/ar.json` | Arabic translations |

---

**Quick Start Completed! ✨**

You're ready to start implementing. Begin with **PHASE 1** today.

Questions? Check troubleshooting section or review the detailed roadmap.

Good luck! 🚀
