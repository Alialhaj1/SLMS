const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// جميع الصلاحيات المطلوبة للقائمة الجانبية
const fullAdminPermissions = [
  // Dashboard
  "dashboard:view",
  "dashboard:statistics:view",
  
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
  
  // Accounting - Accounts
  "master:accounts:view",
  "master:accounts:create",
  "master:accounts:edit",
  "master:accounts:delete",
  
  // Accounting - Journals
  "accounting:journal:view",
  "accounting:journal:create",
  "accounting:journal:edit",
  "accounting:journal:delete",
  "accounting:journal:post",
  "accounting:journal:reverse",
  
  // Accounting - Reports
  "accounting:reports:trial-balance:view",
  "accounting:reports:general-ledger:view",
  "accounting:reports:general-ledger:export",
  "accounting:reports:income-statement:view",
  "accounting:reports:income-statement:export",
  "accounting:reports:balance-sheet:view",
  "accounting:reports:balance-sheet:export",
  
  // Accounting - Periods
  "accounting:periods:view",
  "accounting:periods:manage",
  
  // Master Data - Items
  "master:items:view",
  "master:items:create",
  "master:items:edit",
  "master:items:delete",
  
  // Master Data - Customers
  "master:customers:view",
  "master:customers:create",
  "master:customers:edit",
  "master:customers:delete",
  
  // Master Data - Vendors
  "master:vendors:view",
  "master:vendors:create",
  "master:vendors:edit",
  "master:vendors:delete",
  
  // Master Data - Cost Centers
  "master:cost_centers:view",
  "master:cost_centers:create",
  "master:cost_centers:edit",
  "master:cost_centers:delete",
  
  // Master Data - Currencies
  "master:currencies:view",
  "master:currencies:manage",
  
  // Users
  "users:view",
  "users:create",
  "users:edit",
  "users:delete",
  "users:restore",
  "users:permanent_delete",
  "users:view_deleted",
  "users:manage_status",
  "users:assign_roles",
  
  // Roles
  "roles:view",
  "roles:create",
  "roles:edit",
  "roles:delete",
  "roles:restore",
  "roles:view_deleted",
  "roles:assign_permissions",
  
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
  
  // System Settings
  "system_settings:view",
  "system_settings:edit",
  
  // Audit Logs
  "audit_logs:view",
  "audit_logs:export",
  
  // Notifications
  "notifications:view",
  "notifications:manage",
  "notifications:delete",
  "notifications:view_all",
  
  // Password Requests
  "password_requests:view",
  "password_requests:approve",
  "password_requests:reject"
];

async function updateFullAdminPermissions() {
  try {
    console.log('🔧 Updating Admin role with ALL required permissions...');
    console.log(`📝 Total permissions: ${fullAdminPermissions.length}`);
    
    const result = await pool.query(
      'UPDATE roles SET permissions = $1 WHERE name = $2 RETURNING id, name, permissions',
      [JSON.stringify(fullAdminPermissions), 'Admin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin permissions updated successfully!');
      console.log(`   - Role ID: ${result.rows[0].id}`);
      console.log(`   - Role Name: ${result.rows[0].name}`);
      console.log(`   - Permissions Count: ${result.rows[0].permissions.length}`);
    } else {
      console.log('⚠️  No Admin role found to update');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
    await pool.end();
    process.exit(1);
  }
}

updateFullAdminPermissions();
