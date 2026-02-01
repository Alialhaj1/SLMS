-- Migration 031: Group 2 New Tables - Add Missing Reference Tables
-- Date: 2025-12-25
-- Description: Create new reference tables (regions, border_points, time_zones, address_types, contact_methods) and update currencies/countries with seed data

-- =====================================================
-- 1. Regions / Zones
-- =====================================================
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  region_type VARCHAR(50), -- 'province', 'state', 'emirate', 'district', 'county'
  parent_region_id INTEGER REFERENCES regions(id),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_regions_country_id ON regions(country_id);
CREATE INDEX idx_regions_parent_id ON regions(parent_region_id);
CREATE INDEX idx_regions_active ON regions(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE regions IS 'Administrative regions (provinces, states, emirates)';

-- =====================================================
-- 2. Border Points
-- =====================================================
CREATE TABLE IF NOT EXISTS border_points (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  border_type VARCHAR(20) CHECK (border_type IN ('land', 'sea', 'air', 'mixed')),
  connecting_country_id INTEGER REFERENCES countries(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  operating_hours VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_border_points_country_id ON border_points(country_id);
CREATE INDEX idx_border_points_connecting_country ON border_points(connecting_country_id);
CREATE INDEX idx_border_points_active ON border_points(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE border_points IS 'Land, sea, and air border crossing points';

-- =====================================================
-- 3. Time Zones
-- =====================================================
CREATE TABLE IF NOT EXISTS time_zones (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE, -- 'Asia/Riyadh', 'America/New_York'
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  utc_offset VARCHAR(10), -- '+03:00', '-05:00'
  dst_observed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_time_zones_code ON time_zones(code);
CREATE INDEX idx_time_zones_active ON time_zones(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE time_zones IS 'IANA time zone database';

-- Seed common time zones
INSERT INTO time_zones (code, name_en, name_ar, utc_offset, dst_observed, sort_order) 
SELECT * FROM (VALUES
  ('Asia/Riyadh', 'Saudi Arabia Time', 'توقيت السعودية', '+03:00', FALSE, 1),
  ('Asia/Dubai', 'Gulf Standard Time', 'التوقيت الخليجي', '+04:00', FALSE, 2),
  ('Europe/London', 'Greenwich Mean Time', 'توقيت جرينتش', '+00:00', TRUE, 3),
  ('America/New_York', 'Eastern Time', 'التوقيت الشرقي', '-05:00', TRUE, 4),
  ('Asia/Shanghai', 'China Standard Time', 'التوقيت الصيني', '+08:00', FALSE, 5),
  ('Asia/Tokyo', 'Japan Standard Time', 'التوقيت الياباني', '+09:00', FALSE, 6)
) AS v(code, name_en, name_ar, utc_offset, dst_observed, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM time_zones WHERE time_zones.code = v.code);

-- =====================================================
-- 4. Address Types
-- =====================================================
CREATE TABLE IF NOT EXISTS address_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_address_types_code ON address_types(code);
CREATE INDEX idx_address_types_active ON address_types(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE address_types IS 'Address types (billing, shipping, warehouse, etc.)';

-- Seed address types
INSERT INTO address_types (code, name_en, name_ar, description_en, description_ar, sort_order) 
SELECT * FROM (VALUES
  ('billing', 'Billing Address', 'عنوان الفواتير', 'Address for invoicing', 'العنوان المستخدم للفوترة', 1),
  ('shipping', 'Shipping Address', 'عنوان الشحن', 'Address for delivery', 'العنوان المستخدم للتسليم', 2),
  ('warehouse', 'Warehouse Address', 'عنوان المستودع', 'Warehouse location', 'موقع المستودع', 3),
  ('headquarters', 'Headquarters', 'المقر الرئيسي', 'Main office location', 'موقع المكتب الرئيسي', 4),
  ('branch', 'Branch Address', 'عنوان الفرع', 'Branch office location', 'موقع المكتب الفرعي', 5),
  ('factory', 'Factory Address', 'عنوان المصنع', 'Manufacturing facility', 'موقع المنشأة الصناعية', 6)
) AS v(code, name_en, name_ar, description_en, description_ar, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM address_types WHERE address_types.code = v.code);

-- =====================================================
-- 5. Contact Methods
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_methods (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon VARCHAR(50),
  validation_regex TEXT,
  placeholder_en VARCHAR(255),
  placeholder_ar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_contact_methods_code ON contact_methods(code);
CREATE INDEX idx_contact_methods_active ON contact_methods(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE contact_methods IS 'Contact methods (email, phone, website, etc.)';

-- Seed contact methods
INSERT INTO contact_methods (code, name_en, name_ar, validation_regex, placeholder_en, placeholder_ar, sort_order) 
SELECT * FROM (VALUES
  ('email', 'Email', 'البريد الإلكتروني', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', 'example@company.com', 'example@company.com', 1),
  ('phone', 'Phone', 'هاتف', '^\+?[0-9]{7,15}$', '+966 12 345 6789', '+٩٦٦ ١٢ ٣٤٥ ٦٧٨٩', 2),
  ('mobile', 'Mobile', 'جوال', '^\+?[0-9]{10,15}$', '+966 50 123 4567', '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧', 3),
  ('fax', 'Fax', 'فاكس', '^\+?[0-9]{7,15}$', '+966 12 345 6789', '+٩٦٦ ١٢ ٣٤٥ ٦٧٨٩', 4),
  ('website', 'Website', 'موقع إلكتروني', '^https?://[^\s]+$', 'https://www.example.com', 'https://www.example.com', 5),
  ('whatsapp', 'WhatsApp', 'واتساب', '^\+?[0-9]{10,15}$', '+966 50 123 4567', '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧', 6),
  ('linkedin', 'LinkedIn', 'لينكد إن', '^https?://(www\.)?linkedin\.com/.+$', 'https://linkedin.com/company/example', 'https://linkedin.com/company/example', 7),
  ('twitter', 'Twitter/X', 'تويتر', '^https?://(www\.)?(twitter|x)\.com/.+$', 'https://x.com/example', 'https://x.com/example', 8)
) AS v(code, name_en, name_ar, validation_regex, placeholder_en, placeholder_ar, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM contact_methods WHERE contact_methods.code = v.code);

-- =====================================================
-- 6. Update Currencies with Missing Data
-- =====================================================
-- Update existing currencies with subunits
UPDATE currencies SET subunit_en = 'Halalah', subunit_ar = 'هللة' WHERE code = 'SAR' AND subunit_en IS NULL;
UPDATE currencies SET subunit_en = 'Cent', subunit_ar = 'سنت' WHERE code = 'USD' AND subunit_en IS NULL;
UPDATE currencies SET subunit_en = 'Cent', subunit_ar = 'سنت' WHERE code = 'EUR' AND subunit_en IS NULL;
UPDATE currencies SET subunit_en = 'Penny', subunit_ar = 'بنس' WHERE code = 'GBP' AND subunit_en IS NULL;
UPDATE currencies SET subunit_en = 'Fils', subunit_ar = 'فلس' WHERE code = 'AED' AND subunit_en IS NULL;
UPDATE currencies SET subunit_en = 'Fils', subunit_ar = 'فلس' WHERE code = 'KWD' AND subunit_en IS NULL;

-- Insert missing currencies
INSERT INTO currencies (code, name, name_en, name_ar, symbol, decimal_places, subunit_en, subunit_ar, is_active, sort_order) 
SELECT * FROM (VALUES
  ('QAR', 'Qatari Riyal', 'Qatari Riyal', 'ريال قطري', 'ر.ق', 2, 'Dirham', 'درهم', TRUE, 7),
  ('BHD', 'Bahraini Dinar', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 3, 'Fils', 'فلس', TRUE, 8),
  ('OMR', 'Omani Rial', 'Omani Rial', 'ريال عماني', 'ر.ع', 3, 'Baisa', 'بيسة', TRUE, 9),
  ('JOD', 'Jordanian Dinar', 'Jordanian Dinar', 'دينار أردني', 'د.أ', 3, 'Fils', 'فلس', TRUE, 10),
  ('EGP', 'Egyptian Pound', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 2, 'Piastre', 'قرش', TRUE, 11),
  ('CNY', 'Chinese Yuan', 'Chinese Yuan', 'يوان صيني', '¥', 2, 'Fen', 'فين', TRUE, 12),
  ('INR', 'Indian Rupee', 'Indian Rupee', 'روبية هندية', '₹', 2, 'Paisa', 'بيسة', TRUE, 13),
  ('JPY', 'Japanese Yen', 'Japanese Yen', 'ين ياباني', '¥', 0, 'Sen', 'سن', TRUE, 14),
  ('TRY', 'Turkish Lira', 'Turkish Lira', 'ليرة تركية', '₺', 2, 'Kuruş', 'قرش', TRUE, 15)
) AS v(code, name, name_en, name_ar, symbol, decimal_places, subunit_en, subunit_ar, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE currencies.code = v.code);

-- =====================================================
-- 7. Update Countries with Missing Data
-- =====================================================
-- Update existing countries with continent and capital
UPDATE countries SET continent = 'Asia', capital_en = 'Riyadh', capital_ar = 'الرياض' WHERE code = 'SAU' AND continent IS NULL;
UPDATE countries SET continent = 'Asia', capital_en = 'Abu Dhabi', capital_ar = 'أبو ظبي' WHERE code = 'ARE' AND continent IS NULL;
UPDATE countries SET continent = 'North America', capital_en = 'Washington, D.C.', capital_ar = 'واشنطن' WHERE code = 'USA' AND continent IS NULL;
UPDATE countries SET continent = 'Asia', capital_en = 'Beijing', capital_ar = 'بكين' WHERE code = 'CHN' AND continent IS NULL;
UPDATE countries SET continent = 'Europe', capital_en = 'Berlin', capital_ar = 'برلين' WHERE code = 'DEU' AND continent IS NULL;

-- Insert missing GCC and major countries
INSERT INTO countries (code, name, name_en, name_ar, alpha_2, phone_code, currency_code, continent, capital_en, capital_ar, nationality, nationality_ar, sort_order) 
SELECT * FROM (VALUES
  ('KWT', 'Kuwait', 'Kuwait', 'الكويت', 'KW', '+965', 'KWD', 'Asia', 'Kuwait City', 'مدينة الكويت', 'Kuwaiti', 'كويتي', 3),
  ('QAT', 'Qatar', 'Qatar', 'قطر', 'QA', '+974', 'QAR', 'Asia', 'Doha', 'الدوحة', 'Qatari', 'قطري', 4),
  ('BHR', 'Bahrain', 'Bahrain', 'البحرين', 'BH', '+973', 'BHD', 'Asia', 'Manama', 'المنامة', 'Bahraini', 'بحريني', 5),
  ('OMN', 'Oman', 'Oman', 'عمان', 'OM', '+968', 'OMR', 'Asia', 'Muscat', 'مسقط', 'Omani', 'عماني', 6),
  ('JOR', 'Jordan', 'Jordan', 'الأردن', 'JO', '+962', 'JOD', 'Asia', 'Amman', 'عمان', 'Jordanian', 'أردني', 7),
  ('EGY', 'Egypt', 'Egypt', 'مصر', 'EG', '+20', 'EGP', 'Africa', 'Cairo', 'القاهرة', 'Egyptian', 'مصري', 8),
  ('IND', 'India', 'India', 'الهند', 'IN', '+91', 'INR', 'Asia', 'New Delhi', 'نيودلهي', 'Indian', 'هندي', 11),
  ('GBR', 'United Kingdom', 'United Kingdom', 'المملكة المتحدة', 'GB', '+44', 'GBP', 'Europe', 'London', 'لندن', 'British', 'بريطاني', 13),
  ('FRA', 'France', 'France', 'فرنسا', 'FR', '+33', 'EUR', 'Europe', 'Paris', 'باريس', 'French', 'فرنسي', 14),
  ('ITA', 'Italy', 'Italy', 'إيطاليا', 'IT', '+39', 'EUR', 'Europe', 'Rome', 'روما', 'Italian', 'إيطالي', 15),
  ('TUR', 'Turkey', 'Turkey', 'تركيا', 'TR', '+90', 'TRY', 'Asia', 'Ankara', 'أنقرة', 'Turkish', 'تركي', 16),
  ('JPN', 'Japan', 'Japan', 'اليابان', 'JP', '+81', 'JPY', 'Asia', 'Tokyo', 'طوكيو', 'Japanese', 'ياباني', 17),
  ('KOR', 'South Korea', 'South Korea', 'كوريا الجنوبية', 'KR', '+82', 'KRW', 'Asia', 'Seoul', 'سيول', 'Korean', 'كوري', 18)
) AS v(code, name, name_en, name_ar, alpha_2, phone_code, currency_code, continent, capital_en, capital_ar, nationality, nationality_ar, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM countries WHERE countries.code = v.code);

-- =====================================================
-- Permissions for Group 2
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) 
SELECT * FROM (VALUES
  ('regions:view', 'regions', 'view', 'View regions'),
  ('regions:create', 'regions', 'create', 'Create new regions'),
  ('regions:edit', 'regions', 'edit', 'Edit regions'),
  ('regions:delete', 'regions', 'delete', 'Delete regions'),
  ('border_points:view', 'border_points', 'view', 'View border points'),
  ('border_points:create', 'border_points', 'create', 'Create new border points'),
  ('border_points:edit', 'border_points', 'edit', 'Edit border points'),
  ('border_points:delete', 'border_points', 'delete', 'Delete border points'),
  ('time_zones:view', 'time_zones', 'view', 'View time zones'),
  ('time_zones:create', 'time_zones', 'create', 'Create new time zones'),
  ('time_zones:edit', 'time_zones', 'edit', 'Edit time zones'),
  ('time_zones:delete', 'time_zones', 'delete', 'Delete time zones'),
  ('address_types:view', 'address_types', 'view', 'View address types'),
  ('address_types:create', 'address_types', 'create', 'Create new address types'),
  ('address_types:edit', 'address_types', 'edit', 'Edit address types'),
  ('address_types:delete', 'address_types', 'delete', 'Delete address types'),
  ('contact_methods:view', 'contact_methods', 'view', 'View contact methods'),
  ('contact_methods:create', 'contact_methods', 'create', 'Create new contact methods'),
  ('contact_methods:edit', 'contact_methods', 'edit', 'Edit contact methods'),
  ('contact_methods:delete', 'contact_methods', 'delete', 'Delete contact methods')
) AS v(permission_code, resource, action, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permissions.permission_code = v.permission_code);

-- Grant permissions to super_admin and admin
DO $$
DECLARE
  super_admin_role_id INTEGER;
  admin_role_id INTEGER;
  perm RECORD;
BEGIN
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

  FOR perm IN 
    SELECT id FROM permissions 
    WHERE permission_code LIKE 'regions:%' 
       OR permission_code LIKE 'border_points:%'
       OR permission_code LIKE 'time_zones:%'
       OR permission_code LIKE 'address_types:%'
       OR permission_code LIKE 'contact_methods:%'
  LOOP
    IF super_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (super_admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 031 completed successfully';
  RAISE NOTICE '📊 Created 5 new tables: regions, border_points, time_zones, address_types, contact_methods';
  RAISE NOTICE '🌍 Seeded 6 time zones, 6 address types, 8 contact methods, 9 currencies, 13 countries';
  RAISE NOTICE '🔐 Added 20 permissions for new entities';
  RAISE NOTICE '👤 Granted permissions to super_admin and admin roles';
END $$;
