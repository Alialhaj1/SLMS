const bcrypt = require('bcryptjs');
const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://slms:slms_pass@postgres:5432/slms_db' });
bcrypt.hash('Admin@123', 12).then(h => {
  return pool.query('UPDATE users SET password=$1, must_change_password=false WHERE id=1', [h]);
}).then(() => { console.log('Password reset OK'); pool.end(); }).catch(e => { console.error(e); pool.end(); });
