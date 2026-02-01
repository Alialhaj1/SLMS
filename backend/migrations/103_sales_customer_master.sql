-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 103: SALES MODULE - CUSTOMER MASTER DATA                       ║
-- ║  Phase 1: Customer Foundations for Sales Module                           ║
-- ╠═══════════════════════════════════════════════════════════════════════════╣
-- ║  🎯 PURPOSE:                                                              ║
-- ║  - Customer master with credit limits                                     ║
-- ║  - Customer categories & classifications                                  ║
-- ║  - Sales settings (parallel to procurement_settings)                      ║
-- ║  - Price lists (shared: can be used for both sales & procurement)        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ SALES SETTINGS (Company-specific sales configuration)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Credit Control
    enable_credit_limit_check BOOLEAN DEFAULT true,
    credit_block_action VARCHAR(20) DEFAULT 'warn', -- 'block', 'warn', 'allow'
    credit_tolerance_percent NUMERIC(5,2) DEFAULT 10.00,
    auto_credit_review_days INTEGER DEFAULT 90,
    
    -- Pricing
    default_price_list_id INTEGER,
    allow_below_cost_price BOOLEAN DEFAULT false,
    price_deviation_tolerance_percent NUMERIC(5,2) DEFAULT 10.00,
    require_approval_below_cost BOOLEAN DEFAULT true,
    
    -- Discounts
    max_line_discount_percent NUMERIC(5,2) DEFAULT 20.00,
    max_order_discount_percent NUMERIC(5,2) DEFAULT 15.00,
    require_discount_approval_above NUMERIC(5,2) DEFAULT 10.00,
    
    -- Sales Order Settings
    require_so_approval BOOLEAN DEFAULT false,
    so_approval_threshold NUMERIC(18,2) DEFAULT 10000.00,
    auto_reserve_inventory BOOLEAN DEFAULT true,
    allow_partial_delivery BOOLEAN DEFAULT true,
    
    -- Invoice Settings
    auto_generate_invoice_from_do BOOLEAN DEFAULT false,
    require_delivery_before_invoice BOOLEAN DEFAULT true,
    invoice_due_days_default INTEGER DEFAULT 30,
    
    -- Returns
    require_return_authorization BOOLEAN DEFAULT true,
    auto_credit_on_return BOOLEAN DEFAULT false,
    max_return_days INTEGER DEFAULT 30,
    
    -- Workflow
    enable_customer_approval_workflow BOOLEAN DEFAULT false,
    enable_quotation_validity_check BOOLEAN DEFAULT true,
    quotation_validity_days_default INTEGER DEFAULT 30,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id)
);

-- Insert default sales settings for existing companies
INSERT INTO sales_settings (company_id)
SELECT id FROM companies 
WHERE id NOT IN (SELECT company_id FROM sales_settings)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ CUSTOMER CATEGORIES (Hierarchical)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    parent_id INTEGER REFERENCES customer_categories(id),
    
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Default settings for customers in this category
    default_payment_terms_id INTEGER,
    default_credit_limit NUMERIC(18,2),
    default_discount_percent NUMERIC(5,2),
    default_price_list_id INTEGER,
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ CUSTOMER TYPES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    -- Default account mappings
    default_receivable_account_id INTEGER REFERENCES accounts(id),
    default_revenue_account_id INTEGER REFERENCES accounts(id),
    default_discount_account_id INTEGER REFERENCES accounts(id),
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ CUSTOMER STATUSES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_statuses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    color VARCHAR(20) DEFAULT '#6b7280',
    
    -- Permissions
    allows_sales_orders BOOLEAN DEFAULT true,
    allows_invoicing BOOLEAN DEFAULT true,
    allows_credit BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    
    is_system BOOLEAN DEFAULT false, -- Can't delete system statuses
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

-- Insert default statuses
INSERT INTO customer_statuses (company_id, code, name, name_ar, color, allows_sales_orders, allows_invoicing, allows_credit, is_system, sort_order)
SELECT c.id, s.code, s.name, s.name_ar, s.color, s.allows_sales_orders, s.allows_invoicing, s.allows_credit, true, s.sort_order
FROM companies c
CROSS JOIN (VALUES
    ('ACTIVE', 'Active', 'نشط', '#22c55e', true, true, true, 1),
    ('ON_HOLD', 'On Hold', 'معلق', '#f59e0b', false, false, true, 2),
    ('CREDIT_HOLD', 'Credit Hold', 'إيقاف ائتماني', '#ef4444', true, true, false, 3),
    ('BLOCKED', 'Blocked', 'محظور', '#991b1b', false, false, false, 4),
    ('PROSPECT', 'Prospect', 'محتمل', '#3b82f6', false, false, false, 5)
) AS s(code, name, name_ar, color, allows_sales_orders, allows_invoicing, allows_credit, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM customer_statuses cs WHERE cs.company_id = c.id AND cs.code = s.code
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ CUSTOMERS (Master)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Basic Info
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    legal_name VARCHAR(200),
    
    -- Classification
    customer_type_id INTEGER REFERENCES customer_types(id),
    category_id INTEGER REFERENCES customer_categories(id),
    status_id INTEGER REFERENCES customer_statuses(id),
    
    -- Contact
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(200),
    
    -- Tax & Legal
    tax_registration_number VARCHAR(50),
    commercial_registration VARCHAR(50),
    vat_number VARCHAR(50),
    is_vat_exempt BOOLEAN DEFAULT false,
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_id INTEGER REFERENCES countries(id),
    
    -- Shipping Address (if different)
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state_province VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country_id INTEGER REFERENCES countries(id),
    
    -- Financial
    currency_id INTEGER REFERENCES currencies(id),
    payment_terms_id INTEGER,
    credit_limit NUMERIC(18,2) DEFAULT 0.00,
    current_balance NUMERIC(18,2) DEFAULT 0.00, -- Outstanding AR
    available_credit NUMERIC(18,2) GENERATED ALWAYS AS (credit_limit - GREATEST(current_balance, 0)) STORED,
    credit_rating VARCHAR(10), -- A, B, C, D, F
    
    -- Pricing
    price_list_id INTEGER,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    
    -- Sales Team
    sales_rep_id INTEGER REFERENCES users(id),
    territory_id INTEGER,
    
    -- Accounting Links
    receivable_account_id INTEGER REFERENCES accounts(id),
    revenue_account_id INTEGER REFERENCES accounts(id),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
-- Note: These indexes depend on optional columns that may not exist in legacy customers table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'category_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'sales_rep_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_sales_rep ON customers(sales_rep_id)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ CUSTOMER CONTACTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    title VARCHAR(100),
    department VARCHAR(100),
    
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    is_primary BOOLEAN DEFAULT false,
    is_billing_contact BOOLEAN DEFAULT false,
    is_shipping_contact BOOLEAN DEFAULT false,
    
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ CUSTOMER CREDIT HISTORY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_credit_history (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    change_type VARCHAR(50) NOT NULL, -- 'limit_increase', 'limit_decrease', 'credit_hold', 'credit_release', 'rating_change'
    previous_limit NUMERIC(18,2),
    new_limit NUMERIC(18,2),
    previous_rating VARCHAR(10),
    new_rating VARCHAR(10),
    reason TEXT,
    
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ PRICE LISTS (Shared for Sales & Procurement)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    -- Type
    price_list_type VARCHAR(20) NOT NULL DEFAULT 'sales', -- 'sales', 'purchase', 'both'
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    
    -- Pricing rules
    is_tax_inclusive BOOLEAN DEFAULT false,
    markup_percent NUMERIC(8,4),
    discount_percent NUMERIC(8,4),
    
    -- Hierarchy
    parent_price_list_id INTEGER REFERENCES price_lists(id),
    priority INTEGER DEFAULT 100, -- Lower = higher priority
    
    -- Flags
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ PRICE LIST ITEMS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    
    -- Pricing
    unit_price NUMERIC(18,6) NOT NULL,
    min_qty NUMERIC(18,6) DEFAULT 1,
    max_qty NUMERIC(18,6),
    
    -- Discounts
    discount_percent NUMERIC(8,4),
    discount_amount NUMERIC(18,6),
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(price_list_id, item_id, uom_id, min_qty)
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_item ON price_list_items(item_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON price_list_items(price_list_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟 CUSTOMER PRICE LIST ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_price_lists (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
    
    priority INTEGER DEFAULT 100,
    valid_from DATE,
    valid_to DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id, price_list_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣1️⃣ CUSTOMER COMPLIANCE (Parallel to vendor_compliance)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_compliance (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Risk Assessment
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    risk_score INTEGER DEFAULT 0, -- 0-100
    
    -- Credit Status
    is_credit_blocked BOOLEAN DEFAULT false,
    credit_block_reason TEXT,
    credit_blocked_at TIMESTAMP WITH TIME ZONE,
    credit_blocked_by INTEGER REFERENCES users(id),
    
    -- Payment History
    average_payment_days INTEGER,
    late_payment_count INTEGER DEFAULT 0,
    last_payment_date DATE,
    
    -- Audit Info
    last_review_date DATE,
    next_review_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id, company_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣2️⃣ SALES TERRITORIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_territories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    parent_id INTEGER REFERENCES sales_territories(id),
    
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    manager_id INTEGER REFERENCES users(id),
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣3️⃣ PERMISSIONS FOR SALES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description)
VALUES
    -- Customers
    ('customers:view', 'customers', 'view', 'View customers'),
    ('customers:create', 'customers', 'create', 'Create customers'),
    ('customers:update', 'customers', 'update', 'Update customers'),
    ('customers:delete', 'customers', 'delete', 'Delete customers'),
    ('customers:credit_manage', 'customers', 'credit_manage', 'Manage customer credit limits'),
    ('customers:block', 'customers', 'block', 'Block/unblock customers'),
    
    -- Customer Categories
    ('customer_categories:view', 'customer_categories', 'view', 'View customer categories'),
    ('customer_categories:manage', 'customer_categories', 'manage', 'Manage customer categories'),
    
    -- Price Lists
    ('price_lists:view', 'price_lists', 'view', 'View price lists'),
    ('price_lists:create', 'price_lists', 'create', 'Create price lists'),
    ('price_lists:update', 'price_lists', 'update', 'Update price lists'),
    ('price_lists:delete', 'price_lists', 'delete', 'Delete price lists'),
    
    -- Sales Settings
    ('sales_settings:view', 'sales_settings', 'view', 'View sales settings'),
    ('sales_settings:update', 'sales_settings', 'update', 'Update sales settings'),
    
    -- Sales Territories
    ('sales_territories:view', 'sales_territories', 'view', 'View sales territories'),
    ('sales_territories:manage', 'sales_territories', 'manage', 'Manage sales territories')
ON CONFLICT (permission_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣4️⃣ VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Customer summary view (only created if required columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'category_id') THEN
    EXECUTE '
    CREATE OR REPLACE VIEW v_customer_summary AS
    SELECT 
        c.id,
        c.company_id,
        c.code,
        c.name,
        c.name_ar,
        ct.name as customer_type,
        cc.name as category,
        cs.name as status,
        cs.color as status_color,
        c.credit_limit,
        c.current_balance,
        c.available_credit,
        c.credit_rating,
        c.is_active,
        u.first_name || '' '' || u.last_name as sales_rep_name,
        CASE 
            WHEN c.credit_limit > 0 AND c.current_balance >= c.credit_limit THEN ''exceeded''
            WHEN c.credit_limit > 0 AND c.current_balance >= c.credit_limit * 0.9 THEN ''warning''
            ELSE ''ok''
        END as credit_status
    FROM customers c
    LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
    LEFT JOIN customer_categories cc ON c.category_id = cc.id
    LEFT JOIN customer_statuses cs ON c.status_id = cs.id
    LEFT JOIN users u ON c.sales_rep_id = u.id
    WHERE c.deleted_at IS NULL
    ';
  ELSE
    -- Create a simpler version for existing customers table
    EXECUTE '
    CREATE OR REPLACE VIEW v_customer_summary AS
    SELECT 
        c.id,
        c.company_id,
        c.code,
        c.name,
        c.name_ar,
        c.customer_type,
        NULL::text as category,
        c.status,
        NULL::text as status_color,
        c.credit_limit,
        c.current_balance,
        (c.credit_limit - COALESCE(c.current_balance, 0)) as available_credit,
        NULL::text as credit_rating,
        (c.status = ''active'') as is_active,
        NULL::text as sales_rep_name,
        CASE 
            WHEN c.credit_limit > 0 AND c.current_balance >= c.credit_limit THEN ''exceeded''
            WHEN c.credit_limit > 0 AND c.current_balance >= c.credit_limit * 0.9 THEN ''warning''
            ELSE ''ok''
        END as credit_status
    FROM customers c
    WHERE c.deleted_at IS NULL
    ';
  END IF;
END $$;

-- Active price list items view (using existing column names)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_lists' AND column_name = 'price_list_type') THEN
    -- Use new schema
    EXECUTE '
    CREATE OR REPLACE VIEW v_active_prices AS
    SELECT 
        pl.company_id,
        pl.id as price_list_id,
        pl.code as price_list_code,
        pl.name as price_list_name,
        pl.price_list_type,
        pli.item_id,
        i.code as item_code,
        i.name as item_name,
        pli.uom_id,
        u.code as uom_code,
        pli.unit_price,
        pli.min_qty,
        pli.max_qty,
        pli.discount_percent,
        pl.priority
    FROM price_lists pl
    JOIN price_list_items pli ON pl.id = pli.price_list_id
    JOIN items i ON pli.item_id = i.id
    LEFT JOIN units_of_measure u ON pli.uom_id = u.id
    WHERE pl.is_active = true
      AND pli.is_active = true
      AND pl.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
      AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
      AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
      AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
    ';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_list_items') THEN
    -- Use existing schema with price_type
    EXECUTE '
    CREATE OR REPLACE VIEW v_active_prices AS
    SELECT 
        pl.company_id,
        pl.id as price_list_id,
        pl.code as price_list_code,
        pl.name as price_list_name,
        pl.price_type as price_list_type,
        pli.item_id,
        i.code as item_code,
        i.name as item_name,
        pli.uom_id,
        u.code as uom_code,
        pli.unit_price,
        pli.min_qty,
        pli.max_qty,
        pli.discount_percent,
        0 as priority
    FROM price_lists pl
    JOIN price_list_items pli ON pl.id = pli.price_list_id
    JOIN items i ON pli.item_id = i.id
    LEFT JOIN units_of_measure u ON pli.uom_id = u.id
    WHERE pl.is_active = true
      AND pli.is_active = true
      AND pl.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
      AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
    ';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣5️⃣ ADD DOCUMENT NUMBER SERIES FOR SALES
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure sales document types have numbering series
INSERT INTO document_number_series (company_id, document_type, prefix, separator, number_length, reset_policy, fiscal_year)
SELECT c.id, dt.document_type, dt.prefix, '-', 4, 'yearly', EXTRACT(YEAR FROM CURRENT_DATE)::INT
FROM companies c
CROSS JOIN (VALUES
    ('sales_quotation', 'SQ'),
    ('sales_order', 'SO'),
    ('delivery_note', 'DN'),
    ('sales_invoice', 'SINV'),
    ('sales_return', 'SRET'),
    ('credit_note', 'CN'),
    ('receipt_voucher', 'RV')
) AS dt(document_type, prefix)
WHERE NOT EXISTS (
    SELECT 1 FROM document_number_series dns 
    WHERE dns.company_id = c.id AND dns.document_type = dt.document_type
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
