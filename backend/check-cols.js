const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_pass@postgres:5432/slms_db',
});

async function main() {
  const tables = ['warehouses', 'warehouse_types', 'units', 'unit_types', 'system_policies', 'storage_locations', 'storage_location_types'];
  for (const t of tables) {
    const r = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position", [t]
    );
    if (r.rows.length > 0) {
      console.log(`=== ${t} ===`);
      console.log(r.rows.map(x => x.column_name).join(', '));
    } else {
      console.log(`=== ${t} === (TABLE NOT FOUND)`);
    }
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
