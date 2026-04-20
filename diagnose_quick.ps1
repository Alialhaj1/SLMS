# =============================================================================
# تشخيص سريع لمشاكل ERR_EMPTY_RESPONSE
# =============================================================================

Write-Host "⚡ تشخيص سريع لمشاكل API..." -ForegroundColor Yellow

# فحص المنافذ
Write-Host "🔌 فحص المنافذ المستخدمة:" -ForegroundColor Cyan
$ports = @(3001, 4000, 5432)
foreach ($port in $ports) {
    $connection = Test-NetConnection -Port $port -ComputerName localhost -InformationLevel Quiet
    if ($connection) {
        Write-Host "   ✅ المنفذ $port مفتوح" -ForegroundColor Green
    } else {
        Write-Host "   ❌ المنفذ $port مُغلق" -ForegroundColor Red
    }
}

# فحص Docker containers
Write-Host ""
Write-Host "🐳 فحص Docker Containers:" -ForegroundColor Cyan
$containers = docker ps --format "{{.Names}}: {{.Status}}"
if ($containers) {
    $containers | ForEach-Object { Write-Host "   📦 $_" -ForegroundColor Gray }
} else {
    Write-Host "   ❌ لا توجد containers مُشغلة" -ForegroundColor Red
}

# اختبار APIs بسرعة
Write-Host ""
Write-Host "🌐 اختبار APIs:" -ForegroundColor Cyan
$apis = @(
    "http://localhost:4000/api/health",
    "http://localhost:3001"
)

foreach ($api in $apis) {
    try {
        $response = Invoke-WebRequest -Uri $api -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   ✅ $api - OK ($($response.StatusCode))" -ForegroundColor Green
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "empty response") {
            Write-Host "   🔴 $api - EMPTY_RESPONSE (Backend متوقف أو لا يستجيب)" -ForegroundColor Red
        } elseif ($errorMsg -match "connection") {
            Write-Host "   🔶 $api - CONNECTION_ERROR (الخدمة غير مُشغلة)" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ $api - $errorMsg" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "💡 الحلول السريعة:" -ForegroundColor Yellow
Write-Host "   1. تشغيل: .\quick_restart.bat" -ForegroundColor Gray
Write-Host "   2. إصلاح شامل: .\fix_backend_api.ps1" -ForegroundColor Gray
Write-Host "   3. إعادة بناء كاملة: .\restart_fresh.ps1" -ForegroundColor Gray