-- ============================================================================
-- Migration 408: Master Data Strategy — §7 البيانات المرجعية
-- ============================================================================
-- Implements the 3-layer master data architecture:
--   🌍 Global  (public schema, read-only for tenants)
--   🔄 Seeded  (cloned to tenant schema, tenant can modify)
--   🏢 Private (tenant-only data)
--
-- Creates:
--   1. 10 missing reference tables (supplier_types, contact_types, etc.)
--   2. master_data_catalog registry + v_master_data_health view
--   3. Compatibility views for name mismatches
--   4. Seed data for all 24 §7.2 tables
--   5. data_layer column on key tables
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Create Missing Reference Tables (10 of 24)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. supplier_types ───
CREATE TABLE IF NOT EXISTS supplier_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  icon          VARCHAR(50),
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);

-- Add missing columns if table existed from an older migration
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE supplier_types ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_types_code
  ON supplier_types(code) WHERE deleted_at IS NULL;

-- ─── 2. contact_types ───
CREATE TABLE IF NOT EXISTS contact_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  icon          VARCHAR(50),
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_types_code
  ON contact_types(code) WHERE deleted_at IS NULL;

-- ─── 3. unit_types (dedicated table) ───
CREATE TABLE IF NOT EXISTS unit_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  category      VARCHAR(50),   -- WEIGHT, LENGTH, VOLUME, AREA, COUNT, TIME, PACK
  symbol        VARCHAR(20),
  conversion_factor DECIMAL(18,8) DEFAULT 1.0,
  base_unit_code VARCHAR(50),  -- FK to self for conversions
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_types_code
  ON unit_types(code) WHERE deleted_at IS NULL;

-- ─── 4. tracking_policies ───
CREATE TABLE IF NOT EXISTS tracking_policies (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  tracking_level VARCHAR(50) DEFAULT 'shipment',  -- shipment, container, item, package
  requires_gps  BOOLEAN DEFAULT FALSE,
  update_frequency_minutes INTEGER DEFAULT 60,
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_policies_code
  ON tracking_policies(code) WHERE deleted_at IS NULL;

-- ─── 5. shipment_types ───
CREATE TABLE IF NOT EXISTS shipment_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  mode          VARCHAR(50),   -- SEA, AIR, LAND, RAIL, MULTIMODAL
  icon          VARCHAR(50),
  requires_customs BOOLEAN DEFAULT TRUE,
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_types_code
  ON shipment_types(code) WHERE deleted_at IS NULL;

-- ─── 6. container_types ───
CREATE TABLE IF NOT EXISTS container_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  size_feet     INTEGER,       -- 20, 40, 45
  type_category VARCHAR(50),   -- DRY, REEFER, OPEN_TOP, FLAT_RACK, TANK
  max_weight_kg DECIMAL(10,2),
  max_volume_cbm DECIMAL(10,2),
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_container_types_code
  ON container_types(code) WHERE deleted_at IS NULL;

-- ─── 7. bill_of_lading_types ───
CREATE TABLE IF NOT EXISTS bill_of_lading_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  is_negotiable BOOLEAN DEFAULT TRUE,
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_of_lading_types_code
  ON bill_of_lading_types(code) WHERE deleted_at IS NULL;

-- ─── 8. insurance_types ───
CREATE TABLE IF NOT EXISTS insurance_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  coverage_scope VARCHAR(100),  -- ALL_RISK, FPA, WA, ICC_A, ICC_B, ICC_C
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_types_code
  ON insurance_types(code) WHERE deleted_at IS NULL;

-- ─── 9. shipment_categories ───
CREATE TABLE IF NOT EXISTS shipment_categories (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  parent_id     INTEGER REFERENCES shipment_categories(id),
  icon          VARCHAR(50),
  color         VARCHAR(7),
  is_active     BOOLEAN DEFAULT TRUE,
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_categories_code
  ON shipment_categories(code) WHERE deleted_at IS NULL;

-- ─── 10. Compatibility view: timezones → time_zones ───
-- (time_zones already exists, create "timezones" as alias)
CREATE OR REPLACE VIEW timezones AS
  SELECT * FROM time_zones;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: master_data_catalog Registry Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS master_data_catalog (
  id                SERIAL PRIMARY KEY,
  table_name        VARCHAR(100) NOT NULL UNIQUE,
  display_name_en   VARCHAR(200) NOT NULL,
  display_name_ar   VARCHAR(200),
  data_layer        VARCHAR(20) NOT NULL CHECK (data_layer IN ('GLOBAL', 'SEEDED', 'PRIVATE')),
  module            VARCHAR(50) DEFAULT 'core',
  version           INTEGER DEFAULT 1,
  description_en    TEXT,
  description_ar    TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  supports_tenant_override  BOOLEAN DEFAULT FALSE,
  supports_country_scope    BOOLEAN DEFAULT FALSE,
  auto_provision_on_company_create BOOLEAN DEFAULT FALSE,
  record_count_global       INTEGER DEFAULT 0,
  expected_minimum_records  INTEGER DEFAULT 0,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at        TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mdc_data_layer ON master_data_catalog(data_layer);
CREATE INDEX IF NOT EXISTS idx_mdc_module ON master_data_catalog(module);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Seed master_data_catalog with all 24 §7.2 tables
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO master_data_catalog
  (table_name, display_name_en, display_name_ar, data_layer, module,
   description_en, supports_tenant_override, auto_provision_on_company_create,
   expected_minimum_records, sort_order)
VALUES
  -- ── 🌍 Global Tables ──
  ('countries',           'Countries',              'الدول',               'GLOBAL',  'core',
   'ISO country codes with Arabic names',           FALSE, FALSE, 25, 1),
  ('time_zones',          'Timezones',              'المناطق الزمنية',    'GLOBAL',  'core',
   'UTC-based timezone definitions',                FALSE, FALSE, 15, 2),
  ('system_languages',    'Languages',              'اللغات',             'GLOBAL',  'core',
   'System-supported languages',                    FALSE, FALSE, 10, 3),
  ('currencies',          'Currencies',             'العملات',            'GLOBAL',  'core',
   'ISO 4217 currency codes',                       TRUE,  TRUE,  18, 4),
  ('ui_themes',           'UI Themes',              'ثيمات الواجهة',      'GLOBAL',  'core',
   'Application color themes',                      FALSE, FALSE, 6,  5),
  ('container_types',     'Container Types',        'أنواع الحاويات',     'GLOBAL',  'shipments',
   'ISO container size/type classifications',       FALSE, FALSE, 12, 20),
  ('incoterms',           'Incoterms',              'شروط التجارة الدولية','GLOBAL', 'shipments',
   'ICC Incoterms 2020',                            FALSE, FALSE, 11, 21),
  ('bill_of_lading_types','Bill of Lading Types',   'أنواع بوليصة الشحن', 'GLOBAL',  'shipments',
   'B/L document classification',                   FALSE, FALSE, 8,  22),
  ('insurance_types',     'Insurance Types',        'أنواع التأمين',      'GLOBAL',  'shipments',
   'Cargo insurance coverage levels',               FALSE, FALSE, 6,  23),

  -- ── 🔄 Seeded Tables ──
  ('contact_methods',     'Contact Methods',        'طرق الاتصال',        'SEEDED',  'core',
   'Communication channel types',                   TRUE,  TRUE,  9,  6),
  ('record_statuses',     'Record Statuses',        'حالات السجلات',      'SEEDED',  'core',
   'Universal lifecycle statuses',                  TRUE,  TRUE,  7,  7),
  ('request_statuses',    'Request Statuses',       'حالات الطلبات',      'SEEDED',  'core',
   'Workflow request states',                       TRUE,  TRUE,  8,  8),
  ('supplier_types',      'Supplier Types',         'أنواع الموردين',     'SEEDED',  'procurement',
   'Vendor classification by service type',         TRUE,  TRUE,  8,  9),
  ('address_types',       'Address Types',          'أنواع العناوين',     'SEEDED',  'core',
   'Contact address classifications',               TRUE,  TRUE,  7,  10),
  ('contact_types',       'Contact Types',          'أنواع جهات الاتصال', 'SEEDED',  'core',
   'Person/entity contact roles',                   TRUE,  TRUE,  8,  11),
  ('customer_types',      'Customer Types',         'أنواع العملاء',      'SEEDED',  'crm',
   'Customer classification types',                 TRUE,  TRUE,  7,  12),
  ('supply_terms',        'Supply Terms',           'شروط التوريد',       'SEEDED',  'procurement',
   'Delivery/supply agreement terms',               TRUE,  TRUE,  8,  13),
  ('delivery_terms',      'Delivery Terms',         'شروط التسليم',       'SEEDED',  'procurement',
   'Shipping responsibility terms',                 TRUE,  TRUE,  8,  14),
  ('contract_types',      'Contract Types',         'أنواع العقود',       'SEEDED',  'procurement',
   'Legal contract classifications',                TRUE,  TRUE,  8,  15),
  ('unit_types',          'Unit Types',             'أنواع الوحدات',      'SEEDED',  'master_data',
   'Units of measure by category',                  TRUE,  TRUE,  15, 16),
  ('warehouse_types',     'Warehouse Types',        'أنواع المستودعات',   'SEEDED',  'warehousing',
   'Storage facility classifications',              TRUE,  TRUE,  8,  17),
  ('tracking_policies',   'Tracking Policies',      'سياسات التتبع',      'SEEDED',  'shipments',
   'Shipment tracking configurations',              TRUE,  TRUE,  6,  18),
  ('shipment_types',      'Shipment Types',         'أنواع الشحنات',      'SEEDED',  'shipments',
   'Transport mode and service types',              TRUE,  TRUE,  7,  19),
  ('shipment_categories', 'Shipment Categories',    'تصنيفات الشحنات',    'SEEDED',  'shipments',
   'Cargo type classifications',                    TRUE,  TRUE,  10, 24)
ON CONFLICT (table_name) DO UPDATE SET
  display_name_en   = EXCLUDED.display_name_en,
  display_name_ar   = EXCLUDED.display_name_ar,
  data_layer        = EXCLUDED.data_layer,
  module            = EXCLUDED.module,
  description_en    = EXCLUDED.description_en,
  supports_tenant_override = EXCLUDED.supports_tenant_override,
  auto_provision_on_company_create = EXCLUDED.auto_provision_on_company_create,
  expected_minimum_records = EXCLUDED.expected_minimum_records,
  sort_order        = EXCLUDED.sort_order,
  updated_at        = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: v_master_data_health Materialized View
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper function: count rows in any table safely
CREATE OR REPLACE FUNCTION safe_row_count(p_table TEXT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count BIGINT;
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE deleted_at IS NULL', p_table) INTO v_count;
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RETURN -1;  -- table doesn't exist or has no deleted_at
END;
$$;

-- Create the view that masterDataStrategy.ts queries
CREATE OR REPLACE VIEW v_master_data_health AS
SELECT
  mdc.table_name,
  mdc.display_name_en,
  mdc.display_name_ar,
  mdc.data_layer,
  mdc.module,
  safe_row_count(mdc.table_name) AS record_count_global,
  (SELECT COUNT(DISTINCT c.id) FROM companies c WHERE c.deleted_at IS NULL) AS total_companies,
  mdc.expected_minimum_records,
  mdc.auto_provision_on_company_create,
  mdc.supports_tenant_override,
  mdc.is_active
FROM master_data_catalog mdc
WHERE mdc.deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: Seed Data for New Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── supplier_types (8 types) ───
INSERT INTO supplier_types (code, name_en, name_ar, description_en, description_ar, is_system, sort_order) VALUES
  ('MANUFACTURER',  'Manufacturer',         'مصنّع',           'Direct product manufacturer',              'مصنّع مباشر للمنتجات',        TRUE, 1),
  ('DISTRIBUTOR',   'Distributor',           'موزّع',           'Authorized product distributor',           'موزّع معتمد للمنتجات',        TRUE, 2),
  ('WHOLESALER',    'Wholesaler',            'تاجر جملة',       'Bulk quantity supplier',                  'مورّد بكميات كبيرة',          TRUE, 3),
  ('RETAILER',      'Retailer',              'تاجر تجزئة',      'Retail quantity supplier',                'مورّد بكميات تجزئة',          TRUE, 4),
  ('SERVICE',       'Service Provider',      'مزوّد خدمات',     'Service-based supplier',                  'مورّد قائم على الخدمات',      TRUE, 5),
  ('FREIGHT',       'Freight Agent',         'وكيل شحن',        'Shipping and logistics agent',            'وكيل شحن ولوجستيات',         TRUE, 6),
  ('CUSTOMS',       'Customs Broker',        'مخلص جمركي',      'Customs clearance agent',                 'وكيل تخليص جمركي',           TRUE, 7),
  ('CONSULTANT',    'Consultant',            'استشاري',         'Professional advisory services',           'خدمات استشارية مهنية',       TRUE, 8)
ON CONFLICT DO NOTHING;

-- ─── contact_types (8 types) ───
INSERT INTO contact_types (code, name_en, name_ar, description_en, description_ar, is_system, sort_order) VALUES
  ('PRIMARY',       'Primary Contact',       'جهة اتصال رئيسية',    'Main point of contact',                  'نقطة الاتصال الرئيسية',      TRUE, 1),
  ('BILLING',       'Billing Contact',       'جهة اتصال الفوترة',   'Invoicing and payment contact',          'جهة الاتصال للفوترة والسداد', TRUE, 2),
  ('SHIPPING',      'Shipping Contact',      'جهة اتصال الشحن',     'Delivery and logistics contact',         'جهة الاتصال للشحن والتوصيل', TRUE, 3),
  ('TECHNICAL',     'Technical Contact',     'جهة اتصال فنية',      'Technical support contact',              'جهة الاتصال للدعم الفني',    TRUE, 4),
  ('MANAGEMENT',    'Management',            'إدارة',               'Executive/management contact',           'جهة اتصال إدارية',           TRUE, 5),
  ('SALES',         'Sales Contact',         'جهة اتصال المبيعات',  'Sales representative',                   'مندوب المبيعات',             TRUE, 6),
  ('LEGAL',         'Legal Contact',         'جهة اتصال قانونية',   'Legal department contact',               'جهة الاتصال القانونية',      TRUE, 7),
  ('EMERGENCY',     'Emergency Contact',     'جهة اتصال الطوارئ',   'Emergency/after-hours contact',          'جهة اتصال الطوارئ',          TRUE, 8)
ON CONFLICT DO NOTHING;

-- ─── unit_types (15 units) ───
INSERT INTO unit_types (code, name_en, name_ar, category, symbol, is_system, sort_order) VALUES
  ('KG',    'Kilogram',       'كيلوغرام',    'WEIGHT',   'kg',   TRUE, 1),
  ('TON',   'Metric Ton',     'طن متري',     'WEIGHT',   't',    TRUE, 2),
  ('LB',    'Pound',          'رطل',         'WEIGHT',   'lb',   TRUE, 3),
  ('M',     'Meter',          'متر',         'LENGTH',   'm',    TRUE, 4),
  ('CM',    'Centimeter',     'سنتيمتر',     'LENGTH',   'cm',   TRUE, 5),
  ('FT',    'Foot',           'قدم',         'LENGTH',   'ft',   TRUE, 6),
  ('CBM',   'Cubic Meter',    'متر مكعب',    'VOLUME',   'm³',   TRUE, 7),
  ('L',     'Liter',          'لتر',         'VOLUME',   'L',    TRUE, 8),
  ('SQM',   'Square Meter',   'متر مربع',    'AREA',     'm²',   TRUE, 9),
  ('PCS',   'Pieces',         'قطعة',        'COUNT',    'pcs',  TRUE, 10),
  ('PKG',   'Package',        'طرد',         'PACK',     'pkg',  TRUE, 11),
  ('CTN',   'Carton',         'كرتون',       'PACK',     'ctn',  TRUE, 12),
  ('PLT',   'Pallet',         'منصة نقل',    'PACK',     'plt',  TRUE, 13),
  ('HR',    'Hour',           'ساعة',        'TIME',     'hr',   TRUE, 14),
  ('DAY',   'Day',            'يوم',         'TIME',     'day',  TRUE, 15)
ON CONFLICT DO NOTHING;

-- ─── tracking_policies (6 policies) ───
INSERT INTO tracking_policies (code, name_en, name_ar, description_en, description_ar, tracking_level, requires_gps, update_frequency_minutes, is_system, sort_order) VALUES
  ('REAL_TIME',  'Real-Time Tracking',  'تتبع فوري',           'GPS-based real-time container tracking', 'تتبع فوري عبر نظام تحديد المواقع', 'container', TRUE,  5,   TRUE, 1),
  ('HOURLY',     'Hourly Updates',      'تحديث كل ساعة',       'Position updates every 60 minutes',     'تحديث الموقع كل 60 دقيقة',         'shipment',  TRUE,  60,  TRUE, 2),
  ('DAILY',      'Daily Status',        'حالة يومية',          'Daily shipment status updates',         'تحديثات حالة الشحنة يومياً',       'shipment',  FALSE, 1440, TRUE, 3),
  ('MILESTONE',  'Milestone Only',      'معالم فقط',           'Updates at key shipment milestones',    'تحديثات عند المعالم الرئيسية',     'shipment',  FALSE, 0,   TRUE, 4),
  ('ON_DEMAND',  'On-Demand',           'عند الطلب',           'Manual status updates when requested',  'تحديثات يدوية عند الطلب',          'shipment',  FALSE, 0,   TRUE, 5),
  ('GEOFENCE',   'Geofence Alerts',     'تنبيهات السياج الجغرافي','Automatic alerts at geofence boundaries','تنبيهات تلقائية عند حدود السياج', 'container', TRUE,  15,  TRUE, 6)
ON CONFLICT DO NOTHING;

-- ─── shipment_types (7 types) ───
INSERT INTO shipment_types (code, name_en, name_ar, description_en, description_ar, mode, requires_customs, is_system, sort_order) VALUES
  ('SEA_FCL', 'Sea - Full Container',    'بحري - حاوية كاملة',  'Full container load ocean freight',            'شحن بحري حاوية كاملة',       'SEA',        TRUE,  TRUE, 1),
  ('SEA_LCL', 'Sea - Less Container',    'بحري - حاوية جزئية',  'Less than container load ocean freight',       'شحن بحري حاوية جزئية',       'SEA',        TRUE,  TRUE, 2),
  ('AIR',     'Air Freight',              'شحن جوي',            'Air cargo transport',                          'نقل البضائع جواً',            'AIR',        TRUE,  TRUE, 3),
  ('LAND',    'Land Transport',           'نقل بري',            'Road freight transport',                       'نقل بري عبر الطرق',          'LAND',       TRUE,  TRUE, 4),
  ('RAIL',    'Rail Freight',             'شحن بالسكك الحديدية','Railway cargo transport',                      'نقل البضائع بالقطار',         'RAIL',       TRUE,  TRUE, 5),
  ('MULTI',   'Multimodal',              'متعدد الوسائط',       'Combined transport modes',                     'نقل متعدد الوسائط',          'MULTIMODAL', TRUE,  TRUE, 6),
  ('LOCAL',   'Local Delivery',          'توصيل محلي',          'Domestic/local delivery only',                 'توصيل محلي فقط',             'LAND',       FALSE, TRUE, 7)
ON CONFLICT DO NOTHING;

-- ─── container_types (12 types) ───
INSERT INTO container_types (code, name_en, name_ar, size_feet, type_category, max_weight_kg, max_volume_cbm, is_system, sort_order) VALUES
  ('20GP',   '20ft General Purpose',   'حاوية 20 قدم عامة',       20, 'DRY',       21770,  33.2,  TRUE, 1),
  ('40GP',   '40ft General Purpose',   'حاوية 40 قدم عامة',       40, 'DRY',       26780,  67.7,  TRUE, 2),
  ('40HC',   '40ft High Cube',         'حاوية 40 قدم مرتفعة',     40, 'DRY',       26580,  76.3,  TRUE, 3),
  ('20RF',   '20ft Reefer',            'حاوية تبريد 20 قدم',      20, 'REEFER',    21250,  28.3,  TRUE, 4),
  ('40RF',   '40ft Reefer',            'حاوية تبريد 40 قدم',      40, 'REEFER',    26250,  59.3,  TRUE, 5),
  ('40RH',   '40ft Reefer High Cube',  'حاوية تبريد مرتفعة 40 قدم',40,'REEFER',   25900,  67.5,  TRUE, 6),
  ('20OT',   '20ft Open Top',          'حاوية مفتوحة 20 قدم',     20, 'OPEN_TOP',  21750,  32.5,  TRUE, 7),
  ('40OT',   '40ft Open Top',          'حاوية مفتوحة 40 قدم',     40, 'OPEN_TOP',  26630,  65.9,  TRUE, 8),
  ('20FR',   '20ft Flat Rack',         'حاوية مسطحة 20 قدم',      20, 'FLAT_RACK', 21700,  NULL,  TRUE, 9),
  ('40FR',   '40ft Flat Rack',         'حاوية مسطحة 40 قدم',      40, 'FLAT_RACK', 26000,  NULL,  TRUE, 10),
  ('20TK',   '20ft Tank Container',    'حاوية صهريج 20 قدم',      20, 'TANK',      20900,  21.0,  TRUE, 11),
  ('45HC',   '45ft High Cube',         'حاوية 45 قدم مرتفعة',     45, 'DRY',       25600,  86.0,  TRUE, 12)
ON CONFLICT DO NOTHING;

-- ─── bill_of_lading_types (8 types) ───
INSERT INTO bill_of_lading_types (code, name_en, name_ar, description_en, description_ar, is_negotiable, is_system, sort_order) VALUES
  ('MASTER_BL',   'Master Bill of Lading',    'بوليصة شحن رئيسية',       'Carrier-issued B/L for entire shipment',      'بوليصة صادرة من الناقل للشحنة الكاملة', TRUE,  TRUE, 1),
  ('HOUSE_BL',    'House Bill of Lading',     'بوليصة شحن فرعية',        'Freight forwarder-issued B/L',                'بوليصة صادرة من وكيل الشحن',            TRUE,  TRUE, 2),
  ('STRAIGHT_BL', 'Straight Bill of Lading',  'بوليصة شحن مباشرة',       'Non-negotiable, named consignee only',        'بوليصة غير قابلة للتداول',              FALSE, TRUE, 3),
  ('ORDER_BL',    'Order Bill of Lading',     'بوليصة شحن لأمر',         'Negotiable, transferable by endorsement',     'بوليصة قابلة للتداول بالتظهير',         TRUE,  TRUE, 4),
  ('SEAWAY_BL',   'Sea Waybill',              'خطاب بحري',               'Non-negotiable proof of shipment',            'إثبات شحن غير قابل للتداول',           FALSE, TRUE, 5),
  ('CHARTER_BL',  'Charter Party B/L',        'بوليصة عقد إيجار',        'Issued under charter party contract',         'بوليصة صادرة بموجب عقد إيجار',         TRUE,  TRUE, 6),
  ('COMBINED_BL', 'Combined Transport B/L',   'بوليصة نقل مشترك',        'Multimodal transport document',               'مستند نقل متعدد الوسائط',              TRUE,  TRUE, 7),
  ('SWITCH_BL',   'Switch Bill of Lading',    'بوليصة شحن بديلة',        'Replacement B/L for trade intermediaries',    'بوليصة بديلة للوسطاء التجاريين',       TRUE,  TRUE, 8)
ON CONFLICT DO NOTHING;

-- ─── insurance_types (6 types) ───
INSERT INTO insurance_types (code, name_en, name_ar, description_en, description_ar, coverage_scope, is_system, sort_order) VALUES
  ('ICC_A',  'Institute Cargo Clause A',  'شرط البضائع A',  'All-risk coverage (widest)',                 'تغطية شاملة (الأوسع)',          'ALL_RISK', TRUE, 1),
  ('ICC_B',  'Institute Cargo Clause B',  'شرط البضائع B',  'Named perils: fire, sinking, collision',    'أخطار مسماة: حريق، غرق، تصادم', 'WA',       TRUE, 2),
  ('ICC_C',  'Institute Cargo Clause C',  'شرط البضائع C',  'Basic perils: sinking, fire only',          'أخطار أساسية: غرق، حريق فقط',   'FPA',      TRUE, 3),
  ('WAR',    'War Risk Insurance',        'تأمين مخاطر الحرب','Coverage for war, strikes, terrorism',     'تغطية الحرب والإضرابات والإرهاب','WAR',      TRUE, 4),
  ('STRIKE', 'Strike Risk Insurance',     'تأمين مخاطر الإضراب','Coverage for strikes and civil commotion','تغطية الإضرابات والاضطرابات',   'STRIKE',   TRUE, 5),
  ('OPEN',   'Open Cover Policy',         'بوليصة تغطية مفتوحة','Blanket coverage for all shipments',     'تغطية شاملة لكل الشحنات',       'ALL_RISK', TRUE, 6)
ON CONFLICT DO NOTHING;

-- ─── shipment_categories (10 categories) ───
INSERT INTO shipment_categories (code, name_en, name_ar, description_en, description_ar, color, is_system, sort_order) VALUES
  ('GENERAL',     'General Cargo',        'بضائع عامة',          'Standard non-specialized freight',        'بضائع عادية غير متخصصة',      '#3B82F6', TRUE, 1),
  ('PERISHABLE',  'Perishable Goods',     'بضائع قابلة للتلف',   'Temperature-sensitive products',          'منتجات حساسة للحرارة',        '#10B981', TRUE, 2),
  ('HAZARDOUS',   'Hazardous Materials',  'مواد خطرة',           'DG/IMDG classified cargo',                'بضائع مصنفة كمواد خطرة',      '#EF4444', TRUE, 3),
  ('OVERSIZED',   'Oversized/Heavy Lift', 'بضائع كبيرة الحجم',   'Out-of-gauge or heavy lift cargo',       'بضائع خارج الأبعاد أو ثقيلة', '#F59E0B', TRUE, 4),
  ('VALUABLE',    'Valuable Cargo',       'بضائع ثمينة',         'High-value goods requiring extra security','بضائع عالية القيمة تحتاج أماناً','#8B5CF6', TRUE, 5),
  ('LIVESTOCK',   'Live Animals',         'حيوانات حية',         'Living creatures requiring special care',  'كائنات حية تحتاج رعاية خاصة','#14B8A6', TRUE, 6),
  ('BULK',        'Bulk Cargo',           'بضائع سائبة',         'Unpacked dry or liquid bulk commodities', 'سلع سائبة جافة أو سائلة',     '#6366F1', TRUE, 7),
  ('PROJECT',     'Project Cargo',        'بضائع مشاريع',        'Industrial equipment and machinery',      'معدات صناعية وآلات',          '#EC4899', TRUE, 8),
  ('EXPRESS',     'Express/Courier',      'شحن سريع',            'Time-sensitive express delivery',          'توصيل سريع حساس للوقت',      '#F97316', TRUE, 9),
  ('PERSONAL',    'Personal Effects',     'أمتعة شخصية',         'Household goods and personal belongings', 'أثاث منزلي ومتعلقات شخصية',   '#78716C', TRUE, 10)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: Update record_count_global in catalog
-- ═══════════════════════════════════════════════════════════════════════════

-- After all seeds, update the counts
UPDATE master_data_catalog
SET record_count_global = safe_row_count(table_name),
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: Seed permissions for master data management
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  ('master_data:catalog:view',   'master_data_catalog', 'view',   'View master data catalog',           'master_data', 'shared'),
  ('master_data:catalog:edit',   'master_data_catalog', 'edit',   'Edit master data catalog entries',   'master_data', 'platform'),
  ('master_data:provision',      'master_data',         'provision','Provision master data to tenant',  'master_data', 'platform'),
  ('master_data:seed',           'master_data',         'seed',   'Seed reference data to tenants',     'master_data', 'platform'),
  ('master_data:health',         'master_data',         'health', 'View master data health dashboard',  'master_data', 'platform'),
  ('master_data:lineage',        'master_data',         'lineage','View data lineage and distribution', 'master_data', 'platform')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant catalog view to all tenant admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.hierarchy_level <= 3 AND r.deleted_at IS NULL
  AND p.permission_code = 'master_data:catalog:view'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 8: seed_tenant_reference_data() — Enhanced seeding function
-- ═══════════════════════════════════════════════════════════════════════════
-- Copies SEEDED-layer tables from public to a tenant schema.
-- Called during tenant provisioning to give each tenant an independent copy.

CREATE OR REPLACE FUNCTION seed_tenant_reference_data(
  p_tenant_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_schema TEXT;
  v_result JSONB := '{}';
  v_count  INTEGER;
  v_table  TEXT;
  -- All SEEDED-layer tables from §7.2
  v_seeded_tables TEXT[] := ARRAY[
    'contact_methods', 'record_statuses', 'request_statuses',
    'supplier_types', 'address_types', 'contact_types',
    'customer_types', 'supply_terms', 'delivery_terms',
    'contract_types', 'unit_types', 'warehouse_types',
    'tracking_policies', 'shipment_types', 'shipment_categories'
  ];
BEGIN
  v_schema := 'tenant_' || lower(p_tenant_code);

  -- Verify schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema
  ) THEN
    RETURN jsonb_build_object('error', format('Schema %s does not exist', v_schema));
  END IF;

  FOREACH v_table IN ARRAY v_seeded_tables
  LOOP
    BEGIN
      -- Check if table exists in tenant schema
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = v_schema AND table_name = v_table
      ) THEN
        -- Only seed if empty
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', v_schema, v_table) INTO v_count;
        IF v_count = 0 THEN
          EXECUTE format(
            'INSERT INTO %I.%I SELECT * FROM public.%I WHERE deleted_at IS NULL',
            v_schema, v_table, v_table
          );
          GET DIAGNOSTICS v_count = ROW_COUNT;
          v_result := v_result || jsonb_build_object(v_table, v_count);
        ELSE
          v_result := v_result || jsonb_build_object(v_table, format('skipped (%s rows exist)', v_count));
        END IF;
      ELSE
        v_result := v_result || jsonb_build_object(v_table, 'table not in schema');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || jsonb_build_object(v_table, format('ERROR: %s', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'schema', v_schema,
    'seeded_tables', v_result,
    'seeded_at', CURRENT_TIMESTAMP
  );
END;
$$;


-- ============================================================================
-- End of Migration 408
-- ============================================================================
