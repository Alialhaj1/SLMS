-- =====================================================
-- MIGRATION 188: Shipment Expenses Journal Integration
-- =====================================================
-- Adds journal entry creation for shipment expenses
-- Links expenses to Chart of Accounts
-- =====================================================

-- =====================================================
-- 1. ADD ACCOUNTING RULE TRIGGERS FOR SHIPMENT EXPENSES
-- =====================================================
INSERT INTO accounting_rule_triggers (code, name, name_ar, entity_type, description, available_fields)
VALUES 
    ('shipment_expense_created', 'Shipment Expense Created', 'إضافة مصروف شحنة', 'shipment_expense',
     'Triggered when a shipment expense is created',
     '{"amount_before_vat": "number", "vat_amount": "number", "total_amount": "number", "expense_type_code": "string", "account_id": "number", "shipment_id": "number", "project_id": "number", "currency_code": "string"}'::jsonb),
    ('shipment_expense_approved', 'Shipment Expense Approved', 'اعتماد مصروف شحنة', 'shipment_expense',
     'Triggered when a shipment expense is approved',
     '{"amount_before_vat": "number", "vat_amount": "number", "total_amount": "number", "expense_type_code": "string", "account_id": "number", "shipment_id": "number", "project_id": "number"}'::jsonb),
    ('shipment_expense_posted', 'Shipment Expense Posted', 'ترحيل مصروف شحنة', 'shipment_expense',
     'Triggered when a shipment expense is posted to accounting',
     '{"amount_before_vat": "number", "vat_amount": "number", "total_amount": "number", "expense_type_code": "string", "account_id": "number", "shipment_id": "number", "project_id": "number"}'::jsonb),
    ('shipment_expense_deleted', 'Shipment Expense Deleted', 'حذف مصروف شحنة', 'shipment_expense',
     'Triggered when a shipment expense is deleted (reversal)',
     '{"amount_before_vat": "number", "vat_amount": "number", "total_amount": "number", "expense_type_code": "string", "account_id": "number"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. ADD JOURNAL_ENTRY_ID TO SHIPMENT_EXPENSES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' AND column_name = 'journal_entry_id'
    ) THEN
        ALTER TABLE shipment_expenses ADD COLUMN journal_entry_id INT REFERENCES journal_entries(id);
        COMMENT ON COLUMN shipment_expenses.journal_entry_id IS 'Link to accounting journal entry';
    END IF;
END $$;

-- Add reversal tracking columns if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' AND column_name = 'reversal_reason'
    ) THEN
        ALTER TABLE shipment_expenses ADD COLUMN reversal_reason TEXT;
        COMMENT ON COLUMN shipment_expenses.reversal_reason IS 'Reason for reversing the journal entry';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' AND column_name = 'reversed_at'
    ) THEN
        ALTER TABLE shipment_expenses ADD COLUMN reversed_at TIMESTAMPTZ;
        COMMENT ON COLUMN shipment_expenses.reversed_at IS 'When the journal entry was reversed';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' AND column_name = 'reversed_by'
    ) THEN
        ALTER TABLE shipment_expenses ADD COLUMN reversed_by INT REFERENCES users(id);
        COMMENT ON COLUMN shipment_expenses.reversed_by IS 'User who reversed the journal entry';
    END IF;
END $$;

-- =====================================================
-- 3. ADD SHIPMENT_EXPENSE_ID TO JOURNAL_LINES (for traceability)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_lines' AND column_name = 'shipment_expense_id'
    ) THEN
        ALTER TABLE journal_lines ADD COLUMN shipment_expense_id INT REFERENCES shipment_expenses(id);
        COMMENT ON COLUMN journal_lines.shipment_expense_id IS 'Link to source shipment expense';
    END IF;
END $$;

-- =====================================================
-- 3B. ADD REVERSAL COLUMNS TO JOURNAL_ENTRIES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'is_reversed'
    ) THEN
        ALTER TABLE journal_entries ADD COLUMN is_reversed BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN journal_entries.is_reversed IS 'Whether this entry has been reversed';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'reversed_by'
    ) THEN
        ALTER TABLE journal_entries ADD COLUMN reversed_by INT REFERENCES journal_entries(id);
        COMMENT ON COLUMN journal_entries.reversed_by IS 'The reversal journal entry ID';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'reversed_at'
    ) THEN
        ALTER TABLE journal_entries ADD COLUMN reversed_at TIMESTAMPTZ;
        COMMENT ON COLUMN journal_entries.reversed_at IS 'When this entry was reversed';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'reversal_of'
    ) THEN
        ALTER TABLE journal_entries ADD COLUMN reversal_of INT REFERENCES journal_entries(id);
        COMMENT ON COLUMN journal_entries.reversal_of IS 'The original entry this reverses';
    END IF;
END $$;

-- =====================================================
-- 4. CREATE DEFAULT ACCOUNTING RULES FOR SHIPMENT EXPENSES
-- =====================================================
-- Rule: When expense is posted, create journal entry
-- Debit: Expense Account (from expense type)
-- Credit: Accounts Payable / Cash (based on payment method)

INSERT INTO accounting_rules (
    company_id, code, name, name_ar, description,
    trigger_code, is_active, priority, auto_post, stop_on_match
)
SELECT 
    c.id,
    'SHIPMENT_EXPENSE_POSTED_DEFAULT',
    'Default Shipment Expense Posting',
    'ترحيل مصروف شحنة - افتراضي',
    'Creates journal entry when shipment expense is posted. Debit: Expense Account, Credit: Accounts Payable',
    'shipment_expense_posted',
    true,
    10,
    true,  -- Auto post
    true   -- Stop on match
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. ADD PERMISSIONS FOR SHIPMENT EXPENSE ACCOUNTING
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('shipment_expenses:post', 'shipment_expenses', 'post', 'Post shipment expenses to accounting'),
    ('shipment_expenses:reverse', 'shipment_expenses', 'reverse', 'Reverse shipment expense journal entries')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.permission_code IN ('shipment_expenses:post', 'shipment_expenses:reverse')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CREATE INDEX FOR JOURNAL LOOKUP
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_journal ON shipment_expenses(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_shipment_expense ON journal_lines(shipment_expense_id);

-- =====================================================
-- 7. CREATE VIEW FOR EXPENSE ACCOUNT BALANCES
-- =====================================================
CREATE OR REPLACE VIEW v_expense_account_balances AS
SELECT 
    a.id as account_id,
    a.code as account_code,
    a.name as account_name,
    a.name_ar as account_name_ar,
    a.company_id,
    COALESCE(SUM(jl.debit_amount), 0) as total_debit,
    COALESCE(SUM(jl.credit_amount), 0) as total_credit,
    COALESCE(SUM(jl.debit_amount), 0) - COALESCE(SUM(jl.credit_amount), 0) as balance,
    COUNT(DISTINCT se.id) as expense_count
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN shipment_expenses se ON se.account_id = a.id AND se.deleted_at IS NULL
WHERE a.parent_id IN (
    SELECT id FROM accounts WHERE code = '1151010003'
)
AND a.deleted_at IS NULL
GROUP BY a.id, a.code, a.name, a.name_ar, a.company_id;

COMMENT ON VIEW v_expense_account_balances IS 'Shows balances for shipment expense accounts from Chart of Accounts';

-- =====================================================
-- 8. ADD HELPER FUNCTION FOR EXPENSE POSTING
-- =====================================================
CREATE OR REPLACE FUNCTION post_shipment_expense_to_journal(
    p_expense_id INT,
    p_user_id INT
) RETURNS INT AS $$
DECLARE
    v_expense RECORD;
    v_journal_id INT;
    v_entry_number VARCHAR(50);
    v_payable_account_id INT;
BEGIN
    -- Get expense details
    SELECT 
        se.*, 
        et.analytic_account_code,
        ls.shipment_number,
        p.code as project_code
    INTO v_expense
    FROM shipment_expenses se
    JOIN shipment_expense_types et ON se.expense_type_id = et.id
    JOIN logistics_shipments ls ON se.shipment_id = ls.id
    LEFT JOIN projects p ON ls.project_id = p.id
    WHERE se.id = p_expense_id AND se.deleted_at IS NULL;
    
    IF v_expense IS NULL THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;
    
    IF v_expense.journal_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'Expense already posted';
    END IF;
    
    -- Get Accounts Payable account (2111010001 is default)
    SELECT id INTO v_payable_account_id
    FROM accounts
    WHERE code = '2111010001' AND company_id = v_expense.company_id;
    
    -- Generate entry number
    SELECT 'JE-EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '\d+$') AS INT)), 0) + 1)::TEXT, 4, '0')
    INTO v_entry_number
    FROM journal_entries
    WHERE company_id = v_expense.company_id
      AND entry_number LIKE 'JE-EXP-%';
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_number, entry_date, 
        description, description_ar,
        source_type, source_id,
        status, created_by
    ) VALUES (
        v_expense.company_id,
        v_entry_number,
        v_expense.expense_date,
        'Shipment Expense: ' || v_expense.expense_type_name || ' - Shipment ' || v_expense.shipment_number,
        'مصروف شحنة: ' || COALESCE(v_expense.description, v_expense.expense_type_name) || ' - شحنة ' || v_expense.shipment_number,
        'shipment_expense',
        p_expense_id,
        'posted',
        p_user_id
    ) RETURNING id INTO v_journal_id;
    
    -- Debit: Expense Account
    INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        debit_amount, credit_amount, description,
        cost_center_id, shipment_expense_id
    ) VALUES (
        v_journal_id, 1, v_expense.account_id,
        v_expense.amount_before_vat, 0,
        v_expense.description,
        v_expense.cost_center_id,
        p_expense_id
    );
    
    -- Debit: VAT Input (if applicable)
    IF v_expense.vat_amount > 0 THEN
        INSERT INTO journal_lines (
            journal_entry_id, line_number, account_id,
            debit_amount, credit_amount, description,
            shipment_expense_id
        ) 
        SELECT 
            v_journal_id, 2, a.id,
            v_expense.vat_amount, 0,
            'VAT on ' || v_expense.expense_type_name,
            p_expense_id
        FROM accounts a
        WHERE a.code = '1141010001' AND a.company_id = v_expense.company_id;  -- VAT Input account
    END IF;
    
    -- Credit: Accounts Payable (or Cash)
    INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        debit_amount, credit_amount, description,
        shipment_expense_id
    ) VALUES (
        v_journal_id, 
        CASE WHEN v_expense.vat_amount > 0 THEN 3 ELSE 2 END,
        v_payable_account_id,
        0, v_expense.total_amount,
        'Payable for ' || v_expense.expense_type_name,
        p_expense_id
    );
    
    -- Update expense with journal reference
    UPDATE shipment_expenses 
    SET journal_entry_id = v_journal_id,
        is_posted = true,
        posted_at = NOW(),
        posted_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_expense_id;
    
    RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION post_shipment_expense_to_journal IS 'Posts a shipment expense to journal entries (Debit Expense, Credit AP)';

-- =====================================================
-- END MIGRATION 188
-- =====================================================
