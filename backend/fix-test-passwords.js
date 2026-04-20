const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'slms',
  password: process.env.PGPASSWORD || 'slms_pass',
  database: process.env.DB_NAME || 'slms_db',
});

const users = [
  { email: 'superadmin@slms.sa', password: 'SuperAdmin@2024!' },
  { email: 'admin@slms.sa', password: 'PlatformAdmin@2024!' },
  { email: 'support@slms.sa', password: 'Support@2024!' },
  { email: 'admin@darkhawlan.com', password: 'P@ssw0rd123!' },
  { email: 'admin@alhajco.com', password: 'Admin@123' },
  { email: 'ops@darkhawlan.com', password: 'Ops@2024!' },
  { email: 'viewer@alhajco.com', password: 'Viewer@2024!' },
];

async function main() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const res = await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, u.email]);
    console.log(`${u.email}: updated (${res.rowCount} row) - hash starts: ${hash.substring(0, 20)}`);
  }
  // Verify ali@alhajco.com still works
  const ali = await pool.query('SELECT password FROM users WHERE email = $1', ['ali@alhajco.com']);
  if (ali.rows.length) {
    const match = await bcrypt.compare('Admin@123', ali.rows[0].password);
    console.log(`ali@alhajco.com: password verify = ${match}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
