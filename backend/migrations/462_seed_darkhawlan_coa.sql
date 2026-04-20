-- =============================================
-- DARKHAWLAN (دار خولان) — Professional Chart of Accounts
-- Migration: 462
-- Date: 2026-04-18
-- =============================================
-- Source: Client CSV "الدليل المحاسبي 1.csv" (453 accounts)
-- Corrections applied:
--   1. Moved "مجمع اهلاك الاصول الثابتة" from Liabilities (2221010001) to Assets contra-account section (122)
--   2. Removed duplicate sections 123/124 (مصاريف التأسيس) — already in 1217
--   3. Fixed level errors (1231010001 was level 5, should be 6)
--   4. Fixed duplicate partner account 2315010003 (renamed)
--   5. Fixed out-of-order 322/3220 hierarchy
--   6. Normalized irregular codes (32110001 → 321100, 32110001001 → 3211000001)
--   7. Renamed placeholder accounts ("....." → meaningful names)
--   8. Added accumulated depreciation section (122) under non-current assets
--   9. Set proper account_type, is_control_account, is_reconcilable, control_type
--  10. Set is_group=true + allow_posting=false for all parent accounts
-- =============================================

DO $$
DECLARE
  v_company_id INTEGER;
  v_user_id INTEGER;
  -- Account type IDs
  v_type_cash INTEGER;
  v_type_receivable INTEGER;
  v_type_inventory INTEGER;
  v_type_prepaid INTEGER;
  v_type_fixed INTEGER;
  v_type_accum_depr INTEGER;
  v_type_other_asset INTEGER;
  v_type_payable INTEGER;
  v_type_accrued INTEGER;
  v_type_tax_payable INTEGER;
  v_type_loan INTEGER;
  v_type_other_liab INTEGER;
  v_type_capital INTEGER;
  v_type_retained INTEGER;
  v_type_reserve INTEGER;
  v_type_revenue INTEGER;
  v_type_discount INTEGER;
  v_type_returns INTEGER;
  v_type_other_income INTEGER;
  v_type_cogs INTEGER;
  v_type_operating INTEGER;
  v_type_admin INTEGER;
  v_type_selling INTEGER;
  v_type_financial INTEGER;
  v_type_depreciation INTEGER;
  v_type_other_exp INTEGER;
  v_type_tax_receivable INTEGER;
BEGIN
  -- =============================================
  -- RESOLVE DARKHAWLAN COMPANY
  -- =============================================
  SELECT id INTO v_company_id FROM companies WHERE LOWER(name) LIKE '%خولان%' OR LOWER(name) LIKE '%darkhawlan%' OR LOWER(name) LIKE '%dark hawlan%' OR LOWER(name) LIKE '%dar khawlan%' LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'DARKHAWLAN company not found — skipping COA seed';
    RETURN;
  END IF;

  SELECT MIN(u.id) INTO v_user_id FROM users u INNER JOIN companies c ON c.tenant_id = u.tenant_id WHERE c.id = v_company_id;
  IF v_user_id IS NULL THEN
    SELECT MIN(id) INTO v_user_id FROM users;
  END IF;

  RAISE NOTICE 'Seeding DARKHAWLAN COA for company_id=%, user_id=%', v_company_id, v_user_id;

  -- =============================================
  -- RESOLVE ACCOUNT TYPES
  -- =============================================
  SELECT id INTO v_type_cash FROM account_types WHERE code = 'CASH';
  SELECT id INTO v_type_receivable FROM account_types WHERE code = 'RECEIVABLE';
  SELECT id INTO v_type_inventory FROM account_types WHERE code = 'INVENTORY';
  SELECT id INTO v_type_prepaid FROM account_types WHERE code = 'PREPAID';
  SELECT id INTO v_type_fixed FROM account_types WHERE code = 'FIXED_ASSET';
  SELECT id INTO v_type_accum_depr FROM account_types WHERE code = 'ACCUM_DEPR';
  SELECT id INTO v_type_other_asset FROM account_types WHERE code = 'OTHER_ASSET';
  SELECT id INTO v_type_payable FROM account_types WHERE code = 'PAYABLE';
  SELECT id INTO v_type_accrued FROM account_types WHERE code = 'ACCRUED';
  SELECT id INTO v_type_tax_payable FROM account_types WHERE code = 'TAX_PAYABLE';
  SELECT id INTO v_type_loan FROM account_types WHERE code = 'LOAN';
  SELECT id INTO v_type_other_liab FROM account_types WHERE code = 'OTHER_LIAB';
  SELECT id INTO v_type_capital FROM account_types WHERE code = 'CAPITAL';
  SELECT id INTO v_type_retained FROM account_types WHERE code = 'RETAINED';
  SELECT id INTO v_type_reserve FROM account_types WHERE code = 'RESERVE';
  SELECT id INTO v_type_revenue FROM account_types WHERE code = 'REVENUE';
  SELECT id INTO v_type_discount FROM account_types WHERE code = 'DISCOUNT';
  SELECT id INTO v_type_returns FROM account_types WHERE code = 'RETURNS';
  SELECT id INTO v_type_other_income FROM account_types WHERE code = 'OTHER_INCOME';
  SELECT id INTO v_type_cogs FROM account_types WHERE code = 'COGS';
  SELECT id INTO v_type_operating FROM account_types WHERE code = 'OPERATING';
  SELECT id INTO v_type_admin FROM account_types WHERE code = 'ADMIN';
  SELECT id INTO v_type_selling FROM account_types WHERE code = 'SELLING';
  SELECT id INTO v_type_financial FROM account_types WHERE code = 'FINANCIAL';
  SELECT id INTO v_type_depreciation FROM account_types WHERE code = 'DEPRECIATION';
  SELECT id INTO v_type_other_exp FROM account_types WHERE code = 'OTHER_EXP';
  SELECT id INTO v_type_tax_receivable FROM account_types WHERE code = 'TAX_RECEIVABLE';

  -- =============================================
  -- HELPER: Delete existing COA for this company (fresh start)
  -- Only leaf accounts without journal entries
  -- =============================================
  -- We use ON CONFLICT DO NOTHING so existing accounts are preserved

  -- ██████████████████████████████████████████████████████████████
  -- ██  1 — الأصول  ASSETS                                     ██
  -- ██████████████████████████████████████████████████████████████

  -- Level 1: Root
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (v_company_id, '1', 'Assets', 'الأصول', v_type_cash, 1, true, true, false, v_user_id)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 11 — الأصول المتداولة ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '11', 'Current Assets', 'الأصول المتداولة', v_type_cash, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 111 — النقدية بالبنوك والصناديق ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '111', 'Cash and Banks', 'النقدية بالبنوك والصناديق', v_type_cash, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1111 — النقدية في الصناديق
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1111', 'Cash in Hand', 'النقدية في الصناديق', v_type_cash, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '111'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 111101 — الصناديق
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_reconcilable, created_by)
  SELECT v_company_id, id, '111101', 'Cash Boxes', 'الصناديق', v_type_cash, 5, true, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1111'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- صناديق الفروع (Level 6 — leaf accounts)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_reconcilable, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_cash, 6, false, true, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1111010001', 'Main Admin Cash Box', 'صندوق الإدارة الرئيسي'),
    ('1111010002', 'Al-Tamir Branch Cash Box', 'صندوق فرع التعمير'),
    ('1111010003', 'Al-Dira Main Branch Cash Box', 'صندوق محل الديرة الفرع الرئيسي'),
    ('1111010004', 'POS Intermediary Cash Box', 'صندوق وسيط نقاط البيع'),
    ('1111010006', 'Al-Tamir 2 Branch Cash Box', 'صندوق فرع التعمير 2'),
    ('1111010007', 'Atiqah Branch Cash Box', 'صندوق فرع عتيقة'),
    ('1111010008', 'Al-Rawdah Branch Cash Box', 'صندوق فرع الروضة'),
    ('1111010009', 'Umm Al-Hamam Branch Cash Box', 'صندوق فرع أم الحمام'),
    ('1111010010', 'Shaqra Branch Cash Box', 'صندوق فرع شقراء'),
    ('1111010011', 'Al-Rawdah 2 Salman Al-Farisi Cash Box', 'صندوق الروضة 2 - سلمان الفارسي'),
    ('1111010012', 'Umm Al-Hamam 2 Al-Arbaeen St Cash Box', 'صندوق فرع أم الحمام 2 شارع الأربعين'),
    ('1111010013', 'Al-Rabwah Branch Cash Box', 'صندوق فرع الربوة'),
    ('1111010014', 'Al-Qarya Al-Shaabiya Branch Cash Box', 'صندوق فرع القرية الشعبية'),
    ('1111010017', 'Atiqah 2 New Branch Cash Box', 'صندوق فرع عتيقة 2 الجديد'),
    ('1111010018', 'Al-Tamir 3 New Branch Cash Box', 'صندوق فرع التعمير 3 الجديد'),
    ('1111010019', 'Al-Yarmook Branch Cash Box', 'صندوق فرع اليرموك'),
    ('1111010021', 'Al-Salam Branch Cash Box', 'صندوق فرع السلام'),
    ('1111010022', 'Al-Owais Branch Cash Box', 'صندوق فرع العويس'),
    ('1111010023', 'Aswaq Hijab Al-Naseem Cash Box', 'صندوق فرع أسواق حجاب - النسيم')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '111101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 111102 — عهدة صناديق (فكة)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '111102', 'Petty Cash Float', 'عهدة صناديق (فكة)', v_type_cash, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1111'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1111020001', 'Petty Cash Float', 'عهدة صناديق (فكة)', v_type_cash, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '111102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1112 — النقدية في البنوك
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1112', 'Cash in Banks', 'النقدية في البنوك', v_type_cash, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '111'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 111201 — البنوك
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_reconcilable, is_control_account, control_type, created_by)
  SELECT v_company_id, id, '111201', 'Bank Accounts', 'البنوك', v_type_cash, 5, true, false, true, true, 'bank', v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1112'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- حسابات البنوك (Level 6)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_reconcilable, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_cash, 6, false, true, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1112010001', 'Al-Ahli Bank (SNB)', 'البنك الأهلي'),
    ('1112010002', 'Al-Rajhi Bank', 'بنك الراجحي'),
    ('1112010003', 'Alinma Bank - Suspended', 'بنك الإنماء موقف'),
    ('1112010004', 'Alinma Bank - Dar Khawlan', 'بنك الإنماء - دار خولان'),
    ('1112010005', 'Al-Ahli Bank - Networks', 'البنك الأهلي - شبكات'),
    ('1112010006', 'Saudi French Bank (Banque Saudi Fransi)', 'البنك السعودي الفرنسي'),
    ('1112010007', 'Al-Ahli Bank - USD', 'البنك الأهلي - دولار'),
    ('1112010008', 'Riyad Bank', 'بنك الرياض'),
    ('1112010009', 'Bank AlJazira', 'بنك الجزيرة'),
    ('1112010010', 'Alinma Bank - USD', 'بنك الإنماء دولار')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '111201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1113 — شيكات قبض تحت التحصيل
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1113', 'Checks Under Collection', 'شيكات قبض تحت التحصيل', v_type_cash, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '111'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '111301', 'Checks Under Collection', 'شيكات قبض تحت التحصيل', v_type_cash, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1113'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1113010001', 'Checks Under Collection', 'شيكات تحت التحصيل', v_type_cash, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '111301'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 112 — المدينون ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '112', 'Receivables', 'المدينون', v_type_receivable, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1121 — العملاء
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_control_account, control_type, created_by)
  SELECT v_company_id, id, '1121', 'Customers', 'العملاء', v_type_receivable, 4, true, false, true, 'customer', v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '112'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '112101', 'Trade Customers', 'العملاء', v_type_receivable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_receivable, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1121010001', 'Local Customers', 'عملاء محليين'),
    ('1121010002', 'Foreign Customers', 'عملاء خارجيين'),
    ('1121010003', 'Rental Customers', 'عملاء إيجارات')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '112101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 112102 — مخصص الديون المشكوك فيها
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '112102', 'Allowance for Doubtful Debts', 'مخصص الديون المشكوك فيها', v_type_receivable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1121020001', 'Allowance for Doubtful Debts', 'مخصص ديون مشكوك في تحصيلها', v_type_receivable, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '112102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 113 — ذمم موظفين والتأمينات والعهد ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '113', 'Employee Receivables & Guarantees', 'ذمم موظفين والتأمينات والعهد', v_type_receivable, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1131 — ذمم موظفين
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_control_account, control_type, created_by)
  SELECT v_company_id, id, '1131', 'Employee Receivables', 'ذمم موظفين', v_type_receivable, 4, true, false, true, 'employee', v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '113101', 'Employee Advances', 'سلف العاملين', v_type_receivable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1131'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1131010001', 'Emran Ali Sharaf', 'الموظف عمران علي شرف', v_type_receivable, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1132 — السلف المؤقتة (العهد)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1132', 'Temporary Advances (Custody)', 'السلف المؤقتة (العهد)', v_type_receivable, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '113201', 'Temporary Custody', 'العهد المؤقتة', v_type_receivable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1132'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_receivable, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1132010001', 'Employee Custody', 'عهد الموظفين'),
    ('1132010002', 'Employee Custody (Bank Transfers)', 'عهد موظفين (تحويلات بنكية)')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '113201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1133 — الضمانات المدينة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1133', 'Debit Guarantees', 'الضمانات المدينة', v_type_other_asset, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '113301', 'LC Guarantees', 'ضمانات اعتمادات', v_type_other_asset, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1133'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1133010001', 'Bank LC Guarantees', 'ضمانات اعتمادات بنكية', v_type_other_asset, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113301'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1134 — التأمينات المدينة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1134', 'Debit Insurance Deposits', 'التأمينات المدينة', v_type_other_asset, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1135 — سلف الموظفين
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1135', 'Employee Loans', 'سلف الموظفين', v_type_receivable, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '113'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 114 — المخزون ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '114', 'Inventory', 'المخزون', v_type_inventory, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1141', 'Merchandise Inventory', 'المخزون السلعي', v_type_inventory, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '114'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '114101', 'General Inventory', 'المخزون العام', v_type_inventory, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1141'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_inventory, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1141010001', 'Main Warehouse', 'المخزن الرئيسي'),
    ('1141010002', 'Sales Representatives Warehouse', 'مخازن المندوبين'),
    ('1141010003', 'Wholesale Shops Warehouse', 'مخزن محلات الجملة')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '114101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 115 — الاعتمادات المستندية وخطابات الضمان ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '115', 'Letters of Credit & Guarantees', 'الاعتمادات المستندية وخطابات الضمان', v_type_other_asset, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1151', 'Letters of Credit', 'الاعتمادات المستندية', v_type_other_asset, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '115'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '115101', 'Documentary Credits', 'الاعتمادات المستندية', v_type_other_asset, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1151'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_other_asset, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1151010001', 'LC Invoice Credit', 'اعتماد الفاتورة'),
    ('1151010002', 'Customs Duties', 'الجمارك'),
    ('1151010003', 'Import Purchase Costs', 'مصاريف تكاليف المشتريات الخارجية'),
    ('1151010004', 'Bank Charges (LC)', 'مصاريف بنكية'),
    ('1151010005', 'Shipping Expenses', 'مصروفات الشحن'),
    ('1151010006', 'Other LC Expenses', 'مصروفات أخرى'),
    ('1151010007', 'Marine Insurance', 'مصروفات تأمين بحري (تأمين حمولة)')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '115101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 116 — الأرصدة المدينة الأخرى ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '116', 'Other Debit Balances', 'الأرصدة المدينة الأخرى', v_type_prepaid, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '11'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1161', 'Transitional Debit Accounts', 'حسابات انتقالية مدينة', v_type_prepaid, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '116'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 116101 — المصاريف المدفوعة مقدماً (إيجارات مقدمة)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '116101', 'Prepaid Expenses', 'المصاريف المدفوعة مقدماً', v_type_prepaid, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1161'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_prepaid, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1161010001', 'Prepaid Rent - Main Office Al-Tamir', 'إيجار المكتب الرئيسي - التعمير'),
    ('1161010002', 'Prepaid Rent - Al-Tamir 1 Shop', 'إيجار مقدم محل التعمير 1'),
    ('1161010003', 'Prepaid Electricity', 'مصاريف كهرباء مقدم'),
    ('1161010004', 'Prepaid Residence Renewal Fees', 'رسوم تجديد الإقامات مقدم'),
    ('1161010005', 'Prepaid Rent - Warehouse 44', 'إيجار مقدم المستودع رقم 44'),
    ('1161010006', 'Prepaid Rent - Warehouse 8+7', 'إيجار مقدم مستودع رقم 8 + 7'),
    ('1161010007', 'Prepaid Rent - Warehouse 25', 'إيجار مقدم مستودع رقم 25'),
    ('1161010008', 'Prepaid Rent - Al-Dira Branch', 'إيجار مقدم فرع الديرة'),
    ('1161010009', 'Prepaid Rent - Warehouse 7', 'إيجار مقدم مستودع 7'),
    ('1161010010', 'Prepaid Rent - Al-Tamir 2', 'إيجار مقدم فرع التعمير 2'),
    ('1161010011', 'Prepaid Rent - Atiqah 1', 'إيجار مقدم فرع عتيقة 1 فتحة'),
    ('1161010012', 'Prepaid Rent - Shaqra Branch', 'إيجار مقدم فرع شقراء'),
    ('1161010013', 'Prepaid Rent - Umm Al-Hamam 1', 'إيجار مقدم فرع أم الحمام 1'),
    ('1161010014', 'Prepaid Rent - Al-Rawdah 1', 'إيجار مقدم فرع الروضة 1'),
    ('1161010015', 'Prepaid Rent - Al-Rawdah 2 Salman', 'إيجار مقدم فرع الروضة 2 - سلمان الفارسي'),
    ('1161010016', 'Prepaid Rent - Umm Al-Hamam 2', 'إيجار مقدم فرع أم الحمام 2'),
    ('1161010017', 'Prepaid Rent - Al-Rabwah', 'إيجار مقدم فرع الربوة'),
    ('1161010018', 'Prepaid Rent - Al-Qarya Al-Shaabiya', 'إيجار مقدم فرع القرية الشعبية'),
    ('1161010019', 'Prepaid Rent - Atiqah 2', 'إيجار مقدم فرع عتيقة 2'),
    ('1161010020', 'Prepaid Rent - Al-Tamir 3', 'إيجار مقدم فرع التعمير 3'),
    ('1161010021', 'Prepaid Rent - Al-Yarmook', 'إيجار مقدم فرع اليرموك'),
    ('1161010022', 'Prepaid Rent - Al-Aziziya Apt', 'إيجار مقدم شقة العزيزية'),
    ('1161010032', 'Prepaid Rent - Al-Yarmook Apt', 'إيجار مقدم شقة اليرموك'),
    ('1161010033', 'Prepaid Rent - Umm Al-Hamam 1 Apt', 'إيجار مقدم شقة أم الحمام 1'),
    ('1161010034', 'Prepaid Rent - Aswaq Mecca Apt', 'إيجار مقدم شقة أسواق مكة'),
    ('1161010035', 'Prepaid Rent - Al-Owais Shop', 'إيجار مقدم محل العويس'),
    ('1161010036', 'Prepaid Rent - Al-Owais Apt', 'إيجار شقة محل العويس'),
    ('1161010037', 'Prepaid Rent - Aswaq Hijab Shop', 'إيجار محل أسواق حجاب'),
    ('1161010038', 'Prepaid Rent - Hijab Branch Apt', 'إيجار مقدم شقة فرع حجاب'),
    ('1161010039', 'Prepaid Rent - Employee Housing', 'إيجار مقدم سكن موظفين الشركة - الاستراحة')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '116101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 116102 — ضريبة القيمة المضافة (مدين - مشتريات)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '116102', 'VAT Receivable', 'ضريبة القيمة المضافة', COALESCE(v_type_tax_receivable, v_type_receivable), 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1161'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, COALESCE(v_type_tax_receivable, v_type_receivable), 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1161020001', 'VAT on Purchases (Input)', 'ضريبة القيمة المضافة - مشتريات'),
    ('1161020002', 'VAT Intermediary', 'وسيط ضريبة')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '116102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 116103 — حسابات وسيطة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '116103', 'Intermediary Accounts', 'حسابات وسيطة', v_type_other_asset, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1161'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_other_asset, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1161030001', 'Inventory Transfer Intermediary', 'وسيط التحويلات المخزنية'),
    ('1161030002', 'Inventory Adjustment Intermediary', 'وسيط تسوية المخزون'),
    ('1161030003', 'Transport Expenses Intermediary', 'وسيط مصاريف النقل'),
    ('1161030004', 'POS Intermediary', 'وسيط نقاط البيع'),
    ('1161030006', 'Roasting & Grinding Costs Intermediary', 'وسيط تكاليف طحن وتحميص'),
    ('1161030007', 'Branch Cash Purchases Intermediary', 'وسيط مشتريات نقدية الفروع'),
    ('1161030008', 'Cash Surplus/Deficit Intermediary', 'وسيط فوارق عجز أو فائض الصندوق'),
    ('1161030009', 'Pending Branch Sales Intermediary', 'وسيط مبيعات معلقة الفروع'),
    ('1161030010', 'Additional Discount Control', 'رقابة خصومات إضافية'),
    ('1161030011', 'Inventory Adjustments', 'تسويات جردية - مخزنية'),
    ('1161030012', 'Daily Branch Inventory Adjustments', 'تسويات مخزنية الفروع - يومية')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '116103'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 116104 — إيجارات مدينة أخرى
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '116104', 'Other Debit Rent', 'إيجارات مدينة أخرى', v_type_prepaid, 5, true, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1161'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ██████████████████████████████████████████████████████████████
  -- ██  12 — الأصول غير المتداولة  NON-CURRENT ASSETS          ██
  -- ██████████████████████████████████████████████████████████████

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '12', 'Non-Current Assets', 'الأصول غير المتداولة', v_type_fixed, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 121 — الأصول الثابتة ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121', 'Fixed Assets (at Cost)', 'الأصول الثابتة', v_type_fixed, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '12'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1211 — السيارات وشاحنات النقل
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1211', 'Vehicles & Trucks', 'السيارات وشاحنات النقل', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121101', 'Vehicles', 'سيارات النقل', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1211010001', 'Toyota Hiace Van 2022 Diesel Manual', 'سيارة تويوتا هايس فان موديل 2022 ديزل يدوي'),
    ('1211010002', 'Toyota Corolla 2013', 'سيارة كورولا 2013'),
    ('1211010003', 'Hyundai Accent 2012', 'سيارة هونداي اكسنت 2012'),
    ('1211010004', 'Toyota Avalon 2017', 'سيارة تويوتا أفالون 2017'),
    ('1211010005', 'Toyota Camry', 'سيارة كامري'),
    ('1211010006', 'Toyota Refrigerated Bus', 'باص لنقل البضاعة تويوتا ثلاجة'),
    ('1211010007', 'Toyota Corolla Silver', 'سيارة كورولا فضي'),
    ('1211010008', 'Toyota Hiace White Bus 4144', 'باص هاي ايس تويوتا أبيض 4144'),
    ('1211010009', 'GMC Denali 2024', 'سيارة جيمس دينالي موديل 2024')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121101'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121102', 'Trucks', 'شاحنات النقل', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1211020001', 'Transport Trucks', 'شاحنات النقل', v_type_fixed, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1212 — الأثاث والديكورات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1212', 'Furniture & Decorations', 'الأثاث والديكورات', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121201', 'Furniture & Fixtures', 'الأثاث والمفروشات', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1212010001', 'Shelves & Stands', 'رفوف واستندات', v_type_fixed, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121201'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121202', 'Office Equipment', 'التجهيزات المكتبية', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1212020001', 'Office Equipment', 'تجهيزات مكتبية'),
    ('1212020002', 'Fireproof Safe', 'خزنة مقاومة للحريق')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121202'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1213 — الكمبيوترات والطابعات والأنظمة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1213', 'Computers, Printers & Systems', 'الكمبيوترات والطابعات والأنظمة', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121301', 'Computers', 'الكمبيوترات', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1213010001', 'Computers', 'كمبيوترات'),
    ('1213010002', 'DrayTek Network Router', 'جهاز شبكة إنترنت روتر دراي تيك')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121301'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121302', 'Software Systems', 'الأنظمة', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1213020001', 'Computer Software', 'برامج الحاسب الآلي', v_type_fixed, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121302'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121303', 'Printers & Scanners', 'الطابعات', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1213030006', 'HP Smart Tank 515 Printer', 'طابعة HP Smart TANK 515'),
    ('1213031', 'Zebra GK420T Printer', 'طابعة ZEBRA GK420T'),
    ('1213032', 'EPSON TM T20III-O11', 'EPSON TM T20III-O11'),
    ('1213033', 'Symbol LT 4278 Scanner', 'SCANNER SYMBOL LT 4278'),
    ('1213034', 'HP Color MFP Printer', 'طابعة اتش بي متعددة الألوان'),
    ('1213035', 'Integra Currency Counter', 'آلة عد وفحص عملات INTEGRA')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121303'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121304', 'Scales & Counting Machines', 'الموازين', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1213041', 'Class 2 Scales', 'موازين كلاس 2'),
    ('1213042', 'Class 1 Scales', 'موازين كلاس 1'),
    ('1213043', 'Camry 30KG Electronic Scale 2', 'ميزان كامري 30 كيلو إلكتروني 2'),
    ('1213044', 'Camry 6KG Battery Scale', 'ميزان كامري 6 كيلو جرام بطارية'),
    ('1213045', 'Camry 30KG Electronic Scale 3', 'ميزان كامري 30 كيلو إلكتروني 3'),
    ('1213046', 'Camry 30KG Electronic Scale 4', 'ميزان كامري 30 كيلو إلكتروني 4'),
    ('1213047', 'Currency Counter - Al-Rawdah 2', 'ماكينة عد وفرز النقود لمحل الروضة 2')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121304'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1214 — الأجهزة الكهربائية والعدد والأدوات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1214', 'Electrical Appliances & Tools', 'الأجهزة الكهربائية والعدد والأدوات', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121401', 'Electrical Appliances', 'الأجهزة الكهربائية', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1214'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1214010001', 'Air Conditioners', 'مكيفات', v_type_fixed, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121401'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121402', 'Small Tools & Equipment', 'العدد والأدوات', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1214'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1214020001', 'Small Tools & Equipment', 'العدد والأدوات الصغيرة', v_type_fixed, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121402'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1215 — المعدات والآلات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1215', 'Machinery & Equipment', 'المعدات والآلات', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121502', 'Equipment', 'المعدات', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1215'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1215020001', 'Italian Cooling Room 90x190', 'ثلاجة تبريد مع باب مفصلي 90×190 إيطالي'),
    ('1215020002', 'Cooling Room - Warehouse 7', 'غرفة تبريد للمستودع 7'),
    ('1215020003', 'Coffee Roaster + Grinders', 'حماصة قهوة + طواحين'),
    ('1215020004', 'Curved Sweets Display 1.8 Gold', 'ثلاجة حلويات مقوس 1.8 ذهبي'),
    ('1215020005', 'Mando Split AC 30 Cold - Al-Rawdah', 'مكيف ماندو سبليت 30 بارد لمحل الروضة الجديد'),
    ('1215020006', 'Forklift 3 Ton - Warehouse', 'رافعة شوكية حمولة 3 طن للمستودع'),
    ('1215020007', 'LG Gold Inverter 38 AC - Al-Dira', 'مكيف إل جي سبيلت جولد إنفرتر 38 بارد لمحل الديرة'),
    ('1215020008', 'ACs - Rabwah/Umm Hamam/Qarya', 'مكيفات للربوة وأم الحمام والقرية الشعبية'),
    ('1215020009', 'Room ACs - Rabwah & Umm Hamam', 'مكيفات غرفة لمحل الربوة وأم الحمام'),
    ('1215020010', 'Mando Hidden 5T AC - Al-Rabwah', 'مكيف ماندو مخفي 5 طن لمحل الربوة الجديد'),
    ('1215020011', 'Open Display Fridge - Umm Hamam 2', 'ثلاجة مكشوفة لمحل أم الحمام 2'),
    ('1215020012', 'Freezer Room - Al-Rabwah', 'غرفة تجميد لمحل الربوة الجديد'),
    ('1215020013', 'Fridges - Al-Tamir 3', 'ثلاجات لمحل التعمير 3'),
    ('1215020014', 'Fridges - Atiqah 2', 'ثلاجات لمحل عتيقة 2'),
    ('1215020015', 'Starway Hidden 5T AC - Atiqah 2', 'مكيف ستار واي مخفي 5 طن لمحل عتيقة 2 الجديد')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121502'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1216 — العقارات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1216', 'Real Estate', 'العقارات', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121601', 'Buildings', 'المباني', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1216'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1216010001', 'New Warehouses - Land Plot 104-2483', 'المستودعات الجديدة قطعة أرض رقم 104-2483'),
    ('1216010002', 'Al-Aziziya Warehouse Plot 223/3030', 'مستودع العزيزية طريق عرفات قطعة 223 مخطط 3030'),
    ('1216010003', 'Factory Land Plot 1/3880 Al-Misfat', 'قطعة أرض مصنع رقم 1 مخطط 3880 حي المصفاة'),
    ('1216010004', 'Al-Aziziya Warehouses Land Plot 224/3030', 'قطعة أرض مستودعات العزيزية رقم 224 مخطط 3030'),
    ('1216010005', 'Hotel Land Plot 30/3085 Al-Aziziya', 'قطعة أرض فندق العزيزية رقم 30 مخطط 3085'),
    ('1216010006', 'Hotel Under Construction Plot 30/3085', 'مبنى فندق تحت الإنشاء للقطعة 30 مخطط 3085'),
    ('1216010007', 'Dar Khawlan Factory Under Construction', 'مبنى مصنع دار خولان تحت الإنشاء'),
    ('1216010008', 'Al-Dar Al-Bayda Warehouse Plot 93/2483', 'مستودع الدار البيضاء مخطط 2483 قطعة 93')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121601'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121602', 'Land', 'الأراضي', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1216'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1216020001', 'Land', 'أرضية'),
    ('1216020002', 'Employee Housing Building', 'مبنى سكن موظفين شركة دار خولان')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121602'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 1217 — مصاريف التأسيس ونقل القدم
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '1217', 'Setup & Goodwill Costs', 'مصاريف التأسيس ونقل القدم', v_type_fixed, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '121701', 'Setup Costs', 'مصاريف التأسيس', v_type_fixed, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '1217'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_fixed, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1217010001', 'Office Setup Costs', 'مصروف تأسيس المكاتب'),
    ('1217010002', 'Branch Setup Costs', 'مصروف تأسيس الفروع')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '121701'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 122 — مجمع الإهلاك (Accumulated Depreciation — Contra Asset) ----
  -- CORRECTION: Moved from 2221010001 (was incorrectly in Liabilities)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '122', 'Accumulated Depreciation', 'مجمع الإهلاك', v_type_accum_depr, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '12'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_accum_depr, 4, true, false, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('1221', 'Accum. Depr. - Vehicles & Trucks', 'مجمع إهلاك السيارات وشاحنات النقل'),
    ('1222', 'Accum. Depr. - Furniture & Fixtures', 'مجمع إهلاك الأثاث والتجهيزات المكتبية'),
    ('1223', 'Accum. Depr. - Computers & Systems', 'مجمع إهلاك الكمبيوترات والأنظمة'),
    ('1224', 'Accum. Depr. - Electrical & Tools', 'مجمع إهلاك الأجهزة والعدد والأدوات'),
    ('1225', 'Accum. Depr. - Machinery & Equipment', 'مجمع إهلاك المعدات والآلات'),
    ('1226', 'Accum. Depr. - Real Estate', 'مجمع إهلاك العقارات'),
    ('1227', 'Amortization - Setup Costs', 'إطفاء مصاريف التأسيس')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '122'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ██████████████████████████████████████████████████████████████
  -- ██  2 — الخصوم وحقوق الملكية  LIABILITIES & EQUITY        ██
  -- ██████████████████████████████████████████████████████████████

  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (v_company_id, '2', 'Liabilities & Equity', 'الخصوم وحقوق الملكية', v_type_payable, 1, true, true, false, v_user_id)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 21 — الخصوم المتداولة ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '21', 'Current Liabilities', 'الخصوم المتداولة', v_type_payable, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 211 — الدائنون
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '211', 'Payables', 'الدائنون', v_type_payable, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '21'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_control_account, control_type, created_by)
  SELECT v_company_id, id, '2111', 'Suppliers', 'الموردون', v_type_payable, 4, true, false, true, 'vendor', v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '211101', 'Local & Foreign Suppliers', 'موردون محليون وخارجيون', v_type_payable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2111'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_payable, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('2111010001', 'Local Suppliers', 'الموردون المحليون'),
    ('2111010002', 'Foreign Suppliers', 'موردون خارجيون'),
    ('2111010003', 'Miscellaneous Service Suppliers', 'موردون متنوعون خدمات')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '211101'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2112', 'Other Payables', 'ذمم دائنة أخرى', v_type_payable, 4, true, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '211'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 212 — أوراق دفع
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '212', 'Notes Payable', 'أوراق دفع', v_type_payable, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '21'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2121', 'Checks Payable Under Collection', 'شيكات دفع تحت التحصيل', v_type_payable, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '212101', 'Checks Payable', 'شيكات دفع تحت التحصيل', v_type_payable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2121010001', 'Bank Checks Payable', 'شيكات دفع بنك تحت التحصيل', v_type_payable, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '212101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 213 — التأمينات الدائنة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '213', 'Credit Guarantees', 'التأمينات الدائنة', v_type_other_liab, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '21'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2131', 'Customer Guarantees', 'التأمينات الدائنة', v_type_other_liab, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '213101', 'Customer Deposits', 'ضمانات العملاء', v_type_other_liab, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2131'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2131010001', 'Customer Guarantee Deposit', 'ضمانة العميل', v_type_other_liab, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '213101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 214 — الأرصدة الدائنة الأخرى
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '214', 'Other Credit Balances', 'الأرصدة الدائنة الأخرى', v_type_accrued, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '21'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2141 — مصاريف مستحقة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2141', 'Accrued Expenses', 'مصاريف مستحقة', v_type_accrued, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '214'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '214101', 'Accrued LC Expenses', 'مصاريف مستحقة اعتمادات', v_type_accrued, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2141'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2141010001', 'Accrued LC Expenses', 'مصاريف مستحقة اعتماد', v_type_accrued, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '214101'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '214102', 'Accrued General Expenses', 'المصاريف المستحقة العامة', v_type_accrued, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2141'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_accrued, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('2141020001', 'Miscellaneous Accrued Expenses', 'مصاريف مستحقة متنوعة'),
    ('2141020003', 'Annual Leave Provision', 'مخصص إجازة سنوية'),
    ('2141020006', 'Al-Batra Office - Recruitment', 'مكتب البتراء - يحيى الكبسي للاستقدام')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '214102'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '214103', 'Sales Commission Payable', 'عمولة مندوبين مستحقة', v_type_accrued, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2141'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2141030001', 'Sales Commission Payable', 'عمولة مندوبين مستحقة', v_type_accrued, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '214103'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2142 — الضرائب (VAT دائن - على المبيعات)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2142', 'Taxes Payable', 'الضرائب', v_type_tax_payable, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '214'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '214201', 'VAT Payable', 'ضريبة القيمة المضافة', v_type_tax_payable, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2142'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2142010001', 'VAT on Sales (Output)', 'ضريبة القيمة المضافة - مبيعات', v_type_tax_payable, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '214201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 22 — الخصوم طويلة الأجل ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '22', 'Non-Current Liabilities', 'الخصوم طويلة الأجل', v_type_loan, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 221 — القروض
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '221', 'Loans', 'القروض', v_type_loan, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '22'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2211', 'Bank Loans', 'قروض بنكية', v_type_loan, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '221'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '221101', 'Al-Ahli Bank Loans', 'قروض البنك الأهلي', v_type_loan, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2211010001', 'Loan #1 - Al-Ahli Bank', 'قرض رقم 1 - البنك الأهلي', v_type_loan, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '221101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 222 — المخصصات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '222', 'Provisions', 'المخصصات', v_type_other_liab, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '22'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2221', 'Provisions', 'مخصصات', v_type_other_liab, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '222'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '222101', 'Provisions', 'مخصصات', v_type_other_liab, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2221'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- NOTE: مجمع الإهلاك نُقل إلى 122 — هنا فقط المخصصات الحقيقية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_other_liab, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('2221010002', 'End of Service Provision', 'مخصص نهاية خدمة'),
    ('2221010003', 'Zakat & Income Tax Provision', 'مخصص الزكاة وضريبة الدخل'),
    ('2221010004', 'Incentives & Sales Commission Provision', 'مستحقات حوافز ومكافآت وعمولة مبيعات')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '222101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 23 — حقوق الملكية ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '23', 'Equity', 'حقوق الملكية', v_type_capital, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '231', 'Partners Equity', 'حقوق ملكية الشركاء', v_type_capital, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '23'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2311 — رأس المال
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2311', 'Capital', 'رأس المال', v_type_capital, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '231101', 'Capital', 'رأس المال', v_type_capital, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2311'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2311010001', 'Capital', 'رأس المال', v_type_capital, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2312 — الأرباح والخسائر
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2312', 'Profit & Loss', 'الأرباح والخسائر', v_type_retained, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '231201', 'Profit & Loss', 'الأرباح والخسائر', v_type_retained, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_retained, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('2312010001', 'Current Period P&L', 'الأرباح والخسائر للفترة'),
    ('2312010002', 'Retained Earnings', 'الأرباح والخسائر المرحلة')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '231201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2314 — الاحتياطيات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2314', 'Reserves', 'الاحتياطيات', v_type_reserve, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '231401', 'Reserves', 'الاحتياطيات', v_type_reserve, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2314'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2314010001', 'Legal Reserve', 'احتياطي قانوني', v_type_reserve, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231401'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 2315 — جاري الشركاء
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '2315', 'Partners Current Accounts', 'جاري الشركاء', v_type_capital, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '231'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '231501', 'Partners Current Accounts', 'جاري الشركاء', v_type_capital, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '2315'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- FIXED: 2315010003 was duplicate of 2315010002 — renamed
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_capital, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('2315010001', 'Partner - Saad Saeed Al-Ahmari', 'جاري الشريك سعد سعيد الأحمري'),
    ('2315010002', 'Partner - Mohammed Sukhayim (1)', 'جاري الشريك محمد سخيم'),
    ('2315010003', 'Partner - Mohammed Sukhayim (2)', 'جاري الشريك محمد سخيم (2)')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '231501'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ██████████████████████████████████████████████████████████████
  -- ██  3 — المصروفات  EXPENSES                                ██
  -- ██████████████████████████████████████████████████████████████

  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (v_company_id, '3', 'Expenses', 'المصروفات', v_type_cogs, 1, true, true, false, v_user_id)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 31 — تكلفة البضاعة ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '31', 'Cost of Goods', 'تكلفة البضاعة', v_type_cogs, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312', 'COGS', 'تكلفة البضاعة المباعة', v_type_cogs, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '31'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3121 — تكلفة المبيعات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3121', 'Cost of Sales', 'تكلفة المبيعات', v_type_cogs, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312101', 'Cost of Merchandise Sales', 'تكلفة مبيعات المخزون السلعي', v_type_cogs, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3121010001', 'Cost of Sales', 'تكلفة المبيعات', v_type_cogs, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3122 — تكلفة مردود المبيعات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3122', 'Cost of Sales Returns', 'تكلفة مردود المبيعات', v_type_cogs, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312201', 'Cost of Sales Returns', 'تكلفة مردود المبيعات للفترة', v_type_cogs, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3122'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3122010001', 'Cost of Sales Returns', 'تكلفة مردود المبيعات', v_type_cogs, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3123 — مردود المبيعات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3123', 'Sales Returns', 'مردود المبيعات', v_type_returns, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312301', 'Sales Returns', 'مردود المبيعات للفترة', v_type_returns, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3123'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3123010001', 'Sales Returns', 'مردود المبيعات', v_type_returns, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312301'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3124 — الخصم المسموح به
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3124', 'Sales Discount Allowed', 'الخصم المسموح به', v_type_discount, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312401', 'Sales Discount Allowed', 'الخصم المسموح به', v_type_discount, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3124'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3124010001', 'Sales Discount Allowed', 'الخصم المسموح به', v_type_discount, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312401'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3125 — مردود مبيعات سنوات سابقة + كميات مجانية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3125', 'Prior Year Returns & Free Qty', 'مردود مبيعات سنوات سابقة', v_type_cogs, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312501', 'Prior Year Sales Returns', 'مردود مبيعات سنوات سابقة', v_type_cogs, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3125'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_cogs, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3125010001', 'Prior Year Sales Returns', 'مردود مبيعات سنوات سابقة'),
    ('3125010002', 'Prior Year Returns Cost', 'تكلفة مردود مبيعات سنوات سابقة')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '312501'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '312502', 'Free Qty Sales Cost', 'تكلفة مبيعات الكميات المجانية', v_type_cogs, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3125'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3125020001', 'Free Qty Sales Cost', 'تكلفة مبيعات الكميات المجانية', v_type_cogs, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '312502'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 32 — المصاريف الإدارية والعمومية ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '32', 'Admin & General Expenses', 'المصاريف الإدارية والعمومية', v_type_admin, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321', 'Admin & General Expenses', 'المصاريف الإدارية والعمومية', v_type_admin, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '32'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3211 — المصاريف التشغيلية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3211', 'Operating Expenses', 'المصاريف التشغيلية', v_type_operating, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 321100 — مصاريف عمولات مشتريات (NORMALIZED from 32110001)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321100', 'Purchase Commission Expenses', 'مصاريف عمولات مشتريات', v_type_operating, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_operating, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3211000001', 'Consultation & Purchase Commission', 'مصاريف استشارات وعمولات شراء'),
    ('3211000002', 'Sales Commission & Incentives', 'عمولات المبيعات والحوافز')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321100'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 321101 — الرواتب والأجور والبدلات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321101', 'Salaries, Wages & Allowances', 'الرواتب والأجور والبدلات وما في حكمها', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3211010001', 'Employee Salaries', 'رواتب الموظفين'),
    ('3211010002', 'Daily Wage Workers', 'عمال بالأجر اليومي'),
    ('3211010003', 'Other Allowances (in Salary)', 'بدلات أخرى - ضمن الراتب'),
    ('3211010004', 'Transport Allowance', 'بدل مواصلات وانتقال'),
    ('3211010005', 'Travel Ticket Allowance', 'بدل تذكرة سفر'),
    ('3211010006', 'Annual Leave Allowance', 'بدل إجازة سنوية'),
    ('3211010007', 'Medical Allowance', 'بدل علاج'),
    ('3211010008', 'Recruitment & Residence Fees', 'رسوم استقدام العمالة وتجديد الإقامات'),
    ('3211010009', 'Exit/Re-entry Fees', 'رسوم الخروج والعودة'),
    ('3211010010', 'Sponsorship Transfer Fees', 'رسوم نقل الكفالة'),
    ('3211010011', 'Appearance Allowance', 'بدل المظهر'),
    ('3211010012', 'Driving License Fees', 'رسوم استخراج رخصة القيادة'),
    ('3211010013', 'Meals & Beverages - Buffet', 'مصروفات الوجبات والمشروبات - البوفيه'),
    ('3211010014', 'Food & Catering Expenses', 'مصاريف تغذية وإعاشة'),
    ('3211010016', 'Communication Allowance', 'بدل اتصال'),
    ('3211010017', 'Health Certificate Fees', 'رسوم إصدار شهادات صحية'),
    ('3211010018', 'Incentives & Sales Commission', 'حوافز ومكافآت وعمولة مبيعات'),
    ('3211010019', 'End of Service Expense', 'مصروف نهاية خدمة'),
    ('3211010020', 'Employee Housing Expense', 'مصاريف سكن الموظفين'),
    ('3211010021', 'Employee Gratuities', 'مصاريف إكراميات الموظفين')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 321102 — مصاريف المرافق
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321102', 'Utilities Expenses', 'مصاريف المرافق', v_type_operating, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_operating, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3211020001', 'Phone & Fax - Admin', 'التلفون والفاكس - الإدارة'),
    ('3211020002', 'Mobile', 'الجوال'),
    ('3211020003', 'Courier - DHL/FedEx', 'بريد - دي اتش إل - فيدكس'),
    ('3211020004', 'Phone & Internet', 'مصاريف تليفون وإنترنت'),
    ('3211020005', 'Electricity', 'مصاريف كهرباء'),
    ('3211020006', 'Roasting, Grinding & Peeling', 'مصاريف تحميص وطحن وتبشير'),
    ('3211020007', 'Warehouse Phone', 'تلفون المستودع')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3212 — مصاريف خدمات حكومية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3212', 'Govt Services Expenses', 'مصاريف خدمات حكومية', v_type_admin, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321201', 'Govt Services', 'مصاريف خدمات حكومية', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3212010001', 'Commercial Registration & Licenses', 'إصدار وتعديل وتجديد السجل التجاري + رخص المحلات'),
    ('3212010002', 'Subscription Fees', 'رسوم اشتراكات'),
    ('3212010003', 'Municipality & License Fees', 'رسوم البلدية والتراخيص'),
    ('3212010005', 'Zakat, Income Tax & Investment', 'مصاريف الزكاة وضريبة الدخل ومصاريف الاستثمار'),
    ('3212010006', 'Legal Consultation & Fees', 'مصاريف استشارات قانونية وأتعاب مهنية'),
    ('3212010007', 'Fines & Penalties', 'مخالفات')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321201'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 321202 — مصاريف الإيجارات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321202', 'Rent Expenses', 'مصاريف الإيجارات', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3212020002', 'Warehouse Rent', 'إيجار المستودع'),
    ('3212020003', 'Rent Expenses', 'مصاريف الإيجار')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321202'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 321203 — مصاريف منظفات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321203', 'Cleaning Supplies', 'مصاريف منظفات وأدوات تنظيف', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3212030001', 'Cleaning Supplies', 'منظفات وأدوات نظافة', v_type_admin, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321203'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3213 — مصاريف المطبوعات والقرطاسية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3213', 'Stationery & Printing', 'مصاريف المطبوعات والقرطاسية', v_type_admin, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321301', 'Stationery & Printing', 'مصاريف المطبوعات والقرطاسية', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3213'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3213010001', 'Stationery & Printing', 'مطبوعات وقرطاسية'),
    ('3213010002', 'Miscellaneous Other Expenses', 'مصاريف متنوعة أخرى'),
    ('3213010003', 'Newspaper & Magazine Subscriptions', 'اشتراك الصحف والمجلات'),
    ('3213010004', 'Packaging & Wrapping', 'مصاريف تعبئة وتغليف'),
    ('3213010005', 'Miscellaneous Petty Expenses', 'مصاريف نثرية متنوعة'),
    ('3213010006', 'Freight, Shipping & Unloading', 'مصاريف نقل وشحن وتنزيل البضائع'),
    ('3213010007', 'Water Filling Expenses', 'مصاريف تعبئة مياه'),
    ('3213010008', 'Gas Filling Expenses', 'مصاريف تعبئة غاز')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321301'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3214 — مصروفات رحلات عمل
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3214', 'Business Travel Expenses', 'مصروفات رحلات عمل', v_type_admin, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321401', 'Business Travel', 'مصروفات رحلات عمل', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3214'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3214010001', 'Business Travel Tickets', 'تذاكر سفر رحلات عمل'),
    ('3214010002', 'Travel & Hotel Accommodation', 'مصروفات سفر وإقامة فندق'),
    ('3214010003', 'Ticket Cancellation & Modification Fees', 'رسوم إلغاء تذاكر سفر وتعديل'),
    ('3214010004', 'Visa Fees', 'مصاريف تأشيرات'),
    ('3214010005', 'Inventory Committee Expenses', 'مصاريف لجنة الجرد')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321401'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3215 — مصروفات التأمينات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3215', 'Insurance Expenses', 'مصروفات التأمينات', v_type_admin, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321501', 'Insurance Expenses', 'مصروفات التأمينات', v_type_admin, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3215'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_admin, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3215010001', 'Medical Insurance & Health Certs', 'التأمين الطبي ورسوم إصدار شهادات صحية'),
    ('3215010002', 'Social Insurance (GOSI)', 'التأمينات الاجتماعية'),
    ('3215010003', 'Vehicle Insurance', 'تأمين سيارات'),
    ('3215010004', 'Property Insurance', 'تأمين ممتلكات'),
    ('3215010005', 'Medical Insurance', 'تأمين طبي')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321501'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3216 — مصروفات السيارات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3216', 'Vehicle Expenses', 'مصروفات السيارات', v_type_operating, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321601', 'Vehicle Expenses', 'مصروفات السيارات', v_type_operating, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3216'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_operating, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3216010001', 'Fuel & Oil', 'مصاريف سيارات بنزين وزيت'),
    ('3216010002', 'Spare Parts & Vehicle Maintenance', 'قطع غيار وصيانة وإصلاح السيارة'),
    ('3216010003', 'Tires', 'كفرات السيارات'),
    ('3216010004', 'Vehicle Registration & Inspection', 'رسوم استمارة ورخصة السيارة والفحص'),
    ('3216010005', 'Vehicle Rental', 'تأجير السيارات'),
    ('3216010006', 'Traffic Fines', 'غرامات مرورية')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321601'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3217 — مصروفات الصيانة
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3217', 'Maintenance Expenses', 'مصروفات الصيانة', v_type_operating, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321701', 'Maintenance', 'مصروفات الصيانة', v_type_operating, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3217'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_operating, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3217010001', 'IT & Software Maintenance', 'صيانة الحاسب الآلي والطابعات وبرامج النظام'),
    ('3217010002', 'Furniture & Sanitary Maintenance', 'صيانة الأثاث والمفروشات والصحية'),
    ('3217010003', 'Electrical & Plumbing Maintenance', 'صيانة كهرباء وسباكة وديكور'),
    ('3217010004', 'AC & Fridge Maintenance', 'صيانة مكيفات والثلاجات'),
    ('3217010005', 'Electrical Requirements', 'متطلبات كهربائية'),
    ('3217010006', 'Branch Setup Expenses', 'مصاريف تجهيز الفروع'),
    ('3217010008', 'Roaster & Grinder Maintenance', 'مصاريف صيانة المحامص والطواحين')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321701'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3218 — مصاريف الإعلان والتسويق
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3218', 'Marketing & Advertising', 'مصاريف الإعلان والتسويق', v_type_selling, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321801', 'Marketing & Advertising', 'مصاريف الإعلان والتسويق', v_type_selling, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3218'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_selling, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3218010001', 'Exhibition & Trade Show Signs', 'لوحات معارض تجارية'),
    ('3218010002', 'Marketing & Advertising', 'ترويج وتسويق وإعلان تجارية'),
    ('3218010003', 'Warranty & Other Cards', 'كروت الضمان وكروت أخرى'),
    ('3218010004', 'Trademark Registration', 'تسجيل علامات تجارية'),
    ('3218010005', 'Display Stands & Boxes', 'استندات عرض - علب'),
    ('3218010006', 'Plastic Bags', 'أكياس بلاستيك'),
    ('3218010007', 'Plastic Boxes', 'علب بلاستيك'),
    ('3218010008', 'Employee Uniform', 'مصاريف الزي الموحد للموظفين')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321801'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3219 — رسوم بنكية
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3219', 'Bank Charges', 'رسوم بنكية', v_type_financial, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '321'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '321901', 'Bank Charges', 'رسوم بنكية', v_type_financial, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3219'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_financial, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3219010001', 'Bank Transfer Fees', 'رسوم تحويلات بنكية'),
    ('3219010002', 'LC & Guarantee Letter Fees', 'رسوم اعتمادات وخطابات بنكية'),
    ('3219010003', 'Currency Exchange & Transfer Diff', 'فرق تحويل العملات والحوالات'),
    ('3219010004', 'POS Fees', 'رسوم نقاط البيع')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '321901'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---- 322 — مصروفات الإهلاكات والتسويات ----
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '322', 'Depreciation & Adjustments', 'مصروفات الإهلاكات والتسويات', v_type_depreciation, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '32'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3220 — مصروفات الإهلاك
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3220', 'Depreciation Expense', 'مصروفات الإهلاكات', v_type_depreciation, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '322'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '322001', 'Asset Depreciation Expense', 'مصاريف إهلاك أصول المؤسسة', v_type_depreciation, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3220'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_depreciation, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3220010001', 'Vehicles & Trucks Depreciation', 'قسط إهلاك السيارات وشاحنات النقل'),
    ('3220010002', 'Furniture & Office Depreciation', 'قسط إهلاك الأثاث والتجهيزات المكتبية'),
    ('3220010003', 'Computers & Systems Depreciation', 'قسط إهلاك الكمبيوترات والأنظمة'),
    ('3220010004', 'Electrical & Tools Depreciation', 'قسط إهلاك الأجهزة الكهربائية والعدد والأدوات'),
    ('3220010005', 'Machinery & Equipment Depreciation', 'قسط إهلاك المعدات والآلات'),
    ('3220010006', 'Setup Costs Amortization', 'إطفاء إهلاك تأسيس المكاتب')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '322001'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 3221 — مصروفات تسوية الحسابات والمخازن
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3221', 'Account & Inventory Adjustments', 'مصروفات تسوية الحسابات والمخازن', v_type_other_exp, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '322'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '322101', 'Account Adjustment Expenses', 'مصاريف تسوية الحسابات', v_type_other_exp, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3221'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '3221010001', 'Bad Debts Expense', 'مصاريف ديون معدومة', v_type_other_exp, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '322101'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '322102', 'Inventory Adjustment Expenses', 'مصاريف تسوية مخزنية', v_type_other_exp, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '3221'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_other_exp, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('3221020001', 'Weight Difference Expenses', 'مصاريف فروق أوزان'),
    ('3221020002', 'Missing & Damaged Items', 'أصناف مفقودة وتالفة'),
    ('3221020003', 'LC Differences', 'فروق الاعتمادات'),
    ('3221020004', 'Fraction Differences', 'فروق الكسور'),
    ('3221020005', 'Cost Differences', 'فروق التكلفة'),
    ('3221020006', 'Transfer Differences', 'فروق التحويل'),
    ('3221020007', 'Inventory Exchange Differences', 'فروق الصرف المخزني'),
    ('3221020008', 'Cash Box Deficit', 'عجز الصناديق'),
    ('3221020010', 'Customs Sample Expenses', 'مصاريف عينات الجمارك')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '322102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ██████████████████████████████████████████████████████████████
  -- ██  4 — الإيرادات  REVENUE                                  ██
  -- ██████████████████████████████████████████████████████████████

  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (v_company_id, '4', 'Revenue', 'الإيرادات', v_type_revenue, 1, true, true, false, v_user_id)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 41 — إيرادات النشاط ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '41', 'Operating Revenue', 'إيرادات النشاط', v_type_revenue, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 411 — إيرادات المبيعات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '411', 'Sales Revenue', 'إيرادات المبيعات', v_type_revenue, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '41'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4111', 'Merchandise Sales Revenue', 'إيرادات المبيعات', v_type_revenue, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '411'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '411101', 'Merchandise Sales', 'إيرادات مبيعات المخزون السلعي', v_type_revenue, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4111'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4111010001', 'Merchandise Sales Revenue', 'إيرادات مبيعات المخزون', v_type_revenue, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '411101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 412 — إيرادات مرتبطة بالنشاط
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '412', 'Related Operating Revenue', 'إيرادات مرتبطة بالنشاط', v_type_revenue, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '41'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4121', 'Incidental Revenue', 'إيرادات عرضية', v_type_revenue, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '412'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '412101', 'Free Qty Purchase Revenue', 'إيرادات مشتريات الكميات المجانية', v_type_revenue, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_revenue, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('4121010001', 'Free Qty Revenue', 'إيرادات الكميات المجانية مخزون'),
    ('4121010002', 'Free Qty Returns Cost', 'تكلفة مردود مبيعات الكميات المجانية')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '412101'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '412102', 'Purchase Discount Earned', 'إيرادات الخصم المكتسب', v_type_revenue, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4121'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4121020001', 'Purchase Discount Earned', 'الخصم المكتسب', v_type_revenue, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '412102'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 413 — إيرادات المبيعات المخزون الخدمي
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '413', 'Service Inventory Sales', 'إيرادات مبيعات المخزون الخدمي', v_type_revenue, 3, true, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '41'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ============ 42 — إيرادات أخرى ============
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '42', 'Other Revenue', 'إيرادات النشاط الأخرى', v_type_other_income, 2, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '421', 'Miscellaneous Revenue', 'إيرادات أخرى ومتنوعة', v_type_other_income, 3, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '42'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 4211 — إيرادات الاستثمارات
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4211', 'Investment Revenue', 'إيرادات الاستثمارات', v_type_other_income, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '421'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '421101', 'Financial Investment Revenue', 'إيرادات استثمارات مالية', v_type_other_income, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4211'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4211010001', 'Financial Investment Revenue', 'إيرادات استثمارات مالية', v_type_other_income, 6, false, true, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '421101'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- 4212 — إيرادات متنوعة أخرى
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '4212', 'Miscellaneous Other Revenue', 'إيرادات متنوعة أخرى', v_type_other_income, 4, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '421'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, id, '421202', 'Miscellaneous Revenue', 'الإيرادات المتنوعة', v_type_other_income, 5, true, false, v_user_id
  FROM accounts WHERE company_id = v_company_id AND code = '4212'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT v_company_id, p.id, v.code, v.name, v.name_ar, v_type_other_income, 6, false, true, v_user_id
  FROM accounts p
  CROSS JOIN (VALUES
    ('4212020001', 'Securities Sales Profit', 'أرباح بيع أوراق مالية'),
    ('4212020002', 'Currency Exchange Revenue', 'إيرادات فروق عملة'),
    ('4212020003', 'Commission Revenue', 'إيرادات عمولات'),
    ('4212020004', 'Scrap Sales Revenue', 'إيرادات بيع مخلفات'),
    ('4212020005', 'Capital Revenue', 'إيرادات رأسمالية'),
    ('4212020006', 'Rental Revenue', 'إيرادات إيجارات'),
    ('4212020007', 'Cash Box Surplus', 'فائض الصناديق'),
    ('4212020008', 'Employee Absence Deduction Revenue', 'إيراد غياب الموظف')
  ) AS v(code, name, name_ar)
  WHERE p.company_id = v_company_id AND p.code = '421202'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- =============================================
  -- SUMMARY
  -- =============================================
  RAISE NOTICE 'DARKHAWLAN COA seeding completed successfully for company_id=%', v_company_id;

END $$;
