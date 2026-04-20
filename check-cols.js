const {Pool}=require('pg');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
(async()=>{
  try {
    const r1=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema='public' AND column_name LIKE '%login%' ORDER BY ordinal_position");
    console.log('users login columns:', r1.rows.map(r=>r.column_name));

    const r2=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='subscription_plans' AND table_schema='public' ORDER BY ordinal_position");
    console.log('subscription_plans columns:', r2.rows.map(r=>r.column_name));

    const r3=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='modules' AND table_schema='public' ORDER BY ordinal_position");
    console.log('modules columns:', r3.rows.map(r=>r.column_name));

    // Check users columns for status
    const r4=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema='public' ORDER BY ordinal_position");
    console.log('users all columns:', r4.rows.map(r=>r.column_name));

  } catch(e) { console.error(e.message); }
  await p.end();
})();
