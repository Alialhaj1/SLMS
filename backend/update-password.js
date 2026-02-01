const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function updatePassword() {
  try {
    const hash = await bcrypt.hash('A11A22A33', 10);
    console.log('Generated hash:', hash);
    
    const result = await pool.query(
      'UPDATE users SET password = $1, failed_login_count = 0 WHERE email = $2 RETURNING id, email',
      [hash, 'ali@alhajco.com']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Password updated successfully for:', result.rows[0].email);
    } else {
      console.log('❌ User not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePassword();
