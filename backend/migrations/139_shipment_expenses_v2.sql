-- =====================================================
-- Migration: 139_shipment_expenses_v2.sql
-- Description: Enhanced Shipment Expenses Module with 
--              Dynamic Fields based on Expense Type
-- Date: 2026-01-15
-- =====================================================

-- =====================================================
-- 1. REFERENCE TABLES FOR SHIPMENT EXPENSES
-- =====================================================

-- 1.1 Insurance Companies (شركات التأمين)
CREATE TABLE IF NOT EXISTS insurance_companies (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    policy_number_prefix VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- 1.2 Clearance Offices (مكاتب التخليص الجمركي)
CREATE TABLE IF NOT EXISTS clearance_offices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    license_number VARCHAR(50),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    specialization VARCHAR(100), -- air, sea, land, all
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- 1.3 Laboratories (المختبرات)
CREATE TABLE IF NOT EXISTS laboratories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    lab_type VARCHAR(50), -- quality, saber, conformity, testing
    accreditation_number VARCHAR(50),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    services TEXT[], -- array of services offered
    is_saber_certified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- 1.4 Shipping Agents (وكلاء الشحن)
CREATE TABLE IF NOT EXISTS shipping_agents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    agent_type VARCHAR(30) NOT NULL CHECK (agent_type IN ('freight_forwarder', 'shipping_line', 'nvocc', 'customs_broker')),
    license_number VARCHAR(50),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    country_id INTEGER REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    services TEXT[], -- ['sea', 'air', 'land', 'multimodal']
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    credit_limit DECIMAL(18,2) DEFAULT 0,
    payment_terms_id INTEGER REFERENCES payment_terms(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- =====================================================
-- 2. SHIPMENT EXPENSE TYPES (أنواع مصاريف الشحنات)
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_expense_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    category VARCHAR(50) NOT NULL, -- 'lc', 'insurance', 'freight', 'customs', 'port', 'clearance', 'transport', 'inspection', 'other'
    parent_account_id INTEGER REFERENCES accounts(id), -- 1151010003
    analytic_account_code VARCHAR(10), -- 8001, 8002, etc.
    
    -- Dynamic field configuration (JSON)
    required_fields JSONB DEFAULT '[]', -- Fields that must appear for this expense type
    optional_fields JSONB DEFAULT '[]', -- Optional fields
    
    -- Linked entity types
    requires_lc BOOLEAN DEFAULT false,
    requires_insurance_company BOOLEAN DEFAULT false,
    requires_shipping_agent BOOLEAN DEFAULT false,
    requires_clearance_office BOOLEAN DEFAULT false,
    requires_laboratory BOOLEAN DEFAULT false,
    requires_customs_declaration BOOLEAN DEFAULT false,
    requires_port BOOLEAN DEFAULT false,
    
    -- Default values
    default_vat_rate DECIMAL(5,2) DEFAULT 15.00,
    is_vat_exempt BOOLEAN DEFAULT false,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- =====================================================
-- 3. ENHANCED SHIPMENT EXPENSES TABLE
-- =====================================================

-- Drop old table if exists and recreate with new structure
-- First backup existing data if any
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'shipment_expenses' AND schemaname = 'public') THEN
        -- Check if backup doesn't already exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'shipment_expenses_backup_v1' AND schemaname = 'public') THEN
            EXECUTE 'CREATE TABLE shipment_expenses_backup_v1 AS SELECT * FROM shipment_expenses';
        END IF;
    END IF;
END $$;

-- Drop and recreate
DROP TABLE IF EXISTS shipment_expense_distributions CASCADE;
DROP TABLE IF EXISTS shipment_expenses CASCADE;

CREATE TABLE shipment_expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id),
    project_id INTEGER REFERENCES projects(id),
    
    -- Expense Type & Account
    expense_type_id INTEGER NOT NULL REFERENCES shipment_expense_types(id),
    expense_type_code VARCHAR(10) NOT NULL,
    expense_type_name VARCHAR(200),
    analytic_account_code VARCHAR(10),
    
    -- Core Financial Data
    amount_before_vat DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    vat_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    -- Currency & Exchange Rate
    currency_id INTEGER REFERENCES currencies(id),
    currency_code VARCHAR(10),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Converted to Shipment Currency
    amount_in_shipment_currency DECIMAL(18,4) DEFAULT 0,
    
    -- Converted to Base Currency
    amount_in_base_currency DECIMAL(18,4) DEFAULT 0,
    vat_in_base_currency DECIMAL(18,4) DEFAULT 0,
    total_in_base_currency DECIMAL(18,4) DEFAULT 0,
    
    -- Reference Numbers (Auto-filled where applicable)
    bl_number VARCHAR(50), -- Bill of Lading from shipment
    customs_declaration_id INTEGER, -- Link to customs declaration
    customs_declaration_number VARCHAR(50),
    
    -- Document References
    invoice_number VARCHAR(50),
    receipt_number VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Distribution Method for Costing
    distribution_method VARCHAR(20) DEFAULT 'value', -- 'quantity', 'value', 'weight', 'volume', 'manual'
    
    -- Linked Entities (based on expense type)
    lc_id INTEGER, -- REFERENCES letter_of_credits(id) when available
    lc_number VARCHAR(50),
    lc_bank_name VARCHAR(200),
    lc_total_amount DECIMAL(18,4),
    lc_currency_code VARCHAR(10),
    
    insurance_company_id INTEGER REFERENCES insurance_companies(id),
    insurance_policy_number VARCHAR(50),
    
    shipping_agent_id INTEGER REFERENCES shipping_agents(id),
    shipping_company_id INTEGER REFERENCES vendors(id), -- Using vendors as shipping companies
    
    clearance_office_id INTEGER REFERENCES clearance_offices(id),
    
    laboratory_id INTEGER REFERENCES laboratories(id),
    certificate_number VARCHAR(50),
    
    port_id INTEGER REFERENCES ports(id),
    
    -- For Customs Declaration Expenses (8005)
    declaration_type VARCHAR(30), -- 'import', 'export', 'transit', 'temporary'
    declaration_date DATE,
    has_undertaking BOOLEAN DEFAULT false,
    undertaking_details TEXT,
    
    -- For Transport Expenses (8012)
    transport_from TEXT,
    transport_to TEXT,
    container_count INTEGER,
    goods_description TEXT,
    driver_name VARCHAR(100),
    receiver_name VARCHAR(100),
    
    -- For Loading/Unloading (8013)
    workers_count INTEGER,
    
    -- For Clearance (8011)
    clearance_port_name VARCHAR(100),
    
    -- Amount in Words (Auto-generated)
    amount_in_words VARCHAR(500),
    amount_in_words_ar VARCHAR(500),
    
    -- General Fields
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entity_name VARCHAR(200), -- Free text field for entity/vendor name
    description TEXT,
    notes TEXT,
    
    -- Approval Workflow
    approval_status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'rejected'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Posting Status
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by INTEGER REFERENCES users(id),
    journal_entry_id INTEGER, -- REFERENCES journal_entries(id) when available
    
    -- Attachments (stored as JSON array)
    attachments JSONB DEFAULT '[]',
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 4. EXPENSE DISTRIBUTION TO ITEMS
-- =====================================================

CREATE TABLE shipment_expense_distributions (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES shipment_expenses(id) ON DELETE CASCADE,
    shipment_item_id INTEGER NOT NULL, -- REFERENCES logistics_shipment_items(id)
    item_id INTEGER,
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    
    -- Distribution Basis
    basis_value DECIMAL(18,4), -- The value used for pro-rata (qty, value, weight, etc.)
    distribution_percentage DECIMAL(8,4),
    
    -- Distributed Amount
    allocated_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    allocated_amount_base DECIMAL(18,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. SHIPMENT COST SUMMARY (Materialized View)
-- =====================================================

CREATE TABLE shipment_cost_summary (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id),
    project_id INTEGER,
    
    -- Totals
    total_expenses_count INTEGER DEFAULT 0,
    total_amount_before_vat DECIMAL(18,4) DEFAULT 0,
    total_vat_amount DECIMAL(18,4) DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    
    -- In Base Currency
    total_in_base_currency DECIMAL(18,4) DEFAULT 0,
    vat_in_base_currency DECIMAL(18,4) DEFAULT 0,
    grand_total_base DECIMAL(18,4) DEFAULT 0,
    
    -- Unit Cost
    total_units DECIMAL(18,4) DEFAULT 0,
    cost_per_unit DECIMAL(18,6) DEFAULT 0, -- Without VAT
    cost_per_unit_with_vat DECIMAL(18,6) DEFAULT 0,
    
    -- By Category
    lc_costs DECIMAL(18,4) DEFAULT 0,
    insurance_costs DECIMAL(18,4) DEFAULT 0,
    freight_costs DECIMAL(18,4) DEFAULT 0,
    customs_costs DECIMAL(18,4) DEFAULT 0,
    port_costs DECIMAL(18,4) DEFAULT 0,
    clearance_costs DECIMAL(18,4) DEFAULT 0,
    transport_costs DECIMAL(18,4) DEFAULT 0,
    inspection_costs DECIMAL(18,4) DEFAULT 0,
    other_costs DECIMAL(18,4) DEFAULT 0,
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shipment_id)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_shipment_id ON shipment_expenses(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_project_id ON shipment_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_expense_type_id ON shipment_expenses(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_company_id ON shipment_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_approval_status ON shipment_expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_is_posted ON shipment_expenses(is_posted);
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_deleted_at ON shipment_expenses(deleted_at);

CREATE INDEX IF NOT EXISTS idx_shipment_expense_distributions_expense_id ON shipment_expense_distributions(expense_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cost_summary_shipment_id ON shipment_cost_summary(shipment_id);

CREATE INDEX IF NOT EXISTS idx_insurance_companies_company_id ON insurance_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_clearance_offices_company_id ON clearance_offices(company_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_company_id ON laboratories(company_id);
CREATE INDEX IF NOT EXISTS idx_shipping_agents_company_id ON shipping_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expense_types_company_id ON shipment_expense_types(company_id);

-- =====================================================
-- 7. SEED EXPENSE TYPES FOR COMPANY 1
-- =====================================================

INSERT INTO shipment_expense_types (company_id, code, name, name_ar, category, analytic_account_code,
    requires_lc, requires_insurance_company, requires_shipping_agent, requires_clearance_office, 
    requires_laboratory, requires_customs_declaration, requires_port, default_vat_rate, is_vat_exempt,
    required_fields, display_order)
VALUES
    -- 8001: LC Fees (رسوم اعتماد مستندي)
    (1, '8001', 'LC Fees / Bank Guarantee', 'رسوم اعتماد مستندي / ضمان بنكي', 'lc', '8001',
     true, false, false, false, false, false, false, 0, true,
     '["lc_id", "lc_number", "lc_bank_name", "lc_total_amount", "lc_currency_code"]'::jsonb, 1),
    
    -- 8002: Cargo Insurance (تأمين حمولة)
    (1, '8002', 'Cargo Insurance / Marine Insurance', 'تأمين حمولة / تأمين بحري', 'insurance', '8002',
     false, true, false, false, false, false, false, 15, false,
     '["insurance_company_id", "insurance_policy_number"]'::jsonb, 2),
    
    -- 8003: Sea Freight (شحن بحري)
    (1, '8003', 'Sea Freight Charges', 'رسوم شحن بحري', 'freight', '8003',
     false, false, true, false, false, false, false, 0, true,
     '["shipping_agent_id", "invoice_number", "receipt_number"]'::jsonb, 3),
    
    -- 8004: Delivery Order (إذن تسليم)
    (1, '8004', 'Delivery Order Charges', 'رسوم إذن تسليم', 'freight', '8004',
     false, false, true, false, false, false, false, 0, true,
     '["shipping_agent_id", "invoice_number", "receipt_number"]'::jsonb, 4),
    
    -- 8005: Customs Declaration (بيان جمركي)
    (1, '8005', 'Customs Declaration Fees', 'رسوم بيان جمركي', 'customs', '8005',
     false, false, false, true, false, true, true, 0, true,
     '["port_id", "declaration_type", "customs_declaration_number", "declaration_date", "clearance_office_id", "has_undertaking"]'::jsonb, 5),
    
    -- 8006: Storage Charges (أرضيات)
    (1, '8006', 'Storage / Demurrage Charges', 'رسوم أرضيات', 'port', '8006',
     false, false, false, false, false, true, false, 0, true,
     '["customs_declaration_number", "invoice_number", "receipt_number", "entity_name"]'::jsonb, 6),
    
    -- 8007: Port Charges (رسوم موانئ)
    (1, '8007', 'Port Charges', 'رسوم موانئ', 'port', '8007',
     false, false, false, false, false, true, false, 0, true,
     '["customs_declaration_number", "invoice_number", "receipt_number", "entity_name"]'::jsonb, 7),
    
    -- 8008: Unloading Charges (تفريغ)
    (1, '8008', 'Unloading Charges', 'رسوم تفريغ', 'port', '8008',
     false, false, false, false, false, true, false, 0, true,
     '["customs_declaration_number", "invoice_number", "receipt_number", "entity_name"]'::jsonb, 8),
    
    -- 8009: Customs Inspection (معاينة جمركية)
    (1, '8009', 'Customs Inspection Charges', 'رسوم معاينة جمركية', 'customs', '8009',
     false, false, false, false, false, true, false, 0, true,
     '["customs_declaration_number", "invoice_number", "receipt_number", "entity_name"]'::jsonb, 9),
    
    -- 8010: Container Delay Pickup (تأخير استلام حاويات)
    (1, '8010', 'Container Pickup Delay Charges', 'رسوم تأخير استلام الحاويات', 'freight', '8010',
     false, false, true, false, false, false, false, 0, true,
     '["shipping_agent_id", "invoice_number", "receipt_number", "container_count"]'::jsonb, 10),
    
    -- 8011: Customs Clearance (تخليص جمركي)
    (1, '8011', 'Customs Clearance Charges', 'رسوم تخليص جمركي', 'clearance', '8011',
     false, false, false, true, false, true, true, 15, false,
     '["port_id", "clearance_office_id", "invoice_number", "bl_number", "customs_declaration_number", "container_count"]'::jsonb, 11),
    
    -- 8012: Transport (نقل)
    (1, '8012', 'Transport Charges', 'رسوم نقل', 'transport', '8012',
     false, false, false, false, false, false, false, 15, false,
     '["transport_from", "transport_to", "container_count", "goods_description", "driver_name", "receiver_name"]'::jsonb, 12),
    
    -- 8013: Loading/Unloading (تحميل وتنزيل)
    (1, '8013', 'Loading & Unloading Charges', 'رسوم تحميل وتنزيل', 'transport', '8013',
     false, false, false, false, false, true, false, 15, false,
     '["customs_declaration_number", "workers_count", "receiver_name"]'::jsonb, 13),
    
    -- 8014: Sample Testing (فحص عينات)
    (1, '8014', 'Sample Testing Charges', 'رسوم فحص عينات', 'inspection', '8014',
     false, false, false, false, true, true, false, 15, false,
     '["laboratory_id", "invoice_number", "certificate_number", "receipt_number"]'::jsonb, 14),
    
    -- 8015: SABER / Conformity Certificate (شهادة سابر)
    (1, '8015', 'SABER / Conformity Certificate', 'رسوم شهادة سابر / مطابقة', 'inspection', '8015',
     false, false, false, false, true, true, false, 15, false,
     '["laboratory_id", "invoice_number", "certificate_number", "receipt_number"]'::jsonb, 15),
    
    -- 8016: Container Return Delay (تأخير إعادة حاويات)
    (1, '8016', 'Container Return Delay Charges', 'رسوم تأخير إعادة الحاويات', 'freight', '8016',
     false, false, true, false, false, false, false, 0, true,
     '["shipping_agent_id", "invoice_number", "receipt_number", "container_count"]'::jsonb, 16),
    
    -- 8017: Pallet Fines / Container Cleaning (غرامات)
    (1, '8017', 'Pallet Fines / Container Cleaning', 'غرامة طبليات / نظافة حاوية', 'freight', '8017',
     false, false, true, false, false, false, false, 0, true,
     '["shipping_agent_id", "invoice_number", "receipt_number"]'::jsonb, 17)

ON CONFLICT (company_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    category = EXCLUDED.category,
    analytic_account_code = EXCLUDED.analytic_account_code,
    requires_lc = EXCLUDED.requires_lc,
    requires_insurance_company = EXCLUDED.requires_insurance_company,
    requires_shipping_agent = EXCLUDED.requires_shipping_agent,
    requires_clearance_office = EXCLUDED.requires_clearance_office,
    requires_laboratory = EXCLUDED.requires_laboratory,
    requires_customs_declaration = EXCLUDED.requires_customs_declaration,
    requires_port = EXCLUDED.requires_port,
    default_vat_rate = EXCLUDED.default_vat_rate,
    is_vat_exempt = EXCLUDED.is_vat_exempt,
    required_fields = EXCLUDED.required_fields,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- =====================================================
-- 8. SEED SAMPLE REFERENCE DATA
-- =====================================================

-- Sample Insurance Companies
INSERT INTO insurance_companies (company_id, code, name, name_ar, is_active) VALUES
    (1, 'INS001', 'Tawuniya Insurance', 'التعاونية للتأمين', true),
    (1, 'INS002', 'Bupa Arabia', 'بوبا العربية', true),
    (1, 'INS003', 'MedGulf Insurance', 'ميدغلف للتأمين', true),
    (1, 'INS004', 'Allianz Saudi Fransi', 'أليانز السعودي الفرنسي', true),
    (1, 'INS005', 'AXA Cooperative Insurance', 'أكسا التعاونية للتأمين', true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Sample Clearance Offices
INSERT INTO clearance_offices (company_id, code, name, name_ar, specialization, is_active) VALUES
    (1, 'CLR001', 'Al-Rajhi Clearance', 'مكتب الراجحي للتخليص', 'all', true),
    (1, 'CLR002', 'Saudi Port Services', 'الخدمات السعودية للموانئ', 'sea', true),
    (1, 'CLR003', 'Fast Clearance Services', 'خدمات التخليص السريع', 'all', true),
    (1, 'CLR004', 'Elite Customs Services', 'إيليت للخدمات الجمركية', 'all', true),
    (1, 'CLR005', 'Royal Clearance Office', 'المكتب الملكي للتخليص', 'all', true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Sample Laboratories
INSERT INTO laboratories (company_id, code, name, name_ar, lab_type, is_saber_certified, is_active) VALUES
    (1, 'LAB001', 'Saudi Standards Quality Lab', 'مختبر المواصفات السعودية', 'quality', true, true),
    (1, 'LAB002', 'TUV Middle East', 'تي يو في الشرق الأوسط', 'conformity', true, true),
    (1, 'LAB003', 'SGS Saudi Arabia', 'إس جي إس السعودية', 'testing', true, true),
    (1, 'LAB004', 'Bureau Veritas', 'بيورو فيريتاس', 'testing', true, true),
    (1, 'LAB005', 'Intertek Saudi', 'إنترتك السعودية', 'saber', true, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Sample Shipping Agents
INSERT INTO shipping_agents (company_id, code, name, name_ar, agent_type, services, is_active) VALUES
    (1, 'AGT001', 'Maersk Line', 'ميرسك لاين', 'shipping_line', ARRAY['sea'], true),
    (1, 'AGT002', 'MSC Saudi', 'إم إس سي السعودية', 'shipping_line', ARRAY['sea'], true),
    (1, 'AGT003', 'DHL Global Forwarding', 'دي إتش إل للشحن', 'freight_forwarder', ARRAY['sea', 'air', 'land'], true),
    (1, 'AGT004', 'Agility Logistics', 'أجيليتي للخدمات اللوجستية', 'freight_forwarder', ARRAY['sea', 'air', 'land'], true),
    (1, 'AGT005', 'Hapag-Lloyd', 'هاباج لويد', 'shipping_line', ARRAY['sea'], true)
ON CONFLICT (company_id, code) DO NOTHING;

-- =====================================================
-- 9. PERMISSIONS
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description, module)
SELECT * FROM (VALUES
    ('shipment_expenses:view', 'shipment_expenses', 'view', 'View shipment expenses', 'logistics'),
    ('shipment_expenses:create', 'shipment_expenses', 'create', 'Create shipment expenses', 'logistics'),
    ('shipment_expenses:update', 'shipment_expenses', 'update', 'Update shipment expenses', 'logistics'),
    ('shipment_expenses:delete', 'shipment_expenses', 'delete', 'Delete shipment expenses', 'logistics'),
    ('shipment_expenses:approve', 'shipment_expenses', 'approve', 'Approve shipment expenses', 'logistics'),
    ('shipment_expenses:post', 'shipment_expenses', 'post', 'Post shipment expenses to accounting', 'logistics'),
    
    ('insurance_companies:view', 'insurance_companies', 'view', 'View insurance companies', 'master_data'),
    ('insurance_companies:create', 'insurance_companies', 'create', 'Create insurance companies', 'master_data'),
    ('insurance_companies:update', 'insurance_companies', 'update', 'Update insurance companies', 'master_data'),
    ('insurance_companies:delete', 'insurance_companies', 'delete', 'Delete insurance companies', 'master_data'),
    
    ('clearance_offices:view', 'clearance_offices', 'view', 'View clearance offices', 'master_data'),
    ('clearance_offices:create', 'clearance_offices', 'create', 'Create clearance offices', 'master_data'),
    ('clearance_offices:update', 'clearance_offices', 'update', 'Update clearance offices', 'master_data'),
    ('clearance_offices:delete', 'clearance_offices', 'delete', 'Delete clearance offices', 'master_data'),
    
    ('laboratories:view', 'laboratories', 'view', 'View laboratories', 'master_data'),
    ('laboratories:create', 'laboratories', 'create', 'Create laboratories', 'master_data'),
    ('laboratories:update', 'laboratories', 'update', 'Update laboratories', 'master_data'),
    ('laboratories:delete', 'laboratories', 'delete', 'Delete laboratories', 'master_data'),
    
    ('shipping_agents:view', 'shipping_agents', 'view', 'View shipping agents', 'master_data'),
    ('shipping_agents:create', 'shipping_agents', 'create', 'Create shipping agents', 'master_data'),
    ('shipping_agents:update', 'shipping_agents', 'update', 'Update shipping agents', 'master_data'),
    ('shipping_agents:delete', 'shipping_agents', 'delete', 'Delete shipping agents', 'master_data'),
    
    ('shipment_expense_types:view', 'shipment_expense_types', 'view', 'View shipment expense types', 'master_data'),
    ('shipment_expense_types:create', 'shipment_expense_types', 'create', 'Create shipment expense types', 'master_data'),
    ('shipment_expense_types:update', 'shipment_expense_types', 'update', 'Update shipment expense types', 'master_data'),
    ('shipment_expense_types:delete', 'shipment_expense_types', 'delete', 'Delete shipment expense types', 'master_data')
) AS p(permission_code, resource, action, description, module)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE permission_code = p.permission_code
);

-- Assign to admin and super_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
AND p.permission_code IN (
    'shipment_expenses:view', 'shipment_expenses:create', 'shipment_expenses:update',
    'shipment_expenses:delete', 'shipment_expenses:approve', 'shipment_expenses:post',
    'insurance_companies:view', 'insurance_companies:create', 'insurance_companies:update', 'insurance_companies:delete',
    'clearance_offices:view', 'clearance_offices:create', 'clearance_offices:update', 'clearance_offices:delete',
    'laboratories:view', 'laboratories:create', 'laboratories:update', 'laboratories:delete',
    'shipping_agents:view', 'shipping_agents:create', 'shipping_agents:update', 'shipping_agents:delete',
    'shipment_expense_types:view', 'shipment_expense_types:create', 'shipment_expense_types:update', 'shipment_expense_types:delete'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. FUNCTION TO UPDATE COST SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION update_shipment_cost_summary(p_shipment_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_total_units DECIMAL(18,4);
    v_project_id INTEGER;
BEGIN
    -- Get project_id and total units from shipment
    SELECT project_id INTO v_project_id 
    FROM logistics_shipments WHERE id = p_shipment_id;
    
    -- Calculate total units (simplified - sum of quantities)
    SELECT COALESCE(SUM(quantity), 1) INTO v_total_units
    FROM logistics_shipment_items WHERE shipment_id = p_shipment_id;
    
    -- Upsert cost summary
    INSERT INTO shipment_cost_summary (
        shipment_id, project_id, 
        total_expenses_count,
        total_amount_before_vat, total_vat_amount, total_amount,
        total_in_base_currency, vat_in_base_currency, grand_total_base,
        total_units, cost_per_unit, cost_per_unit_with_vat,
        lc_costs, insurance_costs, freight_costs, customs_costs,
        port_costs, clearance_costs, transport_costs, inspection_costs, other_costs,
        last_updated
    )
    SELECT 
        p_shipment_id,
        v_project_id,
        COUNT(*),
        COALESCE(SUM(amount_before_vat), 0),
        COALESCE(SUM(vat_amount), 0),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(amount_in_base_currency), 0),
        COALESCE(SUM(vat_in_base_currency), 0),
        COALESCE(SUM(total_in_base_currency), 0),
        v_total_units,
        CASE WHEN v_total_units > 0 THEN COALESCE(SUM(amount_in_base_currency), 0) / v_total_units ELSE 0 END,
        CASE WHEN v_total_units > 0 THEN COALESCE(SUM(total_in_base_currency), 0) / v_total_units ELSE 0 END,
        COALESCE(SUM(CASE WHEN et.category = 'lc' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'insurance' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'freight' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'customs' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'port' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'clearance' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'transport' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category = 'inspection' THEN se.amount_in_base_currency ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN et.category NOT IN ('lc','insurance','freight','customs','port','clearance','transport','inspection') THEN se.amount_in_base_currency ELSE 0 END), 0),
        NOW()
    FROM shipment_expenses se
    JOIN shipment_expense_types et ON se.expense_type_id = et.id
    WHERE se.shipment_id = p_shipment_id
    AND se.deleted_at IS NULL
    ON CONFLICT (shipment_id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        total_expenses_count = EXCLUDED.total_expenses_count,
        total_amount_before_vat = EXCLUDED.total_amount_before_vat,
        total_vat_amount = EXCLUDED.total_vat_amount,
        total_amount = EXCLUDED.total_amount,
        total_in_base_currency = EXCLUDED.total_in_base_currency,
        vat_in_base_currency = EXCLUDED.vat_in_base_currency,
        grand_total_base = EXCLUDED.grand_total_base,
        total_units = EXCLUDED.total_units,
        cost_per_unit = EXCLUDED.cost_per_unit,
        cost_per_unit_with_vat = EXCLUDED.cost_per_unit_with_vat,
        lc_costs = EXCLUDED.lc_costs,
        insurance_costs = EXCLUDED.insurance_costs,
        freight_costs = EXCLUDED.freight_costs,
        customs_costs = EXCLUDED.customs_costs,
        port_costs = EXCLUDED.port_costs,
        clearance_costs = EXCLUDED.clearance_costs,
        transport_costs = EXCLUDED.transport_costs,
        inspection_costs = EXCLUDED.inspection_costs,
        other_costs = EXCLUDED.other_costs,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. TRIGGER TO AUTO-UPDATE COST SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_shipment_cost_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_shipment_cost_summary(OLD.shipment_id);
        RETURN OLD;
    ELSE
        PERFORM update_shipment_cost_summary(NEW.shipment_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_expenses_cost_summary ON shipment_expenses;
CREATE TRIGGER trg_shipment_expenses_cost_summary
AFTER INSERT OR UPDATE OR DELETE ON shipment_expenses
FOR EACH ROW EXECUTE FUNCTION trigger_update_shipment_cost_summary();

-- =====================================================
-- Done
-- =====================================================
SELECT 'Migration 139_shipment_expenses_v2.sql completed successfully' AS status;
