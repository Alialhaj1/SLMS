# 📋 قائمة التحقق من ربط الصلاحيات (Permissions Implementation Checklist)

## 🚨 المهام ذات الأولوية العالية (Critical)

### 1. إضافة withPermission للصفحات غير المحمية

- [ ] **warehouses/index.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Warehouses.View, WarehousesPage)`
  - [ ] اختبار: تسجيل دخول بدون صلاحية warehouses:view

- [ ] **suppliers/index.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Suppliers.View, SuppliersPage)`
  - [ ] اختبار: تسجيل دخول بدون صلاحية suppliers:view

- [ ] **admin/companies.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.System.Companies.View, CompaniesPage)`
  - [ ] اختبار: Access control

- [ ] **admin/branches.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.System.Branches.View, BranchesPage)`
  - [ ] اختبار: Access control

- [ ] **admin/login-history/index.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Users.LoginHistory.View, LoginHistoryPage)`
  - [ ] اختبار: Access control

- [ ] **admin/roles/index.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Roles.View, RolesPage)`
  - [ ] اختبار: Access control

- [ ] **admin/roles/create.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Roles.Create, CreateRolePage)`
  - [ ] اختبار: Access control

- [ ] **admin/roles/[id]/index.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Roles.View, ViewRolePage)`
  - [ ] اختبار: Access control

- [ ] **admin/roles/[id]/edit.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Roles.Edit, EditRolePage)`
  - [ ] اختبار: Access control

- [ ] **admin/roles/templates.tsx**
  - [ ] إضافة: `export default withPermission(MenuPermissions.Roles.Templates, RoleTemplatesPage)`
  - [ ] اختبار: Access control

---

### 2. إضافة فحص صلاحيات للأزرار داخل الصفحات

#### shipments.tsx & shipments/[id].tsx
- [ ] زر "إضافة شحنة"
  ```tsx
  {can('shipments:create') && (
    <Button onClick={handleCreate}>إضافة شحنة</Button>
  )}
  ```
- [ ] زر "تعديل"
  ```tsx
  <PermissionButton permission="shipments:edit" onClick={handleEdit}>
    تعديل
  </PermissionButton>
  ```
- [ ] زر "حذف"
  ```tsx
  <PermissionButton permission="shipments:delete" variant="danger" onClick={handleDelete}>
    حذف
  </PermissionButton>
  ```
- [ ] اختبار: تسجيل دخول بدون كل صلاحية على حدة

#### expenses.tsx
- [ ] زر "إضافة مصروف"
  ```tsx
  {can('expenses:create') && (
    <Button onClick={handleCreate}>إضافة مصروف</Button>
  )}
  ```
- [ ] زر "تعديل"
  ```tsx
  <PermissionButton permission="expenses:edit" onClick={handleEdit}>
    تعديل
  </PermissionButton>
  ```
- [ ] زر "حذف"
  ```tsx
  <PermissionButton permission="expenses:delete" variant="danger" onClick={handleDelete}>
    حذف
  </PermissionButton>
  ```

#### warehouses/index.tsx
- [ ] زر "إضافة مستودع"
  ```tsx
  {can('warehouses:create') && (
    <Button onClick={handleCreate}>إضافة مستودع</Button>
  )}
  ```
- [ ] زر "تعديل"
- [ ] زر "حذف"
- [ ] اختبار جميع الأزرار

#### suppliers/index.tsx
- [ ] زر "إضافة مورد"
  ```tsx
  {can('suppliers:create') && (
    <Button onClick={handleCreate}>إضافة مورد</Button>
  )}
  ```
- [ ] زر "تعديل"
- [ ] زر "حذف"
- [ ] اختبار جميع الأزرار

---

### 3. إضافة صلاحيات Soft Delete للجداول

#### Backend: إضافة الصلاحيات للـ Database
- [ ] تشغيل السكريبت:
  ```bash
  cd backend
  node update-super-admin-soft-delete-permissions.js
  ```
- [ ] التحقق من النتيجة (114 صلاحية)

#### Frontend: تنفيذ استعادة البيانات المحذوفة

**Companies**
- [ ] إضافة زر "عرض المحذوفة"
  ```tsx
  <PermissionButton permission="companies:view_deleted" onClick={showDeleted}>
    عرض المحذوفة
  </PermissionButton>
  ```
- [ ] إضافة زر "استعادة"
  ```tsx
  <PermissionButton permission="companies:restore" onClick={restore}>
    استعادة
  </PermissionButton>
  ```
- [ ] إضافة زر "حذف نهائي"
  ```tsx
  <PermissionButton permission="companies:permanent_delete" variant="danger" onClick={permanentDelete}>
    حذف نهائي
  </PermissionButton>
  ```
- [ ] اختبار: حذف → استعادة → حذف نهائي

**Branches**
- [ ] زر "عرض المحذوفة" - `branches:view_deleted`
- [ ] زر "استعادة" - `branches:restore`
- [ ] زر "حذف نهائي" - `branches:permanent_delete`
- [ ] اختبار

**Accounts**
- [ ] زر "عرض المحذوفة" - `master:accounts:view_deleted`
- [ ] زر "استعادة" - `master:accounts:restore`
- [ ] زر "حذف نهائي" - `master:accounts:permanent_delete`
- [ ] اختبار

**Journals**
- [ ] زر "عرض المحذوفة" - `accounting:journal:view_deleted`
- [ ] زر "استعادة" - `accounting:journal:restore`
- [ ] زر "حذف نهائي" - `accounting:journal:permanent_delete`
- [ ] اختبار

**Shipments**
- [ ] زر "عرض المحذوفة" - `shipments:view_deleted`
- [ ] زر "استعادة" - `shipments:restore`
- [ ] زر "حذف نهائي" - `shipments:permanent_delete`
- [ ] اختبار

**Expenses**
- [ ] زر "عرض المحذوفة" - `expenses:view_deleted`
- [ ] زر "استعادة" - `expenses:restore`
- [ ] زر "حذف نهائي" - `expenses:permanent_delete`
- [ ] اختبار

**Warehouses**
- [ ] زر "عرض المحذوفة" - `warehouses:view_deleted`
- [ ] زر "استعادة" - `warehouses:restore`
- [ ] زر "حذف نهائي" - `warehouses:permanent_delete`
- [ ] اختبار

**Suppliers**
- [ ] زر "عرض المحذوفة" - `suppliers:view_deleted`
- [ ] زر "استعادة" - `suppliers:restore`
- [ ] زر "حذف نهائي" - `suppliers:permanent_delete`
- [ ] اختبار

---

## ⚠️ المهام ذات الأولوية المتوسطة (Medium)

### 4. استخدام PermissionComponents

#### Dashboard
- [ ] استبدال Badge Cards العادية بـ PermissionBadge
  ```tsx
  <PermissionBadge permission="shipments:view">
    <BadgeCard title="الشحنات" count={shipmentsCount} />
  </PermissionBadge>
  ```
- [ ] اختبار: إخفاء Badge إذا لم تكن الصلاحية موجودة

#### الجداول (Tables)
- [ ] **accounting/accounts.tsx** - استخدام PermissionTable
- [ ] **accounting/journals/index.tsx** - استخدام PermissionTable
- [ ] **shipments.tsx** - استخدام PermissionTable
- [ ] **expenses.tsx** - استخدام PermissionTable
- [ ] **warehouses/index.tsx** - استخدام PermissionTable
- [ ] **suppliers/index.tsx** - استخدام PermissionTable
- [ ] **admin/users/index.tsx** - استخدام PermissionTable (مُنفذ جزئياً)

#### Modals
- [ ] مراجعة جميع Modals واستخدام PermissionModal
- [ ] اختبار: منع فتح Modal بدون صلاحية

---

### 5. إضافة صلاحيات Export منفصلة

#### التقارير المالية
- [ ] **Trial Balance**
  - [ ] إضافة صلاحية `accounting:reports:trial-balance:export`
  - [ ] تحديث Backend Permission
  - [ ] تحديث Frontend Button Check
  - [ ] اختبار

- [ ] **General Ledger** (موجود)
  - [ ] التحقق من العمل بشكل صحيح

- [ ] **Income Statement** (موجود)
  - [ ] التحقق من العمل بشكل صحيح

- [ ] **Balance Sheet** (موجود)
  - [ ] التحقق من العمل بشكل صحيح

#### Audit Logs
- [ ] التحقق من صلاحية `audit_logs:export`
- [ ] اختبار Export

---

### 6. توحيد وتنظيف الكود

- [ ] **Audit Logs Duplication**
  - [ ] مراجعة `pages/audit-logs/index.tsx`
  - [ ] مراجعة `pages/admin/audit-logs.tsx`
  - [ ] اختيار واحدة واستخدامها
  - [ ] حذف النسخة الأخرى أو إعادة توجيه

- [ ] **Menu Registry**
  - [ ] التحقق من عدم وجود تكرار في الصلاحيات
  - [ ] التحقق من تطابق الصلاحيات مع Backend

---

## ℹ️ المهام ذات الأولوية المنخفضة (Low)

### 7. Permission Debugging

- [ ] إضافة صفحة `/debug/permissions`
  ```tsx
  // عرض جميع الصلاحيات للمستخدم الحالي
  // عرض الصفحات التي يمكنه الوصول إليها
  // عرض الأزرار التي يمكنه رؤيتها
  ```
- [ ] إضافة Console Logging في Development
  ```tsx
  if (process.env.NODE_ENV === 'development') {
    console.log('Permission Check:', permission, result);
  }
  ```

---

### 8. الاختبارات الآلية

- [ ] إنشاء ملف `__tests__/permissions.test.tsx`
- [ ] اختبار withPermission HOC
- [ ] اختبار usePermissions Hook
- [ ] اختبار PermissionComponents
- [ ] اختبار Menu Registry
- [ ] تشغيل الاختبارات: `npm test`

---

### 9. التوثيق

- [ ] إنشاء `PERMISSIONS_DOCUMENTATION.md`
  - [ ] قائمة كاملة بجميع الصلاحيات (114)
  - [ ] وصف كل صلاحية
  - [ ] الصفحات/الأزرار المرتبطة بكل صلاحية
  - [ ] أمثلة على الاستخدام

- [ ] تحديث `README.md`
  - [ ] إضافة قسم عن نظام الصلاحيات
  - [ ] شرح كيفية إضافة صلاحية جديدة

---

## ✅ الاختبار النهائي (Final Testing)

### تسجيل الدخول كـ Super Admin
- [ ] تسجيل الدخول: `ali@alhajco.com` / `A11A22A33`
- [ ] التحقق من ظهور جميع عناصر القائمة (Sidebar)
- [ ] التحقق من إمكانية الوصول لجميع الصفحات
- [ ] التحقق من رؤية جميع الأزرار
- [ ] التحقق من عمل جميع الإجراءات

### تسجيل الدخول كمستخدم عادي (بدون صلاحيات)
- [ ] إنشاء مستخدم اختبار بدون أي صلاحيات
- [ ] تسجيل الدخول
- [ ] التحقق من إعادة التوجيه للصفحة 403
- [ ] التحقق من إخفاء جميع عناصر القائمة
- [ ] التحقق من إخفاء جميع الأزرار

### تسجيل الدخول كمستخدم بصلاحيات محدودة
- [ ] إنشاء دور "Accountant" بصلاحيات المحاسبة فقط
- [ ] تسجيل الدخول
- [ ] التحقق من رؤية قسم المحاسبة فقط
- [ ] التحقق من منع الوصول لصفحات أخرى

### اختبار Soft Delete Recovery
- [ ] حذف شركة → التحقق من الحذف الناعم
- [ ] عرض المحذوفات → التحقق من الظهور
- [ ] استعادة → التحقق من الاستعادة
- [ ] حذف نهائي → التحقق من الحذف الكامل

### اختبار RTL/Arabic
- [ ] التحقق من عرض القوائم بشكل صحيح (RTL)
- [ ] التحقق من عرض الأزرار بشكل صحيح
- [ ] التحقق من عرض النصوص العربية بشكل صحيح
- [ ] التحقق من عدم تأثير نظام الصلاحيات على التنسيق

---

## 📊 تقرير التقدم

### إحصائيات
- **المهام المكتملة:** 0 / 75
- **النسبة المئوية:** 0%
- **الوقت المتبقي المقدر:** 8-10 ساعات

### الأولويات
1. 🚨 Critical: 35 مهمة
2. ⚠️ Medium: 25 مهمة
3. ℹ️ Low: 15 مهمة

---

## 🎯 الهدف النهائي

بعد إكمال جميع المهام:
- ✅ 100% من الصفحات محمية بصلاحيات
- ✅ 100% من الأزرار والروابط محمية
- ✅ السوبر أدمن يرى ويتحكم في كل شيء
- ✅ استعادة البيانات المحذوفة متاحة
- ✅ النظام جاهز للاختبار النهائي (Phase 3.6)
- ✅ التطبيق جاهز للإنتاج

---

**آخر تحديث:** 23 ديسمبر 2025  
**الحالة:** قيد التنفيذ  
**المسؤول:** GitHub Copilot
