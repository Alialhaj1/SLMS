-- 064_seed_sa_land_ports_and_border_customs.sql
-- Seed Saudi Arabia land border ports + related customs offices (Global rows: company_id IS NULL)

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
  -- Land ports (border crossings) - major entries
  -- Notes:
  -- - codes are internal stable identifiers (not claiming official codes)
  -- - city_id left NULL to avoid coupling to a specific city list
  -- -----------------------------------------------------

  INSERT INTO ports (country_id, city_id, code, name, name_ar, port_type, is_active, company_id)
  VALUES
    (sa_country_id, NULL, 'KSA-LND-BATHA',   'Al Batha Border Crossing',           'منفذ البطحاء البري',            'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-SALWA',   'Salwa Border Crossing',              'منفذ سلوى البري',               'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-HADITHA', 'Al Haditha Border Crossing',         'منفذ الحديثة البري',            'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-JADARAR', 'Jadidat Arar Border Crossing',       'منفذ جديدة عرعر البري',         'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-KHAFJI',  'Al Khafji Border Crossing',          'منفذ الخفجي البري',             'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-KINGFAHD','King Fahd Causeway Border Crossing', 'منفذ جسر الملك فهد',             'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-TUWAL',   'Al Tuwal Border Crossing',           'منفذ الطوال البري',             'land', TRUE, NULL),
    (sa_country_id, NULL, 'KSA-LND-WADIAH',  'Al Wadi’ah Border Crossing',         'منفذ الوديعة البري',            'land', TRUE, NULL)
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

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ports' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE ports SET name_en = name
      WHERE company_id IS NULL AND deleted_at IS NULL AND (name_en IS NULL OR name_en = '')
        AND code LIKE 'KSA-LND-%'
    $sql$;
  END IF;

END $$;

DO $$
DECLARE
  sa_country_id INTEGER;
BEGIN
  SELECT id INTO sa_country_id FROM countries WHERE code='SAU' AND deleted_at IS NULL;

  -- Customs offices for land borders
  INSERT INTO customs_offices (country_id, port_id, code, name, name_ar, office_type, is_active, company_id)
  SELECT
    sa_country_id,
    p.id,
    p.code || '-CUS',
    p.name || ' Customs',
    REPLACE(p.name_ar, 'منفذ', 'جمارك') ,
    'border',
    TRUE,
    NULL
  FROM ports p
  WHERE p.country_id = sa_country_id
    AND p.company_id IS NULL
    AND p.deleted_at IS NULL
    AND p.port_type = 'land'
    AND p.code LIKE 'KSA-LND-%'
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
        AND code LIKE 'KSA-LND-%-CUS'
    $sql$;
  END IF;

END $$;

COMMIT;
