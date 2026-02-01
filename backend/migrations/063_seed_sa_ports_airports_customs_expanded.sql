-- 063_seed_sa_ports_airports_customs_expanded.sql
-- Expand Saudi Arabia master data: additional seaports, airports, and customs offices (Global rows: company_id IS NULL)

BEGIN;

DO $$
DECLARE
  sa_country_id INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code = 'SAU' AND deleted_at IS NULL;
  IF sa_country_id IS NULL THEN
    RAISE EXCEPTION 'Saudi Arabia (SAU) not found in countries';
  END IF;

  -- -----------------------------------------------------
  -- Ensure a few additional cities exist (global)
  -- -----------------------------------------------------

  -- Jubail (already seeded in 061, but guard anyway)
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-JUB', 'Jubail', 'الجبيل', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities WHERE country_id = sa_country_id AND code = 'KSA-JUB' AND company_id IS NULL AND deleted_at IS NULL
  );

  -- Yanbu (already seeded)
  INSERT INTO cities (country_id, code, name, name_ar, timezone, is_active, company_id)
  SELECT sa_country_id, 'KSA-YNB', 'Yanbu', 'ينبع', 'Asia/Riyadh', TRUE, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM cities WHERE country_id = sa_country_id AND code = 'KSA-YNB' AND company_id IS NULL AND deleted_at IS NULL
  );

  -- Keep name_en aligned when present
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE cities SET name_en = name
      WHERE company_id IS NULL AND deleted_at IS NULL AND (name_en IS NULL OR name_en = '')
        AND code LIKE 'KSA-%'
    $sql$;
  END IF;

END $$;

-- -----------------------------------------------------
-- Ports & Airports (Global)
-- Notes:
-- - codes are internal stable identifiers (not claiming official IATA/UNLOCODE)
-- - port_type values: 'sea' | 'air' | 'land'
-- -----------------------------------------------------

DO $$
DECLARE
  sa_country_id INTEGER;
  city_riyadh INTEGER;
  city_jeddah INTEGER;
  city_dammam INTEGER;
  city_medina INTEGER;
  city_yanbu INTEGER;
  city_jazan INTEGER;
  city_tabuk INTEGER;
  city_abha INTEGER;
  city_taif INTEGER;
  city_jubail INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code = 'SAU' AND deleted_at IS NULL;

  SELECT id INTO city_riyadh FROM cities WHERE code='KSA-RUH' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_jeddah FROM cities WHERE code='KSA-JED' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_dammam FROM cities WHERE code='KSA-DMM' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_medina FROM cities WHERE code='KSA-MED' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_yanbu  FROM cities WHERE code='KSA-YNB' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_jazan  FROM cities WHERE code='KSA-GIZ' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_tabuk  FROM cities WHERE code='KSA-TUU' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_abha   FROM cities WHERE code='KSA-AHB' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_taif   FROM cities WHERE code='KSA-TIF' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO city_jubail FROM cities WHERE code='KSA-JUB' AND company_id IS NULL AND deleted_at IS NULL;

  -- Sea ports (major)
  INSERT INTO ports (country_id, city_id, code, name, name_ar, port_type, is_active, company_id)
  VALUES
    (sa_country_id, city_jeddah,  'KSA-JED-SEA', 'Jeddah Islamic Port', 'ميناء جدة الإسلامي', 'sea', TRUE, NULL),
    (sa_country_id, city_dammam,  'KSA-DMM-SEA', 'King Abdulaziz Port (Dammam)', 'ميناء الملك عبدالعزيز (الدمام)', 'sea', TRUE, NULL),
    (sa_country_id, city_jubail,  'KSA-JUB-SEA', 'Jubail Commercial Port', 'ميناء الجبيل التجاري', 'sea', TRUE, NULL),
    (sa_country_id, city_yanbu,   'KSA-YNB-SEA', 'Yanbu Commercial Port', 'ميناء ينبع التجاري', 'sea', TRUE, NULL),
    (sa_country_id, city_jazan,   'KSA-GIZ-SEA', 'Jazan Port', 'ميناء جازان', 'sea', TRUE, NULL)
  ON CONFLICT (code) DO UPDATE SET
    country_id = EXCLUDED.country_id,
    city_id = COALESCE(EXCLUDED.city_id, ports.city_id),
    name = EXCLUDED.name,
    name_ar = COALESCE(EXCLUDED.name_ar, ports.name_ar),
    port_type = EXCLUDED.port_type,
    is_active = TRUE,
    company_id = NULL,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL,
    is_deleted = FALSE;

  -- Airports (major)
  INSERT INTO ports (country_id, city_id, code, name, name_ar, port_type, is_active, company_id)
  VALUES
    (sa_country_id, city_riyadh, 'KSA-RUH-AIR', 'King Khalid International Airport', 'مطار الملك خالد الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_jeddah, 'KSA-JED-AIR', 'King Abdulaziz International Airport', 'مطار الملك عبدالعزيز الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_dammam, 'KSA-DMM-AIR', 'King Fahd International Airport', 'مطار الملك فهد الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_medina, 'KSA-MED-AIR', 'Prince Mohammad bin Abdulaziz International Airport', 'مطار الأمير محمد بن عبدالعزيز الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_abha,   'KSA-AHB-AIR', 'Abha International Airport', 'مطار أبها الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_tabuk,  'KSA-TUU-AIR', 'Tabuk Regional Airport', 'مطار تبوك الإقليمي', 'air', TRUE, NULL),
    (sa_country_id, city_taif,   'KSA-TIF-AIR', 'Taif International Airport', 'مطار الطائف الدولي', 'air', TRUE, NULL),
    (sa_country_id, city_yanbu,  'KSA-YNB-AIR', 'Yanbu Airport', 'مطار ينبع', 'air', TRUE, NULL),
    (sa_country_id, city_jazan,  'KSA-GIZ-AIR', 'Jazan Regional Airport', 'مطار جازان الإقليمي', 'air', TRUE, NULL)
  ON CONFLICT (code) DO UPDATE SET
    country_id = EXCLUDED.country_id,
    city_id = COALESCE(EXCLUDED.city_id, ports.city_id),
    name = EXCLUDED.name,
    name_ar = COALESCE(EXCLUDED.name_ar, ports.name_ar),
    port_type = EXCLUDED.port_type,
    is_active = TRUE,
    company_id = NULL,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL,
    is_deleted = FALSE;

  -- Keep name_en aligned when present
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ports' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE ports SET name_en = name
      WHERE company_id IS NULL AND deleted_at IS NULL AND (name_en IS NULL OR name_en = '')
        AND code LIKE 'KSA-%'
    $sql$;
  END IF;

END $$;

-- -----------------------------------------------------
-- Customs offices (Global)
-- -----------------------------------------------------

DO $$
DECLARE
  sa_country_id INTEGER;
  port_jed_sea INTEGER;
  port_dmm_sea INTEGER;
  port_jub_sea INTEGER;
  port_ynb_sea INTEGER;
  port_giz_sea INTEGER;
  port_ruh_air INTEGER;
  port_jed_air INTEGER;
  port_dmm_air INTEGER;
  port_med_air INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code='SAU' AND deleted_at IS NULL;

  SELECT id INTO port_jed_sea FROM ports WHERE code='KSA-JED-SEA' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_dmm_sea FROM ports WHERE code='KSA-DMM-SEA' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_jub_sea FROM ports WHERE code='KSA-JUB-SEA' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_ynb_sea FROM ports WHERE code='KSA-YNB-SEA' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_giz_sea FROM ports WHERE code='KSA-GIZ-SEA' AND company_id IS NULL AND deleted_at IS NULL;

  SELECT id INTO port_ruh_air FROM ports WHERE code='KSA-RUH-AIR' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_jed_air FROM ports WHERE code='KSA-JED-AIR' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_dmm_air FROM ports WHERE code='KSA-DMM-AIR' AND company_id IS NULL AND deleted_at IS NULL;
  SELECT id INTO port_med_air FROM ports WHERE code='KSA-MED-AIR' AND company_id IS NULL AND deleted_at IS NULL;

  -- Create customs offices. Codes are internal.
  INSERT INTO customs_offices (country_id, port_id, code, name, name_ar, office_type, is_active, company_id)
  VALUES
    (sa_country_id, port_jed_sea, 'KSA-JED-CUS', 'Jeddah Customs', 'جمارك جدة', 'port', TRUE, NULL),
    (sa_country_id, port_dmm_sea, 'KSA-DMM-CUS', 'Dammam Port Customs', 'جمارك ميناء الدمام', 'port', TRUE, NULL),
    (sa_country_id, port_jub_sea, 'KSA-JUB-CUS', 'Jubail Port Customs', 'جمارك ميناء الجبيل', 'port', TRUE, NULL),
    (sa_country_id, port_ynb_sea, 'KSA-YNB-CUS', 'Yanbu Port Customs', 'جمارك ميناء ينبع', 'port', TRUE, NULL),
    (sa_country_id, port_giz_sea, 'KSA-GIZ-CUS', 'Jazan Port Customs', 'جمارك ميناء جازان', 'port', TRUE, NULL),
    (sa_country_id, port_ruh_air, 'KSA-RUH-AIR-CUS', 'Riyadh Airport Customs', 'جمارك مطار الرياض', 'airport', TRUE, NULL),
    (sa_country_id, port_jed_air, 'KSA-JED-AIR-CUS', 'Jeddah Airport Customs', 'جمارك مطار جدة', 'airport', TRUE, NULL),
    (sa_country_id, port_dmm_air, 'KSA-DMM-AIR-CUS', 'Dammam Airport Customs', 'جمارك مطار الدمام', 'airport', TRUE, NULL),
    (sa_country_id, port_med_air, 'KSA-MED-AIR-CUS', 'Madinah Airport Customs', 'جمارك مطار المدينة', 'airport', TRUE, NULL)
  ON CONFLICT (code) DO UPDATE SET
    country_id = EXCLUDED.country_id,
    port_id = COALESCE(EXCLUDED.port_id, customs_offices.port_id),
    name = EXCLUDED.name,
    name_ar = COALESCE(EXCLUDED.name_ar, customs_offices.name_ar),
    office_type = COALESCE(EXCLUDED.office_type, customs_offices.office_type),
    is_active = TRUE,
    company_id = NULL,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL,
    is_deleted = FALSE;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customs_offices' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE customs_offices SET name_en = name
      WHERE company_id IS NULL AND deleted_at IS NULL AND (name_en IS NULL OR name_en = '')
        AND code LIKE 'KSA-%'
    $sql$;
  END IF;

END $$;

COMMIT;
