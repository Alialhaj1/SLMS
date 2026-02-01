-- =====================================================
-- MIGRATION 187: Letters of Credit (LC) Module
-- =====================================================
-- Full LC management system linked to:
-- - Banks
-- - Shipments
-- - Suppliers/Vendors
-- - Currencies
-- - Purchase Orders
-- - Projects
-- - Chart of Accounts
-- =====================================================

-- =====================================================
-- 1. LC TYPES - أنواع الاعتمادات المستندية
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_types (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    is_sight BOOLEAN DEFAULT false, -- اعتماد بالاطلاع
    is_usance BOOLEAN DEFAULT false, -- اعتماد مؤجل
    is_revolving BOOLEAN DEFAULT false, -- اعتماد متجدد
    is_transferable BOOLEAN DEFAULT false, -- اعتماد قابل للتحويل
    is_back_to_back BOOLEAN DEFAULT false, -- اعتماد ظهر بظهر
    is_red_clause BOOLEAN DEFAULT false, -- اعتماد بشرط أحمر
    is_green_clause BOOLEAN DEFAULT false, -- اعتماد بشرط أخضر
    is_standby BOOLEAN DEFAULT false, -- اعتماد ضمان
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =====================================================
-- 2. LC STATUSES - حالات الاعتماد المستندي
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_statuses (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT 'gray',
    is_initial BOOLEAN DEFAULT false,
    is_final BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =====================================================
-- 3. LETTERS OF CREDIT - الاعتمادات المستندية
-- =====================================================
CREATE TABLE IF NOT EXISTS letters_of_credit (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Basic Info
    lc_number VARCHAR(50) NOT NULL,
    lc_type_id INT REFERENCES lc_types(id),
    status_id INT REFERENCES lc_statuses(id),
    
    -- Parties
    applicant_id INT REFERENCES companies(id), -- مقدم الطلب (المستورد)
    beneficiary_vendor_id INT REFERENCES vendors(id), -- المستفيد (المورد)
    beneficiary_name VARCHAR(200), -- اسم المستفيد (إذا لم يكن في النظام)
    beneficiary_name_ar VARCHAR(200),
    beneficiary_address TEXT,
    beneficiary_country_id INT REFERENCES countries(id),
    
    -- Banks
    issuing_bank_id INT REFERENCES bank_accounts(id), -- البنك المصدر
    issuing_bank_name VARCHAR(200),
    issuing_bank_swift VARCHAR(20),
    issuing_bank_address TEXT,
    
    advising_bank_name VARCHAR(200), -- البنك المبلغ
    advising_bank_swift VARCHAR(20),
    advising_bank_country_id INT REFERENCES countries(id),
    
    confirming_bank_name VARCHAR(200), -- البنك المعزز
    confirming_bank_swift VARCHAR(20),
    is_confirmed BOOLEAN DEFAULT false, -- معزز/غير معزز
    
    -- Amounts
    currency_id INT REFERENCES currencies(id),
    original_amount DECIMAL(18,2) NOT NULL,
    current_amount DECIMAL(18,2) NOT NULL, -- after amendments
    utilized_amount DECIMAL(18,2) DEFAULT 0, -- المبلغ المستخدم
    available_amount DECIMAL(18,2) GENERATED ALWAYS AS (current_amount - utilized_amount) STORED,
    tolerance_percent DECIMAL(5,2) DEFAULT 0, -- نسبة التسامح (+ / -)
    
    -- Exchange
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    amount_in_base_currency DECIMAL(18,2),
    
    -- Dates
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    latest_shipment_date DATE,
    presentation_period_days INT DEFAULT 21, -- فترة تقديم المستندات
    
    -- Terms
    payment_terms TEXT, -- شروط الدفع
    tenor_days INT, -- مدة الأجل (لاعتمادات الأجل)
    partial_shipments VARCHAR(20) DEFAULT 'allowed', -- allowed/not_allowed
    transhipment VARCHAR(20) DEFAULT 'allowed', -- allowed/not_allowed
    
    -- Shipping Details
    port_of_loading VARCHAR(200),
    port_of_loading_id INT REFERENCES ports(id),
    port_of_discharge VARCHAR(200),
    port_of_discharge_id INT REFERENCES ports(id),
    incoterm VARCHAR(20), -- FOB, CIF, CFR, etc.
    
    -- Goods Description
    goods_description TEXT,
    quantity DECIMAL(18,4),
    unit_of_measure VARCHAR(50),
    unit_price DECIMAL(18,4),
    
    -- Linked Entities
    project_id INT REFERENCES projects(id),
    purchase_order_id INT REFERENCES purchase_orders(id),
    shipment_id INT REFERENCES logistics_shipments(id),
    -- contract_id removed - contracts table not yet created
    
    -- Documents Required
    required_documents JSONB DEFAULT '[]', -- قائمة المستندات المطلوبة
    
    -- Accounting
    expense_account_id INT REFERENCES accounts(id), -- حساب رسوم الاعتماد
    liability_account_id INT REFERENCES accounts(id), -- حساب التزامات الاعتماد
    margin_account_id INT REFERENCES accounts(id), -- حساب هامش الاعتماد
    margin_percent DECIMAL(5,2) DEFAULT 0,
    margin_amount DECIMAL(18,2) DEFAULT 0,
    
    -- Fees
    opening_commission DECIMAL(18,2) DEFAULT 0, -- عمولة فتح
    amendment_fees DECIMAL(18,2) DEFAULT 0, -- رسوم تعديل
    swift_charges DECIMAL(18,2) DEFAULT 0, -- رسوم سويفت
    other_charges DECIMAL(18,2) DEFAULT 0, -- رسوم أخرى
    total_fees DECIMAL(18,2) GENERATED ALWAYS AS (opening_commission + amendment_fees + swift_charges + other_charges) STORED,
    
    -- Alerts
    days_before_expiry_alert INT DEFAULT 30,
    days_before_shipment_alert INT DEFAULT 14,
    
    -- Notes
    special_conditions TEXT, -- شروط خاصة
    internal_notes TEXT,
    
    -- Audit
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, lc_number)
);

-- =====================================================
-- 4. LC AMENDMENTS - تعديلات الاعتماد المستندي
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_amendments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lc_id INT NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
    amendment_number INT NOT NULL,
    amendment_date DATE NOT NULL,
    
    -- What changed
    change_type VARCHAR(50) NOT NULL, -- amount, expiry, goods, beneficiary, etc.
    change_description TEXT,
    
    -- Amount changes
    previous_amount DECIMAL(18,2),
    new_amount DECIMAL(18,2),
    amount_change DECIMAL(18,2), -- positive = increase, negative = decrease
    
    -- Date changes
    previous_expiry_date DATE,
    new_expiry_date DATE,
    previous_shipment_date DATE,
    new_shipment_date DATE,
    
    -- Other changes as JSON
    previous_values JSONB,
    new_values JSONB,
    
    -- Fees
    amendment_fee DECIMAL(18,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Notes
    reason TEXT,
    bank_reference VARCHAR(100),
    
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(lc_id, amendment_number)
);

-- =====================================================
-- 5. LC DOCUMENTS - مستندات الاعتماد المستندي
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_documents (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lc_id INT NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL, -- bill_of_lading, invoice, packing_list, certificate_of_origin, etc.
    document_name VARCHAR(200) NOT NULL,
    document_name_ar VARCHAR(200),
    document_number VARCHAR(100),
    document_date DATE,
    
    -- Presentation
    presentation_date DATE,
    presentation_number INT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, received, accepted, discrepant, rejected
    discrepancy_details TEXT,
    
    -- File
    file_path VARCHAR(500),
    file_name VARCHAR(200),
    file_size INT,
    mime_type VARCHAR(100),
    
    -- Copies required
    original_copies_required INT DEFAULT 1,
    original_copies_submitted INT DEFAULT 0,
    duplicate_copies_required INT DEFAULT 0,
    duplicate_copies_submitted INT DEFAULT 0,
    
    notes TEXT,
    
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- =====================================================
-- 6. LC PAYMENTS - مدفوعات الاعتماد المستندي
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_payments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lc_id INT NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
    
    payment_number VARCHAR(50),
    payment_date DATE NOT NULL,
    payment_type VARCHAR(30) NOT NULL, -- sight_payment, deferred_payment, acceptance, negotiation
    
    -- Amount
    currency_id INT REFERENCES currencies(id),
    amount DECIMAL(18,2) NOT NULL,
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    amount_in_base_currency DECIMAL(18,2),
    
    -- Deferred payment details
    maturity_date DATE,
    acceptance_number VARCHAR(50),
    
    -- Bank details
    bank_reference VARCHAR(100),
    value_date DATE,
    
    -- Linked to shipment expense
    shipment_expense_id INT REFERENCES shipment_expenses(id),
    
    -- Journal entry
    journal_entry_id INT REFERENCES journal_entries(id),
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, processed, confirmed
    
    notes TEXT,
    
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- =====================================================
-- 7. LC ALERTS - تنبيهات الاعتماد المستندي
-- =====================================================
CREATE TABLE IF NOT EXISTS lc_alerts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lc_id INT NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(50) NOT NULL, -- expiry_warning, shipment_warning, payment_due, margin_call, etc.
    alert_date DATE NOT NULL,
    trigger_date DATE, -- تاريخ التفعيل
    
    title VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    message TEXT,
    message_ar TEXT,
    
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    
    is_read BOOLEAN DEFAULT false,
    read_by INT REFERENCES users(id),
    read_at TIMESTAMP,
    
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_by INT REFERENCES users(id),
    dismissed_at TIMESTAMP,
    
    is_sent BOOLEAN DEFAULT false, -- تم إرسال إشعار
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_company ON letters_of_credit(company_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_number ON letters_of_credit(company_id, lc_number);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_status ON letters_of_credit(status_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_expiry ON letters_of_credit(expiry_date);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_project ON letters_of_credit(project_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_po ON letters_of_credit(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_shipment ON letters_of_credit(shipment_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_vendor ON letters_of_credit(beneficiary_vendor_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_bank ON letters_of_credit(issuing_bank_id);

CREATE INDEX IF NOT EXISTS idx_lc_amendments_lc ON lc_amendments(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_documents_lc ON lc_documents(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_payments_lc ON lc_payments(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_alerts_lc ON lc_alerts(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_alerts_date ON lc_alerts(trigger_date);
CREATE INDEX IF NOT EXISTS idx_lc_alerts_unread ON lc_alerts(company_id, is_read) WHERE is_read = false;

-- =====================================================
-- 9. SEED DEFAULT LC TYPES
-- =====================================================
INSERT INTO lc_types (company_id, code, name, name_ar, is_sight, is_usance, display_order)
SELECT 
    c.id,
    t.code,
    t.name,
    t.name_ar,
    t.is_sight,
    t.is_usance,
    t.display_order
FROM companies c
CROSS JOIN (VALUES
    ('SIGHT', 'Sight LC', 'اعتماد بالاطلاع', true, false, 1),
    ('USANCE', 'Usance LC', 'اعتماد مؤجل', false, true, 2),
    ('DEFERRED', 'Deferred Payment LC', 'اعتماد دفع مؤجل', false, true, 3),
    ('REVOLVING', 'Revolving LC', 'اعتماد متجدد', false, false, 4),
    ('TRANSFERABLE', 'Transferable LC', 'اعتماد قابل للتحويل', false, false, 5),
    ('BACK_TO_BACK', 'Back-to-Back LC', 'اعتماد ظهر بظهر', false, false, 6),
    ('RED_CLAUSE', 'Red Clause LC', 'اعتماد بشرط أحمر', false, false, 7),
    ('STANDBY', 'Standby LC', 'اعتماد ضمان', false, false, 8)
) AS t(code, name, name_ar, is_sight, is_usance, display_order)
WHERE c.deleted_at IS NULL
ON CONFLICT (company_id, code) DO NOTHING;

-- =====================================================
-- 10. SEED DEFAULT LC STATUSES
-- =====================================================
INSERT INTO lc_statuses (company_id, code, name, name_ar, color, is_initial, is_final, display_order)
SELECT 
    c.id,
    s.code,
    s.name,
    s.name_ar,
    s.color,
    s.is_initial,
    s.is_final,
    s.display_order
FROM companies c
CROSS JOIN (VALUES
    ('DRAFT', 'Draft', 'مسودة', 'gray', true, false, 1),
    ('REQUESTED', 'Requested', 'مطلوب', 'blue', false, false, 2),
    ('ISSUED', 'Issued', 'صادر', 'green', false, false, 3),
    ('ADVISED', 'Advised', 'مبلغ', 'teal', false, false, 4),
    ('CONFIRMED', 'Confirmed', 'معزز', 'emerald', false, false, 5),
    ('AMENDED', 'Amended', 'معدل', 'purple', false, false, 6),
    ('DOCUMENTS_PRESENTED', 'Documents Presented', 'مستندات مقدمة', 'indigo', false, false, 7),
    ('DISCREPANT', 'Discrepant', 'به مخالفات', 'orange', false, false, 8),
    ('PAID', 'Paid', 'مدفوع', 'blue', false, false, 9),
    ('EXPIRED', 'Expired', 'منتهي', 'red', false, true, 10),
    ('CANCELLED', 'Cancelled', 'ملغي', 'red', false, true, 11),
    ('CLOSED', 'Closed', 'مغلق', 'gray', false, true, 12)
) AS s(code, name, name_ar, color, is_initial, is_final, display_order)
WHERE c.deleted_at IS NULL
ON CONFLICT (company_id, code) DO NOTHING;

-- =====================================================
-- 11. UPDATE LC TYPES TABLE FOR SPECIFIC FLAGS
-- =====================================================
UPDATE lc_types SET is_revolving = true WHERE code = 'REVOLVING';
UPDATE lc_types SET is_transferable = true WHERE code = 'TRANSFERABLE';
UPDATE lc_types SET is_back_to_back = true WHERE code = 'BACK_TO_BACK';
UPDATE lc_types SET is_red_clause = true WHERE code = 'RED_CLAUSE';
UPDATE lc_types SET is_standby = true WHERE code = 'STANDBY';

-- =====================================================
-- 12. ADD LC MODULE PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('letters_of_credit:view', 'letters_of_credit', 'view', 'View letters of credit'),
    ('letters_of_credit:create', 'letters_of_credit', 'create', 'Create letters of credit'),
    ('letters_of_credit:edit', 'letters_of_credit', 'edit', 'Edit letters of credit'),
    ('letters_of_credit:delete', 'letters_of_credit', 'delete', 'Delete letters of credit'),
    ('letters_of_credit:approve', 'letters_of_credit', 'approve', 'Approve letters of credit'),
    ('letters_of_credit:amend', 'letters_of_credit', 'amend', 'Amend letters of credit'),
    ('lc_types:view', 'lc_types', 'view', 'View LC types'),
    ('lc_types:manage', 'lc_types', 'manage', 'Manage LC types'),
    ('lc_alerts:view', 'lc_alerts', 'view', 'View LC alerts'),
    ('lc_alerts:manage', 'lc_alerts', 'manage', 'Manage LC alerts')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.permission_code IN (
      'letters_of_credit:view', 'letters_of_credit:create', 'letters_of_credit:edit',
      'letters_of_credit:delete', 'letters_of_credit:approve', 'letters_of_credit:amend',
      'lc_types:view', 'lc_types:manage', 'lc_alerts:view', 'lc_alerts:manage'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. ADD VIEW FOR LC DASHBOARD
-- =====================================================
CREATE OR REPLACE VIEW lc_dashboard_summary AS
SELECT 
    lc.company_id,
    COUNT(*) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')) as active_lcs,
    COUNT(*) FILTER (WHERE st.code = 'DRAFT') as draft_lcs,
    COUNT(*) FILTER (WHERE st.code = 'ISSUED') as issued_lcs,
    COUNT(*) FILTER (WHERE lc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' 
                     AND st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')) as expiring_soon,
    COALESCE(SUM(lc.current_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_active_amount,
    COALESCE(SUM(lc.utilized_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_utilized,
    COALESCE(SUM(lc.available_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_available
FROM letters_of_credit lc
LEFT JOIN lc_statuses st ON lc.status_id = st.id
WHERE lc.deleted_at IS NULL
GROUP BY lc.company_id;

-- =====================================================
-- 14. COMMENTS
-- =====================================================
COMMENT ON TABLE letters_of_credit IS 'الاعتمادات المستندية - Letters of Credit Master';
COMMENT ON TABLE lc_types IS 'أنواع الاعتمادات المستندية';
COMMENT ON TABLE lc_statuses IS 'حالات الاعتماد المستندي';
COMMENT ON TABLE lc_amendments IS 'تعديلات الاعتماد المستندي';
COMMENT ON TABLE lc_documents IS 'مستندات الاعتماد المستندي';
COMMENT ON TABLE lc_payments IS 'مدفوعات الاعتماد المستندي';
COMMENT ON TABLE lc_alerts IS 'تنبيهات الاعتماد المستندي';

-- =====================================================
-- END MIGRATION 187
-- =====================================================
