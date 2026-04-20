# =============================================================================
# اختبار شامل للـ APIs والصلاحيات - المجموعة الأولى
# تفحص جميع endpoints وتتحقق من الاستجابات والصلاحيات
# =============================================================================

Write-Host "🚀 بدء اختبار شامل للمجموعة الأولى..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:4000/api"
$frontendUrl = "http://localhost:3001"

# الألوان للنتائج
$successColor = "Green"
$errorColor = "Red"
$warningColor = "Yellow"
$infoColor = "Cyan"

# متغيرات للإحصائيات
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [string]$Method = "GET",
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $global:totalTests++
    Write-Host "🔍 اختبار: $Description" -ForegroundColor $infoColor
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        
        if ($response) {
            Write-Host "   ✅ نجح: تم الحصول على استجابة" -ForegroundColor $successColor
            $global:passedTests++
            
            # عرض بعض التفاصيل
            if ($response.data -and $response.data.Count) {
                Write-Host "   📊 عدد السجلات: $($response.data.Count)" -ForegroundColor Gray
            } elseif ($response.total) {
                Write-Host "   📊 إجمali السجلات: $($response.total)" -ForegroundColor Gray
            }
            
            return $response
        }
    }
    catch {
        Write-Host "   ❌ فشل: $($_.Exception.Message)" -ForegroundColor $errorColor
        $global:failedTests++
        return $null
    }
    
    Write-Host ""
}

# =============================================================================
# 1. اختبار صحة الخدمات الأساسية
# =============================================================================

Write-Host "📡 اختبار الخدمات الأساسية" -ForegroundColor $infoColor
Write-Host "----------------------------"

Test-Endpoint -Url "$baseUrl/health" -Description "صحة الـ Backend"
Test-Endpoint -Url $frontendUrl -Description "صحة الـ Frontend"

# =============================================================================
# 2. اختبار endpoints المجموعة الأولى بدون authentication
# =============================================================================

Write-Host "📋 اختبار endpoints البيانات الأساسية" -ForegroundColor $infoColor
Write-Host "---------------------------------------"

$endpoints = @(
    @{ url = "$baseUrl/master/record-statuses"; name = "حالات السجلات" },
    @{ url = "$baseUrl/master/request-statuses"; name = "حالات الطلبات" },
    @{ url = "$baseUrl/master/contact-methods"; name = "طرق التواصل" },
    @{ url = "$baseUrl/master/languages"; name = "اللغات" },
    @{ url = "$baseUrl/master/timezones"; name = "المناطق الزمنية" },
    @{ url = "$baseUrl/master/countries"; name = "الدول" },
    @{ url = "$baseUrl/master/regions"; name = "المناطق" },
    @{ url = "$baseUrl/master/cities"; name = "المدن" }
)

foreach ($endpoint in $endpoints) {
    Test-Endpoint -Url $endpoint.url -Description $endpoint.name
}

# =============================================================================
# 3. اختبار الفلاتر المتتالية
# =============================================================================

Write-Host "🔗 اختبار الفلاتر المتتالية" -ForegroundColor $infoColor
Write-Host "----------------------------"

# الحصول على الدول أولاً
$countries = Test-Endpoint -Url "$baseUrl/master/countries" -Description "الحصول على قائمة الدول"

if ($countries -and $countries.data) {
    $saudiArabiaId = ($countries.data | Where-Object { $_.code -eq "SAU" }).id
    
    if ($saudiArabiaId) {
        Write-Host "🇸🇦 اختبار فلترة المناطق للسعودية (ID: $saudiArabiaId)" -ForegroundColor $infoColor
        Test-Endpoint -Url "$baseUrl/master/regions?country_id=$saudiArabiaId" -Description "مناطق السعودية"
        
        Write-Host "🏙️ اختبار فلترة المدن للسعودية" -ForegroundColor $infoColor  
        Test-Endpoint -Url "$baseUrl/master/cities?country_id=$saudiArabiaId" -Description "مدن السعودية"
    }
}

# =============================================================================
# 4. اختبار بيانات محددة
# =============================================================================

Write-Host "🔍 اختبار بيانات محددة" -ForegroundColor $infoColor
Write-Host "----------------------"

# اختبار المدن الساحلية
Test-Endpoint -Url "$baseUrl/master/cities?is_port_city=true" -Description "المدن الساحلية"

# اختبار السجلات النشطة فقط
Test-Endpoint -Url "$baseUrl/master/record-statuses?status=active" -Description "حالات السجلات النشطة"

# =============================================================================
# 5. محاولة اختبار العمليات التي تتطلب authentication
# =============================================================================

Write-Host "🔐 اختبار العمليات المحمية" -ForegroundColor $infoColor
Write-Host "-----------------------------"

# محاولة POST بدون token (يجب أن تفشل مع 401)
try {
    $testData = @{
        code = "test_status"
        name_ar = "حالة اختبار"  
        name_en = "Test Status"
        color = "#FF0000"
    }
    
    Invoke-RestMethod -Uri "$baseUrl/master/record-statuses" -Method POST -Body ($testData | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "   ⚠️ تحذير: POST نجح بدون authentication!" -ForegroundColor $warningColor
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ صحيح: POST فشل كما هو متوقع (401 Unauthorized)" -ForegroundColor $successColor
        $global:passedTests++
    } else {
        Write-Host "   ❌ خطأ غير متوقع: $($_.Exception.Message)" -ForegroundColor $errorColor
        $global:failedTests++
    }
    $global:totalTests++
}

# =============================================================================
# 6. اختبار صفحات الـ Frontend
# =============================================================================

Write-Host "🖥️ اختبار وصول صفحات الـ Frontend" -ForegroundColor $infoColor
Write-Host "-------------------------------------"

$frontendPages = @(
    "/master/record-statuses",
    "/master/request-statuses", 
    "/master/contact-methods",
    "/master/languages",
    "/master/timezones",
    "/master/cities"
)

foreach ($page in $frontendPages) {
    try {
        $response = Invoke-WebRequest -Uri "$frontendUrl$page" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ صفحة $page متاحة" -ForegroundColor $successColor
            $global:passedTests++
        }
    }
    catch {
        Write-Host "   ❌ صفحة $page غير متاحة: $($_.Exception.Message)" -ForegroundColor $errorColor
        $global:failedTests++
    }
    $global:totalTests++
}

# =============================================================================
# 7. النتائج النهائية
# =============================================================================

Write-Host ""
Write-Host "📊 نتائج الاختبار النهائية" -ForegroundColor $infoColor
Write-Host "=========================="
Write-Host "إجمالي الاختبارات: $totalTests" -ForegroundColor Gray
Write-Host "نجحت: $passedTests" -ForegroundColor $successColor  
Write-Host "فشلت: $failedTests" -ForegroundColor $errorColor

$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }
Write-Host "معدل النجاح: ${successRate}%" -ForegroundColor $(if ($successRate -gt 80) { $successColor } elseif ($successRate -gt 60) { $warningColor } else { $errorColor })

if ($failedTests -eq 0) {
    Write-Host ""
    Write-Host "🎉 تهانينا! جميع الاختبارات نجحت" -ForegroundColor $successColor
    Write-Host "المجموعة الأولى جاهزة للاستخدام" -ForegroundColor $successColor
} elseif ($successRate -gt 80) {
    Write-Host ""
    Write-Host "⚠️ معظم الاختبارات نجحت، هناك بعض المشاكل الطفيفة" -ForegroundColor $warningColor
} else {
    Write-Host ""
    Write-Host "❌ هناك مشاكل جدية تحتاج إلى إصلاح" -ForegroundColor $errorColor
}

Write-Host ""
Write-Host "للمزيد من التفاصيل، راجع:" -ForegroundColor Gray
Write-Host "- Backend logs: docker-compose logs backend" -ForegroundColor Gray
Write-Host "- Frontend: $frontendUrl" -ForegroundColor Gray
Write-Host "- Database test: .\test_comprehensive_group1.sql" -ForegroundColor Gray