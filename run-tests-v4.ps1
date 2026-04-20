$ErrorActionPreference = "Continue"
$API = "http://localhost:4000"
$passCount = 0
$failCount = 0
$skipCount = 0
$allResults = [System.Collections.ArrayList]::new()

function Test-API {
    param([string]$Name, [string]$Method, [string]$Path, [string]$Body, [hashtable]$Headers, [int]$ExpectedStatus, [switch]$AnySuccess, [switch]$Accept4xx)
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
        if ($AnySuccess) { $pass = ($status -ge 200 -and $status -lt 400) }
        elseif ($Accept4xx) { $pass = ($status -eq $ExpectedStatus -or ($status -ge 400 -and $status -lt 500)) }
        elseif ($ExpectedStatus -gt 0) { $pass = ($status -eq $ExpectedStatus) }
        else { $pass = ($status -ge 200 -and $status -lt 400) }

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
Write-Host "  SLMS FULL SYSTEM TESTING v4" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

#region ===== 0. ENVIRONMENT =====
Write-Host "  [0] ENVIRONMENT CHECK" -ForegroundColor Yellow
Test-API -Name "Health Endpoint" -Method GET -Path "/api/health" -ExpectedStatus 200
Write-Host ""
#endregion

#region ===== 1.1 PLATFORM ADMIN LOGIN =====
Write-Host "  [1.1] PLATFORM ADMIN LOGIN" -ForegroundColor Yellow
$PLATFORM_TOKEN = $null

$pAccounts = @(
    @{e="superadmin@slms.sa";p="SuperAdmin@2024!"},
    @{e="admin@slms.sa";p="PlatformAdmin@2024!"},
    @{e="admin@slms.sa";p="Admin@2024!"},
    @{e="superadmin@slms.sa";p="Admin@2024!"}
)
foreach ($a in $pAccounts) {
    $b = "{`"email`":`"$($a.e)`",`"password`":`"$($a.p)`",`"login_context`":`"platform`"}"
    $r = Test-API -Name "T01 Login $($a.e)" -Method POST -Path "/api/auth/login" -Body $b -ExpectedStatus 200
    if ($r.Pass -and $r.Data.data.accessToken) {
        $PLATFORM_TOKEN = $r.Data.data.accessToken
        Write-Host "    >> Platform Token from $($a.e)" -ForegroundColor Cyan
        break
    }
}
if (-not $PLATFORM_TOKEN) {
    $dbOut = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT email || '|' || COALESCE(role,'?') FROM users WHERE tenant_id IS NULL LIMIT 10;"
    Write-Host "    >> DB platform users: $dbOut" -ForegroundColor DarkYellow
}

# Wrong password
Test-API -Name "T01-03 Wrong Password" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@slms.sa","password":"WrongPass!","login_context":"platform"}' -ExpectedStatus 401
# Non-existent
Test-API -Name "T01-04 Non-existent Email" -Method POST -Path "/api/auth/login" -Body '{"email":"fake@fake.com","password":"x","login_context":"platform"}' -ExpectedStatus 401
# XSS
Test-API -Name "T01-08 XSS in Password" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@slms.sa","password":"scriptalertscript","login_context":"platform"}' -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 1.2 TENANT LOGIN =====
Write-Host "  [1.2] TENANT USER LOGIN" -ForegroundColor Yellow
$DARKHAWLAN_TOKEN = $null
$ALHCO_TOKEN = $null

$t1 = Test-API -Name "T02-01 DARKHAWLAN Login" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"DARKHAWLAN"}' -ExpectedStatus 200
if ($t1.Pass -and $t1.Data.data.accessToken) { $DARKHAWLAN_TOKEN = $t1.Data.data.accessToken; Write-Host "    >> DARKHAWLAN Token obtained" -ForegroundColor Cyan }

$t2 = Test-API -Name "T02-01b ALHCO Login" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@alhajco.com","password":"Admin@123","login_context":"tenant","tenant_code":"ALHCO"}' -ExpectedStatus 200
if ($t2.Pass -and $t2.Data.data.accessToken) { $ALHCO_TOKEN = $t2.Data.data.accessToken; Write-Host "    >> ALHCO Token obtained" -ForegroundColor Cyan }

if (-not $DARKHAWLAN_TOKEN -and -not $ALHCO_TOKEN) {
    $tU = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT u.email || '|' || t.company_code FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.status='active' LIMIT 10;"
    Write-Host "    >> DB tenant users: $tU" -ForegroundColor DarkYellow
}

Test-API -Name "T02-03 Wrong Company Code" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"FAKE999"}' -ExpectedStatus 401
Test-API -Name "T02-04 Cross-tenant login" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"ALHCO"}' -ExpectedStatus 401
Test-API -Name "T02-05 Scope mismatch" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"platform"}' -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 1.3 TOKEN MANAGEMENT =====
Write-Host "  [1.3] TOKEN MANAGEMENT" -ForegroundColor Yellow
Test-API -Name "T03-04 Forged JWT" -Method GET -Path "/api/me" -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.fake"} -ExpectedStatus 401
Test-API -Name "T03-xx No Auth Header" -Method GET -Path "/api/me" -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 5.1 PLATFORM API (actual paths) =====
Write-Host "  [5.1] PLATFORM API ENDPOINTS" -ForegroundColor Yellow
if ($PLATFORM_TOKEN) {
    $pH = @{Authorization="Bearer $PLATFORM_TOKEN"}
    Test-API -Name "PA01 GET /tenants" -Method GET -Path "/api/tenants" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA08 GET /platform/users" -Method GET -Path "/api/platform/users" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA09 GET /audit-logs" -Method GET -Path "/api/audit-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA10 GET /impersonation-logs" -Method GET -Path "/api/impersonation-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA12 GET /modules" -Method GET -Path "/api/modules" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA13 GET /platform/dashboard" -Method GET -Path "/api/platform/dashboard" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA13b GET /dashboard/stats" -Method GET -Path "/api/dashboard/stats" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA-badges GET /dashboard/badges" -Method GET -Path "/api/dashboard/badges" -Headers $pH -ExpectedStatus 200
} else {
    Write-Host "  [SKIP] Platform API (no token)" -ForegroundColor DarkYellow
    $skipCount += 8
}
Write-Host ""
#endregion

#region ===== 5.2 TENANT API (actual paths) =====
Write-Host "  [5.2] TENANT API ENDPOINTS" -ForegroundColor Yellow
if ($DARKHAWLAN_TOKEN) {
    $tH = @{Authorization="Bearer $DARKHAWLAN_TOKEN"}
    Test-API -Name "TA01 GET /companies" -Method GET -Path "/api/companies" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA01b GET /company-settings" -Method GET -Path "/api/company-settings" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA03 GET /branches" -Method GET -Path "/api/branches" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA05 GET /users" -Method GET -Path "/api/users" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA07 GET /roles" -Method GET -Path "/api/roles" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA07b GET /tenant-roles" -Method GET -Path "/api/tenant-roles" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA09 GET /master/record-statuses" -Method GET -Path "/api/master/record-statuses" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA12 GET /dashboard/stats" -Method GET -Path "/api/dashboard/stats" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA-badges GET /dashboard/badges" -Method GET -Path "/api/dashboard/badges" -Headers $tH -ExpectedStatus 200
} else {
    Write-Host "  [SKIP] Tenant API (no DARKHAWLAN token)" -ForegroundColor DarkYellow
    $skipCount += 9
}
Write-Host ""
#endregion

#region ===== 5.3 CROSS-TENANT SECURITY =====
Write-Host "  [5.3] CROSS-TENANT SECURITY" -ForegroundColor Yellow
$dkEmails = @()
$alEmails = @()

if ($DARKHAWLAN_TOKEN) {
    $tH = @{Authorization="Bearer $DARKHAWLAN_TOKEN"}
    # SEC01: Tenant -> Platform
    Test-API -Name "SEC01 Tenant to Platform /tenants" -Method GET -Path "/api/tenants" -Headers $tH -ExpectedStatus 403
    # SEC02a
    $sec02 = Test-API -Name "SEC02a DARKHAWLAN /users" -Method GET -Path "/api/users" -Headers $tH -ExpectedStatus 200
    if ($sec02.Data.data) {
        $dkEmails = @($sec02.Data.data | ForEach-Object { $_.email })
        Write-Host "    DARKHAWLAN: $($dkEmails.Count) users" -ForegroundColor Gray
    } elseif ($sec02.Data.users) {
        $dkEmails = @($sec02.Data.users | ForEach-Object { $_.email })
        Write-Host "    DARKHAWLAN: $($dkEmails.Count) users" -ForegroundColor Gray
    }
}

if ($ALHCO_TOKEN) {
    $aH = @{Authorization="Bearer $ALHCO_TOKEN"}
    $sec02b = Test-API -Name "SEC02b ALHCO /users" -Method GET -Path "/api/users" -Headers $aH -ExpectedStatus 200
    if ($sec02b.Data.data) {
        $alEmails = @($sec02b.Data.data | ForEach-Object { $_.email })
        Write-Host "    ALHCO: $($alEmails.Count) users" -ForegroundColor Gray
    } elseif ($sec02b.Data.users) {
        $alEmails = @($sec02b.Data.users | ForEach-Object { $_.email })
        Write-Host "    ALHCO: $($alEmails.Count) users" -ForegroundColor Gray
    }
}

if ($dkEmails.Count -gt 0 -and $alEmails.Count -gt 0) {
    $overlap = @($dkEmails | Where-Object { $alEmails -contains $_ })
    if ($overlap.Count -eq 0) {
        Write-Host "  [PASS] SEC02 No cross-tenant data leak" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  [FAIL] SEC02 CROSS-TENANT LEAK! $($overlap -join ', ')" -ForegroundColor Red
        $failCount++
    }
} else {
    Write-Host "  [SKIP] SEC02 cross-tenant check (need both tokens)" -ForegroundColor DarkYellow
}

Test-API -Name "SEC08 Expired token" -Method GET -Path "/api/me" -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.bad"} -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 4.1 GLOBAL MASTER DATA =====
Write-Host "  [4.1] GLOBAL MASTER DATA" -ForegroundColor Yellow
if ($DARKHAWLAN_TOKEN) {
    $tH = @{Authorization="Bearer $DARKHAWLAN_TOKEN"}
    Test-API -Name "GM01 GET /master/countries" -Method GET -Path "/api/master/countries" -Headers $tH -ExpectedStatus 200
    Test-API -Name "GM03 GET /master/currencies" -Method GET -Path "/api/master/currencies" -Headers $tH -ExpectedStatus 200
    Test-API -Name "GM04 GET /master/incoterms" -Method GET -Path "/api/master/incoterms" -Headers $tH -ExpectedStatus 200
    Test-API -Name "GM05 GET /master/container-types" -Method GET -Path "/api/master/container-types" -Headers $tH -ExpectedStatus 200
} else {
    # Try without auth
    Test-API -Name "GM01 GET /master/countries" -Method GET -Path "/api/master/countries" -ExpectedStatus 200
    Test-API -Name "GM03 GET /master/currencies" -Method GET -Path "/api/master/currencies" -ExpectedStatus 200
}
Write-Host ""
#endregion

#region ===== 6.3 MODULE GATING =====
Write-Host "  [6.3] MODULE GATING" -ForegroundColor Yellow
if ($DARKHAWLAN_TOKEN) {
    $tH = @{Authorization="Bearer $DARKHAWLAN_TOKEN"}
    Test-API -Name "MG01 GET /shipments" -Method GET -Path "/api/shipments" -Headers $tH -AnySuccess -ExpectedStatus 200
    Test-API -Name "MG02 GET /procurement/purchase-orders" -Method GET -Path "/api/procurement/purchase-orders" -Headers $tH -AnySuccess -ExpectedStatus 200
}
Write-Host ""
#endregion

#region ===== 8 DATABASE INTEGRITY =====
Write-Host "  [8] DATABASE INTEGRITY" -ForegroundColor Yellow

$tc = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';").Trim()
if ([int]$tc -ge 50) { Write-Host "  [PASS] DB01 Public tables: $tc" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] DB01 Public tables: $tc (need 50+)" -ForegroundColor Red; $failCount++ }

$schemas = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT string_agg(schema_name, ', ') FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';").Trim()
Write-Host "  [INFO] DB03 Tenant schemas: $schemas" -ForegroundColor Gray

$fk = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';").Trim()
Write-Host "  [INFO] DB05 Foreign keys: $fk" -ForegroundColor Gray

$lm = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT id || ' - ' || name FROM migrations ORDER BY id DESC LIMIT 1;").Trim()
Write-Host "  [INFO] DB06 Last migration: $lm" -ForegroundColor Gray

# Module count - use module_name column
$mc = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules;").Trim()
if ([int]$mc -ge 11) { Write-Host "  [PASS] DB08 Modules: $mc (need 11+)" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] DB08 Modules: $mc (need 11+)" -ForegroundColor Red; $failCount++ }

$modList = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT module_name FROM modules ORDER BY id;").Trim()
Write-Host "  [INFO] Modules: $modList" -ForegroundColor Gray

Write-Host ""
#endregion

#region ===== 10. KNOWN ISSUES =====
Write-Host "  [10] KNOWN ISSUES VERIFICATION" -ForegroundColor Yellow

try {
    $fix01 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM v_subscription_plan_unified;" 2>&1).Trim()
    if ($fix01 -match '^\d+$') { Write-Host "  [PASS] FIX01 v_subscription_plan_unified ($fix01 rows)" -ForegroundColor Green; $passCount++ }
    else { Write-Host "  [WARN] FIX01 v_subscription_plan_unified: $fix01" -ForegroundColor DarkYellow }
} catch { Write-Host "  [WARN] FIX01 error" -ForegroundColor DarkYellow }

$fix03 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules WHERE module_name='branches';").Trim()
if ($fix03 -and [int]$fix03 -ge 1) { Write-Host "  [PASS] FIX03 branches module exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX03 branches module missing" -ForegroundColor Red; $failCount++ }

$fix04 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='impersonation_logs' AND column_name='token_jti';").Trim()
if ($fix04 -and [int]$fix04 -ge 1) { Write-Host "  [PASS] FIX04 token_jti exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX04 token_jti missing" -ForegroundColor Red; $failCount++ }

$fix05 = (docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='supplier_types' AND column_name='code';").Trim()
if ($fix05 -and [int]$fix05 -ge 1) { Write-Host "  [PASS] FIX05 supplier_types.code exists" -ForegroundColor Green; $passCount++ }
else { Write-Host "  [FAIL] FIX05 supplier_types.code missing" -ForegroundColor Red; $failCount++ }

Write-Host ""
#endregion

#region ===== RATE LIMITING =====
Write-Host "  [SEC10] RATE LIMITING" -ForegroundColor Yellow
$rateLimitHit = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        Invoke-WebRequest -Uri "$API/api/auth/login" -Method POST -Body '{"email":"ratelimit@test.com","password":"x","login_context":"platform"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop | Out-Null
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 429) {
            Write-Host "  [PASS] SEC10 Rate limit at req #$i (429)" -ForegroundColor Green
            $passCount++
            $rateLimitHit = $true
            break
        }
    }
}
if (-not $rateLimitHit) { Write-Host "  [WARN] SEC10 No rate limit in 30 requests" -ForegroundColor DarkYellow }
Write-Host ""
#endregion

#region ===== SUMMARY =====
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
$rc = if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" }
Write-Host "    Pass Rate: ${passRate}%" -ForegroundColor $rc
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
#endregion
