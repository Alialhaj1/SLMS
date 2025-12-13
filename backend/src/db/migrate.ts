import fs from 'fs';
import path from 'path';
import pool from './index';

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (id serial primary key, name text unique, run_at timestamptz default now())`);
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) return;
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const name = file;
      const r = await client.query('SELECT 1 FROM migrations WHERE name=$1', [name]);
      if (r.rowCount === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
        console.log('Migration applied:', name);
      }
    }
  } catch (err) {
    console.error('Migration error:', err);
    try { await client.query('ROLLBACK'); } catch(e){}
    throw err;
  } finally {
    client.release();
  }
}

export default runMigrations;
