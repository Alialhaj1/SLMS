// Detailed debug for help-requests 500 bug
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    // The EXACT code from helpRequests.ts GET handler
    const status = undefined;
    const page = 1;
    const limit = 20;
    const offset = (Number(page) - 1) * Number(limit);

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

    if (status) {
      params.push(status);
      query += ` AND hr.status = $${params.length}`;
    }

    // Count total - THIS IS THE BUG
    const replaceTarget = 'SELECT hr.*, u.email as user_email, u.full_name as user_name, c.name as company_name';
    console.log('Query contains exact target?', query.includes(replaceTarget));
    
    const countQuery = query.replace(replaceTarget, 'SELECT COUNT(*)');
    console.log('Replace worked?', countQuery.includes('COUNT'));
    
    if (!countQuery.includes('COUNT')) {
      console.log('=== BUG CONFIRMED ===');
      console.log('The multi-line SQL has different whitespace than single-line replace target');
      console.log('Query SELECT part:', JSON.stringify(query.substring(0, 200)));
    }
    
    // Now try the actual count query
    const countResult = await pool.query(countQuery, params.slice());
    console.log('countResult.rows[0]:', JSON.stringify(countResult.rows[0]));
    console.log('countResult.rows[0].count:', countResult.rows[0].count);
    const total = parseInt(countResult.rows[0].count);
    console.log('total (parseInt):', total, 'isNaN?', isNaN(total));
    
    // Get paginated
    query += ` ORDER BY hr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    console.log('result.rows.length:', result.rows.length);
    
    // Final response would be:
    const response = {
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
    console.log('pagination:', JSON.stringify(response.pagination));
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
  await pool.end();
}
test();
