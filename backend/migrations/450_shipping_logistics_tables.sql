-- ============================================================================
-- Migration 450: Shipping & Logistics Module — Complete Tables
-- Creates 6 new tables + alters 10 existing tables + seeds data
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: NEW TABLES
-- ============================================================================

-- 1. Transport Companies (شركات النقل)
CREATE TABLE IF NOT EXISTS transport_companies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  company_type VARCHAR(50) DEFAULT 'land_transport',
  license_number VARCHAR(100),
  tax_number VARCHAR(50),
  contact_person VARCHAR(100),
  phone VARCHAR(30),
  mobile VARCHAR(30),
  fax VARCHAR(30),
  email VARCHAR(100),
  website VARCHAR(200),
  address_en TEXT,
  address_ar TEXT,
  city_id INTEGER,
  country_id INTEGER,
  fleet_size INTEGER DEFAULT 0,
  service_coverage VARCHAR(30) DEFAULT 'domestic',
  specializations TEXT[],
  insurance_provider_id INTEGER,
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  contract_start DATE,
  contract_end DATE,
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit NUMERIC(18,4) DEFAULT 0,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reliability_score NUMERIC(5,2) DEFAULT 0,
  certifications TEXT[],
  operating_regions TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_transport_companies_company ON transport_companies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_companies_type ON transport_companies(company_id, company_type) WHERE deleted_at IS NULL;

-- 2. Vehicle Types (أنواع المركبات)
CREATE TABLE IF NOT EXISTS vehicle_types (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  category VARCHAR(50) DEFAULT 'truck',
  max_weight_tons NUMERIC(10,2),
  max_volume_cbm NUMERIC(10,2),
  length_m NUMERIC(8,2),
  width_m NUMERIC(8,2),
  height_m NUMERIC(8,2),
  fuel_type VARCHAR(20) DEFAULT 'diesel',
  axle_count INTEGER,
  is_refrigerated BOOLEAN DEFAULT false,
  temperature_range_min NUMERIC(5,1),
  temperature_range_max NUMERIC(5,1),
  requires_special_license BOOLEAN DEFAULT false,
  license_type VARCHAR(50),
  icon VARCHAR(50),
  color_hex VARCHAR(7),
  description_en TEXT,
  description_ar TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_company ON vehicle_types(company_id) WHERE deleted_at IS NULL;

-- 3. Vehicles (المركبات)
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30),
  plate_number VARCHAR(30) NOT NULL,
  plate_type VARCHAR(30) DEFAULT 'commercial',
  vehicle_type_id INTEGER REFERENCES vehicle_types(id),
  transport_company_id INTEGER REFERENCES transport_companies(id),
  brand VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  vin_number VARCHAR(50),
  registration_number VARCHAR(50),
  registration_expiry DATE,
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  insurance_company_id INTEGER,
  inspection_expiry DATE,
  gps_tracker_id VARCHAR(100),
  gps_enabled BOOLEAN DEFAULT false,
  current_status VARCHAR(30) DEFAULT 'available',
  current_location_text VARCHAR(200),
  current_latitude NUMERIC(10,7),
  current_longitude NUMERIC(10,7),
  odometer_km INTEGER DEFAULT 0,
  fuel_capacity_liters NUMERIC(10,2),
  max_weight_tons NUMERIC(10,2),
  max_volume_cbm NUMERIC(10,2),
  assigned_driver_id INTEGER,
  daily_rate NUMERIC(12,2),
  per_km_rate NUMERIC(8,4),
  photo_url VARCHAR(500),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, plate_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(company_id, current_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_transport_co ON vehicles(transport_company_id) WHERE deleted_at IS NULL;

-- 4. Drivers (السائقين)
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  full_name_en VARCHAR(200) NOT NULL,
  full_name_ar VARCHAR(200),
  id_number VARCHAR(50),
  id_type VARCHAR(30) DEFAULT 'national_id',
  nationality_id INTEGER,
  phone VARCHAR(30),
  phone2 VARCHAR(30),
  email VARCHAR(100),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(30),
  license_number VARCHAR(50),
  license_type VARCHAR(30) DEFAULT 'heavy',
  license_expiry DATE,
  license_issuing_country_id INTEGER,
  transport_company_id INTEGER REFERENCES transport_companies(id),
  assigned_vehicle_id INTEGER REFERENCES vehicles(id),
  current_status VARCHAR(30) DEFAULT 'available',
  hire_date DATE,
  contract_end DATE,
  daily_rate NUMERIC(12,2),
  per_trip_rate NUMERIC(12,2),
  total_trips INTEGER DEFAULT 0,
  total_km INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  certifications TEXT[],
  violations_count INTEGER DEFAULT 0,
  blood_type VARCHAR(5),
  medical_clearance_expiry DATE,
  photo_url VARCHAR(500),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(company_id, current_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_transport_co ON drivers(transport_company_id) WHERE deleted_at IS NULL;

-- 5. Transport Routes (خطوط النقل)
CREATE TABLE IF NOT EXISTS transport_routes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  route_type VARCHAR(30) DEFAULT 'domestic',
  transport_mode VARCHAR(30) DEFAULT 'land',
  origin_type VARCHAR(30) DEFAULT 'city',
  origin_port_id INTEGER,
  origin_city_id INTEGER,
  origin_country_id INTEGER,
  origin_description VARCHAR(200),
  destination_type VARCHAR(30) DEFAULT 'city',
  destination_port_id INTEGER,
  destination_city_id INTEGER,
  destination_country_id INTEGER,
  destination_description VARCHAR(200),
  via_points JSONB DEFAULT '[]',
  distance_km NUMERIC(10,2),
  estimated_hours NUMERIC(8,2),
  estimated_days INTEGER,
  cost_per_trip NUMERIC(14,2),
  cost_per_ton_km NUMERIC(8,4),
  currency_code VARCHAR(3) DEFAULT 'SAR',
  requires_customs_clearance BOOLEAN DEFAULT false,
  border_crossing_points TEXT[],
  risk_level VARCHAR(20) DEFAULT 'low',
  frequency VARCHAR(20) DEFAULT 'on_demand',
  preferred_carrier_id INTEGER REFERENCES transport_companies(id),
  max_weight_tons NUMERIC(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_transport_routes_company ON transport_routes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_routes_mode ON transport_routes(company_id, transport_mode) WHERE deleted_at IS NULL;

-- 6. Customs Statuses (حالات التخليص الجمركي)
CREATE TABLE IF NOT EXISTS customs_statuses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description_en TEXT,
  description_ar TEXT,
  status_category VARCHAR(30) DEFAULT 'declaration',
  color_hex VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50),
  sequence_order INTEGER DEFAULT 0,
  is_initial BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  is_blocking BOOLEAN DEFAULT false,
  allowed_next_statuses TEXT[],
  requires_document BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  auto_notify BOOLEAN DEFAULT true,
  sla_hours INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customs_statuses_company ON customs_statuses(company_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 2: ALTER EXISTING TABLES
-- ============================================================================

-- A. shipping_companies — add missing columns
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(50);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS city_id INTEGER;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS tracking_url_template VARCHAR(500);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS api_endpoint VARCHAR(500);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS integration_enabled BOOLEAN DEFAULT false;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS transport_modes TEXT[];
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS coverage_regions TEXT[];
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
UPDATE shipping_companies SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- B. clearance_offices — add missing columns
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS commercial_reg_number VARCHAR(50);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS customs_license_number VARCHAR(100);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS customs_license_expiry DATE;
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS fax VARCHAR(30);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS city_id INTEGER;
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS operating_ports INTEGER[];
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
UPDATE clearance_offices SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- C. insurance_types — add missing columns
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS coverage_level VARCHAR(50);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_theft BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_damage BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_total_loss BOOLEAN DEFAULT true;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_war_risk BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_natural_disaster BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS is_standard_icc BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS icc_clause VARCHAR(10);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS min_premium_rate NUMERIC(8,4);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS max_premium_rate NUMERIC(8,4);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS deductible_percent NUMERIC(5,2);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS applicable_modes TEXT[];
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- D. container_types — add physical dimensions
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS length_ft NUMERIC(6,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_length_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_width_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_height_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_length_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_width_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_height_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS tare_weight_kg NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS max_payload_kg NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_volume_m3 NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_refrigerated BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_open_top BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_flat_rack BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_tank BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS teu NUMERIC(3,1) DEFAULT 1;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS iso_code VARCHAR(10);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- E. ports — add missing columns
ALTER TABLE ports ADD COLUMN IF NOT EXISTS un_locode VARCHAR(10);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS iata_code VARCHAR(10);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_fcl BOOLEAN DEFAULT true;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_lcl BOOLEAN DEFAULT true;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_bulk BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_roro BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_dangerous BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS free_zone BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS annual_capacity_teu INTEGER;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- F. shipment_types — add missing columns
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS avg_transit_days INTEGER;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_container BOOLEAN DEFAULT true;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_bulk BOOLEAN DEFAULT false;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_dangerous BOOLEAN DEFAULT false;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS typical_cost_range VARCHAR(50);
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- G. shipping_methods — add name_en and fix
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS cost_basis VARCHAR(50);
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS updated_by INTEGER;
UPDATE shipping_methods SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- H. shipment_classifications — add columns
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS un_code VARCHAR(10);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS hazard_class VARCHAR(10);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS requires_special_handling BOOLEAN DEFAULT false;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS requires_temperature_control BOOLEAN DEFAULT false;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS temperature_min NUMERIC(5,1);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS temperature_max NUMERIC(5,1);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS max_stack_layers INTEGER;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS handling_instructions_en TEXT;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS handling_instructions_ar TEXT;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- I. bill_of_lading_types — add columns
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(20);
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS document_kind VARCHAR(30);
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS requires_original BOOLEAN DEFAULT true;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS copies_required INTEGER DEFAULT 3;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS can_endorse BOOLEAN DEFAULT false;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- J. customs_offices — add missing columns
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS handles_imports BOOLEAN DEFAULT true;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS handles_exports BOOLEAN DEFAULT true;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS handles_transit BOOLEAN DEFAULT false;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS authority_code VARCHAR(50);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS e_customs_system VARCHAR(100);

-- K. insurance_companies — add missing columns
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS city_id INTEGER;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS specializations TEXT[];
UPDATE insurance_companies SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- L. laboratories — add missing columns
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS city_id INTEGER;
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS accreditation_expiry DATE;
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS specializations TEXT[];
UPDATE laboratories SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- ============================================================================
-- PART 3: SEED DATA
-- ============================================================================

-- Seed customs_statuses (workflow)
INSERT INTO customs_statuses (company_id, code, name_en, name_ar, status_category, color_hex, sequence_order, is_initial, is_final, is_blocking, allowed_next_statuses, is_system, is_active) VALUES
(7, 'SUBMITTED', 'Declaration Submitted', 'تم تقديم البيان', 'declaration', '#3B82F6', 1, true, false, false, ARRAY['UNDER_REVIEW','REJECTED'], true, true),
(7, 'UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 'declaration', '#8B5CF6', 2, false, false, false, ARRAY['DOCS_VERIFIED','ADDITIONAL_DOCS','REJECTED'], true, true),
(7, 'ADDITIONAL_DOCS', 'Additional Docs Required', 'مستندات إضافية مطلوبة', 'declaration', '#F59E0B', 3, false, false, true, ARRAY['UNDER_REVIEW','REJECTED'], true, true),
(7, 'DOCS_VERIFIED', 'Documents Verified', 'تم التحقق من المستندات', 'declaration', '#10B981', 4, false, false, false, ARRAY['INSPECTION','DUTY_ASSESSED'], true, true),
(7, 'INSPECTION', 'Inspection Scheduled', 'فحص مجدول', 'inspection', '#6366F1', 5, false, false, false, ARRAY['INSPECTION_PASS','INSPECTION_FAIL'], true, true),
(7, 'INSPECTION_PASS', 'Inspection Passed', 'اجتاز الفحص', 'inspection', '#10B981', 6, false, false, false, ARRAY['DUTY_ASSESSED'], true, true),
(7, 'INSPECTION_FAIL', 'Inspection Failed', 'لم يجتز الفحص', 'inspection', '#EF4444', 7, false, false, true, ARRAY['INSPECTION','ON_HOLD','REJECTED'], true, true),
(7, 'DUTY_ASSESSED', 'Duty Assessed', 'تم تقدير الرسوم', 'payment', '#F59E0B', 8, false, false, false, ARRAY['PAYMENT_PENDING'], true, true),
(7, 'PAYMENT_PENDING', 'Payment Pending', 'بانتظار الدفع', 'payment', '#F97316', 9, false, false, true, ARRAY['PAYMENT_DONE'], true, true),
(7, 'PAYMENT_DONE', 'Payment Confirmed', 'تم تأكيد الدفع', 'payment', '#10B981', 10, false, false, false, ARRAY['RELEASED'], true, true),
(7, 'RELEASED', 'Released', 'تم الإفراج', 'release', '#22C55E', 11, false, false, false, ARRAY['DELIVERED'], true, true),
(7, 'DELIVERED', 'Delivered', 'تم التسليم', 'release', '#059669', 12, false, true, false, ARRAY[]::TEXT[], true, true),
(7, 'REJECTED', 'Rejected', 'مرفوض', 'hold', '#EF4444', 99, false, true, true, ARRAY[]::TEXT[], true, true),
(7, 'ON_HOLD', 'On Hold', 'معلق', 'hold', '#F97316', 98, false, false, true, ARRAY['UNDER_REVIEW','INSPECTION','REJECTED'], true, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Seed vehicle_types
INSERT INTO vehicle_types (company_id, code, name_en, name_ar, category, max_weight_tons, fuel_type, is_refrigerated, is_active) VALUES
(7, 'TRAILER-40', '40ft Trailer', 'مقطورة 40 قدم', 'trailer', 30, 'diesel', false, true),
(7, 'REEFER-40', '40ft Refrigerated', 'مبردة 40 قدم', 'refrigerated_truck', 25, 'diesel', true, true),
(7, 'FLATBED', 'Flatbed Truck', 'شاحنة مسطحة', 'flatbed', 35, 'diesel', false, true),
(7, 'TANKER', 'Fuel Tanker', 'ناقلة وقود', 'tanker', 40, 'diesel', false, true),
(7, 'PICKUP', 'Pickup Truck', 'بيكب', 'pickup', 3.5, 'petrol', false, true),
(7, 'LOWBED', 'Lowbed Trailer', 'لوبد', 'lowbed', 60, 'diesel', false, true),
(7, 'VAN', 'Delivery Van', 'فان توصيل', 'van', 3, 'petrol', false, true),
(7, 'CONT-CHASSIS', 'Container Chassis', 'شاسية حاويات', 'container_chassis', 35, 'diesel', false, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Seed transport_companies
INSERT INTO transport_companies (company_id, code, name_en, name_ar, company_type, service_coverage, fleet_size, rating, is_active) VALUES
(7, 'SMASCO', 'Saudi Massarat Cargo', 'مسارات السعودية للشحن', 'land_transport', 'domestic', 150, 4, true),
(7, 'BAHRI-LOG', 'Bahri Logistics', 'بحري للخدمات اللوجستية', 'multimodal', 'international', 500, 5, true),
(7, 'ALMAJDOUIE', 'Almajdouie Logistics', 'المجدوعي للوجستيات', 'freight_forwarder', 'both', 300, 4, true),
(7, 'TCC', 'TCC Transport', 'النقل المتكامل TCC', 'land_transport', 'domestic', 80, 3, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================================
-- PART 4: PERMISSIONS
-- ============================================================================

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
-- Transport Companies
('transport_companies:view', 'transport_companies', 'view', 'View transport companies', 'logistics'),
('transport_companies:create', 'transport_companies', 'create', 'Create transport companies', 'logistics'),
('transport_companies:update', 'transport_companies', 'update', 'Update transport companies', 'logistics'),
('transport_companies:delete', 'transport_companies', 'delete', 'Delete transport companies', 'logistics'),
-- Vehicle Types
('vehicle_types:view', 'vehicle_types', 'view', 'View vehicle types', 'logistics'),
('vehicle_types:create', 'vehicle_types', 'create', 'Create vehicle types', 'logistics'),
('vehicle_types:update', 'vehicle_types', 'update', 'Update vehicle types', 'logistics'),
('vehicle_types:delete', 'vehicle_types', 'delete', 'Delete vehicle types', 'logistics'),
-- Vehicles
('vehicles:view', 'vehicles', 'view', 'View vehicles', 'logistics'),
('vehicles:create', 'vehicles', 'create', 'Create vehicles', 'logistics'),
('vehicles:update', 'vehicles', 'update', 'Update vehicles', 'logistics'),
('vehicles:delete', 'vehicles', 'delete', 'Delete vehicles', 'logistics'),
-- Drivers
('drivers:view', 'drivers', 'view', 'View drivers', 'logistics'),
('drivers:create', 'drivers', 'create', 'Create drivers', 'logistics'),
('drivers:update', 'drivers', 'update', 'Update drivers', 'logistics'),
('drivers:delete', 'drivers', 'delete', 'Delete drivers', 'logistics'),
-- Transport Routes
('transport_routes:view', 'transport_routes', 'view', 'View transport routes', 'logistics'),
('transport_routes:create', 'transport_routes', 'create', 'Create transport routes', 'logistics'),
('transport_routes:update', 'transport_routes', 'update', 'Update transport routes', 'logistics'),
('transport_routes:delete', 'transport_routes', 'delete', 'Delete transport routes', 'logistics'),
-- Customs Statuses
('customs_statuses:view', 'customs_statuses', 'view', 'View customs statuses', 'customs'),
('customs_statuses:create', 'customs_statuses', 'create', 'Create customs statuses', 'customs'),
('customs_statuses:update', 'customs_statuses', 'update', 'Update customs statuses', 'customs'),
('customs_statuses:delete', 'customs_statuses', 'delete', 'Delete customs statuses', 'customs')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign all new permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.permission_code IN (
  'transport_companies:view','transport_companies:create','transport_companies:update','transport_companies:delete',
  'vehicle_types:view','vehicle_types:create','vehicle_types:update','vehicle_types:delete',
  'vehicles:view','vehicles:create','vehicles:update','vehicles:delete',
  'drivers:view','drivers:create','drivers:update','drivers:delete',
  'transport_routes:view','transport_routes:create','transport_routes:update','transport_routes:delete',
  'customs_statuses:view','customs_statuses:create','customs_statuses:update','customs_statuses:delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
