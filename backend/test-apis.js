const http = require('http');

const postData = JSON.stringify({
  email: 'ahmed@alhajcompany.com',
  password: 'Admin@123',
  tenant_id: 55
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const token = data.token || data.data?.token || data.accessToken;
      if (!token) { console.log('LOGIN RESPONSE:', body.substring(0, 500)); return; }
      
      // Test endpoints
      const endpoints = [
        '/api/master/warehouses?limit=5',
        '/api/master/warehouses/stats',
        '/api/master/warehouse-types?limit=5',
        '/api/master/units?limit=5',
        '/api/master/units/stats',
        '/api/settings/policies',
      ];
      
      let done = 0;
      for (const ep of endpoints) {
        const req2 = http.request({
          hostname: 'localhost', port: 4000, path: ep, method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, (res2) => {
          let b = '';
          res2.on('data', d => b += d);
          res2.on('end', () => {
            const status = res2.statusCode;
            let summary;
            try {
              const j = JSON.parse(b);
              summary = j.success !== undefined ? `success=${j.success}` : Object.keys(j).join(',');
              if (j.error) summary += ` error=${typeof j.error === 'string' ? j.error : j.error.message || JSON.stringify(j.error)}`;
              if (j.total !== undefined) summary += ` total=${j.total}`;
            } catch { summary = b.substring(0, 100); }
            console.log(`${status} ${ep} => ${summary}`);
            if (++done === endpoints.length) process.exit(0);
          });
        });
        req2.end();
      }
    } catch (e) { console.error('Parse error:', e.message, body.substring(0, 200)); }
  });
});
loginReq.write(postData);
loginReq.end();
