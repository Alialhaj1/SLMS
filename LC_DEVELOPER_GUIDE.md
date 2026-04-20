# 🏦 دليل المطور - الاعتمادات المستندية (Letters of Credit)

> آخر تحديث: يونيو 2025  
> الغرض: توثيق شامل لوحدة الاعتمادات المستندية - سيناريو العمل، الشاشات، الحقول، الأزرار، والفجوات

---

## 📋 فهرس المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [هيكل قاعدة البيانات](#2-هيكل-قاعدة-البيانات)
3. [مخطط سير العمل](#3-مخطط-سير-العمل)
4. [واجهة البرمجة (Backend API)](#4-واجهة-البرمجة-backend-api)
5. [الشاشات الحالية (Frontend)](#5-الشاشات-الحالية-frontend)
6. [القائمة وإعدادات التنقل](#6-القائمة-وإعدادات-التنقل)
7. [الصلاحيات](#7-الصلاحيات)
8. [الفجوات الحرجة](#8-الفجوات-الحرجة)
9. [خطة التطوير المقترحة](#9-خطة-التطوير-المقترحة)

---

## 1. نظرة عامة

وحدة الاعتمادات المستندية تدير دورة حياة خطابات الاعتماد البنكية من الإنشاء حتى الإغلاق، وتشمل:
- إنشاء وتعديل الاعتمادات
- تتبع المراحل (12 حالة)
- إدارة التعديلات (Amendments)
- إدارة المستندات المقدمة
- تتبع الدفعات
- نظام التنبيهات (انتهاء الصلاحية، مواعيد الشحن)
- لوحة معلومات شاملة

### الملفات الرئيسية

| الملف | الموقع | الحالة |
|-------|--------|--------|
| Migration | `backend/migrations/187_create_letters_of_credit_module.sql` | ✅ مكتمل |
| Migration Fix | `backend/migrations/188_fix_lc_number_unique_constraint.sql` | ✅ مكتمل |
| Backend Route | `backend/src/routes/lettersOfCredit.ts` (~1300 سطر) | ⚠️ مكتمل جزئياً |
| الصفحة الرئيسية | `frontend-next/pages/documents/letter-of-credit.tsx` | 🔴 بيانات وهمية فقط! |
| أنواع الاعتمادات | `frontend-next/pages/finance/lc-types.tsx` | ✅ يعمل بالكامل |
| التنبيهات | `frontend-next/pages/finance/lc-alerts.tsx` | ✅ يعمل بالكامل |

---

## 2. هيكل قاعدة البيانات

### 2.1 جدول أنواع الاعتمادات (`lc_types`)

```sql
id, company_id, code, name, name_ar, description,
is_sight, is_usance, is_deferred, is_revolving,
is_transferable, is_back_to_back, is_red_clause, is_standby,
display_order, is_active, created_at, updated_at
```

**البيانات المبدئية (8 أنواع):**
| الكود | الاسم | الوصف |
|-------|-------|-------|
| SIGHT | اعتماد بالاطلاع | الدفع عند تقديم المستندات |
| USANCE | اعتماد آجل | الدفع بعد فترة محددة |
| DEFERRED | اعتماد مؤجل | الدفع في تاريخ مستقبلي |
| REVOLVING | اعتماد دوار | يتجدد تلقائياً |
| TRANSFERABLE | اعتماد قابل للتحويل | يمكن تحويله لطرف ثالث |
| BACK_TO_BACK | اعتماد ظهر بظهر | اعتماد مقابل اعتماد آخر |
| RED_CLAUSE | اعتماد بالشرط الأحمر | دفعة مقدمة قبل الشحن |
| STANDBY | اعتماد ضمان | ضمان للالتزام |

### 2.2 جدول حالات الاعتماد (`lc_statuses`)

```sql
id, company_id, code, name, name_ar, color, display_order,
is_initial, is_final, is_active
```

**الحالات (12 حالة) مع سير العمل:**
```
DRAFT (مسودة) ─→ REQUESTED (مطلوب) ─→ ISSUED (صادر) ─→ ADVISED (مُبلَّغ)
     │                                       │              │
     │                                       ▼              ▼
     │                                  AMENDED (معدّل)  CONFIRMED (مؤكد)
     │                                       │              │
     │                                       ▼              ▼
     │                              DOCUMENTS_PRESENTED (مستندات مقدمة)
     │                                       │
     │                                  ┌────┴────┐
     │                                  ▼         ▼
     │                           DISCREPANT    PAID (مدفوع)
     │                           (تباينات)         │
     │                                  │         ▼
     │                                  ▼     CLOSED (مغلق)
     │                              PAID ──→ CLOSED
     │
     ├──→ CANCELLED (ملغي)
     └──→ EXPIRED (منتهي)
```

### 2.3 جدول الاعتمادات الرئيسي (`letters_of_credit`) - ~60 حقل

#### أ) الأطراف المعنية
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `applicant_id` | FK → vendors | مقدم الطلب (المستورد) |
| `beneficiary_id` | FK → vendors | المستفيد (المُصدِّر) |
| `issuing_bank_id` | FK → vendors | البنك المُصدِر |
| `advising_bank_id` | FK → vendors | البنك المُبلِّغ |
| `confirming_bank_id` | FK → vendors | البنك المُؤكِّد |
| `reimburse_bank_id` | FK → vendors | بنك التعويض |

#### ب) المبالغ والعملة
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `currency_id` | FK → currencies | العملة |
| `original_amount` | DECIMAL(18,4) | المبلغ الأصلي |
| `current_amount` | DECIMAL(18,4) | المبلغ الحالي (بعد التعديلات) |
| `utilized_amount` | DECIMAL(18,4) | المبلغ المستخدم - افتراضي 0 |
| `available_amount` | AS computed | = current_amount - utilized_amount |
| `tolerance_percentage` | DECIMAL(5,2) | نسبة التسامح |

#### ج) التواريخ
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `issue_date` | DATE | تاريخ الإصدار |
| `expiry_date` | DATE | تاريخ الانتهاء |
| `latest_shipment_date` | DATE | آخر موعد للشحن |
| `presentation_period_days` | INT | فترة تقديم المستندات (أيام) |

#### د) شروط الدفع والشحن
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `payment_terms` | TEXT | شروط الدفع |
| `partial_shipments` | VARCHAR(20) | شحنات جزئية (allowed/not_allowed/conditional) |
| `transhipment` | VARCHAR(20) | إعادة الشحن (allowed/not_allowed) |
| `port_of_loading` | VARCHAR(200) | ميناء التحميل |
| `port_of_discharge` | VARCHAR(200) | ميناء التفريغ |
| `place_of_delivery` | VARCHAR(200) | مكان التسليم |
| `incoterm_id` | FK → incoterms | شرط التسليم الدولي |

#### هـ) البضائع والوصف
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `goods_description` | TEXT | وصف البضائع |
| `documents_required` | TEXT | المستندات المطلوبة |
| `additional_conditions` | TEXT | شروط إضافية |

#### و) الربط بالكيانات الأخرى
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `project_id` | FK → projects | المشروع المرتبط |
| `purchase_order_id` | FK → purchase_orders | أمر الشراء المرتبط |
| `shipment_id` | FK → shipments | الشحنة المرتبطة |

#### ز) الحسابات المحاسبية
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `expense_account_id` | FK → chart_of_accounts | حساب المصروفات |
| `liability_account_id` | FK → chart_of_accounts | حساب الالتزامات |
| `margin_account_id` | FK → chart_of_accounts | حساب الهامش |

#### ح) الرسوم
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `opening_commission` | DECIMAL(18,4) | عمولة الفتح |
| `amendment_fees` | DECIMAL(18,4) | رسوم التعديل |
| `swift_charges` | DECIMAL(18,4) | رسوم SWIFT |
| `other_charges` | DECIMAL(18,4) | رسوم أخرى |
| `total_fees` | AS computed | = مجموع جميع الرسوم |

#### ط) إعدادات التنبيهات
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `alert_before_expiry_days` | INT | التنبيه قبل الانتهاء (أيام) - افتراضي 30 |
| `alert_before_shipment_days` | INT | التنبيه قبل الشحن (أيام) - افتراضي 15 |

### 2.4 جدول التعديلات (`lc_amendments`)

```sql
id, company_id, lc_id (FK), amendment_number, amendment_date,
field_changed, old_value, new_value, reason,
amendment_fee (DECIMAL 18,4),
requested_by (FK users), approved_by (FK users),
status (pending/approved/rejected), notes,
created_at, updated_at
```

### 2.5 جدول مستندات الاعتماد (`lc_documents`)

```sql
id, company_id, lc_id (FK), document_type, document_number,
presentation_date, received_date,
status (pending/accepted/rejected/discrepant),
discrepancy_details, file_path, file_name, file_size,
uploaded_by (FK users), notes,
created_at, updated_at
```

### 2.6 جدول الدفعات (`lc_payments`)

```sql
id, company_id, lc_id (FK), payment_number, payment_date,
amount (DECIMAL 18,4), currency_id (FK),
payment_type (sight/deferred/acceptance/negotiation),
bank_reference, value_date,
shipment_expense_id (FK), journal_entry_id (FK), notes,
created_at, updated_at
```

### 2.7 جدول التنبيهات (`lc_alerts`)

```sql
id, company_id, lc_id (FK),
alert_type (expiry/shipment/document/payment/amendment),
alert_date, message, priority (low/medium/high/critical),
is_read (default false), is_dismissed (default false),
read_by (FK users), read_at, created_at
```

### 2.8 View: ملخص لوحة المعلومات (`lc_dashboard_summary`)

```sql
-- يعرض: company_id, total_lcs, active_lcs, draft_count,
--        total_original_amount, total_current_amount,
--        total_utilized, total_available,
--        expiring_30_days, amendments_count
```

---

## 3. مخطط سير العمل

### 3.1 إنشاء اعتماد مستندي جديد

```
1. المستخدم يفتح شاشة إنشاء اعتماد جديد
2. يختار المورد (beneficiary_id) → يتم جلب مشاريع المورد المرتبطة بطلبات شراء
3. يختار المشروع (اختياري) → يتم جلب طلبات الشراء المرتبطة
4. يملأ بيانات البنوك (المُصدِر - المُبلِّغ - المُؤكِّد)
5. يحدد المبلغ والعملة ونسبة التسامح
6. يحدد التواريخ (الإصدار - الانتهاء - آخر شحن)
7. يحدد شروط الدفع والشحن (موانئ، Incoterm، شحنات جزئية)
8. يكتب وصف البضائع والمستندات المطلوبة
9. يحدد الحسابات المحاسبية والرسوم
10. يحفظ → الحالة = DRAFT
    → يتم إنشاء سجل في vendor_payments تلقائياً
    → يتم إنشاء تنبيه انتهاء صلاحية تلقائياً
```

### 3.2 دورة حياة الاعتماد

```
┌─────────┐    طلب     ┌──────────┐   إصدار    ┌────────┐
│  DRAFT  │──────────→│ REQUESTED │──────────→│ ISSUED │
└─────────┘           └──────────┘           └────┬───┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                               ┌─────────┐   ┌─────────┐   ┌──────────┐
                               │ ADVISED │   │ AMENDED │   │CONFIRMED │
                               └────┬────┘   └────┬────┘   └────┬─────┘
                                    │              │              │
                                    └──────────────┼──────────────┘
                                                   ▼
                                        ┌───────────────────┐
                                        │DOCUMENTS_PRESENTED│
                                        └────────┬──────────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    ▼                         ▼
                              ┌────────────┐           ┌──────┐
                              │ DISCREPANT │──(حل)──→│ PAID │
                              └────────────┘           └──┬───┘
                                                          ▼
                                                     ┌────────┐
                                                     │ CLOSED │
                                                     └────────┘

  أي مرحلة ──→ CANCELLED (إلغاء)
  عند الانتهاء ──→ EXPIRED (انتهاء تلقائي)
```

### 3.3 عمليات التعديل (Amendments)

```
1. المستخدم يفتح اعتماد قائم
2. يضغط "تعديل" (Amend)
3. يحدد الحقل المُعدَّل (amount/expiry_date/goods_description/other)
4. يُدخل القيمة القديمة والجديدة
5. يحدد السبب ورسوم التعديل
6. يحفظ → يتم إنشاء سجل في lc_amendments
            → تحديث current_amount أو expiry_date في الاعتماد الرئيسي
            → تغيير الحالة إلى AMENDED
```

---

## 4. واجهة البرمجة (Backend API)

### 4.1 نقاط النهاية المطبقة ✅

| Method | Endpoint | الوصف | الصلاحية |
|--------|----------|-------|---------|
| `GET` | `/api/letters-of-credit/types` | قائمة أنواع الاعتمادات | `lc_types:view` |
| `POST` | `/api/letters-of-credit/types` | إنشاء نوع | `lc_types:manage` |
| `PUT` | `/api/letters-of-credit/types/:id` | تعديل نوع | `lc_types:manage` |
| `DELETE` | `/api/letters-of-credit/types/:id` | حذف نوع (مع فحص الاستخدام) | `lc_types:manage` |
| `GET` | `/api/letters-of-credit/statuses` | قائمة الحالات | `letters_of_credit:view` |
| `GET` | `/api/letters-of-credit/dashboard` | لوحة المعلومات | `letters_of_credit:view` |
| `GET` | `/api/letters-of-credit/available-projects/:vendorId` | مشاريع المورد بدون اعتماد | `letters_of_credit:create` |
| `GET` | `/api/letters-of-credit` | قائمة الاعتمادات (مع فلاتر) | `letters_of_credit:view` |
| `GET` | `/api/letters-of-credit/alerts` | قائمة التنبيهات (بسيطة) | `lc_alerts:view` |
| `GET` | `/api/letters-of-credit/alerts/all` | تنبيهات مع فلاتر | `lc_alerts:view` |
| `PUT` | `/api/letters-of-credit/alerts/:alertId/read` | تعليم تنبيه كمقروء | `lc_alerts:manage` |
| `PUT` | `/api/letters-of-credit/alerts/:alertId/resolve` | حل تنبيه | `lc_alerts:manage` |
| `GET` | `/api/letters-of-credit/:id` | تفاصيل اعتماد واحد (مع amendments, documents, payments) | `letters_of_credit:view` |
| `POST` | `/api/letters-of-credit` | إنشاء اعتماد جديد (~60 حقل) | `letters_of_credit:create` |
| `PUT` | `/api/letters-of-credit/:id` | تعديل اعتماد | `letters_of_credit:edit` |
| `DELETE` | `/api/letters-of-credit/:id` | حذف ناعم (soft delete) | `letters_of_credit:delete` |
| `POST` | `/api/letters-of-credit/:id/amend` | إنشاء تعديل | `letters_of_credit:amend` |

### 4.2 تفاصيل الفلاتر (`GET /`)

| الفلتر | النوع | الوصف |
|--------|-------|-------|
| `status` | string | فلترة بالحالة (كود) |
| `type_id` | number | فلترة بالنوع |
| `project_id` | number | فلترة بالمشروع |
| `vendor_id` | number | فلترة بالمورد |
| `bank_id` | number | فلترة بالبنك |
| `expiring_within_days` | number | اعتمادات تنتهي خلال X يوم |
| `search` | string | بحث في رقم LC والوصف |
| `page` / `limit` | number | الترقيم |

### 4.3 تفاصيل لوحة المعلومات (`GET /dashboard`)

**البيانات المُرجعة:**
```json
{
  "summary": {
    "active_count": 15,
    "draft_count": 3,
    "issued_count": 8,
    "paid_count": 4
  },
  "by_currency": [
    { "currency_code": "USD", "count": 10, "total_amount": 500000 },
    { "currency_code": "SAR", "count": 5, "total_amount": 200000 }
  ],
  "recent_alerts": [
    { "id": 1, "lc_number": "LC-2025-001", "alert_type": "expiry", "message": "..." }
  ]
}
```

### 4.4 منطق الأعمال في الإنشاء (`POST /`)

عند إنشاء اعتماد جديد:
1. **يُنشئ سجل `vendor_payment`** تلقائياً بالبيانات التالية:
   - `payment_type = 'letter_of_credit'`
   - `vendor_id = beneficiary_id`
   - `amount = original_amount`
   - `status = 'pending'`
2. **يُنشئ تنبيه** (`lc_alerts`) من نوع `expiry` مع رسالة تتضمن رقم الاعتماد وتاريخ الانتهاء

### 4.5 منطق التعديل (`POST /:id/amend`)

```
POST Body: {
  field_changed: "amount" | "expiry_date" | "goods_description" | "other",
  old_value, new_value, reason,
  amendment_fee (اختياري)
}

العمليات:
1. إنشاء سجل في lc_amendments مع رقم تسلسلي
2. إذا field_changed === "amount" → تحديث current_amount في الاعتماد
3. إذا field_changed === "expiry_date" → تحديث expiry_date في الاعتماد
4. تغيير حالة الاعتماد إلى AMENDED
```

### 4.6 نقاط النهاية الناقصة 🔴

| Method | Endpoint | الوصف | الأهمية |
|--------|----------|-------|---------|
| `POST` | `/api/letters-of-credit/:id/documents` | رفع/إضافة مستند للاعتماد | 🔴 حرج |
| `GET` | `/api/letters-of-credit/:id/documents` | جلب مستندات الاعتماد | 🟡 مهم |
| `PUT` | `/api/letters-of-credit/:id/documents/:docId` | تحديث حالة مستند | 🟡 مهم |
| `POST` | `/api/letters-of-credit/:id/payments` | تسجيل دفعة | 🔴 حرج |
| `GET` | `/api/letters-of-credit/:id/payments` | جلب دفعات الاعتماد | 🟡 مهم |
| `PUT` | `/api/letters-of-credit/:id/status` | تغيير الحالة يدوياً | 🟡 مهم |
| `GET` | `/api/letters-of-credit/reports` | تقارير الاعتمادات | 🟡 مهم |

> **ملاحظة:** الـ backend يذكر هذه النقاط في التعليقات لكنها **غير مطبقة** فعلياً

---

## 5. الشاشات الحالية (Frontend)

### 5.1 🔴 الشاشة الرئيسية - `documents/letter-of-credit.tsx` (بيانات وهمية!)

**المشكلة الأساسية:** هذه الصفحة تستخدم **بيانات وهمية مُدمجة في الكود** (mockLcs) ولا تتصل بأي API على الإطلاق!

#### الوضع الحالي (Mock):

**البيانات الوهمية:**
```typescript
const mockLcs = [
  { id: 1, lcNo: 'LC-2025-001', applicant: 'شركة الحج والعمرة',
    beneficiary: 'Al-Arab Trading Co.', issuingBank: 'البنك الأهلي السعودي',
    amount: 500000, currency: 'SAR', ... },
  // ... 3 سجلات وهمية فقط
];
```

**الحقول المعروضة (محدودة جداً):**
- `lcNo` - رقم الاعتماد
- `applicant` - مقدم الطلب (نص ثابت)
- `beneficiary` - المستفيد (نص ثابت)
- `issuingBank` - البنك المُصدِر (نص ثابت)
- `amount` / `currency` - المبلغ والعملة
- `issueDate` / `expiryDate` - التواريخ
- `status` - الحالة (5 فقط: draft, issued, amended, closed, cancelled)

**بطاقات KPI (من بيانات وهمية):**
| البطاقة | ماذا تعرض |
|---------|-----------|
| الصادرة/المعدّلة | عدد الاعتمادات بحالة issued أو amended |
| المسودات | عدد الاعتمادات بحالة draft |
| القيمة بالريال | مجموع مبالغ الاعتمادات |
| البنوك المُصدِرة | عدد البنوك الفريدة |

**الأزرار:**
| الزر | الوظيفة الفعلية |
|------|-----------------|
| "+ إنشاء اعتماد جديد" | يفتح modal بسيط مع حقول نصية → `handleCreate` يعرض toast "(demo)" فقط |
| "عرض" (في الجدول) | يفتح modal يعرض تفاصيل بسيطة من البيانات الوهمية |
| "إصدار" (في modal التفاصيل) | يعرض toast "(demo)" فقط |
| "إلغاء" (في modal التفاصيل) | يعرض toast "(demo)" فقط |

**فلتر الحالة:**
- dropdown بسيط بـ 5 حالات ثابتة (بينما قاعدة البيانات تحتوي 12 حالة)

#### ما ينقص هذه الشاشة (كل شيء تقريباً):

| # | الفجوة | الشدة |
|---|--------|-------|
| 1 | **لا اتصال بالـ API إطلاقاً** | 🔴 حرج |
| 2 | لا يوجد اختيار مورد (beneficiary) من API | 🔴 حرج |
| 3 | لا يوجد اختيار بنك من API | 🔴 حرج |
| 4 | لا يوجد اختيار مشروع مرتبط | 🔴 حرج |
| 5 | لا يوجد اختيار أمر شراء مرتبط | 🔴 حرج |
| 6 | لا يوجد اختيار عملة من API | 🔴 حرج |
| 7 | لا يوجد نظام تعديلات (Amendments) | 🔴 حرج |
| 8 | لا يوجد نظام مستندات | 🔴 حرج |
| 9 | لا يوجد نظام دفعات | 🔴 حرج |
| 10 | لا يوجد صفحة تفاصيل كاملة (فقط modal بسيط) | 🔴 حرج |
| 11 | لا توجد حقول الشحن (موانئ، Incoterm) | 🟡 مهم |
| 12 | لا توجد حقول محاسبية | 🟡 مهم |
| 13 | لا توجد حقول الرسوم | 🟡 مهم |
| 14 | لا يوجد وصف البضائع والشروط | 🟡 مهم |
| 15 | الحالات 5 فقط من أصل 12 | 🟡 مهم |
| 16 | لا يوجد إعدادات تنبيهات (alert_before_expiry_days) | 🟢 تحسين |
| 17 | لا يوجد حقل نسبة التسامح (tolerance) | 🟢 تحسين |

---

### 5.2 ✅ شاشة أنواع الاعتمادات - `finance/lc-types.tsx`

**الحالة:** تعمل بالكامل ومتصلة بالـ API

**الاتصال:** `GET/POST/PUT/DELETE /api/letters-of-credit/types`

**الحقول في النموذج:**
| الحقل | النوع | مطلوب |
|-------|-------|-------|
| الكود (code) | text | ✅ |
| الاسم (name) | text | ✅ |
| الاسم بالعربي (name_ar) | text | لا |
| الوصف (description) | textarea | لا |
| ترتيب العرض (display_order) | number | لا |
| اعتماد بالاطلاع (is_sight) | checkbox | لا |
| اعتماد آجل (is_usance) | checkbox | لا |
| اعتماد مؤجل (is_deferred) | checkbox | لا |
| اعتماد دوار (is_revolving) | checkbox | لا |
| قابل للتحويل (is_transferable) | checkbox | لا |
| ظهر بظهر (is_back_to_back) | checkbox | لا |
| الشرط الأحمر (is_red_clause) | checkbox | لا |
| ضمان (is_standby) | checkbox | لا |

**الأزرار:**
| الزر | الوظيفة |
|------|---------|
| "+ إضافة نوع جديد" | يفتح modal الإنشاء → POST /types |
| "تعديل" (في كل صف) | يفتح modal التعديل → PUT /types/:id |
| "حذف" (في كل صف) | يطلب تأكيد → DELETE /types/:id |

**صلاحية:** `lc_types:manage`

---

### 5.3 ✅ شاشة التنبيهات - `finance/lc-alerts.tsx`

**الحالة:** تعمل بالكامل ومتصلة بالـ API

**الاتصالات:**
- `GET /api/letters-of-credit/alerts/all` - جلب التنبيهات
- `GET /api/letters-of-credit?expiring_within_days=30` - الاعتمادات المنتهية قريباً
- `PUT /api/letters-of-credit/alerts/:id/read` - تعليم كمقروء
- `PUT /api/letters-of-credit/alerts/:id/resolve` - حل التنبيه

**بطاقات الملخص:**
| البطاقة | الوصف |
|---------|-------|
| تنتهي خلال 7 أيام | عدد الاعتمادات المنتهية قريباً |
| آخر شحن خلال 7 أيام | عدد الاعتمادات مع مواعيد شحن قريبة |
| تنبيهات غير مقروءة | عدد التنبيهات الجديدة |
| تنبيهات محلولة | عدد التنبيهات التي تم حلها |

**جدول الاعتمادات المنتهية:**
- يعرض: رقم الاعتماد، المستفيد، البنك، المبلغ، تاريخ الانتهاء، الأيام المتبقية
- تلوين الأيام: أحمر (≤ 7 أيام)، أصفر (≤ 14 يوم)، أخضر (>14 يوم)

**قائمة التنبيهات:**
- فلتر: الكل / غير مقروءة / حرجة / تحذيرات
- أزرار: "تعليم كمقروء" / "حل"
- أيقونات ملونة حسب الأولوية (critical=أحمر، high=برتقالي، medium=أصفر، low=أزرق)

---

### 5.4 ❌ الشاشة المفقودة - `/finance/letters-of-credit`

**المشكلة:** القائمة تشير إلى `/finance/letters-of-credit` لكن **هذه الصفحة غير موجودة إطلاقاً!**

هذا يعني أن المستخدم عند النقر على "الاعتمادات المستندية" في القائمة المالية سيحصل على **صفحة 404**.

---

## 6. القائمة وإعدادات التنقل

### 6.1 مداخل القائمة

| القسم | المفتاح | المسار | الحالة |
|-------|---------|--------|--------|
| المحاسبة والمالية | `financeAccounting.lettersOfCredit` | `/finance/letters-of-credit` | 🔴 صفحة غير موجودة! |
| المحاسبة والمالية | `financeAccounting.lcTypes` | `/finance/lc-types` | ✅ يعمل |
| المحاسبة والمالية | `financeAccounting.lcAlerts` | `/finance/lc-alerts` | ✅ يعمل |
| المستندات | `documents.lcDocuments` | `/documents/letter-of-credit` | ⚠️ بيانات وهمية |
| النقد والبنوك | `financials.cashBanks.lettersOfCredit` | `/finance/letters-of-credit` | 🔴 صفحة غير موجودة! |
| النقد والبنوك | `financials.cashBanks.lcTypes` | `/finance/lc-types` | ✅ يعمل |
| النقد والبنوك | `financials.cashBanks.lcAlerts` | `/finance/lc-alerts` | ✅ يعمل |

### 6.2 مشكلة التكرار

الاعتمادات المستندية مدرجة في **3 أماكن** بالقائمة:
1. قسم المحاسبة والمالية
2. قسم المستندات
3. قسم النقد والبنوك

**التوصية:** توحيد المدخل الرئيسي في مكان واحد (النقد والبنوك هو الأنسب) مع رابط في المستندات.

---

## 7. الصلاحيات

### 7.1 الصلاحيات المسجلة في قاعدة البيانات

| الصلاحية | الوصف |
|---------|-------|
| `letters_of_credit:view` | عرض الاعتمادات |
| `letters_of_credit:create` | إنشاء اعتماد |
| `letters_of_credit:edit` | تعديل اعتماد |
| `letters_of_credit:delete` | حذف اعتماد |
| `letters_of_credit:approve` | الموافقة على اعتماد |
| `letters_of_credit:amend` | تعديل (amendment) |
| `lc_types:view` | عرض الأنواع |
| `lc_types:manage` | إدارة الأنواع |
| `lc_alerts:view` | عرض التنبيهات |
| `lc_alerts:manage` | إدارة التنبيهات |

### 7.2 الصلاحيات المستخدمة فعلياً في الـ Backend

| نقطة النهاية | الصلاحية المستخدمة |
|-------------|-------------------|
| GET /types | `lc_types:view` |
| POST/PUT/DELETE /types | `lc_types:manage` |
| GET /statuses | `letters_of_credit:view` |
| GET /dashboard | `letters_of_credit:view` |
| GET /available-projects/:vendorId | `letters_of_credit:create` |
| GET / (قائمة) | `letters_of_credit:view` |
| GET /alerts | `lc_alerts:view` |
| PUT /alerts/:id/read | `lc_alerts:manage` |
| GET /:id (تفاصيل) | `letters_of_credit:view` |
| POST / (إنشاء) | `letters_of_credit:create` |
| PUT /:id (تعديل) | `letters_of_credit:edit` |
| DELETE /:id (حذف) | `letters_of_credit:delete` |
| POST /:id/amend | `letters_of_credit:amend` |

### 7.3 صلاحيات غير مستخدمة

- `letters_of_credit:approve` — مسجلة في قاعدة البيانات لكن **لا يوجد endpoint للموافقة**

---

## 8. الفجوات الحرجة

### 🔴 حرج (يجب إصلاحه فوراً)

| # | الفجوة | التفاصيل |
|---|--------|---------|
| 1 | **الصفحة الرئيسية بيانات وهمية بالكامل** | `documents/letter-of-credit.tsx` لا تتصل بالـ API إطلاقاً - كل البيانات hardcoded |
| 2 | **صفحة `/finance/letters-of-credit` غير موجودة** | القائمة تشير لصفحة لا وجود لها → 404 |
| 3 | **لا يوجد endpoint لإضافة مستندات** | `POST /:id/documents` غير مطبق رغم وجود جدول `lc_documents` |
| 4 | **لا يوجد endpoint لتسجيل دفعات** | `POST /:id/payments` غير مطبق رغم وجود جدول `lc_payments` |
| 5 | **نموذج الإنشاء لا يختار من API** | كل الحقول text inputs بدلاً من dropdowns مرتبطة بالموردين والبنوك والمشاريع |

### 🟡 مهم (يحتاج تطوير)

| # | الفجوة | التفاصيل |
|---|--------|---------|
| 6 | **الحالات ناقصة في الفرونت** | الفرونت يعرف 5 حالات فقط بينما قاعدة البيانات تحتوي 12 حالة |
| 7 | **لا توجد شاشة تفاصيل كاملة** | فقط modal بسيط بدلاً من صفحة تفاصيل مع tabs (تعديلات/مستندات/دفعات) |
| 8 | **لا توجد حقول الشحن** | لا موانئ، لا Incoterm، لا partial_shipments في الفرونت |
| 9 | **لا توجد حقول محاسبية** | لا حسابات مصروفات/التزامات/هامش في الفرونت |
| 10 | **لا توجد حقول الرسوم** | عمولة الفتح، SWIFT، رسوم أخرى — كلها غائبة من الفرونت |
| 11 | **لا يوجد وصف بضائع** | حقل goods_description غير موجود في نموذج الإنشاء |
| 12 | **لا يوجد زر تغيير الحالة** | لا يمكن نقل الاعتماد بين المراحل |
| 13 | **لا يوجد ربط بالشحنات** | الحقل shipment_id موجود في قاعدة البيانات لكن لا يُستخدم |
| 14 | **صلاحية `approve` غير مستخدمة** | مسجلة لكن بدون endpoint |
| 15 | **لا توجد تقارير** | لا يوجد endpoint أو شاشة للتقارير |

### 🟢 تحسينات

| # | الفجوة | التفاصيل |
|---|--------|---------|
| 16 | لوحة المعلومات غير معروضة في الفرونت | الـ API يوفر `/dashboard` لكن لا توجد شاشة dashboard |
| 17 | نسبة التسامح غير معروضة | tolerance_percentage غائب من الفرونت |
| 18 | إعدادات التنبيه غير قابلة للتعديل | alert_before_expiry_days / alert_before_shipment_days غير موجودة في الفرونت |
| 19 | تكرار مداخل القائمة | LC مكرر في 3 أماكن بالقائمة |

---

## 9. خطة التطوير المقترحة

### المرحلة 1: الأساسيات (الأعلى أولوية)

#### 1.1 إنشاء صفحة `/finance/letters-of-credit` الرئيسية

إنشاء صفحة جديدة `frontend-next/pages/finance/letters-of-credit.tsx` تحتوي:

**أ) بطاقات KPI (من GET /dashboard):**
- عدد الاعتمادات النشطة
- عدد المسودات
- عدد الصادرة
- عدد المدفوعة
- أعداد حسب العملة

**ب) جدول الاعتمادات (من GET /):**
- الأعمدة: رقم الاعتماد، النوع، المستفيد، البنك المُصدر، المبلغ، العملة، تاريخ الإصدار، تاريخ الانتهاء، الحالة، الإجراءات
- فلاتر: الحالة (12 حالة من API)، النوع، المشروع، المورد، البنك، البحث
- ترقيم الصفحات
- زر عرض التفاصيل → ينقل لصفحة التفاصيل

**ج) نموذج الإنشاء (modal أو صفحة):**
- **Tabs في النموذج:**

  **Tab 1 - البيانات الأساسية:**
  - رقم الاعتماد (auto أو يدوي)
  - النوع (dropdown من GET /types)
  - المستفيد (dropdown مع بحث من GET /api/vendors)
  - البنك المُصدر (dropdown من GET /api/vendors?type=bank)
  - البنك المُبلغ (dropdown)
  - البنك المُؤكد (dropdown، اختياري)

  **Tab 2 - المبالغ والتواريخ:**
  - العملة (dropdown من GET /api/currencies)
  - المبلغ الأصلي
  - نسبة التسامح
  - تاريخ الإصدار / الانتهاء / آخر شحن
  - فترة تقديم المستندات (أيام)

  **Tab 3 - شروط الشحن:**
  - شروط الدفع (textarea)
  - شحنات جزئية (dropdown: allowed/not_allowed/conditional)
  - إعادة الشحن (dropdown: allowed/not_allowed)
  - ميناء التحميل / التفريغ / مكان التسليم
  - Incoterm (dropdown من GET /api/incoterms)

  **Tab 4 - البضائع والمستندات:**
  - وصف البضائع (textarea)
  - المستندات المطلوبة (textarea)
  - شروط إضافية (textarea)

  **Tab 5 - الربط:**
  - المشروع (dropdown من GET /available-projects/:vendorId)
  - أمر الشراء (dropdown)
  - الشحنة (dropdown)

  **Tab 6 - المحاسبة:**
  - حساب المصروفات (dropdown من chart_of_accounts)
  - حساب الالتزامات (dropdown)
  - حساب الهامش (dropdown)
  - عمولة الفتح / رسوم SWIFT / رسوم أخرى

  **Tab 7 - التنبيهات:**
  - التنبيه قبل الانتهاء (أيام)
  - التنبيه قبل موعد الشحن (أيام)

#### 1.2 إنشاء صفحة تفاصيل الاعتماد

`frontend-next/pages/finance/letters-of-credit/[id].tsx`

**Tabs:**
- **معلومات عامة:** جميع بيانات الاعتماد (من GET /:id)
- **التعديلات:** جدول التعديلات + زر "إضافة تعديل" (POST /:id/amend)
- **المستندات:** جدول المستندات + زر "إضافة مستند" (يحتاج endpoint جديد)
- **الدفعات:** جدول الدفعات + زر "تسجيل دفعة" (يحتاج endpoint جديد)
- **سجل التغييرات:** تاريخ العمليات

**أزرار الإجراءات:**
| الزر | الشرط | الوظيفة |
|------|-------|---------|
| تعديل | الحالة ≠ CLOSED/CANCELLED | PUT /:id |
| إنشاء تعديل (Amend) | الحالة = ISSUED/ADVISED/CONFIRMED | POST /:id/amend |
| تغيير الحالة | حسب السياق | PUT /:id/status (يحتاج endpoint) |
| حذف | الحالة = DRAFT | DELETE /:id |
| طباعة | دائماً | تقرير PDF |

### المرحلة 2: الـ Backend الناقص

#### 2.1 إضافة endpoint المستندات

```typescript
// POST /api/letters-of-credit/:id/documents
router.post('/:id/documents', requirePermission('letters_of_credit:edit'), async (req, res) => {
  // multer لرفع الملفات
  // الحقول: document_type, document_number, presentation_date, notes
  // يحفظ في lc_documents
});

// PUT /api/letters-of-credit/:id/documents/:docId
router.put('/:id/documents/:docId', requirePermission('letters_of_credit:edit'), async (req, res) => {
  // تحديث الحالة: pending → accepted/rejected/discrepant
  // إذا discrepant → يملأ discrepancy_details
});
```

#### 2.2 إضافة endpoint الدفعات

```typescript
// POST /api/letters-of-credit/:id/payments
router.post('/:id/payments', requirePermission('letters_of_credit:edit'), async (req, res) => {
  // الحقول: payment_date, amount, currency_id, payment_type, bank_reference, value_date
  // يحدث utilized_amount في الاعتماد الرئيسي
  // يربط بـ shipment_expense_id إذا وُجد
  // يُنشئ قيد محاسبي (journal_entry_id) إذا لزم
});
```

#### 2.3 إضافة endpoint تغيير الحالة

```typescript
// PUT /api/letters-of-credit/:id/status
router.put('/:id/status', requirePermission('letters_of_credit:approve'), async (req, res) => {
  // التحقق من صحة الانتقال بين الحالات
  // توثيق التغيير
  // إنشاء تنبيه إذا لزم
});
```

### المرحلة 3: التحسينات

#### 3.1 تحديث الصفحة الحالية `documents/letter-of-credit.tsx`

- **خيار أ:** حذف الصفحة وتوجيه كل شيء إلى `/finance/letters-of-credit`
- **خيار ب (مُفضَّل):** تحويلها لصفحة "مستندات الاعتمادات" فقط تعرض المستندات المرتبطة

#### 3.2 لوحة معلومات

إنشاء dashboard في `/finance/letters-of-credit` تستخدم `GET /dashboard`:
- رسوم بيانية (توزيع حسب العملة / الحالة / النوع)
- اعتمادات منتهية قريباً
- آخر التنبيهات
- إجمالي المبالغ المتاحة vs المستخدمة

#### 3.3 تقارير

- تقرير ملخص الاعتمادات (حسب الحالة / المورد / البنك)
- تقرير المبالغ المستخدمة vs المتاحة
- تقرير الرسوم والعمولات
- تقرير التعديلات
- تقرير الاعتمادات المنتهية

#### 3.4 توحيد القائمة

- إبقاء مدخل واحد رئيسي في "النقد والبنوك" يؤدي لـ `/finance/letters-of-credit`
- تحويل `documents/letter-of-credit` لعرض المستندات فقط

---

## 10. ملخص الحالة

```
┌──────────────────────────────────────────────────────────────┐
│                    وحدة الاعتمادات المستندية                   │
├──────────────────────────────────────────────────────────────┤
│ قاعدة البيانات:  ███████████████████████████████  100% ✅    │
│ Backend API:      ████████████████████░░░░░░░░░░░   65% ⚠️   │
│ Frontend:         ████░░░░░░░░░░░░░░░░░░░░░░░░░░░   15% 🔴   │
│ التكامل:          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   10% 🔴   │
├──────────────────────────────────────────────────────────────┤
│ الجاهزية الكلية:  ████████░░░░░░░░░░░░░░░░░░░░░░░   ~30%     │
└──────────────────────────────────────────────────────────────┘

✅ يعمل: lc-types.tsx, lc-alerts.tsx, Backend CRUD + Amendments + Dashboard
🔴 لا يعمل: الصفحة الرئيسية (mock), Documents endpoint, Payments endpoint
❌ غير موجود: /finance/letters-of-credit page, تقارير, approval workflow
```

---

## 11. الشاشات المرتبطة بالوحدة

| الشاشة | المسار | العلاقة |
|-------|--------|--------|
| الموردون | `/master/vendors` | المستفيد + البنوك (beneficiary, issuing_bank, advising_bank) |
| أوامر الشراء | `/purchasing/orders` | ربط LC بأمر الشراء (purchase_order_id) |
| المشاريع | `/projects` | ربط LC بالمشروع (project_id) |
| الشحنات | `/shipments` | ربط LC بالشحنة (shipment_id) |
| العملات | `/master/currencies` | عملة الاعتماد (currency_id) |
| Incoterms | `/master/incoterms` | شروط التسليم (incoterm_id) |
| دليل الحسابات | `/accounting/chart-of-accounts` | الحسابات المحاسبية |
| دفعات الموردين | `/finance/vendor-payments` | يتم إنشاء سجل دفع تلقائياً عند إنشاء LC |
| أنواع اعتمادات | `/finance/lc-types` | تصنيف نوع الاعتماد |
| تنبيهات اعتمادات | `/finance/lc-alerts` | نظام التنبيهات والمتابعة |

---

> **للمطور:** الأولوية القصوى هي إنشاء صفحة `/finance/letters-of-credit.tsx` متصلة بالـ API الحقيقي،
> ثم إضافة endpoints المستندات والدفعات في الـ Backend، ثم بناء صفحة التفاصيل مع tabs.
