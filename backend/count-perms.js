const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
p.query("SELECT COUNT(*) FROM role_permissions rp JOIN user_roles ur ON ur.role_id=rp.role_id AND ur.user_id=67")
  .then(r=>{console.log('Count:', r.rows[0].count); p.end()});
