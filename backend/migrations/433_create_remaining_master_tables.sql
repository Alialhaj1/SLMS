-- Migration 433: Create missing tables and seed data for remaining empty screens
-- Tables: customs_duty_types, supplier_bank_accounts, cost_element_groups,
--         deferred_policies, prepaid_policies, transaction_defaults

BEGIN;

-- ============================================================================
-- 1. customs_duty_types
-- ============================================================================
CREATE TABLE IF NOT EXISTS customs_duty_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    name_en VARCHAR(200),
    name_ar VARCHAR(200),
    rate_percent NUMERIC(8,4) DEFAULT 0,
    calculation_method VARCHAR(50) DEFAULT 'percentage',
    status VARCHAR(20) DEFAULT 'active',
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed customs_duty_types for each company
INSERT INTO customs_duty_types (code, name, name_en, name_ar, rate_percent, calculation_method, status, company_id)
SELECT v.code, v.name_en, v.name_en, v.name_ar, v.rate_percent, v.calculation_method, 'active', c.id
FROM (VALUES
    ('CDT-001', 'Standard Customs Duty', 'الرسوم الجمركية القياسية', 5.0000, 'percentage'),
    ('CDT-002', 'Reduced Rate Duty', 'رسوم بالسعر المخفض', 2.5000, 'percentage'),
    ('CDT-003', 'Zero Rate Duty', 'رسوم بمعدل صفر', 0.0000, 'percentage'),
    ('CDT-004', 'Anti-Dumping Duty', 'رسوم مكافحة الإغراق', 10.0000, 'percentage'),
    ('CDT-005', 'Countervailing Duty', 'الرسوم التعويضية', 7.5000, 'percentage'),
    ('CDT-006', 'Specific Duty', 'رسوم نوعية', 0.0000, 'fixed_amount'),
    ('CDT-007', 'Ad Valorem Duty', 'رسوم قيمية', 12.0000, 'percentage'),
    ('CDT-008', 'Safeguard Duty', 'رسوم الحماية', 15.0000, 'percentage'),
    ('CDT-009', 'Preferential Duty', 'الرسوم التفضيلية', 1.0000, 'percentage'),
    ('CDT-010', 'Temporary Duty', 'رسوم مؤقتة', 8.0000, 'percentage')
) AS v(code, name_en, name_ar, rate_percent, calculation_method)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM customs_duty_types WHERE customs_duty_types.company_id = c.id AND customs_duty_types.code = v.code);

-- ============================================================================
-- 2. supplier_bank_accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_bank_accounts (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER,
    supplier_name VARCHAR(200),
    bank_name VARCHAR(200),
    account_number VARCHAR(50),
    iban VARCHAR(50),
    swift_code VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'SAR',
    branch_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed supplier_bank_accounts for each company
INSERT INTO supplier_bank_accounts (supplier_name, bank_name, account_number, iban, currency, status, company_id)
SELECT v.supplier_name, v.bank_name, v.account_number, v.iban, v.currency, 'active', c.id
FROM (VALUES
    ('Al-Rajhi Suppliers', 'Al Rajhi Bank', '5001234567', 'SA0380000000608010167519', 'SAR'),
    ('National Trading Co.', 'National Commercial Bank', '6009876543', 'SA4410000000608010167520', 'SAR'),
    ('Gulf Materials Ltd', 'Riyad Bank', '7003456789', 'SA5520000000608010167521', 'SAR'),
    ('Eastern Imports', 'Saudi British Bank', '8007654321', 'SA6640000000608010167522', 'SAR'),
    ('Al-Safi Industries', 'Banque Saudi Fransi', '9001239876', 'SA7745000000608010167523', 'SAR'),
    ('Jeddah Wholesale', 'Arab National Bank', '1005678901', 'SA8830000000608010167524', 'SAR'),
    ('Riyadh Equipment', 'Bank AlBilad', '2004561234', 'SA9960000000608010167525', 'SAR'),
    ('Dammam Logistics', 'Bank AlJazira', '3008901234', 'SA1050000000608010167526', 'SAR')
) AS v(supplier_name, bank_name, account_number, iban, currency)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM supplier_bank_accounts WHERE supplier_bank_accounts.company_id = c.id AND supplier_bank_accounts.supplier_name = v.supplier_name);

-- ============================================================================
-- 3. cost_element_groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS cost_element_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    name_en VARCHAR(200),
    name_ar VARCHAR(200),
    parent_group VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed cost_element_groups for each company
INSERT INTO cost_element_groups (code, name, name_en, name_ar, parent_group, description, status, company_id)
SELECT v.code, v.name_en, v.name_en, v.name_ar, v.parent_group, v.description, 'active', c.id
FROM (VALUES
    ('CEG-001', 'Direct Materials', 'المواد المباشرة', NULL, 'Raw materials and components used in production'),
    ('CEG-002', 'Direct Labor', 'العمالة المباشرة', NULL, 'Labor costs directly tied to production'),
    ('CEG-003', 'Manufacturing Overhead', 'تكاليف التصنيع العامة', NULL, 'Indirect production costs'),
    ('CEG-004', 'Shipping & Freight', 'الشحن والنقل', NULL, 'Transportation and logistics costs'),
    ('CEG-005', 'Customs & Duties', 'الجمارك والرسوم', NULL, 'Import duties and customs fees'),
    ('CEG-006', 'Insurance', 'التأمين', 'CEG-004', 'Cargo and shipment insurance'),
    ('CEG-007', 'Packaging', 'التعبئة والتغليف', 'CEG-001', 'Packaging materials and costs'),
    ('CEG-008', 'Quality Control', 'مراقبة الجودة', 'CEG-003', 'Testing and quality assurance'),
    ('CEG-009', 'Warehousing', 'التخزين', NULL, 'Storage and warehouse handling costs'),
    ('CEG-010', 'Administrative Overhead', 'المصاريف الإدارية العامة', NULL, 'General administrative expenses')
) AS v(code, name_en, name_ar, parent_group, description)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM cost_element_groups WHERE cost_element_groups.company_id = c.id AND cost_element_groups.code = v.code);

-- ============================================================================
-- 4. deferred_policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS deferred_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    name_en VARCHAR(200),
    name_ar VARCHAR(200),
    type VARCHAR(20) DEFAULT 'revenue',
    period INTEGER DEFAULT 12,
    recognition_method VARCHAR(50) DEFAULT 'straight-line',
    status VARCHAR(20) DEFAULT 'active',
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed deferred_policies for each company
INSERT INTO deferred_policies (name, name_en, name_ar, type, period, recognition_method, status, company_id)
SELECT v.name_en, v.name_en, v.name_ar, v.type, v.period, v.recognition_method, 'active', c.id
FROM (VALUES
    ('Annual Service Contract Revenue', 'إيراد عقد الخدمة السنوي', 'revenue', 12, 'straight-line'),
    ('Quarterly Subscription Revenue', 'إيراد الاشتراك الربع سنوي', 'revenue', 3, 'straight-line'),
    ('Warranty Revenue Deferral', 'تأجيل إيراد الضمان', 'revenue', 24, 'straight-line'),
    ('Prepaid Rent Expense', 'مصروف الإيجار المدفوع مقدماً', 'expense', 12, 'straight-line'),
    ('Insurance Premium Deferral', 'تأجيل قسط التأمين', 'expense', 12, 'straight-line'),
    ('License Fee Amortization', 'إطفاء رسوم الترخيص', 'expense', 36, 'straight-line'),
    ('Maintenance Contract Expense', 'مصروف عقد الصيانة', 'expense', 12, 'usage-based'),
    ('Multi-Year Support Revenue', 'إيراد الدعم متعدد السنوات', 'revenue', 36, 'straight-line')
) AS v(name_en, name_ar, type, period, recognition_method)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM deferred_policies WHERE deferred_policies.company_id = c.id AND deferred_policies.name_en = v.name_en);

-- ============================================================================
-- 5. prepaid_policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS prepaid_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    name_en VARCHAR(200),
    name_ar VARCHAR(200),
    category VARCHAR(100),
    amortization_period INTEGER DEFAULT 12,
    method VARCHAR(30) DEFAULT 'straight-line',
    status VARCHAR(20) DEFAULT 'active',
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed prepaid_policies for each company
INSERT INTO prepaid_policies (name, name_en, name_ar, category, amortization_period, method, status, company_id)
SELECT v.name_en, v.name_en, v.name_ar, v.category, v.amortization_period, v.method, 'active', c.id
FROM (VALUES
    ('Prepaid Insurance', 'التأمين المدفوع مقدماً', 'Insurance', 12, 'straight-line'),
    ('Prepaid Rent', 'الإيجار المدفوع مقدماً', 'Rent', 12, 'straight-line'),
    ('Prepaid Maintenance', 'الصيانة المدفوعة مقدماً', 'Maintenance', 6, 'straight-line'),
    ('Prepaid Advertising', 'الإعلان المدفوع مقدماً', 'Marketing', 3, 'usage-based'),
    ('Prepaid Software Licenses', 'تراخيص البرمجيات المدفوعة مقدماً', 'IT', 12, 'straight-line'),
    ('Prepaid Subscriptions', 'الاشتراكات المدفوعة مقدماً', 'Services', 12, 'straight-line'),
    ('Prepaid Supplies', 'اللوازم المدفوعة مقدماً', 'Supplies', 6, 'usage-based'),
    ('Prepaid Legal Retainer', 'أتعاب المحاماة المدفوعة مقدماً', 'Legal', 12, 'straight-line')
) AS v(name_en, name_ar, category, amortization_period, method)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM prepaid_policies WHERE prepaid_policies.company_id = c.id AND prepaid_policies.name_en = v.name_en);

-- ============================================================================
-- 6. transaction_defaults
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_defaults (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(100) NOT NULL,
    default_account_code VARCHAR(50),
    payment_terms VARCHAR(100),
    tax_code VARCHAR(50),
    warehouse VARCHAR(100),
    company_id INTEGER REFERENCES companies(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed transaction_defaults for each company
INSERT INTO transaction_defaults (transaction_type, default_account_code, payment_terms, tax_code, warehouse, company_id)
SELECT v.transaction_type, v.default_account_code, v.payment_terms, v.tax_code, v.warehouse, c.id
FROM (VALUES
    ('Sales Invoice', '4100', 'Net 30', 'VAT-15', 'Main Warehouse'),
    ('Purchase Order', '5100', 'Net 45', 'VAT-15', 'Main Warehouse'),
    ('Sales Return', '4200', 'Immediate', 'VAT-15', 'Returns Warehouse'),
    ('Purchase Return', '5200', 'Net 30', 'VAT-15', 'Returns Warehouse'),
    ('Cash Receipt', '1100', 'Immediate', 'EXEMPT', 'N/A'),
    ('Cash Payment', '1100', 'Immediate', 'EXEMPT', 'N/A'),
    ('Journal Entry', '9999', 'N/A', 'EXEMPT', 'N/A'),
    ('Inventory Transfer', '1300', 'N/A', 'EXEMPT', 'Main Warehouse'),
    ('Credit Note', '4300', 'Net 30', 'VAT-15', 'N/A'),
    ('Debit Note', '5300', 'Net 30', 'VAT-15', 'N/A')
) AS v(transaction_type, default_account_code, payment_terms, tax_code, warehouse)
CROSS JOIN companies c
WHERE NOT EXISTS (SELECT 1 FROM transaction_defaults WHERE transaction_defaults.company_id = c.id AND transaction_defaults.transaction_type = v.transaction_type);

COMMIT;
