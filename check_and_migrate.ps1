# =============================================================================
# فحص وتطبيق migrations بعد إصلاح Backend
# =============================================================================

Write-Host "🗃️ فحص وتطبيق Migrations..." -ForegroundColor Green
Set-Location "c:\projects\slms"

# فحص حالة Backend
Write-Host "1️⃣ فحص Backend..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 5
    Write-Host "   ✅ Backend يعمل بنجاح" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Backend لا يعمل - يجب إصلاحه أولاً" -ForegroundColor Red
    Write-Host "   💡 تشغيل: .\fix_backend_api.ps1" -ForegroundColor Yellow
    exit 1
}

# تطبيق migrations
Write-Host "2️⃣ تطبيق Migrations..." -ForegroundColor Cyan
try {
    Write-Host "   📋 تشغيل migrations..." -ForegroundColor Gray
    $migrationResult = docker-compose exec backend npm run migrate 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Migrations طُبقت بنجاح" -ForegroundColor Green
    } else {
        Write-Host "   ❌ فشل في تطبيق migrations" -ForegroundColor Red
        Write-Host "   📋 Output:" -ForegroundColor Gray
        $migrationResult | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    }
}
catch {
    Write-Host "   ❌ خطأ في تطبيق migrations: $($_.Exception.Message)" -ForegroundColor Red
}

# اختبار البيانات
Write-Host "3️⃣ اختبار البيانات..." -ForegroundColor Cyan
$testAPIs = @(
    @{name="الدول"; url="http://localhost:4000/api/master/countries"},
    @{name="المدن"; url="http://localhost:4000/api/master/cities"},
    @{name="حالات السجلات"; url="http://localhost:4000/api/master/record-statuses"}
)

foreach ($api in $testAPIs) {
    try {
        $response = Invoke-RestMethod -Uri $api.url -TimeoutSec 5
        if ($response.data) {
            Write-Host "   ✅ $($api.name): $($response.data.Count) سجل" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ $($api.name): لا توجد بيانات" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "   ❌ $($api.name): خطأ" -ForegroundColor Red
    }
}

Write-Host "" 
Write-Host "🎉 انتهى الفحص! النظام جاهز على http://localhost:3001" -ForegroundColor Green