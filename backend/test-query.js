const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://slms:slms_pass@slms-postgres-1:5432/slms_db' });

async function test() {
  const companyId = 1;
  const parentId = 171;
  const parentCode = '102';
  const prefixLength = 3;
  const likePattern = parentCode + '___';
  
  // Test with ::integer cast
  const queryParams = [companyId, parentId, prefixLength + 1, likePattern, prefixLength + 3];
  console.log('Query params:', queryParams);
  
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM $3::integer) AS INTEGER)), 0) + 1 as next_seq 
     FROM projects 
     WHERE company_id = $1 
       AND parent_project_id = $2 
       AND deleted_at IS NULL 
       AND code LIKE $4 
       AND LENGTH(code) = $5`,
    queryParams
  );
  
  console.log('Result with ::integer cast:', result.rows);
  pool.end();
}

test().catch(console.error);
