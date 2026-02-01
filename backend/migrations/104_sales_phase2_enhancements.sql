-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 104: PRE-PHASE 2 ENHANCEMENTS + SALES CORE DOCUMENTS          ║
-- ║  Credit Policy, Price Source, Inventory Reservation, Sales Documents     ║
-- ╠═══════════════════════════════════════════════════════════════════════════╣
-- ║  🎯 PURPOSE:                                                              ║
-- ║  - Customer credit policy (STRICT/SOFT/IGNORE)                           ║
-- ║  - Price source tracking for audit                                        ║
-- ║  - Inventory reservation policy                                           ║
-- ║  - Sales Quotations, Orders, Delivery Notes, Invoices, Returns            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ CREDIT POLICY ENHANCEMENT
-- ═══════════════════════════════════════════════════════════════════════════

-- Add credit_policy to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS credit_policy VARCHAR(20) DEFAULT 'SOFT'
CHECK (credit_policy IN ('STRICT', 'SOFT', 'IGNORE'));

COMMENT ON COLUMN customers.credit_policy IS 
'STRICT=Block if exceeded, SOFT=Allow with approval, IGNORE=No credit check';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ INVENTORY RESERVATION POLICY
-- ═══════════════════════════════════════════════════════════════════════════

-- Add to sales_settings
ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS inventory_reservation_policy VARCHAR(30) DEFAULT 'RESERVE_ON_SO'
CHECK (inventory_reservation_policy IN ('RESERVE_ON_SO', 'RESERVE_ON_DN', 'NO_RESERVATION'));

ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS allow_over_selling BOOLEAN DEFAULT false;

ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS check_available_stock BOOLEAN DEFAULT true;

-- Default GL Account References
ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS default_ar_account_id INTEGER REFERENCES accounts(id);

ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS default_revenue_account_id INTEGER REFERENCES accounts(id);

ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS default_tax_payable_account_id INTEGER REFERENCES accounts(id);

ALTER TABLE sales_settings
ADD COLUMN IF NOT EXISTS default_cost_of_goods_account_id INTEGER REFERENCES accounts(id);

COMMENT ON COLUMN sales_settings.inventory_reservation_policy IS 
'RESERVE_ON_SO=Reserve when SO approved, RESERVE_ON_DN=Reserve at delivery, NO_RESERVATION=No auto-reserve';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ SALES DOCUMENT STATUSES (Unified for all sales documents)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_document_statuses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    document_type VARCHAR(30) NOT NULL, -- 'quotation', 'order', 'delivery_note', 'invoice', 'return'
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    color VARCHAR(20) DEFAULT '#6b7280',
    
    -- State machine flags
    is_initial BOOLEAN DEFAULT false,
    is_final BOOLEAN DEFAULT false,
    allows_edit BOOLEAN DEFAULT true,
    allows_delete BOOLEAN DEFAULT true,
    
    -- Document-specific permissions
    allows_conversion BOOLEAN DEFAULT false, -- Can convert to next document
    allows_invoicing BOOLEAN DEFAULT false,
    allows_delivery BOOLEAN DEFAULT false,
    allows_return BOOLEAN DEFAULT false,
    
    -- Workflow
    requires_approval BOOLEAN DEFAULT false,
    
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, document_type, code)
);

-- Insert default statuses for all sales document types
INSERT INTO sales_document_statuses (company_id, document_type, code, name, name_ar, color, is_initial, is_final, allows_edit, allows_delete, allows_conversion, requires_approval, sort_order, is_system)
SELECT c.id, s.document_type, s.code, s.name, s.name_ar, s.color, s.is_initial, s.is_final, s.allows_edit, s.allows_delete, s.allows_conversion, s.requires_approval, s.sort_order, true
FROM companies c
CROSS JOIN (VALUES
    -- Quotation statuses
    ('quotation', 'DRAFT', 'Draft', 'مسودة', '#6b7280', true, false, true, true, false, false, 1),
    ('quotation', 'SENT', 'Sent to Customer', 'مرسل للعميل', '#3b82f6', false, false, false, false, true, false, 2),
    ('quotation', 'ACCEPTED', 'Accepted', 'مقبول', '#22c55e', false, false, false, false, true, false, 3),
    ('quotation', 'REJECTED', 'Rejected', 'مرفوض', '#ef4444', false, true, false, false, false, false, 4),
    ('quotation', 'EXPIRED', 'Expired', 'منتهي الصلاحية', '#9ca3af', false, true, false, false, false, false, 5),
    ('quotation', 'CONVERTED', 'Converted to Order', 'محول لأمر بيع', '#8b5cf6', false, true, false, false, false, false, 6),
    
    -- Sales Order statuses
    ('order', 'DRAFT', 'Draft', 'مسودة', '#6b7280', true, false, true, true, false, false, 1),
    ('order', 'PENDING_APPROVAL', 'Pending Approval', 'بانتظار الموافقة', '#f59e0b', false, false, false, false, false, true, 2),
    ('order', 'APPROVED', 'Approved', 'معتمد', '#22c55e', false, false, false, false, true, false, 3),
    ('order', 'CONFIRMED', 'Confirmed', 'مؤكد', '#3b82f6', false, false, false, false, true, false, 4),
    ('order', 'PARTIALLY_DELIVERED', 'Partially Delivered', 'تم التسليم جزئياً', '#8b5cf6', false, false, false, false, true, false, 5),
    ('order', 'DELIVERED', 'Fully Delivered', 'تم التسليم بالكامل', '#10b981', false, false, false, false, true, false, 6),
    ('order', 'INVOICED', 'Invoiced', 'تم الفوترة', '#6366f1', false, true, false, false, false, false, 7),
    ('order', 'CANCELLED', 'Cancelled', 'ملغي', '#ef4444', false, true, false, false, false, false, 8),
    
    -- Delivery Note statuses
    ('delivery_note', 'DRAFT', 'Draft', 'مسودة', '#6b7280', true, false, true, true, false, false, 1),
    ('delivery_note', 'READY', 'Ready for Dispatch', 'جاهز للشحن', '#f59e0b', false, false, false, false, false, false, 2),
    ('delivery_note', 'DISPATCHED', 'Dispatched', 'تم الإرسال', '#3b82f6', false, false, false, false, true, false, 3),
    ('delivery_note', 'DELIVERED', 'Delivered', 'تم التسليم', '#22c55e', false, false, false, false, true, false, 4),
    ('delivery_note', 'INVOICED', 'Invoiced', 'تم الفوترة', '#6366f1', false, true, false, false, false, false, 5),
    
    -- Sales Invoice statuses
    ('invoice', 'DRAFT', 'Draft', 'مسودة', '#6b7280', true, false, true, true, false, false, 1),
    ('invoice', 'PENDING_APPROVAL', 'Pending Approval', 'بانتظار الموافقة', '#f59e0b', false, false, false, false, false, true, 2),
    ('invoice', 'APPROVED', 'Approved', 'معتمد', '#22c55e', false, false, false, false, false, false, 3),
    ('invoice', 'POSTED', 'Posted', 'مرحّل', '#3b82f6', false, false, false, false, true, false, 4),
    ('invoice', 'PARTIALLY_PAID', 'Partially Paid', 'مدفوع جزئياً', '#8b5cf6', false, false, false, false, true, false, 5),
    ('invoice', 'PAID', 'Paid', 'مدفوع بالكامل', '#10b981', false, true, false, false, false, false, 6),
    ('invoice', 'VOID', 'Void', 'ملغاة', '#ef4444', false, true, false, false, false, false, 7),
    
    -- Sales Return statuses
    ('return', 'DRAFT', 'Draft', 'مسودة', '#6b7280', true, false, true, true, false, false, 1),
    ('return', 'PENDING_APPROVAL', 'Pending Approval', 'بانتظار الموافقة', '#f59e0b', false, false, false, false, false, true, 2),
    ('return', 'APPROVED', 'Approved', 'معتمد', '#22c55e', false, false, false, false, true, false, 3),
    ('return', 'RECEIVED', 'Goods Received', 'تم استلام البضاعة', '#3b82f6', false, false, false, false, true, false, 4),
    ('return', 'CREDITED', 'Credit Note Issued', 'تم إصدار إشعار دائن', '#6366f1', false, true, false, false, false, false, 5)
) AS s(document_type, code, name, name_ar, color, is_initial, is_final, allows_edit, allows_delete, allows_conversion, requires_approval, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM sales_document_statuses sds 
    WHERE sds.company_id = c.id AND sds.document_type = s.document_type AND sds.code = s.code
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ SALES QUOTATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_quotations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    quotation_number VARCHAR(50) NOT NULL,
    quotation_date DATE NOT NULL,
    valid_until DATE,
    revision_number INTEGER DEFAULT 1,
    
    -- Customer
    customer_id INTEGER REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    customer_name_ar VARCHAR(200),
    contact_person VARCHAR(200),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    
    -- Addresses
    billing_address TEXT,
    shipping_address TEXT,
    
    -- Status
    status_id INTEGER REFERENCES sales_document_statuses(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Reference
    opportunity_id INTEGER, -- Future: CRM integration
    rfq_reference VARCHAR(100), -- Customer's RFQ number
    
    -- Pricing
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    price_list_id INTEGER REFERENCES price_lists(id),
    
    -- Amounts
    subtotal NUMERIC(18,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    freight_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Terms
    payment_terms_id INTEGER,
    delivery_terms VARCHAR(100),
    warranty_terms TEXT,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    terms_and_conditions TEXT,
    
    -- Sales Team
    sales_rep_id INTEGER REFERENCES users(id),
    
    -- Workflow
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by INTEGER REFERENCES users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by VARCHAR(200), -- Customer contact name
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Conversion
    converted_to_order_id INTEGER, -- Will reference sales_orders
    converted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, quotation_number)
);

CREATE TABLE IF NOT EXISTS sales_quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES sales_quotations(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Item
    item_id INTEGER REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    item_name_ar VARCHAR(200),
    description TEXT,
    
    -- Quantity & UOM
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity NUMERIC(18,6) NOT NULL,
    
    -- Pricing
    unit_price NUMERIC(18,6) NOT NULL,
    price_source VARCHAR(30) DEFAULT 'PRICE_LIST', -- PRICE_LIST, CUSTOMER_SPECIAL, PROMOTION, MANUAL_OVERRIDE
    original_price NUMERIC(18,6), -- For tracking discounts
    
    -- Discounts
    discount_percent NUMERIC(8,4) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate NUMERIC(8,4) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Totals
    line_total NUMERIC(18,2) NOT NULL,
    
    -- Delivery
    requested_date DATE,
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(quotation_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotations_company ON sales_quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_customer ON sales_quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_status ON sales_quotations(status);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_date ON sales_quotations(quotation_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ SALES ORDERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    requested_delivery_date DATE,
    promised_delivery_date DATE,
    
    -- Customer
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    customer_name_ar VARCHAR(200),
    customer_po_number VARCHAR(100), -- Customer's PO reference
    
    -- Addresses
    billing_address TEXT,
    shipping_address TEXT,
    
    -- Status
    status_id INTEGER REFERENCES sales_document_statuses(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Reference
    quotation_id INTEGER REFERENCES sales_quotations(id),
    quotation_number VARCHAR(50),
    
    -- Credit Check Results (stored at order time)
    credit_check_passed BOOLEAN,
    credit_check_result JSONB, -- Stores full credit check response
    credit_approved_by INTEGER REFERENCES users(id),
    credit_approved_at TIMESTAMP WITH TIME ZONE,
    credit_override_reason TEXT,
    
    -- Pricing
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    price_list_id INTEGER REFERENCES price_lists(id),
    
    -- Amounts
    subtotal NUMERIC(18,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    freight_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Delivery Progress
    total_qty_ordered NUMERIC(18,6) DEFAULT 0,
    total_qty_delivered NUMERIC(18,6) DEFAULT 0,
    total_qty_invoiced NUMERIC(18,6) DEFAULT 0,
    delivery_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PARTIAL, COMPLETE
    invoice_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PARTIAL, COMPLETE
    
    -- Terms
    payment_terms_id INTEGER,
    delivery_terms VARCHAR(100),
    
    -- Warehouse
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Sales Team
    sales_rep_id INTEGER REFERENCES users(id),
    cost_center_id INTEGER,
    
    -- Workflow
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    confirmed_by INTEGER REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, order_number)
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    quotation_item_id INTEGER REFERENCES sales_quotation_items(id),
    
    -- Item
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    item_name_ar VARCHAR(200),
    description TEXT,
    
    -- Quantity & UOM
    uom_id INTEGER REFERENCES units_of_measure(id),
    ordered_qty NUMERIC(18,6) NOT NULL,
    delivered_qty NUMERIC(18,6) DEFAULT 0,
    invoiced_qty NUMERIC(18,6) DEFAULT 0,
    returned_qty NUMERIC(18,6) DEFAULT 0,
    
    -- Inventory Reservation
    reserved_qty NUMERIC(18,6) DEFAULT 0,
    reservation_id INTEGER, -- Reference to inventory_reservations
    
    -- Pricing
    unit_price NUMERIC(18,6) NOT NULL,
    price_source VARCHAR(30) DEFAULT 'PRICE_LIST',
    original_price NUMERIC(18,6),
    cost_price NUMERIC(18,6), -- For margin calculation
    
    -- Discounts
    discount_percent NUMERIC(8,4) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate NUMERIC(8,4) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Totals
    line_total NUMERIC(18,2) NOT NULL,
    
    -- Delivery
    requested_date DATE,
    promised_date DATE,
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    -- Revenue Account
    revenue_account_id INTEGER REFERENCES accounts(id),
    cost_center_id INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(order_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_item ON sales_order_items(item_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ DELIVERY NOTES (Goods Issue)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS delivery_notes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    delivery_number VARCHAR(50) NOT NULL,
    delivery_date DATE NOT NULL,
    
    -- Customer
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    
    -- Reference
    sales_order_id INTEGER REFERENCES sales_orders(id),
    order_number VARCHAR(50),
    
    -- Status
    status_id INTEGER REFERENCES sales_document_statuses(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Shipping
    shipping_address TEXT,
    ship_via VARCHAR(100),
    carrier_name VARCHAR(200),
    tracking_number VARCHAR(100),
    
    -- Warehouse
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    
    -- Inventory
    inventory_posted BOOLEAN DEFAULT false,
    inventory_posted_at TIMESTAMP WITH TIME ZONE,
    inventory_posted_by INTEGER REFERENCES users(id),
    
    -- Amounts (for reference, not accounting)
    subtotal NUMERIC(18,2) DEFAULT 0,
    
    -- Delivery Info
    driver_name VARCHAR(200),
    vehicle_number VARCHAR(50),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(200),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Invoice Reference
    invoiced BOOLEAN DEFAULT false,
    invoice_id INTEGER, -- Will reference sales_invoices
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, delivery_number)
);

CREATE TABLE IF NOT EXISTS delivery_note_items (
    id SERIAL PRIMARY KEY,
    delivery_note_id INTEGER NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    sales_order_item_id INTEGER REFERENCES sales_order_items(id),
    
    -- Item
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    -- Quantity
    uom_id INTEGER REFERENCES units_of_measure(id),
    ordered_qty NUMERIC(18,6), -- From SO
    delivered_qty NUMERIC(18,6) NOT NULL, -- Actual delivery
    
    -- Pricing (for reference)
    unit_price NUMERIC(18,6),
    line_total NUMERIC(18,2),
    
    -- Warehouse & Location
    warehouse_id INTEGER REFERENCES warehouses(id),
    bin_location VARCHAR(50),
    
    -- Batch/Serial
    batch_number VARCHAR(100),
    serial_numbers TEXT[], -- Array of serial numbers
    
    -- Inventory Transaction Reference
    inventory_transaction_id INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(delivery_note_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_company ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_order ON delivery_notes(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ SALES INVOICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Customer
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    customer_name_ar VARCHAR(200),
    tax_registration_number VARCHAR(50),
    
    -- Addresses
    billing_address TEXT,
    shipping_address TEXT,
    
    -- Status
    status_id INTEGER REFERENCES sales_document_statuses(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Reference
    sales_order_id INTEGER REFERENCES sales_orders(id),
    order_number VARCHAR(50),
    delivery_note_id INTEGER REFERENCES delivery_notes(id),
    delivery_number VARCHAR(50),
    
    -- Pricing
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    
    -- Amounts
    subtotal NUMERIC(18,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    freight_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Payment
    paid_amount NUMERIC(18,2) DEFAULT 0,
    balance_due NUMERIC(18,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Terms
    payment_terms_id INTEGER,
    
    -- Accounting
    posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMP WITH TIME ZONE,
    posted_by INTEGER REFERENCES users(id),
    journal_entry_id INTEGER, -- Reference to journal_entries
    
    -- AR Account
    receivable_account_id INTEGER REFERENCES accounts(id),
    revenue_account_id INTEGER REFERENCES accounts(id),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Sales Team
    sales_rep_id INTEGER REFERENCES users(id),
    cost_center_id INTEGER,
    
    -- Workflow
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    voided BOOLEAN DEFAULT false,
    voided_by INTEGER REFERENCES users(id),
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    
    -- E-Invoice (for government reporting)
    einvoice_uuid VARCHAR(100),
    einvoice_hash VARCHAR(500),
    einvoice_qr TEXT,
    einvoice_submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    sales_order_item_id INTEGER REFERENCES sales_order_items(id),
    delivery_note_item_id INTEGER REFERENCES delivery_note_items(id),
    
    -- Item
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    item_name_ar VARCHAR(200),
    description TEXT,
    
    -- Quantity
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity NUMERIC(18,6) NOT NULL,
    
    -- Pricing
    unit_price NUMERIC(18,6) NOT NULL,
    price_source VARCHAR(30) DEFAULT 'PRICE_LIST',
    original_price NUMERIC(18,6),
    cost_price NUMERIC(18,6),
    
    -- Discounts
    discount_percent NUMERIC(8,4) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_code VARCHAR(20),
    tax_rate NUMERIC(8,4) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Totals
    line_total NUMERIC(18,2) NOT NULL,
    
    -- Revenue Account
    revenue_account_id INTEGER REFERENCES accounts(id),
    cost_center_id INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_company ON sales_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date ON sales_invoices(due_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ SALES RETURNS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_returns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    return_number VARCHAR(50) NOT NULL,
    return_date DATE NOT NULL,
    
    -- Customer
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    
    -- Status
    status_id INTEGER REFERENCES sales_document_statuses(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Reference
    sales_invoice_id INTEGER REFERENCES sales_invoices(id),
    invoice_number VARCHAR(50),
    sales_order_id INTEGER REFERENCES sales_orders(id),
    order_number VARCHAR(50),
    
    -- Return Reason
    return_reason_code VARCHAR(30),
    return_reason TEXT,
    
    -- Warehouse
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    -- Amounts
    subtotal NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Inventory
    inventory_received BOOLEAN DEFAULT false,
    inventory_received_at TIMESTAMP WITH TIME ZONE,
    inventory_received_by INTEGER REFERENCES users(id),
    
    -- Credit Note Reference
    credit_note_id INTEGER, -- Will self-reference or separate table
    credit_note_number VARCHAR(50),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Workflow
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, return_number)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    invoice_item_id INTEGER REFERENCES sales_invoice_items(id),
    
    -- Item
    item_id INTEGER NOT NULL REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    -- Quantity
    uom_id INTEGER REFERENCES units_of_measure(id),
    invoiced_qty NUMERIC(18,6), -- Original invoice qty
    returned_qty NUMERIC(18,6) NOT NULL, -- Qty being returned
    received_qty NUMERIC(18,6) DEFAULT 0, -- Actually received
    
    -- Condition
    item_condition VARCHAR(30) DEFAULT 'GOOD', -- GOOD, DAMAGED, DEFECTIVE
    
    -- Pricing (from original invoice)
    unit_price NUMERIC(18,6) NOT NULL,
    discount_percent NUMERIC(8,4) DEFAULT 0,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate NUMERIC(8,4) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Totals
    line_total NUMERIC(18,2) NOT NULL,
    
    -- Warehouse
    warehouse_id INTEGER REFERENCES warehouses(id),
    bin_location VARCHAR(50),
    
    -- Batch/Serial
    batch_number VARCHAR(100),
    serial_numbers TEXT[],
    
    -- Inventory Transaction
    inventory_transaction_id INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(return_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_company ON sales_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(sales_invoice_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ CREDIT NOTES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    credit_note_number VARCHAR(50) NOT NULL,
    credit_note_date DATE NOT NULL,
    
    -- Customer
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    
    -- Status
    status VARCHAR(30) DEFAULT 'DRAFT', -- DRAFT, APPROVED, POSTED, APPLIED, VOID
    
    -- Reference
    sales_return_id INTEGER REFERENCES sales_returns(id),
    return_number VARCHAR(50),
    sales_invoice_id INTEGER REFERENCES sales_invoices(id),
    invoice_number VARCHAR(50),
    
    -- Credit Note Type
    credit_type VARCHAR(30) NOT NULL, -- RETURN, PRICE_ADJUSTMENT, GOODWILL, CORRECTION
    
    -- Currency
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    
    -- Amounts
    subtotal NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    applied_amount NUMERIC(18,2) DEFAULT 0,
    balance NUMERIC(18,2) GENERATED ALWAYS AS (total_amount - applied_amount) STORED,
    
    -- Accounting
    posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMP WITH TIME ZONE,
    posted_by INTEGER REFERENCES users(id),
    journal_entry_id INTEGER,
    
    receivable_account_id INTEGER REFERENCES accounts(id),
    
    -- Notes
    reason TEXT,
    notes TEXT,
    internal_notes TEXT,
    
    -- Workflow
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    voided_by INTEGER REFERENCES users(id),
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(company_id, credit_note_number)
);

CREATE TABLE IF NOT EXISTS credit_note_items (
    id SERIAL PRIMARY KEY,
    credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    return_item_id INTEGER REFERENCES sales_return_items(id),
    invoice_item_id INTEGER REFERENCES sales_invoice_items(id),
    
    -- Item (optional for non-item credits)
    item_id INTEGER REFERENCES items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    description TEXT,
    
    -- Quantity
    uom_id INTEGER REFERENCES units_of_measure(id),
    quantity NUMERIC(18,6),
    
    -- Pricing
    unit_price NUMERIC(18,6),
    
    -- Tax
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    tax_rate NUMERIC(8,4) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    
    -- Totals
    line_total NUMERIC(18,2) NOT NULL,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(credit_note_id, line_number)
);

-- Track credit note application to invoices
CREATE TABLE IF NOT EXISTS credit_note_applications (
    id SERIAL PRIMARY KEY,
    credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id),
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
    
    applied_amount NUMERIC(18,2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by INTEGER REFERENCES users(id),
    
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON credit_notes(customer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟 INVENTORY RESERVATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- What is reserved
    item_id INTEGER NOT NULL REFERENCES items(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    uom_id INTEGER REFERENCES units_of_measure(id),
    
    -- Quantity
    reserved_qty NUMERIC(18,6) NOT NULL,
    fulfilled_qty NUMERIC(18,6) DEFAULT 0,
    remaining_qty NUMERIC(18,6) GENERATED ALWAYS AS (reserved_qty - fulfilled_qty) STORED,
    
    -- Source document
    source_type VARCHAR(30) NOT NULL, -- 'sales_order', 'production_order', 'transfer'
    source_id INTEGER NOT NULL,
    source_line_id INTEGER,
    source_number VARCHAR(50),
    
    -- Customer (for sales)
    customer_id INTEGER REFERENCES customers(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, FULFILLED, CANCELLED, EXPIRED
    
    -- Validity
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_item ON inventory_reservations(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_source ON inventory_reservations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣1️⃣ PERMISSIONS FOR SALES DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description)
VALUES
    -- Sales Quotations
    ('sales_quotations:view', 'sales_quotations', 'view', 'View sales quotations'),
    ('sales_quotations:create', 'sales_quotations', 'create', 'Create sales quotations'),
    ('sales_quotations:update', 'sales_quotations', 'update', 'Update sales quotations'),
    ('sales_quotations:delete', 'sales_quotations', 'delete', 'Delete sales quotations'),
    ('sales_quotations:send', 'sales_quotations', 'send', 'Send quotations to customers'),
    ('sales_quotations:convert', 'sales_quotations', 'convert', 'Convert quotation to order'),
    
    -- Sales Orders
    ('sales_orders:view', 'sales_orders', 'view', 'View sales orders'),
    ('sales_orders:create', 'sales_orders', 'create', 'Create sales orders'),
    ('sales_orders:update', 'sales_orders', 'update', 'Update sales orders'),
    ('sales_orders:delete', 'sales_orders', 'delete', 'Delete sales orders'),
    ('sales_orders:approve', 'sales_orders', 'approve', 'Approve sales orders'),
    ('sales_orders:confirm', 'sales_orders', 'confirm', 'Confirm sales orders'),
    ('sales_orders:cancel', 'sales_orders', 'cancel', 'Cancel sales orders'),
    ('sales_orders:credit_override', 'sales_orders', 'credit_override', 'Override credit limit on sales orders'),
    
    -- Delivery Notes
    ('delivery_notes:view', 'delivery_notes', 'view', 'View delivery notes'),
    ('delivery_notes:create', 'delivery_notes', 'create', 'Create delivery notes'),
    ('delivery_notes:update', 'delivery_notes', 'update', 'Update delivery notes'),
    ('delivery_notes:delete', 'delivery_notes', 'delete', 'Delete delivery notes'),
    ('delivery_notes:dispatch', 'delivery_notes', 'dispatch', 'Dispatch delivery notes'),
    ('delivery_notes:post', 'delivery_notes', 'post', 'Post inventory for delivery'),
    
    -- Sales Invoices
    ('sales_invoices:view', 'sales_invoices', 'view', 'View sales invoices'),
    ('sales_invoices:create', 'sales_invoices', 'create', 'Create sales invoices'),
    ('sales_invoices:update', 'sales_invoices', 'update', 'Update sales invoices'),
    ('sales_invoices:delete', 'sales_invoices', 'delete', 'Delete sales invoices'),
    ('sales_invoices:approve', 'sales_invoices', 'approve', 'Approve sales invoices'),
    ('sales_invoices:post', 'sales_invoices', 'post', 'Post sales invoices to GL'),
    ('sales_invoices:void', 'sales_invoices', 'void', 'Void sales invoices'),
    
    -- Sales Returns
    ('sales_returns:view', 'sales_returns', 'view', 'View sales returns'),
    ('sales_returns:create', 'sales_returns', 'create', 'Create sales returns'),
    ('sales_returns:update', 'sales_returns', 'update', 'Update sales returns'),
    ('sales_returns:approve', 'sales_returns', 'approve', 'Approve sales returns'),
    ('sales_returns:receive', 'sales_returns', 'receive', 'Receive returned goods'),
    
    -- Credit Notes
    ('credit_notes:view', 'credit_notes', 'view', 'View credit notes'),
    ('credit_notes:create', 'credit_notes', 'create', 'Create credit notes'),
    ('credit_notes:approve', 'credit_notes', 'approve', 'Approve credit notes'),
    ('credit_notes:post', 'credit_notes', 'post', 'Post credit notes'),
    ('credit_notes:apply', 'credit_notes', 'apply', 'Apply credit notes to invoices'),
    
    -- Inventory Reservations
    ('inventory_reservations:view', 'inventory_reservations', 'view', 'View inventory reservations'),
    ('inventory_reservations:manage', 'inventory_reservations', 'manage', 'Manage inventory reservations')
ON CONFLICT (permission_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣2️⃣ VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Sales Order Fulfillment Summary
CREATE OR REPLACE VIEW v_sales_order_fulfillment AS
SELECT 
    so.id,
    so.company_id,
    so.order_number,
    so.order_date,
    so.customer_id,
    c.name as customer_name,
    so.status,
    so.total_amount,
    so.total_qty_ordered,
    so.total_qty_delivered,
    so.total_qty_invoiced,
    ROUND((so.total_qty_delivered / NULLIF(so.total_qty_ordered, 0)) * 100, 2) as delivery_percent,
    ROUND((so.total_qty_invoiced / NULLIF(so.total_qty_ordered, 0)) * 100, 2) as invoice_percent,
    so.delivery_status,
    so.invoice_status
FROM sales_orders so
JOIN customers c ON so.customer_id = c.id
WHERE so.deleted_at IS NULL;

-- Customer Receivables Summary
CREATE OR REPLACE VIEW v_customer_receivables AS
SELECT 
    c.id as customer_id,
    c.company_id,
    c.code as customer_code,
    c.name as customer_name,
    c.credit_limit,
    c.credit_policy,
    COALESCE(SUM(si.balance_due), 0) as total_outstanding,
    c.credit_limit - COALESCE(SUM(si.balance_due), 0) as available_credit,
    COUNT(si.id) FILTER (WHERE si.due_date < CURRENT_DATE AND si.balance_due > 0) as overdue_invoices,
    COALESCE(SUM(si.balance_due) FILTER (WHERE si.due_date < CURRENT_DATE), 0) as overdue_amount
FROM customers c
LEFT JOIN sales_invoices si ON c.id = si.customer_id 
    AND si.status IN ('POSTED', 'PARTIALLY_PAID') 
    AND si.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_id, c.code, c.name, c.credit_limit, c.credit_policy;

-- Item Availability (including reservations) - uses inventory_movements table with qty_delta column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'qty_delta') THEN
    EXECUTE '
    CREATE OR REPLACE VIEW v_item_availability AS
    SELECT 
        i.id as item_id,
        i.company_id,
        i.code as item_code,
        i.name as item_name,
        w.id as warehouse_id,
        w.name as warehouse_name,
        COALESCE(inv.qty_on_hand, 0) as qty_on_hand,
        COALESCE(res.reserved_qty, 0) as reserved_qty,
        COALESCE(inv.qty_on_hand, 0) - COALESCE(res.reserved_qty, 0) as available_qty
    FROM items i
    CROSS JOIN warehouses w
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(qty_delta), 0) as qty_on_hand
        FROM inventory_movements
        WHERE item_id = i.id AND warehouse_id = w.id
    ) inv ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(remaining_qty), 0) as reserved_qty
        FROM inventory_reservations
        WHERE item_id = i.id AND warehouse_id = w.id AND status = ''ACTIVE''
    ) res ON true
    WHERE i.deleted_at IS NULL 
      AND w.deleted_at IS NULL
      AND w.company_id = i.company_id
    ';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
