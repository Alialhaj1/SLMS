$ErrorActionPreference = "Continue"
$API = "http://localhost:4000"
$results = @()

function Test-API {
    param([string]$Name, [string]$Method, [string]$Path, [string]$Body, [hashtable]$Headers, [int]$ExpectedStatus)
    try {
        $params = @{ Uri = "$API$Path"; Method = $Method; ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = $Body }
        $response = $null
        try {
            $response = Invoke-WebRequest @params -ErrorAction Stop
            $status = $response.StatusCode
            $data = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        } catch {
            $status = [int]$_.Exception.Response.StatusCode
            try { $data = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue } catch { $data = $null }
        }
        $pass = if ($ExpectedStatus -gt 0) { $status -eq $ExpectedStatus } else { $status -lt 400 }
        $emoji = if ($pass) { "PASS" } else { "FAIL" }
        Write-Host "[$emoji] $Name | HTTP $status (expected $ExpectedStatus)" -ForegroundColor $(if($pass){"Green"}else{"Red"})
        return @{ Name=$Name; Status=$status; Pass=$pass; Data=$data }
    } catch {
        Write-Host "[FAIL] $Name | ERROR: $_" -ForegroundColor Red
        return @{ Name=$Name; Status=0; Pass=$false; Data=$null }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SLMS COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =============================================
# 0. ENVIRONMENT CHECK
# =============================================
Write-Host "--- 0. ENVIRONMENT CHECK ---" -ForegroundColor Yellow
$health = Test-API -Name "Health Check" -Method GET -Path "/api/health" -ExpectedStatus 200
Write-Host ""

# =============================================
# 1. AUTHENTICATION TESTING
# =============================================
Write-Host "--- 1. AUTHENTICATION TESTING ---" -ForegroundColor Yellow

# T01-01: Platform Admin Login
$loginBody = '{"email":"admin@slms.sa","password":"PlatformAdmin@2024!","login_context":"platform"}'
$t0101 = Test-API -Name "T01-01 Platform Admin Login" -Method POST -Path "/api/auth/login" -Body $loginBody -ExpectedStatus 200

# Try superadmin
$loginBody2 = '{"email":"superadmin@slms.sa","password":"SuperAdmin@2024!","login_context":"platform"}'
$t0101b = Test-API -Name "T01-01b SuperAdmin Login" -Method POST -Path "/api/auth/login" -Body $loginBody2 -ExpectedStatus 200

# Determine which platform token works
$PLATFORM_TOKEN = $null
if ($t0101.Pass -and $t0101.Data.data.accessToken) { $PLATFORM_TOKEN = $t0101.Data.data.accessToken; Write-Host "  -> Using Platform Admin token" -ForegroundColor Gray }
elseif ($t0101b.Pass -and $t0101b.Data.data.accessToken) { $PLATFORM_TOKEN = $t0101b.Data.data.accessToken; Write-Host "  -> Using SuperAdmin token" -ForegroundColor Gray }
else { Write-Host "  -> WARNING: No platform token obtained!" -ForegroundColor Red }

# T01-03: Wrong password
$wrongPwd = '{"email":"admin@slms.sa","password":"WrongPassword123!","login_context":"platform"}'
Test-API -Name "T01-03 Wrong Password" -Method POST -Path "/api/auth/login" -Body $wrongPwd -ExpectedStatus 401

# T01-04: Non-existent email
$noEmail = '{"email":"nonexistent@fake.com","password":"Test@123","login_context":"platform"}'
Test-API -Name "T01-04 Non-existent Email" -Method POST -Path "/api/auth/login" -Body $noEmail -ExpectedStatus 401

# T01-07: SQL Injection
$sqli = '{"email":"admin@slms.sa'' OR ''1''=''1","password":"test","login_context":"platform"}'
Test-API -Name "T01-07 SQL Injection" -Method POST -Path "/api/auth/login" -Body $sqli -ExpectedStatus 400

# T01-08: XSS in Password
$xss = '{"email":"admin@slms.sa","password":"<script>alert(1)</script>","login_context":"platform"}'
Test-API -Name "T01-08 XSS in Password" -Method POST -Path "/api/auth/login" -Body $xss -ExpectedStatus 401

Write-Host ""

# T02-01: Tenant Login DARKHAWLAN
$tenantLogin = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"DARKHAWLAN"}'
$t0201 = Test-API -Name "T02-01 Tenant Login DARKHAWLAN" -Method POST -Path "/api/auth/login" -Body $tenantLogin -ExpectedStatus 200
$DARKHAWLAN_TOKEN = if ($t0201.Data.data.accessToken) { $t0201.Data.data.accessToken } else { $null }

# T02 Tenant Login ALHCO
$tenantLogin2 = '{"email":"admin@alhajco.com","password":"Admin@123","login_context":"tenant","tenant_code":"ALHCO"}'
$t0202 = Test-API -Name "T02-01b Tenant Login ALHCO" -Method POST -Path "/api/auth/login" -Body $tenantLogin2 -ExpectedStatus 200
$ALHCO_TOKEN = if ($t0202.Data.data.accessToken) { $t0202.Data.data.accessToken } else { $null }

# T02-03: Wrong Company Code
$wrongTenant = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"FAKE999"}'
Test-API -Name "T02-03 Wrong Company Code" -Method POST -Path "/api/auth/login" -Body $wrongTenant -ExpectedStatus 401

# T02-04: Email with wrong company code
$crossTenant = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"tenant","tenant_code":"ALHCO"}'
Test-API -Name "T02-04 Cross-tenant login" -Method POST -Path "/api/auth/login" -Body $crossTenant -ExpectedStatus 401

# T02-05: Tenant credentials with platform context
$scopeMismatch = '{"email":"admin@darkhawlan.com","password":"P@ssw0rd123!","login_context":"platform"}'
Test-API -Name "T02-05 Scope Mismatch" -Method POST -Path "/api/auth/login" -Body $scopeMismatch -ExpectedStatus 401

Write-Host ""

# =============================================
# 3. TOKEN TESTS
# =============================================
Write-Host "--- 3. TOKEN TESTS ---" -ForegroundColor Yellow

# T03-04: Forged token
$fakeHeaders = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" }
Test-API -Name "T03-04 Forged JWT" -Method GET -Path "/api/me" -Headers $fakeHeaders -ExpectedStatus 401

# T03-06: Logout
if ($DARKHAWLAN_TOKEN) {
    $authH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "T03-06 Logout" -Method POST -Path "/api/auth/logout" -Headers $authH -ExpectedStatus 200
    # Re-login DARKHAWLAN after logout
    $t0201re = Test-API -Name "T02-01 Re-login DARKHAWLAN" -Method POST -Path "/api/auth/login" -Body $tenantLogin -ExpectedStatus 200
    $DARKHAWLAN_TOKEN = if ($t0201re.Data.data.accessToken) { $t0201re.Data.data.accessToken } else { $null }
}

Write-Host ""

# =============================================
# 5. PLATFORM API ENDPOINTS (PA01-PA13)
# =============================================
Write-Host "--- 5.1 PLATFORM API ENDPOINTS ---" -ForegroundColor Yellow

if ($PLATFORM_TOKEN) {
    $pH = @{ Authorization = "Bearer $PLATFORM_TOKEN" }
    Test-API -Name "PA01 GET /platform/tenants" -Method GET -Path "/api/platform/tenants" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA03 GET /platform/tenants (list)" -Method GET -Path "/api/platform/tenants?page=1&limit=5" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA08 GET /platform/users" -Method GET -Path "/api/platform/users" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA09 GET /platform/audit-logs" -Method GET -Path "/api/platform/audit-logs" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA12 GET /platform/modules" -Method GET -Path "/api/platform/modules" -Headers $pH -ExpectedStatus 200
    Test-API -Name "PA13 GET /platform/stats" -Method GET -Path "/api/platform/stats" -Headers $pH -ExpectedStatus 200
} else {
    Write-Host "[SKIP] Platform API tests - no token" -ForegroundColor DarkYellow
}

Write-Host ""

# =============================================
# 5.2 TENANT API ENDPOINTS (TA01-TA12)
# =============================================
Write-Host "--- 5.2 TENANT API ENDPOINTS ---" -ForegroundColor Yellow

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "TA01 GET /tenant/company" -Method GET -Path "/api/tenant/company" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA03 GET /tenant/branches" -Method GET -Path "/api/tenant/branches" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA05 GET /tenant/users" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA07 GET /tenant/roles" -Method GET -Path "/api/tenant/roles" -Headers $tH -ExpectedStatus 200
    $ta05 = Test-API -Name "TA09 GET /tenant/master-data" -Method GET -Path "/api/tenant/master-data/record-statuses" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA11 GET /tenant/notifications" -Method GET -Path "/api/tenant/notifications" -Headers $tH -ExpectedStatus 200
    Test-API -Name "TA12 GET /tenant/dashboard/stats" -Method GET -Path "/api/tenant/dashboard/stats" -Headers $tH -ExpectedStatus 200

    # TA02: Cannot modify company data from tenant
    $patchBody = '{"name_ar":"اسم مختلف"}'
    Test-API -Name "TA02/CP03 PATCH /tenant/company (403)" -Method PATCH -Path "/api/tenant/company" -Body $patchBody -Headers $tH -ExpectedStatus 403
} else {
    Write-Host "[SKIP] Tenant API tests - no DARKHAWLAN token" -ForegroundColor DarkYellow
}

Write-Host ""

# =============================================
# 5.3 CROSS-TENANT SECURITY (SEC01-SEC10)
# =============================================
Write-Host "--- 5.3 CROSS-TENANT SECURITY ---" -ForegroundColor Yellow

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    
    # SEC01: Tenant token accessing platform API
    Test-API -Name "SEC01 Tenant->Platform access" -Method GET -Path "/api/platform/tenants" -Headers $tH -ExpectedStatus 403

    # SEC02: DARKHAWLAN sees only its own users
    $sec02 = Test-API -Name "SEC02 Tenant users isolation" -Method GET -Path "/api/tenant/users" -Headers $tH -ExpectedStatus 200
    if ($sec02.Data.data) {
        $emails = ($sec02.Data.data | ForEach-Object { $_.email }) -join ", "
        Write-Host "  -> DARKHAWLAN users: $emails" -ForegroundColor Gray
    }
}

if ($ALHCO_TOKEN) {
    $aH = @{ Authorization = "Bearer $ALHCO_TOKEN" }
    $sec02b = Test-API -Name "SEC02b ALHCO users isolation" -Method GET -Path "/api/tenant/users" -Headers $aH -ExpectedStatus 200
    if ($sec02b.Data.data) {
        $emails2 = ($sec02b.Data.data | ForEach-Object { $_.email }) -join ", "
        Write-Host "  -> ALHCO users: $emails2" -ForegroundColor Gray
    }
}

# SEC08: Expired token
$expiredH = @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid" }
Test-API -Name "SEC08 Expired/Invalid token" -Method GET -Path "/api/me" -Headers $expiredH -ExpectedStatus 401

Write-Host ""

# =============================================
# 4. GLOBAL MASTER DATA (GM01-GM06)
# =============================================
Write-Host "--- 4.1 GLOBAL MASTER DATA ---" -ForegroundColor Yellow

Test-API -Name "GM01 GET /public/countries" -Method GET -Path "/api/public/countries" -ExpectedStatus 200
Test-API -Name "GM03 GET /public/currencies" -Method GET -Path "/api/public/currencies" -ExpectedStatus 200
Test-API -Name "GM04 GET /public/incoterms" -Method GET -Path "/api/public/incoterms" -ExpectedStatus 200
Test-API -Name "GM05 GET /public/container-types" -Method GET -Path "/api/public/container-types" -ExpectedStatus 200

Write-Host ""

# =============================================
# RBAC - PERMISSION MATRIX TESTS
# =============================================
Write-Host "--- 6. RBAC PERMISSION MATRIX ---" -ForegroundColor Yellow

# Test: Tenant token cannot access platform endpoints
if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "RBAC01 Tenant->GET /platform/tenants" -Method GET -Path "/api/platform/tenants" -Headers $tH -ExpectedStatus 403
    Test-API -Name "RBAC02 Tenant->POST /platform/tenants" -Method POST -Path "/api/platform/tenants" -Body '{}' -Headers $tH -ExpectedStatus 403
    Test-API -Name "RBAC03 Tenant->GET /platform/audit-logs" -Method GET -Path "/api/platform/audit-logs" -Headers $tH -ExpectedStatus 403
}

# Test: Support user (if exists)
$supportLogin = '{"email":"support@slms.sa","password":"Support@2024!","login_context":"platform"}'
$supportResult = Test-API -Name "Support Login" -Method POST -Path "/api/auth/login" -Body $supportLogin -ExpectedStatus 200
if ($supportResult.Pass -and $supportResult.Data.data.accessToken) {
    $sH = @{ Authorization = "Bearer $($supportResult.Data.data.accessToken)" }
    Test-API -Name "RBAC04 Support->GET /platform/tenants (read)" -Method GET -Path "/api/platform/tenants" -Headers $sH -ExpectedStatus 200
    Test-API -Name "RBAC05 Support->POST /platform/tenants (denied)" -Method POST -Path "/api/platform/tenants" -Body '{}' -Headers $sH -ExpectedStatus 403
}

Write-Host ""

# =============================================
# MODULE GATING (MG01-MG07)
# =============================================
Write-Host "--- 6.3 MODULE GATING ---" -ForegroundColor Yellow

if ($DARKHAWLAN_TOKEN) {
    $tH = @{ Authorization = "Bearer $DARKHAWLAN_TOKEN" }
    Test-API -Name "MG01 Shipments (active)" -Method GET -Path "/api/tenant/shipments" -Headers $tH -ExpectedStatus 200
    Test-API -Name "MG02 Procurement (active)" -Method GET -Path "/api/tenant/procurement/orders" -Headers $tH -ExpectedStatus 200
    Test-API -Name "MG03 Accounting (inactive)" -Method GET -Path "/api/tenant/accounting/invoices" -Headers $tH -ExpectedStatus 403
}

Write-Host ""

# =============================================
# SUMMARY
# =============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST EXECUTION COMPLETE" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
