const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slms_db',
  user: process.env.DB_USER || 'slms',
  password: process.env.DB_PASSWORD || 'slms_pass'
});

async function testPassword() {
  try {
    const result = await pool.query(
      "SELECT password FROM users WHERE email = 'demo@example.com'"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    const hash = result.rows[0].password;
    console.log('Hash prefix:', hash.substring(0, 20) + '...');
    
    const match = await bcrypt.compare('Admin123!', hash);
    console.log('Password match:', match ? '✅ YES' : '❌ NO');
    
    process.exit(match ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPassword();
