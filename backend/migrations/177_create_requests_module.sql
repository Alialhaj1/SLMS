-- =====================================================
-- Migration: 177_create_requests_module.sql
-- Description: My Requests Module - Complete Implementation
--              طلباتي - وحدة متكاملة لإدارة طلبات المستخدم
-- Features:
--   - Expense Requests (طلبات المصاريف)
--   - Transfer Requests (طلبات التحويل)
--   - Payment Requests (طلبات السداد)
--   - Approval Workflows (سير الموافقات)
--   - Print Templates Integration (التكامل مع قوالب الطباعة)
-- Date: 2026-01-19
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EXPENSE TYPES REFERENCE DATA (for Employee Requests)
-- NOTE: Renamed to request_expense_types to avoid conflict with shipment expense_types
-- =====================================================
CREATE TABLE IF NOT EXISTS request_expense_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Account Mapping
    default_account_id INTEGER REFERENCES accounts(id),
    
    -- Behavior Flags
    requires_shipment BOOLEAN DEFAULT true,
    requires_project BOOLEAN DEFAULT true,
    requires_vendor BOOLEAN DEFAULT true,
    requires_items BOOLEAN DEFAULT false,
    
    -- UI Settings
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, code)
);

CREATE INDEX idx_request_expense_types_company ON request_expense_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_request_expense_types_active ON request_expense_types(is_active) WHERE deleted_at IS NULL;

-- Seed Standard Expense Types
INSERT INTO request_expense_types (company_id, code, name, name_ar, requires_shipment, requires_project, requires_vendor, icon, color, sort_order, is_system) VALUES
(1, 'LC_FEES', 'LC Fees', 'رسوم اعتماد', true, true, true, 'DocumentTextIcon', 'blue', 1, true),
(1, 'CARGO_INSURANCE', 'Cargo Insurance', 'تأمين حمولة', true, true, true, 'ShieldCheckIcon', 'green', 2, true),
(1, 'SEA_FREIGHT', 'Sea Freight', 'شحن بحري', true, true, true, 'TruckIcon', 'indigo', 3, true),
(1, 'DELIVERY_ORDER', 'Delivery Order', 'إذن تسليم', true, true, true, 'DocumentIcon', 'purple', 4, true),
(1, 'CUSTOMS_DECLARATION', 'Customs Declaration', 'بيان جمركي', true, true, true, 'DocumentCheckIcon', 'red', 5, true),
(1, 'STORAGE', 'Storage', 'أرضيات', true, true, true, 'ArchiveBoxIcon', 'yellow', 6, true),
(1, 'PORT_CHARGES', 'Port Charges', 'رسوم موانئ', true, true, true, 'BuildingOfficeIcon', 'orange', 7, true),
(1, 'UNLOADING', 'Unloading', 'تفريغ', true, true, true, 'ArrowDownTrayIcon', 'pink', 8, true),
(1, 'CUSTOMS_INSPECTION', 'Customs Inspection', 'معاينة جمركية', true, true, true, 'EyeIcon', 'cyan', 9, true),
(1, 'CONTAINER_DELAY_PICKUP', 'Container Delay Pickup', 'تأخير استلام حاويات', true, true, true, 'ClockIcon', 'red', 10, true),
(1, 'CUSTOMS_CLEARANCE', 'Customs Clearance', 'تخليص جمركي', true, true, true, 'CheckBadgeIcon', 'green', 11, true),
(1, 'TRANSPORT', 'Transport', 'نقل', true, true, true, 'TruckIcon', 'blue', 12, true),
(1, 'LOADING_UNLOADING', 'Loading & Unloading', 'تحميل وتنزيل', true, true, true, 'ArrowsRightLeftIcon', 'purple', 13, true),
(1, 'SAMPLE_TESTING', 'Sample Testing', 'فحص عينات', true, true, true, 'BeakerIcon', 'indigo', 14, true),
(1, 'SABER_CERTIFICATE', 'SABER Certificate', 'شهادة سابر', true, true, true, 'DocumentCheckIcon', 'green', 15, true),
(1, 'CONTAINER_RETURN_DELAY', 'Container Return Delay', 'تأخير إعادة حاويات', true, true, true, 'ExclamationTriangleIcon', 'red', 16, true),
(1, 'PALLET_FINES', 'Pallet Fines', 'غرامات طبليات', true, true, false, 'BanknotesIcon', 'orange', 17, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- =====================================================
-- 2. REQUEST STATUS REFERENCE DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS request_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Workflow Stage
    stage VARCHAR(30) NOT NULL CHECK (stage IN ('draft', 'submitted', 'approved', 'rejected', 'executed', 'cancelled')),
    
    -- UI Settings
    color VARCHAR(20) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    
    -- Permissions
    allows_edit BOOLEAN DEFAULT false,
    allows_delete BOOLEAN DEFAULT false,
    allows_print BOOLEAN DEFAULT false,
    allows_submit BOOLEAN DEFAULT false,
    allows_approve BOOLEAN DEFAULT false,
    allows_execute BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Request Statuses
INSERT INTO request_statuses (code, name, name_ar, stage, color, icon, sort_order, allows_edit, allows_delete, allows_print, allows_submit) VALUES
('DRAFT', 'Draft', 'مسودة', 'draft', 'gray', 'DocumentIcon', 1, true, true, false, true),
('SUBMITTED', 'Pending Approval', 'بانتظار الموافقة', 'submitted', 'yellow', 'ClockIcon', 2, false, false, true, false),
('APPROVED', 'Approved', 'معتمد', 'approved', 'green', 'CheckCircleIcon', 3, false, false, true, false),
('REJECTED', 'Rejected', 'مرفوض', 'rejected', 'red', 'XCircleIcon', 4, false, true, true, false),
('EXECUTED', 'Executed', 'منفذ', 'executed', 'blue', 'CheckBadgeIcon', 5, false, false, true, false),
('CANCELLED', 'Cancelled', 'ملغي', 'cancelled', 'slate', 'BanIcon', 6, false, false, false, false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. EXPENSE REQUESTS (طلبات المصاريف)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Request Identification
    request_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- User Context
    requested_by INTEGER NOT NULL REFERENCES users(id),
    department_id INTEGER,  -- Optional: references departments table if it exists
    
    -- Core References (MANDATORY)
    project_id INTEGER NOT NULL REFERENCES projects(id),
    shipment_id INTEGER NOT NULL REFERENCES shipments(id),
    expense_type_id INTEGER NOT NULL REFERENCES request_expense_types(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    
    -- Shipment Details
    bl_number VARCHAR(100),                    -- Bill of Lading Number
    container_number VARCHAR(50),
    port_of_loading_id INTEGER,
    port_of_discharge_id INTEGER,
    
    -- Financial Details
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    exchange_rate_id INTEGER REFERENCES exchange_rates(id),
    exchange_rate DECIMAL(18,6) NOT NULL DEFAULT 1,
    total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_amount_local DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    -- Status & Workflow
    status_id INTEGER NOT NULL REFERENCES request_statuses(id) DEFAULT 1,
    
    -- Approval Tracking
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Notes & Attachments
    notes TEXT,
    internal_notes TEXT,                      -- For internal use only
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, request_number)
);

CREATE INDEX idx_expense_requests_company ON expense_requests(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_user ON expense_requests(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_project ON expense_requests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_shipment ON expense_requests(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_vendor ON expense_requests(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_status ON expense_requests(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_requests_date ON expense_requests(request_date DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- 4. EXPENSE REQUEST ITEMS (تفاصيل الأصناف)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_request_items (
    id SERIAL PRIMARY KEY,
    expense_request_id INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    
    -- Item Details
    item_id INTEGER,
    item_description VARCHAR(500) NOT NULL,
    item_description_ar VARCHAR(500),
    
    -- Quantity & UOM
    quantity DECIMAL(18,4) NOT NULL DEFAULT 1,
    uom_id INTEGER,
    
    -- Pricing
    unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(18,4) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(18,4) DEFAULT 0,
    line_total DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    -- Additional Info
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_request_items_request ON expense_request_items(expense_request_id);
CREATE INDEX idx_expense_request_items_item ON expense_request_items(item_id);

-- =====================================================
-- 5. EXPENSE REQUEST ATTACHMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_request_attachments (
    id SERIAL PRIMARY KEY,
    expense_request_id INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_request_attachments_request ON expense_request_attachments(expense_request_id);

-- =====================================================
-- 6. TRANSFER REQUESTS (طلبات التحويل)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfer_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Request Identification
    request_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Link to Expense Request (MANDATORY)
    expense_request_id INTEGER NOT NULL REFERENCES expense_requests(id),
    
    -- User Context
    requested_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Core References (Inherited from Expense Request)
    project_id INTEGER NOT NULL REFERENCES projects(id),
    shipment_id INTEGER NOT NULL REFERENCES shipments(id),
    expense_type_id INTEGER NOT NULL REFERENCES request_expense_types(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    
    -- Financial Details
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    transfer_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    transfer_amount_local DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    -- Transfer Details
    transfer_method VARCHAR(50) CHECK (transfer_method IN ('bank_transfer', 'cash', 'cheque', 'online')),
    transfer_date DATE,
    expected_transfer_date DATE,
    
    -- Bank Details (if bank transfer)
    bank_account_id INTEGER,
    beneficiary_name VARCHAR(200),
    beneficiary_account VARCHAR(100),
    beneficiary_bank VARCHAR(200),
    beneficiary_iban VARCHAR(50),
    swift_code VARCHAR(20),
    
    -- Status & Workflow
    status_id INTEGER NOT NULL REFERENCES request_statuses(id) DEFAULT 1,
    
    -- Approval Tracking
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Execution Tracking
    executed_at TIMESTAMPTZ,
    executed_by INTEGER REFERENCES users(id),
    transaction_reference VARCHAR(100),
    
    -- Print Tracking
    is_printed BOOLEAN DEFAULT false,
    first_printed_at TIMESTAMPTZ,
    first_printed_by INTEGER REFERENCES users(id),
    print_count INTEGER DEFAULT 0,
    last_printed_at TIMESTAMPTZ,
    last_printed_by INTEGER REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, request_number)
);

CREATE INDEX idx_transfer_requests_company ON transfer_requests(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_user ON transfer_requests(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_expense ON transfer_requests(expense_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_project ON transfer_requests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_shipment ON transfer_requests(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfer_requests_printed ON transfer_requests(is_printed) WHERE deleted_at IS NULL;

-- =====================================================
-- 7. PAYMENT REQUESTS (طلبات السداد)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Request Identification
    request_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Link to Transfer Request (MANDATORY)
    transfer_request_id INTEGER NOT NULL REFERENCES transfer_requests(id),
    expense_request_id INTEGER NOT NULL REFERENCES expense_requests(id),
    
    -- User Context
    requested_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Core References (Inherited)
    project_id INTEGER NOT NULL REFERENCES projects(id),
    shipment_id INTEGER NOT NULL REFERENCES shipments(id),
    expense_type_id INTEGER NOT NULL REFERENCES request_expense_types(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    
    -- Payment Details
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    payment_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    payment_amount_local DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    payment_method VARCHAR(50) CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'online', 'credit_card')),
    payment_date DATE,
    
    -- Bank/Payment Details
    bank_account_id INTEGER,
    cheque_number VARCHAR(50),
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(50),
    
    -- Status & Workflow
    status_id INTEGER NOT NULL REFERENCES request_statuses(id) DEFAULT 1,
    
    -- Approval Tracking
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Execution Tracking
    executed_at TIMESTAMPTZ,
    executed_by INTEGER REFERENCES users(id),
    
    -- Accounting Integration (Future)
    journal_entry_id INTEGER,
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by INTEGER REFERENCES users(id),
    
    -- Print Tracking
    is_printed BOOLEAN DEFAULT false,
    first_printed_at TIMESTAMPTZ,
    first_printed_by INTEGER REFERENCES users(id),
    print_count INTEGER DEFAULT 0,
    last_printed_at TIMESTAMPTZ,
    last_printed_by INTEGER REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, request_number)
);

CREATE INDEX idx_payment_requests_company ON payment_requests(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_user ON payment_requests(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_transfer ON payment_requests(transfer_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_expense ON payment_requests(expense_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_project ON payment_requests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_shipment ON payment_requests(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_status ON payment_requests(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_printed ON payment_requests(is_printed) WHERE deleted_at IS NULL;

-- =====================================================
-- 8. REQUEST APPROVAL HISTORY (سجل الموافقات)
-- =====================================================
CREATE TABLE IF NOT EXISTS request_approval_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Request Reference (Polymorphic)
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('expense', 'transfer', 'payment')),
    request_id INTEGER NOT NULL,
    
    -- Action Details
    action VARCHAR(30) NOT NULL CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'executed', 'cancelled', 'printed')),
    previous_status_id INTEGER REFERENCES request_statuses(id),
    new_status_id INTEGER REFERENCES request_statuses(id),
    
    -- Actor
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Details
    comments TEXT,
    rejection_reason TEXT,
    
    -- Audit Data
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_request_approval_history_type_id ON request_approval_history(request_type, request_id);
CREATE INDEX idx_request_approval_history_company ON request_approval_history(company_id);
CREATE INDEX idx_request_approval_history_user ON request_approval_history(performed_by);
CREATE INDEX idx_request_approval_history_date ON request_approval_history(performed_at DESC);

-- =====================================================
-- 9. TRIGGERS FOR AUTO-NUMBERING
-- =====================================================

-- Auto-generate Expense Request Number
CREATE OR REPLACE FUNCTION generate_expense_request_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    new_number VARCHAR(50);
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        -- Get next sequence for company
        SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_seq
        FROM expense_requests
        WHERE company_id = NEW.company_id
        AND deleted_at IS NULL;
        
        -- Format: EXP-2026-00001
        new_number := 'EXP-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_seq::TEXT, 5, '0');
        NEW.request_number := new_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_request_number
    BEFORE INSERT ON expense_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_expense_request_number();

-- Auto-generate Transfer Request Number
CREATE OR REPLACE FUNCTION generate_transfer_request_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    new_number VARCHAR(50);
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_seq
        FROM transfer_requests
        WHERE company_id = NEW.company_id
        AND deleted_at IS NULL;
        
        -- Format: TRF-2026-00001
        new_number := 'TRF-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_seq::TEXT, 5, '0');
        NEW.request_number := new_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transfer_request_number
    BEFORE INSERT ON transfer_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_transfer_request_number();

-- Auto-generate Payment Request Number
CREATE OR REPLACE FUNCTION generate_payment_request_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    new_number VARCHAR(50);
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_seq
        FROM payment_requests
        WHERE company_id = NEW.company_id
        AND deleted_at IS NULL;
        
        -- Format: PAY-2026-00001
        new_number := 'PAY-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_seq::TEXT, 5, '0');
        NEW.request_number := new_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_request_number
    BEFORE INSERT ON payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_request_number();

-- =====================================================
-- 10. TRIGGER FOR APPROVAL HISTORY LOGGING
-- =====================================================
CREATE OR REPLACE FUNCTION log_request_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO request_approval_history (
            company_id, request_type, request_id, action,
            new_status_id, performed_by, comments
        ) VALUES (
            NEW.company_id,
            CASE TG_TABLE_NAME
                WHEN 'expense_requests' THEN 'expense'
                WHEN 'transfer_requests' THEN 'transfer'
                WHEN 'payment_requests' THEN 'payment'
            END,
            NEW.id,
            'created',
            NEW.status_id,
            NEW.created_by,
            'Request created'
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status_id != NEW.status_id THEN
        INSERT INTO request_approval_history (
            company_id, request_type, request_id, action,
            previous_status_id, new_status_id, performed_by, comments
        ) VALUES (
            NEW.company_id,
            CASE TG_TABLE_NAME
                WHEN 'expense_requests' THEN 'expense'
                WHEN 'transfer_requests' THEN 'transfer'
                WHEN 'payment_requests' THEN 'payment'
            END,
            NEW.id,
            CASE (SELECT stage FROM request_statuses WHERE id = NEW.status_id)
                WHEN 'submitted' THEN 'submitted'
                WHEN 'approved' THEN 'approved'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'executed' THEN 'executed'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'updated'
            END,
            OLD.status_id,
            NEW.status_id,
            NEW.updated_by,
            COALESCE(NEW.rejection_reason, 'Status changed')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_expense_request_approval
    AFTER INSERT OR UPDATE ON expense_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_approval();

CREATE TRIGGER trg_log_transfer_request_approval
    AFTER INSERT OR UPDATE ON transfer_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_approval();

CREATE TRIGGER trg_log_payment_request_approval
    AFTER INSERT OR UPDATE ON payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_approval();

-- =====================================================
-- 11. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_types_updated_at BEFORE UPDATE ON expense_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_expense_requests_updated_at BEFORE UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_expense_request_items_updated_at BEFORE UPDATE ON expense_request_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transfer_requests_updated_at BEFORE UPDATE ON transfer_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payment_requests_updated_at BEFORE UPDATE ON payment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. COMMENTS
-- =====================================================
COMMENT ON TABLE expense_types IS 'Reference data for expense categories (LC Fees, Insurance, Freight, etc.)';
COMMENT ON TABLE request_statuses IS 'Workflow statuses for all request types';
COMMENT ON TABLE expense_requests IS 'Main table for expense requests linked to projects and shipments';
COMMENT ON TABLE expense_request_items IS 'Line items for expense requests (optional, for itemized expenses)';
COMMENT ON TABLE expense_request_attachments IS 'File attachments for expense requests';
COMMENT ON TABLE transfer_requests IS 'Transfer requests for approved expenses';
COMMENT ON TABLE payment_requests IS 'Payment requests for executed transfers';
COMMENT ON TABLE request_approval_history IS 'Complete audit trail of all request actions';

COMMIT;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

