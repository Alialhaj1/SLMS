const pool = require('./src/db').default;

(async () => {
  try {
    // Check tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('batch_numbers', 'inventory_policies', 'reorder_rules')
      ORDER BY table_name
    `;
    const tables = await pool.query(tablesQuery);
    
    console.log('✅ Group 3 Tables:');
    tables.rows.forEach(r => console.log(`   - ${r.table_name}`));
    
    // Check data counts
    const countsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM batch_numbers) as batches,
        (SELECT COUNT(*) FROM inventory_policies) as policies,
        (SELECT COUNT(*) FROM reorder_rules) as rules
    `;
    const counts = await pool.query(countsQuery);
    
    console.log('\n📊 Current Data:');
    console.log(`   Batch Numbers: ${counts.rows[0].batches}`);
    console.log(`   Inventory Policies: ${counts.rows[0].policies}`);
    console.log(`   Reorder Rules: ${counts.rows[0].rules}`);
    
    // Check items table (needed for testing)
    const itemsCount = await pool.query('SELECT COUNT(*) FROM items WHERE deleted_at IS NULL');
    console.log(`   Items (active): ${itemsCount.rows[0].count}`);
    
    // Check warehouses table
    const warehousesCount = await pool.query('SELECT COUNT(*) FROM warehouses WHERE deleted_at IS NULL');
    console.log(`   Warehouses (active): ${warehousesCount.rows[0].count}`);
    
    await pool.end();
    console.log('\n✅ Database check complete');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
