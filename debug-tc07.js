const http = require('http');
const BASE = 'http://localhost:4000';

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    if (body && Object.keys(body).length) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const login = await req('POST', '/api/auth/login', { email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!' });
  const token = login.body.data?.accessToken || login.body.accessToken;
  console.log('Token:', token ? 'OK' : 'FAIL');

  // TC07 wizard creation - verbose
  const r = await req('POST', '/api/platform/tenant-wizard/create', {
    company_name: 'Test QA Co DEBUG',
    company_code: 'DBGQA01',
    domain: 'dbgqa01.example.com',
    admin_email: 'admin@dbgqa01.com',
    admin_name: 'Debug Admin',
    admin_password: 'P@ssw0rd123!',
    plan_code: 'basic',
    modules: ['core', 'auth']
  }, token);
  console.log('TC07 status:', r.status);
  console.log('TC07 body:', JSON.stringify(r.body, null, 2));

  // IMP04 debug - end impersonation
  console.log('\n--- IMP04 Debug ---');
  // First start impersonation
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_pass@postgres:5432/slms_db' });
  const tenantUser = await pool.query("SELECT u.id, u.email, u.tenant_id FROM users u WHERE u.tenant_id IS NOT NULL AND u.deleted_at IS NULL LIMIT 1");
  const targetUserId = tenantUser.rows[0]?.id;
  const targetTenantId = tenantUser.rows[0]?.tenant_id;
  console.log('Target user:', targetUserId, tenantUser.rows[0]?.email, 'tenant:', targetTenantId);

  const imp = await req('POST', '/api/platform/impersonation/start', {
    tenant_id: targetTenantId,
    target_user_id: targetUserId,
    reason: 'Debug test'
  }, token);
  console.log('IMP start status:', imp.status);
  const impToken = imp.body.data?.impersonation_token || imp.body.data?.token;
  console.log('Got impersonation token:', impToken ? 'YES' : 'NO');

  if (impToken) {
    // Try ending with the impersonation token
    const end1 = await req('POST', '/api/platform/impersonation/end', {}, impToken);
    console.log('End with imp token:', end1.status, JSON.stringify(end1.body));

    // Try ending with the platform token
    const end2 = await req('POST', '/api/platform/impersonation/end', {}, token);
    console.log('End with platform token:', end2.status, JSON.stringify(end2.body));
  }

  await pool.end();
}
main().catch(e => console.error(e));
