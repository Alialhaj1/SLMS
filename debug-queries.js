const {Pool}=require('pg');
const p=new Pool({host:'postgres',user:'slms',password:'slms_pass',database:'slms_db'});
(async()=>{
  try {
    // Check if modules/platform_modules table exists
    const r1=await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%module%' ORDER BY table_name");
    console.log('=== module tables ===');
    r1.rows.forEach(r=>console.log('  ', r.table_name));

    // Check if subscription_plans table exists
    const r2=await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%subscription%' ORDER BY table_name");
    console.log('\n=== subscription tables ===');
    r2.rows.forEach(r=>console.log('  ', r.table_name));

    // Check subscription_plans data
    const r3=await p.query("SELECT * FROM subscription_plans LIMIT 5").catch(()=>({rows:[]}));
    console.log('\n=== subscription_plans data ===');
    r3.rows.forEach(r=>console.log(JSON.stringify(r)));

    // Does failed_login_attempts exist?
    const r4=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='failed_login_attempts' ORDER BY ordinal_position");
    console.log('\n=== failed_login_attempts columns ===');
    console.log(r4.rows.map(r=>r.column_name).join(', '));

    // Try the dashboard queries individually
    console.log('\n=== Testing dashboard queries individually ===');
    
    // Tenant KPIs
    try {
      const t=await p.query("SELECT COUNT(*) AS total FROM tenants WHERE deleted_at IS NULL");
      console.log('Tenant count OK:', t.rows[0].total);
    } catch(e) { console.log('Tenant query failed:', e.message); }

    // User KPIs  
    try {
      const u=await p.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) AS active, COUNT(*) FILTER (WHERE last_login >= CURRENT_DATE - INTERVAL '7 days') AS active_week FROM users WHERE deleted_at IS NULL");
      console.log('User count OK:', u.rows[0].total, 'active:', u.rows[0].active);
    } catch(e) { console.log('User query failed:', e.message); }

    // Revenue (joins subscription_plans)
    try {
      const r=await p.query("SELECT COALESCE(SUM(sp.price_monthly), 0) AS mrr FROM tenants t JOIN subscription_plans sp ON t.subscription_plan_id = sp.id WHERE t.status = 'active' AND t.deleted_at IS NULL AND sp.code != 'free'");
      console.log('Revenue query OK:', r.rows[0].mrr);
    } catch(e) { console.log('Revenue query failed:', e.message); }

    // Recent activity (audit_logs join)
    try {
      const a=await p.query("SELECT al.action, al.resource, al.created_at, u.email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 5");
      console.log('Audit query OK:', a.rows.length, 'rows');
    } catch(e) { console.log('Audit query failed:', e.message); }

    // Plan distribution
    try {
      const pd=await p.query("SELECT COALESCE(sp.name, 'No Plan') AS plan_name, COUNT(t.id) AS cnt FROM tenants t LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id WHERE t.deleted_at IS NULL GROUP BY sp.name");
      console.log('Plan dist OK:', pd.rows.map(r=>`${r.plan_name}:${r.cnt}`));
    } catch(e) { console.log('Plan dist failed:', e.message); }

    // Growth trend
    try {
      const gt=await p.query("SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS new_tenants FROM tenants WHERE created_at >= CURRENT_DATE - INTERVAL '6 months' AND deleted_at IS NULL GROUP BY DATE_TRUNC('month', created_at) ORDER BY month");
      console.log('Growth trend OK:', gt.rows.length, 'months');
    } catch(e) { console.log('Growth trend failed:', e.message); }

    // Check modules table structure
    const modTables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%module%' OR table_name LIKE '%platform_module%') ORDER BY table_name");
    console.log('\n=== All module-like tables ===');
    modTables.rows.forEach(r=>console.log('  ', r.table_name));

    // Check if any of them have data
    for (const tbl of modTables.rows) {
      try {
        const cnt = await p.query(`SELECT COUNT(*) as cnt FROM "${tbl.table_name}"`);
        const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${tbl.table_name}' ORDER BY ordinal_position`);
        console.log(`  ${tbl.table_name}: ${cnt.rows[0].cnt} rows, cols: ${cols.rows.map(r=>r.column_name).join(', ')}`);
      } catch(e) { console.log(`  ${tbl.table_name}: ERROR ${e.message}`); }
    }

  } catch(e) { console.error(e.message); }
  await p.end();
})();
