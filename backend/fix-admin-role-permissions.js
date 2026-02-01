const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function fixAdminRole() {
  try {
    // Get Admin role
    const adminRole = await pool.query(`
      SELECT id, name FROM roles WHERE name = 'Admin' OR name = 'Super Admin'
    `);
    console.log('\n=== Available Roles ===');
    console.log(adminRole.rows);

    // Get all permissions
    const perms = await pool.query(`
      SELECT id FROM permissions
    `);
    console.log(`\n=== Total Permissions: ${perms.rows.length} ===`);

    // Find Admin role (id = 1)
    const roleId = 1;

    // Delete existing permissions
    await pool.query(`
      DELETE FROM role_permissions WHERE role_id = $1
    `, [roleId]);
    console.log('✅ Cleared old permissions');

    // Add all permissions
    const values = perms.rows.map((p, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = [];
    perms.rows.forEach(p => {
      params.push(roleId, p.id);
    });

    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ${values}
    `, params);

    console.log(`✅ Added ${perms.rows.length} permissions to Admin role`);

    // Verify
    const count = await pool.query(`
      SELECT COUNT(*) as total FROM role_permissions WHERE role_id = $1
    `, [roleId]);
    console.log(`\n=== Verification: ${count.rows[0].total} permissions ===`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

fixAdminRole();
