const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkPermissions() {
  try {
    // Check user
    console.log('\n=== User Info ===');
    const userResult = await pool.query(`
      SELECT u.id, u.email, u.full_name, r.name as role_name, r.id as role_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'ali@alhajco.com'
    `);
    console.log(userResult.rows[0]);

    if (userResult.rows.length === 0) {
      console.log('User not found!');
      await pool.end();
      return;
    }

    const roleId = userResult.rows[0].role_id;

    // Check total permissions
    console.log('\n=== Total Permissions ===');
    const permCount = await pool.query(`
      SELECT COUNT(*) as total_permissions
      FROM role_permissions
      WHERE role_id = $1
    `, [roleId]);
    console.log(permCount.rows[0]);

    // Check dashboard:view permission
    console.log('\n=== Dashboard:view Permission ===');
    const dashPerm = await pool.query(`
      SELECT p.id, p.name, p.resource, p.action
      FROM permissions p
      WHERE p.name = 'dashboard:view'
    `);
    console.log(dashPerm.rows[0] || 'NOT FOUND');

    // Check if role has dashboard:view
    console.log('\n=== Role has dashboard:view? ===');
    const hasPermission = await pool.query(`
      SELECT rp.role_id, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = $1 AND p.name = 'dashboard:view'
    `, [roleId]);
    console.log(hasPermission.rows[0] || 'NO - Permission not assigned!');

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkPermissions();
