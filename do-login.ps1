Set-Location c:\projects\slms
$body = '{"email":"ali@darkhawlan.com","password":"Admin@123","tenant_code":"DARKHAWLAN"}'
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
    $token = $r.data.accessToken
    if (-not $token) { $token = $r.data.token }
    if ($token) {
        Set-Content -Path 'c:\projects\slms-token.txt' -Value $token -NoNewline
        Write-Host "Token saved OK (length=$($token.Length))"
    } else {
        Write-Host "No token in response"
        Write-Host ($r | ConvertTo-Json -Depth 3)
    }
} catch {
    Write-Host "Login failed: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
}
