const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 4000,
      path, method,
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
  // Login
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!', tenant_code: 'DARKHAWLAN'
  });
  const token = login.body?.data?.accessToken;
  console.log('Token:', token ? 'OK' : 'FAIL');

  // Test modules
  const mod = await req('GET', '/api/tenant/companies/modules', null, token);
  console.log('MODULES:', mod.status, JSON.stringify(mod.body).substring(0, 300));

  // Test subscription
  const sub = await req('GET', '/api/tenant/companies/subscription', null, token);
  console.log('SUBSCRIPTION:', sub.status, JSON.stringify(sub.body).substring(0, 300));

  // Test profile
  const prof = await req('GET', '/api/tenant/companies/profile', null, token);
  console.log('PROFILE:', prof.status, JSON.stringify(prof.body).substring(0, 300));

  // Test branches create 
  const br = await req('POST', '/api/branches', {
    company_id: 13, code: 'TEST-DBG', name: 'Debug Branch', type: 'branch'
  }, token);
  console.log('BRANCH CREATE:', br.status, JSON.stringify(br.body).substring(0, 300));

  // Test users list
  const usr = await req('GET', '/api/users', null, token);
  console.log('USERS:', usr.status, 'count=', usr.body?.data?.length, 'total=', usr.body?.pagination?.total);

  // Cleanup test branch if created
  if (br.status === 201 && br.body?.data?.id) {
    await req('DELETE', `/api/branches/${br.body.data.id}`, null, token);
    console.log('Cleaned up test branch');
  }
}

main().catch(console.error);
