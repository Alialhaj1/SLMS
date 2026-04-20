const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
pool.query('SELECT COUNT(*) as cnt FROM help_requests').then(r=>console.log(JSON.stringify(r.rows[0]))).catch(e=>console.error('ERR:',e.message)).finally(()=>pool.end());
