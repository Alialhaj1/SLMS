// Re-test all fixed scenarios
const http = require('http');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres', port: 5432, user: 'slms',
  password: process.env.PGPASSWORD || 'slms_pass',
  database: 'slms_db'
});

function httpReq(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'localhost', port: 4000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
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
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Reset admin@slms.sa
  await pool.query("UPDATE users SET status='active', failed_login_count=0, locked_until=NULL WHERE email='admin@slms.sa'");

  // ═══ RETEST: T01-05 — 5 failed attempts → lockout ═══
  console.log('═══ RETEST T01-05: 5 failed attempts → lockout ═══');
  for (let i = 1; i <= 6; i++) {
    const r = await httpReq('POST', '/api/auth/login', { email: 'admin@slms.sa', password: 'Wrong!' });
    console.log(`  Attempt ${i}: Status=${r.status} | Code=${r.body?.code || 'N/A'}`);
    if (r.status === 423) {
      console.log(`  >>> Account LOCKED at attempt ${i} with HTTP 423 ✅`);
      break;
    }
  }
  console.log();

  // ═══ RETEST: T01-06 — Correct password while locked ═══
  console.log('═══ RETEST T01-06: Correct password while locked ═══');
  let r = await httpReq('POST', '/api/auth/login', { email: 'admin@slms.sa', password: 'PlatformAdmin@2024!' });
  console.log(`  Status: ${r.status} (expected 423)`);
  console.log(`  Code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 423}`);
  console.log();

  // Reset
  await pool.query("UPDATE users SET status='active', failed_login_count=0, locked_until=NULL WHERE email='admin@slms.sa'");

  // ═══ RETEST: T02-03 — Wrong company code ═══
  console.log('═══ RETEST T02-03: Company Code خاطئ ═══');
  r = await httpReq('POST', '/api/auth/login', { email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'FAKE999' });
  console.log(`  Status: ${r.status} (expected 401)`);
  console.log(`  Message: ${r.body?.message || 'N/A'}`);
  console.log(`  Generic (no company name leak): ${!(r.body?.message || '').includes('FAKE999')}`);
  console.log(`  PASS: ${r.status === 401}`);
  console.log();

  // ═══ RETEST: T02-05 — Tenant user without tenant_code ═══
  console.log('═══ RETEST T02-05: Tenant credentials بدون tenant_code ═══');
  r = await httpReq('POST', '/api/auth/login', { email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!' });
  console.log(`  Status: ${r.status} (expected 401)`);
  console.log(`  Code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS: ${r.status === 401}`);
  console.log();

  // ═══ RETEST: T02-07 — Suspended user ═══
  console.log('═══ RETEST T02-07: مستخدم موقوف (suspended) ═══');
  const hash = await bcrypt.hash('Test@123', 12);
  await pool.query(`
    INSERT INTO users (email, password, full_name, tenant_id, status)
    VALUES ('suspended@darkhawlan.com', $1, 'Suspended User', 8, 'suspended')
    ON CONFLICT (email) DO UPDATE SET status = 'suspended', password = $1, deleted_at = NULL
  `, [hash]);

  r = await httpReq('POST', '/api/auth/login', { email: 'suspended@darkhawlan.com', password: 'Test@123', tenant_code: 'DARKHAWLAN' });
  console.log(`  Status: ${r.status} (expected 403)`);
  console.log(`  Code: ${r.body?.code || 'N/A'}`);
  console.log(`  Message: ${r.body?.message || 'N/A'}`);
  console.log(`  PASS: ${r.status === 403}`);
  console.log();

  // Soft-delete test user
  await pool.query("UPDATE users SET deleted_at = NOW() WHERE email = 'suspended@darkhawlan.com'");

  await pool.end();
  console.log('═══ All retests complete ═══');
}

main().catch(e => { console.error(e); process.exit(1); });
