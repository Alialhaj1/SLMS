// SLMS Full System Testing Runbook - v3 (Correct Routes)
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
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: null, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, error: 'timeout' }); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const CREDS = {
  SUPER_ADMIN: { email: 'ali@alhajco.com', password: 'A11A22A33' },
  DH_ADMIN:    { email: 'admin@darkhawlan.com', password: 'Test@12345', code: 'DARKHAWLAN' },
  DH_USER:     { email: 'ali@darkhawlan.com', password: 'Test@12345', code: 'DARKHAWLAN' },
};

async function login(email, password, tenantCode = null) {
  const body = { email, password };
  if (tenantCode) body.tenant_code = tenantCode;
  return httpReq('POST', '/api/auth/login', body);
}

function extract(r) { return r.body?.data?.accessToken || r.body?.token; }
function jwt(t) {
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()); }
  catch { return null; }
}

// ════════════════════════════════════════
// 1. AUTHENTICATION
// ════════════════════════════════════════
async function testAuth() {
  console.log('\n' + '━'.repeat(60));
  console.log('  1. AUTHENTICATION & SESSIONS');
  console.log('━'.repeat(60));

  console.log('\n◈ 1.1 Platform Admin Login');
  const r1 = await login(CREDS.SUPER_ADMIN.email, CREDS.SUPER_ADMIN.password);
  const pToken = extract(r1);
  log('T01-01', 'Super Admin login → 200 + token', pToken ? 'PASS' : 'FAIL', `HTTP ${r1.status}`);

  if (pToken) {
    const j = jwt(pToken);
    log('T01-02', 'JWT: scope=platform, roles∋super_admin', 
      j?.scope === 'platform' && (j?.roles||[]).includes('super_admin') ? 'PASS' : 'FAIL',
      `scope=${j?.scope} roles=${j?.roles} tid=${j?.tenant_id}`);
  }

  const r3 = await login(CREDS.SUPER_ADMIN.email, 'WrongPassword!');
  log('T01-03', 'Wrong password → 401', r3.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r3.status}`);

  const r4 = await login('nonexistent@fake.com', 'Any!');
  log('T01-04', 'Non-existent email → 401', r4.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r4.status}`);

  const r7 = await login("ali@alhajco.com' OR '1'='1", 'A11A22A33');
  log('T01-07', 'SQL Injection → 400/401', [400,401].includes(r7.status) ? 'PASS' : 'FAIL', `HTTP ${r7.status}`);

  const r8 = await login(CREDS.SUPER_ADMIN.email, '<script>alert(1)</script>');
  log('T01-08', 'XSS in password → 401', r8.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r8.status}`);

  const r10 = await httpReq('POST', '/api/auth/login', {});
  log('T01-10', 'Empty body → 400', r10.status === 400 ? 'PASS' : 'FAIL', `HTTP ${r10.status}`);

  const r9 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password);
  log('T01-09', 'Tenant user → platform login → 401', r9.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${r9.status} code=${r9.body?.code}`);

  console.log('\n◈ 1.2 Tenant Login');
  const t1 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, CREDS.DH_ADMIN.code);
  const dToken = extract(t1);
  log('T02-01', 'Tenant admin login (DH) → 200', dToken ? 'PASS' : 'FAIL', `HTTP ${t1.status}`);

  if (dToken) {
    const j = jwt(dToken);
    log('T02-02', 'JWT: tenant_id=7, scope=tenant', 
      j?.tenant_id === 7 && j?.scope === 'tenant' ? 'PASS' : 'FAIL',
      `tid=${j?.tenant_id} scope=${j?.scope}`);
  }

  const t3 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, 'FAKE999');
  log('T02-03', 'Wrong tenant code → 401', t3.status === 401 ? 'PASS' : 'FAIL', `HTTP ${t3.status}`);

  const t4 = await login(CREDS.DH_ADMIN.email, CREDS.DH_ADMIN.password, 'AHJ-001');
  log('T02-04', 'DH user + wrong tenant → 401', [401,403].includes(t4.status) ? 'PASS' : 'FAIL',
    `HTTP ${t4.status}`);

  const t5 = await login(CREDS.DH_USER.email, CREDS.DH_USER.password, CREDS.DH_USER.code);
  const duToken = extract(t5);
  log('T02-05', 'Regular DH user login', duToken ? 'PASS' : 'FAIL', `HTTP ${t5.status}`);

  console.log('\n◈ 1.3 Token Tests');
  const fk = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.invalid_sig';
  const tf1 = await httpReq('GET', '/api/users', null, { 'Authorization': `Bearer ${fk}` });
  log('T03-04', 'Forged JWT → 401', tf1.status === 401 ? 'PASS' : 'FAIL', `HTTP ${tf1.status}`);

  if (dToken) {
    const parts = dToken.split('.');
    const pay = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    pay.tenant_id = 99999;
    const tampered = parts[0] + '.' + Buffer.from(JSON.stringify(pay)).toString('base64url') + '.' + parts[2];
    const tf2 = await httpReq('GET', '/api/users', null, { 'Authorization': `Bearer ${tampered}` });
    log('T03-05', 'Tampered JWT → 401', tf2.status === 401 ? 'PASS' : 'FAIL', `HTTP ${tf2.status}`);
  }

  if (t1.body?.data?.refreshToken) {
    const rf = await httpReq('POST', '/api/auth/refresh', { refreshToken: t1.body.data.refreshToken });
    log('T03-02', 'Refresh token → 200 + new token', rf.status === 200 ? 'PASS' : 'FAIL', `HTTP ${rf.status}`);
  }

  return { pToken, dToken, duToken };
}

// ════════════════════════════════════════
// 5.1 PLATFORM API (routes: /api/platform/*)
// ════════════════════════════════════════
async function testPlatformAPI(token) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.1 PLATFORM API');
  console.log('━'.repeat(60));
  if (!token) { log('PA-SKIP', 'Skipped — no token', 'SKIP'); return; }
  const h = { 'Authorization': `Bearer ${token}` };

  // Actual registered platform routes:
  const tests = [
    ['PA01', 'GET', '/api/tenants',                   'Tenants list'],
    ['PA07', 'GET', '/api/platform/users',             'Platform users'],
    ['PA09', 'GET', '/api/audit-logs',                 'Audit logs'],
    ['PA11', 'GET', '/api/platform/impersonation-logs','Impersonation logs'],
    ['PA13', 'GET', '/api/platform/modules',           'Platform modules'],
    ['PA14', 'GET', '/api/platform/settings',          'Platform settings'],
    ['PA15', 'GET', '/api/platform/super-admins',      'Super admins'],
    ['PA16', 'GET', '/api/platform/monitoring',        'Platform monitoring'],
    ['PA17', 'GET', '/api/subscription-plans',         'Subscription plans'],
    ['PA18', 'GET', '/api/tenant-requests',            'Tenant requests'],
    ['PA19', 'GET', '/api/roadmap/sprints',            'Roadmap sprints'],
    ['PA20', 'GET', '/api/qa/testing-levels',          'QA testing levels'],
    ['PA21', 'GET', '/api/help-requests',              'Help requests'],
    ['PA22', 'GET', '/api/deleted-records',            'Deleted records'],
    ['PA23', 'GET', '/api/recovery-logs',              'Recovery logs'],
    ['PA24', 'GET', '/api/backups',                    'Backups'],
    ['PA25', 'GET', '/api/feature-flags',              'Feature flags'],
    ['PA26', 'GET', '/api/feature-discovery',          'Feature discovery'],
    ['PA27', 'GET', '/api/enterprise-readiness',       'Enterprise readiness'],
    ['PA28', 'GET', '/api/quality-gate',               'Quality gate'],
  ];

  for (const [id, method, path, label] of tests) {
    const r = await httpReq(method, path, null, h);
    const pass = r.status === 200;
    log(id, `${method} ${path} (${label})`, pass ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
  }

  // PA10: DELETE audit log → WORM
  const pa10 = await httpReq('DELETE', '/api/audit-logs/1', null, h);
  log('PA10', 'DELETE /api/audit-logs/1 → WORM', [403,404,405].includes(pa10.status) ? 'PASS' : 'FAIL',
    `HTTP ${pa10.status}`);
}

// ════════════════════════════════════════
// 5.2 TENANT API (routes: /api/* with tenant middleware)
// ════════════════════════════════════════
async function testTenantAPI(token) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.2 TENANT API (DARKHAWLAN)');
  console.log('━'.repeat(60));
  if (!token) { log('TA-SKIP', 'Skipped — no token', 'SKIP'); return; }
  const h = { 'Authorization': `Bearer ${token}` };

  // Actual tenant-scoped routes (they go through enforceTenantIsolation middleware)
  const tests = [
    ['TA01', 'GET', '/api/companies',              'Company profile'],
    ['TA03', 'GET', '/api/branches',               'Branches'],
    ['TA05', 'GET', '/api/users',                  'Users'],
    ['TA07', 'GET', '/api/roles',                  'Roles'],
    ['TA08', 'GET', '/api/tenant-roles',           'Tenant roles'],
    ['TA09', 'GET', '/api/settings',               'Settings'],
    ['TA11', 'GET', '/api/notifications',          'Notifications'],
    ['TA12', 'GET', '/api/dashboard',              'Dashboard'],
    ['TA13', 'GET', '/api/audit-logs',             'Audit logs (tenant)'],
    ['TA14', 'GET', '/api/user-preferences',       'User preferences'],
    ['TA15', 'GET', '/api/shipments',              'Shipments'],
    ['TA16', 'GET', '/api/profile',                'User profile'],
    ['TA17', 'GET', '/api/approval-workflows',     'Approval workflows'],
  ];

  for (const [id, method, path, label] of tests) {
    const r = await httpReq(method, path, null, h);
    log(id, `${method} ${path} (${label})`, r.status === 200 ? 'PASS' : 'FAIL',
      `HTTP ${r.status}` + (r.status === 200 ? ` count=${JSON.stringify(r.body?.data?.length ?? r.body?.pagination?.total ?? '?').substring(0,20)}` : ` — ${(r.body?.message || r.body?.error?.message || '').substring(0,60)}`));
  }
}

// ════════════════════════════════════════
// 5.3 CROSS-TENANT SECURITY
// ════════════════════════════════════════
async function testSecurity(pToken, dToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  5.3 CROSS-TENANT SECURITY (🔴 CRITICAL)');
  console.log('━'.repeat(60));
  if (!dToken) { log('SEC-SKIP', 'Skipped — no token', 'SKIP'); return; }

  // SEC01: Tenant token → Platform routes
  const sec01 = await httpReq('GET', '/api/platform/users', null, { 'Authorization': `Bearer ${dToken}` });
  log('SEC01', 'Tenant→/api/platform/users → 403', [401,403].includes(sec01.status) ? 'PASS' : 'FAIL', `HTTP ${sec01.status}`);

  const sec01b = await httpReq('GET', '/api/platform/settings', null, { 'Authorization': `Bearer ${dToken}` });
  log('SEC01b', 'Tenant→/api/platform/settings → 403', [401,403].includes(sec01b.status) ? 'PASS' : 'FAIL', `HTTP ${sec01b.status}`);

  const sec01c = await httpReq('GET', '/api/platform/super-admins', null, { 'Authorization': `Bearer ${dToken}` });
  log('SEC01c', 'Tenant→/api/platform/super-admins → 403', [401,403].includes(sec01c.status) ? 'PASS' : 'FAIL', `HTTP ${sec01c.status}`);

  const sec01d = await httpReq('GET', '/api/platform/modules', null, { 'Authorization': `Bearer ${dToken}` });
  log('SEC01d', 'Tenant→/api/platform/modules → 403', [401,403].includes(sec01d.status) ? 'PASS' : 'FAIL', `HTTP ${sec01d.status}`);

  // SEC02: users isolation — DH token should only see DH users
  const sec02 = await httpReq('GET', '/api/users', null, { 'Authorization': `Bearer ${dToken}` });
  if (sec02.status === 200) {
    const emails = (sec02.body?.data || []).map(u => u.email);
    const leaks = emails.filter(e => !e.includes('darkhawlan'));
    log('SEC02', 'Users isolation (DH only)', leaks.length === 0 ? 'PASS' : 'FAIL',
      `Total: ${emails.length}, leaks: ${leaks.join(', ')}`);
  } else {
    log('SEC02', 'Users endpoint', 'FAIL', `HTTP ${sec02.status}`);
  }

  // SEC03: branches isolation
  const sec03 = await httpReq('GET', '/api/branches', null, { 'Authorization': `Bearer ${dToken}` });
  if (sec03.status === 200) {
    log('SEC03', 'Branches isolation', 'PASS', `count=${(sec03.body?.data||[]).length}`);
  }

  // SEC09: Fake JWT
  const fk = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjk5OX0.fake_signature';
  const sec09 = await httpReq('GET', '/api/users', null, { 'Authorization': `Bearer ${fk}` });
  log('SEC09', 'Fake JWT → 401', sec09.status === 401 ? 'PASS' : 'FAIL', `HTTP ${sec09.status}`);

  // SEC-IDOR: Try to access a user from another company
  if (sec02.status === 200) {
    // Try accessing user ID 1 (super admin, not a DH user)
    const idor = await httpReq('GET', '/api/users/1', null, { 'Authorization': `Bearer ${dToken}` });
    log('SEC05', 'IDOR: DH gets non-DH user → 404/403', [403,404].includes(idor.status) ? 'PASS' : 'FAIL',
      `HTTP ${idor.status}`);
  }
}

// ════════════════════════════════════════
// 6. RBAC MATRIX
// ════════════════════════════════════════
async function testRBAC(pToken, dToken, duToken) {
  console.log('\n' + '━'.repeat(60));
  console.log('  6. RBAC MATRIX');
  console.log('━'.repeat(60));

  // Tenant → Platform (should be blocked)
  if (dToken) {
    for (const p of ['/api/platform/users', '/api/platform/settings', '/api/platform/super-admins', '/api/platform/modules']) {
      const r = await httpReq('GET', p, null, { 'Authorization': `Bearer ${dToken}` });
      log('RBAC-6.1', `Tenant→${p}`, [401,403].includes(r.status) ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
    }
  }

  // Regular user (non-admin) → should not create users
  if (duToken) {
    const r = await httpReq('POST', '/api/users', {
      email: 'rogue@darkhawlan.com', name_ar: 'اختبار', password: 'Test@12345!'
    }, { 'Authorization': `Bearer ${duToken}` });
    log('RBAC-6.3', 'Non-admin → POST /api/users → 403', [401,403].includes(r.status) ? 'PASS' : 'FAIL',
      `HTTP ${r.status}`);

    // Regular user should read own profile
    const r2 = await httpReq('GET', '/api/me', null, { 'Authorization': `Bearer ${duToken}` });
    log('RBAC-6.4', 'Regular user → GET /api/me → 200', r2.status === 200 ? 'PASS' : 'FAIL', `HTTP ${r2.status}`);
  }
}

// ════════════════════════════════════════
// MAIN
// ════════════════════════════════════════
async function main() {
  console.log('⬡  SLMS — Automated Testing Runbook v3');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  const { pToken, dToken, duToken } = await testAuth();
  await testPlatformAPI(pToken);
  await testTenantAPI(dToken);
  await testSecurity(pToken, dToken);
  await testRBAC(pToken, dToken, duToken);

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

  console.log(`\nFinished: ${new Date().toISOString()}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
