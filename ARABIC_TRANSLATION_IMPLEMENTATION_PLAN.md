# 🌐 خطة الترجمة العربية الشاملة 2.0 (Complete Arabic Translation Plan)

**التاريخ:** 23 ديسمبر 2025  
**الهدف:** ترجمة 100% من الواجهة إلى العربية مع دعم RTL كامل  
**الحالة:** 🟢 جاهز للتنفيذ الفوري

---

## 📊 التقييم السريع

### ✅ ما هو موجود
- نظام i18n موجود (`LocaleContext`)
- ملفات ar.json و en.json موجودة
- بعض الصفحات مترجمة جزئياً
- Tailwind RTL Support موجود

### ⚠️ المشاكل الحالية
- نصوص hardcoded في 42 ملف
- بعض الصفحات لا تستخدم i18n
- Menu لا يستخدم الترجمة
- رسائل الأخطاء بالإنجليزية
- أسماء أعمدة الجداول بالإنجليزية

---

## 🎯 خطة التنفيذ السريعة (Quick Win Plan)

### المرحلة 1: إصلاح سريع (يوم واحد)

#### الخطوة 1: Menu Registry (ساعة واحدة)
```typescript
// ملف: config/menu.registry.ts
// الحل السريع: استخدام t() function

import { useTranslation } from '../hooks/useTranslation';

// تحديث كل label في القائمة
{
  label: t('menu.dashboard'), // بدلاً من 'Dashboard'
  ...
}
```

**القوائم المستهدفة:**
- Dashboard
- Shipments (3 items)
- Expenses (3 items)
- Warehouses (2 items)
- Suppliers (2 items)
- Accounting (8 items)
- Master Data (6 items)
- Users & Access (3 items)
- System Admin (4 items)

**إجمالي:** 31 عنصر قائمة

#### الخطوة 2: Dashboard Page (ساعة واحدة)
```typescript
// ملف: pages/dashboard.tsx
// استبدال جميع النصوص الصريحة

// قبل:
<h1>Dashboard</h1>
<p>Welcome back</p>

// بعد:
const { t } = useTranslation();
<h1>{t('pages.dashboard.title')}</h1>
<p>{t('pages.dashboard.welcome')}</p>
```

#### الخطوة 3: Common UI Components (ساعتان)
```typescript
// Button, Modal, ConfirmDialog, Table, etc.

// Button
<Button>{t('common.save')}</Button>
<Button>{t('common.cancel')}</Button>
<Button>{t('common.delete')}</Button>

// Modal
<Modal title={t('common.confirm')}>

// ConfirmDialog
<ConfirmDialog 
  title={t('messages.confirm.delete')}
  message={t('messages.confirm.deleteWarning')}
/>
```

---

### المرحلة 2: الصفحات الرئيسية (يومان)

#### اليوم 1: CRUD Pages
- [ ] Shipments (2 ساعة)
- [ ] Expenses (2 ساعة)
- [ ] Warehouses (2 ساعة)
- [ ] Suppliers (2 ساعة)

**النمط:**
```typescript
function ShipmentsPage() {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t('pages.shipments.title')}</h1>
      <p>{t('pages.shipments.description')}</p>
      <Button>{t('pages.shipments.addShipment')}</Button>
      
      <Table columns={[
        { title: t('pages.shipments.reference'), ... },
        { title: t('pages.shipments.origin'), ... },
        { title: t('pages.shipments.destination'), ... },
      ]} />
    </>
  );
}
```

#### اليوم 2: Admin Pages
- [ ] Users (3 ساعات)
- [ ] Roles (2 ساعة)
- [ ] Companies (2 ساعة)
- [ ] Branches (2 ساعة)

---

### المرحلة 3: Accounting Pages (يومان)

#### اليوم 1
- [ ] Chart of Accounts (3 ساعات)
- [ ] Journal Entries (3 ساعات)

#### اليوم 2  
- [ ] Trial Balance (2 ساعة)
- [ ] General Ledger (2 ساعة)
- [ ] Income Statement (2 ساعة)
- [ ] Balance Sheet (2 ساعة)

---

### المرحلة 4: RTL Fixes (يوم واحد)

#### المشاكل الشائعة

**1. الجداول**
```tsx
// إضافة dir="rtl" للجداول العربية
<table dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

**2. الأيقونات**
```tsx
// تبديل margin للأيقونات
<Icon className={locale === 'ar' ? 'mr-2' : 'ml-2'} />
```

**3. Actions Column**
```tsx
// Actions على اليسار في RTL
<td className={locale === 'ar' ? 'text-left' : 'text-right'}>
```

**4. Sidebar**
```tsx
// Sidebar على اليمين في RTL
<div className={locale === 'ar' ? 'right-0' : 'left-0'}>
```

**الملفات المستهدفة:**
- MainLayout.tsx
- Sidebar.tsx
- جميع الصفحات بجداول
- جميع النماذج

---

## 📝 ملف ar.json المحدث (مختصر)

```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "view": "عرض",
    "search": "بحث",
    "filter": "فلترة",
    "export": "تصدير"
  },
  
  "menu": {
    "dashboard": "لوحة التحكم",
    "shipments": "الشحنات",
    "expenses": "المصروفات",
    "warehouses": "المستودعات",
    "suppliers": "الموردين",
    "accounting": "المحاسبة",
    "users": "المستخدمين",
    "roles": "الأدوار"
  },
  
  "pages": {
    "dashboard": {
      "title": "لوحة التحكم",
      "description": "نظرة عامة",
      "welcome": "مرحباً بعودتك"
    },
    "shipments": {
      "title": "الشحنات",
      "addShipment": "إضافة شحنة",
      "reference": "المرجع",
      "origin": "المنشأ",
      "destination": "الوجهة"
    }
  },
  
  "softDelete": {
    "viewDeleted": "عرض المحذوفات",
    "restore": "استعادة",
    "permanentDelete": "حذف نهائي"
  }
}
```

---

## 🔧 أدوات التطوير

### 1. سكريبت لإيجاد النصوص Hardcoded

```bash
# إيجاد جميع النصوص الصريحة
grep -r "\".*\"" frontend-next/pages/ --include="*.tsx" | grep -v "import\|const\|type"
```

### 2. سكريبت للتحقق من الترجمات المفقودة

```typescript
// scripts/check-translations.ts
import en from '../locales/en.json';
import ar from '../locales/ar.json';

function findMissingKeys(obj1: any, obj2: any, path = ''): string[] {
  const missing: string[] = [];
  
  for (const key in obj1) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj1[key] === 'object') {
      missing.push(...findMissingKeys(obj1[key], obj2[key] || {}, currentPath));
    } else if (!(key in obj2)) {
      missing.push(currentPath);
    }
  }
  
  return missing;
}

const missingInAr = findMissingKeys(en, ar);
console.log('Missing in Arabic:', missingInAr);
```

### 3. Component Helper

```typescript
// components/TranslatedText.tsx
interface Props {
  i18nKey: string;
  defaultText?: string;
}

export function TranslatedText({ i18nKey, defaultText }: Props) {
  const { t } = useTranslation();
  return <>{t(i18nKey) || defaultText || i18nKey}</>;
}

// الاستخدام:
<TranslatedText i18nKey="common.save" defaultText="Save" />
```

---

## ✅ قائمة التحقق (Checklist)

### الأسبوع الأول

#### اليوم 1: Setup + Menu
- [ ] تحديث useTranslation hook
- [ ] ترجمة Menu Registry (31 عنصر)
- [ ] اختبار التبديل بين اللغات
- [ ] ترجمة Sidebar
- [ ] ترجمة Navbar

#### اليوم 2: Dashboard + Common
- [ ] ترجمة Dashboard
- [ ] ترجمة Button Component
- [ ] ترجمة Modal Component
- [ ] ترجمة ConfirmDialog
- [ ] ترجمة Table Component

#### اليوم 3: CRUD Pages Part 1
- [ ] Shipments
- [ ] Expenses

#### اليوم 4: CRUD Pages Part 2
- [ ] Warehouses
- [ ] Suppliers

#### اليوم 5: Admin Pages
- [ ] Users
- [ ] Roles
- [ ] Companies
- [ ] Branches

### الأسبوع الثاني

#### اليوم 6-7: Accounting
- [ ] Chart of Accounts
- [ ] Journal Entries
- [ ] Trial Balance
- [ ] General Ledger
- [ ] Income Statement
- [ ] Balance Sheet

#### اليوم 8: RTL Fixes
- [ ] Fix Tables
- [ ] Fix Sidebar
- [ ] Fix Icons
- [ ] Fix Forms
- [ ] Fix Modals

#### اليوم 9: Testing
- [ ] اختبار كل صفحة
- [ ] اختبار RTL
- [ ] اختبار Forms
- [ ] اختبار Messages

#### اليوم 10: Polish
- [ ] إصلاح الأخطاء
- [ ] تحسين RTL
- [ ] مراجعة نهائية

---

## 📊 التقدم المتوقع

```
اليوم 1:  [████░░░░░░] 40% - Menu + Sidebar
اليوم 2:  [████████░░] 80% - Common Components
اليوم 3:  [██████████] 100% - CRUD Pages
اليوم 4:  [████░░░░░░] 40% - Admin Pages
اليوم 5:  [████████░░] 80% - Admin Complete
اليوم 6:  [█████░░░░░] 50% - Accounting Start
اليوم 7:  [██████████] 100% - Accounting Done
اليوم 8:  [██████████] 100% - RTL Fixed
اليوم 9:  [██████████] 100% - Tested
اليوم 10: [██████████] 100% - DONE! 🎉
```

---

## 🎯 النتيجة النهائية

عند الانتهاء:
- ✅ 100% من النصوص مترجمة
- ✅ RTL يعمل بشكل مثالي
- ✅ التبديل السلس بين اللغات
- ✅ تجربة مستخدم متناسقة
- ✅ جاهز للإنتاج

---

## 📞 الخطوة التالية

**الآن مطلوب:**
1. موافقة على الخطة ✅
2. البدء في اليوم 1 (Menu + Sidebar)
3. التقدم يومياً حسب الجدول

**الوقت المتوقع:** 10 أيام عمل  
**الجهد المطلوب:** 8 ساعات/يوم  
**المخرج النهائي:** نظام عربي 100%

---

**تم إعداد الخطة:** GitHub Copilot  
**التاريخ:** 23 ديسمبر 2025  
**الحالة:** 🟢 جاهز للبدء الفوري
