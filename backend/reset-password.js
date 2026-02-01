const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres',
  port: 5432,
  user: 'slms',
  password: 'slms_pass',
  database: 'slms_db'
});

async function resetPassword() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('Generated hash:', hash);
  await pool.query(
    'UPDATE users SET password = $1 WHERE email = $2',
    [hash, 'demo@example.com']
  );
  console.log('Password reset for demo@example.com to: admin123');
  process.exit(0);
}

resetPassword();
