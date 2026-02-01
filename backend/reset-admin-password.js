const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'slms',
  password: 'slms_pass',
  database: 'slms_db'
});

async function resetPassword() {
  try {
    console.log('🔄 Starting password reset...');
    
    // Hash the new password
    const newPassword = 'A11A22A33';
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hashed successfully');
    
    // Update the password in database
    const result = await pool.query(
      'UPDATE users SET password = $1, failed_login_count = 0, status = $2 WHERE email = $3 RETURNING id, email, status',
      [hash, 'active', 'ali@alhajco.com']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Password updated successfully!');
      console.log('📧 Email:', result.rows[0].email);
      console.log('🆔 User ID:', result.rows[0].id);
      console.log('✔️  Status:', result.rows[0].status);
      console.log('\n🔐 New credentials:');
      console.log('   Email: ali@alhajco.com');
      console.log('   Password: A11A22A33');
    } else {
      console.log('❌ User not found with email: ali@alhajco.com');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
