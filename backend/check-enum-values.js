const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function checkEnums() {
  try {
    console.log('\n=== Checking ENUM Values ===\n');

    // Check document_status enum
    const result = await pool.query(`
      SELECT 
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'document_status'
      ORDER BY e.enumsortorder;
    `);

    console.log('document_status enum values:');
    result.rows.forEach(row => {
      console.log('  -', row.enum_value);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkEnums();
