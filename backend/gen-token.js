require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms123@postgres:5432/slms_db'
});

async function main() {
  try {
    // Generate a test token for user 5
    const token = jwt.sign(
      { id: 5, email: 'ali@alhajco.com' },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-that-should-be-changed',
      { expiresIn: '1h' }
    );
    
    console.log('Test Token for user 5:');
    console.log(token);
    console.log('\nUse this command to test the API:');
    console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:4000/api/notifications"`);

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
