# 🚀 دليل نشر SLMS على الإنتاج
## Smart Logistics Management System - Deployment Guide

---

## 📊 هيكل البيئات (Environments)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           البيئات الثلاث                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🖥️ LOCAL (Development)          🧪 STAGING (Test)         🌍 PRODUCTION   │
│  ─────────────────────          ────────────────          ──────────────   │
│  localhost:3001                 staging.alhajco.com       alhajco.com      │
│  جهازك الشخصي                   سيرفر اختبار               السيرفر الحي    │
│  بيانات تجريبية                 نسخة من الإنتاج            بيانات حقيقية   │
│                                                                             │
│  ✅ تطور هنا                    ✅ تختبر هنا               ✅ المستخدمون هنا │
│  ✅ تكسر براحتك                 ✅ تجرب التحديثات          ❌ لا تلمس مباشرة│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 القاعدة الذهبية

> **التطوير على جهازك لا يؤثر على المستخدمين**
> 
> - `localhost:3001` = جهازك فقط
> - `alhajco.com` = سيرفر مستقل تماماً
> - بينهما **جدار كامل** - لا علاقة بينهما

---

## 🖥️ متطلبات السيرفر (VPS)

### الحد الأدنى للبداية:
| المواصفة | القيمة |
|----------|--------|
| نظام التشغيل | Ubuntu 22.04 LTS |
| RAM | 4 GB |
| vCPU | 2 cores |
| SSD | 80 GB |
| Bandwidth | 2 TB/month |

### موفرو VPS موثوقون:
| الموفر | السعر الشهري | ملاحظات |
|--------|--------------|---------|
| DigitalOcean | $24/month | سهل للمبتدئين، توثيق ممتاز |
| Hetzner | €15/month | أرخص، سيرفرات في أوروبا |
| Contabo | €12/month | أرخص، لكن دعم أبطأ |
| Linode | $24/month | مشابه لـ DigitalOcean |
| AWS EC2 | متغير | معقد، لكن قوي جداً |

### التوصية للمبتدئ:
**DigitalOcean Droplet - $24/month**
- أسهل في الإعداد
- توثيق ممتاز
- دعم سريع
- مجتمع كبير

---

## 📦 هيكل الملفات على السيرفر

```
/home/slms/
├── app/                      # كود المشروع
│   ├── backend/
│   ├── frontend-next/
│   └── docker-compose.yml
│
├── backups/                  # النسخ الاحتياطية
│   ├── daily/               # يومية (آخر 7 أيام)
│   ├── weekly/              # أسبوعية (آخر 4 أسابيع)
│   └── monthly/             # شهرية (آخر 12 شهر)
│
├── logs/                     # السجلات
│   ├── backend.log
│   ├── nginx.log
│   └── backup.log
│
└── ssl/                      # شهادات SSL
    └── alhajco.com/
```

---

## 🔧 خطوات الإعداد الأولي (مرة واحدة)

### الخطوة 1: إعداد السيرفر
```bash
# تسجيل الدخول للسيرفر
ssh root@YOUR_SERVER_IP

# تحديث النظام
apt update && apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# إنشاء مستخدم للتطبيق
adduser slms
usermod -aG docker slms
usermod -aG sudo slms

# تبديل للمستخدم الجديد
su - slms
```

### الخطوة 2: استنساخ المشروع
```bash
cd /home/slms
git clone https://github.com/YOUR_REPO/slms.git app
cd app
```

### الخطوة 3: إنشاء ملف البيئة للإنتاج
```bash
# backend/.env.production
cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=4000

# Database - استخدم كلمة مرور قوية!
DATABASE_URL=postgresql://slms_prod:STRONG_PASSWORD_HERE@postgres:5432/slms_production
POSTGRES_USER=slms_prod
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=slms_production

# JWT - مفتاح سري قوي!
JWT_SECRET=GENERATE_A_VERY_LONG_RANDOM_STRING_HERE
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Security
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCK_DURATION_MINUTES=30

# Backup
BACKUP_DIR=/backups
BACKUP_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info
EOF
```

### الخطوة 4: إعداد Nginx (Reverse Proxy)
```bash
# تثبيت Nginx
apt install nginx -y

# إنشاء ملف الإعدادات
cat > /etc/nginx/sites-available/alhajco.com << 'EOF'
server {
    listen 80;
    server_name alhajco.com www.alhajco.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name alhajco.com www.alhajco.com;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/alhajco.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alhajco.com/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# تفعيل الموقع
ln -s /etc/nginx/sites-available/alhajco.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### الخطوة 5: إعداد SSL (Let's Encrypt)
```bash
# تثبيت Certbot
apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL مجانية
certbot --nginx -d alhajco.com -d www.alhajco.com

# التجديد التلقائي (كل 3 أشهر)
certbot renew --dry-run
```

### الخطوة 6: تشغيل التطبيق
```bash
cd /home/slms/app

# بناء وتشغيل Docker
docker compose -f docker-compose.prod.yml up -d --build

# التحقق من التشغيل
docker compose ps
```

---

## 🔄 نشر التحديثات (Deployment Flow)

### الطريقة الآمنة للنشر:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         مسار النشر الآمن                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1️⃣ LOCAL                2️⃣ GIT                  3️⃣ SERVER              │
│  ────────                ─────                   ────────                │
│  تطوير وتجربة      →    git push         →     git pull                 │
│  npm run test       →    GitHub/GitLab    →     docker compose up       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### خطوات النشر:

#### على جهازك (Local):
```powershell
# 1. تأكد أن الكود يعمل
npm run build

# 2. احفظ التغييرات
git add .
git commit -m "feat: وصف التحديث"

# 3. ارفع للمستودع
git push origin main
```

#### على السيرفر:
```bash
# 1. سجل الدخول
ssh slms@alhajco.com

# 2. اذهب لمجلد التطبيق
cd /home/slms/app

# 3. ⚠️ مهم جداً: نسخة احتياطية أولاً!
./scripts/backup-before-deploy.sh

# 4. اسحب التحديثات
git pull origin main

# 5. أعد بناء وتشغيل
docker compose -f docker-compose.prod.yml up -d --build

# 6. شغّل الـ migrations
docker compose exec backend npm run migrate

# 7. تحقق من السجلات
docker compose logs -f --tail=100
```

---

## 💾 استراتيجية النسخ الاحتياطي

### الجدول الزمني:
| النوع | التكرار | الاحتفاظ | الموقع |
|-------|---------|----------|--------|
| Hourly | كل ساعة | 24 ساعة | السيرفر |
| Daily | كل يوم 3 صباحاً | 7 أيام | السيرفر + Cloud |
| Weekly | كل أحد | 4 أسابيع | Cloud |
| Monthly | أول كل شهر | 12 شهر | Cloud + Offline |

### سكريبت النسخ الاحتياطي:
```bash
#!/bin/bash
# /home/slms/scripts/backup.sh

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/home/slms/backups"

# 1. نسخ قاعدة البيانات
docker compose exec -T postgres pg_dump -U slms_prod slms_production | gzip > "$BACKUP_DIR/daily/db_$DATE.sql.gz"

# 2. نسخ الملفات المرفوعة
tar -czf "$BACKUP_DIR/daily/uploads_$DATE.tar.gz" /home/slms/app/uploads

# 3. رفع نسخة للـ Cloud (اختياري)
# aws s3 cp "$BACKUP_DIR/daily/db_$DATE.sql.gz" s3://alhajco-backups/

# 4. حذف النسخ القديمة (أكثر من 7 أيام)
find "$BACKUP_DIR/daily" -type f -mtime +7 -delete

echo "✅ Backup completed: $DATE"
```

### Cron Jobs:
```bash
# إضافة للـ crontab
crontab -e

# نسخ احتياطي يومي الساعة 3 صباحاً
0 3 * * * /home/slms/scripts/backup.sh >> /home/slms/logs/backup.log 2>&1

# نسخ احتياطي أسبوعي كل أحد
0 4 * * 0 /home/slms/scripts/weekly-backup.sh >> /home/slms/logs/backup.log 2>&1
```

---

## 🛡️ الأمان والحماية

### 1. Firewall (UFW)
```bash
# تفعيل الجدار الناري
ufw enable

# السماح بالمنافذ الضرورية فقط
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# منع كل شيء آخر
ufw default deny incoming
ufw default allow outgoing

# التحقق
ufw status
```

### 2. حماية SSH
```bash
# /etc/ssh/sshd_config
PermitRootLogin no              # منع root من الدخول
PasswordAuthentication no       # استخدام مفاتيح فقط
MaxAuthTries 3                  # 3 محاولات فقط

# إعادة تشغيل SSH
systemctl restart sshd
```

### 3. Fail2Ban (حماية من الهجمات)
```bash
apt install fail2ban -y

# إعدادات مخصصة
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

systemctl restart fail2ban
```

---

## 📊 المراقبة (Monitoring)

### Health Check Endpoint
```bash
# التحقق من صحة التطبيق
curl https://alhajco.com/api/health

# المتوقع:
# {"status":"ok","timestamp":"2026-02-01T..."}
```

### PM2 للمراقبة (بديل لـ Docker)
```bash
# تثبيت PM2
npm install -g pm2

# تشغيل ومراقبة
pm2 start npm --name "slms-backend" -- run start
pm2 start npm --name "slms-frontend" -- run start

# مراقبة
pm2 status
pm2 logs
pm2 monit
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ الخطأ | ✅ الصحيح |
|---------|---------|
| التطوير مباشرة على السيرفر | التطوير محلياً ثم النشر |
| تعديل قاعدة البيانات يدوياً | استخدام Migrations |
| عدم أخذ نسخة احتياطية | Backup قبل أي تغيير |
| نفس DB للتطوير والإنتاج | قواعد بيانات منفصلة |
| كلمات مرور ضعيفة | كلمات مرور قوية + 2FA |
| تجاهل السجلات | مراقبة السجلات يومياً |

---

## 📋 قائمة التحقق قبل الإطلاق

### الأمان:
- [ ] كلمات مرور قوية لكل شيء
- [ ] SSL مفعّل (HTTPS)
- [ ] Firewall مفعّل
- [ ] SSH بالمفاتيح فقط
- [ ] Fail2Ban مفعّل

### البيانات:
- [ ] Backup يومي مجدول
- [ ] نسخة خارجية (Cloud)
- [ ] اختبار الاسترجاع

### التطبيق:
- [ ] Health endpoint يعمل
- [ ] السجلات تُحفظ
- [ ] Error handling صحيح

### النشر:
- [ ] Git repository جاهز
- [ ] CI/CD (اختياري)
- [ ] Rollback plan جاهز

---

## 🆘 الطوارئ (Emergency Procedures)

### التطبيق لا يعمل:
```bash
# 1. تحقق من الحالة
docker compose ps

# 2. اقرأ السجلات
docker compose logs --tail=100

# 3. أعد التشغيل
docker compose restart

# 4. إذا فشل، أعد البناء
docker compose down
docker compose up -d --build
```

### استرجاع نسخة احتياطية:
```bash
# 1. أوقف التطبيق
docker compose down

# 2. استرجع قاعدة البيانات
gunzip < /backups/daily/db_YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U slms_prod slms_production

# 3. أعد التشغيل
docker compose up -d
```

### Rollback لإصدار سابق:
```bash
# 1. شوف آخر commits
git log --oneline -10

# 2. ارجع لإصدار محدد
git checkout COMMIT_HASH

# 3. أعد البناء
docker compose up -d --build
```

---

## 📞 الدعم والمساعدة

### مصادر مفيدة:
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [Docker Documentation](https://docs.docker.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### عند الحاجة للمساعدة:
1. راجع السجلات أولاً
2. ابحث في Google عن رسالة الخطأ
3. اسأل في Stack Overflow
4. تواصل مع الدعم الفني للموفر

---

## 📝 ملاحظات أخيرة

> 💡 **نصيحة ذهبية**: ابدأ بسيط، ثم طوّر تدريجياً
> 
> لا تحاول تطبيق كل شيء دفعة واحدة. ابدأ بـ:
> 1. VPS واحد
> 2. Backup يومي
> 3. SSL
> 
> ثم أضف الباقي تدريجياً.

---

**آخر تحديث**: 1 فبراير 2026
**المؤلف**: SLMS Development Team
