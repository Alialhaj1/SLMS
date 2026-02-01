# =============================================================================
# SLMS Production Deployment Checklist
# Server: alhajco.com (68.183.221.112)
# =============================================================================

## ⚠️ تنبيه مهم: حجم السيرفر

السيرفر الحالي: **1 GB RAM / 25 GB Disk**

هذا الحجم **صغير جداً** لتشغيل:
- PostgreSQL (~300MB)
- Redis (~50MB)
- Backend Node.js (~200MB)
- Frontend Next.js (~300MB)
- Docker overhead (~200MB)

**التوصية:** ترقية إلى **2GB RAM** على الأقل ($12/شهر على DigitalOcean)

**الحل المؤقت:** أضفنا 2GB swap في سكربت الإعداد.

---

## 📋 قائمة المهام للنشر

### المرحلة 1: إعداد DNS ✅
- [x] تحديث Nameservers في Hostinger إلى DigitalOcean
  - ns1.digitalocean.com
  - ns2.digitalocean.com
  - ns3.digitalocean.com
- [x] إضافة سجل A للنطاق
  - Type: A
  - Name: @
  - Value: 68.183.221.112

### المرحلة 2: إعداد السيرفر
- [ ] الاتصال بالسيرفر: `SSH-TO-SERVER.bat`
- [ ] تشغيل سكربت الإعداد:
  ```bash
  # من جهازك المحلي، انسخ السكربت
  scp -i C:\Users\USER\.ssh\id_ed25519 scripts/server-setup.sh root@68.183.221.112:/root/
  
  # على السيرفر
  chmod +x /root/server-setup.sh
  /root/server-setup.sh
  ```

### المرحلة 3: رفع الكود
- [ ] إنشاء repository على GitHub
- [ ] رفع الكود:
  ```powershell
  git remote add origin https://github.com/YOUR_USERNAME/slms.git
  git push -u origin main
  ```
- [ ] على السيرفر:
  ```bash
  cd /opt/slms
  git clone https://github.com/YOUR_USERNAME/slms.git .
  ```

### المرحلة 4: إعداد Environment
- [ ] نسخ ملف البيئة:
  ```bash
  cp .env.production.example .env
  nano .env
  ```
- [ ] توليد كلمات المرور:
  ```bash
  # PostgreSQL password
  openssl rand -base64 32
  
  # Redis password
  openssl rand -base64 32
  
  # JWT secret
  openssl rand -base64 64
  ```
- [ ] تحديث .env بالقيم الجديدة

### المرحلة 5: إعداد Nginx
- [ ] ربط ملف الإعداد:
  ```bash
  ln -sf /opt/slms/config/nginx/alhajco.com.conf /etc/nginx/sites-enabled/
  nginx -t
  systemctl reload nginx
  ```

### المرحلة 6: شهادة SSL
- [ ] الحصول على الشهادة:
  ```bash
  certbot --nginx -d alhajco.com -d www.alhajco.com
  ```
- [ ] التحقق من التجديد التلقائي:
  ```bash
  certbot renew --dry-run
  ```

### المرحلة 7: النشر الأول
- [ ] تشغيل سكربت النشر:
  ```bash
  cd /opt/slms
  chmod +x scripts/*.sh
  ./scripts/deploy.sh
  ```
- [ ] التحقق من الخدمات:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs -f
  ```

### المرحلة 8: اختبار الموقع
- [ ] فتح https://alhajco.com
- [ ] تسجيل الدخول بحساب super_admin
- [ ] اختبار الصفحات الأساسية
- [ ] اختبار النسخ الاحتياطي

---

## 🔑 معلومات الوصول السريعة

```
السيرفر: 68.183.221.112
النطاق: alhajco.com
SSH Key: C:\Users\USER\.ssh\id_ed25519
المستخدم: root
مجلد التطبيق: /opt/slms
```

## 📁 ملفات النشر

| الملف | الوظيفة |
|-------|--------|
| `SSH-TO-SERVER.bat` | اتصال SSH سريع |
| `DEPLOY-TO-PRODUCTION.bat` | نشر من Windows |
| `scripts/server-setup.sh` | إعداد السيرفر الأولي |
| `scripts/deploy.sh` | سكربت النشر |
| `config/nginx/alhajco.com.conf` | إعدادات Nginx |
| `.env.production.example` | متغيرات البيئة |

---

## 🆘 في حالة المشاكل

### خطأ في الاتصال SSH:
```powershell
# تأكد من الصلاحيات
icacls C:\Users\USER\.ssh\id_ed25519 /inheritance:r /grant:r "%USERNAME%:R"
```

### الموقع لا يعمل:
```bash
# تحقق من السجلات
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

### مشكلة في قاعدة البيانات:
```bash
# تحقق من الاتصال
docker compose -f docker-compose.prod.yml exec postgres pg_isready
```

---

*آخر تحديث: 2026-02-01*
