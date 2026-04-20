$ErrorActionPreference = "Continue"
$API = "http://localhost:4000"
$passCount = 0
$failCount = 0
$skipCount = 0
$allResults = @()

function Test-API {
    param([string]$Name, [string]$Method, [string]$Path, [string]$Body, [hashtable]$Headers, [int]$ExpectedStatus, [switch]$AnySuccess)
    try {
        $params = @{ Uri = "$API$Path"; Method = $Method; ContentType = "application/json"; UseBasicParsing = $true }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = [System.Text.Encoding]::UTF8.GetBytes($Body) }
        $response = $null
        $status = 0
        $data = $null
        try {
            $response = Invoke-WebRequest @params -ErrorAction Stop
            $status = $response.StatusCode
            $data = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        } catch {
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
                try { $data = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue } catch { $data = $null }
            } else {
                $status = 0
            }
        }
        if ($AnySuccess) { $pass = $status -lt 400 }
        elseif ($ExpectedStatus -gt 0) { $pass = $status -eq $ExpectedStatus }
        else { $pass = $status -lt 400 }
        
        $emoji = if ($pass) { "PASS" } else { "FAIL" }
        $color = if ($pass) { "Green" } else { "Red" }
        if ($pass) { $script:passCount++ } else { $script:failCount++ }
        Write-Host "  [$emoji] $Name | HTTP $status (expected $ExpectedStatus)" -ForegroundColor $color
        $script:allResults += @{ Name=$Name; Status=$status; Expected=$ExpectedStatus; Pass=$pass }
        return @{ Name=$Name; Status=$status; Pass=$pass; Data=$data }
    } catch {
        Write-Host "  [FAIL] $Name | ERROR: $_" -ForegroundColor Red
        $script:failCount++
        $script:allResults += @{ Name=$Name; Status=0; Expected=$ExpectedStatus; Pass=$false }
        return @{ Name=$Name; Status=0; Pass=$false; Data=$null }
    }
}

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "  SLMS — Full System Testing & Verification" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

# =============================================
# 0. ENVIRONMENT CHECK
# =============================================
Write-Host "  [0] ENVIRONMENT CHECK" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray
$health = Test-API -Name "Health Endpoint" -Method GET -Path "/api/health" -ExpectedStatus 200
Write-Host ""

# =============================================
# 1. AUTHENTICATION — Platform Admin
# =============================================
Write-Host "  [1.1] PLATFORM ADMIN LOGIN" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# Try all platform accounts
$PLATFORM_TOKEN = $null
$platformAccounts = @(
    @{ email="superadmin@slms.sa"; password="SuperAdmin@2024!"; label="SuperAdmin" },
    @{ email="admin@slms.sa"; password="PlatformAdmin@2024!"; label="PlatformAdmin" },
    @{ email="admin@slms.sa"; password="Admin@2024!"; label="PlatformAdmin alt" },
    @{ email="superadmin@slms.sa"; password="Admin@2024!"; label="SuperAdmin alt" }
)

foreach ($acct in $platformAccounts) {
    $body = "{`"email`":`"$($acct.email)`",`"password`":`"$($acct.password)`",`"login_context`":`"platform`"}"
    $r = Test-API -Name "T01-01 $($acct.label) login ($($acct.email))" -Method POST -Path "/api/auth/login" -Body $body -ExpectedStatus 200
    if ($r.Pass -and $r.Data.data.accessToken) {
        $PLATFORM_TOKEN = $r.Data.data.accessToken
        Write-Host "    >> Got Platform Token from $($acct.email)" -ForegroundColor Cyan
        break
    }
}

if (-not $PLATFORM_TOKEN) {
    Write-Host "    >> WARNING: Could not obtain platform token — checking DB for users..." -ForegroundColor Red
    # Query DB
    $dbUsers = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT email, role FROM users WHERE tenant_id IS NULL OR role IN ('super_admin','platform_admin') LIMIT 10;" 2>&1
    Write-Host "    >> DB Platform Users: $dbUsers" -ForegroundColor DarkYellow
}

# T01-03: Wrong password
$wrongPwd = '{"email":"admin@slms.sa","password":"WrongPassword123!","login_context":"platform"}'
Test-API -Name "T01-03 Wrong Password -> 401" -Method POST -Path "/api/auth/login" -Body $wrongPwd -ExpectedStatus 401

# T01-04: Non-existent email
$noEmail = '{"email":"nonexistent@fake.com","password":"Test@123","login_context":"platform"}'
Test-API -Name "T01-04 Non-existent Email -> 401" -Method POST -Path "/api/auth/login" -Body $noEmail -ExpectedStatus 401

# T01-07: SQL Injection in email
$sqliBody = '{"email":"admin@slms.sa'\'' OR '\''1'\''='\''1","password":"test","login_context":"platform"}'
Test-API -Name "T01-07 SQL Injection attempt" -Method POST -Path "/api/auth/login" -Body $sqliBody -ExpectedStatus 400

# T01-08: XSS in Password
$xssBody = '{"email":"admin@slms.sa","password":"<script>alert(1)</script>","login_context":"platform"}'
Test-API -Name "T01-08 XSS in Password -> 401" -Method POST -Path "/api/auth/login" -Body $xssBody -ExpectedStatus 401

Write-Host ""

# =============================================
# 1.2 TENANT LOGIN
# =============================================
Write-Host "  [1.2] TENANT USER LOGIN" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# T02-01: DARKHAWLAN login
$tenantBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"DARKHAWLAN"}'
$t0201 = Test-API -Name "T02-01 DARKHAWLAN Tenant Login" -Method POST -Path "/api/auth/login" -Body $tenantBody -ExpectedStatus 200
$DARKHAWLAN_TOKEN = if ($t0201.Pass -and $t0201.Data.data.accessToken) { $t0201.Data.data.accessToken } else { $null }

# T02-01b: ALHCO login
$alhcoBody = '{"email":"admin@alhajco.com","password":"Admin@123","login_context":"tenant","tenant_code":"ALHCO"}'
$t0201b = Test-API -Name "T02-01b ALHCO Tenant Login" -Method POST -Path "/api/auth/login" -Body $alhcoBody -ExpectedStatus 200
$ALHCO_TOKEN = if ($t0201b.Pass -and $t0201b.Data.data.accessToken) { $t0201b.Data.data.accessToken } else { $null }

if (-not $DARKHAWLAN_TOKEN -and -not $ALHCO_TOKEN) {
    # Check DB for tenant users
    $tenantUsers = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT u.email, t.company_code FROM users u JOIN tenants t ON u.tenant_id=t.id LIMIT 10;" 2>&1
    Write-Host "    >> DB Tenant Users: $tenantUsers" -ForegroundColor DarkYellow
}

# T02-03: Wrong Company Code
$fakeCode = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"FAKE999"}'
Test-API -Name "T02-03 Wrong Company Code -> 401" -Method POST -Path "/api/auth/login" -Body $fakeCode -ExpectedStatus 401

# T02-04: Cross-tenant email
$crossBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"ALHCO"}'
Test-API -Name "T02-04 Cross-tenant login -> 401" -Method POST -Path "/api/auth/login" -Body $crossBody -ExpectedStatus 401

# T02-05: Scope mismatch
$scopeBody = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"platform"}'
Test-API -Name "T02-05 Scope mismatch -> 401" -Method POST -Path "/api/auth/login" -Body $scopeBody -ExpectedStatus 401

Write-Host ""

# =============================================
# 1.3 TOKEN MANAGEMENT
# =============================================
Write-Host "  [1.3] TOKEN MANAGEMENT" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# T03-04: Forged JWT
$fakeH = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.fake" }
Test-API -Name "T03-04 Forged JWT -> 401" -Method GET -Path "/api/me" -Headers $fakeH -ExpectedStatus 401

# No auth header
Test-API -Name "T03-xx No Auth Header -> 401" -Method GET -Path "/api/me" -ExpectedStatus 401

Write-Host ""

# =============================================
# 5.1 PLATFORM API ENDPOINTS
# =============================================
Write-Host "  [5.1] PLATFORM API ENDPOINTS" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

if ($PLATFORM_TOKEN) {
    $pH = @{ Authorization = "Bearer $PLATFORM_TOKEN" }
    Test-API -Name "PA01 GET /platform/tenants" -Method GET -Path "/api/platform/tenants" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA08 GET /platform/users" -Method GET -Path "/api/platform/users" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA09 GET /platform/audit-logs" -Method GET -Path "/api/platform/audit-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA10 GET /platform/impersonation-logs" -Method GET -Path "/api/platform/impersonation-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA12 GET /platform/modules" -Method GET -Path "/api/platform/modules" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA13 GET /platform/stats" -Method GET -Path "/api/platform/stats" -Headers $pH -ExpectedStatus 200
} else {
    Write-Host "  [SKIP] Platform API tests — no platform token" -ForegroundColor DarkYellow
    $skipCount += 6
}

Write-Host ""

# =============================================
# 5.2 TENANT API ENDPOINTS
# =============================================
Write-Host "  [5.2] TENANT API ENDPOINTS" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "TA01 GET /tenant/company" -Method GET -Path "/api/tenant/company" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA03 GET /tenant/branches" -Method GET -Path "/api/tenant/branches" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA05 GET /tenant/users" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA07 GET /tenant/roles" -Method GET -Path "/api/tenant/roles" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA09 GET /tenant/master-data/record-statuses" -Method GET -Path "/api/tenant/master-data/record-statuses" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA12 GET /tenant/dashboard/stats" -Method GET -Path "/api/tenant/dashboard/stats" -Headers $tH -ExpectedStatus 200
    
    # CP03/TA02: Cannot modify company from tenant
    $patchBody = '{"name_ar":"test"}'
    Test-API -Name "TA02/CP03 PATCH /tenant/company -> 403" -Method PATCH -Path "/api/tenant/company" -Body $patchBody -Headers $tH -ExpectedStatus 403
} else {
    Write-Host "  [SKIP] Tenant API tests — no DARKHAWLAN token" -ForegroundColor DarkYellow
    $skipCount += 7
}

Write-Host ""

# =============================================
# 5.3 CROSS-TENANT SECURITY
# =============================================
Write-Host "  [5.3] CROSS-TENANT SECURITY" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    
    # SEC01: Tenant token -> platform API
    Test-API -Name "SEC01 Tenant token -> /platform/tenants -> 403" -Method GET -Path "/api/platform/tenants" -Headers $tH -ExpectedStatus 403
    
    # SEC02: Data isolation check
    $usersResult = Test-API -Name "SEC02 DARKHAWLAN users isolation" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    if ($usersResult.Data.data) {
        $dkEmails = @($usersResult.Data.data | ForEach-Object { $_.email })
        Write-Host "    >> DARKHAWLAN has $($dkEmails.Count) users" -ForegroundColor Gray
    }
}

if ($ALHCO_TOKEN) {
    $aH = @{ Authorization = "Bearer $ALHCO_TOKEN" }
    $alhcoUsers = Test-API -Name "SEC02b ALHCO users isolation" -Method GET -Path "/api/tenant/users" -Headers $aH -ExpectedStatus 200
    if ($alhcoUsers.Data.data) {
        $alEmails = @($alhcoUsers.Data.data | ForEach-Object { $_.email })
        Write-Host "    >> ALHCO has $($alEmails.Count) users" -ForegroundColor Gray
        
        # Cross check
        if ($dkEmails -and $alEmails) {
            $overlap = $dkEmails | Where-Object { $alEmails -contains $_ }
            if ($overlap.Count -eq 0) {
                Write-Host "  [PASS] SEC02 No cross-tenant data leak!" -ForegroundColor Green
                $script:passCount++
            } else {
                Write-Host "  [FAIL] SEC02 CROSS-TENANT DATA LEAK: $($overlap -join ', ')" -ForegroundColor Red
                $script:failCount++
            }
        }
    }
}

# SEC08: Expired/invalid token
$expH = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid" }
Test-API -Name "SEC08 Expired token -> 401" -Method GET -Path "/api/me" -Headers $expH -ExpectedStatus 401

Write-Host ""

# =============================================
# 4. GLOBAL MASTER DATA
# =============================================
Write-Host "  [4.1] GLOBAL MASTER DATA (Public)" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# Try both /api/public/ and /api/master/ paths
$gm01 = Test-API -Name "GM01 GET countries" -Method GET -Path "/api/public/countries" -ExpectedStatus 200
if (-not $gm01.Pass) { Test-API -Name "GM01b GET countries (alt)" -Method GET -Path "/api/countries" -ExpectedStatus 200 }

$gm03 = Test-API -Name "GM03 GET currencies" -Method GET -Path "/api/public/currencies" -ExpectedStatus 200
if (-not $gm03.Pass) { Test-API -Name "GM03b GET currencies (alt)" -Method GET -Path "/api/currencies" -ExpectedStatus 200 }

$gm04 = Test-API -Name "GM04 GET incoterms" -Method GET -Path "/api/public/incoterms" -ExpectedStatus 200
$gm05 = Test-API -Name "GM05 GET container-types" -Method GET -Path "/api/public/container-types" -ExpectedStatus 200

Write-Host ""

# =============================================
# 6. MODULE GATING
# =============================================
Write-Host "  [6.3] MODULE GATING" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "MG01 Shipments module" -Method GET -Path "/api/tenant/shipments" -Headers $tH -AnySuccess -ExpectedStatus 200
    Test-API -Name "MG02 Procurement module" -Method GET -Path "/api/tenant/procurement/orders" -Headers $tH -AnySuccess -ExpectedStatus 200
} else {
    Write-Host "  [SKIP] Module gating tests — no token" -ForegroundColor DarkYellow
    $skipCount += 2
}

Write-Host ""

# =============================================
# RATE LIMITING TEST (SEC10)
# =============================================
Write-Host "  [SEC10] RATE LIMITING" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

$rateLimitHit = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "$API/api/auth/login" -Method POST -Body '{"email":"ratelimit@test.com","password":"x","login_context":"platform"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 429) {
            Write-Host "  [PASS] SEC10 Rate limit hit at request #$i (HTTP 429)" -ForegroundColor Green
            $script:passCount++
            $rateLimitHit = $true
            break
        }
    }
}
if (-not $rateLimitHit) {
    Write-Host "  [WARN] SEC10 No rate limit after 30 requests" -ForegroundColor DarkYellow
}

Write-Host ""

# =============================================
# DATABASE CHECKS
# =============================================
Write-Host "  [8] DATABASE INTEGRITY" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# DB01: Table count
$tableCount = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>$null
$tc = [int]$tableCount.Trim()
if ($tc -ge 50) { Write-Host "  [PASS] DB01 Public tables: $tc (>= 50)" -ForegroundColor Green; $passCount++ } 
else { Write-Host "  [FAIL] DB01 Public tables: $tc (expected >= 50)" -ForegroundColor Red; $failCount++ }

# DB03: Tenant schemas
$schemas = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT string_agg(schema_name, ', ') FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';" 2>$null
Write-Host "  [INFO] DB03 Tenant schemas: $($schemas.Trim())" -ForegroundColor Gray

# DB05: FK constraints
$fkCount = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';" 2>$null
$fk = [int]$fkCount.Trim()
if ($fk -gt 100) { Write-Host "  [PASS] DB05 Foreign keys: $fk" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [INFO] DB05 Foreign keys: $fk" -ForegroundColor Gray }

# DB06: Migration status
$lastMig = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT id || ' - ' || name FROM migrations ORDER BY id DESC LIMIT 1;" 2>$null
Write-Host "  [INFO] DB06 Last migration: $($lastMig.Trim())" -ForegroundColor Gray

# DB08: Modules count
$modCount = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules;" 2>$null
$mc = [int]$modCount.Trim()
if ($mc -ge 11) { Write-Host "  [PASS] DB08 Modules: $mc (>= 11)" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] DB08 Modules: $mc (expected >= 11)" -ForegroundColor Red; $failCount++ }

Write-Host ""

# =============================================
# KNOWN ISSUES VERIFICATION
# =============================================
Write-Host "  [10] KNOWN ISSUES VERIFICATION" -ForegroundColor Yellow
Write-Host "  ----------------------" -ForegroundColor DarkGray

# FIX01: subscription plan view
$fix01 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM v_subscription_plan_unified;" 2>$null
if ($fix01 -and $fix01.Trim() -match '^\d+$') { Write-Host "  [PASS] FIX01 v_subscription_plan_unified view works" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [WARN] FIX01 v_subscription_plan_unified: $fix01" -ForegroundColor DarkYellow }

# FIX03: branches module exists
$fix03 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules WHERE name='branches';" 2>$null
if ($fix03.Trim() -ge 1) { Write-Host "  [PASS] FIX03 branches module exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX03 branches module missing" -ForegroundColor Red; $failCount++ }

# FIX04: impersonation_logs has token_jti
$fix04 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='impersonation_logs' AND column_name='token_jti';" 2>$null
if ($fix04.Trim() -ge 1) { Write-Host "  [PASS] FIX04 impersonation_logs.token_jti exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX04 impersonation_logs.token_jti missing" -ForegroundColor Red; $failCount++ }

# FIX05: supplier_types has code
$fix05 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='supplier_types' AND column_name='code';" 2>$null
if ($fix05.Trim() -ge 1) { Write-Host "  [PASS] FIX05 supplier_types.code exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX05 supplier_types.code missing" -ForegroundColor Red; $failCount++ }

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
$passRate = if (($passCount + $failCount) -gt 0) { [math]::Round(($passCount / ($passCount + $failCount)) * 100, 1) } else { 0 }
Write-Host "    Pass Rate: $passRate%" -ForegroundColor $(if($passRate -ge 80){"Green"}elseif($passRate -ge 60){"Yellow"}else{"Red"})
Write-Host ""
Write-Host "  Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "  ======================================================" -ForegroundColor Cyan

# Print failed tests
if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "  FAILED TESTS:" -ForegroundColor Red
    $allResults | Where-Object { -not $_.Pass } | ForEach-Object {
        Write-Host "    - $($_.Name) (got $($_.Status), expected $($_.Expected))" -ForegroundColor Red
    }
}
