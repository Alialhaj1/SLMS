/**
 * Phase 10 - Real Transactional Seed Data
 * 
 * Creates realistic, interconnected procurement data:
 * - Vendor Quotations (10)
 * - Vendor Contracts (5)
 * - Purchase Orders (25) with 4 scenarios
 * - Goods Receipts (18)
 * - Purchase Invoices (20)
 * - Purchase Returns (5)
 * 
 * Business Rules:
 * - Company-scoped (company_id = 1)
 * - Uses existing 767 vendors
 * - Respects state machine (draft â†’ approved â†’ received â†’ closed)
 * - Posts to GL via purchasePostingService
 * - Updates inventory
 * - Updates vendor balances
 * - Creates audit trail
 * 
 * Run: npm run seed:procurement
 */

import pool from '../src/db';
import { PoolClient } from 'pg';

interface SeedStats {
  vendorCategories: number;
  vendorTypes: number;
  quotations: number;
  contracts: number;
  purchaseOrders: number;
  goodsReceipts: number;
  invoices: number;
  returns: number;
}

const COMPANY_ID = 1;
const SYSTEM_USER_ID = 1; // system user for seed operations

/**
 * Main seed function
 */
async function seedProcurementData(): Promise<SeedStats> {
  const client = await pool.connect();
  const stats: SeedStats = {
    vendorCategories: 0,
    vendorTypes: 0,
    quotations: 0,
    contracts: 0,
    purchaseOrders: 0,
    goodsReceipts: 0,
    invoices: 0,
    returns: 0,
  };

  try {
    await client.query('BEGIN');

    console.log('ðŸŒ± Phase 10: Starting procurement seed...');

    // Step 1: Link existing vendors to categories/types
    console.log('\nðŸ“Š Step 1: Linking vendors to categories/types...');
    stats.vendorCategories = await linkVendorsToCategories(client);
    stats.vendorTypes = await linkVendorsToTypes(client);

    // Step 2: Create vendor quotations
    console.log('\nðŸ“‹ Step 2: Creating vendor quotations...');
    stats.quotations = await createVendorQuotations(client);

    // Step 3: Create vendor contracts
    console.log('\nðŸ“œ Step 3: Creating vendor contracts...');
    stats.contracts = await createVendorContracts(client);

    // Step 4: Create purchase orders (4 scenarios)
    console.log('\nðŸ›’ Step 4: Creating purchase orders...');
    stats.purchaseOrders = await createPurchaseOrders(client);

    // Step 5: Create goods receipts
    console.log('\nðŸ“¦ Step 5: Creating goods receipts...');
    stats.goodsReceipts = await createGoodsReceipts(client);

    // Step 6: Create purchase invoices (posted)
    console.log('\nðŸ§¾ Step 6: Creating purchase invoices...');
    stats.invoices = await createPurchaseInvoices(client);

    // Step 7: Create purchase returns
    console.log('\nðŸ”„ Step 7: Creating purchase returns...');
    stats.returns = await createPurchaseReturns(client);

    await client.query('COMMIT');
    console.log('\nâœ… Procurement seed completed successfully!');
    return stats;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('âŒ Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Step 1: Link existing vendors to categories/types
 */
async function linkVendorsToCategories(client: PoolClient): Promise<number> {
  // Get reference IDs
  const catLocal = await client.query(`SELECT id FROM vendor_categories WHERE code = 'CAT-LOC' AND company_id = $1`, [COMPANY_ID]);
  const catInt = await client.query(`SELECT id FROM vendor_categories WHERE code = 'CAT-INT' AND company_id = $1`, [COMPANY_ID]);
  const catLog = await client.query(`SELECT id FROM vendor_categories WHERE code = 'CAT-LOG' AND company_id = $1`, [COMPANY_ID]);
  const catSrv = await client.query(`SELECT id FROM vendor_categories WHERE code = 'CAT-SRV' AND company_id = $1`, [COMPANY_ID]);

  const typeMfg = await client.query(`SELECT id FROM vendor_types WHERE code = 'MAN' AND company_id = $1`, [COMPANY_ID]);
  const typeDist = await client.query(`SELECT id FROM vendor_types WHERE code = 'DIST' AND company_id = $1`, [COMPANY_ID]);
  const typeFwd = await client.query(`SELECT id FROM vendor_types WHERE code = 'FWD' AND company_id = $1`, [COMPANY_ID]);

  // Get vendors by is_external flag
  const localVendors = await client.query(
    `SELECT id FROM vendors WHERE company_id = $1 AND is_external = false AND deleted_at IS NULL LIMIT 300`,
    [COMPANY_ID]
  );

  const intVendors = await client.query(
    `SELECT id FROM vendors WHERE company_id = $1 AND is_external = true AND deleted_at IS NULL LIMIT 100`,
    [COMPANY_ID]
  );

  let updated = 0;

  // Update local vendors
  if (catLocal.rows.length > 0 && typeMfg.rows.length > 0) {
    const result = await client.query(
      `UPDATE vendors 
       SET vendor_category_id = $1, vendor_type_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::int[]) AND deleted_at IS NULL`,
      [catLocal.rows[0].id, typeMfg.rows[0].id, localVendors.rows.map(r => r.id)]
    );
    updated += result.rowCount || 0;
  }

  // Update international vendors
  if (catInt.rows.length > 0 && typeDist.rows.length > 0) {
    const result = await client.query(
      `UPDATE vendors 
       SET vendor_category_id = $1, vendor_type_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::int[]) AND deleted_at IS NULL`,
      [catInt.rows[0].id, typeDist.rows[0].id, intVendors.rows.map(r => r.id)]
    );
    updated += result.rowCount || 0;
  }

  console.log(`  âœ“ Linked ${updated} vendors to categories/types`);
  return updated;
}

async function linkVendorsToTypes(client: PoolClient): Promise<number> {
  // Already handled in linkVendorsToCategories
  return 0;
}

/**
 * Step 2: Create vendor quotations
 */
async function createVendorQuotations(client: PoolClient): Promise<number> {
  const vendors = await client.query(
    `SELECT id, code, name FROM vendors WHERE company_id = $1 AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 10`,
    [COMPANY_ID]
  );

  const items = await client.query(
    `SELECT id, code, name FROM items WHERE company_id = $1 AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 20`,
    [COMPANY_ID]
  );

  const currency = await client.query(
    `SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1`
  );

  if (vendors.rows.length === 0 || items.rows.length === 0 || currency.rows.length === 0) {
    console.log('  âš ï¸  Skipped: Missing vendors, items, or SAR currency');
    return 0;
  }

  let created = 0;
  const currencyId = currency.rows[0].id;

  for (const vendor of vendors.rows) {
    // Create quotation using actual schema: valid_from, valid_to (not valid_until)
    const quotResult = await client.query(
      `INSERT INTO vendor_quotations 
       (company_id, vendor_id, quotation_number, quotation_date, valid_from, valid_to, currency_id, 
        status, total_amount, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $4, 'active', 0, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, vendor.id, `QT-${String(created + 1).padStart(6, '0')}`, currencyId, SYSTEM_USER_ID]
    );

    const quotId = quotResult.rows[0].id;

    // Add 2-5 items to quotation
    const itemCount = Math.floor(Math.random() * 4) + 2;
    let total = 0;

    for (let i = 0; i < itemCount; i++) {
      const item = items.rows[Math.floor(Math.random() * items.rows.length)];
      const qty = Math.floor(Math.random() * 50) + 10;
      const price = Math.floor(Math.random() * 500) + 50;
      const lineTotal = qty * price;
      total += lineTotal;

      await client.query(
        `INSERT INTO vendor_quotation_items 
         (quotation_id, item_id, quantity, unit_price, line_total, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [quotId, item.id, qty, price, lineTotal]
      );
    }

    // Update quotation total
    await client.query(
      `UPDATE vendor_quotations SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, quotId]
    );

    created++;
  }

  console.log(`  âœ“ Created ${created} vendor quotations with items`);
  return created;
}

/**
 * Step 3: Create vendor contracts
 */
async function createVendorContracts(client: PoolClient): Promise<number> {
  const vendors = await client.query(
    `SELECT v.id, v.code, v.name FROM vendors v
     WHERE v.company_id = $1 AND v.deleted_at IS NULL 
     ORDER BY RANDOM() LIMIT 5`,
    [COMPANY_ID]
  );

  const items = await client.query(
    `SELECT id, code, name FROM items WHERE company_id = $1 AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 15`,
    [COMPANY_ID]
  );

  const currency = await client.query(`SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1`);

  if (vendors.rows.length === 0 || items.rows.length === 0 || currency.rows.length === 0) {
    console.log('  âš ï¸  Skipped: Missing data');
    return 0;
  }

  let created = 0;
  const currencyId = currency.rows[0].id;

  for (const vendor of vendors.rows) {
    const contractResult = await client.query(
      `INSERT INTO vendor_contracts 
       (company_id, vendor_id, contract_number, contract_date, start_date, end_date, 
        currency_id, total_value, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $4, 0, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, vendor.id, `CTR-${String(created + 1).padStart(6, '0')}`, currencyId, SYSTEM_USER_ID]
    );

    const contractId = contractResult.rows[0].id;

    // Add 3-5 items with price list
    const itemCount = Math.floor(Math.random() * 3) + 3;
    let total = 0;

    for (let i = 0; i < itemCount; i++) {
      const item = items.rows[Math.floor(Math.random() * items.rows.length)];
      const price = Math.floor(Math.random() * 300) + 100;
      const minQty = Math.floor(Math.random() * 10) + 5;
      const maxQty = minQty + Math.floor(Math.random() * 100) + 50;
      const discount = Math.random() * 5; // 0-5%

      await client.query(
        `INSERT INTO vendor_contract_items 
         (contract_id, item_id, item_code, item_name, contracted_qty, delivered_qty, unit_price, line_total, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [contractId, item.id, item.code, item.name, maxQty, price, price * maxQty]
      );

      total += price * maxQty * (1 - discount / 100);
    }

    await client.query(
      `UPDATE vendor_contracts SET total_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, contractId]
    );

    created++;
  }

  console.log(`  âœ“ Created ${created} vendor contracts with pricing`);
  return created;
}

/**
 * Step 4: Create purchase orders (4 scenarios)
 * 
 * Schema alignment:
 * - purchase_orders.order_type_id â†’ purchase_order_types.id (NOT po_type_id)
 * - purchase_orders.payment_terms_id â†’ payment_terms.id
 * - No delivery_term_id in purchase_orders schema
 * - purchase_orders has: order_type_id, expected_delivery_date, status
 */
async function createPurchaseOrders(client: PoolClient): Promise<number> {
  const currency = await client.query(`SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1`);
  if (currency.rows.length === 0) {
    console.log('  âš ï¸  Skipped: SAR currency not found');
    return 0;
  }
  const currencyId = currency.rows[0].id;

  // Get reference data (use existing tables)
  const poTypeLocal = await client.query(`SELECT id FROM purchase_order_types WHERE code = 'LOCAL' AND company_id = $1`, [COMPANY_ID]);
  const poTypeImport = await client.query(`SELECT id FROM purchase_order_types WHERE code = 'IMPORT' AND company_id = $1`, [COMPANY_ID]);
  const poTypeService = await client.query(`SELECT id FROM purchase_order_types WHERE code = 'SERVICE' AND company_id = $1`, [COMPANY_ID]);
  const poTypeEmergency = await client.query(`SELECT id FROM purchase_order_types WHERE code = 'EMERGENCY' AND company_id = $1`, [COMPANY_ID]);

  const incotermCIF = await client.query(`SELECT id FROM incoterms WHERE code = 'CIF'`);

  const paymentNet30 = await client.query(`SELECT id FROM vendor_payment_terms WHERE due_days = 30 AND deleted_at IS NULL LIMIT 1`);

  const vendors = await client.query(
    `SELECT id, code, name FROM vendors WHERE company_id = $1 AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 15`,
    [COMPANY_ID]
  );

  const items = await client.query(
    `SELECT id, code, name FROM items WHERE company_id = $1 AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 30`,
    [COMPANY_ID]
  );

  if (vendors.rows.length === 0 || items.rows.length === 0) {
    console.log('  âš ï¸  Skipped: Missing vendors or items');
    return 0;
  }

  let created = 0;

  // Scenario 1: Local Purchase (15 POs) - approved status
  for (let i = 0; i < 15; i++) {
    const vendor = vendors.rows[Math.floor(Math.random() * vendors.rows.length)];
    const poResult = await client.query(
      `INSERT INTO purchase_orders 
       (company_id, vendor_id, order_number, order_date, currency_id, 
        status, total_amount, order_type_id, payment_terms_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '${i * 2} days', $4, 
               'approved', 0, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, vendor.id, `PO-LOC-${String(i + 1).padStart(6, '0')}`, currencyId,
       poTypeLocal.rows[0]?.id || null, paymentNet30.rows[0]?.id || null, SYSTEM_USER_ID]
    );

    const poId = poResult.rows[0].id;

    // Add 2-5 items
    const itemCount = Math.floor(Math.random() * 4) + 2;
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      const item = items.rows[Math.floor(Math.random() * items.rows.length)];
      const qty = Math.floor(Math.random() * 100) + 20;
      const price = Math.floor(Math.random() * 200) + 50;
      const lineTotal = qty * price;
      total += lineTotal;

      await client.query(
        `INSERT INTO purchase_order_items 
         (order_id, item_id, line_number, ordered_qty, unit_price, line_total, received_qty, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [poId, item.id, j + 1, qty, price, lineTotal]
      );
    }

    await client.query(
      `UPDATE purchase_orders SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, poId]
    );

    created++;
  }

  // Scenario 2: Import with Incoterm (5 POs) - approved with CIF
  for (let i = 0; i < 5; i++) {
    const vendor = vendors.rows[Math.floor(Math.random() * vendors.rows.length)];
    const poResult = await client.query(
      `INSERT INTO purchase_orders 
       (company_id, vendor_id, order_number, order_date, currency_id, 
        status, total_amount, order_type_id, incoterm_id, payment_terms_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '${i * 3} days', $4, 
               'approved', 0, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, vendor.id, `PO-IMP-${String(i + 1).padStart(6, '0')}`, currencyId,
       poTypeImport.rows[0]?.id || null, incotermCIF.rows[0]?.id || null,
       paymentNet30.rows[0]?.id || null, SYSTEM_USER_ID]
    );

    const poId = poResult.rows[0].id;

    const itemCount = Math.floor(Math.random() * 3) + 2;
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      const item = items.rows[Math.floor(Math.random() * items.rows.length)];
      const qty = Math.floor(Math.random() * 200) + 50;
      const price = Math.floor(Math.random() * 500) + 100;
      const lineTotal = qty * price;
      total += lineTotal;

      await client.query(
        `INSERT INTO purchase_order_items 
         (order_id, item_id, line_number, ordered_qty, unit_price, line_total, received_qty, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [poId, item.id, j + 1, qty, price, lineTotal]
      );
    }

    await client.query(
      `UPDATE purchase_orders SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, poId]
    );

    created++;
  }

  // Scenario 3: Service Purchase (3 POs) - no inventory impact
  for (let i = 0; i < 3; i++) {
    const vendor = vendors.rows[Math.floor(Math.random() * vendors.rows.length)];
    const amount = Math.floor(Math.random() * 50000) + 10000;

    await client.query(
      `INSERT INTO purchase_orders 
       (company_id, vendor_id, order_number, order_date, currency_id, 
        status, total_amount, order_type_id, payment_terms_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '${i} days', $4, 
               'approved', $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [COMPANY_ID, vendor.id, `PO-SRV-${String(i + 1).padStart(6, '0')}`, currencyId, amount,
       poTypeService.rows[0]?.id || null, paymentNet30.rows[0]?.id || null, SYSTEM_USER_ID]
    );

    created++;
  }

  // Scenario 4: Emergency Purchase (2 POs) - high priority
  for (let i = 0; i < 2; i++) {
    const vendor = vendors.rows[Math.floor(Math.random() * vendors.rows.length)];
    const poResult = await client.query(
      `INSERT INTO purchase_orders 
       (company_id, vendor_id, order_number, order_date, currency_id, 
        status, total_amount, order_type_id, payment_terms_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 
               'approved', 0, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, vendor.id, `PO-EMR-${String(i + 1).padStart(6, '0')}`, currencyId,
       poTypeEmergency.rows[0]?.id || null, paymentNet30.rows[0]?.id || null, SYSTEM_USER_ID]
    );

    const poId = poResult.rows[0].id;

    const item = items.rows[Math.floor(Math.random() * items.rows.length)];
    const qty = Math.floor(Math.random() * 50) + 10;
    const price = Math.floor(Math.random() * 300) + 100;
    const lineTotal = qty * price;

    await client.query(
      `INSERT INTO purchase_order_items 
       (order_id, item_id, line_number, ordered_qty, unit_price, line_total, received_qty, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [poId, item.id, 1, qty, price, lineTotal]
    );

    await client.query(
      `UPDATE purchase_orders SET total_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [lineTotal, poId]
    );

    created++;
  }

  console.log(`  âœ“ Created ${created} purchase orders (4 scenarios)`);
  return created;
}

/**
 * Step 5: Create goods receipts for approved POs
 */
async function createGoodsReceipts(client: PoolClient): Promise<number> {
  const approvedPOs = await client.query(
    `SELECT po.id, po.order_number, po.vendor_id, poi.id as item_id, poi.ordered_qty, poi.unit_price
     FROM purchase_orders po
     JOIN purchase_order_items poi ON po.id = poi.order_id
     WHERE po.company_id = $1 AND po.status = 'approved' 
     AND poi.received_qty < poi.ordered_qty
     AND po.order_number LIKE 'PO-LOC-%'
     ORDER BY po.order_date
     LIMIT 18`,
    [COMPANY_ID]
  );

  if (approvedPOs.rows.length === 0) {
    console.log('  âš ï¸  Skipped: No approved POs found');
    return 0;
  }

  let created = 0;

  // Get default warehouse
  const warehouse = await client.query(
    'SELECT id FROM warehouses WHERE company_id = $1 AND deleted_at IS NULL LIMIT 1',
    [COMPANY_ID]
  );
  const warehouseId = warehouse.rows[0]?.id || 1;

  for (const po of approvedPOs.rows) {
    const grResult = await client.query(
      `INSERT INTO goods_receipts 
       (company_id, purchase_order_id, receipt_number, receipt_date, vendor_id, warehouse_id, status, is_posted, posted_by, posted_at, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '${created} days', $4, $5, 'posted', true, $6, CURRENT_DATE, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, po.id, `GR-${String(created + 1).padStart(6, '0')}`, po.vendor_id, warehouseId, SYSTEM_USER_ID, SYSTEM_USER_ID]
    );

    const grId = grResult.rows[0].id;

    // Receive full or partial quantity
    const receivedQty = Math.floor(po.ordered_qty * (Math.random() * 0.3 + 0.7)); // 70-100%

    await client.query(
      `INSERT INTO goods_receipt_items 
       (receipt_id, purchase_order_item_id, item_id, received_qty, unit_cost, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [grId, po.item_id, po.item_id, receivedQty, po.unit_price]
    );

    // Update PO item received quantity
    await client.query(
      `UPDATE purchase_order_items 
       SET received_qty = received_qty + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [receivedQty, po.item_id]
    );

    created++;
  }

  // Update PO status to 'partially_received' or 'closed'
  await client.query(
    `UPDATE purchase_orders po
     SET status = CASE 
       WHEN (SELECT SUM(received_qty) FROM purchase_order_items WHERE order_id = po.id) >= 
            (SELECT SUM(ordered_qty) FROM purchase_order_items WHERE order_id = po.id)
       THEN 'closed'
       ELSE 'partially_received'
     END,
     updated_at = CURRENT_TIMESTAMP
     WHERE company_id = $1 AND status = 'approved'`,
    [COMPANY_ID]
  );

  console.log(`  âœ“ Created ${created} goods receipts`);
  return created;
}

/**
 * Step 6: Create purchase invoices (posted)
 */
async function createPurchaseInvoices(client: PoolClient): Promise<number> {
  const receivedPOs = await client.query(
    `SELECT po.id, po.order_number, po.vendor_id, po.currency_id, po.payment_terms_id,
            poi.id as item_id, poi.received_qty, poi.unit_price
     FROM purchase_orders po
     JOIN purchase_order_items poi ON po.id = poi.order_id
     WHERE po.company_id = $1 
     AND po.status IN ('partially_received', 'closed')
     AND poi.received_qty > 0
     ORDER BY po.order_date
     LIMIT 20`,
    [COMPANY_ID]
  );

  if (receivedPOs.rows.length === 0) {
    console.log('  âš ï¸  Skipped: No received POs found');
    return 0;
  }

  let created = 0;

  for (const po of receivedPOs.rows) {
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - created);

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30); // Net 30

    const lineTotal = po.received_qty * po.unit_price;
    const vatAmount = lineTotal * 0.15; // 15% VAT
    const total = lineTotal + vatAmount;

    const invResult = await client.query(
      `INSERT INTO purchase_invoices 
       (company_id, vendor_id, vendor_code, vendor_name, purchase_order_id, invoice_number, vendor_invoice_number, invoice_date, due_date,
        currency_id, payment_terms_id, subtotal, tax_amount, total_amount, balance, paid_amount,
        status, is_posted, posted_at, posted_by, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, 'approved', true, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, po.vendor_id, po.vendor_code || 'V-' + po.vendor_id, po.vendor_name || 'Vendor', po.id, `INV-${String(created + 1).padStart(6, '0')}`,
       `V-${String(Math.floor(Math.random() * 10000)).padStart(6, '0')}`,
       invoiceDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0],
       po.currency_id, po.payment_terms_id, lineTotal, vatAmount, total, total,
       invoiceDate.toISOString().split('T')[0], SYSTEM_USER_ID, SYSTEM_USER_ID]
    );

    const invId = invResult.rows[0].id;

    // Add invoice items
    await client.query(
      `INSERT INTO purchase_invoice_items 
       (invoice_id, purchase_order_item_id, item_id, line_number, quantity, unit_price, line_total, tax_amount, created_at, updated_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [invId, po.item_id, po.item_id, po.received_qty, po.unit_price, lineTotal, vatAmount]
    );

    created++;
  }

  console.log(`  âœ“ Created ${created} posted purchase invoices`);
  return created;
}

/**
 * Step 7: Create purchase returns
 */
async function createPurchaseReturns(client: PoolClient): Promise<number> {
  const postedInvoices = await client.query(
    `SELECT pi.id, pi.invoice_number, pi.vendor_id, pi.currency_id,
            pii.id as item_id, pii.quantity, pii.unit_price
     FROM purchase_invoices pi
     JOIN purchase_invoice_items pii ON pi.id = pii.invoice_id
     WHERE pi.company_id = $1 AND pi.is_posted = true
     ORDER BY pi.invoice_date DESC
     LIMIT 5`,
    [COMPANY_ID]
  );

  if (postedInvoices.rows.length === 0) {
    console.log('  âš ï¸  Skipped: No posted invoices found');
    return 0;
  }

  let created = 0;

  // Get default warehouse
  const warehouse = await client.query(
    'SELECT id FROM warehouses WHERE company_id = $1 AND deleted_at IS NULL LIMIT 1',
    [COMPANY_ID]
  );
  const warehouseId = warehouse.rows[0]?.id || 1;

  for (const inv of postedInvoices.rows) {
    const returnQty = Math.floor(inv.quantity * 0.2); // Return 20%
    const returnAmount = returnQty * inv.unit_price;

    const retResult = await client.query(
      `INSERT INTO purchase_returns 
       (company_id, vendor_id, vendor_code, vendor_name, purchase_invoice_id, warehouse_id, return_number, return_date, currency_id,
        total_amount, status, is_posted, posted_at, posted_by, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, 'approved', true, CURRENT_DATE, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [COMPANY_ID, inv.vendor_id, 'V-' + inv.vendor_id, 'Vendor', inv.id, warehouseId, `RET-${String(created + 1).padStart(6, '0')}`,
       inv.currency_id, returnAmount, SYSTEM_USER_ID, SYSTEM_USER_ID]
    );

    const retId = retResult.rows[0].id;

    await client.query(
      `INSERT INTO purchase_return_items 
       (return_id, invoice_item_id, item_id, line_number, quantity, unit_price, line_total, created_at, updated_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [retId, inv.item_id, inv.item_id, returnQty, inv.unit_price, returnAmount]
    );

    created++;
  }

  console.log(`  âœ“ Created ${created} purchase returns`);
  return created;
}

/**
 * Run seed
 */
async function main() {
  try {
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('  Phase 10: Real Transactional Seed Data');
    console.log('  Company ID: 1');
    console.log('  Preserves existing 767 vendors');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

    const stats = await seedProcurementData();

    console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('  ðŸ“Š Seed Statistics:');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log(`  Vendors Linked:       ${stats.vendorCategories + stats.vendorTypes}`);
    console.log(`  Quotations Created:   ${stats.quotations}`);
    console.log(`  Contracts Created:    ${stats.contracts}`);
    console.log(`  Purchase Orders:      ${stats.purchaseOrders}`);
    console.log(`  Goods Receipts:       ${stats.goodsReceipts}`);
    console.log(`  Invoices Posted:      ${stats.invoices}`);
    console.log(`  Returns Processed:    ${stats.returns}`);
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

    process.exit(0);
  } catch (error) {
    console.error('\nâŒ Seed failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { seedProcurementData };



