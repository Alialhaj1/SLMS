-- =====================================================
-- Migration 203: Create Shipment Expense Chart of Accounts Hierarchy
-- =====================================================
-- Creates the parent account 1151010003 and child expense accounts 8001-8017
-- These are required for the ShipmentExpensesTabV2 component to work properly

DO $$
DECLARE
    v_company_id INTEGER := 1;
    v_type_id INTEGER;
    v_parent_level6_id INTEGER;
    v_expense_parent_id INTEGER;
BEGIN
    -- =====================================================
    -- Step 1: Get or create the account type for expenses
    -- =====================================================
    SELECT id INTO v_type_id FROM account_types WHERE code = 'COGS' LIMIT 1;
    IF v_type_id IS NULL THEN
        -- Use 'OTHER_EXP' as fallback
        SELECT id INTO v_type_id FROM account_types WHERE code = 'OTHER_EXP' LIMIT 1;
    END IF;
    IF v_type_id IS NULL THEN
        -- Use any expense type
        SELECT id INTO v_type_id FROM account_types WHERE classification = 'expense' LIMIT 1;
    END IF;
    
    IF v_type_id IS NULL THEN
        RAISE NOTICE 'No expense account type found. Creating a basic one.';
        INSERT INTO account_types (code, name, name_ar, normal_balance, classification, report_section, display_order)
        VALUES ('SHIPMENT_EXP', 'Shipment Expenses', 'مصاريف الشحنات', 'debit', 'expense', 'income_statement', 60)
        RETURNING id INTO v_type_id;
    END IF;
    
    -- =====================================================
    -- Step 2: Create parent account hierarchy for 1151010003
    -- Structure: 1 -> 11 -> 115 -> 1151 -> 11510 -> 115101 -> 1151010003
    -- =====================================================
    
    -- Check if we need to create the hierarchy
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1151010003' AND company_id = v_company_id) THEN
        
        -- Level 1: 1 - Assets (likely exists)
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_active, allow_posting)
            VALUES (v_company_id, '1', 'Assets', 'الأصول', v_type_id, 1, true, true, false);
        END IF;
        
        -- Level 2: 11 - Current Assets
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '11' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '11', 'Current Assets', 'الأصول المتداولة', id, v_type_id, 2, true, true, false
            FROM accounts WHERE code = '1' AND company_id = v_company_id;
        END IF;
        
        -- Level 3: 115 - Debit Balances
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '115' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '115', 'Debit Balances', 'أرصدة مدينة', id, v_type_id, 3, true, true, false
            FROM accounts WHERE code = '11' AND company_id = v_company_id;
        END IF;
        
        -- Level 4: 1151 - Accrued Revenue
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1151' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '1151', 'Accrued Revenue', 'إيرادات مستحقة', id, v_type_id, 4, true, true, false
            FROM accounts WHERE code = '115' AND company_id = v_company_id;
        END IF;
        
        -- Level 5: 11510 - Shipping Costs Control
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '11510' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '11510', 'Shipping Costs Control', 'ضبط تكاليف الشحن', id, v_type_id, 5, true, true, false
            FROM accounts WHERE code = '1151' AND company_id = v_company_id;
        END IF;
        
        -- Level 6: 115101 - Shipment Cost Accumulator
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '115101' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '115101', 'Shipment Cost Accumulator', 'مجمع تكاليف الشحنات', id, v_type_id, 6, true, true, false
            FROM accounts WHERE code = '11510' AND company_id = v_company_id;
        END IF;
        
        -- Level 7: 1151010003 - Shipment Expenses (THE PARENT FOR 8001-8017)
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1151010003' AND company_id = v_company_id) THEN
            INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
            SELECT v_company_id, '1151010003', 'Shipment Expenses', 'مصاريف الشحنات', id, v_type_id, 7, true, true, false
            FROM accounts WHERE code = '115101' AND company_id = v_company_id;
        END IF;
        
        RAISE NOTICE 'Created account hierarchy for 1151010003';
    ELSE
        RAISE NOTICE 'Account 1151010003 already exists';
    END IF;
    
    -- =====================================================
    -- Step 3: Get the parent account ID for expense types
    -- =====================================================
    SELECT id INTO v_expense_parent_id FROM accounts WHERE code = '1151010003' AND company_id = v_company_id;
    
    IF v_expense_parent_id IS NULL THEN
        RAISE NOTICE 'Failed to create or find parent account 1151010003';
        RETURN;
    END IF;
    
    -- =====================================================
    -- Step 4: Create child expense accounts (8001-8017)
    -- These match the shipment_expense_types codes
    -- =====================================================
    
    -- 8001: LC Fees / Bank Guarantee
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8001' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8001', 'LC Fees / Bank Guarantee', 'عمولة خطاب الضمان / الاعتماد', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8002: Cargo Insurance / Marine Insurance
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8002' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8002', 'Cargo Insurance / Marine Insurance', 'تأمين بحري / تأمين شحنة', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8003: Sea Freight Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8003' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8003', 'Sea Freight Charges', 'رسوم شحن بحري', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8004: Delivery Order Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8004' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8004', 'Delivery Order Charges', 'رسوم إذن تسليم', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8005: Customs Declaration Fees
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8005' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8005', 'Customs Declaration Fees', 'رسوم بيان جمركي', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8006: Storage / Demurrage Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8006' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8006', 'Storage / Demurrage Charges', 'رسوم تخزين / غرامات أرضية', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8007: Port Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8007' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8007', 'Port Charges', 'رسوم ميناء', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8008: Unloading Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8008' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8008', 'Unloading Charges', 'رسوم تفريغ', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8009: Customs Inspection Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8009' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8009', 'Customs Inspection Charges', 'رسوم معاينة جمركية', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8010: Container Pickup Delay Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8010' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8010', 'Container Pickup Delay Charges', 'غرامات تأخير استلام الحاوية', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8011: Customs Clearance Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8011' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8011', 'Customs Clearance Charges', 'رسوم التخليص الجمركي', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8012: Transport Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8012' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8012', 'Transport Charges', 'رسوم النقل البري', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8013: Loading & Unloading Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8013' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8013', 'Loading & Unloading Charges', 'رسوم الشحن والتفريغ', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8014: Sample Testing Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8014' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8014', 'Sample Testing Charges', 'رسوم فحص العينات', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8015: SABER / Conformity Certificate
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8015' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8015', 'SABER / Conformity Certificate', 'شهادة سابر / المطابقة', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8016: Container Return Delay Charges
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8016' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8016', 'Container Return Delay Charges', 'غرامات تأخير إرجاع الحاوية', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- 8017: Pallet Fines / Container Cleaning
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8017' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '8017', 'Pallet Fines / Container Cleaning', 'غرامات الباليتات / تنظيف الحاوية', v_expense_parent_id, v_type_id, 8, false, true, true);
    END IF;
    
    -- =====================================================
    -- Step 5: Link shipment_expense_types to accounts
    -- =====================================================
    UPDATE shipment_expense_types set 
        analytic_account_code = code
    WHERE company_id = v_company_id 
      AND code IN ('8001', '8002', '8003', '8004', '8005', '8006', '8007', '8008', '8009', '8010', '8011', '8012', '8013', '8014', '8015', '8016', '8017')
      AND (analytic_account_code IS NULL OR analytic_account_code = '');
    
    RAISE NOTICE 'Successfully created expense accounts 8001-8017 under parent 1151010003';
    
END $$;

-- =====================================================
-- Step 6: Also ensure the other parent accounts exist  
-- 2111010001 (Accounts Payable) and 3221020002 (Cost of Goods Sold)
-- =====================================================

DO $$
DECLARE
    v_company_id INTEGER := 1;
    v_type_liability_id INTEGER;
    v_type_expense_id INTEGER;
BEGIN
    -- Get liability type
    SELECT id INTO v_type_liability_id FROM account_types WHERE classification = 'liability' LIMIT 1;
    -- Get expense type
    SELECT id INTO v_type_expense_id FROM account_types WHERE classification = 'expense' LIMIT 1;
    
    -- Create 2111010001 hierarchy if it doesn't exist (Accounts Payable)
    -- Level 1: 2 - Liabilities
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '2', 'Liabilities', 'الخصوم', v_type_liability_id, 1, true, true, false);
    END IF;
    
    -- Level 2: 21 - Current Liabilities
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '21' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '21', 'Current Liabilities', 'الخصوم المتداولة', id, v_type_liability_id, 2, true, true, false
        FROM accounts WHERE code = '2' AND company_id = v_company_id;
    END IF;
    
    -- Level 3: 211 - Accounts Payable
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '211' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '211', 'Accounts Payable', 'الذمم الدائنة', id, v_type_liability_id, 3, true, true, false
        FROM accounts WHERE code = '21' AND company_id = v_company_id;
    END IF;
    
    -- Level 4-7: 2111 -> 21110 -> 211101 -> 2111010001
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2111' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '2111', 'Trade Payables', 'ذمم تجارية دائنة', id, v_type_liability_id, 4, true, true, false
        FROM accounts WHERE code = '211' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '21110' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '21110', 'Suppliers Payables', 'ذمم الموردين', id, v_type_liability_id, 5, true, true, false
        FROM accounts WHERE code = '2111' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '211101' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '211101', 'Local Suppliers', 'الموردين المحليين', id, v_type_liability_id, 6, true, true, false
        FROM accounts WHERE code = '21110' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2111010001' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '2111010001', 'Accounts Payable - Suppliers', 'ذمم الموردين الدائنين', id, v_type_liability_id, 7, true, true, true
        FROM accounts WHERE code = '211101' AND company_id = v_company_id;
    END IF;
    
    -- Create 3221020002 hierarchy if it doesn't exist (Cost of Goods Sold - Imports)
    -- Level 1: 3 - Equity (but COGS is expense, let's use the expense type)
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_active, allow_posting)
        VALUES (v_company_id, '3', 'Expenses & COGS', 'المصروفات وتكلفة البضاعة', v_type_expense_id, 1, true, true, false);
    END IF;
    
    -- Level 2: 32 - Cost of Goods Sold
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '32' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '32', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', id, v_type_expense_id, 2, true, true, false
        FROM accounts WHERE code = '3' AND company_id = v_company_id;
    END IF;
    
    -- Level 3: 322 - Import COGS
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '322' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '322', 'Import Cost of Goods Sold', 'تكلفة البضائع المستوردة', id, v_type_expense_id, 3, true, true, false
        FROM accounts WHERE code = '32' AND company_id = v_company_id;
    END IF;
    
    -- Level 4-7: 3221 -> 32210 -> 322102 -> 3221020002
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3221' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '3221', 'Shipping & Logistics Costs', 'تكاليف الشحن واللوجستيات', id, v_type_expense_id, 4, true, true, false
        FROM accounts WHERE code = '322' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '32210' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '32210', 'Import Shipping Costs', 'تكاليف شحن الاستيراد', id, v_type_expense_id, 5, true, true, false
        FROM accounts WHERE code = '3221' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '322102' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '322102', 'Landed Cost Pool', 'مجمع التكلفة الإجمالية', id, v_type_expense_id, 6, true, true, false
        FROM accounts WHERE code = '32210' AND company_id = v_company_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3221020002' AND company_id = v_company_id) THEN
        INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting)
        SELECT v_company_id, '3221020002', 'Allocated Shipment Costs', 'تكاليف الشحنات الموزعة', id, v_type_expense_id, 7, true, true, true
        FROM accounts WHERE code = '322102' AND company_id = v_company_id;
    END IF;
    
    RAISE NOTICE 'Parent accounts hierarchy created successfully';
END $$;

-- Summary: This migration creates:
-- 1. Parent account 1151010003 (Shipment Expenses) with full hierarchy
-- 2. Child accounts 8001-8017 for each expense type
-- 3. Parent account 2111010001 (Accounts Payable - Suppliers)
-- 4. Parent account 3221020002 (Allocated Shipment Costs)
