Set-Location c:\projects\slms
$token = (Get-Content c:\projects\slms-token.txt -Raw).Trim()
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
    "X-Company-Id" = "7"
}

# Test POST group-levels
Write-Host "=== POST group-levels ==="
try {
    $body = '{"code":"TEST_GL99","name_en":"Test Group Level","name_ar":"مستوى مجموعة تجريبي","is_active":true}'
    $r = Invoke-RestMethod -Uri 'http://localhost:4000/api/master/group-levels' -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "OK: id=$($r.data.id)"
    # Clean up
    $delId = $r.data.id
    Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels/$delId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Cleaned up id=$delId"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" }
}

# Test POST group-categories
Write-Host ""
Write-Host "=== POST group-categories ==="
try {
    $body = '{"code":"TEST_GC99","name_en":"Test Group Category","name_ar":"فئة مجموعة تجريبية","sort_order":99,"is_active":true}'
    $r = Invoke-RestMethod -Uri 'http://localhost:4000/api/master/group-categories' -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "OK: id=$($r.data.id)"
    $delId = $r.data.id
    Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories/$delId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Cleaned up id=$delId"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" }
}

# Test all master GETs
Write-Host ""
Write-Host "=== GET tests ==="
$endpoints = @(
    'customer-types','customer-classifications','customer-statuses','customer-groups','customer-categories',
    'address-types','contact-types','supplier-types','vendor-types','vendor-classifications',
    'vendor-categories','vendor-statuses','purchase-order-types','purchase-order-statuses',
    'vendor-payment-terms','vendor-price-lists','supply-terms','delivery-terms','contract-statuses',
    'group-categories','group-levels','group-types','item-grades','cost-element-groups',
    'shipping-companies','countries','currencies','cities','units-of-measure',
    'payment-methods','tax-types','tax-rates','tax-codes','taxes',
    'lc-types','digital-signatures','request-statuses','ui-themes','contact-methods',
    'hs-codes','tax-item-categories','zakat-codes','tax-zones'
)
foreach ($ep in $endpoints) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/$ep" -Headers $headers -ErrorAction Stop
        $count = 0
        if ($r.data.data) { $count = $r.data.data.Count }
        elseif ($r.data -is [array]) { $count = $r.data.Count }
        Write-Host "$ep : $count items"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "$ep : ERROR $code"
    }
}
