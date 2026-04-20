// Debug help-requests 500 error
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    let query = `
      SELECT 
        hr.*,
        u.email as user_email,
        u.full_name as user_name,
        c.name as company_name
      FROM help_requests hr
      LEFT JOIN users u ON hr.user_id = u.id
      LEFT JOIN companies c ON hr.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Count total (same replace as in the route)
    const countQuery = query.replace(
      'SELECT hr.*, u.email as user_email, u.full_name as user_name, c.name as company_name',
      'SELECT COUNT(*)'
    );
    console.log('Count query:', countQuery.trim());
    const countResult = await pool.query(countQuery, params.slice());
    console.log('Count result:', countResult.rows[0]);

    // Paginated query
    query += ` ORDER BY hr.created_at DESC LIMIT $1 OFFSET $2`;
    params.push(20, 0);
    const result = await pool.query(query, params);
    console.log('Data result:', result.rows.length, 'rows');
    console.log('SUCCESS - query works fine');
  } catch (e) {
    console.error('QUERY ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
  await pool.end();
}
test();
