const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adminPermissions = [
  // Dashboard
  "dashboard:view",
  
  // Shipments
  "shipments:view",
  "shipments:create",
  "shipments:edit",
  "shipments:delete",
  
  // Expenses
  "expenses:view",
  "expenses:create",
  "expenses:edit",
  "expenses:delete",
  
  // Warehouses
  "warehouses:view",
  "warehouses:create",
  "warehouses:edit",
  "warehouses:delete",
  
  // Suppliers
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",
  
  // Users
  "users:view",
  "users:create",
  "users:edit",
  "users:delete",
  
  // Roles
  "roles:view",
  "roles:create",
  "roles:edit",
  "roles:delete",
  
  // Companies
  "companies:view",
  "companies:create",
  "companies:edit",
  "companies:delete",
  
  // Branches
  "branches:view",
  "branches:create",
  "branches:edit",
  "branches:delete",
  
  // Settings
  "settings:view",
  "settings:edit",
  
  // Audit Logs
  "audit_logs:view",
  
  // Accounting
  "accounting:view",
  "accounts:view",
  "accounts:create",
  "accounts:edit",
  "accounts:delete",
  "journals:view",
  "journals:create",
  "journals:edit",
  "journals:delete",
  "reports:view"
];

async function updateAdminPermissions() {
  try {
    console.log('Updating Admin role permissions...');
    
    const result = await pool.query(
      'UPDATE roles SET permissions = $1 WHERE name = $2 RETURNING id, name, permissions',
      [JSON.stringify(adminPermissions), 'Admin']
    );
    
    console.log('✅ Admin permissions updated successfully:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAdminPermissions();
