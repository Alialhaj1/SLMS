const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkRolesSchema() {
  try {
    // Check roles table columns
    console.log('\n=== Roles Table Columns ===');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'roles'
      ORDER BY ordinal_position
    `);
    console.log(columns.rows);

    // Check Admin role
    console.log('\n=== Admin Role ===');
    const admin = await pool.query(`
      SELECT * FROM roles WHERE id = 1
    `);
    console.log(admin.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkRolesSchema();
