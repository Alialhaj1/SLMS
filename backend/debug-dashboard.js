/**
 * Debug Dashboard Endpoints
 * Run this to check what's causing the 500 errors
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testDashboardQueries() {
  console.log('Testing dashboard queries...\n');

  try {
    // Test 1: Check if journal_entries table exists
    console.log('1. Checking journal_entries table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries'
      );
    `);
    console.log('   journal_entries exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Test 2: Count journal entries
      console.log('\n2. Counting journal entries...');
      const countResult = await pool.query('SELECT COUNT(*) FROM journal_entries');
      console.log('   Total journal entries:', countResult.rows[0].count);

      // Test 3: Check with company_id filter
      console.log('\n3. Testing with company_id = 1...');
      const companyResult = await pool.query(
        'SELECT COUNT(*) FROM journal_entries WHERE company_id = $1',
        [1]
      );
      console.log('   Entries for company 1:', companyResult.rows[0].count);
    }

    // Test 4: Check login_history table
    console.log('\n4. Checking login_history table...');
    const loginTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'login_history'
      );
    `);
    console.log('   login_history exists:', loginTableCheck.rows[0].exists);

    if (loginTableCheck.rows[0].exists) {
      const loginCount = await pool.query('SELECT COUNT(*) FROM login_history');
      console.log('   Total login records:', loginCount.rows[0].count);
    }

    // Test 5: Check audit_logs table
    console.log('\n5. Checking audit_logs table...');
    const auditTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    console.log('   audit_logs exists:', auditTableCheck.rows[0].exists);

    console.log('\n✓ All basic checks passed!');
  } catch (error) {
    console.error('\n✗ Error occurred:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testDashboardQueries();
