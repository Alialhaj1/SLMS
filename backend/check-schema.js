const pool = require('./dist/db').default;

async function main() {
  try {
    // Check table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `);
    console.log('Notifications table schema:');
    console.log(JSON.stringify(schemaResult.rows, null, 2));

    // Check a sample notification with all fields
    const notifResult = await pool.query(`
      SELECT * FROM notifications LIMIT 1
    `);
    console.log('\nSample notification:');
    console.log(JSON.stringify(notifResult.rows, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
