-- 078_seed_inventory_master_data.sql
-- Seeds realistic, interrelated inventory master data (company-scoped where appropriate).
-- هدف: تعبئة بيانات حقيقية للقوائم الأساسية بحيث تؤثر فعلياً في CRUD وتدعم تعدد الشركات.

BEGIN;

-- =====================================================
-- 1) Global Units of Measure (units_of_measure)
--    These are shared across companies (company_id NULL) and visible via:
--    GET /api/unit-types (filters (company_id = X OR company_id IS NULL))
-- =====================================================

-- Base units (unit_type = 'basic')
INSERT INTO units_of_measure (
  company_id, code, name, name_en, name_ar, unit_type,
  base_unit_id, conversion_factor, symbol_en, decimal_places, sort_order, is_active
)
SELECT
  NULL, v.code, v.name_en, v.name_en, v.name_ar, 'basic',
  NULL, NULL, v.symbol, v.decimals, v.sort_order, TRUE
FROM (
  VALUES
    ('PCS', 'Piece',        'قطعة',  'pc', 0, 10),
    ('KG',  'Kilogram',     'كيلوجرام', 'kg', 3, 20),
    ('L',   'Liter',        'لتر',   'L',  3, 30),
    ('M',   'Meter',        'متر',   'm',  3, 40)
) AS v(code, name_en, name_ar, symbol, decimals, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u
  WHERE u.code = v.code AND u.deleted_at IS NULL
);

-- Derived units (unit_type = 'derived')
INSERT INTO units_of_measure (
  company_id, code, name, name_en, name_ar, unit_type,
  base_unit_id, conversion_factor, symbol_en, decimal_places, sort_order, is_active
)
SELECT
  NULL, v.code, v.name_en, v.name_en, v.name_ar, 'derived',
  (SELECT id FROM units_of_measure WHERE code = v.base_code AND deleted_at IS NULL),
  v.factor, v.symbol, v.decimals, v.sort_order, TRUE
FROM (
  VALUES
    ('G',   'Gram',        'جرام',      'g',  'KG', 0.001, 3, 21),
    ('TON', 'Metric Ton',  'طن',        't',  'KG', 1000,  3, 22),
    ('ML',  'Milliliter',  'ملليلتر',   'mL', 'L',  0.001, 3, 31),
    ('CM',  'Centimeter',  'سنتيمتر',   'cm', 'M',  0.01,  3, 41),
    ('MM',  'Millimeter',  'مليمتر',    'mm', 'M',  0.001, 3, 42)
) AS v(code, name_en, name_ar, symbol, base_code, factor, decimals, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u
  WHERE u.code = v.code AND u.deleted_at IS NULL
);

-- Packaging units (unit_type = 'packaging')
INSERT INTO units_of_measure (
  company_id, code, name, name_en, name_ar, unit_type,
  base_unit_id, conversion_factor, symbol_en, decimal_places, sort_order, is_active
)
SELECT
  NULL, v.code, v.name_en, v.name_en, v.name_ar, 'packaging',
  (SELECT id FROM units_of_measure WHERE code = v.base_code AND deleted_at IS NULL),
  v.factor, v.symbol, 0, v.sort_order, TRUE
FROM (
  VALUES
    ('BOX10',  'Box (10 pcs)',   'علبة (10 قطع)',  'box', 'PCS', 10, 110),
    ('CTN24',  'Carton (24 pcs)','كرتون (24 قطعة)','ctn', 'PCS', 24, 120),
    ('PAL',    'Pallet',         'باليت',          'pal', 'BOX10', 60, 130)
) AS v(code, name_en, name_ar, symbol, base_code, factor, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u
  WHERE u.code = v.code AND u.deleted_at IS NULL
);

-- =====================================================
-- 2) Company-scoped Units (units)
--    These back the Units page: /api/master/units (requires X-Company-Id)
-- =====================================================

DO $$
DECLARE
  c RECORD;
  pcs_id INT;
  kg_id INT;
  l_id INT;
  m_id INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    -- Base units per company
    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'PCS', 'Piece', 'قطعة', 'piece', NULL, NULL, TRUE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'KG', 'Kilogram', 'كيلوجرام', 'weight', NULL, NULL, TRUE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'L', 'Liter', 'لتر', 'volume', NULL, NULL, TRUE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'M', 'Meter', 'متر', 'length', NULL, NULL, TRUE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO pcs_id FROM units WHERE company_id = c.id AND code = 'PCS' AND deleted_at IS NULL;
    SELECT id INTO kg_id  FROM units WHERE company_id = c.id AND code = 'KG'  AND deleted_at IS NULL;
    SELECT id INTO l_id   FROM units WHERE company_id = c.id AND code = 'L'   AND deleted_at IS NULL;
    SELECT id INTO m_id   FROM units WHERE company_id = c.id AND code = 'M'   AND deleted_at IS NULL;

    -- Derived units
    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'G',  'Gram',       'جرام',     'weight', kg_id, 0.001, FALSE, TRUE),
      (c.id, 'ML', 'Milliliter', 'ملليلتر',  'volume', l_id,  0.001, FALSE, TRUE),
      (c.id, 'CM', 'Centimeter', 'سنتيمتر',  'length', m_id,  0.01,  FALSE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- Convenience packaging units in units table (piece-based)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
    VALUES
      (c.id, 'BOX10', 'Box (10 pcs)',   'علبة (10 قطع)',  'piece', pcs_id, 10, FALSE, TRUE),
      (c.id, 'CTN24', 'Carton (24 pcs)','كرتون (24 قطعة)','piece', pcs_id, 24, FALSE, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 3) Company-scoped Item Categories (item_categories)
--    Hierarchy examples + realistic codes
-- =====================================================

DO $$
DECLARE
  c RECORD;
  cat_raw INT;
  cat_pack INT;
  cat_fin INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    -- Roots
    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, NULL, 'CAT-RAW',  'Raw Materials',   'Raw Materials',   'مواد خام', 1, TRUE),
      (c.id, NULL, 'CAT-PACK', 'Packaging',      'Packaging',      'مواد تعبئة', 1, TRUE),
      (c.id, NULL, 'CAT-FIN',  'Finished Goods', 'Finished Goods', 'منتجات تامة', 1, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO cat_raw  FROM item_categories WHERE company_id = c.id AND code = 'CAT-RAW'  AND deleted_at IS NULL;
    SELECT id INTO cat_pack FROM item_categories WHERE company_id = c.id AND code = 'CAT-PACK' AND deleted_at IS NULL;
    SELECT id INTO cat_fin  FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN'  AND deleted_at IS NULL;

    -- Children
    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, cat_raw,  'CAT-RAW-CHEM', 'Chemicals',      'Chemicals',      'كيماويات', 2, TRUE),
      (c.id, cat_raw,  'CAT-RAW-MET',  'Metals',         'Metals',         'معادن',    2, TRUE),
      (c.id, cat_pack, 'CAT-PACK-BOX', 'Boxes & Cartons','Boxes & Cartons','صناديق وكرتون', 2, TRUE),
      (c.id, cat_pack, 'CAT-PACK-LBL', 'Labels',         'Labels',         'ملصقات',   2, TRUE),
      (c.id, cat_fin,  'CAT-FIN-FOOD', 'Food Products',  'Food Products',  'منتجات غذائية', 2, TRUE),
      (c.id, cat_fin,  'CAT-FIN-CONS', 'Consumer Goods', 'Consumer Goods', 'سلع استهلاكية', 2, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 4) Company-scoped Item Groups (item_groups)
--    Includes parent/child so deletes have real effects.
-- =====================================================

DO $$
DECLARE
  c RECORD;
  g_main_raw INT;
  g_main_fin INT;
  g_main_pack INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    -- Main groups
    INSERT INTO item_groups (
      company_id, code, name, name_en, name_ar,
      description, description_en, description_ar,
      parent_group_id, group_type, sort_order, is_active
    ) VALUES
      (c.id, 'GRP-RAW',  'Raw Materials',   'Raw Materials',   'مواد خام',   'Top-level group', 'Top-level group', 'مجموعة رئيسية', NULL, 'main', 10, TRUE),
      (c.id, 'GRP-PACK', 'Packaging',       'Packaging',       'تعبئة',      'Top-level group', 'Top-level group', 'مجموعة رئيسية', NULL, 'main', 20, TRUE),
      (c.id, 'GRP-FIN',  'Finished Goods',  'Finished Goods',  'منتجات تامة','Top-level group', 'Top-level group', 'مجموعة رئيسية', NULL, 'main', 30, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO g_main_raw  FROM item_groups WHERE company_id = c.id AND code = 'GRP-RAW'  AND deleted_at IS NULL;
    SELECT id INTO g_main_pack FROM item_groups WHERE company_id = c.id AND code = 'GRP-PACK' AND deleted_at IS NULL;
    SELECT id INTO g_main_fin  FROM item_groups WHERE company_id = c.id AND code = 'GRP-FIN'  AND deleted_at IS NULL;

    -- Sub-groups (make parent deletion fail unless children removed)
    INSERT INTO item_groups (
      company_id, code, name, name_en, name_ar,
      description, description_en, description_ar,
      parent_group_id, group_type, sort_order, is_active
    ) VALUES
      (c.id, 'GRP-RAW-CHEM',  'Chemicals',       'Chemicals',       'كيماويات',      NULL, NULL, NULL, g_main_raw,  'sub', 11, TRUE),
      (c.id, 'GRP-RAW-MET',   'Metals',          'Metals',          'معادن',         NULL, NULL, NULL, g_main_raw,  'sub', 12, TRUE),
      (c.id, 'GRP-PACK-BOX',  'Boxes & Cartons', 'Boxes & Cartons', 'صناديق وكرتون', NULL, NULL, NULL, g_main_pack, 'sub', 21, TRUE),
      (c.id, 'GRP-PACK-LBL',  'Labels',          'Labels',          'ملصقات',        NULL, NULL, NULL, g_main_pack, 'sub', 22, TRUE),
      (c.id, 'GRP-FIN-FOOD',  'Food Products',   'Food Products',   'منتجات غذائية', NULL, NULL, NULL, g_main_fin,  'sub', 31, TRUE),
      (c.id, 'GRP-FIN-CONS',  'Consumer Goods',  'Consumer Goods',  'سلع استهلاكية', NULL, NULL, NULL, g_main_fin,  'sub', 32, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 5) Company-scoped reference_data seeds
--    Used by ReferenceDataCrudPage (Item Types, Item Grades, Group Types)
-- =====================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM companies LOOP

    -- Group Types (as per the UI label: customers, vendors, products)
    INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
    SELECT c.id, v.type, v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
    FROM (
      VALUES
        ('group_types', 'CUSTOMER', 'Customer Group', 'مجموعة عملاء',  'Classification for customer groupings', 'تصنيف لمجموعات العملاء'),
        ('group_types', 'VENDOR',   'Vendor Group',   'مجموعة موردين', 'Classification for supplier groupings', 'تصنيف لمجموعات الموردين'),
        ('group_types', 'PRODUCT',  'Product Group',  'مجموعة منتجات', 'Classification for product groupings',  'تصنيف لمجموعات المنتجات')
    ) AS v(type, code, name_en, name_ar, desc_en, desc_ar)
    WHERE NOT EXISTS (
      SELECT 1 FROM reference_data r
      WHERE r.deleted_at IS NULL
        AND r.company_id = c.id
        AND r.type = v.type
        AND r.code = v.code
    );

    -- Item Types
    INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
    SELECT c.id, v.type, v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
    FROM (
      VALUES
        ('item_types', 'RAW_MATERIAL',   'Raw Material',   'مواد خام',        'Purchased inputs used in production', 'مواد يتم شراؤها للاستخدام في الإنتاج'),
        ('item_types', 'FINISHED_GOODS', 'Finished Goods', 'منتجات تامة',     'Sellable finished products',         'منتجات نهائية قابلة للبيع'),
        ('item_types', 'CONSUMABLE',     'Consumable',     'مواد استهلاكية',  'Used internally and consumed',       'تُستخدم داخلياً وتستهلك'),
        ('item_types', 'TRADING_GOODS',  'Trading Goods',  'بضائع تجارية',    'Bought and resold without changes',  'تُشترى وتباع دون تصنيع')
    ) AS v(type, code, name_en, name_ar, desc_en, desc_ar)
    WHERE NOT EXISTS (
      SELECT 1 FROM reference_data r
      WHERE r.deleted_at IS NULL
        AND r.company_id = c.id
        AND r.type = v.type
        AND r.code = v.code
    );

    -- Item Grades
    INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
    SELECT c.id, v.type, v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
    FROM (
      VALUES
        ('item_grades', 'A',       'Grade A', 'درجة A', 'Highest quality', 'أعلى جودة'),
        ('item_grades', 'B',       'Grade B', 'درجة B', 'Standard quality', 'جودة قياسية'),
        ('item_grades', 'C',       'Grade C', 'درجة C', 'Economy quality', 'جودة اقتصادية'),
        ('item_grades', 'PREM',    'Premium', 'ممتاز',  'Premium selection', 'تصنيف ممتاز'),
        ('item_grades', 'STD',     'Standard','قياسي',  'Standard selection', 'تصنيف قياسي')
    ) AS v(type, code, name_en, name_ar, desc_en, desc_ar)
    WHERE NOT EXISTS (
      SELECT 1 FROM reference_data r
      WHERE r.deleted_at IS NULL
        AND r.company_id = c.id
        AND r.type = v.type
        AND r.code = v.code
    );

  END LOOP;
END $$;

COMMIT;
