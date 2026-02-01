const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkUserRoles() {
  try {
    // Check tables
    console.log('\n=== Tables ===');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%user%' OR table_name LIKE '%role%'
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name));

    // Check user_roles table
    console.log('\n=== User Roles for ali@alhajco.com ===');
    const userRoles = await pool.query(`
      SELECT u.id, u.email, r.id as role_id, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.email = 'ali@alhajco.com'
    `);
    console.log(userRoles.rows);

    if (userRoles.rows.length > 0 && userRoles.rows[0].role_id) {
      const roleId = userRoles.rows[0].role_id;
      
      // Check permissions count
      console.log('\n=== Permissions Count ===');
      const permCount = await pool.query(`
        SELECT COUNT(*) as total
        FROM role_permissions
        WHERE role_id = $1
      `, [roleId]);
      console.log(permCount.rows[0]);

      // Check dashboard:view
      console.log('\n=== Has dashboard:view? ===');
      const hasDashboard = await pool.query(`
        SELECT p.name
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.name = 'dashboard:view'
      `, [roleId]);
      console.log(hasDashboard.rows.length > 0 ? 'YES' : 'NO');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkUserRoles();
