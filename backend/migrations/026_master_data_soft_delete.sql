-- =============================================
-- Migration: Add Master Data Tables & Soft Delete
-- Purpose: Create missing master data tables with soft delete support
-- Date: 2025-12-24
-- =============================================

-- =============================================
-- 1. ADD SOFT DELETE TO REFERENCE TABLES
-- =============================================

-- Add deleted_at to countries
ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Add deleted_at to cities
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Add deleted_at to currencies
ALTER TABLE currencies 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Add deleted_at to payment_terms (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_terms') THEN
    ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
  END IF;
END $$;

-- Add deleted_at to payment_methods (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
    ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
  END IF;
END $$;

-- =============================================
-- 2. CREATE TAXES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS taxes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    tax_type VARCHAR(30) NOT NULL,            -- vat, withholding, sales, zatca, custom
    rate NUMERIC(5, 2) NOT NULL,              -- 0.00 to 100.00
    account_id INTEGER REFERENCES accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code),
    CHECK (rate >= 0 AND rate <= 100),
    CHECK (tax_type IN ('vat', 'withholding', 'sales', 'zatca', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_taxes_company_id ON taxes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_taxes_account_id ON taxes(account_id);

-- =============================================
-- 3. CREATE UNITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    unit_type VARCHAR(20) NOT NULL,           -- weight, length, volume, piece, other
    base_unit_id INTEGER REFERENCES units(id),
    conversion_factor NUMERIC(15, 6),         -- How many base units = 1 of this unit
    is_base_unit BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code),
    CHECK (unit_type IN ('weight', 'length', 'volume', 'piece', 'other')),
    CHECK (is_base_unit = true OR (base_unit_id IS NOT NULL AND conversion_factor IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_units_company_id ON units(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_units_base_unit_id ON units(base_unit_id);

-- =============================================
-- 4. CREATE WAREHOUSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    warehouse_type VARCHAR(20) NOT NULL,      -- main, branch, transit, quarantine
    location TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    manager_name VARCHAR(100),
    manager_phone VARCHAR(50),
    capacity NUMERIC(15, 2),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code),
    CHECK (warehouse_type IN ('main', 'branch', 'transit', 'quarantine'))
);

CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id) WHERE deleted_at IS NULL;

-- =============================================
-- 5. CREATE COST CENTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cost_centers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    parent_id INTEGER REFERENCES cost_centers(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_company_id ON cost_centers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON cost_centers(parent_id);

-- =============================================
-- 6. UPDATE ITEMS TABLE (Add Accounting Links)
-- =============================================
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS inventory_account_id INTEGER REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS cogs_account_id INTEGER REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS revenue_account_id INTEGER REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS adjustment_account_id INTEGER REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_items_inventory_account ON items(inventory_account_id);
CREATE INDEX IF NOT EXISTS idx_items_cogs_account ON items(cogs_account_id);
CREATE INDEX IF NOT EXISTS idx_items_revenue_account ON items(revenue_account_id);

-- =============================================
-- 7. AUDIT TRAIL COMMENTS
-- =============================================
COMMENT ON TABLE taxes IS 'Tax types and rates with accounting integration';
COMMENT ON TABLE units IS 'Units of measure with conversion factors';
COMMENT ON TABLE warehouses IS 'Warehouse locations and types';
COMMENT ON TABLE cost_centers IS 'Cost centers for expense allocation';

COMMENT ON COLUMN taxes.account_id IS 'Account where tax amounts are posted';
COMMENT ON COLUMN units.conversion_factor IS 'Multiplier to convert to base unit (e.g., 1kg = 1000g, factor = 1000)';
COMMENT ON COLUMN warehouses.warehouse_type IS 'Type: main, branch, transit, quarantine';
COMMENT ON COLUMN items.inventory_account_id IS 'Asset account for inventory valuation';
COMMENT ON COLUMN items.cogs_account_id IS 'Expense account for cost of goods sold';
COMMENT ON COLUMN items.revenue_account_id IS 'Revenue account for sales';
COMMENT ON COLUMN items.adjustment_account_id IS 'Account for inventory adjustments';
