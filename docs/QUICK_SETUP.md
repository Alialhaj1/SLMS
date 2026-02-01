# 🚀 خطوات الإعداد السريع - SLMS Backend

## ⚠️ مطلوب قبل التشغيل

### 1. توليد JWT Secret قوي

في Terminal، نفذ أحد الأوامر التالية:

```bash
# خيار 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# خيار 2: OpenSSL
openssl rand -hex 64

# خيار 3: PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

انسخ النتيجة (ستكون string طويل).

---

### 2. إنشاء ملف .env

```bash
# انتقل إلى مجلد backend
cd slms/backend

# انسخ ملف .env.example
copy .env.example .env
```

---

### 3. تحديث JWT_SECRET في .env

افتح `backend/.env` وحدث السطر التالي:

```bash
# استبدل القيمة بالـ Secret المولد من الخطوة 1
JWT_SECRET=<الصق القيمة المولدة هنا>
```

مثال:
```bash
JWT_SECRET=8a7f3c2b1e9d6a5f4b3c2e1d7a6f5b4c3e2d1a9f8b7c6d5e4f3a2b1c9d8e7f6a5b4c3d2e1f9a8b7c6d5e4f3a2b1c9d8e7f6a5b
```

---

### 4. إعادة تشغيل Backend

#### إذا كنت تستخدم Docker:
```bash
cd slms
docker-compose down
docker-compose up -d backend
```

#### إذا كنت تستخدم npm:
```bash
cd backend
npm run dev
```

---

## ✅ التحقق من النجاح

عند التشغيل، يجب أن ترى:

```
✅ Environment configuration loaded:
   - NODE_ENV: development
   - PORT: 4000
   - JWT_SECRET: 8a7f3c2b... (128 chars)
   - DATABASE_URL: postgres:5432/slms_db
   - CORS_ORIGINS: http://localhost:3001

Running migrations...
🚀 SLMS backend listening on port 4000
```

---

## ❌ الأخطاء الشائعة

### خطأ: "JWT_SECRET must be at least 32 characters long"

**السبب:** لم تقم بتحديث JWT_SECRET في ملف .env

**الحل:**
1. تأكد أنك نسخت `.env.example` إلى `.env`
2. تأكد أنك استبدلت القيمة الافتراضية بالـ Secret المولد
3. تأكد أن السطر لا يحتوي على `GENERATE_STRONG_SECRET_HERE`

---

### خطأ: "Environment validation failed"

**السبب:** ملف .env غير موجود أو فارغ

**الحل:**
```bash
# تأكد من وجود الملف
ls backend/.env

# إذا لم يكن موجود، انسخه:
copy backend\.env.example backend\.env
```

---

### خطأ: "Database connection failed"

**السبب:** PostgreSQL غير مشغل أو DATABASE_URL خاطئ

**الحل:**
```bash
# تأكد من تشغيل PostgreSQL
docker-compose ps

# إذا لم يكن مشغل:
docker-compose up -d postgres
```

---

## 📋 متغيرات Environment المتاحة

### مطلوبة (يجب تحديثها):
- `JWT_SECRET` - مفتاح تشفير JWT (32+ حرف)
- `DATABASE_URL` - PostgreSQL connection string

### اختيارية (لها قيم افتراضية):
- `PORT` - منفذ Backend (الافتراضي: 4000)
- `NODE_ENV` - بيئة التشغيل (development/production)
- `JWT_ACCESS_EXPIRATION` - مدة صلاحية Access Token (الافتراضي: 15m)
- `JWT_REFRESH_EXPIRATION` - مدة صلاحية Refresh Token (الافتراضي: 30d)
- `BCRYPT_ROUNDS` - قوة تشفير كلمات المرور (الافتراضي: 10)
- `CORS_ORIGINS` - النطاقات المسموح بها (الافتراضي: http://localhost:3001)

---

## 🔒 ملاحظات أمنية

### ⚠️ مهم جداً:

1. **أبداً** لا تضع ملف `.env` في Git
2. ملف `.env` موجود في `.gitignore` بالفعل
3. استخدم فقط `.env.example` للمشاركة
4. **لا تشارك** JWT_SECRET مع أحد
5. **غير** JWT_SECRET في production

---

## 🆘 المساعدة

إذا واجهت مشاكل:

1. تحقق من logs:
```bash
docker-compose logs backend
```

2. تحقق من Database:
```bash
docker exec -it slms-postgres-1 psql -U slms -d slms_db -c "\dt"
```

3. راجع [تقرير الفحص الشامل](../SECURITY_AND_ARCHITECTURE_AUDIT.md)

4. راجع [دليل التحسينات](./IMPROVEMENTS_GUIDE.md)

---

**آخر تحديث:** 20 يناير 2025
