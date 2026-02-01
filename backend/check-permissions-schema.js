const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkPermissionsSchema() {
  try {
    // Check permissions table columns
    console.log('\n=== Permissions Table Columns ===');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'permissions'
      ORDER BY ordinal_position
    `);
    console.log(columns.rows);

    // Get sample permissions
    console.log('\n=== Sample Permissions (first 5) ===');
    const sample = await pool.query(`
      SELECT * FROM permissions LIMIT 5
    `);
    console.log(sample.rows);

    // Count total
    console.log('\n=== Total Permissions ===');
    const count = await pool.query(`
      SELECT COUNT(*) as total FROM permissions
    `);
    console.log(count.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkPermissionsSchema();
