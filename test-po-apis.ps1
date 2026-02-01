# اختبار APIs للمشاريع وطرق الدفع
# Run this script to test if the APIs are working

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Purchase Order Fields - API Testing" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get auth token from localStorage (you'll need to replace this with actual token)
Write-Host "Note: You need to be logged in and copy your token from browser" -ForegroundColor Yellow
Write-Host "1. Open browser → F12 → Console" -ForegroundColor Yellow
Write-Host "2. Type: localStorage.getItem('accessToken')" -ForegroundColor Yellow
Write-Host "3. Copy the token and paste it when prompted`n" -ForegroundColor Yellow

$token = Read-Host "Enter your access token (or press Enter to skip)"

$headers = @{
    "Content-Type" = "application/json"
}

if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

Write-Host "`n1. Testing Payment Methods API..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/payment-methods?limit=10" -Headers $headers -Method GET
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Total: $($response.total)" -ForegroundColor White
    Write-Host "   Count: $($response.data.Count)" -ForegroundColor White
    
    if ($response.data.Count -eq 0) {
        Write-Host "   ⚠️  WARNING: No payment methods found!" -ForegroundColor Yellow
        Write-Host "   You need to add payment methods in Master Data → Payment Methods" -ForegroundColor Yellow
    } else {
        Write-Host "   Payment Methods:" -ForegroundColor White
        foreach ($pm in $response.data) {
            Write-Host "     - [$($pm.code)] $($pm.name) / $($pm.name_ar)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "❌ Failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "   → You need to provide a valid access token" -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "   → API endpoint not found - backend issue" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n2. Testing Projects API..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/projects?limit=10" -Headers $headers -Method GET
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Total: $($response.total)" -ForegroundColor White
    Write-Host "   Count: $($response.data.Count)" -ForegroundColor White
    
    if ($response.data.Count -eq 0) {
        Write-Host "   ⚠️  WARNING: No projects found!" -ForegroundColor Yellow
        Write-Host "   You need to add projects in Projects page" -ForegroundColor Yellow
    } else {
        Write-Host "   Projects:" -ForegroundColor White
        foreach ($proj in $response.data) {
            $status = if ($proj.status) { $proj.status } else { "N/A" }
            Write-Host "     - [$($proj.code)] $($proj.name) ($status)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "❌ Failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "   → You need to provide a valid access token" -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "   → API endpoint not found - backend issue" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n3. Testing Backend Health..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method GET
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor White
} catch {
    Write-Host "❌ Backend is not responding!" -ForegroundColor Red
    Write-Host "   Make sure docker containers are running:" -ForegroundColor Yellow
    Write-Host "   docker compose ps" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nIf both APIs returned 0 items:" -ForegroundColor Yellow
Write-Host "→ You need to add data to the system first" -ForegroundColor Yellow
Write-Host "→ The fields WILL appear but dropdowns will be empty" -ForegroundColor Yellow

Write-Host "`nIf APIs returned 401 (Unauthorized):" -ForegroundColor Yellow
Write-Host "→ Run this script again with a valid token" -ForegroundColor Yellow
Write-Host "→ Or test directly in browser (you're already logged in)" -ForegroundColor Yellow

Write-Host "`nIf APIs returned 404 (Not Found):" -ForegroundColor Yellow
Write-Host "→ Backend routes not registered - contact developer" -ForegroundColor Yellow

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Open browser → http://localhost:3001" -ForegroundColor White
Write-Host "2. Login to the system" -ForegroundColor White
Write-Host "3. Go to Purchase Orders" -ForegroundColor White
Write-Host "4. Click 'Add New Purchase Order'" -ForegroundColor White
Write-Host "5. Open F12 → Console tab" -ForegroundColor White
Write-Host "6. Look for messages:" -ForegroundColor White
Write-Host "   - 'Payment Methods loaded: X items'" -ForegroundColor Cyan
Write-Host "   - 'Projects loaded: X items'" -ForegroundColor Cyan
Write-Host "7. Check if fields appear in Row 3 of the form`n" -ForegroundColor White

Read-Host "Press Enter to exit"
