-- =====================================================
-- Migration 174: Shipping Bills (بوليصات الشحن)
-- Creates shipping_bills and bill_types tables for managing
-- Bill of Lading (B/L), Air Waybill (AWB), and other shipping documents
-- =====================================================

BEGIN;

-- =====================================================
-- 1. BILL TYPES (أنواع البوليصات)
-- =====================================================
CREATE TABLE IF NOT EXISTS bill_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    -- MBL (Master Bill of Lading), HBL (House Bill of Lading), AWB (Air Waybill), etc.
    category VARCHAR(30) CHECK (category IN ('sea_master', 'sea_house', 'air', 'land', 'multimodal')),
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, code)
);

-- Seed default bill types (global, company_id = NULL for system-wide)
INSERT INTO bill_types (company_id, code, name, name_ar, category, is_system, sort_order) VALUES
    (NULL, 'MBL', 'Master Bill of Lading', 'بوليصة شحن رئيسية', 'sea_master', true, 1),
    (NULL, 'HBL', 'House Bill of Lading', 'بوليصة شحن فرعية', 'sea_house', true, 2),
    (NULL, 'MAWB', 'Master Air Waybill', 'بوليصة شحن جوي رئيسية', 'air', true, 3),
    (NULL, 'HAWB', 'House Air Waybill', 'بوليصة شحن جوي فرعية', 'air', true, 4),
    (NULL, 'CMR', 'CMR Consignment Note', 'مذكرة شحن بري CMR', 'land', true, 5),
    (NULL, 'FBL', 'FIATA Bill of Lading', 'بوليصة فياتا متعددة الوسائط', 'multimodal', true, 6),
    (NULL, 'SWB', 'Sea Waybill', 'إيصال شحن بحري', 'sea_master', true, 7)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. SHIPPING BILLS (بوليصات الشحن)
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_bills (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Bill identification
    bill_number VARCHAR(60) NOT NULL,
    bill_type_id INTEGER NOT NULL REFERENCES bill_types(id),
    booking_number VARCHAR(60),
    bill_date DATE,
    
    -- Linked entities
    shipment_id INTEGER REFERENCES logistics_shipments(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id),
    
    -- Carrier / Shipping Agent
    carrier_id INTEGER REFERENCES shipping_agents(id),
    carrier_name VARCHAR(200), -- For manual entry if no agent selected
    vessel_name VARCHAR(100),
    voyage_number VARCHAR(50),
    
    -- Ports and locations
    port_of_loading_id INTEGER REFERENCES ports(id),
    port_of_loading_text VARCHAR(200), -- For non-standard ports
    port_of_discharge_id INTEGER REFERENCES ports(id),
    port_of_discharge_text VARCHAR(200),
    place_of_delivery VARCHAR(200),
    destination_location_id INTEGER REFERENCES cities(id),
    
    -- Container information
    containers_count INTEGER DEFAULT 0,
    container_type VARCHAR(20), -- 20GP, 40HC, etc.
    container_numbers TEXT[], -- Array of container numbers
    
    -- Cargo details
    cargo_description TEXT,
    gross_weight DECIMAL(18,4),
    gross_weight_unit VARCHAR(10) DEFAULT 'KG',
    net_weight DECIMAL(18,4),
    volume DECIMAL(18,4),
    volume_unit VARCHAR(10) DEFAULT 'CBM',
    packages_count INTEGER,
    package_type VARCHAR(50),
    
    -- Dates
    shipped_on_board_date DATE,
    eta_date DATE,
    ata_date DATE, -- Actual Time of Arrival
    
    -- Tracking
    tracking_url TEXT,
    tracking_number VARCHAR(100),
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'issued', 'shipped', 'in_transit', 'arrived', 'delivered', 'completed', 'cancelled')),
    
    -- Flags
    is_original BOOLEAN DEFAULT true, -- Original or Copy
    is_freight_prepaid BOOLEAN DEFAULT true,
    freight_terms VARCHAR(30), -- Prepaid, Collect, Third Party
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(company_id, bill_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_bills_company_id 
    ON shipping_bills(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_bill_number 
    ON shipping_bills(company_id, bill_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_shipment_id 
    ON shipping_bills(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_project_id 
    ON shipping_bills(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_carrier_id 
    ON shipping_bills(carrier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_status 
    ON shipping_bills(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_bill_date 
    ON shipping_bills(bill_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_bills_eta_date 
    ON shipping_bills(eta_date) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
    ('shipping_bills:view', 'shipping_bills', 'view', 'View shipping bills', 'logistics'),
    ('shipping_bills:create', 'shipping_bills', 'create', 'Create shipping bills', 'logistics'),
    ('shipping_bills:update', 'shipping_bills', 'update', 'Update shipping bills', 'logistics'),
    ('shipping_bills:delete', 'shipping_bills', 'delete', 'Delete shipping bills', 'logistics'),
    ('shipping_bills:change_status', 'shipping_bills', 'change_status', 'Change shipping bill status', 'logistics'),
    ('bill_types:view', 'bill_types', 'view', 'View bill types', 'master_data'),
    ('bill_types:manage', 'bill_types', 'manage', 'Manage bill types', 'master_data')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.permission_code IN (
    'shipping_bills:view', 'shipping_bills:create', 'shipping_bills:update', 
    'shipping_bills:delete', 'shipping_bills:change_status',
    'bill_types:view', 'bill_types:manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comments
COMMENT ON TABLE shipping_bills IS 'Shipping documents (B/L, AWB, etc.) for logistics tracking';
COMMENT ON TABLE bill_types IS 'Types of shipping bills (MBL, HBL, AWB, etc.)';
COMMENT ON COLUMN shipping_bills.bill_number IS 'Unique bill number (e.g., MAEU123456789)';
COMMENT ON COLUMN shipping_bills.is_original IS 'True for original B/L, false for copies';
COMMENT ON COLUMN shipping_bills.freight_terms IS 'Prepaid, Collect, or Third Party freight payment';

COMMIT;
