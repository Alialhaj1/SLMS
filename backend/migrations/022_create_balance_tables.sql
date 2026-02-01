-- Migration: 022_create_balance_tables.sql
-- Description: Balance tables for high-performance reporting (no SUM on transactions)
-- Date: 2025-12-22

-- =====================================================
-- PART 1: ACCOUNT BALANCES (General Ledger)
-- =====================================================

CREATE TABLE IF NOT EXISTS account_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    period_id INTEGER REFERENCES accounting_periods(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    -- Opening Balance (start of period)
    opening_debit DECIMAL(18, 4) DEFAULT 0,
    opening_credit DECIMAL(18, 4) DEFAULT 0,
    
    -- Period Movement
    period_debit DECIMAL(18, 4) DEFAULT 0,
    period_credit DECIMAL(18, 4) DEFAULT 0,
    
    -- Closing Balance (calculated)
    closing_debit DECIMAL(18, 4) GENERATED ALWAYS AS (opening_debit + period_debit) STORED,
    closing_credit DECIMAL(18, 4) GENERATED ALWAYS AS (opening_credit + period_credit) STORED,
    
    -- Net Balance
    balance DECIMAL(18, 4) GENERATED ALWAYS AS (
        (opening_debit + period_debit) - (opening_credit + period_credit)
    ) STORED,
    
    -- Foreign Currency (if different from company currency)
    fc_opening_debit DECIMAL(18, 4) DEFAULT 0,
    fc_opening_credit DECIMAL(18, 4) DEFAULT 0,
    fc_period_debit DECIMAL(18, 4) DEFAULT 0,
    fc_period_credit DECIMAL(18, 4) DEFAULT 0,
    
    -- Metadata
    last_transaction_date DATE,
    transaction_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique per account/period/dimension combination
    UNIQUE (company_id, account_id, fiscal_year_id, period_id, currency_id, cost_center_id, branch_id)
);

-- =====================================================
-- PART 2: CUSTOMER BALANCES (Accounts Receivable)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    
    -- Opening Balance
    opening_balance DECIMAL(18, 4) DEFAULT 0,
    
    -- Period Movements
    invoiced_amount DECIMAL(18, 4) DEFAULT 0,    -- Sales invoices
    received_amount DECIMAL(18, 4) DEFAULT 0,     -- Receipts
    returned_amount DECIMAL(18, 4) DEFAULT 0,     -- Sales returns
    discount_amount DECIMAL(18, 4) DEFAULT 0,     -- Discounts given
    adjustment_amount DECIMAL(18, 4) DEFAULT 0,   -- Manual adjustments
    
    -- Closing Balance
    closing_balance DECIMAL(18, 4) GENERATED ALWAYS AS (
        opening_balance + invoiced_amount - received_amount - returned_amount - discount_amount + adjustment_amount
    ) STORED,
    
    -- Overdue Analysis
    current_amount DECIMAL(18, 4) DEFAULT 0,      -- Not yet due
    overdue_1_30 DECIMAL(18, 4) DEFAULT 0,        -- 1-30 days
    overdue_31_60 DECIMAL(18, 4) DEFAULT 0,       -- 31-60 days
    overdue_61_90 DECIMAL(18, 4) DEFAULT 0,       -- 61-90 days
    overdue_over_90 DECIMAL(18, 4) DEFAULT 0,     -- Over 90 days
    
    -- Credit Info
    credit_limit DECIMAL(18, 4) DEFAULT 0,
    available_credit DECIMAL(18, 4) GENERATED ALWAYS AS (
        GREATEST(credit_limit - (opening_balance + invoiced_amount - received_amount - returned_amount - discount_amount + adjustment_amount), 0)
    ) STORED,
    
    -- Metadata
    last_invoice_date DATE,
    last_payment_date DATE,
    invoice_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (company_id, customer_id, currency_id, fiscal_year_id, branch_id)
);

-- =====================================================
-- PART 3: VENDOR BALANCES (Accounts Payable)
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    
    -- Opening Balance
    opening_balance DECIMAL(18, 4) DEFAULT 0,
    
    -- Period Movements
    invoiced_amount DECIMAL(18, 4) DEFAULT 0,    -- Purchase invoices
    paid_amount DECIMAL(18, 4) DEFAULT 0,         -- Payments
    returned_amount DECIMAL(18, 4) DEFAULT 0,     -- Purchase returns
    discount_amount DECIMAL(18, 4) DEFAULT 0,     -- Discounts received
    adjustment_amount DECIMAL(18, 4) DEFAULT 0,   -- Manual adjustments
    
    -- Closing Balance
    closing_balance DECIMAL(18, 4) GENERATED ALWAYS AS (
        opening_balance + invoiced_amount - paid_amount - returned_amount - discount_amount + adjustment_amount
    ) STORED,
    
    -- Overdue Analysis
    current_amount DECIMAL(18, 4) DEFAULT 0,
    overdue_1_30 DECIMAL(18, 4) DEFAULT 0,
    overdue_31_60 DECIMAL(18, 4) DEFAULT 0,
    overdue_61_90 DECIMAL(18, 4) DEFAULT 0,
    overdue_over_90 DECIMAL(18, 4) DEFAULT 0,
    
    -- Metadata
    last_invoice_date DATE,
    last_payment_date DATE,
    invoice_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (company_id, vendor_id, currency_id, fiscal_year_id, branch_id)
);

-- =====================================================
-- PART 4: INVENTORY BALANCES
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    location_id INTEGER REFERENCES warehouse_locations(id),
    batch_id INTEGER REFERENCES batches(id),
    
    -- Quantity
    quantity_on_hand DECIMAL(18, 4) DEFAULT 0,
    quantity_reserved DECIMAL(18, 4) DEFAULT 0,     -- Reserved for orders
    quantity_ordered DECIMAL(18, 4) DEFAULT 0,       -- On purchase orders
    quantity_in_transit DECIMAL(18, 4) DEFAULT 0,    -- Being transferred
    
    -- Available = On Hand - Reserved
    quantity_available DECIMAL(18, 4) GENERATED ALWAYS AS (
        quantity_on_hand - quantity_reserved
    ) STORED,
    
    -- Valuation
    unit_cost DECIMAL(18, 4) DEFAULT 0,
    total_value DECIMAL(18, 4) GENERATED ALWAYS AS (
        quantity_on_hand * unit_cost
    ) STORED,
    
    -- Movement Stats
    last_receipt_date DATE,
    last_issue_date DATE,
    last_count_date DATE,
    
    -- Reorder Info
    reorder_level DECIMAL(18, 4) DEFAULT 0,
    reorder_quantity DECIMAL(18, 4) DEFAULT 0,
    is_below_reorder BOOLEAN GENERATED ALWAYS AS (
        quantity_on_hand < reorder_level
    ) STORED,
    
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (company_id, item_id, warehouse_id, location_id, batch_id)
);

-- =====================================================
-- PART 5: BANK BALANCES
-- =====================================================

CREATE TABLE IF NOT EXISTS bank_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    
    -- Book Balance (as per our records)
    opening_balance DECIMAL(18, 4) DEFAULT 0,
    deposits DECIMAL(18, 4) DEFAULT 0,
    withdrawals DECIMAL(18, 4) DEFAULT 0,
    closing_balance DECIMAL(18, 4) GENERATED ALWAYS AS (
        opening_balance + deposits - withdrawals
    ) STORED,
    
    -- Bank Statement Balance
    statement_balance DECIMAL(18, 4) DEFAULT 0,
    statement_date DATE,
    
    -- Reconciliation
    uncleared_deposits DECIMAL(18, 4) DEFAULT 0,
    uncleared_checks DECIMAL(18, 4) DEFAULT 0,
    reconciled_balance DECIMAL(18, 4) GENERATED ALWAYS AS (
        statement_balance + uncleared_deposits - uncleared_checks
    ) STORED,
    
    last_reconciliation_date DATE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (company_id, bank_account_id, currency_id, fiscal_year_id)
);

-- =====================================================
-- PART 6: PERIOD SUMMARY (for Dashboard)
-- =====================================================

CREATE TABLE IF NOT EXISTS period_summary (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    period_id INTEGER NOT NULL REFERENCES accounting_periods(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    
    -- Revenue
    total_sales DECIMAL(18, 4) DEFAULT 0,
    total_sales_returns DECIMAL(18, 4) DEFAULT 0,
    net_sales DECIMAL(18, 4) GENERATED ALWAYS AS (total_sales - total_sales_returns) STORED,
    
    -- Cost
    cost_of_goods_sold DECIMAL(18, 4) DEFAULT 0,
    gross_profit DECIMAL(18, 4) GENERATED ALWAYS AS (
        total_sales - total_sales_returns - cost_of_goods_sold
    ) STORED,
    
    -- Expenses
    operating_expenses DECIMAL(18, 4) DEFAULT 0,
    other_income DECIMAL(18, 4) DEFAULT 0,
    other_expenses DECIMAL(18, 4) DEFAULT 0,
    
    -- Net Income
    net_income DECIMAL(18, 4) GENERATED ALWAYS AS (
        total_sales - total_sales_returns - cost_of_goods_sold - operating_expenses + other_income - other_expenses
    ) STORED,
    
    -- Purchases
    total_purchases DECIMAL(18, 4) DEFAULT 0,
    total_purchase_returns DECIMAL(18, 4) DEFAULT 0,
    
    -- Collections
    total_receipts DECIMAL(18, 4) DEFAULT 0,
    total_payments DECIMAL(18, 4) DEFAULT 0,
    
    -- Counts
    sales_invoice_count INTEGER DEFAULT 0,
    purchase_invoice_count INTEGER DEFAULT 0,
    journal_entry_count INTEGER DEFAULT 0,
    
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (company_id, fiscal_year_id, period_id, currency_id, branch_id)
);

-- =====================================================
-- PART 7: INDEXES
-- =====================================================

-- Account Balances
CREATE INDEX IF NOT EXISTS idx_account_balances_company ON account_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON account_balances(fiscal_year_id, period_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_lookup ON account_balances(company_id, account_id, fiscal_year_id, period_id);

-- Customer Balances
CREATE INDEX IF NOT EXISTS idx_customer_balances_company ON customer_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_customer ON customer_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_overdue ON customer_balances(company_id) WHERE closing_balance > 0;

-- Vendor Balances
CREATE INDEX IF NOT EXISTS idx_vendor_balances_company ON vendor_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_balances_vendor ON vendor_balances(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_balances_overdue ON vendor_balances(company_id) WHERE closing_balance > 0;

-- Inventory Balances
CREATE INDEX IF NOT EXISTS idx_inventory_balances_item ON inventory_balances(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_warehouse ON inventory_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_reorder ON inventory_balances(company_id) WHERE is_below_reorder = TRUE;

-- Bank Balances
CREATE INDEX IF NOT EXISTS idx_bank_balances_account ON bank_balances(bank_account_id);

-- =====================================================
-- PART 8: HELPER FUNCTIONS
-- =====================================================

-- Get account balance for a specific period
CREATE OR REPLACE FUNCTION get_account_balance(
    p_company_id INTEGER,
    p_account_id INTEGER,
    p_period_id INTEGER,
    p_currency_id INTEGER DEFAULT NULL
) RETURNS DECIMAL(18, 4) AS $$
DECLARE
    v_balance DECIMAL(18, 4);
BEGIN
    SELECT COALESCE(balance, 0)
    INTO v_balance
    FROM account_balances
    WHERE company_id = p_company_id
    AND account_id = p_account_id
    AND period_id = p_period_id
    AND (p_currency_id IS NULL OR currency_id = p_currency_id)
    LIMIT 1;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Get customer outstanding balance
CREATE OR REPLACE FUNCTION get_customer_balance(
    p_company_id INTEGER,
    p_customer_id INTEGER
) RETURNS DECIMAL(18, 4) AS $$
DECLARE
    v_balance DECIMAL(18, 4);
BEGIN
    SELECT COALESCE(SUM(closing_balance), 0)
    INTO v_balance
    FROM customer_balances
    WHERE company_id = p_company_id
    AND customer_id = p_customer_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Get vendor outstanding balance
CREATE OR REPLACE FUNCTION get_vendor_balance(
    p_company_id INTEGER,
    p_vendor_id INTEGER
) RETURNS DECIMAL(18, 4) AS $$
DECLARE
    v_balance DECIMAL(18, 4);
BEGIN
    SELECT COALESCE(SUM(closing_balance), 0)
    INTO v_balance
    FROM vendor_balances
    WHERE company_id = p_company_id
    AND vendor_id = p_vendor_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Get item available quantity
CREATE OR REPLACE FUNCTION get_item_available_qty(
    p_company_id INTEGER,
    p_item_id INTEGER,
    p_warehouse_id INTEGER DEFAULT NULL
) RETURNS DECIMAL(18, 4) AS $$
DECLARE
    v_qty DECIMAL(18, 4);
BEGIN
    SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_qty
    FROM inventory_balances
    WHERE company_id = p_company_id
    AND item_id = p_item_id
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);
    
    RETURN v_qty;
END;
$$ LANGUAGE plpgsql;

-- Initialize balance record (called when first transaction occurs)
CREATE OR REPLACE FUNCTION initialize_account_balance(
    p_company_id INTEGER,
    p_account_id INTEGER,
    p_fiscal_year_id INTEGER,
    p_period_id INTEGER,
    p_currency_id INTEGER,
    p_cost_center_id INTEGER DEFAULT NULL,
    p_branch_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_balance_id INTEGER;
BEGIN
    INSERT INTO account_balances (
        company_id, account_id, fiscal_year_id, period_id, 
        currency_id, cost_center_id, branch_id
    ) VALUES (
        p_company_id, p_account_id, p_fiscal_year_id, p_period_id,
        p_currency_id, p_cost_center_id, p_branch_id
    )
    ON CONFLICT (company_id, account_id, fiscal_year_id, period_id, currency_id, cost_center_id, branch_id)
    DO NOTHING
    RETURNING id INTO v_balance_id;
    
    IF v_balance_id IS NULL THEN
        SELECT id INTO v_balance_id
        FROM account_balances
        WHERE company_id = p_company_id
        AND account_id = p_account_id
        AND fiscal_year_id = p_fiscal_year_id
        AND period_id = p_period_id
        AND currency_id = p_currency_id
        AND COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_cost_center_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000');
    END IF;
    
    RETURN v_balance_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE account_balances IS 'Pre-calculated account balances for fast reporting';
COMMENT ON TABLE customer_balances IS 'Pre-calculated customer AR balances with aging';
COMMENT ON TABLE vendor_balances IS 'Pre-calculated vendor AP balances with aging';
COMMENT ON TABLE inventory_balances IS 'Real-time inventory quantities by location';
COMMENT ON TABLE bank_balances IS 'Bank account balances with reconciliation status';
COMMENT ON TABLE period_summary IS 'Key financial metrics per period for dashboard';
