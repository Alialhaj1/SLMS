$ErrorActionPreference = 'SilentlyContinue'

# Get auth token first
$loginBody = '{"email":"admin@darkhawlan.com","password":"admin123"}'
$login = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.data.token
if (-not $token) { $token = $login.token }
Write-Host "Token: $($token.Substring(0,20))..."

$headers = @{ "Authorization" = "Bearer $token" }

$endpoints = @(
    "/api/master/customer-types",
    "/api/master/customer-classifications",
    "/api/customer-classifications",
    "/api/master/customer-statuses",
    "/api/master/customer-groups",
    "/api/master/customer-categories",
    "/api/master/address-types",
    "/api/master/contact-types",
    "/api/master/supplier-types",
    "/api/master/supplier-categories",
    "/api/master/supplier-statuses",
    "/api/master/vendor-classifications",
    "/api/master/po-statuses",
    "/api/master/contract-statuses",
    "/api/master/contract-types",
    "/api/master/supply-terms",
    "/api/master/delivery-terms",
    "/api/master/group-types",
    "/api/master/group-levels",
    "/api/master/group-categories",
    "/api/master/item-types",
    "/api/master/item-grades",
    "/api/master/bin-types",
    "/api/master/shipping-companies",
    "/api/master/shipping-methods",
    "/api/master/payment-terms",
    "/api/master/payment-methods",
    "/api/procurement/reference/purchase-order-types",
    "/api/procurement/vendors/payment-terms",
    "/api/procurement/reference/vendor-price-lists",
    "/api/master/item-groups",
    "/api/letters-of-credit",
    "/api/reference-data?type=credit_limits",
    "/api/reference-data?type=discount_agreements"
)

foreach ($ep in $endpoints) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:4000$ep" -Headers $headers -Method Get -TimeoutSec 5
        $total = 0
        if ($resp.data -is [array]) { $total = $resp.data.Count }
        elseif ($resp.data.data -is [array]) { $total = $resp.data.data.Count }
        elseif ($resp.data.total) { $total = $resp.data.total }
        elseif ($resp.total) { $total = $resp.total }
        $status = if ($total -eq 0) { "EMPTY <<<" } else { "OK ($total)" }
        Write-Output ("{0,-55} {1}" -f $ep, $status)
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Output ("{0,-55} ERROR {1}" -f $ep, $code)
    }
}
