import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/slms',
});

async function createSuperAdmin() {
  console.log('🔐 Creating super admin user...');
  
  const email = 'ali@alhajco.com';
  const password = 'A11A22A33';
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');
    
    // Get super_admin role_id
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'super_admin'"
    );
    
    if (roleResult.rows.length === 0) {
      console.error('❌ super_admin role not found. Run migrations first.');
      process.exit(1);
    }
    
    const roleId = roleResult.rows[0].id;
    
    // Delete existing user if exists
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    
    // Insert super admin
    await pool.query(
      `INSERT INTO users (email, password_hash, role_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [email, hashedPassword, roleId]
    );
    
    console.log('✅ Super admin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👑 Role: super_admin (full permissions)');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
