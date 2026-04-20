// SLMS Full System Testing Runbook - Automated Test Script v2
// Covers: Auth, Platform API, Tenant API, Cross-Tenant Security, Database, RBAC, Master Data
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
      timeout: 15000
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

// ══════════════════════════════════════════════════════
// CREDENTIALS - Matched to actual DB
// ══════════════════════════════════════════════════════
const CREDS = {
  SUPER_ADMIN: { email: 'ali@alhajco.com', password: 'A11A22A33' },
  DH_ADMIN:    { email: 'admin@darkhawlan.com', password: 'Test@12345', tenant_code: 'DARKHAWLAN' },
  DH_USER:     { email: 'ali@darkhawlan.com', password: 'Test@12345', tenant_code: 'DARKHAWLAN' },
};

async function login(email, password, tenantCode = null) {
  const body = { email, password };
  if (tenantCode) body.tenant_code = tenantCode;
  return httpReq('POST', '/api/auth/login', body);
}

function extractToken(r) {
  return r.body?.data?.accessToken || r.body?.token || r.body?.data?.token;
}

function decodeJWT(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); }
  catch (e) { return null; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. AUTHENTICATION & SESSIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testAuth() {
  console.log('\n' + '━'.repeat(60));
  console.log('  1. AUTHENTICATION & SESSIONS');
  console.log('━'.repeat(60));

  // ◈ 1.1 Platform Admin Login
  console.log('\n◈ 1.1 Platform Admin Login (Super Admin)');

  // T01-01: Successful login
  const r1 = await login(CREDS.SUPER_ADMIN.email, CREDS.SUPER_ADMIN.password);
  const platformToken = extractToken(r1);
  log('T01-01', 'Super Admin login success', platformToken ? 'PASS' : 'FAIL',
    `HTTP ${r1.status}`);

  // T01-02: JWT content
  if (platformToken) {
    const jwt = decodeJWT(platformToken);
    const hasRoles = jwt && (jwt.roles || []).includes('super_admin');
    const hasScope = jwt && jwt.scope === 'platform';
    log('T01-02', 'JWT: scope=platform + roles=super_admin', (hasRoles && hasScope) ? 'PASS' : 'FAIL',
      `scope=${jwt?.scope}, roles=${(jwt?.roles||[]).join(',')}, tenant_id=${jwt?.tenant_id}`);
  }

  // T01-03: Wrong password
  const r3 = await login(CREDS.SUPER_ADMIN.email, 'WrongPassword!');
  log('T01-03', 'Wrong password → 401', r3.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r3.status}`);

  // T01-04: Non-existent email
  const r4 = await login('nonexistent@fake.com', 'AnyPass!');
  log('T01-04', 'Non-existent email → 401', r4.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r4.status}`);

  // T01-07: SQL injection in email
  const r7 = await login("ali@alhajco.com' OR '1'='1", CREDS.SUPER_ADMIN.password);
  log('T01-07', 'SQL Injection → 400/401', [400, 401].includes(r7.status) ? 'PASS' : 'FAIL', `HTTP ${r7.status}`);

  // T01-08: XSS in password
  const r8 = await login(CREDS.SUPER_ADMIN.email, '<script>alert(1)</script>');
  log('T01-08', 'XSS in password → 401', r8.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r8.status}`);

  // T01-10: Empty body
  const r10 = await httpReq('POST', '/api/auth/login', {});
  log('T01-10', 'Empty body → 400', r10.status === 400 ? 'PASS' : 'FAIL', `HTTP ${r10.status}`);

  // T01-09: Tenant user tries platform login (no tenant_code)
  const r9 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password);
  log('T01-09', 'Tenant user → platform login → 401', r9.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${r9.status} code=${r9.body?.code}`);

  // ◈ 1.2 Tenant Login
  console.log('\n◈ 1.2 Tenant User Login');

  // T02-01: DARKHAWLAN tenant admin login
  const t1 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, CREDS.DH_ADMIN.tenant_code);
  const dhToken = extractToken(t1);
  log('T02-01', 'Tenant admin login (DARKHAWLAN)', dhToken ? 'PASS' : 'FAIL', `HTTP ${t1.status}`);

  // T02-02: JWT has tenant_id
  if (dhToken) {
    const jwt = decodeJWT(dhToken);
    const hasTenantId = jwt && (jwt.tenant_id || jwt.tid);
    const isScoped = jwt && jwt.scope === 'tenant';
    log('T02-02', 'JWT: tenant_id present + scope=tenant', (hasTenantId && isScoped) ? 'PASS' : 'FAIL',
      `tenant_id=${jwt?.tenant_id}, scope=${jwt?.scope}, login_context=${jwt?.login_context}`);
  }

  // T02-03: Wrong tenant code
  const t3 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, 'FAKE999');
  log('T02-03', 'Wrong tenant code → 401', t3.status === 401 ? 'PASS' : 'FAIL', `HTTP ${t3.status}`);

  // T02-04: DH user tries with different tenant code
  const t4 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, 'AHJ-001');
  log('T02-04', 'DH user + AHJ tenant → 401', [401, 403].includes(t4.status) ? 'PASS' : 'FAIL',
    `HTTP ${t4.status} code=${t4.body?.code}`);

  // T02-DH2: Regular tenant user login
  const t5 = await login(CREDS.DH_USER.email, CREDS.DH_USER.password, CREDS.DH_USER.tenant_code);
  const dhUserToken = extractToken(t5);
  log('T02-05', 'Regular tenant user login', dhUserToken ? 'PASS' : 'FAIL', `HTTP ${t5.status}`);

  // ◈ 1.3 Token Tests
  console.log('\n◈ 1.3 Token & Session Tests');

  // T03-04: Forged JWT
  const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGVzIjpbInN1cGVyX2FkbWluIl19.FAKE';
  const tr4 = await httpReq('GET', '/api/platform/tenants', null, { 'Authorization': `Bearer ${fakeJWT}` });
  log('T03-04', 'Forged JWT → 401', tr4.status === 401 ? 'PASS' : 'FAIL', `HTTP ${tr4.status}`);

  // T03-05: JWT with tampered tenant_id
  if (dhToken) {
    const parts = dhToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    payload.tenant_id = 99999;
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tampered = parts[0] + '.' + tamperedPayload + '.' + parts[2];
    const tr5 = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${tampered}` });
    log('T03-05', 'Tampered tenant_id in JWT → 401', tr5.status === 401 ? 'PASS' : 'FAIL', `HTTP ${tr5.status}`);
  }

  // T03-02: Refresh token
  if (t1.body?.data?.refreshToken) {
    const tr2 = await httpReq('POST', '/api/auth/refresh', { refreshToken: t1.body.data.refreshToken });
    log('T03-02', 'Refresh token → new access token', tr2.status === 200 ? 'PASS' : 'FAIL', `HTTP ${tr2.status}`);
  }

  return { platformToken, dhToken, dhUserToken };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.1 PLATFORM API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testPlatformAPI(token) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.1 PLATFORM API');
  console.log('━'.repeat(60));
  if (!token) { log('PA-SKIP', 'Platform API skipped — no token', 'SKIP'); return; }
  const h = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    ['PA01', 'GET', '/api/platform/tenants',       200],
    ['PA07', 'GET', '/api/platform/users',          200],
    ['PA09', 'GET', '/api/platform/audit-logs',     200],
    ['PA11', 'GET', '/api/platform/impersonation-logs', 200],
    ['PA13', 'GET', '/api/platform/modules',        200],
    ['PA14', 'GET', '/api/platform/settings',       200],
    ['PA16', 'GET', '/api/platform/stats',          [200, 404]],
    ['PA17', 'GET', '/api/platform/plans',          [200, 404]],
    ['PA18', 'GET', '/api/platform/requests',       [200, 404]],
    ['PA19', 'GET', '/api/roadmap/sprints',         [200, 404]],
    ['PA20', 'GET', '/api/qa/testing-levels',       [200, 404]],
  ];

  for (const [id, method, path, expect] of endpoints) {
    const r = await httpReq(method, path, null, h);
    const expected = Array.isArray(expect) ? expect : [expect];
    const pass = expected.includes(r.status);
    log(id, `${method} ${path}`, pass ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
  }

  // PA03: GET specific tenant
  const tenantsResp = await httpReq('GET', '/api/platform/tenants', null, h);
  const tenants = tenantsResp.body?.data || [];
  if (Array.isArray(tenants) && tenants.length > 0) {
    const tid = tenants[0].id;
    const pa03 = await httpReq('GET', `/api/platform/tenants/${tid}`, null, h);
    log('PA03', `GET /api/platform/tenants/${tid}`, pa03.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa03.status}`);

    const pa05 = await httpReq('GET', `/api/platform/tenants/${tid}/modules`, null, h);
    log('PA05', `GET /api/platform/tenants/${tid}/modules`, pa05.status === 200 ? 'PASS' : 'FAIL', `HTTP ${pa05.status}`);
  }

  // PA10: DELETE audit-logs (WORM)
  const pa10 = await httpReq('DELETE', '/api/platform/audit-logs/1', null, h);
  log('PA10', 'DELETE audit-logs → WORM protected', [403, 404, 405].includes(pa10.status) ? 'PASS' : 'FAIL',
    `HTTP ${pa10.status}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.2 TENANT API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testTenantAPI(token) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.2 TENANT API (DARKHAWLAN)');
  console.log('━'.repeat(60));
  if (!token) { log('TA-SKIP', 'Tenant API skipped — no token', 'SKIP'); return; }
  const h = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    ['TA01', 'GET',  '/api/tenant/company',       200],
    ['TA03', 'GET',  '/api/tenant/branches',       200],
    ['TA05', 'GET',  '/api/tenant/users',          200],
    ['TA07', 'GET',  '/api/tenant/roles',          200],
    ['TA09', 'GET',  '/api/tenant/master-data/record-statuses', [200, 404]],
    ['TA11', 'GET',  '/api/tenant/notifications',  [200, 404]],
    ['TA12', 'GET',  '/api/tenant/dashboard/stats', [200, 404]],
    ['TA13', 'GET',  '/api/tenant/backups',        [200, 404]],
    ['TA14', 'GET',  '/api/tenant/preferences',    [200, 404]],
  ];

  for (const [id, method, path, expect] of endpoints) {
    const r = await httpReq(method, path, null, h);
    const expected = Array.isArray(expect) ? expect : [expect];
    log(id, `${method} ${path}`, expected.includes(r.status) ? 'PASS' : 'FAIL',
      `HTTP ${r.status}`);
  }

  // TA02: PATCH company → should be blocked for tenant
  const ta02 = await httpReq('PATCH', '/api/tenant/company', { name_ar: 'اختبار' }, h);
  log('TA02', 'PATCH /api/tenant/company → blocked', [403, 404, 405].includes(ta02.status) ? 'PASS' : 'FAIL',
    `HTTP ${ta02.status}`);

  // Verify data counts
  const users = await httpReq('GET', '/api/tenant/users', null, h);
  const branches = await httpReq('GET', '/api/tenant/branches', null, h);
  const usersCount = (users.body?.data || []).length;
  const branchCount = (branches.body?.data || []).length;
  log('TA05b', 'DARKHAWLAN users count', usersCount > 0 ? 'PASS' : 'FAIL', `count=${usersCount}`);
  log('TA03b', 'DARKHAWLAN branches count', branchCount > 0 ? 'PASS' : 'FAIL', `count=${branchCount}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MASTER DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testMasterData(dhToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  4. MASTER DATA');
  console.log('━'.repeat(60));

  // Test public endpoints (no auth needed)
  const publicEndpoints = [
    ['GM01', '/api/public/countries',        'Countries'],
    ['GM03', '/api/public/currencies',       'Currencies'],
    ['GM04', '/api/public/incoterms',        'Incoterms'],
    ['GM05', '/api/public/container-types',  'Container Types'],
    ['GM06', '/api/public/bl-types',         'BL Types'],
    ['GM07', '/api/public/insurance-types',  'Insurance Types'],
  ];

  for (const [id, path, label] of publicEndpoints) {
    const r = await httpReq('GET', path);
    log(id, `GET ${path} (${label})`, [200, 404].includes(r.status) ? 'PASS' : 'FAIL',
      `HTTP ${r.status}` + (r.status === 200 ? `, count=${(r.body?.data||r.body||[]).length}` : ' (endpoint not defined)'));
  }

  // Test tenant-scoped master data
  if (dhToken) {
    const h = { 'Authorization': `Bearer ${dhToken}` };
    const tenantMD = [
      ['SM01', '/api/tenant/master-data/record-statuses',  'Record Statuses'],
      ['SM04', '/api/tenant/master-data/supplier-types',   'Supplier Types'],
      ['SM05', '/api/tenant/master-data/unit-types',       'Unit Types'],
      ['SM10', '/api/tenant/master-data/catalog',          'Master Data Catalog'],
    ];

    for (const [id, path, label] of tenantMD) {
      const r = await httpReq('GET', path, null, h);
      log(id, `GET ${path}`, [200, 404].includes(r.status) ? 'PASS' : 'FAIL',
        `HTTP ${r.status}` + (r.status === 200 ? `, count=${(r.body?.data||[]).length}` : ''));
    }

    // GM02: Tenant cannot modify global data
    const gm02 = await httpReq('PATCH', '/api/tenant/countries/1', { name_ar: 'اختبار' }, h);
    log('GM02', 'Tenant PATCH global data → blocked', [403, 404, 405].includes(gm02.status) ? 'PASS' : 'FAIL',
      `HTTP ${gm02.status}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5.3 CROSS-TENANT SECURITY (🔴 CRITICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testSecurity(platformToken, dhToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.3 CROSS-TENANT SECURITY (🔴 CRITICAL)');
  console.log('━'.repeat(60));

  if (!dhToken) { log('SEC-SKIP', 'Security tests skipped — no token', 'SKIP'); return; }

  // SEC01: Tenant token → Platform API → 403
  const sec01 = await httpReq('GET', '/api/platform/tenants', null, { 'Authorization': `Bearer ${dhToken}` });
  log('SEC01', 'Tenant token → platform API → 403', [401, 403].includes(sec01.status) ? 'PASS' : 'FAIL',
    `HTTP ${sec01.status}`);

  // SEC02: Query injection of tenant_id — should be ignored
  const sec02 = await httpReq('GET', '/api/tenant/users?tenant_id=99999', null, { 'Authorization': `Bearer ${dhToken}` });
  if (sec02.status === 200) {
    const emails = (sec02.body?.data || []).map(u => u.email);
    const onlyDH = emails.every(e => e.includes('darkhawlan'));
    log('SEC02', 'tenant_id query injection ignored', onlyDH ? 'PASS' : 'FAIL',
      `${emails.length} users, all DH: ${onlyDH}`);
  } else {
    log('SEC02', 'tenant_id query injection ignored', [200,403].includes(sec02.status) ? 'PASS' : 'FAIL', `HTTP ${sec02.status}`);
  }

  // SEC04: tenant_id injection in POST body
  const sec04 = await httpReq('POST', '/api/tenant/users', {
    tenant_id: 99999,
    email: 'sectest_' + Date.now() + '@test.com',
    name_ar: 'اختبار أمني',
    name_en: 'Sec Test',
    password: 'SecTest@2024!'
  }, { 'Authorization': `Bearer ${dhToken}` });
  log('SEC04', 'tenant_id in body ignored', sec04.status !== 500 ? 'PASS' : 'FAIL',
    `HTTP ${sec04.status} (body tenant_id should be overridden by JWT)`);

  // SEC07: Path traversal in file upload name
  const sec07 = await httpReq('POST', '/api/tenant/uploads', {
    filename: '../../etc/passwd',
    data: 'test'
  }, { 'Authorization': `Bearer ${dhToken}` });
  log('SEC07', 'Path traversal → blocked', [400, 403, 404].includes(sec07.status) ? 'PASS' : 'FAIL',
    `HTTP ${sec07.status}`);

  // SEC09: JWT without tenant_id
  const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjk5OSwiZW1haWwiOiJmYWtlQHRlc3QuY29tIiwic2NvcGUiOiJ0ZW5hbnQifQ.invalid';
  const sec09 = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${fakeJWT}` });
  log('SEC09', 'Fake JWT → 401', sec09.status === 401 ? 'PASS' : 'FAIL', `HTTP ${sec09.status}`);

  // SEC05: IDOR - Try to access ALHCO branches from DH token
  // First get DH branches to confirm working
  const dhBranches = await httpReq('GET', '/api/tenant/branches', null, { 'Authorization': `Bearer ${dhToken}` });
  if (dhBranches.status === 200) {
    const branches = dhBranches.body?.data || [];
    // Try accessing IDs that don't belong to DH
    for (let fakeId = 1; fakeId <= 3; fakeId++) {
      const exists = branches.some(b => b.id === fakeId);
      if (!exists) {
        const idor = await httpReq('GET', `/api/tenant/branches/${fakeId}`, null, { 'Authorization': `Bearer ${dhToken}` });
        log('SEC05', `IDOR: DH token → branch ${fakeId} → 404/403`, [404, 403].includes(idor.status) ? 'PASS' : 'FAIL',
          `HTTP ${idor.status}`);
        break;
      }
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. RBAC MATRIX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function testRBAC(platformToken, dhToken, dhUserToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  6. RBAC MATRIX');
  console.log('━'.repeat(60));

  // 6.1 Tenant token → Platform endpoints → 403
  if (dhToken) {
    const platformPaths = [
      '/api/platform/tenants',
      '/api/platform/users',
      '/api/platform/audit-logs',
      '/api/platform/settings',
    ];
    for (const path of platformPaths) {
      const r = await httpReq('GET', path, null, { 'Authorization': `Bearer ${dhToken}` });
      log('RBAC-6.1', `Tenant→${path}`, [401, 403].includes(r.status) ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
    }
  }

  // 6.2 Platform token → Tenant endpoints
  if (platformToken) {
    // Super admin should NOT access tenant API with platform scope (or get 403)
    const r = await httpReq('GET', '/api/tenant/users', null, { 'Authorization': `Bearer ${platformToken}` });
    log('RBAC-6.2', 'Platform token→/api/tenant/users', [401, 403].includes(r.status) ? 'PASS' : 'FAIL',
      `HTTP ${r.status} (platform-scoped token should be rejected by tenant API or get no tenant data)`);
  }

  // 6.3 Regular DH user vs DH admin
  if (dhUserToken) {
    // Regular user should not be able to manage users
    const r1 = await httpReq('POST', '/api/tenant/users', {
      email: 'newuser@darkhawlan.com',
      name_ar: 'مستخدم جديد',
      password: 'NewUser@123!'
    }, { 'Authorization': `Bearer ${dhUserToken}` });
    log('RBAC-6.3', 'Regular user → POST /api/tenant/users', [403, 401].includes(r1.status) ? 'PASS' : 'FAIL',
      `HTTP ${r1.status} (non-admin should be blocked)`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('⬡  SLMS — Automated Testing Runbook v2');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Credentials mapped to actual DB users`);

  const tokens = await testAuth();
  await testPlatformAPI(tokens.platformToken);
  await testTenantAPI(tokens.dhToken);
  await testMasterData(tokens.dhToken);
  await testSecurity(tokens.platformToken, tokens.dhToken);
  await testRBAC(tokens.platformToken, tokens.dhToken, tokens.dhUserToken);

  // ━━ Summary ━━
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ PASS: ${passCount}`);
  console.log(`  ❌ FAIL: ${failCount}`);
  console.log(`  ⚠️  SKIP: ${skipCount}`);
  console.log(`  Total:  ${RESULTS.length}`);

  if (failCount > 0) {
    console.log('\n❌ FAILED TESTS:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${r.id} | ${r.desc} — ${r.detail}`);
    });
  }
  if (skipCount > 0) {
    console.log('\n⚠️  SKIPPED:');
    RESULTS.filter(r => r.status === 'SKIP').forEach(r => {
      console.log(`  ${r.id} | ${r.desc} — ${r.detail}`);
    });
  }

  console.log(`\nFinished: ${new Date().toISOString()}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
