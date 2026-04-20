const {Pool}=require('pg');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
(async()=>{
  try {
    // Check tenants table columns
    const r0=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='tenants' AND table_schema='public' ORDER BY ordinal_position");
    console.log('=== tenants columns ===');
    console.log(r0.rows.map(r=>r.column_name).join(', '));

    // Check tenants data
    const r2=await p.query("SELECT * FROM tenants WHERE deleted_at IS NULL ORDER BY id LIMIT 10");
    console.log('\n=== tenants data ===');
    r2.rows.forEach(r=>console.log(JSON.stringify(r)));

    // Check companies table columns
    const r3=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='companies' AND table_schema='public' ORDER BY ordinal_position");
    console.log('\n=== companies columns ===');
    console.log(r3.rows.map(r=>r.column_name).join(', '));

  } catch(e) { console.error(e.message); }
  await p.end();
})();
