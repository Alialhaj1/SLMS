const bcrypt = require('bcryptjs');
async function go() {
  const hash = await bcrypt.hash('A11A22A33', 12);
  console.log('Hash:', hash);
  const {Pool} = require('pg');
  const pool = new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, 12]);
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, 13]);
  console.log('Updated users 12 and 13');
  pool.end();
}
go();
