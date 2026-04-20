const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db',port:5432});

async function resetPasswords() {
  const hash = await bcrypt.hash('Test@12345', 12);
  console.log('Generated hash:', hash);
  
  const emails = ['admin@darkhawlan.com', 'ali@darkhawlan.com', 'admin@testco99.com'];
  for (const email of emails) {
    await pool.query('UPDATE users SET password = $1, failed_login_count = 0, locked_until = NULL, status = $2 WHERE email = $3', [hash, 'active', email]);
    console.log('Updated:', email);
  }
  
  // Verify
  const r = await pool.query("SELECT email, substring(password from 1 for 10) as p FROM users WHERE tenant_id IS NOT NULL");
  console.log('Verification:', r.rows);
  
  // Test the login would work
  const u = await pool.query("SELECT password FROM users WHERE email = $1", ['admin@darkhawlan.com']);
  const match = await bcrypt.compare('Test@12345', u.rows[0].password);
  console.log('Password match test:', match);
  
  await pool.end();
}

resetPasswords().catch(e => console.error(e));
