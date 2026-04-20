$passwords = @('A11A22A33', 'Admin@123', 'admin123', 'Admin123!', 'password')
$emails = @('admin@darkhawlan.com', 'ali@darkhawlan.com', 'ali@alhajco.com', 'admin@alhajcompany.com')

# Try with tenant_id=7
foreach ($email in $emails) {
    foreach ($pw in $passwords) {
        try {
            $body = @{email=$email; password=$pw; tenant_id=7} | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
            if ($r.success) {
                Write-Host "SUCCESS: $email / $pw (tenant_id=7)"
                Write-Host "Token: $($r.data.accessToken.Substring(0,30))..."
                $r.data.accessToken | Out-File "c:\projects\slms-token.txt" -NoNewline
                exit 0
            }
        } catch {
            # silently skip
        }
    }
}

# Try without tenant
foreach ($email in $emails) {
    foreach ($pw in $passwords) {
        try {
            $body = @{email=$email; password=$pw} | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
            if ($r.success) {
                Write-Host "SUCCESS (no tenant): $email / $pw"
                Write-Host "Token: $($r.data.accessToken.Substring(0,30))..."
                $r.data.accessToken | Out-File "c:\projects\slms-token.txt" -NoNewline
                exit 0
            }
        } catch {
            $msg = ""
            try { $msg = ($_ | ConvertFrom-Json).message } catch {}
            if ($msg -match 'MFA') {
                Write-Host "MFA required for: $email / $pw"
            }
        }
    }
}

Write-Host "All login attempts failed"
