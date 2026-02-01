$body = '{"email":"ali@alhajco.com","password":"A11A22A33"}'
$loginResp = Invoke-RestMethod -Uri http://localhost:4000/api/auth/login -Method Post -Body $body -ContentType "application/json"
$token = $loginResp.accessToken
Write-Host "Token: $($token.Substring(0,20))..."

# Test Customers
$h = @{Authorization="Bearer $token"}
try {
    $customers = Invoke-RestMethod -Uri http://localhost:4000/api/master/customers -Headers $h
    Write-Host "Customers: $($customers.total)"
} catch {
    Write-Host "Customers Error: $($_.Exception.Message)"
}

# Test Vendors
try {
    $vendors = Invoke-RestMethod -Uri http://localhost:4000/api/master/vendors -Headers $h
    Write-Host "Vendors: $($vendors.total)"
} catch {
    Write-Host "Vendors Error: $($_.Exception.Message)"
}

# Test Items
try {
    $items = Invoke-RestMethod -Uri http://localhost:4000/api/master/items -Headers $h
    Write-Host "Items: $($items.total)"
} catch {
    Write-Host "Items Error: $($_.Exception.Message)"
}
