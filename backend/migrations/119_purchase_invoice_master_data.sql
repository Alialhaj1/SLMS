-- =============================================
-- PURCHASE INVOICE MASTER DATA TABLES
-- Migration 119: Enterprise-Grade Invoice Infrastructure
-- Date: 2026-01-10
-- Purpose: Create all master data tables required for professional purchase invoice processing
-- =============================================

-- =============================================
-- 1. INVOICE TYPES (أنواع الفواتير)
-- Business Purpose: Define invoice behavior (local/import/service/expense)
-- Effect: Controls inventory impact, customs, tax treatment
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Business Rules
    affects_inventory BOOLEAN DEFAULT TRUE,        -- Stock items trigger inventory transactions
    requires_customs BOOLEAN DEFAULT FALSE,        -- Import invoices require customs data
    requires_goods_receipt BOOLEAN DEFAULT TRUE,   -- Must match to GRN (3-way matching)
    allows_services BOOLEAN DEFAULT FALSE,         -- Can include service lines
    requires_warehouse BOOLEAN DEFAULT TRUE,       -- Warehouse selection mandatory
    
    -- Accounting Impact
    default_expense_account_id INTEGER REFERENCES accounts(id),  -- Dr: Expense/Inventory
    default_payable_account_id INTEGER REFERENCES accounts(id),  -- Cr: Vendor Payable
    default_tax_input_account_id INTEGER REFERENCES accounts(id), -- Dr: VAT Input
    default_customs_account_id INTEGER REFERENCES accounts(id),   -- Dr: Customs Duty
    
    -- Workflow
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_workflow_code VARCHAR(50),
    
    -- Display
    color VARCHAR(20) DEFAULT 'blue',
    icon VARCHAR(50) DEFAULT 'document',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- Seed default invoice types
INSERT INTO invoice_types (company_id, code, name, name_ar, affects_inventory, requires_customs, requires_warehouse, description, description_ar, is_default)
VALUES
(1, 'LOCAL', 'Local Purchase', 'شراء محلي', TRUE, FALSE, TRUE, 'Standard local purchase invoice', 'فاتورة شراء محلية', TRUE),
(1, 'IMPORT', 'Import Purchase', 'استيراد', TRUE, TRUE, TRUE, 'Import invoice with customs', 'فاتورة استيراد مع جمارك', FALSE),
(1, 'SERVICE', 'Service Invoice', 'فاتورة خدمة', FALSE, FALSE, FALSE, 'Services without inventory impact', 'خدمات بدون تأثير مخزني', FALSE),
(1, 'EXPENSE', 'Expense Invoice', 'فاتورة مصروف', FALSE, FALSE, FALSE, 'Direct expense without stock', 'مصروف مباشر', FALSE)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 2. EXPENSE TYPES (أنواع المصاريف)
-- Business Purpose: Classify additional costs (freight, customs, insurance)
-- Effect: Affects landed cost calculation and distribution
-- =============================================
CREATE TABLE IF NOT EXISTS expense_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Distribution Rules
    distribution_base VARCHAR(20) DEFAULT 'value', -- 'quantity', 'value', 'weight', 'volume', 'manual'
    affects_landed_cost BOOLEAN DEFAULT TRUE,      -- Adds to item cost
    is_taxable BOOLEAN DEFAULT FALSE,              -- Subject to VAT
    
    -- Accounting
    default_account_id INTEGER REFERENCES accounts(id), -- Dr: Customs/Freight Expense
    
    -- Display
    category VARCHAR(50) DEFAULT 'logistics',      -- 'logistics', 'customs', 'insurance', 'other'
    color VARCHAR(20) DEFAULT 'orange',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- Seed default expense types
INSERT INTO expense_types (company_id, code, name, name_ar, distribution_base, affects_landed_cost, category, description, description_ar)
VALUES
(1, 'FREIGHT', 'Freight Charges', 'رسوم الشحن', 'weight', TRUE, 'logistics', 'Shipping and freight costs', 'تكاليف الشحن والنقل'),
(1, 'CUSTOMS', 'Customs Duty', 'الرسوم الجمركية', 'value', TRUE, 'customs', 'Import customs and duties', 'الرسوم الجمركية'),
(1, 'INSURANCE', 'Insurance', 'التأمين', 'value', TRUE, 'insurance', 'Cargo insurance', 'تأمين البضاعة'),
(1, 'HANDLING', 'Handling Charges', 'رسوم المناولة', 'quantity', TRUE, 'logistics', 'Loading/unloading fees', 'رسوم التحميل والتفريغ'),
(1, 'CLEARING', 'Clearing Fees', 'رسوم التخليص', 'value', TRUE, 'customs', 'Customs clearing agent fees', 'رسوم وكيل التخليص'),
(1, 'STORAGE', 'Storage Fees', 'رسوم التخزين', 'volume', TRUE, 'logistics', 'Warehouse storage fees', 'رسوم التخزين')
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 3. PURCHASE INVOICE EXPENSES (مصاريف الفواتير)
-- Business Purpose: Track landed costs and their distribution
-- Effect: Increases unit cost of items
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_invoice_expenses (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    expense_type_id INTEGER NOT NULL REFERENCES expense_types(id),
    
    -- Amount
    amount DECIMAL(18, 4) NOT NULL,
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18, 6) DEFAULT 1.0,
    base_amount DECIMAL(18, 4), -- Amount in base currency
    
    -- Distribution
    distribution_base VARCHAR(20) DEFAULT 'value', -- 'quantity', 'value', 'weight', 'volume', 'manual'
    is_distributed BOOLEAN DEFAULT FALSE,
    distributed_at TIMESTAMP,
    distributed_by INTEGER REFERENCES users(id),
    
    -- Accounting
    account_id INTEGER REFERENCES accounts(id),
    
    -- Reference
    reference_number VARCHAR(100),
    vendor_id INTEGER REFERENCES vendors(id), -- If paid to different vendor
    payment_date DATE,
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. PURCHASE INVOICE EXPENSE ALLOCATIONS (توزيع المصاريف)
-- Business Purpose: Track how expenses are allocated to items
-- Effect: Precise landed cost per item
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_invoice_expense_allocations (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES purchase_invoice_expenses(id) ON DELETE CASCADE,
    invoice_item_id INTEGER NOT NULL REFERENCES purchase_invoice_items(id) ON DELETE CASCADE,
    
    -- Allocation
    allocation_basis_value DECIMAL(18, 4), -- Weight, quantity, value used for allocation
    allocation_percentage DECIMAL(8, 4),   -- % of expense allocated to this item
    allocated_amount DECIMAL(18, 4),       -- Actual amount allocated
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. ALTER PURCHASE_INVOICES - Add Missing Fields
-- =============================================
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS invoice_type_id INTEGER REFERENCES invoice_types(id);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS posting_date DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 6) DEFAULT 1.0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(8, 4) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS withholding_tax_amount DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS expected_payment_date DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(100);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cheque_date DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cash_box_id INTEGER REFERENCES cash_boxes(id);

-- Add approval columns if not exist (from migration 118)
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'not_required';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approval_request_id INTEGER REFERENCES approval_requests(id);

-- =============================================
-- 6. ALTER PURCHASE_INVOICE_ITEMS - Add Missing Fields
-- =============================================
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'stock'; -- 'stock', 'service', 'expense'
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS bonus_quantity DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS allocated_expenses DECIMAL(18, 4) DEFAULT 0; -- Total expenses allocated to this item
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS landed_cost_per_unit DECIMAL(18, 6); -- Final cost including expenses

-- =============================================
-- 7. INDEXES for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoice_types_company ON invoice_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_types_company ON expense_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_expenses_invoice ON purchase_invoice_expenses(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_expenses_type ON purchase_invoice_expenses(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_expense_allocations_expense ON purchase_invoice_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_expense_allocations_item ON purchase_invoice_expense_allocations(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_type ON purchase_invoices(invoice_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_approval ON purchase_invoices(approval_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_posting_date ON purchase_invoices(posting_date) WHERE deleted_at IS NULL;

-- =============================================
-- 8. COMMENTS for Documentation
-- =============================================
COMMENT ON TABLE invoice_types IS 'Defines behavior of purchase invoices (local/import/service/expense)';
COMMENT ON TABLE expense_types IS 'Classifies additional costs affecting landed cost (freight/customs/insurance)';
COMMENT ON TABLE purchase_invoice_expenses IS 'Tracks additional costs per invoice';
COMMENT ON TABLE purchase_invoice_expense_allocations IS 'Distributes expenses to items for landed cost calculation';

COMMENT ON COLUMN invoice_types.affects_inventory IS 'If true, items create inventory transactions';
COMMENT ON COLUMN invoice_types.requires_customs IS 'If true, requires customs declaration';
COMMENT ON COLUMN invoice_types.requires_goods_receipt IS 'If true, must match to GRN (3-way matching)';
COMMENT ON COLUMN expense_types.distribution_base IS 'How to distribute: quantity/value/weight/volume/manual';
COMMENT ON COLUMN expense_types.affects_landed_cost IS 'If true, adds to item unit cost';
COMMENT ON COLUMN purchase_invoice_items.landed_cost_per_unit IS 'Final cost = unit_price + (allocated_expenses / quantity)';

-- =============================================
-- END OF MIGRATION 119
-- =============================================
