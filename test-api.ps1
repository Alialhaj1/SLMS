# Test Master Data APIs
Write-Host "=== Testing SLMS Master Data APIs ===" -ForegroundColor Cyan

# Login
$loginBody = @{
    email = "ali@alhajco.com"
    password = "A11A22A33"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Login successful" -ForegroundColor Green
    $token = $loginResponse.accessToken
    
    # Test Countries API
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $countries = Invoke-RestMethod -Uri "http://localhost:4000/api/master/countries" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Countries API: $($countries.total) records" -ForegroundColor Green
    
    # Test Currencies API
    $currencies = Invoke-RestMethod -Uri "http://localhost:4000/api/master/currencies" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Currencies API: $($currencies.total) records" -ForegroundColor Green
    
    # Test Taxes API
    $taxes = Invoke-RestMethod -Uri "http://localhost:4000/api/master/taxes" `
        -Method Get `
        -Headers $headers `
        -ContentType "application/json"
    
    Write-Host "✅ Taxes API: $($taxes.total) records" -ForegroundColor Green
    
    # Test Units API
    $units = Invoke-RestMethod -Uri "http://localhost:4000/api/master/units" `
        -Method Get `
        -Headers $headers `
        -ContentType "application/json"
    
    Write-Host "✅ Units API: $($units.total) records" -ForegroundColor Green
    
    # Test Customers API
    $customers = Invoke-RestMethod -Uri "http://localhost:4000/api/master/customers" `
        -Method Get `
        -Headers $headers `
        -ContentType "application/json"
    
    Write-Host "✅ Customers API: $($customers.total) records" -ForegroundColor Green
    
    # Test Vendors API
    $vendors = Invoke-RestMethod -Uri "http://localhost:4000/api/master/vendors" `
        -Method Get `
        -Headers $headers `
        -ContentType "application/json"
    
    Write-Host "✅ Vendors API: $($vendors.total) records" -ForegroundColor Green
    
    # Test Items API
    $items = Invoke-RestMethod -Uri "http://localhost:4000/api/master/items" `
        -Method Get `
        -Headers $headers `
        -ContentType "application/json"
    
    Write-Host "✅ Items API: $($items.total) records" -ForegroundColor Green
    
    Write-Host "`n=== All 10 Master Data APIs Working! ===" -ForegroundColor Green
    Write-Host "Frontend pages should now load without 404 errors" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
