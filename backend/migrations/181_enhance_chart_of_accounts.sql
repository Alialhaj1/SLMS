-- =====================================================
-- Migration: 181_enhance_chart_of_accounts.sql
-- Description: Professional Chart of Accounts Enhancement
-- Date: 2026-01-20
-- =====================================================

-- =====================================================
-- 1. Add new columns to accounts table
-- =====================================================

-- Account Behavior/Role (CONTROL, DETAIL, ANALYTICAL, SYSTEM, SUSPENSE, CLEARING)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS account_behavior VARCHAR(20) DEFAULT 'DETAIL';

-- Account Level Description (for reporting)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS level_type VARCHAR(20) DEFAULT 'detail';
-- Values: 'header', 'group', 'control', 'detail', 'analytical'

-- Entity linking (for analytical accounts)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS linked_entity_type VARCHAR(30);
-- Values: 'customer', 'vendor', 'employee', 'bank', 'project', 'asset', 'shipment'

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS linked_entity_id INTEGER;

-- Frozen status (no new postings allowed)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

-- Normal balance indicator
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(10) DEFAULT 'debit';
-- Values: 'debit', 'credit'

-- Foreign currency balance
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS opening_balance_foreign DECIMAL(18, 4) DEFAULT 0;

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS current_balance_foreign DECIMAL(18, 4) DEFAULT 0;

-- Display order within parent
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Last transaction date
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS last_transaction_date TIMESTAMP;

-- Budget amount (optional)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(18, 4);

-- Notes/Memo
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 2. Create account_behaviors lookup table
-- =====================================================
CREATE TABLE IF NOT EXISTS account_behaviors (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50),
  description TEXT,
  allow_posting BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0
);

-- Insert default behaviors
INSERT INTO account_behaviors (code, name, name_ar, description, allow_posting, display_order)
VALUES 
  ('HEADER', 'Header Account', 'حساب رئيسي', 'Main category account for reporting only', FALSE, 1),
  ('GROUP', 'Group Account', 'حساب تجميعي', 'Groups related accounts together', FALSE, 2),
  ('CONTROL', 'Control Account', 'حساب رقابي', 'Controls sub-ledger (AR/AP)', FALSE, 3),
  ('DETAIL', 'Detail Account', 'حساب تفصيلي', 'Accepts direct postings', TRUE, 4),
  ('ANALYTICAL', 'Analytical Account', 'حساب تحليلي', 'Linked to entity (customer/vendor)', TRUE, 5),
  ('SYSTEM', 'System Account', 'حساب نظامي', 'Auto-managed by system', TRUE, 6),
  ('SUSPENSE', 'Suspense Account', 'حساب معلق', 'Temporary holding account', TRUE, 7),
  ('CLEARING', 'Clearing Account', 'حساب تسوية', 'For clearing transactions', TRUE, 8)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. Create account_level_types lookup table
-- =====================================================
CREATE TABLE IF NOT EXISTS account_level_types (
  id SERIAL PRIMARY KEY,
  level INTEGER UNIQUE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50),
  description TEXT,
  allow_posting BOOLEAN DEFAULT TRUE,
  code_length INTEGER DEFAULT 2
);

-- Insert level types (5 levels as per professional structure)
INSERT INTO account_level_types (level, code, name, name_ar, description, allow_posting, code_length)
VALUES 
  (1, 'L1', 'Main Account', 'حساب رئيسي', 'For reports only - no direct posting', FALSE, 1),
  (2, 'L2', 'Group Account', 'حساب تجميعي', 'Groups categories together', FALSE, 2),
  (3, 'L3', 'Control Account', 'حساب رقابي', 'Controls movement of account groups', FALSE, 2),
  (4, 'L4', 'Operational Account', 'حساب تشغيلي', 'Accepts direct postings', TRUE, 3),
  (5, 'L5', 'Analytical Account', 'حساب تحليلي', 'Linked to entity (customer/vendor/employee)', TRUE, 4)
ON CONFLICT (level) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  allow_posting = EXCLUDED.allow_posting,
  code_length = EXCLUDED.code_length;

-- =====================================================
-- 4. Create linked_entity_types lookup table
-- =====================================================
CREATE TABLE IF NOT EXISTS linked_entity_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50),
  table_name VARCHAR(50),
  display_order INTEGER DEFAULT 0
);

INSERT INTO linked_entity_types (code, name, name_ar, table_name, display_order)
VALUES 
  ('customer', 'Customer', 'عميل', 'customers', 1),
  ('vendor', 'Vendor', 'مورد', 'vendors', 2),
  ('employee', 'Employee', 'موظف', 'employees', 3),
  ('bank', 'Bank Account', 'حساب بنكي', 'bank_accounts', 4),
  ('project', 'Project', 'مشروع', 'projects', 5),
  ('asset', 'Fixed Asset', 'أصل ثابت', 'fixed_assets', 6),
  ('shipment', 'Shipment', 'شحنة', 'logistics_shipments', 7),
  ('cost_center', 'Cost Center', 'مركز تكلفة', 'cost_centers', 8),
  ('branch', 'Branch', 'فرع', 'branches', 9)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. Update existing accounts with proper defaults
-- =====================================================

-- Set account_behavior based on is_group and is_control_account
UPDATE accounts SET 
  account_behavior = CASE 
    WHEN is_group = TRUE AND level = 1 THEN 'HEADER'
    WHEN is_group = TRUE AND level = 2 THEN 'GROUP'
    WHEN is_control_account = TRUE THEN 'CONTROL'
    WHEN control_type IS NOT NULL THEN 'ANALYTICAL'
    ELSE 'DETAIL'
  END,
  level_type = CASE 
    WHEN level = 1 THEN 'header'
    WHEN level = 2 THEN 'group'
    WHEN is_control_account = TRUE THEN 'control'
    WHEN control_type IS NOT NULL THEN 'analytical'
    ELSE 'detail'
  END,
  linked_entity_type = control_type,
  normal_balance = CASE 
    WHEN account_type_id IN (SELECT id FROM account_types WHERE nature = 'debit') THEN 'debit'
    ELSE 'credit'
  END
WHERE deleted_at IS NULL;

-- =====================================================
-- 6. Create view for account tree with calculated fields
-- =====================================================
CREATE OR REPLACE VIEW v_accounts_tree AS
SELECT 
  a.id,
  a.company_id,
  a.code,
  a.name,
  a.name_ar,
  a.description,
  a.parent_id,
  p.code AS parent_code,
  p.name AS parent_name,
  a.account_type_id,
  at.name AS account_type_name,
  at.name_ar AS account_type_name_ar,
  at.classification,
  at.nature,
  a.level,
  a.account_behavior,
  ab.name AS behavior_name,
  ab.name_ar AS behavior_name_ar,
  ab.allow_posting AS behavior_allow_posting,
  a.level_type,
  a.linked_entity_type,
  let.name AS linked_entity_type_name,
  let.name_ar AS linked_entity_type_name_ar,
  a.linked_entity_id,
  a.is_group,
  a.is_active,
  a.is_system,
  a.is_frozen,
  a.allow_posting,
  a.normal_balance,
  a.currency_id,
  c.code AS currency_code,
  c.symbol AS currency_symbol,
  a.opening_balance,
  a.current_balance,
  a.opening_balance_foreign,
  a.current_balance_foreign,
  a.cost_center_required,
  a.project_required,
  a.display_order,
  a.budget_amount,
  a.last_transaction_date,
  a.notes,
  a.created_at,
  a.updated_at,
  -- Count children
  (SELECT COUNT(*) FROM accounts c WHERE c.parent_id = a.id AND c.deleted_at IS NULL) AS children_count,
  -- Can delete (no children and not system)
  CASE 
    WHEN a.is_system = TRUE THEN FALSE
    WHEN (SELECT COUNT(*) FROM accounts c WHERE c.parent_id = a.id AND c.deleted_at IS NULL) > 0 THEN FALSE
    WHEN (SELECT COUNT(*) FROM journal_entry_lines jel WHERE jel.account_id = a.id) > 0 THEN FALSE
    ELSE TRUE
  END AS can_delete,
  -- Full path
  (
    WITH RECURSIVE path AS (
      SELECT id, code, name, parent_id, 1 as depth
      FROM accounts
      WHERE id = a.id
      UNION ALL
      SELECT ap.id, ap.code, ap.name, ap.parent_id, p.depth + 1
      FROM accounts ap
      JOIN path p ON ap.id = p.parent_id
    )
    SELECT STRING_AGG(code, ' > ' ORDER BY depth DESC)
    FROM path
  ) AS full_path
FROM accounts a
LEFT JOIN accounts p ON a.parent_id = p.id
LEFT JOIN account_types at ON a.account_type_id = at.id
LEFT JOIN account_behaviors ab ON a.account_behavior = ab.code
LEFT JOIN linked_entity_types let ON a.linked_entity_type = let.code
LEFT JOIN currencies c ON a.currency_id = c.id
WHERE a.deleted_at IS NULL;

-- =====================================================
-- 7. Create indexes for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_accounts_behavior ON accounts(account_behavior);
CREATE INDEX IF NOT EXISTS idx_accounts_level_type ON accounts(level_type);
CREATE INDEX IF NOT EXISTS idx_accounts_linked_entity ON accounts(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_accounts_frozen ON accounts(is_frozen);
CREATE INDEX IF NOT EXISTS idx_accounts_display_order ON accounts(parent_id, display_order);

-- =====================================================
-- 8. Add comments
-- =====================================================
COMMENT ON COLUMN accounts.account_behavior IS 'Account behavior: HEADER, GROUP, CONTROL, DETAIL, ANALYTICAL, SYSTEM, SUSPENSE, CLEARING';
COMMENT ON COLUMN accounts.level_type IS 'Account level type: header, group, control, detail, analytical';
COMMENT ON COLUMN accounts.linked_entity_type IS 'Type of linked entity: customer, vendor, employee, bank, project, asset, shipment';
COMMENT ON COLUMN accounts.linked_entity_id IS 'ID of linked entity in the corresponding table';
COMMENT ON COLUMN accounts.is_frozen IS 'If true, no new postings are allowed to this account';
COMMENT ON COLUMN accounts.normal_balance IS 'Normal balance side: debit or credit';
COMMENT ON TABLE account_behaviors IS 'Lookup table for account behaviors/roles';
COMMENT ON TABLE account_level_types IS 'Lookup table for account hierarchy levels';
COMMENT ON TABLE linked_entity_types IS 'Lookup table for entity types that can be linked to accounts';
