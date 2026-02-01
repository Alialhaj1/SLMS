const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'slms_db',
  user: process.env.DB_USER || 'slms',
  password: process.env.DB_PASSWORD || 'slms_pass'
});

async function checkUser() {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, status, failed_login_count, locked_until, 
              must_change_password, last_login_at 
       FROM users 
       WHERE email = $1`,
      ['ali@alhajco.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ المستخدم غير موجود في قاعدة البيانات');
      
      // Check all users
      const allUsers = await pool.query('SELECT id, email, full_name FROM users ORDER BY id');
      console.log('\n📋 المستخدمين المتاحين:');
      allUsers.rows.forEach(u => {
        console.log(`  - ID: ${u.id}, Email: ${u.email}, Name: ${u.full_name}`);
      });
    } else {
      const user = result.rows[0];
      console.log('✅ المستخدم موجود:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Full Name:', user.full_name);
      console.log('  Status:', user.status);
      console.log('  Failed Login Count:', user.failed_login_count);
      console.log('  Locked Until:', user.locked_until);
      console.log('  Must Change Password:', user.must_change_password);
      console.log('  Last Login:', user.last_login_at);

      // Check user roles
      const roles = await pool.query(
        `SELECT r.name FROM roles r 
         JOIN user_roles ur ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [user.id]
      );
      console.log('  Roles:', roles.rows.map(r => r.name).join(', ') || 'None');

      // Try to verify password
      const bcrypt = require('bcryptjs');
      const passwordValid = await bcrypt.compare('A11A22A33', user.password);
      console.log('  Password Valid:', passwordValid ? '✅ صحيح' : '❌ خاطئ');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkUser();
