@echo off
echo 🔄 إعادة تشغيل سريعة للنظام...
cd /d "c:\projects\slms"

echo 🛑 إيقاف الخدمات...
docker-compose down

echo 🚀 تشغيل الخدمات...
docker-compose up -d

echo ⏳ انتظار 30 ثانية...
timeout /t 30 /nobreak

echo 🧪 اختبار Backend...
curl -s http://localhost:4000/api/health

echo.
echo ✅ انتهى! افتح http://localhost:3001
pause