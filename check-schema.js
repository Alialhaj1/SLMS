const {Pool}=require('pg');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
(async()=>{
  try {
    // Check audit_logs columns
    const r1=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs' AND table_schema='public' ORDER BY ordinal_position");
    console.log('=== audit_logs columns ===');
    console.log(r1.rows.map(r=>r.column_name).join(', '));

    // Check tenants table to understand ID issues
    const r2=await p.query("SELECT id, code, name, status FROM tenants WHERE deleted_at IS NULL ORDER BY id");
    console.log('\n=== tenants ===');
    r2.rows.forEach(r=>console.log(`  id=${r.id} code=${r.code} name=${r.name} status=${r.status}`));

    // Check what dashboard route queries
    const r3=await p.query("SELECT count(*) as cnt FROM tenants WHERE deleted_at IS NULL");
    console.log('\n=== tenant count ===', r3.rows[0].cnt);

    // Check companies table  
    const r4=await p.query("SELECT id, code, name, status FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 10");
    console.log('\n=== companies ===');
    r4.rows.forEach(r=>console.log(`  id=${r.id} code=${r.code} name=${r.name} status=${r.status}`));

  } catch(e) { console.error(e.message); }
  await p.end();
})();
