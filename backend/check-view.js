require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms123@postgres:5432/slms_db'
});

async function main() {
  try {
    // Check if view exists
    const viewResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'user_unread_notification_counts'
    `);
    console.log('View exists?:', viewResult.rows.length > 0 ? 'Yes' : 'No');
    console.log(viewResult.rows);

    // Try to select from view
    try {
      const viewData = await pool.query(`
        SELECT * FROM user_unread_notification_counts WHERE user_id = 5
      `);
      console.log('\nView data for user 5:');
      console.log(viewData.rows);
    } catch (e) {
      console.log('\nView query error:', e.message);
    }

    // Manual count query
    const manualCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM notifications n
      WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (n.target_user_id = 5 OR n.target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = 5))
        AND n.read_at IS NULL
        AND n.dismissed_at IS NULL
    `);
    console.log('\nManual count for user 5:', manualCount.rows[0].count);

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
