# نظام البيانات الجمركية - دليل الاستخدام السريع
## Customs Declarations Module - Quick Start Guide

تم تطبيق نظام احترافي متكامل لإدارة البيانات الجمركية (استيراد/تصدير/عبور) مع حسابات تلقائية، ثنائي اللغة، ودعم كامل للـ Dark Mode.

---

## ✅ التغييرات المطبقة / Applied Changes

### 1. قاعدة البيانات / Database

**الجداول الرئيسية (Migration 128):**
- `customs_declaration_types` - أنواع البيانات (استيراد/تصدير/عبور)
- `customs_declaration_statuses` - حالات سير العمل (11 حالة)
- `customs_declarations` - البيان الرئيسي
- `customs_declaration_parties` - الأطراف (مصدّر/مستورد/وكيل جمركي)
- `customs_declaration_items` - أصناف البيان مع حسابات CIF/الرسوم
- `customs_declaration_containers` - الحاويات والشحنات
- `customs_declaration_fees` - الرسوم (تلقائية ويدوية)
- `customs_declaration_inspections` - المعاينة الجمركية
- `customs_declaration_payments` - المدفوعات
- `customs_declaration_attachments` - المرفقات
- `customs_declaration_history` - سجل التغييرات

**البيانات المرجعية المُدخلة:**
- 6 أنواع بيانات جمركية
- 11 حالة workflow
- 8 أنواع رسوم
- 5 أنواع مستندات
- 4 وسائل نقل
- 3 أنواع حاويات

**الصلاحيات (9 permissions):**
- `customs_declarations:view` - عرض
- `customs_declarations:create` - إنشاء
- `customs_declarations:update` - تعديل
- `customs_declarations:delete` - حذف
- `customs_declarations:change_status` - تغيير الحالة
- `customs_declarations:print` - طباعة
- `customs_declarations:export` - تصدير
- `customs_declarations:upload` - رفع المرفقات
- `customs_declarations:view_history` - عرض السجل

---

### 2. Backend API

**الملفات المُنشأة/المُحدّثة:**
- `backend/src/routes/customsDeclarations.ts` - API endpoints
- `backend/migrations/128_create_customs_declarations.sql` - Schema

**API Endpoints (جميعها تدعم multi-tenant عبر `X-Company-Id`):**

```
GET  /api/customs-declarations/types          # أنواع البيانات
GET  /api/customs-declarations/statuses       # الحالات

GET  /api/customs-declarations                # قائمة البيانات (مع فلاتر)
GET  /api/customs-declarations/:id            # تفاصيل بيان + nested data

POST /api/customs-declarations                # إنشاء بيان جديد
PUT  /api/customs-declarations/:id            # تحديث بيان

PUT  /api/customs-declarations/:id/items      # حفظ الأصناف (bulk replace + auto-calculate totals)
PUT  /api/customs-declarations/:id/parties    # حفظ الأطراف (bulk replace)

POST /api/customs-declarations/:id/status     # تغيير الحالة (workflow)

DELETE /api/customs-declarations/:id          # حذف (soft delete)
```

**الميزات:**
- ✅ Validation بـ Zod schemas
- ✅ RBAC enforcement (`requirePermission` middleware)
- ✅ Audit logging (تسجيل تلقائي في `customs_declaration_history`)
- ✅ Company scoping (عزل كامل بين الشركات)
- ✅ **Auto-calculation** للإجماليات في الخادم:
  - Total CIF = SUM(item CIF values)
  - Total Duty = SUM(item duty amounts)
  - Total VAT = SUM(item VAT amounts)
  - Total Fees = Duty + VAT + Other Fees
  - Weights & Packages totals

---

### 3. Frontend UI

**الملفات المُنشأة/المُحدّثة:**

#### Pages (صفحات)
- `frontend-next/pages/customs/declarations/index.tsx` - **قائمة البيانات**
  - فلاتر: الحالة، النوع، الاتجاه، تاريخ من/إلى، بحث
  - جدول responsive مع badges ملونة للحالات
  - Pagination
  - زر "بيان جديد" (محمي بصلاحية `create`)

- `frontend-next/pages/customs/declarations/new.tsx` - **إنشاء بيان جديد**
  - React Hook Form + Zod validation
  - اختيار نوع البيان، الاتجاه، التاريخ، الرقم المرجعي
  - إعادة توجيه تلقائية بعد الإنشاء إلى صفحة التفاصيل

- `frontend-next/pages/customs/declarations/[id].tsx` - **تفاصيل البيان**
  - 9 تبويبات (Tabs): General / Parties / **Items** / Shipping / Fees / Inspection / Payments / Attachments / History
  - Status badge ملون حسب الحالة
  - أزرار: رجوع / تحديث / طباعة

#### Components (مكونات)
- `frontend-next/components/customs/DeclarationItemsTab.tsx` - **تبويب الأصناف (المُنفّذ الآن)**
  - **جدول ديناميكي** مع Add/Edit/Delete
  - **نموذج متقدم في Modal:**
    - كود HS + الوصف (EN/AR)
    - بلد المنشأ + الوحدة
    - الكمية + سعر الوحدة
    - الأوزان (إجمالي/صافي) + عدد الطرود
    - FOB / Freight / Insurance
    - نسب الرسوم الجمركية + VAT
    - رسوم أخرى
    - "يتطلب فحص" checkbox
  - **حسابات تلقائية في الوقت الفعلي:**
    - `CIF = FOB + Freight + Insurance`
    - `Duty Amount = CIF × Duty Rate%`
    - `VAT Amount = (CIF + Duty) × VAT Rate%`
    - `Total Fees = Duty + VAT + Other Fees`
  - **ملخص إجماليات:**
    - بطاقات KPI: Total CIF / Total Duty / Total VAT
    - صف إجماليات في أسفل الجدول
  - **UX احترافي:**
    - Skeleton loaders
    - Toast notifications
    - Confirm delete dialog
    - Form validation with inline errors
    - Dark mode + responsive
    - ثنائي اللغة (EN/AR)

#### Configuration (إعدادات)
- `frontend-next/config/menu.permissions.ts` - **صلاحيات القائمة**
  ```typescript
  MenuPermissions.Customs.Declarations = {
    View: 'customs_declarations:view',
    Create: 'customs_declarations:create',
    Update: 'customs_declarations:update',
    Delete: 'customs_declarations:delete',
    ChangeStatus: 'customs_declarations:change_status',
    Print: 'customs_declarations:print',
    Export: 'customs_declarations:export',
    Upload: 'customs_declarations:upload',
    ViewHistory: 'customs_declarations:view_history',
  }
  ```

- `frontend-next/config/menu.registry.ts` - **عنصر القائمة**
  - مضاف تحت Logistics → Customs Declarations

#### Translations (ترجمات)
- `frontend-next/locales/en.json`:
  ```json
  "menu.logistics.customsDeclarations": "Customs Declarations"
  ```
- `frontend-next/locales/ar.json`:
  ```json
  "menu.logistics.customsDeclarations": "البيانات الجمركية"
  ```

#### Types (TypeScript Interfaces)
- `frontend-next/types/customs.ts` - **نماذج البيانات الكاملة**
  - `CustomsDeclaration`
  - `CustomsDeclarationItem`
  - `CustomsDeclarationParty`
  - `CustomsDeclarationContainer`
  - `CustomsDeclarationFee`
  - `CustomsDeclarationInspection`
  - `CustomsDeclarationPayment`
  - `CustomsDeclarationAttachment`
  - `CustomsDeclarationHistory`
  - Request/Response DTOs
  - Filter interfaces

---

## 🎯 الميزات المُنفّذة / Implemented Features

### ✅ مُنجز
1. **Database Schema** - 11 جدول + indices + seeds
2. **Backend API** - CRUD + nested endpoints + auto-calculations
3. **Permissions** - 9 صلاحيات محددة
4. **List Page** - قائمة مع فلاتر وبحث
5. **Create Page** - نموذج إنشاء بيان جديد
6. **Details Page** - 9 تبويبات skeleton
7. **Items Tab (تبويب الأصناف)** - **مُنفّذ بالكامل:**
   - Dynamic table with full CRUD
   - Auto-calculations (CIF/Duty/VAT/Fees)
   - Modal form with validation
   - Totals summary
   - Dark mode + bilingual + RBAC-aware

### ⏳ قيد التطوير (التبويبات المتبقية)
1. **Parties Tab** - إدارة الأطراف (مصدّر/مستورد/وكيل)
2. **Shipping & Containers Tab** - الحاويات + الشحنات + BL/AWB
3. **Fees Tab** - رسوم تلقائية ويدوية
4. **Inspection Tab** - Timeline المعاينة الجمركية
5. **Payments Tab** - ربط المدفوعات + reconciliation
6. **Attachments Tab** - رفع المستندات (فاتورة، شهادة منشأ، إلخ)
7. **History Tab** - سجل التغييرات والحالات
8. **Print/PDF View** - قالب طباعة حكومي

---

## 🚀 كيفية الاستخدام / How to Use

### 1. الوصول إلى النظام
**URL:** [http://localhost:3001/customs/declarations](http://localhost:3001/customs/declarations)

**متطلبات:**
- مستخدم مُسجل دخول
- صلاحية `customs_declarations:view` على الأقل
- شركة نشطة محددة في الـ header

### 2. إنشاء بيان جديد
1. انقر **"بيان جديد"** / **"New Declaration"**
2. اختر نوع البيان (استيراد/تصدير/عبور/...)
3. حدد الاتجاه (Import/Export)
4. أدخل تاريخ البيان
5. (اختياري) أضف رقم مرجعي
6. انقر **"إنشاء"** / **"Create"**

سيتم إنشاء البيان بحالة **DRAFT** وإعادة توجيهك إلى صفحة التفاصيل.

### 3. إضافة الأصناف (Items)
في صفحة التفاصيل، اذهب إلى تبويب **"الأصناف"** / **"Items"**:

1. انقر **"إضافة صنف"** / **"Add Item"**
2. في النموذج:
   - أدخل رقم السطر (يتزايد تلقائياً)
   - **إلزامي:** كود HS، الوصف، الكمية، سعر الوحدة
   - **اختياري:** بلد المنشأ، الوحدة، الأوزان، الطرود
   - أدخل **FOB / Freight / Insurance** لحساب CIF
   - أدخل نسب **Duty Rate% / VAT Rate%**
   - شاهد **الحسابات التلقائية** في الأسفل:
     - CIF المحسوب
     - Duty Amount
     - VAT Amount
     - Total Fees
3. انقر **"حفظ"** / **"Save"**

**النتيجة:**
- يتم حفظ الصنف على الخادم
- تُحدّث إجماليات البيان الرئيسي تلقائياً (Total CIF, Total Duty, Total VAT, Total Fees)
- يظهر الصنف في الجدول

### 4. تعديل/حذف صنف
- **تعديل:** انقر أيقونة القلم ✏️ → عدّل → احفظ
- **حذف:** انقر أيقونة السلة 🗑️ → تأكيد → يُحذف + تُعاد حساب الإجماليات

### 5. التبويبات الأخرى
التبويبات الأخرى (Parties/Fees/Inspection/Payments/Attachments/History) تظهر رسالة "سيتم استكمال هذا التبويب في الخطوة التالية" - ستُنفّذ تباعاً.

---

## 🎨 واجهة المستخدم / UI Features

### Design System
- **TailwindCSS 3** مع custom theme
- **Colors:**
  - Primary: Blue-600
  - Success: Green-600
  - Warning: Yellow-600
  - Danger: Red-600
  - Info: Cyan-600
- **Status Badges:** ملونة حسب الحالة (blue/green/yellow/orange/purple/red)
- **Dark Mode:** دعم كامل، يتبع تفضيلات النظام

### Accessibility (WCAG AA)
- ✅ Keyboard navigation
- ✅ Focus states واضحة
- ✅ ARIA labels
- ✅ 4.5:1 contrast ratio
- ✅ Screen reader support

### Responsive Design
- **Desktop:** full sidebar + 3-column grids
- **Tablet:** 2-column grids, collapsible sidebar
- **Mobile:** 1-column, slide-over sidebar, horizontal scroll للجداول

### i18n (ثنائي اللغة)
- **English:** Default
- **Arabic:** RTL support (قيد التحسين)
- Toggle في الـ header

---

## 📊 مثال تطبيقي / Example Flow

### سيناريو: بيان استيراد لحاوية قطع غيار

1. **إنشاء البيان:**
   - Type: IMPORT
   - Direction: Import
   - Date: 2026-01-13

2. **إضافة صنف 1 - محرك:**
   - Line: 1
   - HS Code: 8407.21.00
   - Description: Car Engine 4-cylinder
   - Origin: Germany
   - Quantity: 50
   - Unit: Pieces
   - Gross Weight: 7500 kg
   - Net Weight: 7000 kg
   - Packages: 10
   - Unit Price: 2000 USD
   - FOB: 100,000 USD
   - Freight: 5,000 USD
   - Insurance: 1,000 USD
   - **→ CIF = 106,000 USD**
   - Duty Rate: 5%
   - **→ Duty = 5,300 USD**
   - VAT Rate: 15%
   - **→ VAT = 16,695 USD**
   - **→ Total Fees = 21,995 USD**

3. **إضافة صنف 2 - صندوق تروس:**
   - Line: 2
   - HS Code: 8708.40.00
   - Description: Gearbox Assembly
   - Origin: Germany
   - Quantity: 50
   - Unit Price: 500 USD
   - FOB: 25,000 USD
   - Freight: 1,250 USD
   - Insurance: 250 USD
   - **→ CIF = 26,500 USD**
   - Duty Rate: 5%
   - **→ Duty = 1,325 USD**
   - VAT Rate: 15%
   - **→ VAT = 4,173.75 USD**
   - **→ Total Fees = 5,498.75 USD**

4. **النتيجة النهائية (إجماليات البيان):**
   - **Total CIF:** 132,500 USD
   - **Total Customs Duty:** 6,625 USD
   - **Total VAT:** 20,868.75 USD
   - **Total Fees:** 27,493.75 USD

---

## 🔒 الأمان / Security

### RBAC (Role-Based Access Control)
- جميع الـ endpoints محمية بـ `authenticate` + `requirePermission` middleware
- الـ frontend يُخفي (لا يُعطّل) العناصر غير المصرح بها
- صلاحيات دقيقة (view/create/update/delete/change_status/print/...)

### Multi-Tenancy
- عزل كامل بين الشركات عبر `company_id`
- الـ frontend يُرسل `X-Company-Id` في كل request
- Backend middleware يفرض company scope على جميع الاستعلامات

### Audit Trail
- جميع التغييرات تُسجّل في `customs_declaration_history`
- يحفظ: الحالة القديمة/الجديدة، IP address، user ID، timestamp، action type

### Data Validation
- Backend: Zod schemas محكمة
- Frontend: React Hook Form + Zod resolver
- SQL: Foreign key constraints + indexes

---

## 🐛 المشاكل المعروفة / Known Issues

1. ~~Migration 128 permissions syntax error~~ ✅ **تم الحل:** أضيفت الأعمدة `name_en` و `name_ar`
2. Token في مثال curl أعلاه مُنتهي الصلاحية - استخدم token حقيقي من login
3. التبويبات الأخرى (Parties/Fees/...) لم تُنفّذ بعد

---

## 📞 الدعم / Support

للاستفسارات أو المشاكل:
1. تحقق من logs: `docker logs slms-backend-1`
2. تحقق من permissions: `SELECT * FROM permissions WHERE module = 'Customs'`
3. تحقق من الجداول: `\dt customs_*` في psql

---

## 🎉 الخلاصة / Summary

تم إنجاز **البنية التحتية الكاملة** لنظام البيانات الجمركية:
- ✅ 11 جدول + بيانات مرجعية + permissions
- ✅ Backend API متكامل مع حسابات تلقائية
- ✅ Frontend احترافي مع Items tab كامل الوظائف
- ✅ Dark mode + bilingual + RBAC + responsive + accessible

**الخطوة التالية:** تنفيذ باقي التبويبات (Parties/Fees/Inspection/...) لاستكمال الوحدة.

---

**تاريخ الإنجاز:** 13 يناير 2026  
**الإصدار:** v1.0 - Items Tab Complete
