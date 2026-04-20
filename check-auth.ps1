$ErrorActionPreference = 'SilentlyContinue'

# Get auth token
$loginBody = '{"email":"admin@darkhawlan.com","password":"admin123"}'
try {
    $loginResp = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginJson = $loginResp.Content | ConvertFrom-Json
    $token = $null
    if ($loginJson.data.token) { $token = $loginJson.data.token }
    elseif ($loginJson.token) { $token = $loginJson.token }
    elseif ($loginJson.data.accessToken) { $token = $loginJson.data.accessToken }
    Write-Host "Login status: $($loginResp.StatusCode)"
    Write-Host "Token found: $($null -ne $token)"
    if ($token) { Write-Host "Token prefix: $($token.Substring(0,30))..." }
    # Show full response structure
    Write-Host "Response keys: $($loginJson.PSObject.Properties.Name -join ', ')"
    if ($loginJson.data) {
        Write-Host "Data keys: $($loginJson.data.PSObject.Properties.Name -join ', ')"
    }
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

if (-not $token) {
    Write-Host "Full login response:"
    Write-Host ($loginResp.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3)
    exit 1
}

$headers = @{ "Authorization" = "Bearer $token" }

# Test one endpoint to verify auth works
try {
    $testResp = Invoke-WebRequest -Uri "http://localhost:4000/api/master/address-types" -Headers $headers -Method Get -UseBasicParsing -TimeoutSec 5
    Write-Host "Test endpoint status: $($testResp.StatusCode)"
    $testJson = $testResp.Content | ConvertFrom-Json
    Write-Host "Test result: total=$($testJson.data.total) count=$($testJson.data.data.Count)"
} catch {
    Write-Host "Test failed: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Body: $($_.ErrorDetails.Message)"
}
