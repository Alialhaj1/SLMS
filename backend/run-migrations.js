const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  const files = fs.readdirSync('./migrations')
    .filter(f => f.endsWith('.sql') && !f.includes('.done'))
    .sort();
    
  console.log(`\nRunning ${files.length} migration files...\n`);
  
  for (const file of files) {
    console.log(`📄 ${file}`);
    const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`   ✓ Success\n`);
    } catch (err) {
      console.log(`   ✗ Error: ${err.message}\n`);
      // Continue with other migrations even if one fails
    }
  }
  
  await pool.end();
  console.log('✓ Migration complete!');
}

runMigrations().catch(console.error);
