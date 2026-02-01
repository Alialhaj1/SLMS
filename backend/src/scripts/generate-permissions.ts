/**
 * 🔧 PERMISSION GENERATOR SCRIPT
 * =====================================================
 * Generates granular_permissions table from Registry
 * 
 * Usage:
 *   npx ts-node src/scripts/generate-permissions.ts
 * 
 * This script:
 * 1. Reads permissions.registry.ts
 * 2. Flattens the tree to permission codes
 * 3. Generates i18n labels from i18n.registry.ts
 * 4. Inserts/Updates granular_permissions table
 * 5. Auto-assigns ALL permissions to super_admin role
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { 
  getAllPermissions, 
  getPermissionDefinitions,
  PERMISSIONS_TREE 
} from '../config/permissions.registry';

import { 
  SCREENS, 
  ACTIONS, 
  MODULES,
  t 
} from '../config/i18n.registry';

// Database connection - use DATABASE_URL if available
const databaseUrl = process.env.DATABASE_URL || 'postgresql://slms:slms_pass@postgres:5432/slms_db';
const pool = new Pool({
  connectionString: databaseUrl,
});

interface PermissionRecord {
  code: string;
  module: string;
  category: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  is_dangerous: boolean;
  requires_approval: boolean;
  sort_order: number;
}

/**
 * Generate Arabic name for permission
 */
function getArabicName(code: string): string {
  const parts = code.split('.');
  const module = parts[0];
  const screen = parts.slice(0, 2).join('.');
  const action = parts[parts.length - 1];

  // Try to get screen name
  const screenInfo = SCREENS[screen];
  const screenName = screenInfo?.ar?.title || MODULES[module]?.ar || module;

  // Get action name
  const actionName = ACTIONS[action]?.ar || action;

  // Build full name
  if (parts.length === 2) {
    // Module level: accounting.view -> المحاسبة > عرض
    return `${screenName} > ${actionName}`;
  } else if (parts.length === 3) {
    // Screen level: master.accounts.view -> شجرة الحسابات > عرض
    return `${screenName} > ${actionName}`;
  } else {
    // Deep level: accounting.journal.lines.amount.edit
    const element = parts.slice(2, -1).join(' > ');
    return `${screenName} > ${element} > ${actionName}`;
  }
}

/**
 * Generate English name for permission
 */
function getEnglishName(code: string): string {
  const parts = code.split('.');
  
  return parts
    .map(p => {
      // Try to get from actions
      if (ACTIONS[p]) return ACTIONS[p].en;
      // Capitalize first letter
      return p.charAt(0).toUpperCase() + p.slice(1).replace(/([A-Z])/g, ' $1');
    })
    .join(' > ');
}

/**
 * Generate all permission records
 */
function generatePermissionRecords(): PermissionRecord[] {
  const definitions = getPermissionDefinitions();
  
  return definitions.map((def, index) => ({
    code: def.code,
    module: def.module,
    category: def.category,
    name_en: getEnglishName(def.code),
    name_ar: getArabicName(def.code),
    description_en: null,
    description_ar: null,
    is_dangerous: def.isDangerous || false,
    requires_approval: def.requiresApproval || false,
    sort_order: index + 1,
  }));
}

/**
 * Main execution
 */
async function main() {
  console.log('🔐 Permission Generator Started\n');
  console.log('=' .repeat(60));

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Ensure granular_permissions table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS granular_permissions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        module VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        description_en TEXT,
        description_ar TEXT,
        is_dangerous BOOLEAN DEFAULT FALSE,
        requires_approval BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_granular_permissions_code ON granular_permissions(code);
      CREATE INDEX IF NOT EXISTS idx_granular_permissions_module ON granular_permissions(module);
    `);

    // Generate permissions
    const permissions = generatePermissionRecords();
    console.log(`📋 Generated ${permissions.length} permissions from registry\n`);

    // Group by module for display
    const byModule: Record<string, number> = {};
    permissions.forEach(p => {
      byModule[p.module] = (byModule[p.module] || 0) + 1;
    });

    console.log('📊 Permissions by Module:');
    Object.entries(byModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count}`);
    });
    console.log('');

    // Upsert permissions
    let inserted = 0;
    let updated = 0;

    for (const perm of permissions) {
      const result = await client.query(`
        INSERT INTO granular_permissions 
          (code, module, category, name_en, name_ar, description_en, description_ar, 
           is_dangerous, requires_approval, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (code) DO UPDATE SET
          module = EXCLUDED.module,
          category = EXCLUDED.category,
          name_en = EXCLUDED.name_en,
          name_ar = EXCLUDED.name_ar,
          is_dangerous = EXCLUDED.is_dangerous,
          requires_approval = EXCLUDED.requires_approval,
          sort_order = EXCLUDED.sort_order,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS is_insert
      `, [
        perm.code,
        perm.module,
        perm.category,
        perm.name_en,
        perm.name_ar,
        perm.description_en,
        perm.description_ar,
        perm.is_dangerous,
        perm.requires_approval,
        perm.sort_order,
      ]);

      if (result.rows[0].is_insert) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`✅ Inserted: ${inserted} new permissions`);
    console.log(`🔄 Updated: ${updated} existing permissions`);
    console.log('');

    // Auto-assign to super_admin and system roles
    console.log('👑 Assigning permissions to super_admin role...');

    // Find super_admin role
    const superAdminResult = await client.query(`
      SELECT id FROM roles WHERE name IN ('super_admin', 'Super Admin') LIMIT 1
    `);

    if (superAdminResult.rows.length > 0) {
      const superAdminId = superAdminResult.rows[0].id;

      // Get all permission codes (use codes, not IDs for flexibility)
      const allPerms = await client.query(`SELECT code FROM granular_permissions WHERE is_active = TRUE`);
      const permCodes = allPerms.rows.map(r => r.code);

      // Check if roles table has permissions column (JSONB or text array)
      const permColCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'permissions'
      `);

      if (permColCheck.rows.length > 0) {
        const dataType = permColCheck.rows[0].data_type;
        
        if (dataType === 'ARRAY' || dataType.includes('text')) {
          // Text array column
          await client.query(`
            UPDATE roles SET permissions = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [permCodes, superAdminId]);
          console.log(`   ✅ Assigned ${permCodes.length} permissions to super_admin (via permissions column)\n`);
        } else {
          // JSONB column
          await client.query(`
            UPDATE roles SET permissions = $1::jsonb, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [JSON.stringify(permCodes), superAdminId]);
          console.log(`   ✅ Assigned ${permCodes.length} permissions to super_admin (via JSONB)\n`);
        }
      } else {
        // Check for role_granular_permissions junction table
        const junctionCheck = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name = 'role_granular_permissions'
        `);

        if (junctionCheck.rows.length > 0) {
          // Use junction table
          await client.query(`DELETE FROM role_granular_permissions WHERE role_id = $1`, [superAdminId]);
          
          for (const code of permCodes) {
            await client.query(`
              INSERT INTO role_granular_permissions (role_id, permission_code)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [superAdminId, code]);
          }
          console.log(`   ✅ Assigned ${permCodes.length} permissions via junction table\n`);
        } else {
          console.log('   ℹ️ No compatible permissions storage found.');
          console.log('   ℹ️ Permissions generated, but role assignment needs manual setup.');
          console.log('   ℹ️ Run migration to add permissions TEXT[] column to roles table.\n');
        }
      }
    } else {
      console.log('   ⚠️ super_admin role not found, skipping assignment\n');
    }

    // Find inactive/orphan permissions (in DB but not in registry)
    const orphans = await client.query(`
      SELECT code FROM granular_permissions 
      WHERE code NOT IN (${permissions.map((_, i) => `$${i + 1}`).join(',')})
        AND is_active = TRUE
    `, permissions.map(p => p.code));

    if (orphans.rows.length > 0) {
      console.log(`⚠️ Found ${orphans.rows.length} orphan permissions (in DB but not in registry):`);
      orphans.rows.forEach(r => console.log(`   - ${r.code}`));
      
      // Mark as inactive instead of deleting
      await client.query(`
        UPDATE granular_permissions 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE code NOT IN (${permissions.map((_, i) => `$${i + 1}`).join(',')})
      `, permissions.map(p => p.code));
      console.log(`   → Marked as inactive\n`);
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('=' .repeat(60));
    console.log('✅ Permission generation complete!');
    console.log(`   Total permissions: ${permissions.length}`);
    console.log(`   New: ${inserted}, Updated: ${updated}`);

    // Show sample permissions
    console.log('\n📝 Sample permissions:');
    const samples = await client.query(`
      SELECT code, name_ar FROM granular_permissions 
      ORDER BY sort_order LIMIT 10
    `);
    samples.rows.forEach(r => {
      console.log(`   ${r.code} → ${r.name_ar}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
