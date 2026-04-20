const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ host: 'postgres', port: 5432, user: 'slms', password: 'slms_pass', database: 'slms_db' });

(async () => {
  const hash = bcrypt.hashSync('A11A22A33', 10);
  await pool.query('UPDATE users SET password = $1 WHERE id IN (8, 12)', [hash]);
  console.log('Password reset OK for user 12');
  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });
