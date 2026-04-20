# =============================================================================
# إصلاح مشكلة الاتصال بـ Backend API
# تشخيص وإصلاح أخطاء ERR_EMPTY_RESPONSE و Failed to fetch
# =============================================================================

Write-Host "🔧 بدء تشخيص وإصلاح مشاكل Backend API..." -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

$baseDir = "c:\projects\slms"
Set-Location $baseDir

# التحقق من Docker Desktop
Write-Host ""
Write-Host "1️⃣ فحص Docker Desktop..." -ForegroundColor Cyan
$dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "   ✅ Docker Desktop يعمل (PID: $($dockerProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Docker Desktop لا يعمل - جاري تشغيله..." -ForegroundColor Red
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "   ⏳ انتظار 30 ثانية لbud Docker..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# التحقق من حالة Containers
Write-Host ""
Write-Host "2️⃣ فحص حالة Docker Containers..." -ForegroundColor Cyan
try {
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   📊 Containers المُشغلة:" -ForegroundColor Gray
        $containers | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Gray }
    } else {
        Write-Host "   ❌ فشل في الحصول على حالة Containers" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ❌ خطأ في Docker: $($_.Exception.Message)" -ForegroundColor Red
}

# إعادة تشغيل النظام
Write-Host ""
Write-Host "3️⃣ إعادة تشغيل خدمات النظام..." -ForegroundColor Cyan

Write-Host "   🛑 إيقاف جميع الخدمات..." -ForegroundColor Yellow
docker-compose down 2>$null

Write-Host "   🔨 بناء وتشغيل الخدمات..." -ForegroundColor Yellow
docker-compose up -d --build 2>$null

# انتظار تشغيل الخدمات
Write-Host "   ⏳ انتظار تشغيل الخدمات (60 ثانية)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# فحص logs الـ Backend
Write-Host ""
Write-Host "4️⃣ فحص Backend Logs..." -ForegroundColor Cyan
try {
    $backendLogs = docker-compose logs backend --tail 10 2>$null
    if ($backendLogs) {
        Write-Host "   📋 آخر 10 أسطر من Backend logs:" -ForegroundColor Gray
        $backendLogs | ForEach-Object { 
            if ($_ -match "error|Error|ERROR") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } elseif ($_ -match "listening|started|ready") {
                Write-Host "   ✅ $_" -ForegroundColor Green
            } else {
                Write-Host "   📝 $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   ⚠️ لا يمكن الحصول على Backend logs" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ❌ خطأ في قراءة logs: $($_.Exception.Message)" -ForegroundColor Red
}

# اختبار APIs
Write-Host ""
Write-Host "5️⃣ اختبار الاتصال بـ APIs..." -ForegroundColor Cyan

$testEndpoints = @(
    "http://localhost:4000/api/health",
    "http://localhost:4000/api/master/countries",
    "http://localhost:3001"
)

foreach ($endpoint in $testEndpoints) {
    try {
        Write-Host "   🔍 اختبار: $endpoint" -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ $endpoint - الحالة: $($response.StatusCode)" -ForegroundColor Green
    }
    catch {
        Write-Host "   ❌ $endpoint - خطأ: $($_.Exception.Message)" -ForegroundColor Red
        
        # محاولة تشخيص أكثر تفصيلاً
        if ($_.Exception.Message -match "connection") {
            Write-Host "      💡 الخدمة قد تكون غير مُشغلة أو لا تستمع على المنفذ المحدد" -ForegroundColor Yellow
        }
    }
}

# فحص الشبكة الداخلية
Write-Host ""
Write-Host "6️⃣ فحص الشبكة الداخلية..." -ForegroundColor Cyan
try {
    $networkTest = docker-compose exec backend ping -c 1 postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Backend يمكنه الوصول لـ PostgreSQL" -ForegroundColor Green
    } else {
        Write-Host "   ❌ مشكلة في الشبكة الداخلية بين Backend و PostgreSQL" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ⚠️ لا يمكن اختبار الشبكة الداخلية" -ForegroundColor Yellow
}

# اقتراحات الحلول
Write-Host ""
Write-Host "🔧 اقتراحات الحلول:" -ForegroundColor Cyan
Write-Host "--------------------"
Write-Host "1. إذا كان Backend لا يعمل:" -ForegroundColor Yellow
Write-Host "   docker-compose restart backend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. إذا كانت قاعدة البيانات لا تعمل:" -ForegroundColor Yellow  
Write-Host "   docker-compose restart postgres" -ForegroundColor Gray
Write-Host ""
Write-Host "3. إعادة بناء كاملة:" -ForegroundColor Yellow
Write-Host "   docker-compose down" -ForegroundColor Gray
Write-Host "   docker-compose up -d --build" -ForegroundColor Gray
Write-Host ""
Write-Host "4. تطبيق Migrations:" -ForegroundColor Yellow
Write-Host "   docker-compose exec backend npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "5. فحص logs مفصل:" -ForegroundColor Yellow
Write-Host "   docker-compose logs backend -f" -ForegroundColor Gray

# إنهاء التقرير
Write-Host ""
Write-Host "📊 خلاصة التشخيص:" -ForegroundColor Cyan
Write-Host "==================="
Write-Host "- تاريخ التشخيص: $(Get-Date)" -ForegroundColor Gray
Write-Host "- إذا استمرت المشاكل، راجع logs مفصلة" -ForegroundColor Gray
Write-Host "- تأكد من تطبيق migrations بعد إصلاح Backend" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ انتهى التشخيص والإصلاح!" -ForegroundColor Green