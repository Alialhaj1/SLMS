const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkRoles() {
  try {
    console.log('Checking roles table...');
    const rolesResult = await pool.query('SELECT * FROM roles ORDER BY id');
    console.log('\n📋 Roles:', rolesResult.rows);
    
    console.log('\nChecking users table...');
    const usersResult = await pool.query('SELECT id, email FROM users');
    console.log('\n👤 Users:', usersResult.rows);
    
    console.log('\nChecking user_roles table...');
    const userRolesResult = await pool.query('SELECT * FROM user_roles');
    console.log('\n🔗 User Roles:', userRolesResult.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkRoles();
