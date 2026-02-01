-- =============================================
-- Ensure every company has a usable Chart of Accounts (COA)
-- and required default account mappings.
--
-- Why: migration 017 defined create_default_coa(), but it was not invoked
-- automatically for existing/new companies, and it wasn't idempotent.
-- This migration replaces it with an idempotent implementation, invokes it
-- for all existing companies, and installs a trigger for new companies.
-- =============================================

-- NOTE:
-- The global numbering trigger function created in migration 068 referenced
-- NEW.created_by / NEW.updated_by directly, which fails on some tables that
-- have company_id but not those audit columns (e.g., default_accounts).
-- Replace it with a safe implementation before we insert any rows.
CREATE OR REPLACE FUNCTION slms_set_sequence_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_series_id INT;
  v_assigned INT;
  v_user_id INT;
  v_module TEXT;
  v_fallback_user_id INT;
BEGIN
  -- Only apply when company_id exists
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Some tables don't have created_by/updated_by; use JSONB extraction.
  v_user_id := NULLIF((to_jsonb(NEW) ->> 'created_by')::INT, 0);
  IF v_user_id IS NULL THEN
    v_user_id := NULLIF((to_jsonb(NEW) ->> 'updated_by')::INT, 0);
  END IF;

  -- Fallback user for environments where user id=1 might not exist
  SELECT MIN(id) INTO v_fallback_user_id FROM users;

  -- If v_user_id doesn't exist (common in partially-seeded DBs), null it out
  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    v_user_id := NULL;
  END IF;

  v_module := TG_TABLE_NAME;

  -- Ensure series exists
  v_series_id := slms_ensure_numbering_series(NEW.company_id, v_module, COALESCE(v_user_id, v_fallback_user_id));

  -- Set FK if missing
  IF NEW.numbering_series_id IS NULL THEN
    NEW.numbering_series_id := v_series_id;
  END IF;

  -- Assign next sequence if missing
  IF NEW.sequence_no IS NULL THEN
    WITH upd AS (
      UPDATE numbering_series
      SET current_number = current_number + 1,
          updated_at = NOW(),
          updated_by = COALESCE(v_user_id, updated_by)
      WHERE id = v_series_id
      RETURNING current_number
    )
    SELECT current_number - 1 INTO v_assigned FROM upd;

    NEW.sequence_no := v_assigned;
  END IF;

  RETURN NEW;
END $$;

-- Ensure account types exist (system-level)
INSERT INTO account_types (code, name, name_ar, nature, classification, report_group, display_order) VALUES
  ('TAX_RECEIVABLE', 'Taxes Receivable', 'ضرائب مدينة', 'debit', 'asset', 'balance_sheet', 8),
  ('PURCHASE', 'Purchases', 'المشتريات', 'debit', 'expense', 'income_statement', 42)
ON CONFLICT (code) DO NOTHING;

-- Replace with idempotent seeding function
CREATE OR REPLACE FUNCTION create_default_coa(p_company_id INTEGER, p_created_by INTEGER)
RETURNS VOID AS $$
DECLARE
  v_type_cash INTEGER;
  v_type_receivable INTEGER;
  v_type_inventory INTEGER;
  v_type_fixed INTEGER;
  v_type_accum_depr INTEGER;
  v_type_payable INTEGER;
  v_type_tax_payable INTEGER;
  v_type_tax_receivable INTEGER;
  v_type_accrued INTEGER;
  v_type_capital INTEGER;
  v_type_retained INTEGER;
  v_type_revenue INTEGER;
  v_type_discount INTEGER;
  v_type_cogs INTEGER;
  v_type_operating INTEGER;
  v_type_admin INTEGER;
  v_type_selling INTEGER;
  v_type_purchase INTEGER;
BEGIN
  -- Resolve account type IDs
  SELECT id INTO v_type_cash FROM account_types WHERE code = 'CASH';
  SELECT id INTO v_type_receivable FROM account_types WHERE code = 'RECEIVABLE';
  SELECT id INTO v_type_inventory FROM account_types WHERE code = 'INVENTORY';
  SELECT id INTO v_type_fixed FROM account_types WHERE code = 'FIXED_ASSET';
  SELECT id INTO v_type_accum_depr FROM account_types WHERE code = 'ACCUM_DEPR';
  SELECT id INTO v_type_payable FROM account_types WHERE code = 'PAYABLE';
  SELECT id INTO v_type_tax_payable FROM account_types WHERE code = 'TAX_PAYABLE';
  SELECT id INTO v_type_tax_receivable FROM account_types WHERE code = 'TAX_RECEIVABLE';
  SELECT id INTO v_type_accrued FROM account_types WHERE code = 'ACCRUED';
  SELECT id INTO v_type_capital FROM account_types WHERE code = 'CAPITAL';
  SELECT id INTO v_type_retained FROM account_types WHERE code = 'RETAINED';
  SELECT id INTO v_type_revenue FROM account_types WHERE code = 'REVENUE';
  SELECT id INTO v_type_discount FROM account_types WHERE code = 'DISCOUNT';
  SELECT id INTO v_type_cogs FROM account_types WHERE code = 'COGS';
  SELECT id INTO v_type_operating FROM account_types WHERE code = 'OPERATING';
  SELECT id INTO v_type_admin FROM account_types WHERE code = 'ADMIN';
  SELECT id INTO v_type_selling FROM account_types WHERE code = 'SELLING';
  SELECT id INTO v_type_purchase FROM account_types WHERE code = 'PURCHASE';

  -- ========== 1. ASSETS (1xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '1000', 'Assets', 'الأصول', v_type_cash, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '1100', 'Current Assets', 'الأصول المتداولة', v_type_cash, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '1110', 'Cash and Bank', 'النقدية والبنوك', v_type_cash, 3, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_reconcilable, is_system, created_by)
  SELECT p_company_id, id, '1111', 'Petty Cash', 'الصندوق', v_type_cash, 4, false, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1110'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_reconcilable, is_control_account, control_type, is_system, created_by)
  SELECT p_company_id, id, '1112', 'Bank Accounts', 'الحسابات البنكية', v_type_cash, 4, true, true, 'bank', true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1110'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '1113', 'Checks Under Collection', 'شيكات تحت التحصيل', v_type_cash, 4, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1110'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '1200', 'Receivables', 'المدينون', v_type_receivable, 3, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, is_system, created_by)
  SELECT p_company_id, id, '1201', 'Accounts Receivable - Trade', 'ذمم العملاء', v_type_receivable, 4, true, 'customer', true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1200'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '1202', 'Notes Receivable', 'أوراق قبض', v_type_receivable, 4, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1200'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '1203', 'Allowance for Doubtful Accounts', 'مخصص الديون المشكوك فيها', v_type_receivable, 4, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1200'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '1300', 'Inventory', 'المخزون', v_type_inventory, 3, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '1301', 'Merchandise Inventory', 'مخزون البضائع', v_type_inventory, 4, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1300'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '1305', 'Goods in Transit', 'بضائع في الطريق', v_type_inventory, 4, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1300'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- VAT receivable (recommended asset-side account)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '1210', 'VAT Receivable', 'ضريبة قيمة مضافة مدينة', COALESCE(v_type_tax_receivable, v_type_receivable), 4, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1200'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Fixed Assets
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '1500', 'Fixed Assets', 'الأصول الثابتة', v_type_fixed, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '1509', 'Accumulated Depreciation', 'الإهلاك المتراكم', v_type_accum_depr, 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '1500'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== 2. LIABILITIES (2xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '2000', 'Liabilities', 'الالتزامات', v_type_payable, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '2100', 'Current Liabilities', 'الالتزامات المتداولة', v_type_payable, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, is_system, created_by)
  SELECT p_company_id, id, '2101', 'Accounts Payable - Trade', 'ذمم الموردين', v_type_payable, 3, true, 'vendor', true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2100'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Taxes Payable
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '2200', 'Taxes Payable', 'الضرائب المستحقة', v_type_tax_payable, 3, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '2201', 'VAT Output', 'ضريبة القيمة المضافة - مخرجات', v_type_tax_payable, 4, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2200'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Keep legacy VAT Input account for compatibility (but default mapping will prefer 1210)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '2202', 'VAT Input (Legacy)', 'ضريبة القيمة المضافة - مدخلات (قديم)', v_type_tax_payable, 4, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2200'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '2203', 'Customs Duties Payable', 'رسوم جمركية مستحقة', v_type_tax_payable, 4, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2200'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Accrued
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '2300', 'Accrued Expenses', 'مصروفات مستحقة', v_type_accrued, 3, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '2100'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== 3. EQUITY (3xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '3000', 'Equity', 'حقوق الملكية', v_type_capital, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '3200', 'Retained Earnings', 'الأرباح المحتجزة', v_type_retained, 2, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '3000'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== 4. REVENUE (4xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '4000', 'Revenue', 'الإيرادات', v_type_revenue, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '4100', 'Sales Revenue', 'إيرادات المبيعات', v_type_revenue, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '4000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
  SELECT p_company_id, id, '4101', 'Domestic Sales', 'مبيعات محلية', v_type_revenue, 3, true, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '4100'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== 5. COGS (5xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '5000', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', v_type_cogs, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '5100', 'Cost of Goods Sold', 'تكلفة المبيعات', v_type_cogs, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '5101', 'Material Cost', 'تكلفة المواد', v_type_cogs, 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '5102', 'Freight In', 'مصاريف الشحن الداخلة', v_type_cogs, 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5100'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '5103', 'Customs Duties', 'رسوم جمركية', v_type_cogs, 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5100'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Purchases (explicit purchases expense bucket for non-stock / services)
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '5200', 'Purchases', 'المشتريات', COALESCE(v_type_purchase, v_type_operating), 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '5201', 'Purchases - Services', 'مشتريات خدمات', COALESCE(v_type_purchase, v_type_operating), 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '5200'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== 6. EXPENSES (6xxx) ==========
  INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
  VALUES (p_company_id, '6000', 'Expenses', 'المصروفات', v_type_operating, 1, true, true, false, p_created_by)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
  SELECT p_company_id, id, '6300', 'Selling Expenses', 'مصروفات البيع والتسويق', v_type_selling, 2, true, false, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '6000'
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
  SELECT p_company_id, id, '6302', 'Freight Out', 'مصاريف الشحن', v_type_selling, 3, p_created_by
  FROM accounts WHERE company_id = p_company_id AND code = '6300'
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ========== DEFAULT ACCOUNT MAPPINGS ==========
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'AR_TRADE', id, 'Default Accounts Receivable' FROM accounts WHERE company_id = p_company_id AND code = '1201'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'AP_TRADE', id, 'Default Accounts Payable' FROM accounts WHERE company_id = p_company_id AND code = '2101'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'INVENTORY', id, 'Default Inventory Account' FROM accounts WHERE company_id = p_company_id AND code = '1301'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'COGS', id, 'Default Cost of Goods Sold' FROM accounts WHERE company_id = p_company_id AND code = '5100'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'SALES', id, 'Default Sales Revenue' FROM accounts WHERE company_id = p_company_id AND code = '4101'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  -- Purchases (explicit)
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'PURCHASES', id, 'Default Purchases Account' FROM accounts WHERE company_id = p_company_id AND code = '5201'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  -- Taxes
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'VAT_OUTPUT', id, 'VAT Output Account' FROM accounts WHERE company_id = p_company_id AND code = '2201'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'VAT_INPUT', id, 'VAT Input Account (Receivable)' FROM accounts WHERE company_id = p_company_id AND code = '1210'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  -- Cash/Bank
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'CASH', id, 'Default Cash Account' FROM accounts WHERE company_id = p_company_id AND code = '1111'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'BANK', id, 'Default Bank Account' FROM accounts WHERE company_id = p_company_id AND code = '1112'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  -- Shipping / Customs
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'CUSTOMS', id, 'Customs Duties Expense' FROM accounts WHERE company_id = p_company_id AND code = '5103'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'FREIGHT_IN', id, 'Freight In (COGS)' FROM accounts WHERE company_id = p_company_id AND code = '5102'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'FREIGHT_OUT', id, 'Freight Out (Selling)' FROM accounts WHERE company_id = p_company_id AND code = '6302'
  ON CONFLICT (company_id, account_key) DO NOTHING;

  -- Equity
  INSERT INTO default_accounts (company_id, account_key, account_id, description)
  SELECT p_company_id, 'RETAINED_EARNINGS', id, 'Retained Earnings Account' FROM accounts WHERE company_id = p_company_id AND code = '3200'
  ON CONFLICT (company_id, account_key) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Trigger to seed COA automatically for new companies
CREATE OR REPLACE FUNCTION trg_company_seed_default_coa()
RETURNS TRIGGER AS $$
DECLARE
  v_fallback_user_id INT;
  v_user_id INT;
BEGIN
  SELECT MIN(id) INTO v_fallback_user_id FROM users;
  v_user_id := NEW.created_by;
  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    v_user_id := NULL;
  END IF;
  PERFORM create_default_coa(NEW.id, COALESCE(v_user_id, v_fallback_user_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_seed_default_coa ON companies;
CREATE TRIGGER trg_company_seed_default_coa
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION trg_company_seed_default_coa();

-- Seed for all existing companies (idempotent)
DO $$
DECLARE
  r RECORD;
  v_fallback_user_id INT;
  v_user_id INT;
BEGIN
  SELECT MIN(id) INTO v_fallback_user_id FROM users;
  FOR r IN SELECT id, created_by FROM companies WHERE deleted_at IS NULL LOOP
    v_user_id := r.created_by;
    IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
      v_user_id := NULL;
    END IF;
    PERFORM create_default_coa(r.id, COALESCE(v_user_id, v_fallback_user_id));
  END LOOP;
END $$;
