$token = Get-Content "c:\projects\slms-token.txt" -Raw
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$base = "http://localhost:4000"

$endpoints = @(
    # 9 NEW routes (previously 404)
    'vendor-types', 'vendor-classifications', 'vendor-categories', 'vendor-statuses',
    'purchase-order-types', 'purchase-order-statuses', 'vendor-payment-terms',
    'vendor-price-lists', 'lc-types',
    # 7 previously 403
    'countries', 'currencies', 'cities', 'payment-methods', 'taxes', 'request-statuses', 'contact-methods',
    # Existing working ones (spot check)
    'customer-types', 'customer-classifications', 'customer-statuses',
    'group-levels', 'group-categories', 'group-types',
    'item-grades', 'shipping-companies', 'hs-codes',
    'supplier-types', 'address-types', 'contact-types',
    'supply-terms', 'delivery-terms', 'contract-statuses'
)

$ok = 0; $fail = 0
foreach ($ep in $endpoints) {
    try {
        $r = Invoke-RestMethod -Uri "$base/api/master/$ep" -Headers $h -Method GET -TimeoutSec 10
        $count = 0
        if ($r.data -is [array]) { $count = $r.data.Count }
        elseif ($r.total) { $count = $r.total }
        elseif ($r.data.data -is [array]) { $count = $r.data.data.Count }
        Write-Host "OK  $ep  (count=$count)" -ForegroundColor Green
        $ok++
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "ERR $ep  ($code)" -ForegroundColor Red
        $fail++
    }
}

Write-Host "`n=== RESULTS: $ok OK, $fail FAIL out of $($endpoints.Count) ==="
