-- =============================================
-- Migration: 182_accounting_rules_engine.sql
-- Description: Accounting Rules Engine for automatic journal entries
-- Created: 2026-01-20
-- =============================================

-- =============================================
-- 1. Accounting Rule Triggers (الأحداث المحفزة)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_rule_triggers (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    entity_type VARCHAR(50) NOT NULL, -- expense_request, payment_request, shipment, purchase_invoice, etc.
    available_fields JSONB, -- الحقول المتاحة من هذا الكيان
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

-- Seed trigger events
INSERT INTO accounting_rule_triggers (code, name, name_ar, entity_type, available_fields, display_order) VALUES
-- Expense Requests
('expense_request_approved', 'Expense Request Approved', 'اعتماد طلب مصروف', 'expense_request', 
 '{"fields": ["amount", "expense_type_id", "vendor_id", "project_id", "shipment_id", "cost_center_id", "currency_id"]}', 10),
('expense_request_paid', 'Expense Request Paid', 'دفع طلب مصروف', 'expense_request',
 '{"fields": ["amount", "expense_type_id", "vendor_id", "project_id", "shipment_id", "bank_account_id", "payment_method"]}', 11),

-- Payment Requests  
('payment_request_approved', 'Payment Request Approved', 'اعتماد طلب تحويل', 'payment_request',
 '{"fields": ["amount", "vendor_id", "project_id", "bank_account_id"]}', 20),
('payment_request_paid', 'Payment Request Paid', 'دفع طلب تحويل', 'payment_request',
 '{"fields": ["amount", "vendor_id", "bank_account_id", "payment_method"]}', 21),

-- Shipments
('shipment_created', 'Shipment Created', 'إنشاء شحنة', 'shipment',
 '{"fields": ["customer_id", "project_id", "origin_port_id", "destination_port_id"]}', 30),
('shipment_delivered', 'Shipment Delivered', 'تسليم شحنة', 'shipment',
 '{"fields": ["customer_id", "project_id", "total_cost", "total_revenue"]}', 31),
('shipment_invoiced', 'Shipment Invoiced', 'فوترة شحنة', 'shipment',
 '{"fields": ["customer_id", "project_id", "invoice_amount"]}', 32),

-- Purchase Invoices
('purchase_invoice_posted', 'Purchase Invoice Posted', 'ترحيل فاتورة شراء', 'purchase_invoice',
 '{"fields": ["total_amount", "tax_amount", "vendor_id", "project_id", "shipment_id"]}', 40),
('purchase_invoice_paid', 'Purchase Invoice Paid', 'دفع فاتورة شراء', 'purchase_invoice',
 '{"fields": ["paid_amount", "vendor_id", "bank_account_id"]}', 41),

-- Sales Invoices
('sales_invoice_posted', 'Sales Invoice Posted', 'ترحيل فاتورة مبيعات', 'sales_invoice',
 '{"fields": ["total_amount", "tax_amount", "customer_id", "project_id", "shipment_id"]}', 50),
('sales_invoice_collected', 'Sales Invoice Collected', 'تحصيل فاتورة مبيعات', 'sales_invoice',
 '{"fields": ["collected_amount", "customer_id", "bank_account_id"]}', 51),

-- Receipts
('receipt_created', 'Receipt Created', 'إنشاء سند قبض', 'receipt',
 '{"fields": ["amount", "customer_id", "bank_account_id", "project_id"]}', 60),

-- Payments
('payment_created', 'Payment Voucher Created', 'إنشاء سند صرف', 'payment_voucher',
 '{"fields": ["amount", "vendor_id", "bank_account_id", "project_id"]}', 70),

-- Journal Manual
('journal_manual', 'Manual Journal Entry', 'قيد يدوي', 'journal_entry',
 '{"fields": ["description", "reference"]}', 100)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    entity_type = EXCLUDED.entity_type,
    available_fields = EXCLUDED.available_fields,
    display_order = EXCLUDED.display_order;

-- =============================================
-- 2. Accounting Rules (القواعد المحاسبية)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_rules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    description TEXT,
    trigger_code VARCHAR(50) NOT NULL REFERENCES accounting_rule_triggers(code),
    
    -- Rule settings
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System rules cannot be deleted
    priority INT DEFAULT 100, -- Lower = higher priority
    stop_on_match BOOLEAN DEFAULT TRUE, -- Stop processing other rules if this matches
    
    -- Auto-posting settings
    auto_post BOOLEAN DEFAULT FALSE, -- Auto-post journal or keep as draft
    require_approval BOOLEAN DEFAULT TRUE, -- Require approval before posting
    
    -- Metadata
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

CREATE INDEX idx_accounting_rules_company ON accounting_rules(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_rules_trigger ON accounting_rules(trigger_code) WHERE deleted_at IS NULL AND is_active = TRUE;

-- =============================================
-- 3. Rule Conditions (شروط القاعدة)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_rule_conditions (
    id SERIAL PRIMARY KEY,
    rule_id INT NOT NULL REFERENCES accounting_rules(id) ON DELETE CASCADE,
    
    -- Condition definition
    field_name VARCHAR(50) NOT NULL, -- expense_type_id, vendor_id, amount, shipment_id...
    operator VARCHAR(20) NOT NULL, -- =, !=, >, <, >=, <=, IN, NOT_IN, IS_NULL, IS_NOT_NULL, LIKE, BETWEEN
    field_value TEXT, -- Value or JSON array for IN operator
    field_value_2 TEXT, -- Second value for BETWEEN operator
    
    -- Logical grouping
    condition_group INT DEFAULT 1, -- Group conditions (AND within group, OR between groups)
    sequence INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rule_conditions_rule ON accounting_rule_conditions(rule_id);

-- =============================================
-- 4. Rule Lines (بنود القيد)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_rule_lines (
    id SERIAL PRIMARY KEY,
    rule_id INT NOT NULL REFERENCES accounting_rules(id) ON DELETE CASCADE,
    
    -- Line type
    line_type VARCHAR(10) NOT NULL CHECK (line_type IN ('debit', 'credit')),
    sequence INT DEFAULT 0,
    
    -- Account source
    account_source VARCHAR(30) NOT NULL DEFAULT 'fixed',
    -- fixed: Use account_id directly
    -- from_expense_type: Get from expense_types.expense_account_id
    -- from_vendor: Get from vendors.payable_account_id  
    -- from_customer: Get from customers.receivable_account_id
    -- from_bank: Get from bank_accounts.gl_account_id
    -- from_entity_field: Get from source entity field
    
    account_id INT REFERENCES accounts(id), -- Used when account_source = 'fixed'
    account_field VARCHAR(50), -- Field name when account_source = 'from_entity_field'
    fallback_account_id INT REFERENCES accounts(id), -- Fallback if source account not found
    
    -- Amount calculation
    amount_source VARCHAR(30) NOT NULL DEFAULT 'full_amount',
    -- full_amount: Use full transaction amount
    -- percentage: Use percentage of amount
    -- fixed: Use fixed amount
    -- field: Get from entity field
    
    amount_value DECIMAL(15,4), -- Percentage (0-100) or fixed amount
    amount_field VARCHAR(50), -- Field name when amount_source = 'field'
    
    -- Cost center / Project / Shipment assignment
    cost_center_source VARCHAR(30) DEFAULT 'from_entity', -- from_entity, fixed, none
    cost_center_id INT REFERENCES cost_centers(id),
    
    project_source VARCHAR(30) DEFAULT 'from_entity',
    project_id INT REFERENCES projects(id),
    
    shipment_source VARCHAR(30) DEFAULT 'from_entity',
    shipment_id INT,
    
    -- Description template (supports placeholders like {vendor_name}, {expense_type}, {shipment_number})
    description_template TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rule_lines_rule ON accounting_rule_lines(rule_id);

-- =============================================
-- 5. Auto Posting Log (سجل الترحيل التلقائي)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_auto_postings (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    
    -- Rule reference
    rule_id INT REFERENCES accounting_rules(id),
    rule_code VARCHAR(50),
    trigger_code VARCHAR(50) NOT NULL,
    
    -- Source entity
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id INT NOT NULL,
    source_entity_number VARCHAR(50), -- For display (e.g., EXP-2024-001)
    
    -- Generated journal
    journal_entry_id INT REFERENCES journal_entries(id),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending: Waiting to be processed
    -- preview: Preview generated, awaiting confirmation
    -- posted: Successfully posted
    -- failed: Failed to post
    -- skipped: Skipped (no matching rule or condition not met)
    -- reversed: Journal was reversed
    
    error_message TEXT,
    preview_data JSONB, -- Store preview of journal lines before posting
    
    -- Timestamps
    processed_at TIMESTAMP,
    posted_at TIMESTAMP,
    posted_by INT REFERENCES users(id),
    reversed_at TIMESTAMP,
    reversed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate postings
    UNIQUE(source_entity_type, source_entity_id, trigger_code)
);

CREATE INDEX idx_auto_postings_company ON accounting_auto_postings(company_id);
CREATE INDEX idx_auto_postings_source ON accounting_auto_postings(source_entity_type, source_entity_id);
CREATE INDEX idx_auto_postings_status ON accounting_auto_postings(status) WHERE status IN ('pending', 'preview');
CREATE INDEX idx_auto_postings_journal ON accounting_auto_postings(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- =============================================
-- 6. Add accounting fields to existing tables
-- =============================================

-- Add to expense_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_requests' AND column_name = 'accounting_status') THEN
        ALTER TABLE expense_requests ADD COLUMN accounting_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_requests' AND column_name = 'journal_entry_id') THEN
        ALTER TABLE expense_requests ADD COLUMN journal_entry_id INT REFERENCES journal_entries(id);
    END IF;
END $$;

-- Add to payment_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'accounting_status') THEN
        ALTER TABLE payment_requests ADD COLUMN accounting_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'journal_entry_id') THEN
        ALTER TABLE payment_requests ADD COLUMN journal_entry_id INT REFERENCES journal_entries(id);
    END IF;
END $$;

-- Add to shipments if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'accounting_status') THEN
        ALTER TABLE shipments ADD COLUMN accounting_status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- =============================================
-- 7. Expense Types - Add default accounts
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_types' AND column_name = 'expense_account_id') THEN
        ALTER TABLE expense_types ADD COLUMN expense_account_id INT REFERENCES accounts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_types' AND column_name = 'payable_account_id') THEN
        ALTER TABLE expense_types ADD COLUMN payable_account_id INT REFERENCES accounts(id);
    END IF;
END $$;

-- =============================================
-- 8. Vendors - Add default accounts
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'payable_account_id') THEN
        ALTER TABLE vendors ADD COLUMN payable_account_id INT REFERENCES accounts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'advance_account_id') THEN
        ALTER TABLE vendors ADD COLUMN advance_account_id INT REFERENCES accounts(id);
    END IF;
END $$;

-- =============================================
-- 9. Customers - Add default accounts (if table exists)
-- =============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'receivable_account_id') THEN
            ALTER TABLE customers ADD COLUMN receivable_account_id INT REFERENCES accounts(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'advance_account_id') THEN
            ALTER TABLE customers ADD COLUMN advance_account_id INT REFERENCES accounts(id);
        END IF;
    END IF;
END $$;

-- =============================================
-- 10. Bank Accounts - Add GL account
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'gl_account_id') THEN
        ALTER TABLE bank_accounts ADD COLUMN gl_account_id INT REFERENCES accounts(id);
    END IF;
END $$;

-- =============================================
-- 11. View: Active Rules with Details
-- =============================================
CREATE OR REPLACE VIEW v_accounting_rules_active AS
SELECT 
    r.id,
    r.company_id,
    r.code,
    r.name,
    r.name_ar,
    r.trigger_code,
    t.name as trigger_name,
    t.name_ar as trigger_name_ar,
    t.entity_type,
    r.priority,
    r.auto_post,
    r.require_approval,
    r.is_system,
    (SELECT COUNT(*) FROM accounting_rule_conditions WHERE rule_id = r.id) as conditions_count,
    (SELECT COUNT(*) FROM accounting_rule_lines WHERE rule_id = r.id) as lines_count,
    (SELECT COUNT(*) FROM accounting_auto_postings WHERE rule_id = r.id AND status = 'posted') as postings_count
FROM accounting_rules r
JOIN accounting_rule_triggers t ON t.code = r.trigger_code
WHERE r.deleted_at IS NULL AND r.is_active = TRUE
ORDER BY r.priority, r.name;

-- =============================================
-- 12. Sample Default Rules (for new companies)
-- =============================================
-- These will be created via API when company is created or via seeding

COMMENT ON TABLE accounting_rules IS 'Accounting rules for automatic journal entry generation';
COMMENT ON TABLE accounting_rule_conditions IS 'Conditions that must be met for a rule to apply';
COMMENT ON TABLE accounting_rule_lines IS 'Journal entry lines to be created when rule applies';
COMMENT ON TABLE accounting_auto_postings IS 'Log of all automatic postings with status tracking';
