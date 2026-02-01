# 📦 SLMS - Shipping Logistics Management System

نظام إدارة لوجستيات الشحن - نظام شامل لإدارة عمليات الشحن والمستخدمين والأدوار والصلاحيات.

---

## 🌟 المميزات

### ✅ إدارة المستخدمين والصلاحيات
- نظام RBAC شامل (Role-Based Access Control)
- إدارة الأدوار مع صلاحيات مخصصة (30 صلاحية)
- تتبع تاريخ تسجيل الدخول
- قفل تلقائي بعد محاولات فاشلة
- Audit Logs شامل لجميع العمليات

### 🔒 الأمان
- JWT Authentication مع Refresh Tokens
- Bcrypt لتشفير كلمات المرور
- Rate Limiting ضد Brute Force
- CORS محدود للنطاقات المعروفة
- Security Headers (Helmet.js)
- Input Validation موحد
- Environment Variables آمنة

### 📊 إدارة البيانات
- إدارة الشحنات مع تتبع كامل
- إدارة الشركات والفروع
- إدارة الموردين والمنتجات
- إدارة المصروفات
- تقارير Audit Logs

### 🚀 الأداء
- Database Indexes محسنة (50+ index)
- Connection Pooling
- Response Format موحد
- Error Handling موحد
- Pagination جاهز

---

## 🏗️ البنية التقنية

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL 15
- **Authentication:** JWT + Refresh Tokens
- **Hashing:** bcryptjs
- **Validation:** Custom validation middleware (قابل للترقية لـ Zod)

### Frontend
- **Framework:** Next.js
- **Language:** TypeScript + React
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios (مع apiClient wrapper)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Services:** Backend, Frontend, PostgreSQL, Redis, RabbitMQ

---

## 📋 المتطلبات

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (أو عبر Docker)
- npm أو yarn

---

## ⚡ البدء السريع

### 1. Clone المشروع
```bash
git clone <repository-url>
cd slms
```

### 2. إعداد Backend

```bash
# توليد JWT Secret قوي
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# نسخ .env.example إلى .env
cd backend
copy .env.example .env

# تحديث JWT_SECRET في ملف .env
# JWT_SECRET=<الصق القيمة المولدة>
```

### 3. تشغيل الخدمات

#### باستخدام Docker (موصى به):
```bash
docker-compose up -d
```

#### أو باستخدام npm:
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (في terminal آخر)
cd frontend-next
npm install
npm run dev
```

### 4. الوصول للنظام

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api/health

### 5. تسجيل الدخول

```
Email: ali@alhajco.com
Password: [راجع مدير النظام]
```

---

## 📚 التوثيق

- [تقرير الفحص الشامل والأمان](./SECURITY_AND_ARCHITECTURE_AUDIT.md) - مراجعة كاملة للنظام
- [دليل التحسينات الجديدة](./docs/IMPROVEMENTS_GUIDE.md) - شرح التحسينات المنفذة
- [دليل الإعداد السريع](./docs/QUICK_SETUP.md) - خطوات الإعداد المفصلة
- [API Documentation](./backend/API_DOCUMENTATION.md) - توثيق API endpoints
- [Phase 4A Implementation](./docs/testing/PHASE_4A_IMPLEMENTATION_REPORT.md) - تفاصيل التطوير

---

## 🔧 البنية

```
slms/
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/          # ⭐ Environment configuration
│   │   ├── middleware/      # ⭐ Auth, RBAC, Validation, ErrorHandler
│   │   ├── routes/          # API routes
│   │   ├── db/              # Database connection
│   │   └── utils/           # ⭐ Response helpers
│   ├── migrations/          # Database migrations
│   ├── .env.example         # ⭐ Environment variables template
│   └── package.json
│
├── frontend-next/           # Next.js + React + TypeScript
│   ├── components/          # React components
│   ├── pages/               # Next.js pages
│   ├── contexts/            # React contexts (Auth, Theme, Locale)
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # API client
│
├── docs/                    # Documentation
│   ├── architecture/        # Architecture docs
│   ├── security/            # Security docs
│   └── testing/             # Testing docs
│
└── docker-compose.yml       # Docker services configuration
```

⭐ = ملفات/مجلدات جديدة/محسنة

---

## 🛡️ الأمان

### ✅ تم التطبيق

- JWT مع validation قوي (32+ حرف للـ Secret)
- Bcrypt hashing (10 rounds)
- Rate limiting على endpoints الحساسة
- CORS محدود للنطاقات المعروفة
- Input validation موحد
- Error handling لا يكشف تفاصيل تقنية
- Parameterized queries (ضد SQL Injection)
- Helmet.js Security Headers
- Body size limits (ضد DoS)
- Failed login tracking
- Account locking بعد محاولات فاشلة
- Audit logging شامل

### 🚧 قيد التطوير

- Email verification
- Password reset workflow
- CSRF protection
- Two-factor authentication
- Session device management

---

## 📊 قاعدة البيانات

### الجداول (18 جدول)

```
users               - المستخدمون
roles               - الأدوار (مع permissions JSONB)
permissions         - الصلاحيات (30 صلاحية)
user_roles          - ربط المستخدمين بالأدوار
companies           - الشركات
branches            - الفروع
shipments           - الشحنات
suppliers           - الموردين
products            - المنتجات
expenses            - المصروفات
audit_logs          - سجل التدقيق
login_history       - تاريخ تسجيل الدخول
user_status_history - تاريخ حالة المستخدمين
refresh_tokens      - JWT refresh tokens
role_templates      - قوالب الأدوار
role_permissions    - (legacy - غير مستخدم)
system_settings     - إعدادات النظام
migrations          - تتبع Migrations
```

### Performance

- 50+ database indexes للأداء
- Connection pooling
- Prepared statements

---

## 🎯 خارطة الطريق

### ✅ مكتمل

- [x] نظام RBAC كامل
- [x] User & Role Management
- [x] Audit Logging
- [x] JWT Authentication
- [x] Rate Limiting
- [x] Input Validation System
- [x] Error Handling System
- [x] Database Indexes
- [x] Security Hardening

### 🚧 قيد التطوير

- [ ] Soft Delete للبيانات الحساسة
- [ ] Pagination موحد لجميع endpoints
- [ ] Services Layer (فصل business logic)
- [ ] Password Reset System
- [ ] User Profile Page
- [ ] In-app Notifications
- [ ] i18n Support (AR/EN)

### 💡 مستقبلي

- [ ] Redis Caching
- [ ] Email Integration
- [ ] File Upload System
- [ ] Advanced Reporting
- [ ] Real-time Updates (WebSockets)
- [ ] Mobile App (React Native)
- [ ] Unit & Integration Tests
- [ ] CI/CD Pipeline

---

## 🤝 المساهمة

المشروع قيد التطوير النشط. للمساهمة:

1. Fork المشروع
2. إنشاء branch للـ feature
3. Commit التغييرات
4. Push للـ branch
5. فتح Pull Request

---

## 📞 الدعم

للمساعدة أو الاستفسارات:

- راجع [QUICK_SETUP.md](./docs/QUICK_SETUP.md)
- راجع [SECURITY_AND_ARCHITECTURE_AUDIT.md](./SECURITY_AND_ARCHITECTURE_AUDIT.md)
- افتح Issue في المشروع

---

## 📝 الترخيص

[حدد نوع الترخيص]

---

## 🙏 الشكر

بُني هذا المشروع باستخدام:
- Express.js
- Next.js
- PostgreSQL
- Docker
- TypeScript

---

**آخر تحديث:** 20 يناير 2025  
**الإصدار:** 1.0.0 (Phase 4A+ مكتمل)  
**الحالة:** ✅ جاهز للاستخدام مع التحسينات الأمنية
