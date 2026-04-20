# =============================================================================
# إعادة تشغيل كاملة مع تنظيف وإعادة بناء
# =============================================================================

Write-Host "🔥 إعادة تشغيل كاملة مع تنظيف..." -ForegroundColor Red
Set-Location "c:\projects\slms"

# إيقاف واعدة جميع الخدمات
Write-Host "🛑 إيقاف جميع الخدمات..." -ForegroundColor Yellow
docker-compose down -v 2>$null

# تنظيف الصور والشبكات
Write-Host "🧹 تنظيف Docker..." -ForegroundColor Yellow
docker system prune -f 2>$null

# إعادة بناء كاملة
Write-Host "🔨 إعادة بناء الخدمات..." -ForegroundColor Yellow
docker-compose build --no-cache

# تشغيل الخدمات
Write-Host "🚀 تشغيل الخدمات..." -ForegroundColor Green
docker-compose up -d

# انتظار التشغيل
Write-Host "⏳ انتظار تشغيل الخدمات (90 ثانية)..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# تطبيق migrations
Write-Host "📋 تطبيق Migrations..." -ForegroundColor Cyan
docker-compose exec backend npm run migrate

# اختبار النظام
Write-Host "🧪 اختبار النظام..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 10
    Write-Host "✅ النظام يعمل بنجاح!" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost:3001" -ForegroundColor Green
    Write-Host "🔌 Backend: http://localhost:4000" -ForegroundColor Green
}
catch {
    Write-Host "❌ مازالت هناك مشاكل في النظام" -ForegroundColor Red
}

Write-Host "✅ انتهت إعادة التشغيل الكاmlة!" -ForegroundColor Green