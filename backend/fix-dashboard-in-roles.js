const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function addDashboardToRole() {
  try {
    // Add dashboard:view and dashboard:stats to Admin role JSONB array
    await pool.query(`
      UPDATE roles 
      SET permissions = permissions || '["dashboard:view", "dashboard:stats"]'::jsonb
      WHERE id = 1
    `);

    console.log('✅ Added dashboard permissions to Admin role JSONB array');

    // Verify
    const result = await pool.query(`
      SELECT 
        jsonb_array_length(permissions) as total_perms,
        (permissions ? 'dashboard:view') as has_dashboard_view,
        (permissions ? 'dashboard:stats') as has_dashboard_stats
      FROM roles 
      WHERE id = 1
    `);

    console.log('\nVerification:', result.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

addDashboardToRole();
