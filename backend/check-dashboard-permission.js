const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkDashboardPermission() {
  try {
    // Check if dashboard:view exists
    console.log('\n=== Checking dashboard:view permission ===');
    const perm = await pool.query(`
      SELECT * FROM permissions WHERE resource = 'dashboard' OR name LIKE '%dashboard%'
    `);
    console.log('Found permissions:', perm.rows);

    // Check all permissions
    console.log('\n=== All permissions (first 20) ===');
    const allPerms = await pool.query(`
      SELECT id, name, resource, action FROM permissions ORDER BY name LIMIT 20
    `);
    console.log(allPerms.rows);

    // Check if Admin has it
    console.log('\n=== Admin role permissions (first 10) ===');
    const adminPerms = await pool.query(`
      SELECT p.id, p.name, p.resource, p.action
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = 1
      ORDER BY p.name
      LIMIT 10
    `);
    console.log(adminPerms.rows);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkDashboardPermission();
