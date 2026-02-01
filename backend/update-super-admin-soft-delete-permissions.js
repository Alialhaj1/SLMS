/**
 * تحديث صلاحيات السوبر أدمن - إضافة صلاحيات Soft Delete
 * يضيف 24 صلاحية جديدة للتحكم في البيانات المحذوفة
 * Total: 114 صلاحية (90 الحالية + 24 الجديدة)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// الصلاحيات الجديدة للـ Soft Delete
const softDeletePermissions = [
  // Companies
  'companies:view_deleted',
  'companies:restore',
  'companies:permanent_delete',
  
  // Branches
  'branches:view_deleted',
  'branches:restore',
  'branches:permanent_delete',
  
  // Accounts
  'master:accounts:view_deleted',
  'master:accounts:restore',
  'master:accounts:permanent_delete',
  
  // Journals
  'accounting:journal:view_deleted',
  'accounting:journal:restore',
  'accounting:journal:permanent_delete',
  
  // Shipments
  'shipments:view_deleted',
  'shipments:restore',
  'shipments:permanent_delete',
  
  // Expenses
  'expenses:view_deleted',
  'expenses:restore',
  'expenses:permanent_delete',
  
  // Warehouses
  'warehouses:view_deleted',
  'warehouses:restore',
  'warehouses:permanent_delete',
  
  // Suppliers
  'suppliers:view_deleted',
  'suppliers:restore',
  'suppliers:permanent_delete'
];

async function updateSuperAdminPermissions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 البحث عن دور Admin...');
    
    // البحث عن دور Admin
    const roleResult = await client.query(`
      SELECT id, name, permissions 
      FROM roles 
      WHERE name = 'Admin' OR name = 'Super Admin'
      LIMIT 1
    `);
    
    if (roleResult.rows.length === 0) {
      throw new Error('❌ لم يتم العثور على دور Admin');
    }
    
    const role = roleResult.rows[0];
    console.log(`✅ تم العثور على الدور: ${role.name} (ID: ${role.id})`);
    
    // الحصول على الصلاحيات الحالية
    const currentPermissions = role.permissions || [];
    console.log(`📊 عدد الصلاحيات الحالية: ${currentPermissions.length}`);
    
    // دمج الصلاحيات الجديدة مع الحالية (بدون تكرار)
    const allPermissions = [...new Set([...currentPermissions, ...softDeletePermissions])];
    const newPermissionsAdded = allPermissions.length - currentPermissions.length;
    
    console.log(`\n📋 إضافة الصلاحيات الجديدة...`);
    console.log(`   الصلاحيات الحالية: ${currentPermissions.length}`);
    console.log(`   الصلاحيات الجديدة: ${newPermissionsAdded}`);
    console.log(`   الإجمالي النهائي: ${allPermissions.length}`);
    
    // تحديث الصلاحيات
    await client.query(
      `UPDATE roles 
       SET permissions = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(allPermissions), role.id]
    );
    
    console.log('\n✅ تم تحديث الصلاحيات بنجاح!');
    
    // عرض الصلاحيات الجديدة المضافة
    console.log('\n📝 الصلاحيات المضافة:');
    softDeletePermissions.forEach((perm, index) => {
      if (!currentPermissions.includes(perm)) {
        console.log(`   ${index + 1}. ${perm}`);
      }
    });
    
    await client.query('COMMIT');
    
    console.log('\n✨ تم التحديث بنجاح!');
    console.log('🎯 السوبر أدمن الآن لديه صلاحيات كاملة لاستعادة البيانات المحذوفة');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في التحديث:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// تشغيل السكريبت
updateSuperAdminPermissions()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });
