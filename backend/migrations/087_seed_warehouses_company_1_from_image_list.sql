-- 087_seed_warehouses_company_1_from_image_list.sql
-- Seeds a provided list of warehouses for company_id = 1.
-- Source: user-provided image of (warehouse number, warehouse name) list.
-- Idempotent: uses ON CONFLICT (company_id, code) DO UPDATE.

BEGIN;

-- Ensure company_id = 1 exists (fresh DB bootstrap safety)
INSERT INTO companies (id, code, name, name_ar, is_active, is_default, created_at, updated_at)
VALUES (1, 'COMP-001', 'Default Company', 'الشركة الافتراضية', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Resolve common types for company 1
WITH types AS (
  SELECT
    MAX(CASE WHEN code = 'WT-MAIN-LOCAL' THEN id END) AS main_local_id,
    MAX(CASE WHEN code = 'WT-BRANCH' THEN id END) AS branch_id
  FROM warehouse_types
  WHERE company_id = 1 AND deleted_at IS NULL
)
INSERT INTO warehouses (
  company_id,
  code,
  name,
  name_ar,
  warehouse_type,
  warehouse_type_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  1 AS company_id,
  src.code,
  src.name,
  src.name AS name_ar,
  src.legacy_type,
  src.type_id,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    v.code,
    v.name,
    CASE
      WHEN v.name ILIKE '%فرع%' OR v.name ILIKE '%محل%' THEN 'sub'
      ELSE 'main'
    END AS legacy_type,
    CASE
      WHEN v.name ILIKE '%فرع%' OR v.name ILIKE '%محل%' THEN (SELECT branch_id FROM types)
      ELSE (SELECT main_local_id FROM types)
    END AS type_id
  FROM (
    VALUES
      ('1',  'مخزن تام'),
      ('2',  'مخزن فرع الديرة الرئيسي'),
      ('3',  'المستودع الرئيسي'),
      ('4',  'مخزن التعمير 1'),
      ('7',  'مخزن تام المدينة'),
      ('8',  'مخزن فرع الروضة'),
      ('9',  'مخزن فرع الحمام'),
      ('10', 'مخزن فرع العوام'),
      ('11', 'مخزن فرع الروضة-شارع الدارس'),
      ('12', 'مخزن محل سحل الحمام - شارع الأربعين'),
      ('13', 'مخزن محل التعمير الجديد'),
      ('14', 'مخزن محل التعمير الجديد'),
      ('17', 'مخزن الأغراض الرئيسية'),
      ('18', 'مخزن التعمير 3'),
      ('19', 'مخزن زريبة اليرموك'),
      ('20', 'مخزن حمدي'),
      ('21', 'مخزن فرع السلم'),
      ('22', 'مخزن رقم 22'),
      ('23', 'مخزن فرع اسواق حجاب')
  ) AS v(code, name)
) AS src
ON CONFLICT (company_id, code)
DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  warehouse_type = EXCLUDED.warehouse_type,
  warehouse_type_id = EXCLUDED.warehouse_type_id,
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP,
  deleted_at = NULL;

COMMIT;
