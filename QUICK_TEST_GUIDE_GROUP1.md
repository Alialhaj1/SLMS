# 🚀 دليل الاختبار السريع - المجموعة الأولى

## 🎯 روابط الوصول المباشر

### 🖥️ صفحات النظام (Frontend)
```
🏠 الصفحة الرئيسية:      http://localhost:3001
📊 لوحة التحكم:          http://localhost:3001/dashboard
📋 تقرير الاختبار:       http://localhost:3001/test-report.html

📂 شاشات المجموعة الأولى:
├─ أ-15: حالات السجلات    http://localhost:3001/master/record-statuses  
├─ أ-16: حالات الطلبات    http://localhost:3001/master/request-statuses
├─ أ-14: طرق التواصل      http://localhost:3001/master/contact-methods
├─ أ-03: اللغات           http://localhost:3001/master/languages
├─ أ-04: المناطق الزمنية  http://localhost:3001/master/timezones
└─ 🏙️ المدن (فلاتر)     http://localhost:3001/master/cities
```

### 🔌 APIs للاختبار المباشر
```
🟢 صحة النظام:           http://localhost:4000/api/health
📊 البيانات الأساسية:
├─ الدول:               http://localhost:4000/api/master/countries
├─ المناطق:             http://localhost:4000/api/master/regions  
├─ المدن:               http://localhost:4000/api/master/cities
├─ حالات السجلات:        http://localhost:4000/api/master/record-statuses
├─ حالات الطلبات:        http://localhost:4000/api/master/request-statuses
├─ طرق التواصل:          http://localhost:4000/api/master/contact-methods
├─ اللغات:              http://localhost:4000/api/master/languages
└─ المناطق الزمنية:      http://localhost:4000/api/master/timezones

🔗 اختبار الفلاتر المتتالية:
├─ مدن السعودية:         http://localhost:4000/api/master/cities?country_id=1
├─ مدن الإمارات:         http://localhost:4000/api/master/cities?country_id=2
├─ المدن الساحلية:       http://localhost:4000/api/master/cities?is_port_city=true
└─ مناطق السعودية:       http://localhost:4000/api/master/regions?country_id=1
```

## ⚡ أوامر التشغيل والاختبار

### 🚀 تشغيل النظام
```powershell
# بدء النظام
cd c:\projects\slms
docker-compose up -d

# التحقق من الحالة  
docker-compose ps

# إعادة بناء إذا لزم الأمر
docker-compose up -d --build
```

### 🧪 تشغيل الاختبارات
```powershell
# اختبار سريع
.\quick_test.ps1

# اختبار شامل للـ APIs  
.\test_apis_group1.ps1

# فحص الترجمات
.\test_translations_group1.ps1

# تشغيل جميع الاختبارات
.\quick_test.ps1; .\test_apis_group1.ps1; .\test_translations_group1.ps1
```

### 🗃️ اختبار قاعدة البيانات
```powershell
# الاتصال بقاعدة البيانات
docker-compose exec postgres psql -U slms -d slms_db

# تشغيل اختبار شامل
docker-compose exec postgres psql -U slms -d slms_db -f /tmp/test_comprehensive_group1.sql
```

## 📋 قائمة مرجعية للاختبار

### ✅ الوظائف الأساسية
- [ ] تسجيل الدخول يعمل بنجاح
- [ ] جميع صفحات المجموعة الأولى تُفتح بدون أخطاء
- [ ] البيانات تظهر باللغة العربية والإنجليزية
- [ ] الفلاتر المتتالية تعمل في صفحة المدن
- [ ] يمكن إضافة/تعديل/حذف البيانات (حسب الصلاحيات)

### ✅ اختبار البيانات
- [ ] الدول تظهر بالأعلام الصحيحة 🇸🇦 🇦🇪 🇯🇴 🇪🇬 🇾🇪 🇮🇶
- [ ] المدن مربوطة بالدول الصحيحة
- [ ] المدن الساحلية مُعلَّمة بشكل صحيح ⚓
- [ ] حالات السجلات تظهر بالألوان المناسبة
- [ ] المناطق الزمنية تعرض التوقيتات الصحيحة

### ✅ الأداء والجودة
- [ ] الصفحات تحمُل خلال أقل من 3 ثواني
- [ ] لا توجد أخطاء في Console
- [ ] الواجهة متجاوبة على الأحجام المختلفة
- [ ] الصلاحيات تعمل بشكل صحيح
- [ ] رسائل الخطأ واضحة ومفهومة

## 🔍 نقاط التحقق المتقدمة

### 📊 البيانات الإحصائية المتوقعة
```
✓ الدول: 6 دول (السعودية، الإمارات، الأردن، مصر، اليمن، العراق)
✓ المناطق: 91 منطقة/محافظة  
✓ المدن: 100+ مدينة
✓ المدن الساحلية: 20+ مدينة ساحلية
✓ اللغات: 25 لغة عالمية
✓ المناطق الزمنية: 40 منطقة زمنية
✓ حالات السجلات: 7 حالات أساسية
✓ طرق التواصل: 8 وسائل تواصل
```

### 🔗 اختبار العلاقات المتتالية
```
1. فتح صفحة المدن
2. اختيار "السعودية" من قائمة الدول
3. التأكد من ظهور المدن السعودية فقط
4. تغيير إلى "الإمارات"  
5. التأكد من تحديث القائمة تلقائياً
6. مسح اختيار الدولة
7. التأكد من ظهور جميع المدن مرة أخرى
```

## 🐛 الأخطاء الشائعة وحلولها

### ❌ "Backend لا يستجيب"
```powershell
# التحقق من تشغيل الخدمات
docker-compose ps

# إعادة تشغيل Backend
docker-compose restart backend
```

### ❌ "البيانات لا تظهر"  
```powershell
# تطبيق migrations
docker-compose exec backend npm run migrate

# فحص طلبات قاعدة البيانات
docker-compose logs postgres
```

### ❌ "الفلاتر لا تعمل"
```javascript
// فحص Console للأخطاء
// التأكد من تحديث formData  
// التأكد من وجود country_id في البيانات
```

## 📞 دعم إضافي

### 📚 الملفات المرجعية
- `COMPREHENSIVE_TEST_REPORT_GROUP1.md` - التقرير الشامل
- `test_comprehensive_group1.sql` - اختبار قاعدة البيانات
- `test_apis_group1.ps1` - اختبار APIs
- `test_translations_group1.ps1` - فحص الترجمات

### 🔧 أدوات التطوير
- Backend logs: `docker-compose logs backend`
- Frontend logs: Developer Tools Console
- Database: `docker-compose exec postgres psql -U slms -d slms_db`

---

**🎉 النظام جاهز للاختبار والاستخدام!**

*ملاحظة: تأكد من تشغيل Docker Desktop قبل تشغيل أي أوامر*