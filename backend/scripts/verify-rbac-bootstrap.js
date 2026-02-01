/* eslint-disable no-console */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://slms:slms_pass@localhost:5432/slms_db';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const results = {};

  const migrations = await client.query(
    `SELECT name, run_at
     FROM migrations
     WHERE name IN ('200_rbac_data_model.sql', '201_rbac_seed_data.sql')
     ORDER BY name`
  );
  results.migrations = migrations.rows;

  const recentMigrations = await client.query(
    `SELECT name, run_at
     FROM migrations
     ORDER BY run_at DESC
     LIMIT 10`
  );
  results.recentMigrations = recentMigrations.rows;

  const rbacMigrationsLike = await client.query(
    `SELECT name, run_at
     FROM migrations
     WHERE name LIKE '200_%' OR name LIKE '201_%'
     ORDER BY name`
  );
  results.rbacMigrationsLike = rbacMigrationsLike.rows;

  const permissionsTotal = await client.query('SELECT COUNT(*)::int AS count FROM permissions');
  results.permissionsTotal = permissionsTotal.rows[0]?.count ?? null;

  const rolesTotal = await client.query('SELECT COUNT(*)::int AS count FROM roles');
  results.rolesTotal = rolesTotal.rows[0]?.count ?? null;

  const superAdminExists = await client.query(
    "SELECT EXISTS(SELECT 1 FROM roles WHERE name = 'super_admin') AS exists"
  );
  results.superAdminExists = superAdminExists.rows[0]?.exists ?? null;

  const superAdminPermLinks = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     WHERE r.name = 'super_admin'`
  );
  results.superAdminPermissionLinks = superAdminPermLinks.rows[0]?.count ?? null;

  const topRoles = await client.query(
    `SELECT r.name, COUNT(rp.permission_id)::int AS permission_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.name
     ORDER BY permission_count DESC, r.name ASC
     LIMIT 10`
  );
  results.topRoles = topRoles.rows;

  const outFile =
    process.env.RBAC_VERIFY_OUT || path.join(__dirname, '..', '..', 'rbac-verify.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Wrote RBAC verification to: ${outFile}`);

  await client.end();
}

main().catch((err) => {
  console.error('RBAC verify failed:', err);
  process.exit(1);
});
