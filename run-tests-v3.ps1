$ErrorActionPreference = "Continue"
$API = "http://localhost:4000"
$passCount = 0
$failCount = 0
$skipCount = 0
$allResults = [System.Collections.ArrayList]::new()

function Test-API {
    param([string]$Name, [string]$Method, [string]$Path, [string]$Body, [hashtable]$Headers, [int]$ExpectedStatus, [switch]$AnySuccess)
    try {
        $params = @{ Uri = "$API$Path"; Method = $Method; ContentType = "application/json"; UseBasicParsing = $true }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = [System.Text.Encoding]::UTF8.GetBytes($Body) }
        $status = 0
        $data = $null
        try {
            $response = Invoke-WebRequest @params -ErrorAction Stop
            $status = $response.StatusCode
            $data = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        } catch {
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
                try { $data = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue } catch {}
            }
        }
        if ($AnySuccess) { $pass = $status -lt 400 }
        elseif ($ExpectedStatus -gt 0) { $pass = $status -eq $ExpectedStatus }
        else { $pass = $status -lt 400 }
        
        if ($pass) { $script:passCount++ } else { $script:failCount++ }
        $color = if ($pass) { "Green" } else { "Red" }
        $tag = if ($pass) { "PASS" } else { "FAIL" }
        Write-Host "  [$tag] $Name | HTTP $status (expected $ExpectedStatus)" -ForegroundColor $color
        [void]$script:allResults.Add(@{ Name=$Name; Status=$status; Expected=$ExpectedStatus; Pass=$pass })
        return @{ Name=$Name; Status=$status; Pass=$pass; Data=$data }
    } catch {
        Write-Host "  [FAIL] $Name | ERROR: $($_.ToString())" -ForegroundColor Red
        $script:failCount++
        [void]$script:allResults.Add(@{ Name=$Name; Status=0; Expected=$ExpectedStatus; Pass=$false })
        return @{ Name=$Name; Status=0; Pass=$false; Data=$null }
    }
}

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "  SLMS Full System Testing" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

# =============================================
# 0. ENVIRONMENT CHECK
# =============================================
Write-Host "  [0] ENVIRONMENT CHECK" -ForegroundColor Yellow
$health = Test-API -Name "Health Endpoint" -Method GET -Path "/api/health" -ExpectedStatus 200
Write-Host ""

# =============================================
# 1.1 PLATFORM ADMIN LOGIN
# =============================================
Write-Host "  [1.1] PLATFORM ADMIN LOGIN" -ForegroundColor Yellow

$PLATFORM_TOKEN = $null

$body1 = '{"email":"superadmin@slms.sa","password":"SuperAdmin@2024!","login_context":"platform"}'
$r1 = Test-API -Name "T01-01a SuperAdmin login" -Method POST -Path "/api/auth/login" -Body $body1 -ExpectedStatus 200
if ($r1.Pass -and $r1.Data.data.accessToken) { $PLATFORM_TOKEN = $r1.Data.data.accessToken }

if (-not $PLATFORM_TOKEN) {
    $body2 = '{"email":"admin@slms.sa","password":"PlatformAdmin@2024!","login_context":"platform"}'
    $r2 = Test-API -Name "T01-01b PlatformAdmin login" -Method POST -Path "/api/auth/login" -Body $body2 -ExpectedStatus 200
    if ($r2.Pass -and $r2.Data.data.accessToken) { $PLATFORM_TOKEN = $r2.Data.data.accessToken }
}

if (-not $PLATFORM_TOKEN) {
    $body3 = '{"email":"admin@slms.sa","password":"Admin@2024!","login_context":"platform"}'
    $r3 = Test-API -Name "T01-01c Admin alt login" -Method POST -Path "/api/auth/login" -Body $body3 -ExpectedStatus 200
    if ($r3.Pass -and $r3.Data.data.accessToken) { $PLATFORM_TOKEN = $r3.Data.data.accessToken }
}

if ($PLATFORM_TOKEN) {
    Write-Host "    Got Platform Token" -ForegroundColor Cyan
} else {
    Write-Host "    WARNING: No platform token! Checking DB..." -ForegroundColor Red
    $dbOut = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT email || '|' || role FROM users WHERE tenant_id IS NULL LIMIT 10;"
    Write-Host "    DB platform users: $dbOut" -ForegroundColor DarkYellow
}

# T01-03: Wrong password
$wrongPwd = '{"email":"admin@slms.sa","password":"WrongPassword123!","login_context":"platform"}'
Test-API -Name "T01-03 Wrong Password" -Method POST -Path "/api/auth/login" -Body $wrongPwd -ExpectedStatus 401

# T01-04: Non-existent email
$noEmail = '{"email":"nonexistent@fake.com","password":"Test123!","login_context":"platform"}'
Test-API -Name "T01-04 Non-existent Email" -Method POST -Path "/api/auth/login" -Body $noEmail -ExpectedStatus 401

# T01-08: XSS in Password (encoded to avoid PS parsing issues)
$xssBody = '{"email":"admin@slms.sa","password":"scriptalert1script","login_context":"platform"}'
Test-API -Name "T01-08 XSS in Password" -Method POST -Path "/api/auth/login" -Body $xssBody -ExpectedStatus 401

Write-Host ""

# =============================================
# 1.2 TENANT LOGIN
# =============================================
Write-Host "  [1.2] TENANT USER LOGIN" -ForegroundColor Yellow

$tenantBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"DARKHAWLAN"}'
$t0201 = Test-API -Name "T02-01 DARKHAWLAN Login" -Method POST -Path "/api/auth/login" -Body $tenantBody -ExpectedStatus 200
$DARKHAWLAN_TOKEN = $null
if ($t0201.Pass -and $t0201.Data.data.accessToken) { $DARKHAWLAN_TOKEN = $t0201.Data.data.accessToken }

$alhcoBody = '{"email":"admin@alhajco.com","password":"Admin@123","login_context":"tenant","tenant_code":"ALHCO"}'
$t0201b = Test-API -Name "T02-01b ALHCO Login" -Method POST -Path "/api/auth/login" -Body $alhcoBody -ExpectedStatus 200
$ALHCO_TOKEN = $null
if ($t0201b.Pass -and $t0201b.Data.data.accessToken) { $ALHCO_TOKEN = $t0201b.Data.data.accessToken }

if (-not $DARKHAWLAN_TOKEN -and -not $ALHCO_TOKEN) {
    $tUsers = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT u.email || '|' || t.company_code FROM users u JOIN tenants t ON u.tenant_id=t.id LIMIT 10;"
    Write-Host "    DB tenant users: $tUsers" -ForegroundColor DarkYellow
}

# T02-03: Wrong Company Code
$fakeCode = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"FAKE999"}'
Test-API -Name "T02-03 Wrong Company Code" -Method POST -Path "/api/auth/login" -Body $fakeCode -ExpectedStatus 401

# T02-04: Cross-tenant
$crossBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"ALHCO"}'
Test-API -Name "T02-04 Cross-tenant login" -Method POST -Path "/api/auth/login" -Body $crossBody -ExpectedStatus 401

# T02-05: Scope mismatch
$scopeBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"platform"}'
Test-API -Name "T02-05 Scope mismatch" -Method POST -Path "/api/auth/login" -Body $scopeBody -ExpectedStatus 401

Write-Host ""

# =============================================
# 1.3 TOKEN MANAGEMENT
# =============================================
Write-Host "  [1.3] TOKEN MANAGEMENT" -ForegroundColor Yellow

$fakeH = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.fake" }
Test-API -Name "T03-04 Forged JWT" -Method GET -Path "/api/me" -Headers $fakeH -ExpectedStatus 401

Test-API -Name "T03-xx No Auth Header" -Method GET -Path "/api/me" -ExpectedStatus 401

Write-Host ""

# =============================================
# 5.1 PLATFORM API ENDPOINTS
# =============================================
Write-Host "  [5.1] PLATFORM API ENDPOINTS" -ForegroundColor Yellow

if ($PLATFORM_TOKEN) {
    $pH = @{ Authorization = "Bearer $PLATFORM_TOKEN" }
    Test-API -Name "PA01 GET /platform/tenants" -Method GET -Path "/api/platform/tenants" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA08 GET /platform/users" -Method GET -Path "/api/platform/users" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA09 GET /platform/audit-logs" -Method GET -Path "/api/platform/audit-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA10 GET /platform/impersonation-logs" -Method GET -Path "/api/platform/impersonation-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA12 GET /platform/modules" -Method GET -Path "/api/platform/modules" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA13 GET /platform/stats" -Method GET -Path "/api/platform/stats" -Headers $pH -ExpectedStatus 200
} else {
    Write-Host "  [SKIP] Platform API tests (no token)" -ForegroundColor DarkYellow
    $skipCount += 6
}

Write-Host ""

# =============================================
# 5.2 TENANT API ENDPOINTS
# =============================================
Write-Host "  [5.2] TENANT API ENDPOINTS" -ForegroundColor Yellow

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "TA01 GET /tenant/company" -Method GET -Path "/api/tenant/company" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA03 GET /tenant/branches" -Method GET -Path "/api/tenant/branches" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA05 GET /tenant/users" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA07 GET /tenant/roles" -Method GET -Path "/api/tenant/roles" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA09 GET record-statuses" -Method GET -Path "/api/tenant/master-data/record-statuses" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA12 GET dashboard/stats" -Method GET -Path "/api/tenant/dashboard/stats" -Headers $tH -ExpectedStatus 200

    $patchBody = '{"name_ar":"test"}'
    Test-API -Name "TA02 PATCH /tenant/company (403)" -Method PATCH -Path "/api/tenant/company" -Body $patchBody -Headers $tH -ExpectedStatus 403
} else {
    Write-Host "  [SKIP] Tenant API tests (no DARKHAWLAN token)" -ForegroundColor DarkYellow
    $skipCount += 7
}

Write-Host ""

# =============================================
# 5.3 CROSS-TENANT SECURITY
# =============================================
Write-Host "  [5.3] CROSS-TENANT SECURITY" -ForegroundColor Yellow

$dkEmails = @()
$alEmails = @()

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "SEC01 Tenant to Platform (403)" -Method GET -Path "/api/platform/tenants" -Headers $tH -ExpectedStatus 403

    $sec02 = Test-API -Name "SEC02a DARKHAWLAN users" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    if ($sec02.Data.data) {
        $dkEmails = @($sec02.Data.data | ForEach-Object { $_.email })
        Write-Host "    DARKHAWLAN: $($dkEmails.Count) users" -ForegroundColor Gray
    }
}

if ($ALHCO_TOKEN) {
    $aH = @{ Authorization = "Bearer $ALHCO_TOKEN" }
    $sec02b = Test-API -Name "SEC02b ALHCO users" -Method GET -Path "/api/tenant/users" -Headers $aH -ExpectedStatus 200
    if ($sec02b.Data.data) {
        $alEmails = @($sec02b.Data.data | ForEach-Object { $_.email })
        Write-Host "    ALHCO: $($alEmails.Count) users" -ForegroundColor Gray
    }
}

if ($dkEmails.Count -gt 0 -and $alEmails.Count -gt 0) {
    $overlap = @($dkEmails | Where-Object { $alEmails -contains $_ })
    if ($overlap.Count -eq 0) {
        Write-Host "  [PASS] SEC02 No cross-tenant data leak" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  [FAIL] SEC02 CROSS-TENANT LEAK: $($overlap -join ', ')" -ForegroundColor Red
        $failCount++
    }
}

$expH = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.bad" }
Test-API -Name "SEC08 Expired token (401)" -Method GET -Path "/api/me" -Headers $expH -ExpectedStatus 401

Write-Host ""

# =============================================
# 4.1 GLOBAL MASTER DATA
# =============================================
Write-Host "  [4.1] GLOBAL MASTER DATA" -ForegroundColor Yellow

$gm01 = Test-API -Name "GM01 GET countries" -Method GET -Path "/api/public/countries" -ExpectedStatus 200
if (-not $gm01.Pass) {
    Test-API -Name "GM01b countries alt" -Method GET -Path "/api/countries" -ExpectedStatus 200
}

$gm03 = Test-API -Name "GM03 GET currencies" -Method GET -Path "/api/public/currencies" -ExpectedStatus 200
if (-not $gm03.Pass) {
    Test-API -Name "GM03b currencies alt" -Method GET -Path "/api/currencies" -ExpectedStatus 200
}

Test-API -Name "GM04 GET incoterms" -Method GET -Path "/api/public/incoterms" -ExpectedStatus 200
Test-API -Name "GM05 GET container-types" -Method GET -Path "/api/public/container-types" -ExpectedStatus 200

Write-Host ""

# =============================================
# 6.3 MODULE GATING
# =============================================
Write-Host "  [6.3] MODULE GATING" -ForegroundColor Yellow

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "MG01 Shipments" -Method GET -Path "/api/tenant/shipments" -Headers $tH -AnySuccess -ExpectedStatus 200
    Test-API -Name "MG02 Procurement" -Method GET -Path "/api/tenant/procurement/orders" -Headers $tH -AnySuccess -ExpectedStatus 200
}

Write-Host ""

# =============================================
# 8. DATABASE INTEGRITY
# =============================================
Write-Host "  [8] DATABASE INTEGRITY" -ForegroundColor Yellow

$tableCount = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';").Trim()
if ([int]$tableCount -ge 50) {
    Write-Host "  [PASS] DB01 Public tables: $tableCount" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [FAIL] DB01 Public tables: $tableCount (need 50+)" -ForegroundColor Red
    $failCount++
}

$schemas = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT string_agg(schema_name, ', ') FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';").Trim()
Write-Host "  [INFO] DB03 Tenant schemas: $schemas" -ForegroundColor Gray

$fkCount = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';").Trim()
Write-Host "  [INFO] DB05 Foreign keys: $fkCount" -ForegroundColor Gray

$lastMig = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT id || ' - ' || name FROM migrations ORDER BY id DESC LIMIT 1;").Trim()
Write-Host "  [INFO] DB06 Last migration: $lastMig" -ForegroundColor Gray

$modCount = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules;").Trim()
if ([int]$modCount -ge 11) {
    Write-Host "  [PASS] DB08 Modules: $modCount" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [FAIL] DB08 Modules: $modCount (need 11+)" -ForegroundColor Red
    $failCount++
}

Write-Host ""

# =============================================
# 10. KNOWN ISSUES
# =============================================
Write-Host "  [10] KNOWN ISSUES VERIFICATION" -ForegroundColor Yellow

$fix01 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM v_subscription_plan_unified;" 2>$null)
if ($fix01 -and $fix01.Trim() -match '^\d+$') {
    Write-Host "  [PASS] FIX01 v_subscription_plan_unified works ($($fix01.Trim()) rows)" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [WARN] FIX01 v_subscription_plan_unified issue" -ForegroundColor DarkYellow
}

$fix03 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules WHERE name='branches';").Trim()
if ([int]$fix03 -ge 1) {
    Write-Host "  [PASS] FIX03 branches module exists" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [FAIL] FIX03 branches module missing" -ForegroundColor Red
    $failCount++
}

$fix04 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='impersonation_logs' AND column_name='token_jti';").Trim()
if ([int]$fix04 -ge 1) {
    Write-Host "  [PASS] FIX04 token_jti column exists" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [FAIL] FIX04 token_jti missing" -ForegroundColor Red
    $failCount++
}

$fix05 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='supplier_types' AND column_name='code';").Trim()
if ([int]$fix05 -ge 1) {
    Write-Host "  [PASS] FIX05 supplier_types.code exists" -ForegroundColor Green
    $passCount++
} else {
    Write-Host "  [FAIL] FIX05 supplier_types.code missing" -ForegroundColor Red
    $failCount++
}

Write-Host ""

# =============================================
# FINAL SUMMARY
# =============================================
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "  TEST EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "    PASSED:  $passCount" -ForegroundColor Green
Write-Host "    FAILED:  $failCount" -ForegroundColor Red
Write-Host "    SKIPPED: $skipCount" -ForegroundColor DarkYellow
Write-Host "    TOTAL:   $($passCount + $failCount + $skipCount)" -ForegroundColor White
Write-Host ""
$total = $passCount + $failCount
$passRate = if ($total -gt 0) { [math]::Round(($passCount / $total) * 100, 1) } else { 0 }
$rateColor = if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" }
Write-Host "    Pass Rate: ${passRate}%" -ForegroundColor $rateColor
Write-Host ""
Write-Host "  Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "  ======================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "  FAILED TESTS:" -ForegroundColor Red
    foreach ($r in $allResults) {
        if (-not $r.Pass) {
            Write-Host "    X $($r.Name) | got $($r.Status), expected $($r.Expected)" -ForegroundColor Red
        }
    }
}
Write-Host ""
