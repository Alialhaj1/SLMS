# 🚀 Quick Start Guide - Soft Delete Implementation

## 📦 استخدام مكونات Soft Delete

### المثال الأول: إضافة Soft Delete لصفحة Users

```tsx
// pages/admin/users/index.tsx
import { useState } from 'react';
import { 
  SoftDeleteToggle, 
  SoftDeleteActions, 
  DeletedBadge,
  SoftDeletePanel 
} from '../../../components/common/SoftDeleteControls';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Fetch users with deleted_at if showDeleted is true
  const fetchUsers = async () => {
    const params = new URLSearchParams();
    if (showDeleted) {
      params.append('include_deleted', 'true');
    }
    
    const response = await fetch(`/api/users?${params}`);
    const data = await response.json();
    setUsers(data);
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1>Users</h1>
        
        {/* طريقة 1: زر Toggle بسيط */}
        <SoftDeleteToggle
          resource="users"
          showDeleted={showDeleted}
          onToggleShowDeleted={setShowDeleted}
        />
        
        {/* أو طريقة 2: Panel كامل (أفضل) */}
        <SoftDeletePanel
          resource="users"
          showDeleted={showDeleted}
          onToggleShowDeleted={setShowDeleted}
          deletedCount={users.filter(u => u.deleted_at).length}
        />
        
        {/* الجدول */}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  {user.full_name}
                  <DeletedBadge deletedAt={user.deleted_at} />
                </td>
                <td>{user.email}</td>
                <td>{user.status}</td>
                <td>
                  {user.deleted_at ? (
                    // إذا محذوف، أظهر أزرار Restore و Permanent Delete
                    <SoftDeleteActions
                      resource="users"
                      itemId={user.id}
                      itemName={user.full_name}
                      onRestoreSuccess={fetchUsers}
                      onPermanentDeleteSuccess={fetchUsers}
                    />
                  ) : (
                    // إذا غير محذوف، أظهر أزرار Edit و Delete العادية
                    <>
                      <Button onClick={() => handleEdit(user)}>Edit</Button>
                      <Button onClick={() => handleDelete(user)}>Delete</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
```

---

### المثال الثاني: إضافة Soft Delete لصفحة Companies

```tsx
// pages/admin/companies.tsx
import { 
  SoftDeletePanel, 
  SoftDeleteActions, 
  DeletedBadge 
} from '../../components/common/SoftDeleteControls';

function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  
  const fetchCompanies = async () => {
    const url = showDeleted 
      ? '/api/companies?include_deleted=true'
      : '/api/companies';
    
    const response = await fetch(url);
    const data = await response.json();
    setCompanies(data);
  };
  
  useEffect(() => {
    fetchCompanies();
  }, [showDeleted]);
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1>Companies</h1>
        
        <SoftDeletePanel
          resource="companies"
          showDeleted={showDeleted}
          onToggleShowDeleted={setShowDeleted}
          deletedCount={companies.filter(c => c.deleted_at).length}
        />
        
        <div className="grid grid-cols-3 gap-4">
          {companies.map(company => (
            <Card key={company.id}>
              <div>
                <h3>{company.name} <DeletedBadge deletedAt={company.deleted_at} /></h3>
                <p>{company.legal_name}</p>
              </div>
              
              {company.deleted_at ? (
                <SoftDeleteActions
                  resource="companies"
                  itemId={company.id}
                  itemName={company.name}
                  onRestoreSuccess={fetchCompanies}
                  onPermanentDeleteSuccess={fetchCompanies}
                />
              ) : (
                <Button onClick={() => handleEdit(company)}>Edit</Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
```

---

## 🔧 Backend API Requirements

لكي يعمل Soft Delete بشكل صحيح، يجب أن يدعم Backend هذه Endpoints:

### 1. GET - List Items (مع دعم include_deleted)
```typescript
// GET /api/users?include_deleted=true
router.get('/users', async (req, res) => {
  const { include_deleted } = req.query;
  
  let query = db('users');
  
  if (!include_deleted || include_deleted !== 'true') {
    // إرجاع العناصر غير المحذوفة فقط (default)
    query = query.whereNull('deleted_at');
  }
  // إذا include_deleted=true، إرجاع الكل (محذوف وغير محذوف)
  
  const users = await query;
  res.json(users);
});
```

### 2. POST - Restore (استعادة)
```typescript
// POST /api/users/:id/restore
router.post('/users/:id/restore', checkPermission('users:restore'), async (req, res) => {
  const { id } = req.params;
  
  await db('users')
    .where({ id })
    .update({
      deleted_at: null,
      updated_at: new Date()
    });
  
  res.json({ message: 'User restored successfully' });
});
```

### 3. DELETE - Permanent Delete (حذف نهائي)
```typescript
// DELETE /api/users/:id/permanent
router.delete('/users/:id/permanent', checkPermission('users:permanent_delete'), async (req, res) => {
  const { id } = req.params;
  
  // حذف نهائي من قاعدة البيانات
  await db('users').where({ id }).delete();
  
  res.json({ message: 'User permanently deleted' });
});
```

### 4. DELETE - Soft Delete (الحذف العادي)
```typescript
// DELETE /api/users/:id
router.delete('/users/:id', checkPermission('users:delete'), async (req, res) => {
  const { id } = req.params;
  
  // حذف ناعم - تعيين deleted_at
  await db('users')
    .where({ id })
    .update({
      deleted_at: new Date(),
      updated_at: new Date()
    });
  
  res.json({ message: 'User deleted successfully' });
});
```

---

## 📊 الجداول التي تحتاج Soft Delete

### Priority 1 (جاهزة الآن):
- [x] Users ✅ (الصلاحيات موجودة)
- [x] Roles ✅ (الصلاحيات موجودة)
- [x] Companies ✅ (الصلاحيات موجودة)
- [x] Branches ✅ (الصلاحيات موجودة)

### Priority 2 (يجب تطبيقها):
- [ ] Accounts (master:accounts:restore)
- [ ] Journals (accounting:journal:restore)
- [ ] Shipments (shipments:restore)
- [ ] Expenses (expenses:restore)
- [ ] Warehouses (warehouses:restore)
- [ ] Suppliers (suppliers:restore)

---

## ⚙️ إضافة الصلاحيات للـ Backend

إذا لم تكن موجودة، أضف هذه الصلاحيات:

```sql
-- لكل جدول يدعم soft delete
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('users:view_deleted', 'users', 'view_deleted', 'View deleted users'),
  ('users:restore', 'users', 'restore', 'Restore deleted user'),
  ('users:permanent_delete', 'users', 'permanent_delete', 'Permanently delete user'),
  
  ('companies:view_deleted', 'companies', 'view_deleted', 'View deleted companies'),
  ('companies:restore', 'companies', 'restore', 'Restore deleted company'),
  ('companies:permanent_delete', 'companies', 'permanent_delete', 'Permanently delete company'),
  
  -- وهكذا لباقي الجداول...
;
```

---

## ✅ Checklist للتطبيق

لكل جدول يدعم soft delete:

### Frontend:
- [ ] استيراد المكونات من `SoftDeleteControls`
- [ ] إضافة `useState` لـ `showDeleted`
- [ ] إضافة parameter `include_deleted` للـ API call
- [ ] إضافة `SoftDeletePanel` أو `SoftDeleteToggle`
- [ ] إضافة `DeletedBadge` في الجدول
- [ ] إضافة `SoftDeleteActions` للعناصر المحذوفة
- [ ] اختبار التبديل بين عرض/إخفاء المحذوفات
- [ ] اختبار استعادة عنصر
- [ ] اختبار الحذف النهائي

### Backend:
- [ ] التأكد من وجود عمود `deleted_at` في الجدول
- [ ] إضافة parameter `include_deleted` في GET endpoint
- [ ] إنشاء POST endpoint للـ `/restore`
- [ ] إنشاء DELETE endpoint للـ `/permanent`
- [ ] تعديل DELETE endpoint العادي لاستخدام soft delete
- [ ] إضافة فحص الصلاحيات لكل endpoint
- [ ] اختبار جميع الـ endpoints

### Permissions:
- [ ] إضافة `resource:view_deleted` للـ database
- [ ] إضافة `resource:restore` للـ database
- [ ] إضافة `resource:permanent_delete` للـ database
- [ ] إضافة الصلاحيات لدور Super Admin
- [ ] اختبار الصلاحيات

---

## 🎯 مثال كامل - Step by Step

### Step 1: تعديل Backend API

```typescript
// backend/routes/companies.ts

// GET /api/companies
router.get('/', checkPermission('companies:view'), async (req, res) => {
  const { include_deleted } = req.query;
  
  let query = db('companies');
  
  if (include_deleted !== 'true') {
    query = query.whereNull('deleted_at');
  }
  
  const companies = await query;
  res.json(companies);
});

// POST /api/companies/:id/restore
router.post('/:id/restore', 
  checkPermission('companies:restore'), 
  async (req, res) => {
    const { id } = req.params;
    
    await db('companies')
      .where({ id })
      .update({ deleted_at: null, updated_at: new Date() });
    
    res.json({ message: 'Company restored' });
  }
);

// DELETE /api/companies/:id/permanent
router.delete('/:id/permanent', 
  checkPermission('companies:permanent_delete'), 
  async (req, res) => {
    const { id } = req.params;
    await db('companies').where({ id }).delete();
    res.json({ message: 'Company permanently deleted' });
  }
);
```

### Step 2: تعديل Frontend Page

```tsx
// pages/admin/companies.tsx

import { useState, useEffect } from 'react';
import { 
  SoftDeletePanel, 
  SoftDeleteActions, 
  DeletedBadge 
} from '../../components/common/SoftDeleteControls';

function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  
  const fetchCompanies = async () => {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    
    if (showDeleted) {
      params.append('include_deleted', 'true');
    }
    
    const response = await fetch(`http://localhost:4000/api/companies?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await response.json();
    setCompanies(data);
  };
  
  useEffect(() => {
    fetchCompanies();
  }, [showDeleted]);
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1>Companies</h1>
        
        {/* Soft Delete Panel */}
        <SoftDeletePanel
          resource="companies"
          showDeleted={showDeleted}
          onToggleShowDeleted={setShowDeleted}
          deletedCount={companies.filter(c => c.deleted_at).length}
        />
        
        {/* Companies List */}
        <div className="grid grid-cols-3 gap-4">
          {companies.map(company => (
            <Card key={company.id}>
              <h3>
                {company.name}
                <DeletedBadge deletedAt={company.deleted_at} />
              </h3>
              
              {company.deleted_at ? (
                <SoftDeleteActions
                  resource="companies"
                  itemId={company.id}
                  itemName={company.name}
                  onRestoreSuccess={fetchCompanies}
                  onPermanentDeleteSuccess={fetchCompanies}
                />
              ) : (
                <Button onClick={() => handleEdit(company)}>Edit</Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
```

### Step 3: اختبار

1. سجل دخول كـ Super Admin
2. افتح صفحة Companies
3. احذف شركة → يجب أن تختفي
4. اضغط "Show Deleted" → يجب أن تظهر مع badge "Deleted"
5. اضغط "Restore" → يجب أن تعود للقائمة العادية
6. احذف مرة أخرى → اضغط "Delete Forever" → يجب أن تختفي نهائياً

---

## 📚 الملفات المرجعية

- [SoftDeleteControls.tsx](./components/common/SoftDeleteControls.tsx) - المكونات الأساسية
- [PERMISSIONS_DOCUMENTATION.md](./PERMISSIONS_DOCUMENTATION.md) - توثيق الصلاحيات
- [IMPLEMENTATION_SUMMARY_DEC_23.md](./IMPLEMENTATION_SUMMARY_DEC_23.md) - ملخص التنفيذ

---

**آخر تحديث:** 23 ديسمبر 2025  
**الحالة:** ✅ جاهز للاستخدام
