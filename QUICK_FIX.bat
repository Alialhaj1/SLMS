@echo off
chcp 65001 >nul
echo.
echo 🚨 إصلاح سريع لمشاكل Backend API
echo ===================================
echo.

cd /d "c:\projects\slms"

echo 📍 المجلد الحالي: %CD%
echo.

echo 🔍 فحص Docker Desktop...
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Docker Desktop يعمل
) else (
    echo ❌ Docker Desktop لا يعمل - جاري تشغيله...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo ⏳ انتظار 30 ثانية...
    timeout /t 30 /nobreak >nul
)

echo.
echo 🛑 إيقاف الخدمات الحالية...
docker-compose down >nul 2>&1

echo 🔄 إعادة تشغيل الخدمات...
docker-compose up -d

echo ⏳ انتظار تشغيل الخدمات (45 ثانية)...
timeout /t 45 /nobreak

echo.
echo 🧪 اختبار Backend...
curl -s http://localhost:4000/api/health >nul
if %ERRORLEVEL% equ 0 (
    echo ✅ Backend يعمل بنجاح
) else (
    echo ❌ Backend لا يستجيب - جاري إعادة المحاولة...
    docker-compose restart backend
    timeout /t 30 /nobreak
)

echo.
echo 📋 تطبيق Migrations...
docker-compose exec backend npm run migrate

echo.
echo 🌐 اختبار Frontend...
curl -s -o nul -w "%%{http_code}" http://localhost:3001 | findstr "200" >nul
if %ERRORLEVEL% equ 0 (
    echo ✅ Frontend يعمل بنجاح
) else (
    echo ⚠️ Frontend قد يحتاج وقت أكثر للتحميل
)

echo.
echo 📊 تقرير تفاعلي متاح على:
echo 🔗 http://localhost:3001/api-diagnostics.html
echo.
echo 🎯 الروابط المهمة:
echo 📱 Frontend: http://localhost:3001
echo 🔧 Backend: http://localhost:4000/api/health
echo 📋 تقرير الاختبار: http://localhost:3001/test-report.html
echo.
echo ✅ انتهى الإصلاح! أعد تحميل المتصفح.
pause