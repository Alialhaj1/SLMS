const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkUserSchema() {
  try {
    // Check users table columns
    console.log('\n=== Users Table Columns ===');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log(columns.rows);

    // Check user data
    console.log('\n=== User ali@alhajco.com ===');
    const user = await pool.query(`
      SELECT *
      FROM users
      WHERE email = 'ali@alhajco.com'
      LIMIT 1
    `);
    console.log(user.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkUserSchema();
