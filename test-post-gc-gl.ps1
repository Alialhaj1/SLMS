# Login as admin@darkhawlan.com first
$loginBody = @{
    email = "admin@darkhawlan.com"
    password = "A11A22A33"
    tenant_code = "DARKHAWLAN"
} | ConvertTo-Json

try {
    $loginResp = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    $token = $loginResp.data.accessToken
    if (!$token) { $token = $loginResp.accessToken }
    if (!$token) { $token = $loginResp.token }
    if (!$token) { $token = $loginResp.data.token }
    Write-Host "Login OK, token length=$($token.Length)"
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Test POST group-categories
Write-Host "`n=== POST /api/master/group-categories ==="
$gcBody = '{"code":"TEST-GC-999","name_en":"Test GC","name_ar":"تصنيف تجريبي","sort_order":999}'
try {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories" -Headers $h -Method POST -Body $gcBody -TimeoutSec 10
    Write-Host "OK: id=$($r.data.id)"
    # Cleanup
    Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-categories/$($r.data.id)" -Headers $h -Method DELETE -TimeoutSec 10 | Out-Null
    Write-Host "Cleaned up"
} catch {
    $resp = $_.Exception.Response
    $code = $resp.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "ERR $code : $body"
}

# Test POST group-levels
Write-Host "`n=== POST /api/master/group-levels ==="
$glBody = '{"code":"TEST-GL-999","name_en":"Test GL","name_ar":"مستوى تجريبي"}'
try {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels" -Headers $h -Method POST -Body $glBody -TimeoutSec 10
    Write-Host "OK: id=$($r.data.id)"
    # Cleanup
    Invoke-RestMethod -Uri "http://localhost:4000/api/master/group-levels/$($r.data.id)" -Headers $h -Method DELETE -TimeoutSec 10 | Out-Null
    Write-Host "Cleaned up"
} catch {
    $resp = $_.Exception.Response
    $code = $resp.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "ERR $code : $body"
}
