-- =====================================================
-- Migration: 196_vendor_360_module.sql
-- Purpose: Vendor 360° Module - Full vendor management
-- Date: 2026-01-26
-- CRITICAL: Non-destructive - preserves all existing data
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS TO VENDORS TABLE
-- =====================================================

-- Classification (تصنيف المورد)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'classification_id') THEN
        ALTER TABLE vendors ADD COLUMN classification_id INTEGER;
    END IF;
END $$;

-- Opening Balance (الرصيد الافتتاحي)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'opening_balance') THEN
        ALTER TABLE vendors ADD COLUMN opening_balance DECIMAL(18,4) DEFAULT 0;
    END IF;
END $$;

-- Outstanding Balance (will be computed but stored for performance)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE vendors ADD COLUMN outstanding_balance DECIMAL(18,4) DEFAULT 0;
    END IF;
END $$;

-- Withholding Tax Applicable
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'withholding_tax_applicable') THEN
        ALTER TABLE vendors ADD COLUMN withholding_tax_applicable BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Default Tax Type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'default_tax_type_id') THEN
        ALTER TABLE vendors ADD COLUMN default_tax_type_id INTEGER;
    END IF;
END $$;

-- Default Payment Method
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'default_payment_method') THEN
        ALTER TABLE vendors ADD COLUMN default_payment_method VARCHAR(50) DEFAULT 'bank_transfer';
    END IF;
END $$;

-- Rating Score (1-5)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'rating_score') THEN
        ALTER TABLE vendors ADD COLUMN rating_score DECIMAL(2,1) DEFAULT 0 CHECK (rating_score >= 0 AND rating_score <= 5);
    END IF;
END $$;

-- Total PO Count (cached)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'total_po_count') THEN
        ALTER TABLE vendors ADD COLUMN total_po_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Total Invoice Count (cached)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'total_invoice_count') THEN
        ALTER TABLE vendors ADD COLUMN total_invoice_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Total Paid Amount (cached)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'total_paid_amount') THEN
        ALTER TABLE vendors ADD COLUMN total_paid_amount DECIMAL(18,4) DEFAULT 0;
    END IF;
END $$;

-- Total Shipment Count (cached)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'total_shipment_count') THEN
        ALTER TABLE vendors ADD COLUMN total_shipment_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Last Transaction Date
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'last_transaction_date') THEN
        ALTER TABLE vendors ADD COLUMN last_transaction_date TIMESTAMP;
    END IF;
END $$;

-- Last PO Date
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'last_po_date') THEN
        ALTER TABLE vendors ADD COLUMN last_po_date TIMESTAMP;
    END IF;
END $$;

-- Last Payment Date
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'last_payment_date') THEN
        ALTER TABLE vendors ADD COLUMN last_payment_date TIMESTAMP;
    END IF;
END $$;

-- =====================================================
-- 2. CREATE VENDOR CLASSIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_classifications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    color VARCHAR(20) DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_classifications_company ON vendor_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_classifications_active ON vendor_classifications(company_id, is_active) WHERE deleted_at IS NULL;

-- Add FK to vendors
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'vendors_classification_id_fkey') THEN
        ALTER TABLE vendors ADD CONSTRAINT vendors_classification_id_fkey 
            FOREIGN KEY (classification_id) REFERENCES vendor_classifications(id);
    END IF;
END $$;

-- =====================================================
-- 3. CREATE VENDOR BANK ACCOUNTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    bank_id INTEGER REFERENCES banks(id),
    bank_name VARCHAR(100),  -- For foreign banks not in our system
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    iban VARCHAR(50),
    swift_code VARCHAR(20),
    currency_id INTEGER REFERENCES currencies(id),
    country_id INTEGER REFERENCES countries(id),
    branch_name VARCHAR(100),
    branch_address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_bank_accounts_vendor ON vendor_bank_accounts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bank_accounts_default ON vendor_bank_accounts(vendor_id, is_default) WHERE is_default = TRUE;

-- =====================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vendors_classification ON vendors(classification_id);
CREATE INDEX IF NOT EXISTS idx_vendors_outstanding ON vendors(company_id, outstanding_balance) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_credit_limit ON vendors(company_id, credit_limit) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_last_transaction ON vendors(company_id, last_transaction_date) WHERE deleted_at IS NULL;

-- =====================================================
-- 5. UPDATE FUNCTION TO REFRESH VENDOR STATS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_vendor_statistics(p_vendor_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_po_count INTEGER;
    v_invoice_count INTEGER;
    v_paid_amount DECIMAL(18,4);
    v_shipment_count INTEGER;
    v_outstanding DECIMAL(18,4);
    v_last_po TIMESTAMP;
    v_last_payment TIMESTAMP;
    v_last_transaction TIMESTAMP;
BEGIN
    -- Count POs
    SELECT COUNT(*), MAX(order_date) INTO v_po_count, v_last_po
    FROM purchase_orders 
    WHERE vendor_id = p_vendor_id AND deleted_at IS NULL;

    -- Count Invoices
    SELECT COUNT(*) INTO v_invoice_count
    FROM purchase_invoices 
    WHERE vendor_id = p_vendor_id AND deleted_at IS NULL;

    -- Sum Payments
    SELECT COALESCE(SUM(payment_amount), 0), MAX(payment_date) INTO v_paid_amount, v_last_payment
    FROM vendor_payments 
    WHERE vendor_id = p_vendor_id AND status = 'posted' AND deleted_at IS NULL;

    -- Count Shipments
    SELECT COUNT(*) INTO v_shipment_count
    FROM logistics_shipments 
    WHERE vendor_id = p_vendor_id AND deleted_at IS NULL;

    -- Calculate Outstanding (Invoices - Payments)
    SELECT COALESCE(SUM(total_amount), 0) - v_paid_amount INTO v_outstanding
    FROM purchase_invoices 
    WHERE vendor_id = p_vendor_id AND deleted_at IS NULL;

    -- Get last transaction date
    SELECT GREATEST(v_last_po, v_last_payment) INTO v_last_transaction;

    -- Update vendor
    UPDATE vendors SET
        total_po_count = v_po_count,
        total_invoice_count = v_invoice_count,
        total_paid_amount = v_paid_amount,
        total_shipment_count = v_shipment_count,
        outstanding_balance = v_outstanding,
        last_po_date = v_last_po,
        last_payment_date = v_last_payment,
        last_transaction_date = v_last_transaction,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. SEED DEFAULT VENDOR CLASSIFICATIONS
-- =====================================================

INSERT INTO vendor_classifications (company_id, code, name, name_ar, description, color, sort_order)
SELECT c.id, 'A', 'Strategic Partner', 'شريك استراتيجي', 'High value, critical suppliers', '#22C55E', 1
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM vendor_classifications vc WHERE vc.company_id = c.id AND vc.code = 'A');

INSERT INTO vendor_classifications (company_id, code, name, name_ar, description, color, sort_order)
SELECT c.id, 'B', 'Preferred', 'مفضل', 'Regular suppliers with good performance', '#3B82F6', 2
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM vendor_classifications vc WHERE vc.company_id = c.id AND vc.code = 'B');

INSERT INTO vendor_classifications (company_id, code, name, name_ar, description, color, sort_order)
SELECT c.id, 'C', 'Standard', 'عادي', 'Standard suppliers', '#F59E0B', 3
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM vendor_classifications vc WHERE vc.company_id = c.id AND vc.code = 'C');

INSERT INTO vendor_classifications (company_id, code, name, name_ar, description, color, sort_order)
SELECT c.id, 'D', 'Under Review', 'تحت المراجعة', 'Suppliers under evaluation or probation', '#EF4444', 4
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM vendor_classifications vc WHERE vc.company_id = c.id AND vc.code = 'D');

-- =====================================================
-- 7. ADD VENDOR PERMISSIONS
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('vendors:view', 'vendors', 'view', 'View vendor list'),
    ('vendors:create', 'vendors', 'create', 'Create new vendors'),
    ('vendors:edit', 'vendors', 'edit', 'Edit vendor basic info'),
    ('vendors:delete', 'vendors', 'delete', 'Delete vendors'),
    ('vendors:financial:view', 'vendors', 'financial:view', 'View vendor financial info'),
    ('vendors:financial:edit', 'vendors', 'financial:edit', 'Edit vendor financial info'),
    ('vendors:bank_accounts:view', 'vendors', 'bank_accounts:view', 'View vendor bank accounts'),
    ('vendors:bank_accounts:manage', 'vendors', 'bank_accounts:manage', 'Manage vendor bank accounts'),
    ('vendors:items:view', 'vendors', 'items:view', 'View vendor items and prices'),
    ('vendors:items:manage', 'vendors', 'items:manage', 'Manage vendor items'),
    ('vendors:statements:view', 'vendors', 'statements:view', 'View vendor statements'),
    ('vendors:statements:export', 'vendors', 'statements:export', 'Export vendor statements'),
    ('vendors:profile:view', 'vendors', 'profile:view', 'View vendor profile 360'),
    ('vendors:toggle_status', 'vendors', 'toggle_status', 'Enable/disable vendors')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant permissions to super_admin and admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super_admin', 'admin')
AND p.permission_code LIKE 'vendors:%'
ON CONFLICT DO NOTHING;

-- Grant view permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.permission_code IN ('vendors:view', 'vendors:profile:view', 'vendors:financial:view', 'vendors:bank_accounts:view', 'vendors:items:view', 'vendors:statements:view')
ON CONFLICT DO NOTHING;

COMMIT;
