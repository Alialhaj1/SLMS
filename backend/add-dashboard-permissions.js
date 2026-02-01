const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function addDashboardPermissions() {
  try {
    // Add dashboard permissions
    const dashboardPerms = [
      { code: 'dashboard:view', action: 'view', desc: 'View dashboard' },
      { code: 'dashboard:stats', action: 'stats', desc: 'View dashboard statistics' },
    ];

    console.log('Adding dashboard permissions...');

    for (const perm of dashboardPerms) {
      await pool.query(`
        INSERT INTO permissions (permission_code, resource, action, description, requires_approval, is_dangerous)
        VALUES ($1, 'dashboard', $2, $3, false, false)
        ON CONFLICT (permission_code) DO NOTHING
      `, [perm.code, perm.action, perm.desc]);
      console.log(`✅ Added: ${perm.code}`);
    }

    // Get the dashboard:view permission id
    const dashView = await pool.query(`
      SELECT id FROM permissions WHERE permission_code = 'dashboard:view'
    `);

    if (dashView.rows.length > 0) {
      const permId = dashView.rows[0].id;
      
      // Add to Admin role (id = 1)
      await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (1, $1)
        ON CONFLICT DO NOTHING
      `, [permId]);
      
      console.log(`\n✅ Added dashboard:view to Admin role`);
    }

    // Verify
    const count = await pool.query(`
      SELECT COUNT(*) as total
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = 1 AND p.permission_code = 'dashboard:view'
    `);
    
    console.log(`\nVerification: ${count.rows[0].total} (should be 1)`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

addDashboardPermissions();
