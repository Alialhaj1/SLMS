const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'slms',
  password: 'slms_pass',
  database: 'slms_db'
});

async function fixAdminAccount() {
  try {
    console.log('🔧 Fixing admin account...\n');
    
    const email = 'ali@alhajco.com';
    const newPassword = 'A11A22A33';
    
    // Check if user exists
    const checkResult = await pool.query(
      'SELECT id, email, status, failed_login_count, locked_until FROM users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ User not found!');
      await pool.end();
      return;
    }
    
    const user = checkResult.rows[0];
    console.log('📧 Found user:');
    console.log('   Email:', user.email);
    console.log('   Current Status:', user.status);
    console.log('   Failed Logins:', user.failed_login_count);
    console.log('   Locked Until:', user.locked_until || 'Not locked');
    console.log('');
    
    // Hash new password
    console.log('🔐 Hashing new password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hashed');
    
    // Update user: unlock, reset failures, update password, set active
    console.log('🔄 Updating account...');
    const updateResult = await pool.query(`
      UPDATE users 
      SET 
        password = $1,
        status = 'active',
        locked_until = NULL,
        failed_login_count = 0,
        last_failed_login_at = NULL
      WHERE email = $2
      RETURNING id, email, status
    `, [passwordHash, email]);
    
    console.log('✅ Account updated successfully!\n');
    console.log('✨ New credentials:');
    console.log('   📧 Email: ali@alhajco.com');
    console.log('   🔑 Password: A11A22A33');
    console.log('   ✔️  Status: active');
    console.log('\n🚀 You can now login!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAdminAccount();
