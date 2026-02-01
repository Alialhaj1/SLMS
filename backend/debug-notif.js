require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms123@postgres:5432/slms_db'
});

async function main() {
  try {
    // Check user 5's roles
    const userRolesResult = await pool.query(`
      SELECT ur.role_id, r.name as role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = 5
    `);
    console.log('User 5 roles:');
    console.log(JSON.stringify(userRolesResult.rows, null, 2));

    // Check notifications for user 5 using the same query as the service
    const notifResult = await pool.query(`
      SELECT n.id, n.type, n.title_key, n.message_key, n.target_role_id, n.read_at, n.dismissed_at
      FROM notifications n
      WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (n.target_user_id = 5 OR n.target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = 5))
      ORDER BY n.created_at DESC
      LIMIT 10
    `);
    console.log('\nNotifications for user 5:');
    console.log(JSON.stringify(notifResult.rows, null, 2));

    // Check unread count
    const unreadResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM notifications n
      WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (n.target_user_id = 5 OR n.target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = 5))
        AND n.read_at IS NULL
        AND n.dismissed_at IS NULL
    `);
    console.log('\nUnread count for user 5:');
    console.log(unreadResult.rows[0].count);

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
