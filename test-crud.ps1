Set-Location c:\projects\slms

# Login
$loginBody = @{ email = "ali@darkhawlan.com"; password = "Admin@123"; tenant_id = 7 } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginRes.data.accessToken
Write-Host "Token: OK"

$headers = @{ Authorization = "Bearer $token"; "X-Company-Id" = "7" }

# Test GET
foreach ($ep in @("group-levels", "group-categories")) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/$ep" -Headers $headers
        Write-Host "GET $ep : $($r.data.data.Count) items"
    } catch {
        Write-Host "GET $ep : ERROR - $($_.Exception.Message)"
    }
}

# Test POST group-levels
try {
    $body = @{ code = "TEST-GL"; name_en = "Test Level"; name_ar = "مستوى تجريبي"; is_active = $true } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $newId = $r.data.id
    Write-Host "POST group-levels: OK (id=$newId)"
    
    # Test PUT
    $updateBody = @{ name_en = "Test Level Updated" } | ConvertTo-Json
    $r2 = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels/$newId" -Method PUT -ContentType "application/json" -Headers $headers -Body $updateBody
    Write-Host "PUT group-levels/$newId : OK (name=$($r2.data.name_en))"
    
    # Test DELETE
    $r3 = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels/$newId" -Method DELETE -Headers $headers
    Write-Host "DELETE group-levels/$newId : OK"
} catch {
    Write-Host "CRUD group-levels: ERROR - $($_.Exception.Message)"
}

# Test POST group-categories
try {
    $body = @{ code = "TEST-GC"; name_en = "Test Category"; name_ar = "تصنيف تجريبي"; sort_order = 99; is_active = $true } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $newId = $r.data.id
    Write-Host "POST group-categories: OK (id=$newId)"
    
    # Test PUT
    $updateBody = @{ name_en = "Test Category Updated" } | ConvertTo-Json
    $r2 = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories/$newId" -Method PUT -ContentType "application/json" -Headers $headers -Body $updateBody
    Write-Host "PUT group-categories/$newId : OK (name=$($r2.data.name_en))"
    
    # Test DELETE
    $r3 = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories/$newId" -Method DELETE -Headers $headers
    Write-Host "DELETE group-categories/$newId : OK"
} catch {
    Write-Host "CRUD group-categories: ERROR - $($_.Exception.Message)"
}

Write-Host "--- DONE ---"
