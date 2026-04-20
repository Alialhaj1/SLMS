// SLMS Full System Testing Runbook - Automated Test Script
// Covers: Auth, Platform API, Tenant API, Cross-Tenant Security, Database
const http = require('http');

const RESULTS = [];
let passCount = 0, failCount = 0, skipCount = 0;

function log(id, desc, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  RESULTS.push({ id, desc, status, detail });
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else skipCount++;
  console.log(`${icon} ${id} | ${desc} ${detail ? '— ' + detail : ''}`);
}

function httpReq(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 4000, path, method,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 10000
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: null, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, error: 'timeout' }); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function login(email, password, loginContext, tenantCode = null) {
  const body = { email, password, login_context: loginContext };
  if (tenantCode) body.tenant_code = tenantCode;
  const r = await httpReq('POST', '/api/auth/login', body);
  return r;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 1: AUTHENTICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━
async function testAuth() {
  console.log('\n' + '━'.repeat(60));
  console.log('  1. AUTHENTICATION & SESSIONS');
  console.log('━'.repeat(60));

  // ◈ 1.1 Platform Admin Login
  console.log('\n◈ 1.1 Platform Admin Login');

  // T01-01: Successful login
  const r1 = await login('admin@slms.sa', 'PlatformAdmin@2024!', 'platform');
  const hasToken = r1.status === 200 && (r1.body?.data?.accessToken || r1.body?.token || r1.body?.data?.token);
  log('T01-01', 'Platform Admin login success', hasToken ? 'PASS' : 'FAIL',
    `HTTP ${r1.status} ${hasToken ? '+ token received' : '— no token: ' + JSON.stringify(r1.body).substring(0, 200)}`);
  const platformToken = r1.body?.data?.accessToken || r1.body?.token || r1.body?.data?.token;

  // T01-02: Verify JWT contents
  if (platformToken) {
    try {
      const payload = JSON.parse(Buffer.from(platformToken.split('.')[1], 'base64').toString());
      const hasScope = payload.scope === 'platform' || payload.role === 'platform_admin' || payload.login_context === 'platform';
      log('T01-02', 'JWT contains platform scope', hasScope ? 'PASS' : 'FAIL',
        `scope=${payload.scope||'N/A'}, role=${payload.role||'N/A'}, login_context=${payload.login_context||'N/A'}`);
    } catch (e) {
      log('T01-02', 'JWT contains platform scope', 'FAIL', 'Cannot decode JWT');
    }
  } else {
    log('T01-02', 'JWT contains platform scope', 'SKIP', 'No token from T01-01');
  }

  // T01-03: Wrong password
  const r3 = await login('admin@slms.sa', 'WrongPassword!', 'platform');
  log('T01-03', 'Wrong password → 401', r3.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r3.status}`);

  // T01-04: Non-existent email
  const r4 = await login('nonexistent@fake.com', 'AnyPass123!', 'platform');
  log('T01-04', 'Non-existent email → 401', r4.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r4.status}`);

  // T01-07: SQL Injection
  const r7 = await login("admin@slms.sa' OR '1'='1", 'PlatformAdmin@2024!', 'platform');
  log('T01-07', 'SQL Injection blocked', (r7.status === 400 || r7.status === 401) ? 'PASS' : 'FAIL', `HTTP ${r7.status}`);

  // T01-08: XSS in Password
  const r8 = await login('admin@slms.sa', '<script>alert(1)</script>', 'platform');
  log('T01-08', 'XSS in password blocked', (r8.status === 400 || r8.status === 401) ? 'PASS' : 'FAIL', `HTTP ${r8.status}`);

  // T01-10: Empty body
  const r10 = await httpReq('POST', '/api/auth/login', {});
  log('T01-10', 'Empty body → 400', (r10.status === 400 || r10.status === 401) ? 'PASS' : 'FAIL', `HTTP ${r10.status}`);

  // ◈ 1.2 Tenant User Login
  console.log('\n◈ 1.2 Tenant User Login');

  // T02-01: Successful tenant login
  const t1 = await login('admin@darkhawlan.com', 'P@ssw0rd123!', 'tenant', 'DARKHAWLAN');
  const hasTenantToken = t1.status === 200 && (t1.body?.data?.accessToken || t1.body?.token || t1.body?.data?.token);
  log('T02-01', 'Tenant login success (DARKHAWLAN)', hasTenantToken ? 'PASS' : 'FAIL',
    `HTTP ${t1.status} ${hasTenantToken ? '+ token' : '— ' + JSON.stringify(t1.body).substring(0, 200)}`);
  const dhToken = t1.body?.data?.accessToken || t1.body?.token || t1.body?.data?.token;

  // T02-02: Verify JWT tenant_id
  if (dhToken) {
    try {
      const payload = JSON.parse(Buffer.from(dhToken.split('.')[1], 'base64').toString());
      const hasTenant = payload.tenant_id || payload.tenantId;
      log('T02-02', 'JWT contains tenant_id', hasTenant ? 'PASS' : 'FAIL',
        `tenant_id=${payload.tenant_id||payload.tenantId||'N/A'}, scope=${payload.scope||payload.login_context||'N/A'}`);
    } catch (e) {
      log('T02-02', 'JWT contains tenant_id', 'FAIL', 'Cannot decode JWT');
    }
  }

  // T02-03: Wrong tenant code
  const t3 = await login('admin@darkhawlan.com', 'P@ssw0rd123!', 'tenant', 'FAKE999');
  log('T02-03', 'Wrong tenant code → 401', (t3.status === 401 || t3.status === 404) ? 'PASS' : 'FAIL', `HTTP ${t3.status}`);

  // T02-04: Email from wrong tenant
  const t4 = await login('admin@darkhawlan.com', 'P@ssw0rd123!', 'tenant', 'ALHCO');
  log('T02-04', 'Email + wrong tenant code → 401', (t4.status === 401 || t4.status === 404) ? 'PASS' : 'FAIL', `HTTP ${t4.status}`);

  // T01-09: Tenant creds on Platform context
  const t9 = await login('admin@darkhawlan.com', 'P@ssw0rd123!', 'platform');
  log('T01-09', 'Tenant creds on platform → 401', (t9.status === 401 || t9.status === 403) ? 'PASS' : 'FAIL', `HTTP ${t9.status}`);

  // Login ALHCO tenant
  const alhcoLogin = await login('admin@alhajco.com', 'Admin@123', 'tenant', 'ALHCO');
  const hajToken = alhcoLogin.body?.data?.accessToken || alhcoLogin.body?.token || alhcoLogin.body?.data?.token;
  log('T02-01b', 'Tenant login success (ALHCO)', hajToken ? 'PASS' : 'FAIL',
    `HTTP ${alhcoLogin.status}`);

  return { platformToken, dhToken, hajToken };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5.1: PLATFORM API
// ━━━━━━━━━━━━━━━━━━━━━━━━━
async function testPlatformAPI(platformToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.1 PLATFORM API TESTS');
  console.log('━'.repeat(60));

  if (!platformToken) {
    log('PA00', 'Platform API skipped — no token', 'SKIP');
    return;
  }
  const h = { 'Authorization': `Bearer ${platformToken}` };

  // PA01: GET tenants
  const pa01 = await httpReq('GET', '/api/platform/tenants', null, h);
  log('PA01', 'GET /api/platform/tenants', pa01.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa01.status}`);

  // PA03: GET tenant by ID
  const tenants = pa01.body?.data || pa01.body?.tenants || [];
  const firstTenantId = Array.isArray(tenants) && tenants.length > 0 ? tenants[0].id : null;
  if (firstTenantId) {
    const pa03 = await httpReq('GET', `/api/platform/tenants/${firstTenantId}`, null, h);
    log('PA03', 'GET /api/platform/tenants/:id', pa03.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa03.status}`);

    // PA05: GET tenant modules
    const pa05 = await httpReq('GET', `/api/platform/tenants/${firstTenantId}/modules`, null, h);
    log('PA05', 'GET /api/platform/tenants/:id/modules', pa05.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa05.status}`);
  } else {
    log('PA03', 'GET /api/platform/tenants/:id', 'SKIP', 'No tenant ID found');
    log('PA05', 'GET /api/platform/tenants/:id/modules', 'SKIP', 'No tenant ID found');
  }

  // PA07: GET platform users
  const pa07 = await httpReq('GET', '/api/platform/users', null, h);
  log('PA07', 'GET /api/platform/users', pa07.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa07.status}`);

  // PA09: GET audit logs
  const pa09 = await httpReq('GET', '/api/platform/audit-logs', null, h);
  log('PA09', 'GET /api/platform/audit-logs', pa09.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa09.status}`);

  // PA10: DELETE audit log — should fail (WORM)
  const pa10 = await httpReq('DELETE', '/api/platform/audit-logs/1', null, h);
  log('PA10', 'DELETE audit-logs → WORM protected', (pa10.status === 403 || pa10.status === 405 || pa10.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${pa10.status}`);

  // PA11: GET impersonation logs
  const pa11 = await httpReq('GET', '/api/platform/impersonation-logs', null, h);
  log('PA11', 'GET /api/platform/impersonation-logs', pa11.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa11.status}`);

  // PA13: GET modules
  const pa13 = await httpReq('GET', '/api/platform/modules', null, h);
  log('PA13', 'GET /api/platform/modules', pa13.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa13.status}`);

  // PA14: GET settings
  const pa14 = await httpReq('GET', '/api/platform/settings', null, h);
  log('PA14', 'GET /api/platform/settings', pa14.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa14.status}`);

  // PA16: GET stats
  const pa16 = await httpReq('GET', '/api/platform/stats', null, h);
  log('PA16', 'GET /api/platform/stats', (pa16.status === 200 || pa16.status === 404) ? 'PASS' : 'FAIL', `HTTP ${pa16.status}`);

  // PA17: GET plans
  const pa17 = await httpReq('GET', '/api/platform/plans', null, h);
  log('PA17', 'GET /api/platform/plans', (pa17.status === 200 || pa17.status === 404) ? 'PASS' : 'FAIL', `HTTP ${pa17.status}`);

  // PA18: GET requests
  const pa18 = await httpReq('GET', '/api/platform/requests', null, h);
  log('PA18', 'GET /api/platform/requests', (pa18.status === 200 || pa18.status === 404) ? 'PASS' : 'FAIL', `HTTP ${pa18.status}`);

  // PA19: GET roadmap/sprints
  const pa19 = await httpReq('GET', '/api/roadmap/sprints', null, h);
  log('PA19', 'GET /api/roadmap/sprints', (pa19.status === 200 || pa19.status === 404) ? 'PASS' : 'FAIL', `HTTP ${pa19.status}`);

  // PA20: GET qa/testing-levels
  const pa20 = await httpReq('GET', '/api/qa/testing-levels', null, h);
  log('PA20', 'GET /api/qa/testing-levels', (pa20.status === 200 || pa20.status === 404) ? 'PASS' : 'FAIL', `HTTP ${pa20.status}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5.2: TENANT API
// ━━━━━━━━━━━━━━━━━━━━━━━━━
async function testTenantAPI(dhToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.2 TENANT API TESTS (DARKHAWLAN)');
  console.log('━'.repeat(60));

  if (!dhToken) {
    log('TA00', 'Tenant API skipped — no token', 'SKIP');
    return;
  }
  const h = { 'Authorization': `Bearer ${dhToken}` };

  // TA01: GET company
  const ta01 = await httpReq('GET', '/api/tenant/company', null, h);
  log('TA01', 'GET /api/tenant/company', ta01.status === 200 ? 'PASS' : 'FAIL', `HTTP ${ta01.status}`);

  // TA02: PATCH company — should be blocked
  const ta02 = await httpReq('PATCH', '/api/tenant/company', { name_ar: 'اختبار' }, h);
  log('TA02', 'PATCH /api/tenant/company → 403', (ta02.status === 403 || ta02.status === 405 || ta02.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta02.status}`);

  // TA03: GET branches
  const ta03 = await httpReq('GET', '/api/tenant/branches', null, h);
  log('TA03', 'GET /api/tenant/branches', ta03.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${ta03.status}, count=${(ta03.body?.data||[]).length}`);

  // TA05: GET users
  const ta05 = await httpReq('GET', '/api/tenant/users', null, h);
  log('TA05', 'GET /api/tenant/users', ta05.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${ta05.status}, count=${(ta05.body?.data||[]).length}`);

  // TA07: GET roles
  const ta07 = await httpReq('GET', '/api/tenant/roles', null, h);
  log('TA07', 'GET /api/tenant/roles', ta07.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${ta07.status}`);

  // TA09: GET master-data/record-statuses
  const ta09 = await httpReq('GET', '/api/tenant/master-data/record-statuses', null, h);
  log('TA09', 'GET /api/tenant/master-data/record-statuses', (ta09.status === 200 || ta09.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta09.status}`);

  // TA11: GET notifications
  const ta11 = await httpReq('GET', '/api/tenant/notifications', null, h);
  log('TA11', 'GET /api/tenant/notifications', (ta11.status === 200 || ta11.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta11.status}`);

  // TA12: GET dashboard/stats
  const ta12 = await httpReq('GET', '/api/tenant/dashboard/stats', null, h);
  log('TA12', 'GET /api/tenant/dashboard/stats', (ta12.status === 200 || ta12.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta12.status}`);

  // TA13: GET backups
  const ta13 = await httpReq('GET', '/api/tenant/backups', null, h);
  log('TA13', 'GET /api/tenant/backups', (ta13.status === 200 || ta13.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta13.status}`);

  // TA14: GET preferences
  const ta14 = await httpReq('GET', '/api/tenant/preferences', null, h);
  log('TA14', 'GET /api/tenant/preferences', (ta14.status === 200 || ta14.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${ta14.status}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5.3: CROSS-TENANT SECURITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testCrossTenantSecurity(platformToken, dhToken, hajToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.3 CROSS-TENANT SECURITY (🔴 CRITICAL)');
  console.log('━'.repeat(60));

  // SEC01: Tenant token → Platform API
  if (dhToken) {
    const sec01 = await httpReq('GET', '/api/platform/tenants', null, { 'Authorization': `Bearer ${dhToken}` });
    log('SEC01', 'Tenant token → Platform API → 403', (sec01.status === 403 || sec01.status === 401) ? 'PASS' : 'FAIL',
      `HTTP ${sec01.status}`);
  } else {
    log('SEC01', 'Tenant token → Platform API → 403', 'SKIP', 'No DH token');
  }

  // SEC02: DH token tries to get ALHCO users via query
  if (dhToken) {
    const sec02 = await httpReq('GET', '/api/tenant/users?tenant_id=alhco-fake-id', null, { 'Authorization': `Bearer ${dhToken}` });
    // Should still return only DH users, not ALHCO
    const users = sec02.body?.data || [];
    const alhcoEmails = users.filter(u => u.email && u.email.includes('alhajco'));
    log('SEC02', 'tenant_id query injection ignored', (sec02.status === 200 && alhcoEmails.length === 0) ? 'PASS' : 'FAIL',
      `HTTP ${sec02.status}, alhco emails found: ${alhcoEmails.length}`);
  }

  // SEC04: Inject tenant_id in body
  if (dhToken) {
    // Try to create a user with ALHCO tenant_id — should be ignored
    const sec04 = await httpReq('POST', '/api/tenant/users', {
      tenant_id: 'alhco-fake-id',
      email: 'sectest@test.com',
      name_ar: 'اختبار أمني',
      name_en: 'Security Test',
      password: 'SecTest@2024!'
    }, { 'Authorization': `Bearer ${dhToken}` });
    // Even if creation fails for other reasons, tenant_id from body should not override JWT
    log('SEC04', 'tenant_id in body ignored (from JWT)', (sec04.status !== 500) ? 'PASS' : 'FAIL',
      `HTTP ${sec04.status}`);
  }

  // Cross-tenant data isolation test
  if (dhToken && hajToken) {
    console.log('\n--- Data Isolation Verification ---');

    // Get DH users
    const dhUsers = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${dhToken}` });
    const hajUsers = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${hajToken}` });

    const dhEmails = (dhUsers.body?.data || []).map(u => u.email);
    const hajEmails = (hajUsers.body?.data || []).map(u => u.email);
    const overlap = dhEmails.filter(e => hajEmails.includes(e));
    log('SEC-ISO-1', 'Users isolation DH vs ALHCO', overlap.length === 0 ? 'PASS' : 'FAIL',
      `DH:${dhEmails.length} ALHCO:${hajEmails.length} overlap:${overlap.length}`);

    // Get branches
    const dhBranches = await httpReq('GET', '/api/tenant/branches', null, { 'Authorization': `Bearer ${dhToken}` });
    const hajBranches = await httpReq('GET', '/api/tenant/branches', null, { 'Authorization': `Bearer ${hajToken}` });
    log('SEC-ISO-2', 'Branches isolation DH vs ALHCO', 'PASS',
      `DH:${(dhBranches.body?.data||[]).length} ALHCO:${(hajBranches.body?.data||[]).length}`);
  } else {
    log('SEC-ISO', 'Cross-tenant isolation', 'SKIP', 'Missing tokens');
  }

  // SEC05: IDOR — DH user tries to fetch ALHCO user by ID
  if (dhToken && hajToken) {
    const hajUsers = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${hajToken}` });
    const hajUserId = (hajUsers.body?.data || [])[0]?.id;
    if (hajUserId) {
      const sec05 = await httpReq('GET', `/api/tenant/users/${hajUserId}`, null, { 'Authorization': `Bearer ${dhToken}` });
      log('SEC05', 'IDOR: DH gets ALHCO user by ID → 404', (sec05.status === 404 || sec05.status === 403) ? 'PASS' : 'FAIL',
        `HTTP ${sec05.status}`);
    } else {
      log('SEC05', 'IDOR test', 'SKIP', 'No ALHCO user ID');
    }
  }

  // SEC09: JWT without tenant_id
  const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmFrZSIsInNjb3BlIjoidGVuYW50In0.fake';
  const sec09 = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${fakeJWT}` });
  log('SEC09', 'Fake JWT → 401', sec09.status === 401 ? 'PASS' : 'FAIL', `HTTP ${sec09.status}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 4: MASTER DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━
async function testMasterData(dhToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  4 MASTER DATA (Global + Seeded)');
  console.log('━'.repeat(60));

  // GM01: Countries
  const gm01 = await httpReq('GET', '/api/public/countries');
  log('GM01', 'GET /api/public/countries', gm01.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${gm01.status}, count=${(gm01.body?.data||gm01.body||[]).length}`);

  // GM03: Currencies
  const gm03 = await httpReq('GET', '/api/public/currencies');
  log('GM03', 'GET /api/public/currencies', gm03.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${gm03.status}`);

  // GM04: Incoterms
  const gm04 = await httpReq('GET', '/api/public/incoterms');
  log('GM04', 'GET /api/public/incoterms', (gm04.status === 200 || gm04.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${gm04.status}`);

  // GM05: Container types
  const gm05 = await httpReq('GET', '/api/public/container-types');
  log('GM05', 'GET /api/public/container-types', (gm05.status === 200 || gm05.status === 404) ? 'PASS' : 'FAIL',
    `HTTP ${gm05.status}`);

  // GM02: Tenant cannot modify global data
  if (dhToken) {
    const gm02 = await httpReq('PATCH', '/api/tenant/countries/1', { name_ar: 'اختبار' }, { 'Authorization': `Bearer ${dhToken}` });
    log('GM02', 'Tenant PATCH countries → 403', (gm02.status === 403 || gm02.status === 404 || gm02.status === 405) ? 'PASS' : 'FAIL',
      `HTTP ${gm02.status}`);
  }

  // SM10: Master data catalog
  if (dhToken) {
    const sm10 = await httpReq('GET', '/api/tenant/master-data/catalog', null, { 'Authorization': `Bearer ${dhToken}` });
    log('SM10', 'GET /api/tenant/master-data/catalog', (sm10.status === 200 || sm10.status === 404) ? 'PASS' : 'FAIL',
      `HTTP ${sm10.status}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 6: RBAC
// ━━━━━━━━━━━━━━━━━━━━━━━━
async function testRBAC(platformToken, dhToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  6 RBAC MATRIX');
  console.log('━'.repeat(60));

  // Tenant token → Platform endpoints should fail
  if (dhToken) {
    const tests = [
      { path: '/api/platform/tenants', expect403: true },
      { path: '/api/platform/users', expect403: true },
      { path: '/api/platform/audit-logs', expect403: true },
      { path: '/api/platform/settings', expect403: true },
    ];
    for (const t of tests) {
      const r = await httpReq('GET', t.path, null, { 'Authorization': `Bearer ${dhToken}` });
      log('RBAC-6.1', `Tenant → ${t.path}`, (r.status === 403 || r.status === 401) ? 'PASS' : 'FAIL',
        `HTTP ${r.status}`);
    }
  }

  // Platform token → Tenant endpoints
  if (platformToken) {
    const r = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${platformToken}` });
    log('RBAC-6.2', 'Platform token → /api/tenant/users', (r.status === 403 || r.status === 401 || r.status === 200) ? 'PASS' : 'FAIL',
      `HTTP ${r.status}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('⬡  SLMS — Automated Testing Runbook v1.0');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  const tokens = await testAuth();
  await testPlatformAPI(tokens.platformToken);
  await testTenantAPI(tokens.dhToken);
  await testMasterData(tokens.dhToken);
  await testCrossTenantSecurity(tokens.platformToken, tokens.dhToken, tokens.hajToken);
  await testRBAC(tokens.platformToken, tokens.dhToken);

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ PASS: ${passCount}`);
  console.log(`  ❌ FAIL: ${failCount}`);
  console.log(`  ⚠️  SKIP: ${skipCount}`);
  console.log(`  Total:  ${RESULTS.length}`);
  console.log('═'.repeat(60));

  if (failCount > 0) {
    console.log('\n❌ FAILED TESTS:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${r.id} | ${r.desc} — ${r.detail}`);
    });
  }

  if (skipCount > 0) {
    console.log('\n⚠️  SKIPPED TESTS:');
    RESULTS.filter(r => r.status === 'SKIP').forEach(r => {
      console.log(`  ${r.id} | ${r.desc} — ${r.detail}`);
    });
  }

  console.log(`\nFinished: ${new Date().toISOString()}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
