-- =====================================================
-- Migration 186: Add Expense Accounts 8003-8017
-- =====================================================
-- Adds the remaining expense accounts under parent 1151010003

DO $$
DECLARE
    v_company_id INTEGER := 1;
    v_parent_id INTEGER;
    v_account_type_id INTEGER;
BEGIN
    -- Get the parent account id and account_type_id for 1151010003
    SELECT id, account_type_id INTO v_parent_id, v_account_type_id FROM accounts 
    WHERE code = '1151010003' AND company_id = v_company_id AND deleted_at IS NULL;
    
    IF v_parent_id IS NULL THEN
        RAISE NOTICE 'Parent account 1151010003 not found, skipping...';
        RETURN;
    END IF;
    
    -- Insert expense accounts 8003-8017 if they don't exist
    -- 8003: Sea Freight (شحن بحري)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8003', 'Sea Freight Charges', 'رسوم شحن بحري', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8003' AND company_id = v_company_id);
    
    -- 8004: Delivery Order (إذن تسليم)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8004', 'Delivery Order Charges', 'رسوم إذن تسليم', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8004' AND company_id = v_company_id);
    
    -- 8005: Customs Declaration (بيان جمركي)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8005', 'Customs Declaration Fees', 'رسوم بيان جمركي', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8005' AND company_id = v_company_id);
    
    -- 8006: Customs Duties (رسوم جمركية)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8006', 'Customs Duties', 'رسوم جمركية', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8006' AND company_id = v_company_id);
    
    -- 8007: Port Fees (رسوم ميناء)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8007', 'Port Fees', 'رسوم ميناء', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8007' AND company_id = v_company_id);
    
    -- 8008: Storage Fees (رسوم تخزين)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8008', 'Storage Fees', 'رسوم تخزين', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8008' AND company_id = v_company_id);
    
    -- 8009: Clearance Office (مكتب تخليص)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8009', 'Clearance Office Fees', 'رسوم مكتب تخليص', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8009' AND company_id = v_company_id);
    
    -- 8010: Inspection Fees (رسوم فحص)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8010', 'Inspection Fees', 'رسوم فحص', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8010' AND company_id = v_company_id);
    
    -- 8011: Laboratory Fees (رسوم مختبر)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8011', 'Laboratory Fees', 'رسوم مختبر', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8011' AND company_id = v_company_id);
    
    -- 8012: Transport/Trucking (نقل بري)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8012', 'Transport/Trucking', 'نقل بري', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8012' AND company_id = v_company_id);
    
    -- 8013: Loading/Unloading (شحن وتفريغ)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8013', 'Loading/Unloading', 'شحن وتفريغ', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8013' AND company_id = v_company_id);
    
    -- 8014: Demurrage (غرامات تأخير)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8014', 'Demurrage Charges', 'غرامات تأخير', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8014' AND company_id = v_company_id);
    
    -- 8015: Documentation (وثائق ومستندات)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8015', 'Documentation Fees', 'رسوم وثائق ومستندات', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8015' AND company_id = v_company_id);
    
    -- 8016: Bank Charges (رسوم بنكية)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8016', 'Bank Charges', 'رسوم بنكية', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8016' AND company_id = v_company_id);
    
    -- 8017: Other Expenses (مصاريف أخرى)
    INSERT INTO accounts (company_id, code, name, name_ar, parent_id, account_type_id, level, is_group, is_active, allow_posting, created_at)
    SELECT v_company_id, '8017', 'Other Expenses', 'مصاريف أخرى', v_parent_id, v_account_type_id, 7, false, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8017' AND company_id = v_company_id);
    
    RAISE NOTICE 'Expense accounts 8003-8017 added successfully under parent %', v_parent_id;
END $$;

-- Update existing 8001 and 8002 with names if empty
UPDATE accounts SET 
    name = COALESCE(NULLIF(name, ''), 'LC Fees / Bank Guarantee'),
    name_ar = COALESCE(NULLIF(name_ar, ''), 'رسوم اعتماد مستندي / ضمان بنكي')
WHERE code = '8001' AND company_id = 1;

UPDATE accounts SET 
    name = COALESCE(NULLIF(name, ''), 'Cargo Insurance / Marine Insurance'),
    name_ar = COALESCE(NULLIF(name_ar, ''), 'تأمين حمولة / تأمين بحري')
WHERE code = '8002' AND company_id = 1;
