$lr = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"ali@darkhawlan.com","password":"Admin@123","tenant_id":7}'
$t = $lr.data.accessToken
Write-Host "Token obtained"
$h = @{Authorization="Bearer $t"}

$endpoints = @(
    'group-levels', 'group-types', 'item-grades', 'customer-groups',
    'cost-element-groups', 'shipping-companies', 'deferred-policies',
    'prepaid-policies', 'customer-classifications', 'supplier-types',
    'customs-duty-types', 'group-categories', 'transaction-defaults',
    'supplier-bank-accounts'
)
foreach ($ep in $endpoints) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:4000/api/master/$ep" -Headers $h -ErrorAction Stop
        $count = 0
        if ($resp.data -is [array]) { $count = $resp.data.Count }
        elseif ($resp.data.data -is [array]) { $count = $resp.data.data.Count }
        Write-Host "$ep : count=$count"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "$ep : ERROR $code"
    }
}
