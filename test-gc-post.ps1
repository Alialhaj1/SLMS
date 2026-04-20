Set-Location c:\projects\slms

# Login
$loginBody = @{ email = "ali@darkhawlan.com"; password = "Admin@123"; tenant_id = 7 } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginRes.data.accessToken

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# POST group-categories - catch full error response
try {
    $body = '{"code":"TEST-GC","name_en":"Test Category","name_ar":"test ar","sort_order":99,"is_active":true}'
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/master/group-categories" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "OK: $($response.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Status: $statusCode"
    Write-Host "Body: $responseBody"
}
