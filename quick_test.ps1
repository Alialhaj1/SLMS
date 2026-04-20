# =============================================================================
# اختبار سريع للتحقق من البيانات الأساسية
# =============================================================================

Write-Host "🔍 بدء فحص سريع للنظام..." -ForegroundColor Green

$baseUrl = "http://localhost:4000/api"

try {
    # فحص صحة النظام
    Write-Host "1. فحص صحة النظام..."
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 10
    if ($health) {
        Write-Host "   ✅ Backend يعمل بنجاح" -ForegroundColor Green
    }
}
catch {
    Write-Host "   ❌ Backend لا يعمل: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# قائمة الـ endpoints للاختبار
$endpoints = @(
    @{name="الدول"; url="$baseUrl/master/countries"},
    @{name="المناطق"; url="$baseUrl/master/regions"},  
    @{name="المدن"; url="$baseUrl/master/cities"},
    @{name="حالات السجلات"; url="$baseUrl/master/record-statuses"},
    @{name="حالات الطلبات"; url="$baseUrl/master/request-statuses"},
    @{name="طرق التواصل"; url="$baseUrl/master/contact-methods"},
    @{name="اللغات"; url="$baseUrl/master/languages"},
    @{name="المناطق الزمنية"; url="$baseUrl/master/timezones"}
)

Write-Host ""
Write-Host "2. فحص البيانات الأساسية:"

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri $endpoint.url -TimeoutSec 10
        if ($response.data) {
            $count = $response.data.Count
            Write-Host "   ✅ $($endpoint.name): $count سجل" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ $($endpoint.name): لا توجد بيانات" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "   ❌ $($endpoint.name): خطأ - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# اختبار الفلاتر المتتالية
Write-Host ""
Write-Host "3. اختبار الفلاتر المتتالية:"

try {
    # الحصول على الدول
    $countries = Invoke-RestMethod -Uri "$baseUrl/master/countries" -TimeoutSec 10
    
    if ($countries.data -and $countries.data.Count -gt 0) {
        Write-Host "   📋 الدول المتاحة: $($countries.data.Count)" -ForegroundColor Gray
        
        # اختبار السعودية إذا كانت موجودة
        $saudi = $countries.data | Where-Object { $_.code -eq "SAU" -or $_.name_ar -like "*سعود*" }
        if ($saudi) {
            Write-Host "   🇸🇦 السعودية موجودة (ID: $($saudi.id))" -ForegroundColor Green
            
            # اختبار مدن السعودية
            $saudiCities = Invoke-RestMethod -Uri "$baseUrl/master/cities?country_id=$($saudi.id)" -TimeoutSec 10
            if ($saudiCities.data) {
                Write-Host "   🏙️ مدن السعودية: $($saudiCities.data.Count) مدينة" -ForegroundColor Green
            }
        }
    }
}
catch {
    Write-Host "   ❌ فشل اختبار الفلاتر: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. اختبار Frontend:"

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 10
    if ($frontend.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend يعمل بنجاح" -ForegroundColor Green
    }
}
catch {
    Write-Host "   ❌ Frontend لا يعمل: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ انتهى الفحص السريع" -ForegroundColor Green
Write-Host "---"
Write-Host "للفحص الشامل، استخدم:"
Write-Host "  .\test_apis_group1.ps1"
Write-Host "  .\test_translations_group1.ps1"