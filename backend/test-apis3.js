const { Pool } = require('pg');
const http = require('http');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get user info
  const userRes = await pool.query(`
    SELECT u.id, u.email, u.tenant_id, 
      array_agg(DISTINCT r.name) AS roles,
      array_agg(DISTINCT uc.company_id) AS companies
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN user_companies uc ON uc.user_id = u.id
    WHERE u.email = 'ahmed@alhajcompany.com' AND u.deleted_at IS NULL
    GROUP BY u.id, u.email, u.tenant_id
  `);
  
  if (!userRes.rows.length) { console.log('User not found'); process.exit(1); }
  const user = userRes.rows[0];
  console.log('User:', JSON.stringify(user));
  
  // Get user permissions
  const permRes = await pool.query(`
    SELECT DISTINCT p.permission_code FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id AND ur.user_id = $1
  `, [user.id]);
  const permissions = permRes.rows.map(r => r.permission_code);
  
  const companyId = user.companies[0];
  
  // Generate token matching what the auth service creates
  const token = jwt.sign({
    id: user.id,
    email: user.email,
    roles: user.roles,
    permissions: permissions,
    companyId: companyId,
    company_id: companyId,
    tenant_id: user.tenant_id,
    tenantId: user.tenant_id,
  }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  const endpoints = [
    '/api/master/warehouses?limit=3',
    '/api/master/warehouses/stats',
    '/api/master/warehouses/filters',
    '/api/master/warehouse-types?limit=3',
    '/api/master/units?limit=3',
    '/api/master/units/stats',
    '/api/master/units/filters',
    '/api/settings/policies',
    '/api/branches?limit=3',
  ];
  
  let done = 0;
  for (const ep of endpoints) {
    const req = http.request({
      hostname: 'localhost', port: 4000, path: ep, method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-company-id': String(companyId),
      }
    }, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        const status = res.statusCode;
        let summary;
        try {
          const j = JSON.parse(b);
          summary = j.success !== undefined ? `success=${j.success}` : Object.keys(j).slice(0,5).join(',');
          if (j.error) summary += ` err=${typeof j.error === 'string' ? j.error : (j.error.message || JSON.stringify(j.error)).substring(0,150)}`;
          if (j.total !== undefined) summary += ` total=${j.total}`;
          if (j.data && Array.isArray(j.data)) summary += ` rows=${j.data.length}`;
        } catch { summary = b.substring(0, 200); }
        console.log(`${status} ${ep} => ${summary}`);
        if (++done === endpoints.length) { pool.end(); process.exit(0); }
      });
    });
    req.on('error', (e) => {
      console.log(`ERR ${ep} => ${e.message}`);
      if (++done === endpoints.length) { pool.end(); process.exit(1); }
    });
    req.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
