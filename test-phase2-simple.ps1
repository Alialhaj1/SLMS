# Phase 2 Movement Lock Test - Simple Version
$baseUrl = 'http://localhost:4000'

Write-Host '[Phase 2 Test] Starting movement lock validation...' -ForegroundColor Cyan

# Step 1: Login to get token
Write-Host '[Step 1] Logging in...'
$loginBody = @{
    email = 'admin@example.com'
    password = 'Admin@123'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json'
    $token = $loginResponse.accessToken
    Write-Host '  [OK] Login successful' -ForegroundColor Green
} catch {
    Write-Host '  [FAIL] Login failed' -ForegroundColor Red
    exit
}

# Step 2: Get items list with has_movement
Write-Host '[Step 2] Fetching items list...'
$headers = @{ 'Authorization' = "Bearer $token" }

try {
    $itemsResponse = Invoke-RestMethod -Uri "$baseUrl/api/master/items?limit=10" -Method GET -Headers $headers
    $items = $itemsResponse.data
    Write-Host "  [OK] Found $($items.Count) items" -ForegroundColor Green
    
    foreach ($item in $items) {
        $lockStatus = if ($item.has_movement) { '[LOCKED]' } else { '[UNLOCKED]' }
        Write-Host "    $lockStatus Item: $($item.item_code) (ID: $($item.id))"
    }
} catch {
    Write-Host '  [FAIL] Could not fetch items' -ForegroundColor Red
    exit
}

# Step 3: Test PUT with locked item
Write-Host '[Step 3] Testing PUT validation...'
$lockedItem = $items | Where-Object { $_.has_movement -eq $true } | Select-Object -First 1

if ($lockedItem) {
    Write-Host "  Testing with locked item: $($lockedItem.item_code) (ID: $($lockedItem.id))"
    
    $updateBody = @{
        base_uom_id = if ($lockedItem.base_uom_id -eq 1) { 2 } else { 1 }
    } | ConvertTo-Json
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/master/items/$($lockedItem.id)" -Method PUT -Headers $headers -Body $updateBody -ContentType 'application/json'
        Write-Host '  [FAIL] PUT should have been blocked!' -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host '  [PASS] PUT correctly blocked (409 Conflict)' -ForegroundColor Green
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "    Error: $($errorBody.error)"
        } else {
            Write-Host "  [WARN] Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host '  [SKIP] No locked items found to test' -ForegroundColor Yellow
}

Write-Host '[Phase 2 Test] Complete!' -ForegroundColor Cyan
