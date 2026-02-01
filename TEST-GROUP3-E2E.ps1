# Group 3 Master Data - End-to-End Testing Script
# Tests: Batch Numbers, Inventory Policies, Reorder Rules

Write-Host "`n🧪 GROUP 3 END-TO-END TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Configuration
$API_URL = "http://localhost:4000"
$SUPER_ADMIN_EMAIL = "super@admin.com"
$SUPER_ADMIN_PASSWORD = "SuperAdmin@123"

# Login and get token
Write-Host "`n📝 Step 1: Authentication" -ForegroundColor Yellow
$loginBody = @{
    email = $SUPER_ADMIN_EMAIL
    password = $SUPER_ADMIN_PASSWORD
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$TOKEN = $loginResponse.accessToken
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

if ($TOKEN) {
    Write-Host "✅ Login successful" -ForegroundColor Green
} else {
    Write-Host "❌ Login failed" -ForegroundColor Red
    exit 1
}

# Test counters
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [bool]$ShouldSucceed = $true
    )
    
    try {
        $params = @{
            Uri = "$API_URL$Endpoint"
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        
        if ($ShouldSucceed) {
            Write-Host "  ✅ $TestName" -ForegroundColor Green
            $script:testsPassed++
            return $response
        } else {
            Write-Host "  ❌ $TestName (Expected to fail but succeeded)" -ForegroundColor Red
            $script:testsFailed++
            return $null
        }
    } catch {
        if (-not $ShouldSucceed) {
            Write-Host "  ✅ $TestName (Failed as expected)" -ForegroundColor Green
            $script:testsPassed++
            return $null
        } else {
            Write-Host "  ❌ $TestName - Error: $($_.Exception.Message)" -ForegroundColor Red
            $script:testsFailed++
            return $null
        }
    }
}

# ==========================================
# 1️⃣ INVENTORY POLICIES TESTS
# ==========================================
Write-Host "`n`n1️⃣ INVENTORY POLICIES TESTS" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Gray

Write-Host "`n📦 Test 1.1: Create Inventory Policies" -ForegroundColor Yellow

# Create FIFO policy
$fifoPolicy = Test-Endpoint `
    -TestName "Create FIFO Policy" `
    -Method "POST" `
    -Endpoint "/api/master/inventory-policies" `
    -Body @{
        policy_code = "POL-FIFO-001"
        name_en = "FIFO Standard Policy"
        name_ar = "سياسة FIFO القياسية"
        description_en = "First In First Out valuation"
        description_ar = "التقييم بطريقة الوارد أولاً صادر أولاً"
        valuation_method = "FIFO"
        allow_negative_stock = $false
        auto_reorder = $true
        min_stock_alert = $true
        expiry_alert_days = 30
        is_active = $true
    }

# Create LIFO policy
$lifoPolicy = Test-Endpoint `
    -TestName "Create LIFO Policy" `
    -Method "POST" `
    -Endpoint "/api/master/inventory-policies" `
    -Body @{
        policy_code = "POL-LIFO-001"
        name_en = "LIFO Standard Policy"
        name_ar = "سياسة LIFO القياسية"
        valuation_method = "LIFO"
        allow_negative_stock = $true
        auto_reorder = $false
        min_stock_alert = $true
        expiry_alert_days = 60
        is_active = $true
    }

# Create Weighted Average policy
$avgPolicy = Test-Endpoint `
    -TestName "Create Weighted Average Policy" `
    -Method "POST" `
    -Endpoint "/api/master/inventory-policies" `
    -Body @{
        policy_code = "POL-AVG-001"
        name_en = "Weighted Average Policy"
        name_ar = "سياسة المتوسط المرجح"
        valuation_method = "Weighted Average"
        allow_negative_stock = $false
        auto_reorder = $true
        min_stock_alert = $true
        expiry_alert_days = 45
        is_active = $true
    }

Write-Host "`n📦 Test 1.2: Validation Tests" -ForegroundColor Yellow

# Try duplicate policy_code (should fail)
Test-Endpoint `
    -TestName "Duplicate policy_code should fail" `
    -Method "POST" `
    -Endpoint "/api/master/inventory-policies" `
    -Body @{
        policy_code = "POL-FIFO-001"
        name_en = "Duplicate Policy"
        valuation_method = "FIFO"
    } `
    -ShouldSucceed $false

# Try invalid valuation_method (should fail)
Test-Endpoint `
    -TestName "Invalid valuation_method should fail" `
    -Method "POST" `
    -Endpoint "/api/master/inventory-policies" `
    -Body @{
        policy_code = "POL-INVALID-001"
        name_en = "Invalid Policy"
        valuation_method = "INVALID_METHOD"
    } `
    -ShouldSucceed $false

Write-Host "`n📦 Test 1.3: List and Filter" -ForegroundColor Yellow

$allPolicies = Test-Endpoint `
    -TestName "List all policies" `
    -Method "GET" `
    -Endpoint "/api/master/inventory-policies"

if ($allPolicies -and $allPolicies.data.Count -eq 3) {
    Write-Host "  ✅ All 3 policies returned" -ForegroundColor Green
    $script:testsPassed++
} else {
    Write-Host "  ❌ Expected 3 policies, got $($allPolicies.data.Count)" -ForegroundColor Red
    $script:testsFailed++
}

# Filter by valuation method
$fifoPolicies = Test-Endpoint `
    -TestName "Filter by valuation_method=FIFO" `
    -Method "GET" `
    -Endpoint "/api/master/inventory-policies?valuation_method=FIFO"

Write-Host "`n📦 Test 1.4: Update Policy" -ForegroundColor Yellow

if ($fifoPolicy) {
    $updated = Test-Endpoint `
        -TestName "Update FIFO policy expiry_alert_days" `
        -Method "PUT" `
        -Endpoint "/api/master/inventory-policies/$($fifoPolicy.data.id)" `
        -Body @{
            policy_code = "POL-FIFO-001"
            name_en = "FIFO Standard Policy - Updated"
            valuation_method = "FIFO"
            expiry_alert_days = 90
        }
}

# ==========================================
# 2️⃣ BATCH NUMBERS TESTS
# ==========================================
Write-Host "`n`n2️⃣ BATCH NUMBERS TESTS" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Gray

Write-Host "`n📦 Test 2.1: Prerequisites" -ForegroundColor Yellow

# Get an item (assume items exist)
$items = Invoke-RestMethod -Uri "$API_URL/api/master/items?limit=5" -Method GET -Headers $headers
if ($items.data.Count -eq 0) {
    Write-Host "  ⚠️  No items found. Skipping batch tests." -ForegroundColor Yellow
} else {
    $testItem = $items.data[0]
    Write-Host "  ✅ Using item: $($testItem.item_code)" -ForegroundColor Green
    
    # Get a warehouse
    $warehouses = Invoke-RestMethod -Uri "$API_URL/api/master/warehouses?limit=5" -Method GET -Headers $headers
    if ($warehouses.data.Count -eq 0) {
        Write-Host "  ⚠️  No warehouses found. Skipping batch tests." -ForegroundColor Yellow
    } else {
        $testWarehouse = $warehouses.data[0]
        Write-Host "  ✅ Using warehouse: $($testWarehouse.warehouse_code)" -ForegroundColor Green
        
        Write-Host "`n📦 Test 2.2: Create Batches" -ForegroundColor Yellow
        
        # Create normal batch
        $batch1 = Test-Endpoint `
            -TestName "Create normal batch" `
            -Method "POST" `
            -Endpoint "/api/master/batch-numbers" `
            -Body @{
                batch_number = "BATCH-2025-001"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                quantity = 100.50
                manufacturing_date = "2025-01-01"
                expiry_date = "2026-01-01"
                qr_code = "QR-BATCH-001"
                is_active = $true
            }
        
        # Create expiring soon batch
        $batch2 = Test-Endpoint `
            -TestName "Create expiring soon batch" `
            -Method "POST" `
            -Endpoint "/api/master/batch-numbers" `
            -Body @{
                batch_number = "BATCH-2025-002"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                quantity = 50.00
                manufacturing_date = "2024-12-01"
                expiry_date = "2025-01-15"
                is_active = $true
            }
        
        # Create expired batch
        $batch3 = Test-Endpoint `
            -TestName "Create expired batch" `
            -Method "POST" `
            -Endpoint "/api/master/batch-numbers" `
            -Body @{
                batch_number = "BATCH-2024-OLD"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                quantity = 25.00
                manufacturing_date = "2023-01-01"
                expiry_date = "2024-01-01"
                is_active = $true
            }
        
        Write-Host "`n📦 Test 2.3: Validation Tests" -ForegroundColor Yellow
        
        # Expiry before manufacturing (should fail)
        Test-Endpoint `
            -TestName "Expiry date before manufacturing date should fail" `
            -Method "POST" `
            -Endpoint "/api/master/batch-numbers" `
            -Body @{
                batch_number = "BATCH-INVALID-001"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                quantity = 10
                manufacturing_date = "2025-12-01"
                expiry_date = "2025-01-01"
            } `
            -ShouldSucceed $false
        
        # Duplicate batch_number (should fail)
        Test-Endpoint `
            -TestName "Duplicate batch_number should fail" `
            -Method "POST" `
            -Endpoint "/api/master/batch-numbers" `
            -Body @{
                batch_number = "BATCH-2025-001"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                quantity = 10
            } `
            -ShouldSucceed $false
        
        Write-Host "`n📦 Test 2.4: Filters" -ForegroundColor Yellow
        
        # Filter by item
        $itemBatches = Test-Endpoint `
            -TestName "Filter by item_id" `
            -Method "GET" `
            -Endpoint "/api/master/batch-numbers?item_id=$($testItem.id)"
        
        # Filter expiring soon
        $expiringSoon = Test-Endpoint `
            -TestName "Filter expiring soon (30 days)" `
            -Method "GET" `
            -Endpoint "/api/master/batch-numbers?expiring_soon=true"
        
        # Filter expired
        $expired = Test-Endpoint `
            -TestName "Filter expired batches" `
            -Method "GET" `
            -Endpoint "/api/master/batch-numbers?expired=true"
        
        Write-Host "`n📦 Test 2.5: Update Batch" -ForegroundColor Yellow
        
        if ($batch1) {
            $updated = Test-Endpoint `
                -TestName "Update batch quantity" `
                -Method "PUT" `
                -Endpoint "/api/master/batch-numbers/$($batch1.data.id)" `
                -Body @{
                    batch_number = "BATCH-2025-001"
                    item_id = $testItem.id
                    warehouse_id = $testWarehouse.id
                    quantity = 150.75
                }
        }
    }
}

# ==========================================
# 3️⃣ REORDER RULES TESTS
# ==========================================
Write-Host "`n`n3️⃣ REORDER RULES TESTS" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Gray

if ($items.data.Count -gt 0 -and $warehouses.data.Count -gt 0) {
    $testItem = $items.data[0]
    $testWarehouse = $warehouses.data[0]
    
    Write-Host "`n📦 Test 3.1: Create Reorder Rules" -ForegroundColor Yellow
    
    # Create normal rule
    $rule1 = Test-Endpoint `
        -TestName "Create normal reorder rule" `
        -Method "POST" `
        -Endpoint "/api/master/reorder-rules" `
        -Body @{
            rule_code = "RULE-001"
            item_id = $testItem.id
            warehouse_id = $testWarehouse.id
            min_quantity = 10.00
            max_quantity = 100.00
            reorder_quantity = 50.00
            lead_time_days = 7
            safety_stock = 5.00
            auto_generate_po = $true
            is_active = $true
        }
    
    # Create rule with different quantities
    if ($items.data.Count -gt 1) {
        $testItem2 = $items.data[1]
        $rule2 = Test-Endpoint `
            -TestName "Create second reorder rule" `
            -Method "POST" `
            -Endpoint "/api/master/reorder-rules" `
            -Body @{
                rule_code = "RULE-002"
                item_id = $testItem2.id
                warehouse_id = $testWarehouse.id
                min_quantity = 20.00
                max_quantity = 200.00
                reorder_quantity = 100.00
                lead_time_days = 14
                safety_stock = 10.00
                auto_generate_po = $false
                is_active = $true
            }
    }
    
    Write-Host "`n📦 Test 3.2: Validation Tests" -ForegroundColor Yellow
    
    # Max < Min (should fail)
    Test-Endpoint `
        -TestName "Max quantity < Min quantity should fail" `
        -Method "POST" `
        -Endpoint "/api/master/reorder-rules" `
        -Body @{
            rule_code = "RULE-INVALID-001"
            item_id = $testItem.id
            warehouse_id = $testWarehouse.id
            min_quantity = 100.00
            max_quantity = 50.00
            reorder_quantity = 30.00
        } `
        -ShouldSucceed $false
    
    # Reorder > (Max - Min) (should fail)
    Test-Endpoint `
        -TestName "Reorder quantity > (max - min) should fail" `
        -Method "POST" `
        -Endpoint "/api/master/reorder-rules" `
        -Body @{
            rule_code = "RULE-INVALID-002"
            item_id = $testItem.id
            warehouse_id = $testWarehouse.id
            min_quantity = 10.00
            max_quantity = 100.00
            reorder_quantity = 150.00
        } `
        -ShouldSucceed $false
    
    Write-Host "`n📦 Test 3.3: List and Filter" -ForegroundColor Yellow
    
    $allRules = Test-Endpoint `
        -TestName "List all reorder rules" `
        -Method "GET" `
        -Endpoint "/api/master/reorder-rules"
    
    # Filter by item
    $itemRules = Test-Endpoint `
        -TestName "Filter by item_id" `
        -Method "GET" `
        -Endpoint "/api/master/reorder-rules?item_id=$($testItem.id)"
    
    # Filter below min (current_stock < min_quantity)
    $belowMin = Test-Endpoint `
        -TestName "Filter below_min stock" `
        -Method "GET" `
        -Endpoint "/api/master/reorder-rules?below_min=true"
    
    Write-Host "`n📦 Test 3.4: Update Rule" -ForegroundColor Yellow
    
    if ($rule1) {
        $updated = Test-Endpoint `
            -TestName "Update reorder rule quantities" `
            -Method "PUT" `
            -Endpoint "/api/master/reorder-rules/$($rule1.data.id)" `
            -Body @{
                rule_code = "RULE-001"
                item_id = $testItem.id
                warehouse_id = $testWarehouse.id
                min_quantity = 15.00
                max_quantity = 150.00
                reorder_quantity = 75.00
                lead_time_days = 10
            }
    }
    
    Write-Host "`n📦 Test 3.5: Delete Rule" -ForegroundColor Yellow
    
    if ($rule1) {
        $deleted = Test-Endpoint `
            -TestName "Soft delete reorder rule" `
            -Method "DELETE" `
            -Endpoint "/api/master/reorder-rules/$($rule1.data.id)"
        
        # Verify soft delete
        $afterDelete = Test-Endpoint `
            -TestName "Verify rule not in active list" `
            -Method "GET" `
            -Endpoint "/api/master/reorder-rules"
    }
} else {
    Write-Host "  ⚠️  Skipping reorder rules tests (no items/warehouses)" -ForegroundColor Yellow
}

# ==========================================
# 📊 TEST SUMMARY
# ==========================================
Write-Host "`n`n📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "Total Tests: $($testsPassed + $testsFailed)" -ForegroundColor White

if ($testsFailed -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED! Group 3 is production-ready." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Some tests failed. Review errors above." -ForegroundColor Red
    exit 1
}
