const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
async function main() {
  const hash = await bcrypt.hash('admin123', 12);
  console.log('Generated hash:', hash);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('UPDATE users SET password = $1 WHERE id = 7 RETURNING id', [hash]);
  console.log('Updated:', res.rows[0]);
  await pool.end();
}
main().catch(e => console.error(e));
