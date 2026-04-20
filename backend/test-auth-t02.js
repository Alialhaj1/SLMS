// T02: Tenant User Login Tests
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres', port: 5432, user: 'slms',
  password: process.env.PGPASSWORD || 'slms_pass',
  database: 'slms_db'
});

function postLogin(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b), raw: b }); }
        catch(e) { resolve({ status: res.statusCode, body: null, raw: b }); }
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function main() {
  // ═══ T02-01: Successful tenant login ═══
  console.log('═══ T02-01: Tenant login ناجح ═══');
  let r = await postLogin({ email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'DARKHAWLAN' });
  console.log(`  Status: ${r.status}`);
  console.log(`  access_token: ${!!r.body?.data?.accessToken}`);
  console.log(`  tenant_id: ${r.body?.data?.user?.tenant_id}`);
  console.log(`  login_context: ${r.body?.data?.user?.login_context}`);
  console.log(`  roles: ${r.body?.data?.user?.roles}`);
  console.log(`  PASS: ${r.status === 200 && r.body?.data?.user?.tenant_id === 8 && r.body?.data?.user?.login_context === 'tenant'}`);
  console.log();

  // ═══ T02-02: JWT isolation check ═══
  console.log('═══ T02-02: JWT عزل التحقق ═══');
  if (r.body?.data?.accessToken) {
    const parts = r.body.data.accessToken.split('.');
    let payload = parts[1];
    while (payload.length % 4) payload += '=';
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log(`  JWT tenant_id: ${decoded.tenant_id}`);
    console.log(`  JWT tid: ${decoded.tid}`);
    console.log(`  JWT scope: ${decoded.scope}`);
    console.log(`  JWT login_context: ${decoded.login_context}`);
    console.log(`  JWT roles: ${decoded.roles}`);
    console.log(`  Contains tenant_id: ${!!decoded.tenant_id}`);
    console.log(`  No platform scope: ${decoded.scope !== 'platform'}`);
    console.log(`  PASS: ${decoded.tenant_id === 8 && decoded.scope === 'tenant'}`);
  }
  console.log();

  // ═══ T02-03: Wrong company code ═══
  console.log('═══ T02-03: Company Code خاطئ ═══');
  r = await postLogin({ email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'FAKE999' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${r.body?.message || 'N/A'}`);
  console.log(`  Error code: ${r.body?.code || r.body?.error || 'N/A'}`);
  console.log(`  Generic (no details): ${!(r.body?.message || '').includes('FAKE999')}`);
  console.log(`  PASS: ${r.status === 401 || r.status === 404}`);
  console.log();

  // ═══ T02-04: Email belongs to different tenant ═══
  console.log('═══ T02-04: Email@darkhawlan مع code=ALHCO ═══');
  r = await postLogin({ email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'ALHCO' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || 'N/A').substring(0, 100)}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 401}`);
  console.log();

  // ═══ T02-05: Platform context with tenant credentials ═══
  console.log('═══ T02-05: context=platform مع Tenant credentials ═══');
  // Tenant user without tenant_code → should get TENANT_LOGIN_REQUIRED
  r = await postLogin({ email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || 'N/A').substring(0, 100)}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 401 || r.status === 403}`);
  console.log();

  // ═══ T02-06: Inactive user ═══
  console.log('═══ T02-06: مستخدم معطّل (status=inactive) ═══');
  // Create a temp inactive user
  await pool.query(`
    INSERT INTO users (email, password, full_name, tenant_id, status)
    VALUES ('inactive@darkhawlan.com', '$2a$12$PAsrAJ/faBvz3dummy123456789012345678901234567890', 'Inactive User', 8, 'disabled')
    ON CONFLICT (email) DO UPDATE SET status = 'disabled'
  `);
  // Hash the password properly using bcrypt inside node
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('Test@123', 12);
  await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'inactive@darkhawlan.com']);
  
  r = await postLogin({ email: 'inactive@darkhawlan.com', password: 'Test@123', tenant_code: 'DARKHAWLAN' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || 'N/A').substring(0, 100)}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 403}`);
  console.log();

  // ═══ T02-07: Suspended user ═══
  console.log('═══ T02-07: مستخدم موقوف (status=suspended) ═══');
  await pool.query(`
    INSERT INTO users (email, password, full_name, tenant_id, status)
    VALUES ('suspended@darkhawlan.com', $1, 'Suspended User', 8, 'suspended')
    ON CONFLICT (email) DO UPDATE SET status = 'suspended', password = $1
  `, [hash]);

  r = await postLogin({ email: 'suspended@darkhawlan.com', password: 'Test@123', tenant_code: 'DARKHAWLAN' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || 'N/A').substring(0, 100)}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 403}`);
  console.log();

  // ═══ T02-08: must_change_password flag ═══
  console.log('═══ T02-08: must_change_password=true ═══');
  await pool.query(`
    INSERT INTO users (email, password, full_name, tenant_id, status, must_change_password)
    VALUES ('newuser@darkhawlan.com', $1, 'New User', 8, 'active', true)
    ON CONFLICT (email) DO UPDATE SET must_change_password = true, password = $1, status = 'active'
  `, [hash]);

  r = await postLogin({ email: 'newuser@darkhawlan.com', password: 'Test@123', tenant_code: 'DARKHAWLAN' });
  console.log(`  Status: ${r.status}`);
  console.log(`  must_change_password flag: ${r.body?.data?.must_change_password ?? r.body?.data?.user?.must_change_password ?? 'NOT FOUND'}`);
  console.log(`  temp_token present: ${!!(r.body?.data?.temp_token || r.body?.data?.accessToken)}`);
  console.log(`  redirect: ${r.body?.data?.redirect || 'N/A'}`);
  console.log(`  PASS: ${r.status === 200 && (r.body?.data?.must_change_password || r.body?.data?.redirect)}`);
  console.log();

  // Cleanup test users
  await pool.query("DELETE FROM users WHERE email IN ('inactive@darkhawlan.com', 'suspended@darkhawlan.com', 'newuser@darkhawlan.com')");

  await pool.end();
  console.log('═══ T02 Complete ═══');
}

main().catch(e => { console.error(e); process.exit(1); });
