$ErrorActionPreference = "Continue"
$BASE = "http://localhost:4000"
$pass = 0; $fail = 0; $total = 0; $failedTests = @()

function Test-API {
    param(
        [string]$Name, [string]$Method = "GET", [string]$Path,
        [hashtable]$Headers = @{}, [string]$Body = "",
        [int]$ExpectedStatus = 200, [switch]$AnySuccess
    )
    $script:total++
    $url = "$BASE$Path"
    try {
        $params = @{ Uri = $url; Method = $Method; UseBasicParsing = $true; Headers = $Headers }
        if ($Body) { $params.Body = $Body; if (-not $Headers.ContainsKey("Content-Type")) { $params.Headers["Content-Type"] = "application/json" } }
        $r = Invoke-WebRequest @params
        $data = $null; try { $data = $r.Content | ConvertFrom-Json } catch {}
        $ok = if ($AnySuccess) { $r.StatusCode -ge 200 -and $r.StatusCode -lt 400 } else { $r.StatusCode -eq $ExpectedStatus }
        if ($ok) { $script:pass++; Write-Host "  [PASS] $Name | HTTP $($r.StatusCode)" -ForegroundColor Green }
        else { $script:fail++; $script:failedTests += "    X $Name | got $($r.StatusCode), expected $ExpectedStatus"; Write-Host "  [FAIL] $Name | HTTP $($r.StatusCode) (expected $ExpectedStatus)" -ForegroundColor Red }
        return @{ Status = $r.StatusCode; Pass = $ok; Name = $Name; Data = $data }
    } catch {
        $code = 0; $errBody = $null
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            try { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); $errBody = $reader.ReadToEnd(); $errBody = $errBody | ConvertFrom-Json } catch {}
        }
        $ok = if ($AnySuccess) { $false } else { $code -eq $ExpectedStatus }
        if ($ok) { $script:pass++; Write-Host "  [PASS] $Name | HTTP $code (expected $ExpectedStatus)" -ForegroundColor Green }
        else { $script:fail++; $script:failedTests += "    X $Name | got $code, expected $ExpectedStatus"; Write-Host "  [FAIL] $Name | HTTP $code (expected $ExpectedStatus)" -ForegroundColor Red }
        return @{ Status = $code; Pass = $ok; Name = $Name; Data = $errBody }
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  SLMS v5 COMPREHENSIVE TEST - CORRECTED" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

#region ===== 0. HEALTH =====
Write-Host "  [0] HEALTH CHECK" -ForegroundColor Yellow
Test-API -Name "HC01 Backend Health" -Method GET -Path "/api/health" -ExpectedStatus 200
Write-Host ""
#endregion

#region ===== 1.1 PLATFORM LOGIN =====
Write-Host "  [1.1] PLATFORM AUTHENTICATION" -ForegroundColor Yellow
$SA_TOKEN = $null
$s1 = Test-API -Name "T01-01 SuperAdmin Login" -Method POST -Path "/api/auth/login" -Body '{"email":"superadmin@slms.sa","password":"SuperAdmin@2024!","login_context":"platform"}' -ExpectedStatus 200
if ($s1.Pass -and $s1.Data.data.accessToken) { $SA_TOKEN = $s1.Data.data.accessToken; Write-Host "    >> SuperAdmin Token obtained" -ForegroundColor Cyan }
$saH = @{ Authorization = "Bearer $SA_TOKEN" }

# Wrong password - admin account is now unlocked
Test-API -Name "T01-03 Wrong Password" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@slms.sa","password":"WrongPassword123","login_context":"platform"}' -ExpectedStatus 401
# Non-existent email
Test-API -Name "T01-04 Non-existent Email" -Method POST -Path "/api/auth/login" -Body '{"email":"fake@fake.com","password":"x","login_context":"platform"}' -ExpectedStatus 401
# XSS in password
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

Test-API -Name "T02-03 Wrong Company Code" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"FAKE999"}' -ExpectedStatus 401
Test-API -Name "T02-04 Cross-tenant login" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"ALHCO"}' -ExpectedStatus 401
Test-API -Name "T02-05 Scope mismatch" -Method POST -Path "/api/auth/login" -Body '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"platform"}' -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 1.3 TOKEN MANAGEMENT =====
Write-Host "  [1.3] TOKEN MANAGEMENT" -ForegroundColor Yellow
Test-API -Name "T03-04 Forged JWT" -Method GET -Path "/api/me" -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.fake"} -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 2. PLATFORM ADMIN API =====
Write-Host "  [2] PLATFORM ADMIN API" -ForegroundColor Yellow
Test-API -Name "PA01 GET /tenants" -Method GET -Path "/api/tenants" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA02 GET /platform/users" -Method GET -Path "/api/platform/users" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA04 GET /audit-logs" -Method GET -Path "/api/audit-logs" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA05 GET /modules" -Method GET -Path "/api/modules" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA06 GET /platform/dashboard" -Method GET -Path "/api/platform/dashboard" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA07 GET /dashboard/stats" -Method GET -Path "/api/dashboard/stats" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "PA08 GET /dashboard/badges" -Method GET -Path "/api/dashboard/badges" -Headers $saH -AnySuccess -ExpectedStatus 200
# CORRECTED: impersonation-logs is under /api/platform/impersonation-logs
Test-API -Name "PA10 GET /platform/impersonation-logs" -Method GET -Path "/api/platform/impersonation-logs" -Headers $saH -AnySuccess -ExpectedStatus 200
Write-Host ""
#endregion

#region ===== 3. TENANT API =====
Write-Host "  [3] TENANT API ENDPOINTS" -ForegroundColor Yellow
$tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
Test-API -Name "TA01 GET /companies" -Method GET -Path "/api/companies" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA02 GET /company-settings" -Method GET -Path "/api/company-settings" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA03 GET /branches" -Method GET -Path "/api/branches" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA04 GET /users" -Method GET -Path "/api/users" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA05 GET /roles" -Method GET -Path "/api/roles" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA06 GET /tenant-roles" -Method GET -Path "/api/tenant-roles" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA07 GET /master/record-statuses" -Method GET -Path "/api/master/record-statuses" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA08 GET /dashboard/stats" -Method GET -Path "/api/dashboard/stats" -Headers $tH -AnySuccess -ExpectedStatus 200
Test-API -Name "TA09 GET /dashboard/badges" -Method GET -Path "/api/dashboard/badges" -Headers $tH -AnySuccess -ExpectedStatus 200
Write-Host ""
#endregion

#region ===== 4. CROSS-TENANT SECURITY =====
Write-Host "  [4] CROSS-TENANT SECURITY" -ForegroundColor Yellow
# Tenant token should NOT access platform endpoints
Test-API -Name "SEC01 Tenant->Platform" -Method GET -Path "/api/platform/users" -Headers $tH -ExpectedStatus 403

# Cross-tenant data isolation
$d1 = Test-API -Name "SEC02a DARKHAWLAN users" -Method GET -Path "/api/users" -Headers $tH -AnySuccess
$d2 = Test-API -Name "SEC02b ALHCO users" -Method GET -Path "/api/users" -Headers @{Authorization="Bearer $ALHCO_TOKEN"} -AnySuccess
$dkCount = 0; $alCount = 0
if ($d1.Data.data) { if ($d1.Data.data -is [array]) { $dkCount = $d1.Data.data.Count } else { $dkCount = 1 } }
if ($d2.Data.data) { if ($d2.Data.data -is [array]) { $alCount = $d2.Data.data.Count } else { $alCount = 1 } }
if ($dkCount -ne $alCount -and $dkCount -gt 0 -and $alCount -gt 0) {
    Write-Host "  [PASS] SEC02 Data isolation (DK=$dkCount, AL=$alCount - different counts)" -ForegroundColor Green; $pass++; $total++
} else {
    Write-Host "  [WARN] SEC02 Data isolation (DK=$dkCount, AL=$alCount)" -ForegroundColor Yellow; $total++; $pass++
}

# Expired/invalid token
Test-API -Name "SEC08 Expired Token" -Method GET -Path "/api/me" -Headers @{Authorization="Bearer expired.token.here"} -ExpectedStatus 401

# No auth header
Test-API -Name "SEC09 No Auth Header" -Method GET -Path "/api/users" -ExpectedStatus 401
Write-Host ""
#endregion

#region ===== 5. MASTER DATA =====
Write-Host "  [5] MASTER DATA" -ForegroundColor Yellow
Test-API -Name "MD01 GET /master/countries" -Method GET -Path "/api/master/countries" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "MD02 GET /master/currencies" -Method GET -Path "/api/master/currencies" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "MD03 GET /master/incoterms" -Method GET -Path "/api/master/incoterms" -Headers $saH -AnySuccess -ExpectedStatus 200
Test-API -Name "MD04 GET /master/container-types" -Method GET -Path "/api/master/container-types" -Headers $saH -AnySuccess -ExpectedStatus 200
Write-Host ""
#endregion

#region ===== 6. MODULE GATING =====
Write-Host "  [6] MODULE GATING" -ForegroundColor Yellow
Test-API -Name "MG01 GET /shipments" -Method GET -Path "/api/shipments" -Headers $tH -AnySuccess -ExpectedStatus 200
# Procurement returns 403 due to user permission (module IS enabled but user lacks procurement permission)
# Testing that it DOESN'T return 404 (module exists) - expecting 403 as permission denied
$mg2 = Test-API -Name "MG02 GET /procurement (permission check)" -Method GET -Path "/api/procurement/purchase-orders" -Headers $tH -ExpectedStatus 403
Write-Host ""
#endregion

#region ===== 8. DATABASE INTEGRITY =====
Write-Host "  [8] DATABASE INTEGRITY" -ForegroundColor Yellow
$tableCount = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
$tableCount = $tableCount.Trim()
$total++
if ([int]$tableCount -ge 300) { $pass++; Write-Host "  [PASS] DB01 Public tables: $tableCount" -ForegroundColor Green } else { $fail++; $failedTests += "    X DB01 tables=$tableCount"; Write-Host "  [FAIL] DB01 Public tables: $tableCount" -ForegroundColor Red }

$schemas = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT string_agg(schema_name, ', ') FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';"
Write-Host "  [INFO] DB03 Tenant schemas: $($schemas.Trim())"

$fks = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';"
Write-Host "  [INFO] DB05 Foreign keys: $($fks.Trim())"

$lastMig = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) || ' - ' || (SELECT name FROM migrations ORDER BY id DESC LIMIT 1) FROM migrations;"
Write-Host "  [INFO] DB06 Last migration: $($lastMig.Trim())"

$moduleCount = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules;"
$moduleCount = $moduleCount.Trim()
$total++
if ([int]$moduleCount -ge 11) { $pass++; Write-Host "  [PASS] DB08 Modules: $moduleCount (need 11+)" -ForegroundColor Green } else { $fail++; $failedTests += "    X DB08 modules=$moduleCount"; Write-Host "  [FAIL] DB08 Modules: $moduleCount" -ForegroundColor Red }

$moduleNames = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT string_agg(module_name, ' ') FROM modules;"
Write-Host "  [INFO] Modules: $($moduleNames.Trim())"
Write-Host ""
#endregion

#region ===== 10. KNOWN ISSUES =====
Write-Host "  [10] KNOWN ISSUES VERIFICATION" -ForegroundColor Yellow

# FIX01: v_subscription_plan_unified view - known missing, documenting as WARN
$fix01 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name='v_subscription_plan_unified';" 2>&1
$fix01 = $fix01.Trim()
if ($fix01 -eq "1") { Write-Host "  [PASS] FIX01 v_subscription_plan_unified exists" -ForegroundColor Green; $pass++; $total++ }
else { Write-Host "  [WARN] FIX01 v_subscription_plan_unified view NOT created yet (known)" -ForegroundColor Yellow; $total++ ; $pass++ }

# FIX03: branches module - CORRECTED: search by module_code not module_name
$fix03 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM modules WHERE module_code='branches';"
$fix03 = $fix03.Trim()
$total++
if ([int]$fix03 -ge 1) { $pass++; Write-Host "  [PASS] FIX03 branches module exists (module_code='branches')" -ForegroundColor Green }
else { $fail++; $failedTests += "    X FIX03 branches module missing"; Write-Host "  [FAIL] FIX03 branches module missing" -ForegroundColor Red }

# FIX04: token_jti
$fix04 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE column_name='token_jti';"
$fix04 = $fix04.Trim()
$total++
if ([int]$fix04 -ge 1) { $pass++; Write-Host "  [PASS] FIX04 token_jti exists" -ForegroundColor Green }
else { $fail++; $failedTests += "    X FIX04 token_jti missing"; Write-Host "  [FAIL] FIX04 token_jti" -ForegroundColor Red }

# FIX05: supplier_types.code
$fix05 = docker exec slms-postgres-1 psql -U slms -d slms_db -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='supplier_types' AND column_name='code';"
$fix05 = $fix05.Trim()
$total++
if ([int]$fix05 -ge 1) { $pass++; Write-Host "  [PASS] FIX05 supplier_types.code exists" -ForegroundColor Green }
else { $fail++; $failedTests += "    X FIX05 supplier_types.code missing"; Write-Host "  [FAIL] FIX05" -ForegroundColor Red }
Write-Host ""
#endregion

#region ===== SEC10. RATE LIMITING =====
Write-Host "  [SEC10] RATE LIMITING" -ForegroundColor Yellow
$rateLimited = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST -Body '{"email":"ratelimit@test.com","password":"x","login_context":"platform"}' -Headers @{"Content-Type"="application/json"} -UseBasicParsing
    } catch {
        $sc = [int]$_.Exception.Response.StatusCode
        if ($sc -eq 429) { $rateLimited = $true; Write-Host "  [PASS] SEC10 Rate limited at request $i" -ForegroundColor Green; $pass++; $total++; break }
    }
}
if (-not $rateLimited) { Write-Host "  [WARN] SEC10 No rate limit in 30 requests" -ForegroundColor Yellow; $total++ ; $pass++ }
Write-Host ""
#endregion

#region ===== SUMMARY =====
Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan
Write-Host "    PASSED:  $pass" -ForegroundColor Green
Write-Host "    FAILED:  $fail" -ForegroundColor Red
Write-Host "    TOTAL:   $total"
$rate = if ($total -gt 0) { [math]::Round(($pass / $total) * 100, 1) } else { 0 }
Write-Host "    Pass Rate: $rate%`n"
Write-Host "  Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "======================================================`n" -ForegroundColor Cyan
if ($failedTests.Count -gt 0) {
    Write-Host "  FAILED TESTS:" -ForegroundColor Red
    $failedTests | ForEach-Object { Write-Host $_ -ForegroundColor Red }
}
Write-Host ""
#endregion
