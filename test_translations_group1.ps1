# =============================================================================
# اختبار الترجمات العربية والإنجليزية - المجموعة الأولى
# فحص ملفات الترجمة والمفاتيح المفقودة
# =============================================================================

Write-Host "📝 فحص ملفات الترجمة للمجموعة الأولى..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

$frontendPath = "c:\projects\slms\frontend-next"
$enTranslationPath = "$frontendPath\locales\en.json"
$arTranslationPath = "$frontendPath\locales\ar.json"

$totalChecks = 0
$passedChecks = 0
$failedChecks = 0

function Test-TranslationKey {
    param(
        [object]$EnJson,
        [object]$ArJson,
        [string]$KeyPath,
        [string]$Description
    )
    
    $global:totalChecks++
    Write-Host "🔍 فحص: $Description ($KeyPath)" -ForegroundColor Cyan
    
    # فحص وجود المفتاح في الإنجليزية
    $enValue = Get-NestedProperty -Object $EnJson -Path $KeyPath
    $arValue = Get-NestedProperty -Object $ArJson -Path $KeyPath
    
    $enExists = $null -ne $enValue -and $enValue -ne ""
    $arExists = $null -ne $arValue -and $arValue -ne ""
    
    if ($enExists -and $arExists) {
        Write-Host "   ✅ موجود في كلا اللغتين" -ForegroundColor Green
        Write-Host "   EN: $enValue" -ForegroundColor Gray
        Write-Host "   AR: $arValue" -ForegroundColor Gray
        $global:passedChecks++
    }
    elseif ($enExists) {
        Write-Host "   ⚠️ موجود بالإنجليزية فقط: $enValue" -ForegroundColor Yellow
        $global:failedChecks++
    }
    elseif ($arExists) {
        Write-Host "   ⚠️ موجود بالعربية فقط: $arValue" -ForegroundColor Yellow
        $global:failedChecks++
    }
    else {
        Write-Host "   ❌ مفقود في كلا اللغتين" -ForegroundColor Red
        $global:failedChecks++
    }
    
    Write-Host ""
}

function Get-NestedProperty {
    param(
        [object]$Object,
        [string]$Path
    )
    
    if (-not $Object) { return $null }
    
    $keys = $Path -split '\.'
    $current = $Object
    
    foreach ($key in $keys) {
        if ($current.$key) {
            $current = $current.$key
        } else {
            return $null
        }
    }
    
    return $current
}

# =============================================================================
# قراءة ملفات الترجمة
# =============================================================================

Write-Host "📂 قراءة ملفات الترجمة..." -ForegroundColor Cyan

try {
    $enContent = Get-Content -Path $enTranslationPath -Raw -Encoding UTF8
    $arContent = Get-Content -Path $arTranslationPath -Raw -Encoding UTF8
    
    $enJson = $enContent | ConvertFrom-Json
    $arJson = $arContent | ConvertFrom-Json
    
    Write-Host "   ✅ تم تحميل ملفات الترجمة بنجاح" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ خطأ في قراءة ملفات الترجمة: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# =============================================================================
# فحص المفاتيح الأساسية
# =============================================================================

Write-Host "🔑 فحص المفاتيح الأساسية" -ForegroundColor Cyan
Write-Host "------------------------"

# المفاتيح العامة
$commonKeys = @(
    @{ key = "common.loading"; desc = "تحميل" },
    @{ key = "common.save"; desc = "حفظ" },
    @{ key = "common.cancel"; desc = "إلغاء" },
    @{ key = "common.delete"; desc = "حذف" },
    @{ key = "common.edit"; desc = "تعديل" },
    @{ key = "common.add"; desc = "إضافة" },
    @{ key = "common.search"; desc = "بحث" },
    @{ key = "common.filter"; desc = "فلتر" },
    @{ key = "common.actions"; desc = "الإجراءات" },
    @{ key = "common.status"; desc = "الحالة" },
    @{ key = "common.active"; desc = "نشط" },
    @{ key = "common.inactive"; desc = "غير نشط" },
    @{ key = "common.name"; desc = "الاسم" },
    @{ key = "common.code"; desc = "الرمز" },
    @{ key = "common.description"; desc = "الوصف" }
)

foreach ($keyInfo in $commonKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# =============================================================================
# فحص صفحات المجموعة الأولى
# =============================================================================

Write-Host "📋 فحص ترجمات صفحات المجموعة الأولى" -ForegroundColor Cyan
Write-Host "------------------------------------"

# صفحة حالات السجلات
$recordStatusKeys = @(
    @{ key = "pages.master.recordStatuses.title"; desc = "عنوان صفحة حالات السجلات" },
    @{ key = "pages.master.recordStatuses.add"; desc = "إضافة حالة سجل" },
    @{ key = "pages.master.recordStatuses.fields.code"; desc = "رمز الحالة" },
    @{ key = "pages.master.recordStatuses.fields.nameAr"; desc = "الاسم بالعربية" },
    @{ key = "pages.master.recordStatuses.fields.nameEn"; desc = "الاسم بالإنجليزية" },
    @{ key = "pages.master.recordStatuses.fields.color"; desc = "اللون" },
    @{ key = "pages.master.recordStatuses.fields.isActive"; desc = "نشط" }
)

foreach ($keyInfo in $recordStatusKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# صفحة حالات الطلبات
$requestStatusKeys = @(
    @{ key = "pages.master.requestStatuses.title"; desc = "عنوان صفحة حالات الطلبات" },
    @{ key = "pages.master.requestStatuses.add"; desc = "إضافة حالة طلب" }
)

foreach ($keyInfo in $requestStatusKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# صفحة طرق التواصل
$contactMethodKeys = @(
    @{ key = "pages.master.contactMethods.title"; desc = "عنوان صفحة طرق التواصل" },
    @{ key = "pages.master.contactMethods.add"; desc = "إضافة طريقة تواصل" }
)

foreach ($keyInfo in $contactMethodKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# صفحة اللغات
$languageKeys = @(
    @{ key = "pages.master.languages.title"; desc = "عنوان صفحة اللغات" },
    @{ key = "pages.master.languages.add"; desc = "إضافة لغة" }
)

foreach ($keyInfo in $languageKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# صفحة المناطق الزمنية
$timezoneKeys = @(
    @{ key = "pages.master.timezones.title"; desc = "عنوان صفحة المناطق الزمنية" },
    @{ key = "pages.master.timezones.add"; desc = "إضافة منطقة زمنية" }
)

foreach ($keyInfo in $timezoneKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# صفحة المدن
$cityKeys = @(
    @{ key = "pages.master.cities.title"; desc = "عنوان صفحة المدن" },
    @{ key = "pages.master.cities.add"; desc = "إضافة مدينة" },
    @{ key = "pages.master.cities.fields.countryId"; desc = "الدولة" },
    @{ key = "pages.master.cities.fields.isPortCity"; desc = "مدينة ساحلية" }
)

foreach ($keyInfo in $cityKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# =============================================================================
# فحص رسائل التحقق والأخطاء
# =============================================================================

Write-Host "⚠️ فحص رسائل التحقق والأخطاء" -ForegroundColor Cyan
Write-Host "------------------------------"

$validationKeys = @(
    @{ key = "validation.required"; desc = "حقل مطلوب" },
    @{ key = "validation.minLength"; desc = "أقل عدد أحرف" },
    @{ key = "validation.maxLength"; desc = "أكثر عدد أحرف" },
    @{ key = "validation.email"; desc = "بريد إلكتروني صحيح" },
    @{ key = "errors.notFound"; desc = "غير موجود" },
    @{ key = "errors.serverError"; desc = "خطأ في الخادم" },
    @{ key = "success.saved"; desc = "تم الحفظ" },
    @{ key = "success.deleted"; desc = "تم الحذف" }
)

foreach ($keyInfo in $validationKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# =============================================================================
# فحص إحصاءات لوحة التحكم
# =============================================================================

Write-Host "📊 فحص ترجمات إحصاءات لوحة التحكم" -ForegroundColor Cyan
Write-Host "----------------------------------"

$statsKeys = @(
    @{ key = "stats.totalRecords"; desc = "إجمالي السجلات" },
    @{ key = "stats.activeRecords"; desc = "السجلات النشطة" },
    @{ key = "stats.inactiveRecords"; desc = "السجلات غير النشطة" },
    @{ key = "stats.countries"; desc = "الدول" },
    @{ key = "stats.cities"; desc = "المدن" },
    @{ key = "stats.regions"; desc = "المناطق" }
)

foreach ($keyInfo in $statsKeys) {
    Test-TranslationKey -EnJson $enJson -ArJson $arJson -KeyPath $keyInfo.key -Description $keyInfo.desc
}

# =============================================================================
# النتائج النهائية وتوصيات
# =============================================================================

Write-Host "📊 نتائج فحص الترجمات" -ForegroundColor Cyan
Write-Host "======================="
Write-Host "إجمالي الفحوصات: $totalChecks" -ForegroundColor Gray
Write-Host "نجحت: $passedChecks" -ForegroundColor Green
Write-Host "فشلت: $failedChecks" -ForegroundColor Red

$translationRate = if ($totalChecks -gt 0) { [math]::Round(($passedChecks / $totalChecks) * 100, 2) } else { 0 }
Write-Host "نسبة اكتمال الترجمة: ${translationRate}%" -ForegroundColor $(if ($translationRate -gt 80) { "Green" } elseif ($translationRate -gt 60) { "Yellow" } else { "Red" })

if ($failedChecks -eq 0) {
    Write-Host ""
    Write-Host "🎉 ممتاز! جميع الترجمات مكتملة" -ForegroundColor Green
}
elseif ($translationRate -gt 80) {
    Write-Host ""
    Write-Host "⚠️ الترجمات جيدة، لكن هناك بعض المفاتيح المفقودة" -ForegroundColor Yellow
    Write-Host "📝 توصية: أضف المفاتيح المفقودة لتحسين تجربة المستخدم" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "❌ الترجمات تحتاج إلى تحسين كبير" -ForegroundColor Red
    Write-Host "📝 توصية: راجع ملفات الترجمة وأضف المفاتيح المفقودة" -ForegroundColor Red
}

Write-Host ""
Write-Host "📄 ملفات الترجمة:" -ForegroundColor Gray
Write-Host "- الإنجليزية: $enTranslationPath" -ForegroundColor Gray
Write-Host "- العربية: $arTranslationPath" -ForegroundColor Gray