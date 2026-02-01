const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slms_db',
  user: process.env.DB_USER || 'slms',
  password: process.env.DB_PASSWORD || 'slms_pass'
});

async function createSuperAdmin() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    
    // Create super admin user
    const userResult = await pool.query(`
      INSERT INTO users (email, password, full_name, status, must_change_password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name
    `, ['super@admin.com', hashedPassword, 'Super Administrator', 'active', false]);
    
    const user = userResult.rows[0];
    console.log('✅ Created user:', user);
    
    // Check if super_admin role exists
    const roleResult = await pool.query(`
      SELECT id, name FROM roles WHERE name = 'super_admin'
    `);
    
    let roleId;
    if (roleResult.rows.length === 0) {
      // Create super_admin role
      const newRoleResult = await pool.query(`
        INSERT INTO roles (name, description, permissions)
        VALUES ($1, $2, $3)
        RETURNING id, name
      `, ['super_admin', 'Super Administrator with full system access', JSON.stringify([])]);
      
      roleId = newRoleResult.rows[0].id;
      console.log('✅ Created role:', newRoleResult.rows[0]);
    } else {
      roleId = roleResult.rows[0].id;
      console.log('✅ Found existing role:', roleResult.rows[0]);
    }
    
    // Assign role to user
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [user.id, roleId]);
    
    console.log('✅ Assigned super_admin role to user');
    
    console.log('\n🎉 Super Admin created successfully!');
    console.log('📧 Email: super@admin.com');
    console.log('🔑 Password: SuperAdmin123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
