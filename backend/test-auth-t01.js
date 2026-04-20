// T01-05 through T01-08 + SQL injection + XSS tests
const http = require('http');

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
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // ═══ T01-03: Wrong password (re-verify via node) ═══
  console.log('═══ T01-03: Wrong password ═══');
  let r = await postLogin({ email: 'admin@slms.sa', password: 'WrongPass123!' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${r.body?.message || r.body?.error || 'N/A'}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log();

  // ═══ T01-04: Non-existent email ═══
  console.log('═══ T01-04: Non-existent email ═══');
  r = await postLogin({ email: 'nonexistent@random.xyz', password: 'Whatever@123' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${r.body?.message || r.body?.error || 'N/A'}`);
  console.log(`  Same generic msg (no "user not found"): ${!r.raw.toLowerCase().includes('not found') && !r.raw.includes('غير موجود')}`);
  console.log();

  // ═══ T01-05: 5 failed attempts → account lockout ═══
  console.log('═══ T01-05: 5 failed attempts → lockout ═══');
  // First reset the failed count for admin@slms.sa
  for (let i = 1; i <= 6; i++) {
    r = await postLogin({ email: 'admin@slms.sa', password: 'WrongPass!' });
    console.log(`  Attempt ${i}: Status=${r.status} | Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 80)}`);
    if (r.status === 423 || (r.body?.message || '').toLowerCase().includes('lock')) {
      console.log('  >>> Account LOCKED detected!');
      break;
    }
  }
  console.log();

  // ═══ T01-06: Login after lockout with correct password ═══
  console.log('═══ T01-06: Correct password while locked ═══');
  r = await postLogin({ email: 'admin@slms.sa', password: 'PlatformAdmin@2024!' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 100)}`);
  console.log(`  Expected: 423 or 401 with lock message`);
  console.log();

  // ═══ T01-07: SQL Injection in Email ═══
  console.log('═══ T01-07: SQL Injection in Email ═══');
  r = await postLogin({ email: "admin@slms.sa' OR '1'='1", password: 'test' });
  console.log(`  Status: ${r.status}`);
  console.log(`  SQL executed: ${r.status === 200 ? 'YES - VULNERABLE!' : 'NO - Safe'}`);
  console.log(`  Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 80)}`);
  
  // Also try UNION injection
  r = await postLogin({ email: "' UNION SELECT 1,2,3,4,5--", password: 'test' });
  console.log(`  UNION injection Status: ${r.status}`);
  console.log(`  UNION safe: ${r.status !== 200}`);
  console.log();

  // ═══ T01-08: XSS in Password ═══
  console.log('═══ T01-08: XSS in Password ═══');
  r = await postLogin({ email: 'admin@slms.sa', password: '<script>alert("xss")</script>' });
  console.log(`  Status: ${r.status}`);
  console.log(`  Response contains <script>: ${r.raw.includes('<script>')}`);
  console.log(`  XSS blocked: ${!r.raw.includes('<script>')}`);

  // Also test XSS in email
  r = await postLogin({ email: '<img src=x onerror=alert(1)>@test.com', password: 'test' });
  console.log(`  XSS in email Status: ${r.status}`);
  console.log(`  Response contains img tag: ${r.raw.includes('<img')}`);
  console.log();
}

main().catch(console.error);
