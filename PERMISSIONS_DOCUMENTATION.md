# 📖 توثيق نظام الصلاحيات الكامل (Complete Permissions Documentation)

**المشروع:** SLMS - System for Logistics Management  
**إجمالي الصلاحيات:** 185 صلاحية  
**آخر تحديث:** 23 ديسمبر 2025

---

## 🎯 نظرة عامة

نظام الصلاحيات في SLMS يعتمد على:
1. **Page-level Protection:** استخدام `withPermission` HOC
2. **Action-level Protection:** استخدام `can()` checks
3. **Component-level Protection:** استخدام `PermissionComponents`
4. **Menu Integration:** ربط القوائم بالصلاحيات تلقائياً

---

## 📋 قائمة الصلاحيات الكاملة

### 1. لوحة التحكم (Dashboard)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `dashboard:view` | عرض لوحة التحكم | `/dashboard` | Page |
| `dashboard:statistics:view` | عرض إحصائيات لوحة التحكم | Dashboard Cards | Component |

---

### 2. الشحنات (Shipments)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `shipments:view` | عرض قائمة الشحنات | `/shipments` | Page |
| `shipments:create` | إضافة شحنة جديدة | Add Button | Action |
| `shipments:edit` | تعديل شحنة | Edit Button | Action |
| `shipments:delete` | حذف شحنة (soft delete) | Delete Button | Action |
| `shipments:view_deleted` | عرض الشحنات المحذوفة | Show Deleted Toggle | Action |
| `shipments:restore` | استعادة شحنة محذوفة | Restore Button | Action |
| `shipments:permanent_delete` | حذف شحنة نهائياً | Permanent Delete | Action |
| `shipments:details` | عرض تفاصيل الشحنة | `/shipments/[id]` | Page |

---

### 3. المصروفات (Expenses)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `expenses:view` | عرض قائمة المصروفات | `/expenses` | Page |
| `expenses:create` | إضافة مصروف جديد | Add Button | Action |
| `expenses:edit` | تعديل مصروف | Edit Button | Action |
| `expenses:delete` | حذف مصروف | Delete Button | Action |
| `expenses:view_deleted` | عرض المصروفات المحذوفة | Show Deleted Toggle | Action |
| `expenses:restore` | استعادة مصروف محذوف | Restore Button | Action |
| `expenses:permanent_delete` | حذف مصروف نهائياً | Permanent Delete | Action |

---

### 4. المستودعات (Warehouses)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `warehouses:view` | عرض قائمة المستودعات | `/warehouses` | Page |
| `warehouses:create` | إضافة مستودع | Add Button | Action |
| `warehouses:edit` | تعديل مستودع | Edit Button | Action |
| `warehouses:delete` | حذف مستودع | Delete Button | Action |
| `warehouses:view_deleted` | عرض المستودعات المحذوفة | Show Deleted | Action |
| `warehouses:restore` | استعادة مستودع | Restore Button | Action |
| `warehouses:permanent_delete` | حذف نهائي | Permanent Delete | Action |

---

### 5. الموردين (Suppliers)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `suppliers:view` | عرض قائمة الموردين | `/suppliers` | Page |
| `suppliers:create` | إضافة مورد | Add Button | Action |
| `suppliers:edit` | تعديل مورد | Edit Button | Action |
| `suppliers:delete` | حذف مورد | Delete Button | Action |
| `suppliers:view_deleted` | عرض الموردين المحذوفين | Show Deleted | Action |
| `suppliers:restore` | استعادة مورد | Restore Button | Action |
| `suppliers:permanent_delete` | حذف نهائي | Permanent Delete | Action |

---

### 6. المحاسبة - دليل الحسابات (Chart of Accounts)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:accounts:view` | عرض دليل الحسابات | `/accounting/accounts` | Page |
| `master:accounts:create` أو `accounts:create` | إضافة حساب | Add Button | Action |
| `master:accounts:edit` أو `accounts:edit` | تعديل حساب | Edit Button | Action |
| `master:accounts:delete` أو `accounts:delete` | حذف حساب | Delete Button | Action |
| `master:accounts:view_deleted` | عرض الحسابات المحذوفة | Show Deleted | Action |
| `master:accounts:restore` | استعادة حساب | Restore Button | Action |
| `master:accounts:permanent_delete` | حذف نهائي | Permanent Delete | Action |

---

### 7. المحاسبة - القيود اليومية (Journal Entries)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:journal:view` | عرض القيود | `/accounting/journals` | Page |
| `accounting:journal:create` | إضافة قيد | `/accounting/journals/new` | Page |
| `accounting:journal:edit` | تعديل قيد | Edit Button | Action |
| `accounting:journal:delete` | حذف قيد | Delete Button | Action |
| `accounting:journal:post` | ترحيل قيد | Post Button | Action |
| `accounting:journal:reverse` | عكس قيد | Reverse Button | Action |
| `accounting:journal:view_deleted` | عرض القيود المحذوفة | Show Deleted | Action |
| `accounting:journal:restore` | استعادة قيد | Restore Button | Action |
| `accounting:journal:permanent_delete` | حذف نهائي | Permanent Delete | Action |

---

### 8. المحاسبة - التقارير (Financial Reports)

#### ميزان المراجعة (Trial Balance)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:reports:trial-balance:view` | عرض ميزان المراجعة | `/accounting/reports/trial-balance` | Page |
| `accounting:reports:trial-balance:export` | تصدير التقرير | Export Button | Action |

#### دفتر الأستاذ العام (General Ledger)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:reports:general-ledger:view` | عرض دفتر الأستاذ | `/accounting/reports/general-ledger` | Page |
| `accounting:reports:general-ledger:export` | تصدير التقرير | Export Button | Action |

#### قائمة الدخل (Income Statement)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:reports:income-statement:view` | عرض قائمة الدخل | `/accounting/reports/income-statement` | Page |
| `accounting:reports:income-statement:export` | تصدير التقرير | Export Button | Action |

#### الميزانية العمومية (Balance Sheet)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:reports:balance-sheet:view` | عرض الميزانية | `/accounting/reports/balance-sheet` | Page |
| `accounting:reports:balance-sheet:export` | تصدير التقرير | Export Button | Action |

---

### 9. المحاسبة - السنوات والفترات المالية
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `accounting:fiscal-years:view` | عرض السنوات المالية | `/accounting/fiscal-years` | Page |
| `accounting:fiscal-years:create` | إضافة سنة مالية | Add Button | Action |
| `accounting:fiscal-years:edit` | تعديل سنة مالية | Edit Button | Action |
| `accounting:fiscal-years:close` | إغلاق سنة مالية | Close Button | Action |
| `accounting:periods:view` | عرض الفترات المالية | `/accounting/periods` | Page |
| `accounting:periods:create` | إضافة فترة | Add Button | Action |
| `accounting:periods:close` | إغلاق فترة | Close Button | Action |

---

### 10. البيانات الأساسية (Master Data)

#### الأصناف (Items)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:items:view` | عرض الأصناف | `/master/items` | Page |
| `master:items:create` | إضافة صنف | Add Button | Action |
| `master:items:edit` | تعديل صنف | Edit Button | Action |
| `master:items:delete` | حذف صنف | Delete Button | Action |

#### التصنيفات (Categories)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:categories:view` | عرض التصنيفات | `/master/categories` | Page |
| `master:categories:create` | إضافة تصنيف | Add Button | Action |
| `master:categories:edit` | تعديل تصنيف | Edit Button | Action |
| `master:categories:delete` | حذف تصنيف | Delete Button | Action |

#### العملاء (Customers)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:customers:view` | عرض العملاء | `/master/customers` | Page |
| `master:customers:create` | إضافة عميل | Add Button | Action |
| `master:customers:edit` | تعديل عميل | Edit Button | Action |
| `master:customers:delete` | حذف عميل | Delete Button | Action |

#### الموردين (Vendors)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:vendors:view` | عرض الموردين | `/master/vendors` | Page |
| `master:vendors:create` | إضافة مورد | Add Button | Action |
| `master:vendors:edit` | تعديل مورد | Edit Button | Action |
| `master:vendors:delete` | حذف مورد | Delete Button | Action |

#### مراكز التكلفة (Cost Centers)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:cost-centers:view` | عرض مراكز التكلفة | `/master/cost-centers` | Page |
| `master:cost-centers:create` | إضافة مركز تكلفة | Add Button | Action |
| `master:cost-centers:edit` | تعديل مركز | Edit Button | Action |
| `master:cost-centers:delete` | حذف مركز | Delete Button | Action |

#### العملات (Currencies)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `master:currencies:view` | عرض العملات | `/master/currencies` | Page |
| `master:currencies:create` | إضافة عملة | Add Button | Action |
| `master:currencies:edit` | تعديل عملة | Edit Button | Action |
| `master:currencies:delete` | حذف عملة | Delete Button | Action |

---

### 11. إدارة المستخدمين (User Management)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `users:view` | عرض المستخدمين | `/admin/users` | Page |
| `users:create` | إضافة مستخدم | `/admin/users/create` | Page |
| `users:edit` | تعديل مستخدم | `/admin/users/[id]/edit` | Page |
| `users:delete` | حذف مستخدم | Delete Button | Action |
| `users:restore` | استعادة مستخدم محذوف | Restore Button | Action |
| `users:permanent_delete` | حذف نهائي | Permanent Delete | Action |
| `users:view_deleted` | عرض المستخدمين المحذوفين | Show Deleted Toggle | Action |
| `users:manage_status` | تفعيل/تعطيل المستخدم | Status Toggle | Action |
| `users:assign_roles` | تعيين الأدوار | Role Assignment | Action |
| `users:view_activity` | عرض نشاط المستخدم | Activity Tab | Component |

---

### 12. إدارة الأدوار (Roles Management)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `roles:view` | عرض الأدوار | `/admin/roles` | Page |
| `roles:create` | إضافة دور | `/admin/roles/create` | Page |
| `roles:edit` | تعديل دور | `/admin/roles/[id]/edit` | Page |
| `roles:delete` | حذف دور | Delete Button | Action |
| `roles:view_deleted` | عرض الأدوار المحذوفة | Show Deleted | Action |
| `roles:restore` | استعادة دور | Restore Button | Action |
| `roles:templates` | عرض قوالب الأدوار | `/admin/roles/templates` | Page |

---

### 13. سجل تسجيل الدخول (Login History)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `login-history:view` | عرض سجل تسجيل الدخول | `/admin/login-history` | Page |
| `login-history:export` | تصدير السجل | Export Button | Action |

---

### 14. إدارة النظام (System Administration)

#### الشركات (Companies)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `companies:view` | عرض الشركات | `/admin/companies` | Page |
| `companies:create` | إضافة شركة | Add Button | Action |
| `companies:edit` | تعديل شركة | Edit Button | Action |
| `companies:delete` | حذف شركة | Delete Button | Action |
| `companies:view_deleted` | عرض الشركات المحذوفة | Show Deleted | Action |
| `companies:restore` | استعادة شركة | Restore Button | Action |
| `companies:permanent_delete` | حذف نهائي | Permanent Delete | Action |

#### الفروع (Branches)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `branches:view` | عرض الفروع | `/admin/branches` | Page |
| `branches:create` | إضافة فرع | Add Button | Action |
| `branches:edit` | تعديل فرع | Edit Button | Action |
| `branches:delete` | حذف فرع | Delete Button | Action |
| `branches:view_deleted` | عرض الفروع المحذوفة | Show Deleted | Action |
| `branches:restore` | استعادة فرع | Restore Button | Action |
| `branches:permanent_delete` | حذف نهائي | Permanent Delete | Action |

#### الإعدادات (Settings)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `system_settings:view` | عرض الإعدادات | `/admin/settings` | Page |
| `system_settings:edit` | تعديل الإعدادات | Save Button | Action |

#### سجل التدقيق (Audit Logs)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `audit_logs:view` | عرض سجل التدقيق | `/audit-logs` | Page |
| `audit_logs:export` | تصدير السجل | Export Button | Action |

---

### 15. الإشعارات (Notifications)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `notifications:view` | عرض الإشعارات | `/notifications` | Page |
| `notifications:mark_read` | تحديد كمقروءة | Mark Read Button | Action |
| `notifications:delete` | حذف إشعار | Delete Button | Action |

---

### 16. طلبات تغيير كلمة المرور (Password Requests)
| الصلاحية | الوصف | الصفحة/العنصر | النوع |
|---------|------|---------------|------|
| `password_requests:view` | عرض الطلبات | Password Requests Page | Page |
| `password_requests:approve` | الموافقة على طلب | Approve Button | Action |
| `password_requests:reject` | رفض طلب | Reject Button | Action |

---

## 🔧 كيفية استخدام نظام الصلاحيات

### 1. حماية صفحة كاملة (Page-level Protection)

```tsx
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';

const MyPage = () => {
  return <div>My Protected Page</div>;
};

export default withPermission(MenuPermissions.Module.View, MyPage);
```

### 2. حماية زر أو عنصر (Action-level Protection)

```tsx
import { usePermissions } from '@/hooks/usePermissions';

const MyComponent = () => {
  const { can } = usePermissions();

  return (
    <>
      {can('module:create') && (
        <Button onClick={handleCreate}>إضافة</Button>
      )}
    </>
  );
};
```

### 3. استخدام مكونات محمية (Permission Components)

```tsx
import { PermissionButton } from '@/components/permission/PermissionComponents';

const MyComponent = () => {
  return (
    <PermissionButton 
      permission="module:edit"
      onClick={handleEdit}
    >
      تعديل
    </PermissionButton>
  );
};
```

### 4. حماية جدول وأعمدة (Table Protection)

```tsx
import { PermissionTable } from '@/components/permission/PermissionComponents';

const MyTable = () => {
  const columns = [
    { key: 'name', title: 'الاسم', permission: 'module:view' },
    { key: 'email', title: 'البريد', permission: 'module:view_email' },
    { key: 'actions', title: 'الإجراءات', permission: 'module:edit' }
  ];

  return (
    <PermissionTable
      requiredPermission="module:view"
      columns={columns}
      data={data}
    />
  );
};
```

### 5. حماية Modal أو Dialog

```tsx
import { PermissionModal } from '@/components/permission/PermissionComponents';

const MyModal = () => {
  return (
    <PermissionModal
      requiredPermission="module:create"
      title="إضافة عنصر جديد"
      open={isOpen}
      onClose={handleClose}
    >
      <Form />
    </PermissionModal>
  );
};
```

---

## 🎯 أفضل الممارسات (Best Practices)

### 1. التسمية (Naming Convention)
- استخدم الصيغة: `module:action` مثل `users:create`
- للتقارير: `module:reports:report-name:action` مثل `accounting:reports:trial-balance:view`
- للبيانات الأساسية: `master:module:action` مثل `master:accounts:view`

### 2. التدرج (Granularity)
- صلاحيات Page-level: `module:view`
- صلاحيات Action-level: `module:create`, `module:edit`, `module:delete`
- صلاحيات Soft Delete: `module:view_deleted`, `module:restore`, `module:permanent_delete`

### 3. الأمان (Security)
- ✅ احم جميع الصفحات بـ `withPermission`
- ✅ احم جميع الأزرار بفحص `can()`
- ✅ استخدم PermissionComponents بدلاً من العناصر العادية
- ✅ لا تعتمد على إخفاء العناصر فقط - احم API endpoints أيضاً

### 4. الاختبار (Testing)
- اختبر مع مستخدم بدون صلاحيات
- اختبر مع صلاحيات محدودة
- اختبر Super Admin (يجب أن يرى كل شيء)
- اختبر Soft Delete Recovery

---

## 🚨 الأخطاء الشائعة (Common Mistakes)

### ❌ خطأ: عدم حماية الصفحة
```tsx
const MyPage = () => <div>Content</div>;
export default MyPage;
```

### ✅ صحيح: حماية الصفحة
```tsx
const MyPage = () => <div>Content</div>;
export default withPermission('module:view', MyPage);
```

---

### ❌ خطأ: عدم فحص صلاحية الزر
```tsx
<Button onClick={handleDelete}>حذف</Button>
```

### ✅ صحيح: فحص صلاحية الزر
```tsx
{can('module:delete') && (
  <Button onClick={handleDelete}>حذف</Button>
)}
```

---

### ❌ خطأ: استخدام صلاحيات مختلفة لنفس العملية
```tsx
// في صفحة
withPermission('users:manage', UsersPage)

// في قائمة
{ permission: 'users:view', ... }
```

### ✅ صحيح: استخدام نفس الصلاحية
```tsx
// في صفحة
withPermission(MenuPermissions.Users.View, UsersPage)

// في قائمة
{ permission: MenuPermissions.Users.View, ... }
```

---

## 📊 إحصائيات النظام

- **إجمالي الصلاحيات:** 185
- **الصفحات المحمية:** 49
- **المكونات المحمية:** 8
- **الأدوار المعرّفة:** 1 (Admin/Super Admin)
- **المستخدمين:** 1 (ali@alhajco.com)

---

## 🔄 التحديثات المستقبلية

### قريباً (Soon)
- [ ] إضافة أدوار مخصصة (Custom Roles)
- [ ] صلاحيات على مستوى البيانات (Data-level Permissions)
- [ ] صلاحيات ديناميكية (Dynamic Permissions)

### مخطط له (Planned)
- [ ] Permission Groups
- [ ] Permission Inheritance
- [ ] Permission Audit Trail

---

**تم إعداد الوثيقة بواسطة:** GitHub Copilot  
**آخر تحديث:** 23 ديسمبر 2025  
**الحالة:** مكتمل بنسبة 90%
