const pool = require('./dist/config/db').default;
async function main() {
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'store_orders' ORDER BY ordinal_position");
  console.log('store_orders columns:', r.rows.map(c => c.column_name).join(', '));
  const r2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'store_customers' ORDER BY ordinal_position");
  console.log('store_customers columns:', r2.rows.map(c => c.column_name).join(', '));
  const r3 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'store_reviews' ORDER BY ordinal_position");
  console.log('store_reviews columns:', r3.rows.map(c => c.column_name).join(', '));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
