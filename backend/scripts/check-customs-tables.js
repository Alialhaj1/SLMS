const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  user: 'slms',
  password: 'slms_pass',
  database: 'slms_db'
});

async function run() {
  try {
    const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'customs%' ORDER BY tablename`);
    console.log('Customs tables:', tables.rows.map(x => x.tablename).join(', '));
    
    const types = await pool.query(`SELECT code, name_en, name_ar FROM customs_declaration_types LIMIT 5`);
    console.log('Types:', types.rows);
    
    const statuses = await pool.query(`SELECT code, name_en, name_ar FROM customs_declaration_statuses ORDER BY stage_order`);
    console.log('Statuses:', statuses.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
