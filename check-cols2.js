const {Pool}=require('pg');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
(async()=>{
  try {
    // tenant_modules columns
    const r1=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='tenant_modules' ORDER BY ordinal_position");
    console.log('tenant_modules cols:', r1.rows.map(r=>r.column_name));

    // permissions columns (check for module_code)
    const r2=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='permissions' ORDER BY ordinal_position");
    console.log('permissions cols:', r2.rows.map(r=>r.column_name));

    // modules sample data (first 3)
    const r3=await p.query("SELECT module_code, module_name, is_active, is_core, category, sort_order FROM modules LIMIT 5");
    console.log('\nmodules sample:');
    r3.rows.forEach(r=>console.log(' ', JSON.stringify(r)));

    // Check if display_order alias exists or it's sort_order
    const r4=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='modules' AND column_name IN ('display_order', 'sort_order')");
    console.log('\nmodules order column:', r4.rows.map(r=>r.column_name));

  } catch(e) { console.error(e.message); }
  await p.end();
})();
