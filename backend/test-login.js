const http = require('http');

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Try login with tenant_code
  const r1 = await request({
    hostname: 'localhost', port: 4000, path: '/api/auth/login',
    method: 'POST', headers: {'Content-Type':'application/json'}
  }, {email:'test-admin@alhajco.com', password:'Admin123!'});
  console.log('Login without tenant:', JSON.stringify(r1).substring(0,200));

  // If that fails, check if there's a super_admins entry
  // Let's try other users
  const { Pool } = require('pg');
  const pool = new Pool({connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_password@postgres:5432/slms_db'});
  
  // Check super_admins
  const sa = await pool.query('SELECT sa.user_id, u.email FROM super_admins sa JOIN users u ON sa.user_id = u.id');
  console.log('Super admins:', sa.rows);
  
  // Find platform users (tenant_id IS NULL)
  const pu = await pool.query("SELECT id, email, status, tenant_id FROM users WHERE tenant_id IS NULL AND deleted_at IS NULL LIMIT 5");
  console.log('Platform users:', pu.rows);
  
  await pool.end();
}
main().catch(console.error);
