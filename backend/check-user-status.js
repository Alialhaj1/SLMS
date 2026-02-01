const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'slms',
  password: 'slms_pass',
  database: 'slms_db'
});

async function checkUser() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        status, 
        failed_login_count, 
        locked_until,
        last_login_at,
        created_at
      FROM users 
      WHERE email = 'ali@alhajco.com'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const user = result.rows[0];
    console.log('📧 User Information:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Status:', user.status);
    console.log('   Failed Login Count:', user.failed_login_count);
    console.log('   Locked Until:', user.locked_until || 'Not locked');
    console.log('   Last Login:', user.last_login_at || 'Never');
    console.log('   Created:', user.created_at);
    
    // Check if account needs fixing
    if (user.status === 'locked') {
      console.log('\n⚠️  Account is LOCKED!');
      console.log('🔓 Unlocking account...');
      
      await pool.query(`
        UPDATE users 
        SET status = 'active',
            locked_until = NULL,
            failed_login_count = 0
        WHERE id = $1
      `, [user.id]);
      
      console.log('✅ Account unlocked successfully!');
    } else if (user.status === 'disabled') {
      console.log('\n⚠️  Account is DISABLED!');
      console.log('🔓 Enabling account...');
      
      await pool.query(`
        UPDATE users 
        SET status = 'active'
        WHERE id = $1
      `, [user.id]);
      
      console.log('✅ Account enabled successfully!');
    } else if (user.failed_login_count > 0) {
      console.log('\n⚠️  Has failed login attempts');
      console.log('🔄 Resetting failed login count...');
      
      await pool.query(`
        UPDATE users 
        SET failed_login_count = 0
        WHERE id = $1
      `, [user.id]);
      
      console.log('✅ Failed login count reset!');
    } else {
      console.log('\n✅ Account status is GOOD!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
