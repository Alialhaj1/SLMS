-- =============================================
-- PROCUREMENT & VENDORS MODULE - Complete Implementation
-- Migration 099: Full Procurement System
-- =============================================

-- =============================================
-- 1. VENDOR CATEGORIES (ØªØµÙ†ÙŠÙØ§Øª Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Category settings
    allowed_contract_types TEXT[],  -- Array of allowed contract type codes
    default_tax_treatment VARCHAR(20), -- standard, exempt, zero_rated
    default_currency_id INTEGER REFERENCES currencies(id),
    
    -- Sorting and display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 2. VENDOR TYPES (Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Type behavior
    affects_inventory BOOLEAN DEFAULT true,      -- Does it affect stock?
    creates_asset BOOLEAN DEFAULT false,         -- Does it create fixed asset?
    journal_template_code VARCHAR(20),           -- Template for journal entries
    
    -- Default accounts
    default_payable_account_id INTEGER REFERENCES accounts(id),
    default_expense_account_id INTEGER REFERENCES accounts(id),
    default_asset_account_id INTEGER REFERENCES accounts(id),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 3. VENDOR STATUSES (Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_statuses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_ar VARCHAR(50),
    description TEXT,
    description_ar TEXT,
    
    -- Status behavior
    color VARCHAR(20) DEFAULT 'gray',
    allows_purchase_orders BOOLEAN DEFAULT true,
    allows_invoices BOOLEAN DEFAULT true,
    allows_payments BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 4. PAYMENT TERMS FOR VENDORS (Ø´Ø±ÙˆØ· Ø§Ù„Ø¯ÙØ¹)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_payment_terms (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Term details
    payment_type VARCHAR(20) NOT NULL,  -- cash, credit, installments
    due_days INTEGER DEFAULT 0,         -- Net days
    discount_days INTEGER DEFAULT 0,    -- Discount if paid within X days
    discount_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Installments (if payment_type = 'installments')
    installment_count INTEGER,
    installment_interval_days INTEGER,
    
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 5. DELIVERY TERMS (Ø´Ø±ÙˆØ· Ø§Ù„ØªØ³Ù„ÙŠÙ… - Incoterms)
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_terms (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Incoterm type
    incoterm_code VARCHAR(10),  -- EXW, FOB, CIF, DDP, etc.
    delivery_location VARCHAR(50), -- company_warehouse, port, vendor_door
    
    -- Responsibility
    freight_responsibility VARCHAR(20),  -- vendor, buyer
    insurance_responsibility VARCHAR(20), -- vendor, buyer
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 6. SUPPLY TERMS (Ø´Ø±ÙˆØ· Ø§Ù„ØªÙˆØ±ÙŠØ¯)
-- =============================================
CREATE TABLE IF NOT EXISTS supply_terms (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Supply type
    supply_type VARCHAR(20) NOT NULL, -- full, partial, shipment
    allows_partial_delivery BOOLEAN DEFAULT false,
    min_delivery_percent DECIMAL(5,2),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 7. CONTRACT TYPES (Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø¹Ù‚ÙˆØ¯)
-- =============================================
CREATE TABLE IF NOT EXISTS contract_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Type settings
    duration_type VARCHAR(20) NOT NULL, -- annual, shipment, project
    requires_approval BOOLEAN DEFAULT true,
    approval_workflow_code VARCHAR(50),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 8. CONTRACT STATUSES (Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø¹Ù‚ÙˆØ¯)
-- =============================================
CREATE TABLE IF NOT EXISTS contract_statuses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_ar VARCHAR(50),
    description TEXT,
    
    -- Status behavior
    color VARCHAR(20) DEFAULT 'gray',
    allows_purchase_orders BOOLEAN DEFAULT false,
    is_terminal BOOLEAN DEFAULT false, -- ended, cancelled
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 9. PURCHASE ORDER TYPES (Ø£Ù†ÙˆØ§Ø¹ Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_order_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    
    -- Type behavior
    affects_inventory BOOLEAN DEFAULT true,
    requires_grn BOOLEAN DEFAULT true,           -- Goods Receipt Note
    creates_asset BOOLEAN DEFAULT false,
    
    -- Numbering
    number_series_id INTEGER REFERENCES numbering_series(id),
    
    -- Default accounts
    default_expense_account_id INTEGER REFERENCES accounts(id),
    default_asset_account_id INTEGER REFERENCES accounts(id),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 10. PURCHASE ORDER STATUSES
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_order_statuses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_ar VARCHAR(50),
    
    color VARCHAR(20) DEFAULT 'gray',
    allows_edit BOOLEAN DEFAULT true,
    allows_delete BOOLEAN DEFAULT true,
    allows_receive BOOLEAN DEFAULT false,
    allows_invoice BOOLEAN DEFAULT false,
    is_terminal BOOLEAN DEFAULT false,
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 11. VENDOR PRICE LISTS (Ù‚ÙˆØ§Ø¦Ù… Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_price_lists (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    
    -- Validity
    currency_id INTEGER REFERENCES currencies(id),
    valid_from DATE NOT NULL,
    valid_to DATE,
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    min_order_qty DECIMAL(18,4),
    min_order_value DECIMAL(18,4),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, expired, draft
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- =============================================
-- 12. VENDOR PRICE LIST ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL REFERENCES vendor_price_lists(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    unit_price DECIMAL(18,4) NOT NULL,
    min_qty DECIMAL(18,4) DEFAULT 1,
    max_qty DECIMAL(18,4),
    
    -- Tiered pricing
    tier_2_qty DECIMAL(18,4),
    tier_2_price DECIMAL(18,4),
    tier_3_qty DECIMAL(18,4),
    tier_3_price DECIMAL(18,4),
    
    lead_time_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(price_list_id, item_id, uom_id)
);

-- =============================================
-- 13. VENDOR QUOTATIONS (Ø¹Ø±ÙˆØ¶ Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_quotations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    quotation_number VARCHAR(50) NOT NULL,
    quotation_date DATE NOT NULL,
    
    -- Reference
    rfq_number VARCHAR(50),  -- Request for Quotation
    rfq_date DATE,
    
    -- Validity
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Terms
    payment_terms_id INTEGER REFERENCES vendor_payment_terms(id),
    delivery_terms_id INTEGER REFERENCES delivery_terms(id),
    delivery_days INTEGER,
    
    -- Totals
    subtotal DECIMAL(18,4) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, expired, accepted, rejected
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, quotation_number)
);

-- =============================================
-- 14. VENDOR QUOTATION ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES vendor_quotations(id) ON DELETE CASCADE,
    
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    
    line_total DECIMAL(18,4) NOT NULL,
    
    lead_time_days INTEGER,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 15. VENDOR CONTRACTS (Ø¹Ù‚ÙˆØ¯ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_contracts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    contract_number VARCHAR(50) NOT NULL,
    contract_type_id INTEGER REFERENCES contract_types(id),
    
    -- Dates
    contract_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Value
    currency_id INTEGER REFERENCES currencies(id),
    total_value DECIMAL(18,4),
    consumed_value DECIMAL(18,4) DEFAULT 0,
    
    -- Terms
    payment_terms_id INTEGER REFERENCES vendor_payment_terms(id),
    delivery_terms_id INTEGER REFERENCES delivery_terms(id),
    supply_terms_id INTEGER REFERENCES supply_terms(id),
    
    -- Status
    status_id INTEGER REFERENCES contract_statuses(id),
    
    -- Approval
    requires_approval BOOLEAN DEFAULT true,
    approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Document
    description TEXT,
    terms_and_conditions TEXT,
    attachment_url TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, contract_number)
);

-- =============================================
-- 16. VENDOR CONTRACT ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_contract_items (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES vendor_contracts(id) ON DELETE CASCADE,
    
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    contracted_qty DECIMAL(18,4) NOT NULL,
    delivered_qty DECIMAL(18,4) DEFAULT 0,
    unit_price DECIMAL(18,4) NOT NULL,
    
    line_total DECIMAL(18,4) NOT NULL,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 17. PURCHASE ORDERS (Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Order identification
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    
    -- Vendor
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    vendor_code VARCHAR(50),
    vendor_name VARCHAR(200),
    
    -- Type
    order_type_id INTEGER REFERENCES purchase_order_types(id),
    
    -- Contract reference (optional)
    contract_id INTEGER REFERENCES vendor_contracts(id),
    quotation_id INTEGER REFERENCES vendor_quotations(id),
    
    -- Warehouse for receipt
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Terms
    payment_terms_id INTEGER REFERENCES vendor_payment_terms(id),
    delivery_terms_id INTEGER REFERENCES delivery_terms(id),
    supply_terms_id INTEGER REFERENCES supply_terms(id),
    
    -- Totals
    subtotal DECIMAL(18,4) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    freight_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Receipt tracking
    received_amount DECIMAL(18,4) DEFAULT 0,
    invoiced_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Status
    status_id INTEGER REFERENCES purchase_order_statuses(id),
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, approved, partially_received, received, closed, cancelled
    
    -- Approval
    requires_approval BOOLEAN DEFAULT true,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Shipping
    ship_to_address TEXT,
    
    notes TEXT,
    internal_notes TEXT,
    
    -- Cost center
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, order_number)
);

-- =============================================
-- 18. PURCHASE ORDER ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    item_name_ar VARCHAR(200),
    
    -- Quantity & UOM
    uom_id INTEGER REFERENCES units_of_measure(id),
    ordered_qty DECIMAL(18,4) NOT NULL,
    received_qty DECIMAL(18,4) DEFAULT 0,
    invoiced_qty DECIMAL(18,4) DEFAULT 0,
    
    -- Pricing
    unit_price DECIMAL(18,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Totals
    line_total DECIMAL(18,4) NOT NULL,
    
    -- Warehouse override
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    -- Cost center override
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    -- Account override
    expense_account_id INTEGER REFERENCES accounts(id),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 19. GOODS RECEIPT NOTE (Ø³Ù†Ø¯ Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø©)
-- =============================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,
    
    -- Source
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    
    -- Warehouse
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    
    -- Document reference
    vendor_delivery_note VARCHAR(50),
    vendor_invoice_number VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, cancelled
    
    -- Journal
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, receipt_number)
);

-- =============================================
-- 20. GOODS RECEIPT ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    
    purchase_order_item_id INTEGER REFERENCES purchase_order_items(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    received_qty DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(50),
    serial_numbers TEXT[],
    expiry_date DATE,
    
    -- Location
    warehouse_id INTEGER REFERENCES warehouses(id),
    bin_location VARCHAR(50),
    
    -- Quality
    inspection_status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 21. PURCHASE INVOICES (ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    -- Vendor
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    vendor_code VARCHAR(50),
    vendor_name VARCHAR(200),
    
    -- Reference
    vendor_invoice_number VARCHAR(50),
    vendor_invoice_date DATE,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    goods_receipt_id INTEGER REFERENCES goods_receipts(id),
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Payment terms
    payment_terms_id INTEGER REFERENCES vendor_payment_terms(id),
    
    -- Totals
    subtotal DECIMAL(18,4) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    freight_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Payment tracking
    paid_amount DECIMAL(18,4) DEFAULT 0,
    balance DECIMAL(18,4) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, partially_paid, paid, cancelled
    
    -- Journal
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    -- Cost center
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, invoice_number)
);

-- =============================================
-- 22. PURCHASE INVOICE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    purchase_order_item_id INTEGER REFERENCES purchase_order_items(id),
    goods_receipt_item_id INTEGER REFERENCES goods_receipt_items(id),
    
    item_id INTEGER REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    -- For services/expenses
    expense_account_id INTEGER REFERENCES accounts(id),
    description TEXT,
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    
    line_total DECIMAL(18,4) NOT NULL,
    
    -- Cost center override
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 23. PURCHASE RETURNS (Ù…Ø±ØªØ¬Ø¹Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_returns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    return_number VARCHAR(50) NOT NULL,
    return_date DATE NOT NULL,
    
    -- Vendor
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    vendor_code VARCHAR(50),
    vendor_name VARCHAR(200),
    
    -- Reference
    purchase_invoice_id INTEGER REFERENCES purchase_invoices(id),
    goods_receipt_id INTEGER REFERENCES goods_receipts(id),
    
    -- Warehouse
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Totals
    subtotal DECIMAL(18,4) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Reason
    return_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, cancelled
    
    -- Journal
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, return_number)
);

-- =============================================
-- 24. PURCHASE RETURN ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    invoice_item_id INTEGER REFERENCES purchase_invoice_items(id),
    
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    
    line_total DECIMAL(18,4) NOT NULL,
    
    -- Batch/Serial
    batch_number VARCHAR(50),
    serial_numbers TEXT[],
    
    -- Location
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 25. CONTRACT APPROVAL STAGES (Ù…Ø±Ø§Ø­Ù„ Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø¹Ù‚ÙˆØ¯)
-- =============================================
CREATE TABLE IF NOT EXISTS contract_approval_stages (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    
    stage_order INTEGER NOT NULL,
    required_role VARCHAR(50),
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- 26. CONTRACT APPROVALS (Ø³Ø¬Ù„ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª)
-- =============================================
CREATE TABLE IF NOT EXISTS contract_approvals (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES vendor_contracts(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES contract_approval_stages(id),
    
    status VARCHAR(20) NOT NULL, -- pending, approved, rejected
    comments TEXT,
    
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 27. VENDOR BALANCE TRANSACTIONS (Ø­Ø±ÙƒØ§Øª Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_balance_transactions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    transaction_date DATE NOT NULL,
    
    -- Source document
    document_type VARCHAR(30) NOT NULL, -- purchase_invoice, purchase_return, payment, opening_balance
    document_id INTEGER,
    document_number VARCHAR(50),
    
    -- Amount
    currency_id INTEGER REFERENCES currencies(id),
    debit_amount DECIMAL(18,4) DEFAULT 0,   -- Payment, Return
    credit_amount DECIMAL(18,4) DEFAULT 0,  -- Invoice
    balance_after DECIMAL(18,4) NOT NULL,
    
    -- Journal reference
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    notes TEXT,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_vendor_categories_company ON vendor_categories(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_types_company ON vendor_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_statuses_company ON vendor_statuses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payment_terms_company ON vendor_payment_terms(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_terms_company ON delivery_terms(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supply_terms_company ON supply_terms(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contract_types_company ON contract_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contract_statuses_company ON contract_statuses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_types_company ON purchase_order_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_statuses_company ON purchase_order_statuses(company_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_price_lists_vendor ON vendor_price_lists(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_quotations_vendor ON vendor_quotations(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_quotations_status ON vendor_quotations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON vendor_contracts(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON vendor_contracts(status_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_company ON goods_receipts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company ON purchase_invoices(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor ON purchase_invoices(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_company ON purchase_returns(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_returns_vendor ON purchase_returns(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_balance_tx_vendor ON vendor_balance_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_balance_tx_date ON vendor_balance_transactions(transaction_date);

-- =============================================
-- ADD CATEGORY AND TYPE TO VENDORS TABLE
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'category_id') THEN
        ALTER TABLE vendors ADD COLUMN category_id INTEGER REFERENCES vendor_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'type_id') THEN
        ALTER TABLE vendors ADD COLUMN type_id INTEGER REFERENCES vendor_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'status_id') THEN
        ALTER TABLE vendors ADD COLUMN status_id INTEGER REFERENCES vendor_statuses(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'credit_limit') THEN
        ALTER TABLE vendors ADD COLUMN credit_limit DECIMAL(18,4) DEFAULT 0;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 099: Procurement module tables created successfully';
END $$;
