Set-Location c:\projects\slms

# Get a valid auth token first
$loginBody = '{"email":"admin@darkhawlan.com","password":"admin123"}'
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -ErrorAction Stop
    $token = $resp.data.token
    if (-not $token) { $token = $resp.token }
    Write-Host "TOKEN: $($token.Substring(0,20))..."
} catch {
    Write-Host "LOGIN FAILED: $_"
    exit 1
}

$headers = @{ "Authorization" = "Bearer $token" }

# Test all the master screens APIs
$apis = @(
    "/api/master/customer-types",
    "/api/master/customer-statuses", 
    "/api/master/customer-categories",
    "/api/master/customer-groups",
    "/api/customer-classifications",
    "/api/master/customer-classifications",
    "/api/master/address-types",
    "/api/master/contact-types",
    "/api/master/supplier-types",
    "/api/master/supplier-categories",
    "/api/master/supplier-statuses",
    "/api/master/supply-terms",
    "/api/master/delivery-terms",
    "/api/master/po-statuses",
    "/api/master/contract-statuses",
    "/api/master/contract-types",
    "/api/master/group-types",
    "/api/master/group-levels",
    "/api/master/group-categories",
    "/api/master/item-types",
    "/api/master/item-grades",
    "/api/master/item-groups",
    "/api/master/bin-types",
    "/api/master/payment-terms",
    "/api/master/payment-methods",
    "/api/master/shipping-methods",
    "/api/master/shipping-companies",
    "/api/master/freight-agents",
    "/api/master/hs-codes",
    "/api/master/tariffs",
    "/api/master/customs-statuses",
    "/api/master/customs-offices",
    "/api/letters-of-credit",
    "/api/master/vendor-classifications",
    "/api/master/vendor-payment-terms",
    "/api/procurement/reference/vendor-price-lists",
    "/api/procurement/reference/purchase-order-types"
)

Write-Host ""
Write-Host "=== API ENDPOINT TESTS ==="
foreach ($api in $apis) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:4000$api" -Method GET -Headers $headers -ErrorAction Stop
        $total = 0
        if ($r.data -is [array]) { $total = $r.data.Count }
        elseif ($r.data.data -is [array]) { $total = $r.data.data.Count }
        elseif ($r.data.total) { $total = $r.data.total }
        elseif ($r.total) { $total = $r.total }
        Write-Host "$api -> $total items"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "$api -> ERROR $code"
    }
}
