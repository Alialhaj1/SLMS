const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://slms:slms_pass@localhost:5432/slms_db'
});

async function findDashboard() {
  try {
    const result = await pool.query(`
      SELECT * FROM permissions 
      WHERE permission_code = 'dashboard:view'
    `);
    
    console.log('Dashboard:view permission:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('\n⚠️ dashboard:view NOT FOUND! Need to create it.');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

findDashboard();
