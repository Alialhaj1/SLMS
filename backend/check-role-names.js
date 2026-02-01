const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkRoles() {
  try {
    // Get all roles
    const roles = await pool.query(`
      SELECT id, name FROM roles ORDER BY id
    `);
    
    console.log('\n=== All Roles ===');
    console.log(roles.rows);

    // Check user's role
    const userRole = await pool.query(`
      SELECT u.id, u.email, r.name as role_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.email = 'ali@alhajco.com'
    `);

    console.log('\n=== User ali@alhajco.com Role ===');
    console.log(userRole.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkRoles();
