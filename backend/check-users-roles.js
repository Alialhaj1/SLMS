const pool = require('./dist/db').default;

async function main() {
  try {
    // Check users and their roles
    const usersResult = await pool.query(`
      SELECT u.id, u.email, ur.role_id, r.name as role_name 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      ORDER BY u.id LIMIT 10
    `);
    console.log('Users and their roles:');
    console.log(JSON.stringify(usersResult.rows, null, 2));

    // Check role ID 7
    const roleResult = await pool.query(`
      SELECT id, name FROM roles WHERE id = 7
    `);
    console.log('\nRole ID 7:');
    console.log(JSON.stringify(roleResult.rows, null, 2));

    // Check notifications query for a specific user (user ID 1)
    const notifResult = await pool.query(`
      SELECT n.* FROM notifications n
      WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (n.target_user_id = 1 OR n.target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = 1))
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    console.log('\nNotifications for user 1:');
    console.log(JSON.stringify(notifResult.rows, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
