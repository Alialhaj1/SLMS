-- 061_seed_sa_master_data.sql
-- Seed baseline Saudi Arabia master data (KSA) for Phase 1 reference lists

BEGIN;

-- =====================================================
-- 1) Country: Saudi Arabia (Global)
-- =====================================================
INSERT INTO countries (
  code,
  name,
  name_ar,
  phone_code,
  currency_code,
  region,
  is_active
)
VALUES (
  'SAU',
  'Saudi Arabia',
  'المملكة العربية السعودية',
  '+966',
  'SAR',
  'Middle East',
  TRUE
)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = COALESCE(EXCLUDED.name_ar, countries.name_ar),
  phone_code = COALESCE(EXCLUDED.phone_code, countries.phone_code),
  currency_code = COALESCE(EXCLUDED.currency_code, countries.currency_code),
  region = COALESCE(EXCLUDED.region, countries.region),
  is_active = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='name_en') THEN
    EXECUTE $sql$UPDATE countries SET name_en = name WHERE code = 'SAU' AND (name_en IS NULL OR name_en = '')$sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='alpha_2') THEN
    EXECUTE $sql$UPDATE countries SET alpha_2 = 'SA' WHERE code = 'SAU' AND (alpha_2 IS NULL OR alpha_2 = '')$sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='code_2') THEN
    EXECUTE $sql$UPDATE countries SET code_2 = 'SA' WHERE code = 'SAU' AND (code_2 IS NULL OR code_2 = '')$sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='continent') THEN
    EXECUTE $sql$UPDATE countries SET continent = COALESCE(continent, 'Asia') WHERE code = 'SAU'$sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='capital_en') THEN
    EXECUTE $sql$UPDATE countries SET capital_en = COALESCE(capital_en, 'Riyadh') WHERE code = 'SAU'$sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='capital_ar') THEN
    EXECUTE $sql$UPDATE countries SET capital_ar = COALESCE(capital_ar, 'الرياض') WHERE code = 'SAU'$sql$;
  END IF;
END $$;

-- =====================================================
-- 2) Cities (Global) - key Saudi cities
-- =====================================================
DO $$
DECLARE
  sa_country_id INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code = 'SAU';

  -- Using codes that are stable internal identifiers (not claiming ISO/UNLOCODE).
  -- Insert only if not already present (global row: company_id IS NULL).

  -- Riyadh (capital)
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-RUH', 'Riyadh', 'الرياض', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-RUH'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='name_en') THEN
    EXECUTE $sql$UPDATE cities SET name_en = name WHERE code IN ('KSA-RUH') AND (name_en IS NULL OR name_en = '')$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='is_capital') THEN
    EXECUTE $sql$UPDATE cities SET is_capital = TRUE WHERE code = 'KSA-RUH'$sql$;
  END IF;

  -- Jeddah
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-JED', 'Jeddah', 'جدة', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-JED'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Dammam
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-DMM', 'Dammam', 'الدمام', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-DMM'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Makkah
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-MKK', 'Makkah', 'مكة المكرمة', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-MKK'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Madinah
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-MED', 'Madinah', 'المدينة المنورة', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-MED'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Taif
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-TIF', 'Taif', 'الطائف', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-TIF'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Al Khobar
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-KHB', 'Al Khobar', 'الخبر', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-KHB'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Jubail
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-JUB', 'Jubail', 'الجبيل', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-JUB'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Yanbu
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-YNB', 'Yanbu', 'ينبع', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-YNB'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Tabuk
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-TUU', 'Tabuk', 'تبوك', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-TUU'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Abha
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-AHB', 'Abha', 'أبها', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-AHB'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Jazan
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-GIZ', 'Jazan', 'جازان', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-GIZ'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Najran
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-EAM', 'Najran', 'نجران', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-EAM'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Al Ahsa (Hofuf)
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-HOF', 'Al Ahsa (Hofuf)', 'الأحساء (الهفوف)', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities
    WHERE country_id = sa_country_id
      AND code = 'KSA-HOF'
      AND deleted_at IS NULL
      AND company_id IS NULL
  );

  -- Ensure name_en mirrors name where applicable
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='name_en') THEN
    EXECUTE $sql$UPDATE cities SET name_en = name WHERE country_id = (SELECT id FROM countries WHERE code='SAU') AND company_id IS NULL AND deleted_at IS NULL AND (name_en IS NULL OR name_en = '')$sql$;
  END IF;
END $$;

-- =====================================================
-- 3) Ports & Airports (Global)
-- =====================================================
DO $$
DECLARE
  sa_country_id INTEGER;
  riyadh_city_id INTEGER;
  jeddah_city_id INTEGER;
  dammam_city_id INTEGER;
  medina_city_id INTEGER;
  yanbu_city_id INTEGER;
  jazan_city_id INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code = 'SAU';
  SELECT id INTO riyadh_city_id FROM cities WHERE code = 'KSA-RUH' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO jeddah_city_id FROM cities WHERE code = 'KSA-JED' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO dammam_city_id FROM cities WHERE code = 'KSA-DMM' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO medina_city_id FROM cities WHERE code = 'KSA-MED' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO yanbu_city_id FROM cities WHERE code = 'KSA-YNB' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO jazan_city_id FROM cities WHERE code = 'KSA-GIZ' AND company_id IS NULL AND deleted_at IS NULL;

  -- We support both schema variants:
  -- - Newer API expects ports.port_code + name_en/name_ar + description_en/ar + customs_office_code
  -- - Earlier table used ports.code + name + name_ar and different fields

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ports' AND column_name='port_code') THEN
    -- Sea ports
    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-JED-SEA', 'Jeddah Islamic Port', 'ميناء جدة الإسلامي', 'Major seaport in Jeddah', 'ميناء بحري رئيسي في جدة', 'sea', sa_country_id, jeddah_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-JED-SEA' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-DMM-SEA', 'King Abdulaziz Port (Dammam)', 'ميناء الملك عبدالعزيز (الدمام)', 'Major seaport in Dammam', 'ميناء بحري رئيسي في الدمام', 'sea', sa_country_id, dammam_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-DMM-SEA' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-YNB-SEA', 'Yanbu Commercial Port', 'ميناء ينبع التجاري', 'Seaport in Yanbu', 'ميناء بحري في ينبع', 'sea', sa_country_id, yanbu_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-YNB-SEA' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-GIZ-SEA', 'Jazan Port', 'ميناء جازان', 'Seaport in Jazan', 'ميناء بحري في جازان', 'sea', sa_country_id, jazan_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-GIZ-SEA' AND company_id IS NULL AND deleted_at IS NULL);

    -- Airports
    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-RUH-AIR', 'King Khalid International Airport', 'مطار الملك خالد الدولي', 'International airport in Riyadh', 'مطار دولي في الرياض', 'air', sa_country_id, riyadh_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-RUH-AIR' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-JED-AIR', 'King Abdulaziz International Airport', 'مطار الملك عبدالعزيز الدولي', 'International airport in Jeddah', 'مطار دولي في جدة', 'air', sa_country_id, jeddah_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-JED-AIR' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-DMM-AIR', 'King Fahd International Airport', 'مطار الملك فهد الدولي', 'International airport in Dammam', 'مطار دولي في الدمام', 'air', sa_country_id, dammam_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-DMM-AIR' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO ports (port_code, name_en, name_ar, description_en, description_ar, port_type, country_id, city_id, is_active, company_id)
    SELECT 'KSA-MED-AIR', 'Prince Mohammad bin Abdulaziz International Airport', 'مطار الأمير محمد بن عبدالعزيز الدولي', 'International airport in Madinah', 'مطار دولي في المدينة المنورة', 'air', sa_country_id, medina_city_id, TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE port_code='KSA-MED-AIR' AND company_id IS NULL AND deleted_at IS NULL);

  ELSE
    -- Fallback legacy schema
    INSERT INTO ports (code, name, name_ar, port_type, country_id, city_id, is_active)
    SELECT 'KSA-JED-SEA', 'Jeddah Islamic Port', 'ميناء جدة الإسلامي', 'sea', sa_country_id, jeddah_city_id, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE code='KSA-JED-SEA');

    INSERT INTO ports (code, name, name_ar, port_type, country_id, city_id, is_active)
    SELECT 'KSA-RUH-AIR', 'King Khalid International Airport', 'مطار الملك خالد الدولي', 'air', sa_country_id, riyadh_city_id, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM ports WHERE code='KSA-RUH-AIR');
  END IF;
END $$;

-- =====================================================
-- 4) Customs Offices (Global)
-- =====================================================
DO $$
DECLARE
  sa_country_id INTEGER;
  riyadh_city_id INTEGER;
  jeddah_city_id INTEGER;
  dammam_city_id INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code = 'SAU';
  SELECT id INTO riyadh_city_id FROM cities WHERE code = 'KSA-RUH' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO jeddah_city_id FROM cities WHERE code = 'KSA-JED' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO dammam_city_id FROM cities WHERE code = 'KSA-DMM' AND company_id IS NULL AND deleted_at IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customs_offices' AND column_name='office_code') THEN
    INSERT INTO customs_offices (
      office_code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, office_type, is_active, company_id
    )
    SELECT
      'KSA-JED-CUS', 'ZATCA - Jeddah Port Customs', 'هيئة الزكاة والضريبة والجمارك - جمرك ميناء جدة',
      'Customs office serving Jeddah seaport/airport area', 'مكتب تخليص يخدم منطقة جدة (ميناء/مطار)',
      sa_country_id, jeddah_city_id, 'port', TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM customs_offices WHERE office_code='KSA-JED-CUS' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO customs_offices (
      office_code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, office_type, is_active, company_id
    )
    SELECT
      'KSA-RUH-CUS', 'ZATCA - Riyadh Customs', 'هيئة الزكاة والضريبة والجمارك - جمرك الرياض',
      'Customs office serving Riyadh region', 'مكتب تخليص يخدم منطقة الرياض',
      sa_country_id, riyadh_city_id, 'inland', TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM customs_offices WHERE office_code='KSA-RUH-CUS' AND company_id IS NULL AND deleted_at IS NULL);

    INSERT INTO customs_offices (
      office_code, name_en, name_ar, description_en, description_ar,
      country_id, city_id, office_type, is_active, company_id
    )
    SELECT
      'KSA-DMM-CUS', 'ZATCA - Dammam Port Customs', 'هيئة الزكاة والضريبة والجمارك - جمرك ميناء الدمام',
      'Customs office serving Dammam seaport/industrial area', 'مكتب تخليص يخدم منطقة الدمام',
      sa_country_id, dammam_city_id, 'port', TRUE, NULL
    WHERE NOT EXISTS (SELECT 1 FROM customs_offices WHERE office_code='KSA-DMM-CUS' AND company_id IS NULL AND deleted_at IS NULL);

  ELSE
    -- Fallback legacy schema
    INSERT INTO customs_offices (code, name, name_ar, country_id, is_active)
    SELECT 'KSA-JED-CUS', 'Jeddah Customs', 'جمارك جدة', sa_country_id, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM customs_offices WHERE code='KSA-JED-CUS');
  END IF;
END $$;

-- =====================================================
-- 5) Generic Reference Data lists (Global)
-- =====================================================
-- Tax Zones (KSA)
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'tax_zones', 'KSA_STD', 'Saudi Arabia (Standard VAT)', 'السعودية (ضريبة القيمة المضافة - قياسي)', 'Default tax zone for KSA', 'المنطقة الضريبية الافتراضية داخل السعودية', TRUE),
  (NULL, 'tax_zones', 'KSA_ZERO', 'Saudi Arabia (Zero-rated)', 'السعودية (خاضع لنسبة صفرية)', 'Zero-rated supplies within KSA when applicable', 'توريدات خاضعة لنسبة صفرية عند انطباق الشروط', TRUE),
  (NULL, 'tax_zones', 'KSA_EXEMPT', 'Saudi Arabia (Exempt)', 'السعودية (معفى)', 'Exempt supplies when applicable', 'توريدات معفاة عند انطباق الشروط', TRUE)
ON CONFLICT DO NOTHING;

-- Record Status
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'record_status', 'ACTIVE', 'Active', 'نشط', 'Record is active', 'السجل نشط', TRUE),
  (NULL, 'record_status', 'INACTIVE', 'Inactive', 'غير نشط', 'Record is inactive', 'السجل غير نشط', TRUE),
  (NULL, 'record_status', 'DRAFT', 'Draft', 'مسودة', 'Draft record', 'سجل مسودة', TRUE),
  (NULL, 'record_status', 'ARCHIVED', 'Archived', 'مؤرشف', 'Archived record', 'سجل مؤرشف', TRUE)
ON CONFLICT DO NOTHING;

-- Order Status
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'order_status', 'NEW', 'New', 'جديد', 'New order', 'طلب جديد', TRUE),
  (NULL, 'order_status', 'CONFIRMED', 'Confirmed', 'مؤكد', 'Order confirmed', 'تم تأكيد الطلب', TRUE),
  (NULL, 'order_status', 'IN_PROGRESS', 'In Progress', 'قيد التنفيذ', 'Order in progress', 'الطلب قيد التنفيذ', TRUE),
  (NULL, 'order_status', 'SHIPPED', 'Shipped', 'تم الشحن', 'Order shipped', 'تم شحن الطلب', TRUE),
  (NULL, 'order_status', 'DELIVERED', 'Delivered', 'تم التسليم', 'Order delivered', 'تم تسليم الطلب', TRUE),
  (NULL, 'order_status', 'CANCELLED', 'Cancelled', 'ملغي', 'Order cancelled', 'تم إلغاء الطلب', TRUE)
ON CONFLICT DO NOTHING;

-- Delivery Locations (common hubs)
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'delivery_locations', 'KSA_RUH', 'Riyadh', 'الرياض', 'Delivery location in Riyadh', 'موقع تسليم في الرياض', TRUE),
  (NULL, 'delivery_locations', 'KSA_JED', 'Jeddah', 'جدة', 'Delivery location in Jeddah', 'موقع تسليم في جدة', TRUE),
  (NULL, 'delivery_locations', 'KSA_DMM', 'Dammam', 'الدمام', 'Delivery location in Dammam', 'موقع تسليم في الدمام', TRUE),
  (NULL, 'delivery_locations', 'KSA_MKK', 'Makkah', 'مكة المكرمة', 'Delivery location in Makkah', 'موقع تسليم في مكة المكرمة', TRUE),
  (NULL, 'delivery_locations', 'KSA_MED', 'Madinah', 'المدينة المنورة', 'Delivery location in Madinah', 'موقع تسليم في المدينة المنورة', TRUE)
ON CONFLICT DO NOTHING;

COMMIT;
