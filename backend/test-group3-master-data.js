/**
 * GROUP 3 MASTER DATA - COMPREHENSIVE TEST SUITE
 * Tests all validation, business logic, and edge cases
 * Run: node test-group3-master-data.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000';
let authToken = '';
let testCompanyId = null;

// Test counters
let passedTests = 0;
let failedTests = 0;
const failedTestDetails = [];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

function logTest(testName, passed, details = '') {
  if (passed) {
    passedTests++;
    log(`✅ PASS: ${testName}`, 'green');
  } else {
    failedTests++;
    failedTestDetails.push({ test: testName, details });
    log(`❌ FAIL: ${testName}`, 'red');
    if (details) log(`   Details: ${details}`, 'yellow');
  }
}

// ============================================================================
// 1️⃣ AUTHENTICATION
// ============================================================================

async function authenticate() {
  logSection('🔐 AUTHENTICATION');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'demo@example.com',
      password: 'Admin123!'
    });
    
    authToken = response.data.data.accessToken;
    testCompanyId = 1; // Use default company ID for testing
    
    log(`✅ Authenticated as: ${response.data.data.user.email}`, 'green');
    log(`✅ User ID: ${response.data.data.user.id}`, 'green');
    log(`✅ Roles: ${response.data.data.user.roles.join(', ')}`, 'green');
    return true;
  } catch (error) {
    log('❌ Authentication failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// ============================================================================
// 2️⃣ SETUP TEST DATA
// ============================================================================

let testItem = null;
let testItemNoBatch = null;
let testWarehouse = null;
let testSupplier = null;

async function setupTestData() {
  logSection('📦 SETTING UP TEST DATA');
  
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Create test warehouse
    const warehouseRes = await axios.post(`${API_URL}/api/master/warehouses`, {
      warehouse_code: 'WH-TEST-001',
      name_en: 'Test Warehouse',
      name_ar: 'مستودع الاختبار',
      warehouse_type: 'Main',
      is_active: true
    }, { headers });
    testWarehouse = warehouseRes.data.data;
    log(`✅ Created test warehouse: ${testWarehouse.warehouse_code}`, 'green');
    
    // Create test supplier
    const supplierRes = await axios.post(`${API_URL}/api/master/suppliers`, {
      supplier_code: 'SUP-TEST-001',
      name_en: 'Test Supplier',
      name_ar: 'مورد الاختبار',
      supplier_type: 'Manufacturer',
      is_active: true
    }, { headers });
    testSupplier = supplierRes.data.data;
    log(`✅ Created test supplier: ${testSupplier.supplier_code}`, 'green');
    
    // Create test item WITH batch tracking
    const itemRes = await axios.post(`${API_URL}/api/master/items`, {
      item_code: 'ITEM-BATCH-001',
      name_en: 'Test Item With Batch',
      name_ar: 'صنف اختبار مع دفعة',
      track_batches: true, // ✅ Batch tracking enabled
      track_serial_numbers: false,
      is_active: true
    }, { headers });
    testItem = itemRes.data.data;
    log(`✅ Created test item (batch enabled): ${testItem.item_code}`, 'green');
    
    // Create test item WITHOUT batch tracking
    const itemNoBatchRes = await axios.post(`${API_URL}/api/master/items`, {
      item_code: 'ITEM-NOBATCH-001',
      name_en: 'Test Item No Batch',
      name_ar: 'صنف اختبار بدون دفعة',
      track_batches: false, // ❌ Batch tracking disabled
      track_serial_numbers: false,
      is_active: true
    }, { headers });
    testItemNoBatch = itemNoBatchRes.data.data;
    log(`✅ Created test item (batch disabled): ${testItemNoBatch.item_code}`, 'green');
    
    return true;
  } catch (error) {
    log('❌ Test data setup failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// ============================================================================
// 3️⃣ BATCH NUMBERS TESTS
// ============================================================================

async function testBatchNumbers() {
  logSection('🧪 BATCH NUMBERS TESTS');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // TEST 1: ❌ Create batch for item without batch tracking
  try {
    log('\n📝 Test 1: Create batch for item without batch tracking (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-FAIL-001',
      item_id: testItemNoBatch.id, // ❌ Item doesn't support batches
      warehouse_id: testWarehouse.id,
      quantity: 100,
      manufacturing_date: '2024-01-01',
      expiry_date: '2025-01-01'
    }, { headers });
    
    logTest('Batch for non-batch item should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('batch') || error.response?.data?.error?.includes('track');
    logTest('Batch for non-batch item should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 2: ❌ Expiry date before manufacturing date
  try {
    log('\n📝 Test 2: Expiry date before manufacturing date (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-FAIL-002',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      quantity: 100,
      manufacturing_date: '2025-01-01',
      expiry_date: '2024-01-01' // ❌ Before manufacturing
    }, { headers });
    
    logTest('Expiry before manufacturing should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('expiry') || error.response?.data?.error?.includes('after');
    logTest('Expiry before manufacturing should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 3: ✅ Create valid batch
  let validBatch = null;
  try {
    log('\n📝 Test 3: Create valid batch (should succeed)', 'blue');
    const response = await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-VALID-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      quantity: 100,
      manufacturing_date: '2024-01-01',
      expiry_date: '2025-12-31',
      qr_code: 'QR-TEST-001',
      is_active: true
    }, { headers });
    
    validBatch = response.data.data;
    logTest('Valid batch creation', true);
  } catch (error) {
    logTest('Valid batch creation', false, error.response?.data?.error);
  }
  
  // TEST 4: ❌ Duplicate batch number for same item
  try {
    log('\n📝 Test 4: Duplicate batch number for same item (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-VALID-001', // ❌ Same batch number
      item_id: testItem.id, // ❌ Same item
      warehouse_id: testWarehouse.id,
      quantity: 50,
      manufacturing_date: '2024-02-01',
      expiry_date: '2025-12-31'
    }, { headers });
    
    logTest('Duplicate batch number should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('duplicate') || error.response?.data?.error?.includes('exists');
    logTest('Duplicate batch number should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 5: ✅ Create expiring batch (for filter test)
  let expiringBatch = null;
  try {
    log('\n📝 Test 5: Create batch expiring in 15 days', 'blue');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15); // Expires in 15 days
    
    const response = await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-EXPIRING-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      quantity: 50,
      manufacturing_date: '2024-01-01',
      expiry_date: futureDate.toISOString().split('T')[0],
      is_active: true
    }, { headers });
    
    expiringBatch = response.data.data;
    logTest('Expiring batch creation', true);
  } catch (error) {
    logTest('Expiring batch creation', false, error.response?.data?.error);
  }
  
  // TEST 6: ✅ Create expired batch (for filter test)
  let expiredBatch = null;
  try {
    log('\n📝 Test 6: Create expired batch', 'blue');
    const response = await axios.post(`${API_URL}/api/master/batch-numbers`, {
      batch_number: 'BATCH-EXPIRED-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      quantity: 30,
      manufacturing_date: '2023-01-01',
      expiry_date: '2024-01-01', // Already expired
      is_active: true
    }, { headers });
    
    expiredBatch = response.data.data;
    logTest('Expired batch creation', true);
  } catch (error) {
    logTest('Expired batch creation', false, error.response?.data?.error);
  }
  
  // TEST 7: ✅ Filter expiring_soon=true (should return BATCH-EXPIRING-001)
  try {
    log('\n📝 Test 7: Filter batches expiring in 30 days', 'blue');
    const response = await axios.get(`${API_URL}/api/master/batch-numbers?expiring_soon=true`, { headers });
    
    const foundExpiring = response.data.data.some(b => b.batch_number === 'BATCH-EXPIRING-001');
    const excludedValid = !response.data.data.some(b => b.batch_number === 'BATCH-VALID-001');
    
    logTest('Expiring_soon filter returns correct batches', foundExpiring && excludedValid, 
      `Found: ${response.data.data.length} batches, Includes expiring: ${foundExpiring}`);
  } catch (error) {
    logTest('Expiring_soon filter returns correct batches', false, error.response?.data?.error);
  }
  
  // TEST 8: ✅ Filter expired=true (should return BATCH-EXPIRED-001)
  try {
    log('\n📝 Test 8: Filter expired batches', 'blue');
    const response = await axios.get(`${API_URL}/api/master/batch-numbers?expired=true`, { headers });
    
    const foundExpired = response.data.data.some(b => b.batch_number === 'BATCH-EXPIRED-001');
    const excludedValid = !response.data.data.some(b => b.batch_number === 'BATCH-VALID-001');
    
    logTest('Expired filter returns correct batches', foundExpired && excludedValid, 
      `Found: ${response.data.data.length} batches, Includes expired: ${foundExpired}`);
  } catch (error) {
    logTest('Expired filter returns correct batches', false, error.response?.data?.error);
  }
  
  // TEST 9: ✅ Filter by item_id
  try {
    log('\n📝 Test 9: Filter batches by item_id', 'blue');
    const response = await axios.get(`${API_URL}/api/master/batch-numbers?item_id=${testItem.id}`, { headers });
    
    const allMatchItem = response.data.data.every(b => b.item_id === testItem.id);
    
    logTest('Filter by item_id works correctly', allMatchItem, 
      `Found: ${response.data.data.length} batches for item ${testItem.id}`);
  } catch (error) {
    logTest('Filter by item_id works correctly', false, error.response?.data?.error);
  }
  
  // TEST 10: ✅ Update batch quantity
  try {
    log('\n📝 Test 10: Update batch quantity', 'blue');
    const response = await axios.put(`${API_URL}/api/master/batch-numbers/${validBatch.id}`, {
      batch_number: validBatch.batch_number,
      item_id: validBatch.item_id,
      warehouse_id: validBatch.warehouse_id,
      quantity: 150, // Updated from 100
      manufacturing_date: validBatch.manufacturing_date,
      expiry_date: validBatch.expiry_date,
      is_active: true
    }, { headers });
    
    const updatedCorrectly = response.data.data.quantity === 150;
    logTest('Batch quantity update', updatedCorrectly, `New quantity: ${response.data.data.quantity}`);
  } catch (error) {
    logTest('Batch quantity update', false, error.response?.data?.error);
  }
}

// ============================================================================
// 4️⃣ INVENTORY POLICIES TESTS
// ============================================================================

async function testInventoryPolicies() {
  logSection('🧪 INVENTORY POLICIES TESTS');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // TEST 1: ✅ Create FIFO policy
  let fifoPolicy = null;
  try {
    log('\n📝 Test 1: Create FIFO inventory policy', 'blue');
    const response = await axios.post(`${API_URL}/api/master/inventory-policies`, {
      policy_code: 'POL-FIFO-001',
      name_en: 'FIFO Policy Test',
      name_ar: 'سياسة FIFO للاختبار',
      description_en: 'First In First Out valuation',
      description_ar: 'تقييم الوارد أولاً صادر أولاً',
      valuation_method: 'FIFO',
      allow_negative_stock: false,
      auto_reorder: true,
      min_stock_alert: true,
      expiry_alert_days: 30,
      policy_rules: {
        auto_reorder_threshold: 10,
        max_stock_days: 90
      },
      is_active: true
    }, { headers });
    
    fifoPolicy = response.data.data;
    logTest('FIFO policy creation', true);
  } catch (error) {
    logTest('FIFO policy creation', false, error.response?.data?.error);
  }
  
  // TEST 2: ✅ Create LIFO policy
  let lifoPolicy = null;
  try {
    log('\n📝 Test 2: Create LIFO inventory policy', 'blue');
    const response = await axios.post(`${API_URL}/api/master/inventory-policies`, {
      policy_code: 'POL-LIFO-001',
      name_en: 'LIFO Policy Test',
      name_ar: 'سياسة LIFO للاختبار',
      valuation_method: 'LIFO',
      allow_negative_stock: true,
      expiry_alert_days: 60,
      is_active: true
    }, { headers });
    
    lifoPolicy = response.data.data;
    logTest('LIFO policy creation', true);
  } catch (error) {
    logTest('LIFO policy creation', false, error.response?.data?.error);
  }
  
  // TEST 3: ✅ Create Weighted Average policy
  let avgPolicy = null;
  try {
    log('\n📝 Test 3: Create Weighted Average policy', 'blue');
    const response = await axios.post(`${API_URL}/api/master/inventory-policies`, {
      policy_code: 'POL-AVG-001',
      name_en: 'Weighted Average Policy',
      name_ar: 'سياسة المتوسط المرجح',
      valuation_method: 'Weighted Average',
      expiry_alert_days: 45,
      is_active: true
    }, { headers });
    
    avgPolicy = response.data.data;
    logTest('Weighted Average policy creation', true);
  } catch (error) {
    logTest('Weighted Average policy creation', false, error.response?.data?.error);
  }
  
  // TEST 4: ✅ Verify JSONB policy_rules saved correctly
  try {
    log('\n📝 Test 4: Verify JSONB policy_rules persistence', 'blue');
    const response = await axios.get(`${API_URL}/api/master/inventory-policies/${fifoPolicy.id}`, { headers });
    
    const rulesMatch = 
      response.data.data.policy_rules?.auto_reorder_threshold === 10 &&
      response.data.data.policy_rules?.max_stock_days === 90;
    
    logTest('JSONB policy_rules saved/loaded correctly', rulesMatch, 
      `Rules: ${JSON.stringify(response.data.data.policy_rules)}`);
  } catch (error) {
    logTest('JSONB policy_rules saved/loaded correctly', false, error.response?.data?.error);
  }
  
  // TEST 5: ✅ Filter by valuation_method
  try {
    log('\n📝 Test 5: Filter policies by valuation_method', 'blue');
    const response = await axios.get(`${API_URL}/api/master/inventory-policies?valuation_method=FIFO`, { headers });
    
    const allFifo = response.data.data.every(p => p.valuation_method === 'FIFO');
    
    logTest('Filter by valuation_method works', allFifo, 
      `Found: ${response.data.data.length} FIFO policies`);
  } catch (error) {
    logTest('Filter by valuation_method works', false, error.response?.data?.error);
  }
  
  // TEST 6: ❌ Duplicate policy_code
  try {
    log('\n📝 Test 6: Duplicate policy_code (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/inventory-policies`, {
      policy_code: 'POL-FIFO-001', // ❌ Already exists
      name_en: 'Duplicate Policy',
      name_ar: 'سياسة مكررة',
      valuation_method: 'FIFO',
      is_active: true
    }, { headers });
    
    logTest('Duplicate policy_code should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('duplicate') || error.response?.data?.error?.includes('unique');
    logTest('Duplicate policy_code should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 7: ✅ Update policy settings
  try {
    log('\n📝 Test 7: Update policy settings', 'blue');
    const response = await axios.put(`${API_URL}/api/master/inventory-policies/${fifoPolicy.id}`, {
      policy_code: fifoPolicy.policy_code,
      name_en: fifoPolicy.name_en,
      name_ar: fifoPolicy.name_ar,
      valuation_method: fifoPolicy.valuation_method,
      allow_negative_stock: true, // Updated from false
      expiry_alert_days: 45, // Updated from 30
      is_active: true
    }, { headers });
    
    const updated = response.data.data.allow_negative_stock === true && 
                    response.data.data.expiry_alert_days === 45;
    
    logTest('Policy settings update', updated, 
      `allow_negative_stock: ${response.data.data.allow_negative_stock}, expiry_alert_days: ${response.data.data.expiry_alert_days}`);
  } catch (error) {
    logTest('Policy settings update', false, error.response?.data?.error);
  }
}

// ============================================================================
// 5️⃣ REORDER RULES TESTS
// ============================================================================

async function testReorderRules() {
  logSection('🧪 REORDER RULES TESTS');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // TEST 1: ❌ Min quantity > Max quantity
  try {
    log('\n📝 Test 1: Min quantity > Max quantity (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/reorder-rules`, {
      rule_code: 'RULE-FAIL-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      min_quantity: 100, // ❌ Greater than max
      max_quantity: 50,
      reorder_quantity: 30,
      lead_time_days: 7
    }, { headers });
    
    logTest('Min > Max should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('min') || error.response?.data?.error?.includes('max');
    logTest('Min > Max should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 2: ❌ Reorder quantity > (Max - Min)
  try {
    log('\n📝 Test 2: Reorder quantity exceeds (max - min) (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/reorder-rules`, {
      rule_code: 'RULE-FAIL-002',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      min_quantity: 50,
      max_quantity: 100, // Difference = 50
      reorder_quantity: 60, // ❌ Exceeds difference
      lead_time_days: 7
    }, { headers });
    
    logTest('Reorder > (Max - Min) should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('reorder') || error.response?.data?.error?.includes('exceed');
    logTest('Reorder > (Max - Min) should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 3: ✅ Create valid reorder rule
  let validRule = null;
  try {
    log('\n📝 Test 3: Create valid reorder rule (should succeed)', 'blue');
    const response = await axios.post(`${API_URL}/api/master/reorder-rules`, {
      rule_code: 'RULE-VALID-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      min_quantity: 50,
      max_quantity: 200,
      reorder_quantity: 100,
      lead_time_days: 7,
      safety_stock: 20,
      preferred_supplier_id: testSupplier.id,
      auto_generate_po: true,
      is_active: true
    }, { headers });
    
    validRule = response.data.data;
    logTest('Valid reorder rule creation', true);
  } catch (error) {
    logTest('Valid reorder rule creation', false, error.response?.data?.error);
  }
  
  // TEST 4: ✅ Current stock calculation
  try {
    log('\n📝 Test 4: Verify current_stock calculation', 'blue');
    const response = await axios.get(`${API_URL}/api/master/reorder-rules/${validRule.id}`, { headers });
    
    const hasCurrentStock = response.data.data.current_stock !== undefined;
    
    logTest('Current stock is calculated and returned', hasCurrentStock, 
      `Current stock: ${response.data.data.current_stock || 0}`);
  } catch (error) {
    logTest('Current stock is calculated and returned', false, error.response?.data?.error);
  }
  
  // TEST 5: ✅ Filter below_min (create rule with high min)
  let belowMinRule = null;
  try {
    log('\n📝 Test 5: Create rule where stock is below min', 'blue');
    const response = await axios.post(`${API_URL}/api/master/reorder-rules`, {
      rule_code: 'RULE-BELOW-MIN-001',
      item_id: testItem.id,
      warehouse_id: testWarehouse.id,
      min_quantity: 500, // Very high min (current stock is ~180 from batches)
      max_quantity: 1000,
      reorder_quantity: 300,
      lead_time_days: 10,
      is_active: true
    }, { headers });
    
    belowMinRule = response.data.data;
    logTest('Rule with high min quantity created', true);
  } catch (error) {
    logTest('Rule with high min quantity created', false, error.response?.data?.error);
  }
  
  // TEST 6: ✅ Filter below_min=true
  try {
    log('\n📝 Test 6: Filter rules where stock < min_quantity', 'blue');
    const response = await axios.get(`${API_URL}/api/master/reorder-rules?below_min=true`, { headers });
    
    const foundBelowMin = response.data.data.some(r => r.rule_code === 'RULE-BELOW-MIN-001');
    
    logTest('Below_min filter returns correct rules', foundBelowMin, 
      `Found: ${response.data.data.length} rules below min stock`);
  } catch (error) {
    logTest('Below_min filter returns correct rules', false, error.response?.data?.error);
  }
  
  // TEST 7: ✅ Update rule with auto_generate_po toggle
  try {
    log('\n📝 Test 7: Update auto_generate_po flag', 'blue');
    const response = await axios.put(`${API_URL}/api/master/reorder-rules/${validRule.id}`, {
      rule_code: validRule.rule_code,
      item_id: validRule.item_id,
      warehouse_id: validRule.warehouse_id,
      min_quantity: validRule.min_quantity,
      max_quantity: validRule.max_quantity,
      reorder_quantity: validRule.reorder_quantity,
      lead_time_days: validRule.lead_time_days,
      safety_stock: validRule.safety_stock,
      preferred_supplier_id: validRule.preferred_supplier_id,
      auto_generate_po: false, // Updated from true
      is_active: true
    }, { headers });
    
    const updated = response.data.data.auto_generate_po === false;
    
    logTest('Auto_generate_po flag update', updated, 
      `auto_generate_po: ${response.data.data.auto_generate_po}`);
  } catch (error) {
    logTest('Auto_generate_po flag update', false, error.response?.data?.error);
  }
  
  // TEST 8: ❌ Duplicate rule (same item + warehouse)
  try {
    log('\n📝 Test 8: Duplicate rule for same item+warehouse (should fail)', 'blue');
    await axios.post(`${API_URL}/api/master/reorder-rules`, {
      rule_code: 'RULE-DUP-001',
      item_id: testItem.id, // ❌ Same item
      warehouse_id: testWarehouse.id, // ❌ Same warehouse
      min_quantity: 30,
      max_quantity: 100,
      reorder_quantity: 40,
      lead_time_days: 5
    }, { headers });
    
    logTest('Duplicate item+warehouse should be rejected', false, 'Request succeeded but should have failed');
  } catch (error) {
    const expectedError = error.response?.data?.error?.includes('already') || error.response?.data?.error?.includes('unique');
    logTest('Duplicate item+warehouse should be rejected', expectedError, error.response?.data?.error);
  }
  
  // TEST 9: ✅ Filter by item_id
  try {
    log('\n📝 Test 9: Filter rules by item_id', 'blue');
    const response = await axios.get(`${API_URL}/api/master/reorder-rules?item_id=${testItem.id}`, { headers });
    
    const allMatchItem = response.data.data.every(r => r.item_id === testItem.id);
    
    logTest('Filter by item_id works correctly', allMatchItem, 
      `Found: ${response.data.data.length} rules for item ${testItem.id}`);
  } catch (error) {
    logTest('Filter by item_id works correctly', false, error.response?.data?.error);
  }
}

// ============================================================================
// 6️⃣ FINAL REPORT
// ============================================================================

function printFinalReport() {
  logSection('📊 FINAL TEST REPORT');
  
  const totalTests = passedTests + failedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  log(`\nTotal Tests: ${totalTests}`, 'bright');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'red');
  
  if (failedTests > 0) {
    log('\n❌ Failed Tests Details:', 'red');
    failedTestDetails.forEach((failure, index) => {
      log(`\n${index + 1}. ${failure.test}`, 'yellow');
      log(`   ${failure.details}`, 'yellow');
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (successRate >= 90) {
    log('🎉 GROUP 3 MASTER DATA IS PRODUCTION-READY!', 'green');
    log('✅ Generic Engine validated - safe to proceed to Group 1', 'green');
  } else {
    log('⚠️  Some tests failed - review and fix before proceeding', 'yellow');
  }
  
  console.log('='.repeat(70) + '\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllTests() {
  log('\n🚀 Starting Group 3 Master Data Test Suite', 'cyan');
  log(`📅 Test Date: ${new Date().toISOString()}`, 'cyan');
  
  // Step 1: Authenticate
  const authenticated = await authenticate();
  if (!authenticated) {
    log('\n❌ Cannot proceed without authentication', 'red');
    process.exit(1);
  }
  
  // Step 2: Setup test data
  const dataReady = await setupTestData();
  if (!dataReady) {
    log('\n❌ Cannot proceed without test data', 'red');
    process.exit(1);
  }
  
  // Step 3: Run tests
  await testBatchNumbers();
  await testInventoryPolicies();
  await testReorderRules();
  
  // Step 4: Final report
  printFinalReport();
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ FATAL ERROR:', 'red');
  console.error(error);
  process.exit(1);
});
