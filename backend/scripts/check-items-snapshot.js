/* eslint-disable no-console */

// Quick DB snapshot for troubleshooting "items page shows old data".
// Usage: node scripts/check-items-snapshot.js

require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is missing. Check backend/.env');
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const safeUrl = url.includes('@') ? url.split('@')[1] : 'configured';
  console.log(`DATABASE_URL -> ${safeUrl}`);

  const perCompany = await client.query(
    `SELECT company_id,
            COUNT(*)::int AS items_count,
            MAX(created_at) AS latest_created_at,
            SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active_count,
            SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END)::int AS inactive_count,
            SUM(CASE WHEN group_id IS NULL THEN 1 ELSE 0 END)::int AS null_group_count
       FROM items
      WHERE deleted_at IS NULL
      GROUP BY company_id
      ORDER BY company_id`
  );

  console.log('\nItems per company (company_id, items_count, latest_created_at, active_count, inactive_count, null_group_count):');
  for (const r of perCompany.rows) {
    console.log(
      `${r.company_id}, ${r.items_count}, ${r.latest_created_at?.toISOString?.() ?? r.latest_created_at}, ${r.active_count}, ${r.inactive_count}, ${r.null_group_count}`
    );
  }

  const newestCompany1 = await client.query(
    `SELECT code, name, name_ar, created_at
       FROM items
      WHERE deleted_at IS NULL AND company_id = 1
      ORDER BY created_at DESC
      LIMIT 10`
  );

  console.log('\nNewest 10 items for company_id=1 (code | name | name_ar | created_at):');
  if (newestCompany1.rows.length === 0) {
    console.log('(no rows)');
  }
  for (const r of newestCompany1.rows) {
    const created = r.created_at?.toISOString?.() ?? r.created_at;
    console.log(`${r.code} | ${r.name ?? ''} | ${r.name_ar ?? ''} | ${created}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
