const {Pool}=require('pg');
const http=require('http');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});

function httpReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1', port: 4000, path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    // Login
    const login = await httpReq('POST', '/api/auth/login', {
      email: 'superadmin@slms.sa',
      password: 'SuperAdmin@2024!'
    });
    const token = login.body.data?.accessToken || login.body.accessToken;
    console.log('Token obtained:', !!token);

    // Test dashboard
    console.log('\n=== GET /api/platform/dashboard ===');
    const dash = await httpReq('GET', '/api/platform/dashboard', null, token);
    console.log('Status:', dash.status);
    if (dash.status !== 200) {
      console.log('Error body:', JSON.stringify(dash.body, null, 2));
    } else {
      console.log('Tenants:', JSON.stringify(dash.body.data?.tenants));
      console.log('Users:', JSON.stringify(dash.body.data?.users));
    }

    // Test analytics/tenants
    console.log('\n=== GET /api/platform/analytics/tenants ===');
    const at = await httpReq('GET', '/api/platform/analytics/tenants', null, token);
    console.log('Status:', at.status);
    if (at.status !== 200) {
      console.log('Error body:', JSON.stringify(at.body, null, 2));
    } else {
      console.log('Tenant count:', at.body.data?.tenants?.length);
    }

    // Test available modules (wizard)
    console.log('\n=== GET /api/platform/tenants/wizard/available-modules ===');
    const am = await httpReq('GET', '/api/platform/tenants/wizard/available-modules', null, token);
    console.log('Status:', am.status);
    if (am.status !== 200) {
      console.log('Error body:', JSON.stringify(am.body, null, 2));
    } else {
      console.log('Modules:', JSON.stringify(am.body.data?.modules?.length || am.body.data));
    }

    // Test tenant update on DARKHAWLAN (id=8)
    console.log('\n=== PUT /api/tenants/8 ===');
    const upd = await httpReq('PUT', '/api/tenants/8', { name: 'Test Update' }, token);
    console.log('Status:', upd.status);
    console.log('Body:', JSON.stringify(upd.body, null, 2));

    // Also test PUT /api/platform/tenants/8
    console.log('\n=== PUT /api/platform/tenants/8 ===');
    const upd2 = await httpReq('PUT', '/api/platform/tenants/8', { name: 'Test Update' }, token);
    console.log('Status:', upd2.status);
    console.log('Body:', JSON.stringify(upd2.body, null, 2));

    // Test modules endpoint 
    console.log('\n=== GET /api/platform/modules ===');
    const mod = await httpReq('GET', '/api/platform/modules', null, token);
    console.log('Status:', mod.status);
    if (mod.status !== 200) {
      console.log('Error:', JSON.stringify(mod.body, null, 2));
    } else {
      const modules = mod.body.data?.modules || mod.body.data;
      console.log('Modules count:', Array.isArray(modules) ? modules.length : 'N/A');
      if (Array.isArray(modules)) console.log('Sample:', modules.slice(0,3).map(m => m.code || m.name));
    }

    // Test impersonation start
    console.log('\n=== POST /api/platform/impersonation/start ===');
    const imp = await httpReq('POST', '/api/platform/impersonation/start', { tenant_id: 8, user_id: 4 }, token);
    console.log('Status:', imp.status);
    console.log('Body:', JSON.stringify(imp.body, null, 2).substring(0, 500));

  } catch (e) {
    console.error('Error:', e);
  }
  await p.end();
})();
