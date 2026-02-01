# 🚀 الخطوات القادمة | Next Steps
## SLMS ERP System - Post-Foundation Phase

**آخر تحديث**: 22 ديسمبر 2025

---

## 📊 الحالة الحالية

### ✅ تم إنجازه (Foundation Phase)
- ✅ **Permission System**: Type-safe + Granular + Validator
- ✅ **i18n System**: Menu + Audit + Complete coverage
- ✅ **Menu Registry**: Badge support + Type-safe + Dynamic
- ✅ **Audit Trail**: Full UI + Filters + Detail Modal
- ✅ **Reference Screen**: Standards established
- ✅ **Golden Rules**: 6 rules documented

### 📈 النتيجة
**Enterprise-grade Foundation** جاهز للتطوير الوظيفي

---

## 🥇 المرحلة القادمة (Priority Order)

### 1️⃣ **إزالة Mock Data تدريجيًا** (أولوية عالية)

#### أ) Badge Counts API
**الحالة**: Mock data في `useBadgeCounts.ts`

**المطلوب**:
```typescript
// استبدال
const mockData: BadgeCounts = { ... };

// بـ
const response = await api.get('/api/dashboard/counts');
```

**Endpoint مطلوب في Backend**:
```typescript
// GET /api/dashboard/counts
{
  notifications: 5,
  pendingApprovals: 12,
  pendingShipments: 8,
  pendingExpenses: 3,
  pendingJournals: 6
}
```

**الأولوية**: عالية
**التقدير الزمني**: 2-3 ساعات

---

#### ب) Audit Logs Pagination
**الحالة**: Mock data في `useAuditLogs.ts`

**المطلوب**:
```typescript
// استبدال
const filteredLogs = MOCK_LOGS.filter(...);

// بـ
const response = await api.get('/api/audit-logs', {
  params: { ...filters, page, pageSize }
});
```

**Endpoint موجود**: ✅ (حسب المراجعة الأولية)

**المطلوب فقط**: ربط Hook بـ API الحقيقي

**الأولوية**: متوسطة
**التقدير الزمني**: 1-2 ساعة

---

#### ج) Stats Dashboard
**الحالة**: Mock في `loadStats()` function

**المطلوب**: API endpoint للإحصائيات

```typescript
// GET /api/dashboard/stats
{
  totalEvents: 1250,
  todayEvents: 45,
  weekEvents: 312,
  monthEvents: 890,
  topUsers: [...],
  topResources: [...],
  eventsByType: [...]
}
```

**الأولوية**: منخفضة (اختياري)
**التقدير الزمني**: 3-4 ساعات

---

### 2️⃣ **Global UI Guards** (أولوية عالية جداً)

#### أ) Route Guard (واجهة)
**الغرض**: منع فتح الصفحة أصلاً بدون permission

**التطبيق**:
```typescript
// pages/accounting/journals/index.tsx
export default withPermission(
  'accounting:journal:view',
  JournalsPage
);
```

**ملف جديد مطلوب**:
```typescript
// utils/withPermission.tsx
export function withPermission(
  permission: Permission,
  Component: React.ComponentType
) {
  return function PermissionGuard(props: any) {
    const { can } = usePermissions();
    const router = useRouter();
    
    useEffect(() => {
      if (!can(permission)) {
        router.push('/403'); // Access Denied
      }
    }, [can, permission]);
    
    if (!can(permission)) {
      return <LoadingScreen />;
    }
    
    return <Component {...props} />;
  };
}
```

**الأولوية**: عالية جداً
**التقدير الزمني**: 2 ساعات
**التأثير**: حماية إضافية على مستوى الصفحات

---

#### ب) API Guard Mirroring (Backend)
**الحالة**: موجود جزئياً

**المطلوب**: 
1. مراجعة جميع API endpoints
2. التأكد من وجود `requirePermission()` على كل route
3. **مطابقة اسم Permission** مع Frontend

**مثال**:
```typescript
// Frontend: MenuPermissions.Accounting.Journals.Post
// = 'accounting:journal:post'

// Backend:
router.post('/:id/post', 
  requirePermission('accounting:journal:post'), // ← يجب أن يطابق
  postJournal
);
```

**الأولوية**: حرجة (Critical)
**التقدير الزمني**: 4-6 ساعات (مراجعة شاملة)

---

#### ج) Validator: Frontend-Backend Sync
**الغرض**: التحقق من تطابق Permissions

**ملف جديد مطلوب**:
```typescript
// scripts/validate-permissions-sync.ts

// يقرأ:
// 1. frontend-next/config/menu.permissions.ts
// 2. backend/src/config/permissions.registry.ts
// 3. يطبع:
//    - Permissions موجودة في Frontend فقط
//    - Permissions موجودة في Backend فقط
//    - Mismatches في الأسماء
```

**الأولوية**: عالية
**التقدير الزمني**: 3-4 ساعات

---

### 3️⃣ **Scaffolding Generator** (اختياري - لكن قوي)

**الغرض**: توليد Module كامل بأمر واحد

**الاستخدام المتوقع**:
```bash
npm run generate:module -- --name=Invoices --resource=invoice
```

**ما يولّده**:
```
✅ pages/accounting/invoices/index.tsx
✅ hooks/useInvoices.ts
✅ config/menu.permissions.ts (يضيف القسم الجديد)
✅ locales/ar.json (يضيف المفاتيح)
✅ locales/en.json (يضيف المفاتيح)
✅ types/invoice.ts
```

**الملف المطلوب**:
```typescript
// scripts/generate-module.ts
```

**القالب (Template)**:
- Reference Screen: `audit-logs.tsx`
- Hook Pattern: `useAuditLogs.ts`
- Permission Pattern: `MenuPermissions.System.AuditLogs`

**الأولوية**: منخفضة (لكن استثمار ممتاز)
**التقدير الزمني**: 8-10 ساعات (مرة واحدة)
**العائد**: تطوير Module في 5 دقائق بدلاً من ساعات

---

## 📋 Roadmap حسب الأولوية

### 🔴 **Week 1: Critical Security**
- [ ] API Guard Mirroring (6 ساعات)
- [ ] Route Guard Implementation (2 ساعات)
- [ ] Permissions Sync Validator (4 ساعات)

**المجموع**: 12 ساعة
**الهدف**: إغلاق أي ثغرات أمنية محتملة

---

### 🟡 **Week 2: Mock Data Removal**
- [ ] Badge Counts API (3 ساعات)
- [ ] Audit Logs Real Pagination (2 ساعة)
- [ ] Stats Dashboard (اختياري) (4 ساعات)

**المجموع**: 5-9 ساعات
**الهدف**: نظام حي بالكامل

---

### 🟢 **Week 3+: Feature Development**
- [ ] Accounting Module
  - [ ] Chart of Accounts UI
  - [ ] Journal Entry (complete)
  - [ ] Trial Balance
  - [ ] Financial Reports
- [ ] Inventory Module
- [ ] Sales Module
- [ ] Purchasing Module

**كل Module**: 20-40 ساعة (حسب التعقيد)

---

## 🛠 Scripts الموصى بإضافتها

### package.json (frontend-next)
```json
{
  "scripts": {
    "validate:all": "npm run permissions:validate && npm run menu:validate",
    "validate:sync": "npx ts-node scripts/validate-permissions-sync.ts",
    "generate:module": "npx ts-node scripts/generate-module.ts",
    "guard:check": "npx ts-node scripts/check-route-guards.ts"
  }
}
```

---

## 📚 ملفات جديدة موصى بها

### 1. `utils/withPermission.tsx`
**الغرض**: Route guard HOC
**الأولوية**: عالية

### 2. `scripts/validate-permissions-sync.ts`
**الغرض**: Frontend/Backend sync check
**الأولوية**: عالية

### 3. `scripts/generate-module.ts`
**الغرض**: Module scaffolding
**الأولوية**: منخفضة

### 4. `scripts/check-route-guards.ts`
**الغرض**: التحقق من أن كل صفحة محمية
**الأولوية**: متوسطة

### 5. `pages/403.tsx`
**الغرض**: Access Denied page
**الأولوية**: متوسطة

---

## 🎯 KPIs لنجاح المرحلة القادمة

### Security
- [ ] 100% من API endpoints محمية بـ `requirePermission()`
- [ ] 100% من الصفحات محمية بـ Route Guard
- [ ] Zero permission mismatches بين Frontend/Backend

### Code Quality
- [ ] Zero hardcoded strings في UI
- [ ] Zero direct API calls في Components
- [ ] 100% TypeScript type coverage

### Performance
- [ ] Mock data = 0%
- [ ] Badge counts تحديث كل 2 دقيقة
- [ ] Audit logs pagination سلسة

---

## 💡 نصائح للمطورين الجدد

### عند إضافة شاشة جديدة:
1. **ابدأ بـ Permissions** في `permissions.registry.ts`
2. **أضف Translations** في `ar.json` + `en.json`
3. **أنشئ Hook** مثل `useXxx.ts`
4. **انسخ Reference Screen** (`audit-logs.tsx`)
5. **اربط Permission** في Menu Registry
6. **شغّل Validators**:
   ```bash
   npm run validate:all
   ```

### عند إضافة API endpoint:
1. **حدد Permission** أولاً
2. **أضف middleware**: `requirePermission('...')`
3. **تأكد من المطابقة** مع Frontend
4. **اكتب Test** للـ permission check

---

## 🔗 مراجع مهمة

### ملفات أساسية:
- [`GOLDEN_RULES.md`](./GOLDEN_RULES.md) - القواعد الذهبية
- [`config/menu.registry.ts`](./config/menu.registry.ts) - القائمة
- [`config/menu.permissions.ts`](./config/menu.permissions.ts) - الصلاحيات
- [`pages/admin/audit-logs.tsx`](./pages/admin/audit-logs.tsx) - Reference Screen

### Validators:
```bash
npm run menu:validate         # Menu structure
npm run permissions:validate  # Permissions registry
npm run validate:sync         # Frontend/Backend sync (قريباً)
```

---

## ✅ Checklist قبل Production

### Security ✅
- [ ] جميع API endpoints محمية
- [ ] جميع الصفحات بـ Route Guard
- [ ] Permissions mirroring 100%
- [ ] Audit logging يعمل

### Code Quality ✅
- [ ] Zero hardcoded strings
- [ ] Zero direct API calls
- [ ] TypeScript errors = 0
- [ ] Validators تمر بنجاح

### Performance ✅
- [ ] No mock data
- [ ] Badge counts real-time
- [ ] Pagination يعمل
- [ ] Loading states سلسة

### i18n ✅
- [ ] Arabic 100%
- [ ] English 100%
- [ ] RTL/LTR tested
- [ ] No missing keys

---

**الخلاصة**: 
- ✅ Foundation ممتاز
- 🔜 Security hardening (12 ساعة)
- 🔜 Mock removal (5 ساعات)
- 🚀 Feature development (عدة أسابيع)

**الأساس صلب - الآن فقط البناء!**
