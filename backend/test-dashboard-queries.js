const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function testDashboardQueries() {
  try {
    console.log('\n=== Testing Dashboard Queries ===\n');

    // Test 1: journal_entries table exists?
    console.log('1. Checking if journal_entries table exists...');
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'journal_entries'
        );
      `);
      console.log('   ✅ journal_entries table:', result.rows[0].exists ? 'EXISTS' : 'NOT FOUND');
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    // Test 2: Try the exact query from badges endpoint
    console.log('\n2. Testing pendingApprovals query...');
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM journal_entries WHERE status IN ('draft', 'submitted')
      `);
      console.log('   ✅ Result:', result.rows[0]);
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    // Test 3: login_history
    console.log('\n3. Testing failedLogins query...');
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM login_history 
        WHERE activity_type = 'login_failed' 
        AND created_at >= NOW() - INTERVAL '24 hours'
      `);
      console.log('   ✅ Result:', result.rows[0]);
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    // Test 4: Today's journals
    console.log('\n4. Testing todayJournals query...');
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM journal_entries WHERE DATE(created_at) = CURRENT_DATE
      `);
      console.log('   ✅ Result:', result.rows[0]);
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    // Test 5: All tables
    console.log('\n5. Checking all tables in database...');
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log('   ✅ Total tables:', result.rows.length);
      console.log('   Tables:', result.rows.map(r => r.table_name).join(', '));
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    await pool.end();
    console.log('\n=== Test Complete ===\n');
  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
  }
}

testDashboardQueries();
