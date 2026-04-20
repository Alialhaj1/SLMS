const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres', user: 'slms', password: 'slms_pass', database: 'slms_db', port: 5432
});
(async () => {
  const hash = await bcrypt.hash('PlatformAdmin@2024!', 12);
  console.log('Hash generated:', hash.substring(0, 20));
  const r1 = await pool.query('UPDATE users SET password = $1, encrypted_password = $1 WHERE id = 12', [hash]);
  console.log('Updated admin@slms.sa:', r1.rowCount);
  const r2 = await pool.query('UPDATE users SET password = $1, encrypted_password = $1 WHERE id = 13', [hash]);
  console.log('Updated support@slms.sa:', r2.rowCount);
  // Verify
  const v = await pool.query('SELECT id, email, substring(password, 1, 20) as hash_prefix FROM users WHERE id IN (12, 13)');
  console.log('Verify:', JSON.stringify(v.rows));
  await pool.end();
})();
