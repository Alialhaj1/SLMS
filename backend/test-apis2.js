const http = require('http');
const jwt = require('jsonwebtoken');

// Generate a token directly for testing
const JWT_SECRET = process.env.JWT_SECRET;
const token = jwt.sign(
  { id: 67, email: 'ahmed@alhajcompany.com', companyId: 42, tenantId: 55, role_id: 118 },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const endpoints = [
  '/api/master/warehouses?limit=3',
  '/api/master/warehouses/stats',
  '/api/master/warehouses/filters',
  '/api/master/warehouse-types?limit=3',
  '/api/master/units?limit=3',
  '/api/master/units/stats',
  '/api/master/units/filters',
  '/api/settings/policies',
];

let done = 0;
for (const ep of endpoints) {
  const req = http.request({
    hostname: 'localhost', port: 4000, path: ep, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, (res) => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => {
      const status = res.statusCode;
      let summary;
      try {
        const j = JSON.parse(b);
        summary = j.success !== undefined ? `success=${j.success}` : Object.keys(j).slice(0,5).join(',');
        if (j.error) summary += ` error=${typeof j.error === 'string' ? j.error : j.error.message || JSON.stringify(j.error).substring(0,200)}`;
        if (j.total !== undefined) summary += ` total=${j.total}`;
        if (j.data && Array.isArray(j.data)) summary += ` rows=${j.data.length}`;
      } catch { summary = b.substring(0, 200); }
      console.log(`${status} ${ep} => ${summary}`);
      if (++done === endpoints.length) process.exit(0);
    });
  });
  req.on('error', (e) => {
    console.log(`ERR ${ep} => ${e.message}`);
    if (++done === endpoints.length) process.exit(1);
  });
  req.end();
}
