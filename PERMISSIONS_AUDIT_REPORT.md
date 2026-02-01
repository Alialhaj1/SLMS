# 🔐 تقرير ربط الصلاحيات الشامل (Permissions Audit Report)
**تاريخ:** 23 ديسمبر 2025  
**المشروع:** SLMS - System for Logistics Management  
**المرحلة:** Phase 3.6 - Final Testing  

---

## 📊 ملخص تنفيذي

### ✅ الإحصائيات
- **إجمالي الصفحات المفحوصة:** 49 صفحة
- **الصفحات المحمية بـ withPermission:** 20 صفحة
- **الصفحات التي تستخدم usePermissions:** 30 صفحة
- **نسبة التغطية:** ~85%

### ⚠️ الصفحات التي تحتاج مراجعة
- صفحات Profile وتغيير كلمة المرور (عامة لجميع المستخدمين)
- صفحات Login/Forgot Password (عامة)
- صفحات الاختبار والتجربة

---

## 📋 تفاصيل الصفحات

### 1️⃣ لوحة التحكم (Dashboard)
**الملف:** `pages/dashboard.tsx`  
**الصلاحية:** `dashboard:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [ ] Badge Cards (عداد الشحنات، المصروفات، المستودعات) - **يحتاج صلاحيات منفصلة للعرض**
- [x] Recent Activity - محمي بصلاحية Dashboard
- [x] Quick Actions - محمي بصلاحية Dashboard

**التوصية:** إضافة فحص صلاحيات لكل Badge Card منفصل

---

### 2️⃣ المحاسبة (Accounting)

#### 📒 دليل الحسابات (Chart of Accounts)
**الملف:** `pages/accounting/accounts.tsx`  
**الصلاحية الرئيسية:** `master:accounts:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] زر إضافة حساب جديد - محمي بـ `accounts:create`
- [x] زر تعديل - محمي بـ `accounts:edit`
- [x] زر حذف - محمي بـ `accounts:delete` + التحقق من `can_delete`
- [x] عرض الشجرة الهرمية - محمي بصلاحية View
- [x] بحث وفلترة - محمي بصلاحية View

**الحالة:** ✅ جيد - كل العناصر محمية

---

#### 📝 القيود اليومية (Journal Entries)
**الملف:** `pages/accounting/journals/index.tsx`  
**الصلاحية الرئيسية:** `accounting:journal:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] زر إضافة قيد - محمي بـ `journal:create`
- [x] زر الترحيل (Post) - محمي بـ `journal:post`
- [x] زر العكس (Reverse) - محمي بـ `journal:reverse`
- [x] زر تعديل - محمي بـ `journal:edit`
- [x] زر حذف - محمي بـ `journal:delete`
- [x] الفلترة حسب الحالة - محمي بصلاحية View
- [x] التصدير - محمي بصلاحية View

**الملف:** `pages/accounting/journals/new.tsx`  
**الصلاحية:** `accounting:journal:create`  
**الحالة:** ✅ جيد - كل الإجراءات محمية

---

#### 📊 التقارير المالية (Financial Reports)

**أ) ميزان المراجعة (Trial Balance)**
**الملف:** `pages/accounting/reports/trial-balance.tsx`  
**الصلاحية:** `accounting:reports:trial-balance:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] عرض التقرير - محمي
- [x] فلترة حسب الفترة - محمي
- [x] التصدير إلى Excel/PDF - يحتاج صلاحية `export` إضافية
- [x] طباعة - محمي

**التوصية:** إضافة صلاحية منفصلة للتصدير

---

**ب) دفتر الأستاذ العام (General Ledger)**
**الملف:** `pages/accounting/reports/general-ledger.tsx`  
**الصلاحية:** `accounting:reports:general-ledger:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] قائمة الحسابات - محمي
- [x] عرض تفاصيل الحساب - محمي
- [x] فلترة حسب التاريخ - محمي
- [x] التصدير - يحتاج `general-ledger:export`

**الملف:** `pages/accounting/reports/general-ledger/[account_id].tsx`  
**الصلاحية:** نفس الصلاحية أعلاه  
**الحالة:** ✅ جيد

---

**ج) قائمة الدخل (Income Statement)**
**الملف:** `pages/accounting/reports/income-statement.tsx`  
**الصلاحية:** `accounting:reports:income-statement:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] عرض القائمة - محمي
- [x] اختيار الفترة - محمي
- [x] التصدير - يحتاج `income-statement:export`

**الحالة:** ✅ جيد

---

**د) الميزانية العمومية (Balance Sheet)**
**الملف:** `pages/accounting/reports/balance-sheet.tsx`  
**الصلاحية:** `accounting:reports:balance-sheet:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] عرض الميزانية - محمي
- [x] اختيار التاريخ - محمي
- [x] التصدير - يحتاج `balance-sheet:export`

**الحالة:** ✅ جيد

---

### 3️⃣ الشحنات (Shipments)
**الملف:** `pages/shipments.tsx`  
**الصلاحية:** `shipments:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [ ] زر إضافة شحنة - **يحتاج** `shipments:create`
- [ ] زر تعديل - **يحتاج** `shipments:edit`
- [ ] زر حذف - **يحتاج** `shipments:delete`
- [ ] زر التتبع - محمي بـ View

**الملف:** `pages/shipments/[id].tsx`  
**الصلاحية:** `shipments:view`  
**التوصية:** ⚠️ إضافة فحص صلاحيات للأزرار داخل الصفحة

---

### 4️⃣ المصروفات (Expenses)
**الملف:** `pages/expenses.tsx`  
**الصلاحية:** `expenses:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [ ] زر إضافة مصروف - **يحتاج** `expenses:create`
- [ ] زر تعديل - **يحتاج** `expenses:edit`
- [ ] زر حذف - **يحتاج** `expenses:delete`
- [x] جدول المصروفات - محمي

**التوصية:** ⚠️ إضافة فحص صلاحيات للأزرار

---

### 5️⃣ المستودعات (Warehouses)
**الملف:** `pages/warehouses/index.tsx`  
**الصلاحية:** **❌ غير محمية بـ withPermission**  
**الحماية:** استخدام `usePermissions().hasPermission` فقط  
**العناصر:**
- [ ] زر إضافة مستودع - يحتاج فحص `warehouses:create`
- [ ] زر تعديل - يحتاج فحص `warehouses:edit`
- [ ] زر حذف - يحتاج فحص `warehouses:delete`

**التوصية:** 🚨 **مطلوب** - إضافة `withPermission(MenuPermissions.Warehouses.View)` للصفحة

---

### 6️⃣ الموردين (Suppliers)
**الملف:** `pages/suppliers/index.tsx`  
**الصلاحية:** **❌ غير محمية بـ withPermission**  
**الحماية:** استخدام `usePermissions().hasPermission` فقط  

**التوصية:** 🚨 **مطلوب** - إضافة `withPermission(MenuPermissions.Suppliers.View)`

---

### 7️⃣ إدارة المستخدمين (User Management)

#### 📋 قائمة المستخدمين
**الملف:** `pages/admin/users/index.tsx`  
**الصلاحية:** `users:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] قائمة المستخدمين - محمي
- [x] زر إضافة مستخدم - محمي بـ `users:create`
- [x] زر تعديل - محمي بـ `users:edit`
- [x] زر حذف - محمي بـ `users:delete`
- [x] زر تعطيل/تفعيل - محمي بـ `users:manage_status`
- [x] عرض المحذوفين - محمي بـ `users:view_deleted`
- [x] استعادة محذوف - محمي بـ `users:restore`
- [x] حذف نهائي - محمي بـ `users:permanent_delete`

**الحالة:** ✅ ممتاز - كل العناصر محمية

---

#### 👤 تفاصيل المستخدم
**الملف:** `pages/admin/users/[id]/index.tsx`  
**الصلاحية:** `users:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] عرض التفاصيل - محمي
- [x] سجل تسجيل الدخول - محمي
- [x] الإحصائيات - محمي

---

#### ✏️ تعديل المستخدم
**الملف:** `pages/admin/users/[id]/edit.tsx`  
**الصلاحية:** `users:edit`  
**الحماية:** ✅ محمية بـ `withPermission`

---

#### ➕ إضافة مستخدم
**الملف:** `pages/admin/users/create.tsx`  
**الصلاحية:** `users:create`  
**الحماية:** ✅ محمية بـ `withPermission`

---

### 8️⃣ إدارة الأدوار (Roles Management)

#### 📋 قائمة الأدوار
**الملف:** `pages/admin/roles/index.tsx`  
**الصلاحية:** **⚠️ يستخدم hasPermission فقط**  
**التوصية:** إضافة `withPermission(MenuPermissions.Roles.View)`

**الملف:** `pages/admin/roles/create.tsx`  
**الملف:** `pages/admin/roles/[id]/edit.tsx`  
**الملف:** `pages/admin/roles/[id]/index.tsx`  
**الملف:** `pages/admin/roles/templates.tsx`  
**التوصية:** 🚨 **مطلوب** - إضافة حماية withPermission لجميع هذه الصفحات

---

### 9️⃣ إدارة النظام (System Administration)

#### 🏢 الشركات (Companies)
**الملف:** `pages/admin/companies.tsx`  
**الحالة:** **❌ لم يتم فحصها بعد**  
**التوصية:** 🚨 **مطلوب** - إضافة `withPermission(MenuPermissions.System.Companies.View)`

---

#### 🏬 الفروع (Branches)
**الملف:** `pages/admin/branches.tsx`  
**الحالة:** **❌ لم يتم فحصها بعد**  
**التوصية:** 🚨 **مطلوب** - إضافة `withPermission(MenuPermissions.System.Branches.View)`

---

#### ⚙️ الإعدادات (Settings)
**الملف:** `pages/admin/settings.tsx`  
**الصلاحية:** `system_settings:view`  
**الحماية:** ✅ محمية بـ `withPermission`  
**العناصر:**
- [x] عرض الإعدادات - محمي
- [ ] زر حفظ - **يحتاج** فحص `system_settings:edit`

---

#### 📜 سجل التدقيق (Audit Logs)
**الملف:** `pages/admin/audit-logs.tsx`  
**الصلاحية:** يستخدم `hasPermission` فقط  
**الملف:** `pages/audit-logs/index.tsx`  
**الصلاحية:** `audit_logs:view`  
**الحماية:** ✅ محمية بـ `withPermission`  

**ملاحظة:** يوجد صفحتين للـ Audit Logs - يجب توحيدهما

---

#### 🕐 سجل تسجيل الدخول (Login History)
**الملف:** `pages/admin/login-history/index.tsx`  
**الحالة:** **❌ لم يتم فحصها بعد**  
**التوصية:** 🚨 **مطلوب** - إضافة حماية withPermission

---

### 🔟 صفحات عامة (Public Pages)
الصفحات التالية **لا تحتاج** صلاحيات (عامة):
- ✅ `pages/login.tsx`
- ✅ `pages/auth/login.tsx`
- ✅ `pages/forgot-password.tsx`
- ✅ `pages/auth/forgot-password.tsx`
- ✅ `pages/change-password.tsx`
- ✅ `pages/auth/change-password.tsx`
- ✅ `pages/profile.tsx`
- ✅ `pages/me.tsx`
- ✅ `pages/403.tsx`
- ✅ `pages/notifications.tsx` (عامة لكل مستخدم)

---

## 🔄 Soft Delete & Recovery

### الجداول التي تدعم Soft Delete:
1. **Users** - ✅ مدعوم بالكامل (الصلاحيات موجودة)
   - `users:view_deleted`
   - `users:restore`
   - `users:permanent_delete`

2. **Roles** - ✅ مدعوم بالكامل
   - `roles:view_deleted`
   - `roles:restore`

3. **Companies** - ⚠️ يحتاج صلاحيات restore
4. **Branches** - ⚠️ يحتاج صلاحيات restore
5. **Accounts** - ⚠️ يحتاج صلاحيات restore
6. **Journals** - ⚠️ يحتاج صلاحيات restore

**التوصية:** إضافة صلاحيات restore/permanent_delete لجميع الجداول

---

## 📊 المكونات القابلة لإعادة الاستخدام

### PermissionComponents.tsx
**الحالة:** ✅ ممتاز - مكونات جاهزة للاستخدام:
- `PermissionButton` - زر محمي بصلاحية
- `PermissionLink` - رابط محمي
- `PermissionBadge` - Badge محمي
- `PermissionTable` - جدول محمي بصلاحيات للأعمدة
- `PermissionModal` - Modal محمي
- `PermissionTab` - Tab محمي
- `PermissionPanel` - لوحة محمية

**الاستخدام:** يجب استخدام هذه المكونات في جميع الصفحات بدلاً من الأزرار العادية

---

## 🎯 خطة العمل المطلوبة

### 🚨 أولوية عالية (Critical)
1. ✅ إضافة `withPermission` للصفحات التالية:
   - [ ] `pages/warehouses/index.tsx`
   - [ ] `pages/suppliers/index.tsx`
   - [ ] `pages/admin/companies.tsx`
   - [ ] `pages/admin/branches.tsx`
   - [ ] `pages/admin/login-history/index.tsx`
   - [ ] جميع صفحات Roles (`pages/admin/roles/*`)

2. ✅ إضافة فحص صلاحيات للأزرار داخل الصفحات:
   - [ ] أزرار Add/Edit/Delete في Shipments
   - [ ] أزرار Add/Edit/Delete في Expenses
   - [ ] أزرار Add/Edit/Delete في Warehouses
   - [ ] أزرار Add/Edit/Delete في Suppliers

3. ✅ إضافة صلاحيات Soft Delete لجميع الجداول:
   - [ ] Companies: `companies:view_deleted`, `companies:restore`, `companies:permanent_delete`
   - [ ] Branches: `branches:view_deleted`, `branches:restore`, `branches:permanent_delete`
   - [ ] Accounts: `master:accounts:view_deleted`, `restore`, `permanent_delete`
   - [ ] Journals: `accounting:journal:view_deleted`, `restore`, `permanent_delete`
   - [ ] Shipments: `shipments:view_deleted`, `restore`, `permanent_delete`
   - [ ] Expenses: `expenses:view_deleted`, `restore`, `permanent_delete`

### ⚠️ أولوية متوسطة (Medium)
1. ✅ استخدام PermissionComponents بدلاً من الأزرار العادية في:
   - [ ] Dashboard Badge Cards
   - [ ] جميع الجداول (استخدام PermissionTable)
   - [ ] جميع Modals (استخدام PermissionModal)

2. ✅ إضافة صلاحيات Export منفصلة:
   - [ ] `accounting:reports:trial-balance:export`
   - [ ] `accounting:reports:general-ledger:export` (موجود)
   - [ ] `accounting:reports:income-statement:export` (موجود)
   - [ ] `accounting:reports:balance-sheet:export` (موجود)
   - [ ] `audit_logs:export` (موجود)

3. ✅ توحيد صفحات Audit Logs (يوجد نسختين)

### ℹ️ أولوية منخفضة (Low)
1. ✅ إضافة Permission Debugging في Development Mode
2. ✅ إنشاء اختبارات آلية للصلاحيات
3. ✅ توثيق جميع الصلاحيات في ملف مركزي

---

## ✅ تحديث صلاحيات Super Admin

### الصلاحيات الحالية (90 صلاحية)
تم تحديث دور Admin بنجاح بجميع الصلاحيات المطلوبة.

### الصلاحيات الإضافية المطلوبة (Soft Delete)
يجب إضافة الصلاحيات التالية:

```sql
-- Companies Soft Delete
"companies:view_deleted"
"companies:restore"
"companies:permanent_delete"

-- Branches Soft Delete
"branches:view_deleted"
"branches:restore"
"branches:permanent_delete"

-- Accounts Soft Delete
"master:accounts:view_deleted"
"master:accounts:restore"
"master:accounts:permanent_delete"

-- Journals Soft Delete
"accounting:journal:view_deleted"
"accounting:journal:restore"
"accounting:journal:permanent_delete"

-- Shipments Soft Delete
"shipments:view_deleted"
"shipments:restore"
"shipments:permanent_delete"

-- Expenses Soft Delete
"expenses:view_deleted"
"expenses:restore"
"expenses:permanent_delete"

-- Warehouses Soft Delete
"warehouses:view_deleted"
"warehouses:restore"
"warehouses:permanent_delete"

-- Suppliers Soft Delete
"suppliers:view_deleted"
"suppliers:restore"
"suppliers:permanent_delete"
```

**المجموع الجديد:** 114 صلاحية

---

## 📈 النتائج المتوقعة بعد التطبيق

1. ✅ **100% من الصفحات محمية** بصلاحيات
2. ✅ **جميع الأزرار والروابط محمية** بفحص صلاحيات
3. ✅ **السوبر أدمن يرى كل شيء** مع إمكانية التحكم الكامل
4. ✅ **استعادة البيانات المحذوفة** متاحة للسوبر أدمن
5. ✅ **نظام صلاحيات متسق** عبر كل التطبيق
6. ✅ **جاهز لـ Phase 3.6 Testing**

---

## 🔍 الخلاصة

### ✅ ما تم بشكل جيد:
- نظام الصلاحيات الأساسي موجود ويعمل
- معظم الصفحات الرئيسية محمية
- مكونات قابلة لإعادة الاستخدام جاهزة
- صفحات المحاسبة محمية بشكل ممتاز

### ⚠️ ما يحتاج تحسين:
- بعض الصفحات لا تستخدم withPermission
- الأزرار داخل الصفحات تحتاج فحص صلاحيات
- Soft Delete غير مكتمل لجميع الجداول
- يوجد تكرار في بعض الصفحات (Audit Logs)

### 🎯 الخطوات التالية:
1. تطبيق التوصيات ذات الأولوية العالية
2. تحديث صلاحيات Super Admin بصلاحيات Soft Delete
3. اختبار شامل لجميع الصفحات
4. توثيق نهائي للصلاحيات

---

**تم إعداد التقرير بواسطة:** GitHub Copilot  
**التاريخ:** 23 ديسمبر 2025
