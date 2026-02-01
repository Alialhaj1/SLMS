-- Migration: 020_add_soft_delete_constraints_indexes.sql
-- Description: Add soft delete, unique constraints, and performance indexes to all master tables
-- Date: 2025-12-22

-- =====================================================
-- PART 1: SOFT DELETE FOR ALL MASTER TABLES
-- =====================================================

-- Helper function to add soft delete columns
CREATE OR REPLACE FUNCTION add_soft_delete_columns(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Add is_deleted if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'is_deleted'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE', p_table_name);
    END IF;
    
    -- Add deleted_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'deleted_at'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE', p_table_name);
    END IF;
    
    -- Add deleted_by if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'deleted_by'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_by INTEGER REFERENCES users(id)', p_table_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add soft delete to Reference Tables
SELECT add_soft_delete_columns('countries');
SELECT add_soft_delete_columns('cities');
SELECT add_soft_delete_columns('currencies');
SELECT add_soft_delete_columns('ports');
SELECT add_soft_delete_columns('customs_offices');
SELECT add_soft_delete_columns('payment_terms');
SELECT add_soft_delete_columns('payment_methods');
SELECT add_soft_delete_columns('banks');
SELECT add_soft_delete_columns('bank_accounts');
SELECT add_soft_delete_columns('tax_types');
SELECT add_soft_delete_columns('incoterms');
SELECT add_soft_delete_columns('shipping_methods');

-- Add soft delete to Chart of Accounts
SELECT add_soft_delete_columns('account_types');
SELECT add_soft_delete_columns('accounts');
SELECT add_soft_delete_columns('cost_centers');
SELECT add_soft_delete_columns('profit_centers');
SELECT add_soft_delete_columns('projects');

-- Add soft delete to Inventory
SELECT add_soft_delete_columns('uom');
SELECT add_soft_delete_columns('item_categories');
SELECT add_soft_delete_columns('item_groups');
SELECT add_soft_delete_columns('brands');
SELECT add_soft_delete_columns('items');
SELECT add_soft_delete_columns('item_variants');
SELECT add_soft_delete_columns('warehouses');
SELECT add_soft_delete_columns('warehouse_locations');
SELECT add_soft_delete_columns('price_lists');

-- Add soft delete to Partners
SELECT add_soft_delete_columns('customer_groups');
SELECT add_soft_delete_columns('customers');
SELECT add_soft_delete_columns('vendor_groups');
SELECT add_soft_delete_columns('vendors');
SELECT add_soft_delete_columns('employees');

-- =====================================================
-- PART 2: UNIQUE CONSTRAINTS (Company-scoped)
-- =====================================================

-- Note: accounts already has constraint accounts_company_id_code_key
-- Skip accounts constraints as they already exist

-- Cost Centers: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_cost_centers_company_code') THEN
        ALTER TABLE cost_centers ADD CONSTRAINT uq_cost_centers_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Profit Centers: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_profit_centers_company_code') THEN
        ALTER TABLE profit_centers ADD CONSTRAINT uq_profit_centers_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Projects: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_projects_company_code') THEN
        ALTER TABLE projects ADD CONSTRAINT uq_projects_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Items: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_items_company_code') THEN
        ALTER TABLE items ADD CONSTRAINT uq_items_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Warehouses: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_warehouses_company_code') THEN
        ALTER TABLE warehouses ADD CONSTRAINT uq_warehouses_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Customers: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_company_code') THEN
        ALTER TABLE customers ADD CONSTRAINT uq_customers_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Vendors: Unique code per company
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_vendors_company_code') THEN
        ALTER TABLE vendors ADD CONSTRAINT uq_vendors_company_code UNIQUE (company_id, code);
    END IF;
END $$;

-- Currencies: Unique code globally
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_currencies_code') THEN
        ALTER TABLE currencies ADD CONSTRAINT uq_currencies_code UNIQUE (code);
    END IF;
END $$;

-- Countries: Unique code globally
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_countries_code') THEN
        ALTER TABLE countries ADD CONSTRAINT uq_countries_code UNIQUE (code);
    END IF;
END $$;

-- =====================================================
-- PART 3: PERFORMANCE INDEXES
-- =====================================================

-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_is_deleted ON accounts(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active) WHERE is_active = TRUE;

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_group ON items(group_id);
CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active) WHERE is_active = TRUE;

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_group ON customers(customer_group_id);
CREATE INDEX IF NOT EXISTS idx_customers_account ON customers(receivable_account_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON customers(is_deleted) WHERE is_deleted = FALSE;

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_group ON vendors(vendor_group_id);
CREATE INDEX IF NOT EXISTS idx_vendors_account ON vendors(payable_account_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_deleted ON vendors(is_deleted) WHERE is_deleted = FALSE;

-- Warehouses indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_deleted ON warehouses(is_deleted) WHERE is_deleted = FALSE;

-- Cost Centers indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_is_deleted ON cost_centers(is_deleted) WHERE is_deleted = FALSE;

-- Profit Centers indexes
CREATE INDEX IF NOT EXISTS idx_profit_centers_company ON profit_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_profit_centers_is_deleted ON profit_centers(is_deleted) WHERE is_deleted = FALSE;

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted) WHERE is_deleted = FALSE;

-- Exchange Rates indexes (for currency conversion lookups)
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_date ON exchange_rates(from_currency_id, to_currency_id, rate_date DESC);

-- Batches indexes
CREATE INDEX IF NOT EXISTS idx_batches_item ON batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date) WHERE expiry_date IS NOT NULL;

-- Serial Numbers indexes
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item ON serial_numbers(item_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse ON serial_numbers(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON serial_numbers(status);

-- =====================================================
-- PART 4: DOCUMENT STATUS ENUM
-- =====================================================

-- Create document status enum for future transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM (
            'draft',        -- Can be edited/deleted
            'pending',      -- Awaiting approval
            'approved',     -- Approved but not posted
            'posted',       -- Posted to ledger (cannot edit)
            'cancelled',    -- Cancelled (soft delete for transactions)
            'reversed'      -- Has been reversed by another document
        );
    END IF;
END $$;

-- =====================================================
-- PART 5: SOFT DELETE VIEWS (Optional but useful)
-- =====================================================

-- Active accounts view
CREATE OR REPLACE VIEW v_active_accounts AS
SELECT * FROM accounts 
WHERE (is_deleted = FALSE OR is_deleted IS NULL) 
AND is_active = TRUE;

-- Active items view
CREATE OR REPLACE VIEW v_active_items AS
SELECT * FROM items 
WHERE (is_deleted = FALSE OR is_deleted IS NULL) 
AND is_active = TRUE;

-- Active customers view
CREATE OR REPLACE VIEW v_active_customers AS
SELECT * FROM customers 
WHERE (is_deleted = FALSE OR is_deleted IS NULL);

-- Active vendors view
CREATE OR REPLACE VIEW v_active_vendors AS
SELECT * FROM vendors 
WHERE (is_deleted = FALSE OR is_deleted IS NULL);

-- Active warehouses view
CREATE OR REPLACE VIEW v_active_warehouses AS
SELECT * FROM warehouses 
WHERE (is_deleted = FALSE OR is_deleted IS NULL) 
AND is_active = TRUE;

-- =====================================================
-- PART 6: SOFT DELETE FUNCTION
-- =====================================================

-- Generic soft delete function (works with both INTEGER and UUID ids)
CREATE OR REPLACE FUNCTION soft_delete(
    p_table_name TEXT,
    p_id INTEGER,
    p_user_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
        p_table_name
    ) USING p_user_id, p_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Restore soft-deleted record
CREATE OR REPLACE FUNCTION restore_deleted(
    p_table_name TEXT,
    p_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL WHERE id = $1',
        p_table_name
    ) USING p_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP
-- =====================================================

DROP FUNCTION IF EXISTS add_soft_delete_columns(TEXT);

COMMENT ON TYPE document_status IS 'Standard document lifecycle states for all transactions';
