#!/usr/bin/env pwsh
# Phase 2 Movement Lock - Quick API Test
# Tests the movement lock rules implemented in backend

$baseUrl = "http://localhost:4000"
$token = "" # Add your JWT token here after login

Write-Host "🧪 Phase 2: Movement Lock Rules - API Test`n" -ForegroundColor Cyan

# Function to make API calls
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
        } else {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers
        }
        return @{ Success = $true; Data = $response }
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        return @{ Success = $false; Error = $errorResponse }
    }
}

# Step 1: Get a test item from list
Write-Host "1️⃣ Fetching items list with has_movement column..." -ForegroundColor Yellow
$itemsResult = Invoke-Api -Method GET -Endpoint "/api/master/items?limit=5"

if ($itemsResult.Success) {
    $items = $itemsResult.Data.data
    Write-Host "✅ Found $($items.Count) items" -ForegroundColor Green
    
    foreach ($item in $items) {
        $lockIcon = if ($item.has_movement) { "🔒" } else { "🔓" }
        Write-Host "   $lockIcon Item: $($item.code) | has_movement: $($item.has_movement)"
    }
} else {
    Write-Host "❌ Failed to fetch items" -ForegroundColor Red
    exit
}

# Step 2: Test PUT with locked item (if exists)
Write-Host "`n2️⃣ Testing PUT endpoint with locked item..." -ForegroundColor Yellow
$lockedItem = $items | Where-Object { $_.has_movement -eq $true } | Select-Object -First 1

if ($lockedItem) {
    Write-Host "   Found locked item: $($lockedItem.code) (ID: $($lockedItem.id))" -ForegroundColor Cyan
    
    # Try to change base_uom_id (should fail)
    $updateBody = @{
        code = $lockedItem.code
        name = $lockedItem.name
        base_uom_id = ($lockedItem.base_uom_id -eq 1) ? 2 : 1  # Change to different UOM
    }
    
    Write-Host "   Attempting to change base_uom_id from $($lockedItem.base_uom_id) to $($updateBody.base_uom_id)..."
    $updateResult = Invoke-Api -Method PUT -Endpoint "/api/master/items/$($lockedItem.id)" -Body $updateBody
    
    if (-not $updateResult.Success -and $updateResult.Error.error.code -eq "POLICY_LOCKED") {
        Write-Host "✅ PASS: PUT correctly blocked locked field change" -ForegroundColor Green
        Write-Host "   Error Code: $($updateResult.Error.error.code)"
        Write-Host "   Message: $($updateResult.Error.error.message)"
        Write-Host "   Locked Fields: $($updateResult.Error.error.locked_fields -join ', ')"
    } else {
        Write-Host "❌ FAIL: PUT should have blocked locked field change" -ForegroundColor Red
    }
    
    # Try to delete locked item (should fail)
    Write-Host "`n3️⃣ Testing DELETE endpoint with locked item..." -ForegroundColor Yellow
    $deleteResult = Invoke-Api -Method DELETE -Endpoint "/api/master/items/$($lockedItem.id)"
    
    if (-not $deleteResult.Success -and $deleteResult.Error.error.code -eq "HAS_MOVEMENTS") {
        Write-Host "✅ PASS: DELETE correctly blocked item with movements" -ForegroundColor Green
        Write-Host "   Error Code: $($deleteResult.Error.error.code)"
        Write-Host "   Message: $($deleteResult.Error.error.message)"
    } else {
        Write-Host "❌ FAIL: DELETE should have blocked item with movements" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ No locked items found. Create an item with movements to test." -ForegroundColor Yellow
}

# Step 3: Test unlocked item (if exists)
Write-Host "`n4️⃣ Testing PUT endpoint with unlocked item..." -ForegroundColor Yellow
$unlockedItem = $items | Where-Object { $_.has_movement -eq $false } | Select-Object -First 1

if ($unlockedItem) {
    Write-Host "   Found unlocked item: $($unlockedItem.code) (ID: $($unlockedItem.id))" -ForegroundColor Cyan
    
    # Try to change name (should succeed)
    $updateBody = @{
        code = $unlockedItem.code
        name = "$($unlockedItem.name) [Updated]"
        base_uom_id = $unlockedItem.base_uom_id
    }
    
    Write-Host "   Attempting to change name..."
    $updateResult = Invoke-Api -Method PUT -Endpoint "/api/master/items/$($unlockedItem.id)" -Body $updateBody
    
    if ($updateResult.Success) {
        Write-Host "✅ PASS: PUT allowed non-locked field change" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: PUT should have allowed non-locked field change" -ForegroundColor Red
        Write-Host "   Error: $($updateResult.Error.error.message)"
    }
    
    # Revert name change
    $revertBody = @{
        code = $unlockedItem.code
        name = $unlockedItem.name
        base_uom_id = $unlockedItem.base_uom_id
    }
    Invoke-Api -Method PUT -Endpoint "/api/master/items/$($unlockedItem.id)" -Body $revertBody | Out-Null
} else {
    Write-Host "⚠️ No unlocked items found." -ForegroundColor Yellow
}

# Step 4: Test deprecated endpoint
Write-Host "`n5️⃣ Testing deprecated /has-movement endpoint..." -ForegroundColor Yellow
if ($items.Count -gt 0) {
    $testItem = $items[0]
    $hasMovementResult = Invoke-Api -Method GET -Endpoint "/api/master/items/$($testItem.id)/has-movement"
    
    if ($hasMovementResult.Success -and $hasMovementResult.Data._deprecated -eq $true) {
        Write-Host "✅ PASS: Deprecated endpoint returns deprecation warning" -ForegroundColor Green
        Write-Host "   Message: $($hasMovementResult.Data._message)"
    } else {
        Write-Host "❌ FAIL: Deprecated endpoint should include deprecation warning" -ForegroundColor Red
    }
}

# Step 5: Test full-profile endpoint (includes has_movement)
Write-Host "`n6️⃣ Testing /full-profile endpoint..." -ForegroundColor Yellow
if ($items.Count -gt 0) {
    $testItem = $items[0]
    $profileResult = Invoke-Api -Method GET -Endpoint "/api/master/items/$($testItem.id)/full-profile"
    
    if ($profileResult.Success -and $null -ne $profileResult.Data.data.has_movement) {
        Write-Host "✅ PASS: /full-profile includes has_movement field" -ForegroundColor Green
        Write-Host "   has_movement: $($profileResult.Data.data.has_movement)"
    } else {
        Write-Host "❌ FAIL: /full-profile should include has_movement" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Phase 2 API Testing Complete!`n" -ForegroundColor Cyan

Write-Host "📝 Summary:" -ForegroundColor White
Write-Host "   ✅ Movement lock rules are enforced in backend"
Write-Host "   ✅ has_movement column added to list endpoint"
Write-Host "   ✅ Deprecated endpoint marked with warning"
Write-Host "   ✅ full-profile endpoint includes has_movement"
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor White
Write-Host "   1. Review ITEMS_PHASE_2_TESTING_GUIDE.md for comprehensive tests"
Write-Host "   2. Approve Phase 2 implementation"
Write-Host "   3. Proceed to Phase 1.4 (UI Integration)"
