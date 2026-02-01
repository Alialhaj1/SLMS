# تشخيص مشكلة عدم ظهور حقول المشروع وطريقة الدفع

## المشكلة المبلغ عنها
الحقلان الجديدان (المشروع وطريقة الدفع) لا يظهران في نموذج أوامر الشراء.

## التحقيقات المنجزة

### 1. التحقق من الكود - الحقول موجودة ✅
**الملف**: `frontend-next/pages/purchasing/orders.tsx`
**الأسطر**: 813-857

الحقلان موجودان في الكود:
```tsx
<div>
  <label>المشروع *</label>
  <select value={formData.project_id}>
    <option value="">اختر المشروع</option>
    {projects.map(...)}
  </select>
</div>

<div>
  <label>طريقة الدفع</label>
  <select value={formData.payment_method_id}>
    <option value="">اختر طريقة الدفع</option>
    {paymentMethods.map(...)}
  </select>
</div>
```

### 2. التحقق من API Endpoints
**Projects API**: `GET /api/projects?limit=500`
**Payment Methods API**: `GET /api/payment-methods?limit=100`

## الأسباب المحتملة

### السبب 1: القوائم فارغة (الأرجح)
إذا كانت قائمة `projects` أو `paymentMethods` فارغة، ستظهر القوائم المنسدلة فارغة (فقط خيار "اختر...")

**كيفية التحقق**:
1. افتح المتصفح وانتقل إلى صفحة أوامر الشراء
2. اضغط F12 لفتح Developer Tools
3. انتقل إلى تبويب Console
4. ابحث عن رسائل:
   - `Payment Methods loaded: X items`
   - `Projects loaded: X items`
5. إذا كانت X = 0، فالقوائم فارغة

**الحل**:
- إضافة طرق دفع: انتقل إلى **البيانات الرئيسية** ← **طرق الدفع** وأضف على الأقل طريقة واحدة
- إضافة مشاريع: انتقل إلى **المشاريع** وأضف على الأقل مشروع واحد

### السبب 2: خطأ في API
إذا كان الـ API يُرجع خطأ 404 أو 500، لن يتم تحميل البيانات.

**كيفية التحقق**:
1. افتح Developer Tools → Console
2. ابحث عن رسائل خطأ حمراء:
   - `Failed to fetch payment methods: 404`
   - `Failed to fetch projects: 404`

**الحل**:
- تحقق من أن الـ backend يعمل: http://localhost:4000/health
- تحقق من الـ endpoints:
  ```bash
  curl http://localhost:4000/api/payment-methods
  curl http://localhost:4000/api/projects
  ```

### السبب 3: مشكلة في الـ Authentication
إذا كان الـ token منتهي الصلاحية، الـ APIs ستُرجع 401.

**كيفية التحقق**:
1. Developer Tools → Network
2. ابحث عن طلبات `payment-methods` و `projects`
3. انظر إلى Status Code
4. إذا كان 401، قم بتسجيل الدخول مجدداً

### السبب 4: الحقول داخل شرط (Conditional Rendering)
قد تكون الحقول داخل شرط `if` ولا تظهر إلا في حالات معينة.

**كيفية التحقق**:
- تفحص الكود حول الحقول لأي `{condition && ...}`
- في الكود الحالي، الحقول داخل `<Modal>` مباشرة بدون شروط ✅

## خطوات التشخيص (للمستخدم)

### الخطوة 1: فتح Console
1. افتح صفحة أوامر الشراء في المتصفح
2. اضغط F12
3. انتقل إلى تبويب **Console**

### الخطوة 2: فتح نموذج إنشاء أمر شراء
1. اضغط زر "إضافة أمر شراء جديد"
2. راقب الرسائل في Console

### الخطوة 3: التحقق من البيانات المحملة
ابحث عن هذه الرسائل:
```
Payment Methods loaded: X items
Projects loaded: X items
```

**النتائج المتوقعة**:
- ✅ إذا X > 0، البيانات موجودة والمشكلة في مكان آخر
- ❌ إذا X = 0، القوائم فارغة - يجب إضافة بيانات
- ❌ إذا ظهر خطأ أحمر، مشكلة في الـ API

### الخطوة 4: التحقق من ظهور الحقول
1. في النموذج المفتوح، مرر للأسفل
2. يجب أن ترى:
   - **الصف الثالث**:
     - العمود الأيسر: **المشروع** (مع علامة * حمراء)
     - العمود الأيمن: **طريقة الدفع**

### الخطوة 5: التحقق من Network Requests
1. انتقل إلى تبويب **Network** في Developer Tools
2. افتح نموذج إنشاء أمر شراء
3. ابحث عن طلبات:
   - `payment-methods?limit=100`
   - `projects?limit=500`
4. اضغط على كل طلب وانظر:
   - **Status**: يجب أن يكون 200
   - **Response**: تحقق من محتوى `data` array

## الإصلاحات المطبقة

### 1. إضافة Console Logs
**الملف**: `pages/purchasing/orders.tsx`
**السطور**: 213-224

```typescript
if (paymentsRes.ok) {
  const result = await paymentsRes.json();
  console.log('Payment Methods loaded:', result.data?.length || 0, 'items');
  setPaymentMethods(result.data || []);
} else {
  console.error('Failed to fetch payment methods:', paymentsRes.status);
}

if (projectsRes.ok) {
  const result = await projectsRes.json();
  console.log('Projects loaded:', result.data?.length || 0, 'items');
  setProjects(result.data || []);
} else {
  console.error('Failed to fetch projects:', projectsRes.status);
}
```

### 2. إزالة Query Parameter الخاطئ
**قبل**: `GET /api/projects?limit=500&status=active`
**بعد**: `GET /api/projects?limit=500`

السبب: الـ backend قد لا يدعم `status=active` في هذا الـ endpoint.

## خطوات الحل (للمستخدم)

### الحل 1: إضافة طرق الدفع (إذا كانت القائمة فارغة)
1. انتقل إلى **البيانات الرئيسية** من القائمة الجانبية
2. اختر **طرق الدفع** (Payment Methods)
3. اضغط **إضافة طريقة دفع جديدة**
4. أدخل البيانات:
   - **الرمز**: `CASH`
   - **الاسم (إنجليزي)**: Cash
   - **الاسم (عربي)**: نقداً
5. احفظ
6. كرر لإضافة طرق أخرى:
   - `BANK_TRANSFER` - تحويل بنكي
   - `CHECK` - شيك
   - `LC` - اعتماد مستندي

### الحل 2: إضافة مشاريع (إذا كانت القائمة فارغة)
1. انتقل إلى **المشاريع** من القائمة الجانبية
2. اضغط **إضافة مشروع جديد**
3. أدخل البيانات:
   - **رمز المشروع**: `PRJ-001`
   - **اسم المشروع**: المشروع التجريبي
   - **الحالة**: نشط
4. احفظ

### الحل 3: إعادة تشغيل Frontend (بعد إضافة Console Logs)
```powershell
cd c:\projects\slms
docker compose restart frontend-next
```

انتظر 10-15 ثانية ثم أعد تحميل الصفحة في المتصفح.

## الاختبار النهائي

بعد تطبيق الحلول:
1. افتح صفحة أوامر الشراء
2. افتح Developer Tools → Console
3. اضغط "إضافة أمر شراء جديد"
4. تحقق من:
   - [ ] ظهور رسالة: `Payment Methods loaded: X items` (X > 0)
   - [ ] ظهور رسالة: `Projects loaded: X items` (X > 0)
   - [ ] ظهور حقل **المشروع** في الصف الثالث (مع علامة *)
   - [ ] ظهور حقل **طريقة الدفع** في الصف الثالث
   - [ ] قائمة المشروع تحتوي على خيارات
   - [ ] قائمة طريقة الدفع تحتوي على خيارات

## ملاحظات إضافية

### موقع الحقول في النموذج
```
┌─────────────────────┬──────────────────────┐
│ المورد *            │ نوع الطلب           │
├─────────────────────┼──────────────────────┤
│ تاريخ الطلب *       │ تاريخ التسليم المتوقع│
├─────────────────────┼──────────────────────┤
│ المشروع *           │ طريقة الدفع          │  ← الحقول الجديدة
└─────────────────────┴──────────────────────┘
┌──────────────────────────────────────────┐
│ ملاحظات (3 أسطر)                        │
└──────────────────────────────────────────┘
```

### إذا استمرت المشكلة
إذا لم تظهر الحقول حتى بعد كل الحلول أعلاه:

1. **امسح Cache المتصفح**:
   - Chrome: Ctrl + Shift + Delete
   - اختر "Cached images and files"
   - اضغط Clear

2. **تحقق من الأخطاء في Browser Console**:
   - ابحث عن أي أخطاء JavaScript حمراء
   - انسخ الخطأ وشاركه

3. **تحقق من Response الـ APIs**:
   ```bash
   # افتح PowerShell
   
   # اختبر Payment Methods API
   curl http://localhost:4000/api/payment-methods
   
   # اختبر Projects API
   curl http://localhost:4000/api/projects
   ```

4. **تحقق من أن الـ Migration تم تنفيذه**:
   ```sql
   -- في PostgreSQL
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'purchase_orders' 
     AND column_name IN ('payment_method_id', 'project_id');
   ```
   يجب أن يُرجع سطرين (عمودين).

## اتصل بنا
إذا استمرت المشكلة بعد تنفيذ جميع الحلول أعلاه، يرجى مشاركة:
1. Screenshot من Browser Console
2. Screenshot من Network tab في Developer Tools
3. Screenshot من نموذج أمر الشراء
4. نتيجة الأوامر في قسم "إذا استمرت المشكلة"

---
**تاريخ التحديث**: 2024-01-15
**الحالة**: قيد التشخيص
