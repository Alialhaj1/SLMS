const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 4000, path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let body;
        try { body = JSON.parse(d); } catch { body = d; }
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'DARKHAWLAN'
  });
  const token = login.body?.data?.accessToken;
  
  const res = await req('POST', '/api/users', {
    email: `test.${Date.now()}@darkhawlan.com`,
    full_name: 'Test User',
    password: 'Test@2024!',
    role_ids: [18],
    company_id: 13
  }, token);
  console.log('STATUS:', res.status);
  console.log('BODY:', JSON.stringify(res.body, null, 2));
}
main();
