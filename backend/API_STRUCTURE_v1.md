# هيكل الـ API — المواصفات §14
# API Structure — Specification §14

---

## 14.1 القواعد العامة (General Rules)

### Base URL
```
/api/v1
```

Both `/api/v1/*` and `/api/*` are supported. The `/api/v1` prefix is the canonical 
versioned URL. Internally, `/api/v1/*` is rewritten to `/api/*` for backward compatibility.

All responses include the header:
```
X-API-Version: v1
```

### Authentication (المصادقة)
All protected endpoints require a Bearer JWT token:
```
Authorization: Bearer <access_token>
```

JWT payload must contain:
| Field           | Type     | Description                         |
|-----------------|----------|-------------------------------------|
| `sub`           | number   | User ID                             |
| `email`         | string   | User email                          |
| `tenant_id`     | number   | Tenant (company group) ID           |
| `roles`         | string[] | User roles array                    |
| `login_context` | string   | `platform` or `tenant`              |
| `company_id`    | number   | Current company ID (optional)       |
| `jti`           | string   | JWT ID for token tracking           |

### Standard Response Format (صيغة الاستجابة)

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Email is required", "Password must be at least 8 characters"]
  }
}
```

### Rate Limiting (تحديد المعدل)

| Scope             | Limit              | Window    | Key               |
|-------------------|--------------------|-----------|-------------------|
| General API       | 1000 requests      | 1 minute  | Per tenant        |
| Authentication    | 50 requests        | 15 minutes| Per IP            |
| Settings          | 20 requests        | 1 minute  | Per IP            |
| Password Reset    | 3 requests         | 1 hour    | Per IP            |
| Delete Operations | 10 requests        | 1 minute  | Per user          |
| Bulk Updates      | 20 requests        | 1 minute  | Per user          |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1700000060
```

### Pagination (التقسيم)

Default pagination parameters for all list endpoints:
```
?page=1&limit=20
```

| Parameter | Default | Min | Max | Description              |
|-----------|---------|-----|-----|--------------------------|
| `page`    | 1       | 1   | —   | Page number (1-indexed)  |
| `limit`   | 20      | 1   | 100 | Items per page           |

The pagination middleware automatically parses and normalizes these parameters.
Route handlers can access parsed values via `req.pagination`:
```typescript
import { getPagination } from '../middleware/paginationDefaults';
const { page, limit, offset } = getPagination(req);
// or
import { getPaginationParams } from '../utils/response';
const { page, limit, offset } = getPaginationParams(req.query);
```

### Tenant Isolation (عزل المستأجرين)

- Every tenant user's JWT contains `tenant_id`
- The `enforceTenantIsolation` middleware ensures users can only access their tenant's data
- Platform admins (`tenant_id = null`) bypass isolation
- The `X-Tenant-Id` header is validated against the JWT's `tenant_id`

---

## 14.2 النقاط الرئيسية (Core Endpoints)

### Authentication (المصادقة)

| Method | Endpoint                          | Description                           | Permission       |
|--------|-----------------------------------|---------------------------------------|------------------|
| POST   | `/api/v1/auth/verify-company`     | التحقق من كود الشركة قبل تسجيل الدخول | Public           |
| POST   | `/api/v1/auth/tenant/login`       | تسجيل دخول مستخدم المستأجر مع JWT      | Public           |
| POST   | `/api/v1/auth/refresh`            | تجديد رمز الوصول                       | Public           |
| POST   | `/api/v1/auth/logout`             | تسجيل الخروج وإلغاء الرموز             | Authenticated    |

### Shipments (الشحنات)

| Method | Endpoint                          | Description                           | Permission         |
|--------|-----------------------------------|---------------------------------------|--------------------|
| GET    | `/api/v1/shipments`               | عرض جميع الشحنات (مع التقسيم)         | `shipments:view`   |
| POST   | `/api/v1/shipments`               | إنشاء شحنة جديدة                      | `shipments:create` |
| GET    | `/api/v1/shipments/:id`           | عرض تفاصيل شحنة                       | `shipments:view`   |
| PUT    | `/api/v1/shipments/:id`           | تحديث شحنة                            | `shipments:edit`   |
| DELETE | `/api/v1/shipments/:id`           | حذف شحنة (حذف ناعم)                   | `shipments:delete` |

### Procurement (المشتريات)

| Method | Endpoint                          | Description                           | Permission            |
|--------|-----------------------------------|---------------------------------------|-----------------------|
| GET    | `/api/v1/procurement`             | عرض أوامر الشراء                      | `procurement:view`    |
| POST   | `/api/v1/procurement`             | إنشاء أمر شراء                        | `procurement:create`  |
| GET    | `/api/v1/procurement/:id`         | عرض تفاصيل أمر شراء                   | `procurement:view`    |
| PUT    | `/api/v1/procurement/:id`         | تحديث أمر شراء                        | `procurement:edit`    |
| DELETE | `/api/v1/procurement/:id`         | حذف أمر شراء                          | `procurement:delete`  |

### Customs (الجمارك)

| Method | Endpoint                              | Description                       | Permission          |
|--------|---------------------------------------|-----------------------------------|---------------------|
| GET    | `/api/v1/customs-declarations`        | عرض البيانات الجمركية              | `customs:view`      |
| POST   | `/api/v1/customs-declarations`        | تقديم بيان جمركي                   | `customs:submit`    |
| GET    | `/api/v1/customs-declarations/:id`    | عرض تفاصيل بيان جمركي             | `customs:view`      |
| PUT    | `/api/v1/customs-declarations/:id`    | تحديث بيان جمركي                   | `customs:edit`      |

### Accounting (المحاسبة)

| Method | Endpoint                          | Description                           | Permission             |
|--------|-----------------------------------|---------------------------------------|------------------------|
| GET    | `/api/v1/journals`                | عرض القيود المحاسبية                  | `accounting:view`      |
| POST   | `/api/v1/journals`                | إنشاء قيد محاسبي                      | `accounting:create`    |
| GET    | `/api/v1/accounts`                | عرض دليل الحسابات                     | `accounting:view`      |
| POST   | `/api/v1/accounts`                | إنشاء حساب جديد                       | `accounting:create`    |
| GET    | `/api/v1/fiscal-periods`          | عرض الفترات المالية                   | `accounting:view`      |
| GET    | `/api/v1/reports/trial-balance`   | تقرير ميزان المراجعة                  | `accounting:view`      |
| GET    | `/api/v1/reports/general-ledger`  | تقرير دفتر الأستاذ العام              | `accounting:view`      |
| GET    | `/api/v1/reports/income-statement`| تقرير قائمة الدخل                     | `accounting:view`      |
| GET    | `/api/v1/reports/balance-sheet`   | تقرير الميزانية العمومية               | `accounting:view`      |
| GET    | `/api/v1/reports/cash-flow`       | تقرير التدفقات النقدية                 | `accounting:view`      |

### Inventory (المستودعات)

| Method | Endpoint                                  | Description                       | Permission             |
|--------|-------------------------------------------|-----------------------------------|------------------------|
| GET    | `/api/v1/inventory`                       | عرض المخزون                       | `inventory:view`       |
| GET    | `/api/v1/inventory/warehouses`            | عرض المستودعات                    | `inventory:view`       |
| POST   | `/api/v1/inventory/stock-movements`       | تسجيل حركة مخزون                  | `inventory:receive`    |
| GET    | `/api/v1/inventory/stock-movements`       | عرض حركات المخزون                 | `inventory:view`       |

### Master Data (البيانات الرئيسية)

| Method | Endpoint                              | Description                       | Permission         |
|--------|---------------------------------------|-----------------------------------|--------------------|
| GET    | `/api/v1/master/customers`            | عرض العملاء                       | `master:view`      |
| POST   | `/api/v1/master/customers`            | إنشاء عميل جديد                   | `master:create`    |
| GET    | `/api/v1/master/vendors`              | عرض الموردين                      | `master:view`      |
| POST   | `/api/v1/master/vendors`              | إنشاء مورد جديد                   | `master:create`    |
| GET    | `/api/v1/master/items`                | عرض الأصناف                       | `master:view`      |
| POST   | `/api/v1/master/items`                | إنشاء صنف جديد                    | `master:create`    |
| GET    | `/api/v1/master/currencies`           | عرض العملات                       | `master:view`      |
| GET    | `/api/v1/master/countries`            | عرض الدول                         | `master:view`      |
| GET    | `/api/v1/master/cities`               | عرض المدن                         | `master:view`      |
| GET    | `/api/v1/master/warehouses`           | عرض المستودعات                    | `master:view`      |
| GET    | `/api/v1/master/banks`                | عرض البنوك                        | `master:view`      |
| GET    | `/api/v1/master/hs-codes`             | عرض رموز النظام المنسق            | `master:view`      |
| GET    | `/api/v1/master/ports-airports`       | عرض الموانئ والمطارات              | `master:view`      |
| GET    | `/api/v1/master/shipping-companies`   | عرض شركات الشحن                   | `master:view`      |

### Admin / Platform (الإدارة / المنصة)

| Method | Endpoint                          | Description                           | Permission             |
|--------|-----------------------------------|---------------------------------------|------------------------|
| GET    | `/api/v1/tenants`                 | عرض جميع المستأجرين                   | `platform:tenants`     |
| POST   | `/api/v1/tenants`                 | إنشاء مستأجر جديد                     | `platform:tenants`     |
| GET    | `/api/v1/platform/users`          | عرض مستخدمي المنصة                    | `platform:users`       |
| GET    | `/api/v1/users`                   | عرض مستخدمي المستأجر                  | `admin:users`          |
| POST   | `/api/v1/users`                   | إنشاء مستخدم جديد                     | `admin:users`          |
| GET    | `/api/v1/roles`                   | عرض الأدوار                           | `admin:roles`          |
| GET    | `/api/v1/audit-logs`              | عرض سجلات المراجعة                    | `admin:audit`          |
| GET    | `/api/v1/settings`                | عرض إعدادات النظام                    | `admin:settings`       |

---

## Implementation Files

| File                                          | Purpose                                       |
|-----------------------------------------------|-----------------------------------------------|
| `backend/src/middleware/apiVersion.ts`         | URL rewriting `/api/v1/*` → `/api/*`          |
| `backend/src/middleware/paginationDefaults.ts` | Default pagination `page=1&limit=20`          |
| `backend/src/middleware/rateLimiter.ts`        | Rate limiting (1000/min per tenant)           |
| `backend/src/utils/response.ts`               | Unified response format helpers               |
| `backend/src/config/apiConfig.ts`             | API constants, endpoint definitions           |
| `backend/src/middleware/auth.ts`              | JWT Bearer authentication                     |
| `backend/src/middleware/rbac.ts`              | Permission-based access control               |
| `backend/src/middleware/tenantIsolation.ts`   | Tenant data isolation                         |

---

## Response Utilities Reference

### `sendSuccess(res, data, statusCode?, meta?, message?)`
```typescript
import { sendSuccess } from '../utils/response';

// Simple response
sendSuccess(res, { id: 1, name: 'Item' });
// → { success: true, data: { id: 1, name: 'Item' } }

// With message
sendSuccess(res, { id: 1 }, 201, undefined, 'تم الإنشاء بنجاح');
// → { success: true, data: { id: 1 }, message: 'تم الإنشاء بنجاح' }
```

### `sendPaginated(res, data, page, limit, total, statusCode?, message?)`
```typescript
import { sendPaginated } from '../utils/response';

sendPaginated(res, items, 1, 20, 150);
// → { success: true, data: [...], pagination: { page: 1, limit: 20, total: 150, totalPages: 8 }, meta: {...} }
```

### `sendError(res, code, message, statusCode?, details?)`
```typescript
import { sendError } from '../utils/response';

sendError(res, 'VALIDATION_ERROR', 'البريد الإلكتروني مطلوب', 400);
// → { success: false, message: '...', error: { code: 'VALIDATION_ERROR', message: '...' } }
```

### `getPaginationParams(query)`
```typescript
import { getPaginationParams } from '../utils/response';

const { page, limit, offset } = getPaginationParams(req.query);
// Defaults: page=1, limit=20, max limit=100
```

### `getPagination(req)` (from middleware)
```typescript
import { getPagination } from '../middleware/paginationDefaults';

const { page, limit, offset } = getPagination(req);
// Already parsed by middleware
```
