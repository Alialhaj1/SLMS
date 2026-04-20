# 📋 دليل المطور الشامل - شاشات المشتريات (Purchasing Module)

> هذا الدليل يشرح بالتفصيل الشاشات الثلاث الرئيسية في وحدة المشتريات، مع تحليل كامل للكود والبيانات والعلاقات والفجوات.

---

## 🏗️ البنية العامة (Architecture Overview)

```
Frontend (Next.js - Port 3001)
├── pages/purchasing/quotations.tsx        ← شاشة عروض الأسعار
├── pages/purchasing/contracts.tsx          ← شاشة العقود
├── pages/purchasing/orders.tsx             ← شاشة أوامر الشراء (القائمة + نموذج مدمج)
├── pages/purchasing/orders/new.tsx         ← نموذج إنشاء أمر شراء (صفحة مستقلة)
├── pages/purchasing/orders/[id].tsx        ← تفاصيل أمر شراء
└── components/purchasing/                  ← مكونات مشتركة (PO form, invoice form)

Backend (Express - Port 4000)
├── routes/procurement/quotations.ts       ← API عروض الأسعار
├── routes/procurement/contracts.ts        ← API العقود
├── routes/procurement/purchaseOrders.ts   ← API أوامر الشراء (~1000 سطر)
├── services/vendorComplianceService.ts    ← فحص امتثال الموردين
├── services/documentNumberService.ts      ← ترقيم المستندات التلقائي
├── services/procurementSettingsService.ts ← إعدادات المشتريات
├── services/threeWayMatchingService.ts    ← المطابقة الثلاثية
└── services/purchaseOrderSyncService.ts   ← مزامنة الشحنات مع أوامر الشراء

Database (PostgreSQL - Port 5432)
├── vendor_quotations + vendor_quotation_items
├── vendor_contracts + vendor_contract_items + contract_approvals
├── purchase_orders + purchase_order_items
├── contract_types, contract_statuses
├── purchase_order_types, purchase_order_statuses
└── vendors, items, currencies, warehouses, ...
```

### المصادقة والصلاحيات
- **JWT Token**: يُرسل في header `Authorization: Bearer <token>`
- **Company Context**: يُرسل في header `X-Company-Id`
- **RBAC**: كل endpoint محمي بـ `requirePermission('resource:action')`
- **Middleware**: `authenticate` → `loadCompanyContext` → `requirePermission`

---

## 📄 الشاشة 1: عروض أسعار الموردين (Vendor Quotations)

### الملفات
| الملف | الدور |
|-------|-------|
| `frontend-next/pages/purchasing/quotations.tsx` | الصفحة الكاملة (~700 سطر) |
| `backend/src/routes/procurement/quotations.ts` | الـ API (~200 سطر) |
| جدول `vendor_quotations` | بيانات العروض |
| جدول `vendor_quotation_items` | بنود العرض |

### سيناريو العمل (Workflow)
```
[إنشاء عرض سعر] → الحالة: pending
     │
     ├── [قبول] → الحالة: accepted ✅
     ├── [رفض] → الحالة: rejected ❌
     ├── [حذف] → حذف كامل
     └── (انتهاء الصلاحية تلقائي) → expired ⏰
```

### الحالات (Statuses)
| الحالة | الوصف | الإجراءات المتاحة |
|--------|-------|-------------------|
| `pending` | قيد الانتظار | قبول، رفض، حذف |
| `accepted` | مقبول | عرض فقط |
| `rejected` | مرفوض | عرض فقط |
| `expired` | منتهي الصلاحية | عرض فقط |

### الحقول الرئيسية

#### جدول `vendor_quotations`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | SERIAL PK | المعرف |
| `company_id` | INT FK | الشركة |
| `vendor_id` | INT FK → vendors | المورد |
| `quotation_number` | VARCHAR | رقم تلقائي (QUOT-0001, QUOT-0002, ...) |
| `quotation_date` | DATE | تاريخ العرض |
| `valid_until` / `validity_date` | DATE | تاريخ انتهاء الصلاحية |
| `currency_id` | INT FK → currencies | العملة |
| `total_amount` | DECIMAL | المبلغ الإجمالي (محسوب من البنود) |
| `status` | VARCHAR | الحالة (pending/accepted/rejected/expired) |
| `description` | TEXT | وصف |
| `notes` | TEXT | ملاحظات |
| `created_by` | INT FK → users | المنشئ |
| `deleted_at` | TIMESTAMP | Soft delete |

#### جدول `vendor_quotation_items`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `quotation_id` | INT FK | العرض |
| `item_id` | INT FK → items | الصنف |
| `item_code` | VARCHAR | كود الصنف |
| `item_name` | VARCHAR | اسم الصنف |
| `uom_id` | INT FK → units_of_measure | وحدة القياس |
| `quantity` | DECIMAL | الكمية |
| `unit_price` | DECIMAL | سعر الوحدة |
| `line_total` | DECIMAL | إجمالي السطر |
| `notes` | TEXT | ملاحظات |

### واجهات TypeScript (Frontend)
```typescript
interface VendorQuotation {
  id: number;
  quotation_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  quotation_date: string;
  validity_date?: string;
  currency_id?: number;
  currency_symbol?: string;
  total_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
}

interface QuotationItem {
  item_id?: number;
  item_code: string;
  item_name: string;
  uom_id?: number;
  quantity: number;
  unit_price: number;
  // الحقول التالية معرّفة في الواجهة لكن غير مستخدمة في الإرسال:
  specifications?: string;
  brand?: string;
  model_number?: string;
  country_of_origin?: string;
  warranty_period?: string;
  delivery_period_days?: number;
}
```

### الـ API Endpoints
| Method | URL | Permission | الوصف |
|--------|-----|-----------|-------|
| GET | `/api/procurement/quotations` | `vendor_quotations:view` | قائمة العروض (مع pagination, search, status filter) |
| GET | `/api/procurement/quotations/:id` | `vendor_quotations:view` | تفاصيل عرض واحد + بنوده |
| POST | `/api/procurement/quotations` | `vendor_quotations:create` | إنشاء عرض جديد |
| PUT | `/api/procurement/quotations/:id/accept` | `vendor_quotations:accept` | قبول العرض |
| PUT | `/api/procurement/quotations/:id/reject` | `vendor_quotations:reject` | رفض العرض |
| DELETE | `/api/procurement/quotations/:id` | `vendor_quotations:delete` | حذف العرض |

### الصلاحيات المطلوبة
- `vendor_quotations:view` - عرض القائمة والتفاصيل
- `vendor_quotations:create` - إنشاء عرض جديد
- `vendor_quotations:accept` - قبول العرض
- `vendor_quotations:reject` - رفض العرض
- `vendor_quotations:delete` - حذف العرض (فقط للحالة pending)

### ⚠️ الفجوات والنواقص في عروض الأسعار
1. **لا يوجد تعديل (Edit)**: لا يمكن تعديل عرض سعر بعد إنشائه — لا يوجد PUT endpoint للتعديل
2. **لا يوجد اختيار عملة**: نموذج الإنشاء لا يحتوي على حقل العملة (currency)
3. **إدارة البنود ناقصة**: نموذج الإنشاء يعرض حقول (المورد، التاريخ، الملاحظات) لكن لا يوجد واجهة لإضافة أصناف (items picker) — المصفوفة تبقى فارغة
4. **لا يوجد ربط مع العقود**: لا يمكن تحويل عرض سعر مقبول إلى عقد تلقائياً
5. **لا يوجد طباعة/تصدير**: لا توجد وظيفة طباعة أو تصدير PDF
6. **الترقيم بسيط جداً**: يعتمد على `QUOT-` + آخر رقم — لا يراعي السنة أو الفروع

---

## 📄 الشاشة 2: عقود الموردين (Vendor Contracts)

### الملفات
| الملف | الدور |
|-------|-------|
| `frontend-next/pages/purchasing/contracts.tsx` | الصفحة الكاملة (~500+ سطر) |
| `backend/src/routes/procurement/contracts.ts` | الـ API (~400 سطر) |
| جدول `vendor_contracts` | بيانات العقود |
| جدول `vendor_contract_items` | بنود العقد |
| جدول `contract_types` | أنواع العقود |
| جدول `contract_statuses` | حالات العقود |
| جدول `contract_approvals` | سجل الاعتمادات |

### سيناريو العمل (Workflow)
```
[إنشاء عقد] → الحالة: draft (مسودة)
     │
     ├── [اعتماد] → الحالة: approved
     │       │
     │       └── يربط مع أوامر شراء (contract_id في purchase_orders)
     │
     └── (انتهاء المدة) → الحالة: expired
```

### الحالات (Statuses) — مخزنة في جدول `contract_statuses`
| الحالة | الوصف | الإجراءات |
|--------|-------|----------|
| `draft` | مسودة | تعديل، اعتماد، حذف |
| `pending_approval` | قيد الاعتماد | اعتماد |
| `active` | نشط | ربط مع أوامر شراء |
| `expired` | منتهي | عرض فقط |
| `terminated` | منهي | عرض فقط |
| `renewed` | مجدد | عرض فقط |

### الحقول الرئيسية

#### جدول `vendor_contracts`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | SERIAL PK | المعرف |
| `company_id` | INT FK | الشركة |
| `vendor_id` | INT FK → vendors | المورد |
| `contract_number` | VARCHAR | رقم تلقائي (CON-0001, CON-0002, ...) |
| `contract_type_id` | INT FK → contract_types | نوع العقد |
| `contract_date` | DATE | تاريخ العقد |
| `start_date` | DATE | تاريخ البداية |
| `end_date` | DATE | تاريخ الانتهاء |
| `currency_id` | INT FK → currencies | العملة |
| `total_value` | DECIMAL | القيمة الإجمالية |
| `payment_terms_id` | INT FK → vendor_payment_terms | شروط الدفع |
| `delivery_terms_id` | INT FK → delivery_terms | شروط التسليم (Incoterms) |
| `supply_terms_id` | INT FK → supply_terms | شروط التوريد |
| `status_id` | INT FK → contract_statuses | الحالة |
| `approval_status` | VARCHAR | حالة الاعتماد |
| `approved_by` | INT FK → users | المعتمد |
| `approved_at` | TIMESTAMP | تاريخ الاعتماد |
| `description` | TEXT | الوصف |
| `terms_and_conditions` | TEXT | الشروط والأحكام |
| `created_by` | INT FK → users | المنشئ |
| `deleted_at` | TIMESTAMP | Soft delete |

#### جدول `vendor_contract_items`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `contract_id` | INT FK | العقد |
| `item_id` | INT FK → items | الصنف |
| `item_code` | VARCHAR | كود الصنف |
| `item_name` | VARCHAR | اسم الصنف |
| `uom_id` | INT FK → units_of_measure | وحدة القياس |
| `contracted_qty` | DECIMAL | الكمية المتعاقد عليها |
| `unit_price` | DECIMAL | سعر الوحدة |
| `line_total` | DECIMAL | إجمالي السطر |

#### جدول `contract_approvals`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `contract_id` | INT FK | العقد |
| `stage_id` | INT FK → contract_approval_stages | مرحلة الاعتماد |
| `approved_by` | INT FK → users | المعتمد |
| `approved_at` | TIMESTAMP | التاريخ |

### واجهات TypeScript (Frontend)
```typescript
interface VendorContract {
  id: number;
  contract_number: string;
  vendor_id: number;
  contract_type_id?: number;
  contract_type_name?: string;
  contract_status_id?: number;
  contract_status_name?: string;
  title: string;
  title_ar?: string;
  start_date: string;
  end_date?: string;
  project_id?: number;
  currency_id?: number;
  contract_value: number;
  deliverables?: Deliverable[];      // معرّف لكن غير مستخدم في النموذج
  milestones?: Milestone[];           // معرّف لكن غير مستخدم في النموذج
  payment_schedule?: PaymentScheduleItem[];  // معرّف لكن غير مستخدم
  is_approved: boolean;
  notes?: string;
  terms_and_conditions?: string;
}
```

### الـ API Endpoints
| Method | URL | Permission | الوصف |
|--------|-----|-----------|-------|
| GET | `/api/procurement/contracts/types` | `vendor_contracts:view` | أنواع العقود |
| GET | `/api/procurement/contracts/statuses` | `vendor_contracts:view` | حالات العقود |
| GET | `/api/procurement/contracts` | `vendor_contracts:view` | قائمة العقود |
| GET | `/api/procurement/contracts/:id` | `vendor_contracts:view` | تفاصيل العقد + بنوده + اعتماداته |
| POST | `/api/procurement/contracts` | `vendor_contracts:create` | إنشاء عقد |
| PUT | `/api/procurement/contracts/:id/approve` | `vendor_contracts:approve` | اعتماد العقد |
| ❌ PUT | `/api/procurement/contracts/:id` | — | **غير موجود!** (التعديل) |
| DELETE | `/api/procurement/contracts/:id` | — | **غير واضح** |

### الصلاحيات المطلوبة
- `vendor_contracts:view` - العرض
- `vendor_contracts:create` - الإنشاء
- `vendor_contracts:approve` - الاعتماد
- `vendor_contracts:delete` - الحذف

### ⚠️ الفجوات والنواقص في العقود
1. **❌ لا يوجد PUT للتعديل في الباك إند**: الفرونت يحتوي على `handleOpenEdit` و `handleSubmit` مع method `PUT`، لكن الباك إند `contracts.ts` لا يحتوي على `router.put('/:id', ...)` — **سيفشل التعديل بخطأ 404**
2. **❌ لا يوجد DELETE في الباك إند**: لا يوجد endpoint للحذف
3. **واجهات معرّفة لكن غير مستخدمة**: `Deliverable`, `Milestone`, `PaymentScheduleItem` كلها معرّفة في TypeScript لكن النموذج لا يعرضها — مجرد تحضير مستقبلي
4. **النموذج ناقص**: لا يحتوي على حقول: العملة، شروط الدفع/التسليم، البنود (items)، الشروط والأحكام
5. **لا ربط مع عروض الأسعار**: لا يمكن إنشاء عقد من عرض سعر مقبول
6. **الاعتماد بسيط**: فقط يغير الحالة إلى APPROVED — لا يوجد مراحل اعتماد متعددة فعلية رغم وجود جدول `contract_approvals`

---

## 📄 الشاشة 3: أوامر الشراء (Purchase Orders)

### الملفات
| الملف | الدور |
|-------|-------|
| `frontend-next/pages/purchasing/orders.tsx` | القائمة + نموذج إنشاء/تعديل (~600+ سطر) |
| `frontend-next/pages/purchasing/orders/new.tsx` | صفحة إنشاء مستقلة |
| `frontend-next/pages/purchasing/orders/[id].tsx` | صفحة تفاصيل |
| `frontend-next/components/purchasing/purchaseOrder/ProfessionalPurchaseOrderForm.tsx` | نموذج احترافي (~800 سطر) |
| `backend/src/routes/procurement/purchaseOrders.ts` | الـ API (~1000 سطر) |
| `backend/src/services/vendorComplianceService.ts` | فحص امتثال المورد |
| `backend/src/services/documentNumberService.ts` | ترقيم المستندات |
| `backend/src/services/purchaseOrderSyncService.ts` | مزامنة الشحنات |

### سيناريو العمل (Workflow)
```
[إنشاء أمر شراء] → الحالة: draft (مسودة)
     │
     │ ← فحص المورد (هل ممنوع من أوامر الشراء؟)
     │ ← فحص الامتثال (VendorComplianceService)
     │ ← فحص القائمة السوداء
     │
     ├── [اعتماد] → approved ✅
     │       │ ← يتطلب project_id (رقم المشروع)
     │       │ ← يتحقق من مصفوفة الاعتمادات (Approval Matrix)
     │       │
     │       ├── [استلام جزئي] → partially_received 📦
     │       │       └── [استلام باقي] → fully_received 📦📦
     │       │
     │       └── [استلام كامل] → fully_received 📦📦
     │
     ├── [إلغاء] → cancelled ❌ (لا يمكن إلغاء المستلم أو المغلق)
     │
     └── [تعديل] → (فقط إذا الحالة تسمح: allows_edit)
           └── يزامن الشحنات المرتبطة تلقائياً  (syncPurchaseOrderToShipments)
```

### الحالات (Statuses) — مخزنة في جدول `purchase_order_statuses`
| الحالة | الوصف | allows_edit | allows_delete | allows_receive | allows_invoice |
|--------|-------|-------------|---------------|----------------|----------------|
| `DRAFT` | مسودة | ✅ | ✅ | ❌ | ❌ |
| `APPROVED` | معتمد | ❌ | ❌ | ✅ | ✅ |
| `partially_received` | مستلم جزئياً | ❌ | ❌ | ✅ | ✅ |
| `fully_received` | مستلم بالكامل | ❌ | ❌ | ❌ | ✅ |
| `cancelled` | ملغي | ❌ | ❌ | ❌ | ❌ |
| `closed` | مغلق | ❌ | ❌ | ❌ | ❌ |

### الحقول الرئيسية

#### جدول `purchase_orders`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | SERIAL PK | المعرف |
| `company_id` | INT FK | الشركة |
| `order_number` | VARCHAR | رقم تلقائي (DocumentNumberService) |
| `order_date` | DATE | تاريخ الأمر |
| `expected_date` | DATE | تاريخ التسليم المتوقع |
| `vendor_id` | INT FK → vendors | المورد |
| `vendor_code` | VARCHAR | كود المورد (denormalized) |
| `vendor_name` | VARCHAR | اسم المورد (denormalized) |
| `order_type_id` | INT FK → purchase_order_types | نوع الأمر |
| `contract_id` | INT FK → vendor_contracts | العقد المرتبط |
| `quotation_id` | INT FK → vendor_quotations | عرض السعر المرتبط |
| `project_id` | INT FK → projects | المشروع (**مطلوب للاعتماد**) |
| `warehouse_id` | INT FK → warehouses | المستودع |
| `currency_id` | INT FK → currencies | العملة |
| `exchange_rate` | DECIMAL | سعر الصرف |
| `payment_terms_id` | INT FK → vendor_payment_terms | شروط الدفع |
| `payment_method_id` | INT FK → payment_methods | طريقة الدفع |
| `delivery_terms_id` | INT FK → delivery_terms | شروط التسليم (Incoterms) |
| `supply_terms_id` | INT FK → supply_terms | شروط التوريد |
| `vendor_contract_number` | VARCHAR | رقم عقد المورد |
| `vendor_contract_date` | DATE | تاريخ عقد المورد |
| **المبالغ** | | |
| `subtotal` | DECIMAL | المجموع الفرعي |
| `discount_amount` | DECIMAL | الخصم |
| `tax_amount` | DECIMAL | الضريبة (محسوبة) |
| `freight_amount` | DECIMAL | الشحن |
| `total_amount` | DECIMAL | الإجمالي النهائي |
| **الشحن/اللوجستيات** | | |
| `origin_country_id` | INT FK → countries | بلد المنشأ |
| `origin_city_id` | INT FK → cities | مدينة المنشأ |
| `destination_country_id` | INT FK → countries | بلد الوصول (افتراضي: السعودية) |
| `destination_city_id` | INT FK → cities | مدينة الوصول (افتراضي: الرياض) |
| `port_of_loading_id` | INT FK → ports | ميناء التحميل |
| `port_of_loading_text` | VARCHAR | ميناء التحميل (نص حر) |
| `port_of_discharge_id` | INT FK → ports | ميناء التفريغ |
| `ship_to_address` | TEXT | عنوان الشحن |
| **الحالة** | | |
| `status_id` | INT FK → purchase_order_statuses | الحالة (ID) |
| `status` | VARCHAR | الحالة (نص) |
| `approved_by` | INT FK → users | المعتمد |
| `approved_at` | TIMESTAMP | تاريخ الاعتماد |
| `notes` | TEXT | ملاحظات |
| `internal_notes` | TEXT | ملاحظات داخلية |
| `cost_center_id` | INT FK | مركز التكلفة |

#### جدول `purchase_order_items`
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `order_id` | INT FK | أمر الشراء |
| `line_number` | INT | رقم السطر |
| `item_id` | INT FK → items | الصنف |
| `item_code` | VARCHAR | كود الصنف |
| `item_name` | VARCHAR | اسم الصنف (EN) |
| `item_name_ar` | VARCHAR | اسم الصنف (AR) |
| `uom_id` | INT FK → units_of_measure | وحدة القياس |
| `ordered_qty` | DECIMAL | الكمية المطلوبة |
| `received_quantity` | DECIMAL | الكمية المستلمة |
| `unit_price` | DECIMAL | سعر الوحدة |
| `discount_percent` | DECIMAL | نسبة الخصم |
| `discount_amount` | DECIMAL | مبلغ الخصم |
| `tax_rate_id` | INT FK → tax_rates | معرف نسبة الضريبة |
| `tax_rate` | DECIMAL | نسبة الضريبة |
| `tax_amount` | DECIMAL | مبلغ الضريبة |
| `line_total` | DECIMAL | إجمالي السطر |
| `warehouse_id` | INT FK | مستودع السطر |
| `cost_center_id` | INT FK | مركز تكلفة السطر |
| `expense_account_id` | INT FK | حساب المصروفات |

### البيانات المرجعية المحملة (10 APIs متوازية!)
```
fetchReferenceData() يحمل:
1. /api/procurement/vendors              → قائمة الموردين
2. /api/procurement/purchase-orders/order-types    → أنواع الأوامر
3. /api/procurement/purchase-orders/order-statuses → حالات الأوامر
4. /api/payment-methods                  → طرق الدفع
5. /api/procurement/reference/delivery-terms → شروط التسليم (Incoterms)
6. /api/projects                         → المشاريع (مفلترة حسب المورد)
7. /api/countries                        → الدول
8. /api/cities                           → المدن (مفلترة حسب الدولة)
9. /api/ports                            → الموانئ (السعودية فقط)
10. /api/master/items/for-invoice        → الأصناف (master items)
```

### الـ API Endpoints
| Method | URL | Permission | الوصف |
|--------|-----|-----------|-------|
| GET | `/api/procurement/purchase-orders/order-types` | `purchase_orders:view` | أنواع الأوامر |
| GET | `/api/procurement/purchase-orders/order-statuses` | `purchase_orders:view` | حالات الأوامر |
| GET | `/api/procurement/purchase-orders` | `purchase_orders:view` | قائمة الأوامر |
| GET | `/api/procurement/purchase-orders/:id` | `purchase_orders:view` | تفاصيل أمر واحد + بنوده |
| POST | `/api/procurement/purchase-orders` | `purchase_orders:create` | إنشاء أمر شراء |
| PUT | `/api/procurement/purchase-orders/:id` | `purchase_orders:edit/update` | تعديل أمر (Draft فقط) |
| PUT | `/api/procurement/purchase-orders/:id/approve` | `purchase_orders:approve` | اعتماد |
| POST | `/api/procurement/purchase-orders/:id/receive` | `purchase_orders:receive` | استلام بضاعة |
| POST | `/api/procurement/purchase-orders/:id/cancel` | `purchase_orders:cancel` | إلغاء |
| DELETE | `/api/procurement/purchase-orders/:id` | `purchase_orders:delete` | حذف |

### الخدمات المتقدمة (Backend Services)

#### 1. VendorComplianceService — فحص امتثال المورد
```
عند إنشاء أمر شراء:
├── يفحص: هل المورد في القائمة السوداء؟ → يمنع الإنشاء
├── يفحص: هل يمكن إنشاء أوامر شراء لهذا المورد؟ → يمنع إذا لا
├── يفحص: مستوى الخطورة (risk_level)
│       ├── low → يسمح مباشرة
│       ├── medium → يسمح مع تحذير
│       └── high → يتطلب اعتماد إضافي
└── يُرجع: { is_blacklisted, can_create_po, risk_level, warnings[] }
```

#### 2. DocumentNumberService — ترقيم المستندات
```
يولد أرقام تسلسلية احترافية لأوامر الشراء (بديل عن PO-0001 البسيط)
```

#### 3. Approval Matrix — مصفوفة الاعتمادات
```
عند الاعتماد:
1. يتحقق: هل يوجد workflow اعتمادات لـ purchase_orders؟
2. إذا نعم: يتحقق من المبلغ الإجمالي
3. إذا المبلغ يتطلب اعتماد:
   ├── يبحث عن طلب اعتماد موجود
   ├── إذا لم يوجد → ينشئ طلب اعتماد
   └── يمنع الاعتماد حتى يُعتمد من المصفوفة
4. إذا المبلغ لا يتطلب أو تم الاعتماد → يغير الحالة إلى approved
```

#### 4. syncPurchaseOrderToShipments — مزامنة الشحنات
```
عند تعديل أمر شراء:
→ يحدث جميع الشحنات المرتبطة (logistics_shipments)
→ يزامن: المورد، المشروع، العملة، الموانئ، البنود
```

### قواعد العمل (Business Rules)
1. **المورد الممنوع**: لا يمكن إنشاء أمر شراء لمورد حالته `allows_purchase_orders = false`
2. **القائمة السوداء**: لا يمكن إنشاء أمر شراء لمورد في القائمة السوداء
3. **المشروع مطلوب للاعتماد**: `project_id` إلزامي عند محاولة اعتماد الأمر
4. **التعديل محدود بالحالة**: فقط الحالات التي `allows_edit = true` (عادة Draft)
5. **الإلغاء محدود**: لا يمكن إلغاء أمر مستلم أو مغلق أو ملغي سابقاً
6. **المشاريع مفلترة بالمورد**: قائمة المشاريع تعرض فقط مشاريع المورد المختار
7. **الوصول الافتراضي**: destination_country = السعودية (1), destination_city = الرياض (2)

### الصلاحيات المطلوبة
- `purchase_orders:view` - العرض
- `purchase_orders:create` - الإنشاء
- `purchase_orders:edit` أو `purchase_orders:update` - التعديل
- `purchase_orders:approve` - الاعتماد
- `purchase_orders:receive` - استلام البضاعة
- `purchase_orders:cancel` - الإلغاء
- `purchase_orders:delete` - الحذف

### ⚠️ الفجوات والنواقص في أوامر الشراء
1. **ازدواجية النماذج**: `orders.tsx` يحتوي على نموذج إنشاء/تعديل داخلي (modal)، وهناك أيضاً `orders/new.tsx` + `ProfessionalPurchaseOrderForm.tsx` — ازدواجية في الكود
2. **10 APIs متوازية**: `fetchReferenceData()` يستدعي 10 APIs مرة واحدة (vendors limit=10000, items limit=10000) — **مشكلة أداء محتملة**
3. **المطابقة الثلاثية غير مفعّلة**: `ThreeWayMatchingService` موجود لكنه **غير مستدعى** من routes أوامر الشراء
4. **استلام البضاعة ناقص**:
   - يحدث `received_quantity` و `status` (النص) لكن **لا يحدث `status_id`**
   - لا ينشئ سجل Goods Receipt Note (GRN) منفصل
   - لا يحدث المخزون (Inventory)
5. **لا يوجد ربط مع الفواتير**: رغم وجود `allows_invoice` في الحالات، لا يوجد endpoint لإنشاء فاتورة من أمر شراء
6. **التحقق من السعر ناقص**: لا يتحقق من سعر البند مقابل سعر العقد أو عرض السعر

---

## 🔗 العلاقات بين الشاشات

```
┌─────────────────┐     quotation_id     ┌──────────────────────┐
│ Vendor Quotation │ ─ ─ ─ ─ ─ ─ ─ ─ ─ →│  Purchase Order      │
│ (عرض السعر)      │     (ربط اختياري)    │  (أمر الشراء)         │
└─────────────────┘                      └──────────────────────┘
                                                   ↑
┌─────────────────┐     contract_id      ┌─────────┘
│ Vendor Contract │ ─ ─ ─ ─ ─ ─ ─ ─ ─ →│
│ (العقد)          │     (ربط اختياري)    │
└─────────────────┘                      │
                                         │
                                 ┌───────┘──────────────┐
                                 │  Purchase Invoice     │
                                 │  (فاتورة المشتريات)   │
                                 └───────┬──────────────┘
                                         │
                                 ┌───────┘──────────────┐
                                 │  Logistics Shipment   │
                                 │  (الشحنة)             │
                                 └──────────────────────┘
```

### التدفق المثالي (Ideal Flow)
```
1. إنشاء عرض سعر (Quotation) → pending
2. مراجعة وقبول العرض → accepted
3. إنشاء عقد (Contract) مرتبط بالعرض → draft
4. اعتماد العقد → approved
5. إنشاء أمر شراء (PO) مرتبط بالعقد والعرض → draft
6. اعتماد أمر الشراء → approved
7. استلام البضاعة → partially_received / fully_received
8. إنشاء فاتورة مشتريات → مطابقة ثلاثية
9. إنشاء قيد محاسبي
```

### ⚠️ التدفق الفعلي (كما هو مبرمج الآن)
```
1. إنشاء عرض سعر → pending → accept/reject ✅
   ❌ (لا يوجد ربط تلقائي مع العقد)

2. إنشاء عقد يدوياً → draft → approve ✅
   ❌ (لا يوجد ربط مع عرض السعر)
   ❌ (لا يوجد PUT للتعديل في الباك إند)

3. إنشاء أمر شراء → draft ✅
   ✅ يمكن ربطه بعقد وعرض سعر (contract_id, quotation_id)
   ✅ فحص امتثال المورد
   ✅ مصفوفة اعتمادات
   ✅ مزامنة الشحنات عند التعديل

4. اعتماد → approved ✅ (يتطلب project_id)
5. استلام بضاعة → partially/fully received ✅ (لكن لا يحدث المخزون)
6. المطابقة الثلاثية ❌ غير مفعّلة
```

---

## 📊 ملخص الفجوات الحرجة (Priority Issues)

### 🔴 حرج (يجب إصلاحه)
| # | المشكلة | الشاشة | التفاصيل |
|---|---------|--------|----------|
| 1 | **عقود: لا يوجد PUT للتعديل** | العقود | Frontend يرسل PUT لكن Backend لا يحتويه → خطأ 404 |
| 2 | **عقود: لا يوجد DELETE** | العقود | زر الحذف موجود لكن لا يوجد endpoint |
| 3 | **عروض: لا يوجد إدارة بنود** | عروض الأسعار | النموذج لا يحتوي على واجهة إضافة أصناف |
| 4 | **أوامر: الاستلام لا يحدث status_id** | أوامر الشراء | فقط يحدث `status` النصي، لا يحدث `status_id` |

### 🟡 مهم (يحسّن التجربة)
| # | المشكلة | الشاشة | التفاصيل |
|---|---------|--------|----------|
| 5 | لا ربط بين عرض السعر والعقد | عروض + عقود | لا يمكن تحويل عرض مقبول إلى عقد |
| 6 | لا تعديل على عروض الأسعار | عروض الأسعار | لا يوجد PUT endpoint |
| 7 | الأداء: 10 APIs + limit=10000 | أوامر الشراء | تحميل بطيء في البيئات الكبيرة |
| 8 | المطابقة الثلاثية غير مفعّلة | أوامر الشراء | الخدمة موجودة لكن غير مستدعاة |
| 9 | ازدواجية نماذج أوامر الشراء | أوامر الشراء | modal + صفحة مستقلة + component مهني |

### 🟢 تحسينات (لاحقاً)
| # | المشكلة | الشاشة | التفاصيل |
|---|---------|--------|----------|
| 10 | لا طباعة/تصدير PDF | الكل | لا وظيفة طباعة |
| 11 | ترقيم بسيط | عروض + عقود | QUOT-0001 / CON-0001 بدون سنة أو فرع |
| 12 | لا تحديث للمخزون عند الاستلام | أوامر الشراء | الاستلام لا ينعكس على المخزون |
| 13 | عقود: Deliverables/Milestones غير مبرمجة | العقود | الواجهات معرّفة لكن الـ UI والـ API غير مبرمجين |

---

## 🛠️ توصيات التطوير (بالترتيب)

1. **إضافة PUT و DELETE للعقود** في `backend/src/routes/procurement/contracts.ts`
2. **إضافة واجهة إدارة البنود** في نموذج عروض الأسعار (items picker)
3. **إصلاح الاستلام** ليحدث `status_id` بالإضافة إلى `status`
4. **بناء تدفق متكامل**: عرض سعر → عقد → أمر شراء → فاتورة
5. **تفعيل المطابقة الثلاثية** عند إنشاء الفواتير
6. **تحسين الأداء**: إضافة pagination/virtual scroll لقوائم الأصناف والموردين
7. **توحيد نماذج أوامر الشراء**: اختيار إما modal أو صفحة مستقلة، وحذف الآخر
