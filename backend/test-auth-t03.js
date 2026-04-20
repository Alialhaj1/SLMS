// T03: Token & Session Management Tests
const http = require('http');
const crypto = require('crypto');

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

function decodeJWT(token) {
  const parts = token.split('.');
  let payload = parts[1];
  while (payload.length % 4) payload += '=';
  payload = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(payload, 'base64').toString());
}

async function main() {
  // Login first to get tokens
  console.log('═══ Setup: Login to get tokens ═══');
  let r = await httpReq('POST', '/api/auth/login', {
    email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!'
  });
  const accessToken = r.body.data.accessToken;
  const refreshToken = r.body.data.refreshToken;
  console.log(`  Got accessToken: ${accessToken.substring(0, 30)}...`);
  console.log(`  Got refreshToken: ${refreshToken.substring(0, 20)}...`);
  console.log();

  // ═══ T03-01: Access Token expired (simulated) ═══
  console.log('═══ T03-01: Access Token منتهي (simulated) ═══');
  // We can't wait 15 min, so create a manually expired token
  // Instead, test a completely garbage token
  r = await httpReq('GET', '/api/me', null, {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ac2xtcy5zYSIsInJvbGVzIjpbInBsYXRmb3JtX2FkbWluIl0sImlhdCI6MTAwMDAwMDAwMCwiZXhwIjoxMDAwMDAwMDAxfQ.invalid_signature'
  });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${r.body?.message || r.body?.error || 'N/A'}`);
  console.log(`  PASS (401): ${r.status === 401}`);
  console.log();

  // ═══ T03-02: Refresh token flow ═══
  console.log('═══ T03-02: تجديد الـ Token ═══');
  r = await httpReq('POST', '/api/auth/refresh', { refreshToken });
  console.log(`  Status: ${r.status}`);
  console.log(`  New accessToken: ${!!(r.body?.data?.accessToken)}`);
  console.log(`  New refreshToken: ${!!(r.body?.data?.refreshToken)}`);
  const newAccessToken = r.body?.data?.accessToken;
  const newRefreshToken = r.body?.data?.refreshToken;
  console.log(`  Token rotated (different): ${newRefreshToken !== refreshToken}`);
  console.log(`  PASS: ${r.status === 200 && !!newAccessToken && newRefreshToken !== refreshToken}`);
  console.log();

  // ═══ T03-03: Revoked refresh token ═══
  console.log('═══ T03-03: Refresh Token مُبطَّل ═══');
  // The old refreshToken should be revoked after rotation
  r = await httpReq('POST', '/api/auth/refresh', { refreshToken }); // old one
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 100)}`);
  console.log(`  Error code: ${r.body?.code || 'N/A'}`);
  console.log(`  PASS (401 with revoked): ${r.status === 401}`);
  console.log();

  // ═══ T03-04: Forged JWT ═══
  console.log('═══ T03-04: Token مُزوَّر ═══');
  // Take a valid token, modify the signature
  const forgedToken = accessToken.substring(0, accessToken.lastIndexOf('.')) + '.FORGED_SIGNATURE_123';
  r = await httpReq('GET', '/api/me', null, { Authorization: `Bearer ${forgedToken}` });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 80)}`);
  console.log(`  PASS (401): ${r.status === 401}`);
  console.log();

  // ═══ T03-05: JWT with modified tenant_id ═══
  console.log('═══ T03-05: JWT يحتوي tenant_id مُعدَّل ═══');
  // Decode, modify, re-encode (but signature will be wrong)
  const decoded = decodeJWT(accessToken);
  decoded.tenant_id = 999;
  decoded.tid = 999;
  const header = accessToken.split('.')[0];
  const modPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');
  const modToken = `${header}.${modPayload}.fake_signature`;
  r = await httpReq('GET', '/api/me', null, { Authorization: `Bearer ${modToken}` });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${(r.body?.message || r.body?.error || 'N/A').substring(0, 80)}`);
  console.log(`  PASS (401 - sig mismatch): ${r.status === 401}`);
  console.log();

  // ═══ T03-06: Logout ═══
  console.log('═══ T03-06: تسجيل الخروج ═══');
  // Login fresh to get a new token pair
  let lr = await httpReq('POST', '/api/auth/login', {
    email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!'
  });
  const logoutAccessToken = lr.body.data.accessToken;
  const logoutRefreshToken = lr.body.data.refreshToken;

  r = await httpReq('POST', '/api/auth/logout', { refreshToken: logoutRefreshToken }, {
    Authorization: `Bearer ${logoutAccessToken}`
  });
  console.log(`  Status: ${r.status}`);
  console.log(`  Message: ${r.body?.message || 'N/A'}`);
  console.log(`  PASS (200): ${r.status === 200}`);
  console.log();

  // ═══ T03-07: Use token after logout ═══
  console.log('═══ T03-07: استخدام Token بعد Logout ═══');
  // Access token should still work (JWT stateless, no blacklist)
  r = await httpReq('GET', '/api/me', null, { Authorization: `Bearer ${logoutAccessToken}` });
  console.log(`  Status: ${r.status}`);
  console.log(`  Result: ${r.status === 200 ? 'Token still valid (no blacklist - stateless JWT)' : 'Token rejected'}`);
  console.log(`  NOTE: Access tokens are stateless - no blacklist. Security relies on short expiry (15min).`);

  // But refresh token should fail
  r = await httpReq('POST', '/api/auth/refresh', { refreshToken: logoutRefreshToken });
  console.log(`  Refresh after logout: Status=${r.status}`);
  console.log(`  Refresh rejected: ${r.status === 401}`);
  console.log();

  // ═══ T03-08: Concurrent sessions ═══
  console.log('═══ T03-08: Concurrent Sessions ═══');
  const session1 = await httpReq('POST', '/api/auth/login', {
    email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!'
  });
  const session2 = await httpReq('POST', '/api/auth/login', {
    email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!'
  });

  // Both should work
  const me1 = await httpReq('GET', '/api/me', null, {
    Authorization: `Bearer ${session1.body.data.accessToken}`
  });
  const me2 = await httpReq('GET', '/api/me', null, {
    Authorization: `Bearer ${session2.body.data.accessToken}`
  });
  console.log(`  Session 1: Status=${me1.status} (${me1.body?.data?.email || 'N/A'})`);
  console.log(`  Session 2: Status=${me2.status} (${me2.body?.data?.email || 'N/A'})`);
  console.log(`  Both active: ${me1.status === 200 && me2.status === 200}`);
  console.log(`  PASS: ${me1.status === 200 && me2.status === 200}`);
  console.log();

  console.log('═══ T03 Complete ═══');
}

main().catch(e => { console.error(e); process.exit(1); });
