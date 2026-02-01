-- 079_seed_inventory_master_data_more.sql
-- Add a larger set of realistic, interrelated inventory master data + sample items.
-- Notes:
-- - Data is synthetic (generated), not copied from external proprietary sources.
-- - Company scoping respected: loops over all companies.

BEGIN;

-- =====================================================
-- 1) More global Units of Measure (units_of_measure)
-- =====================================================

-- Extra basics (unit_type='basic')
INSERT INTO units_of_measure (
  company_id, code, name, name_en, name_ar, unit_type,
  base_unit_id, conversion_factor, symbol_en, decimal_places, sort_order, is_active
)
SELECT
  NULL, v.code, v.name_en, v.name_en, v.name_ar, 'basic',
  NULL, NULL, v.symbol, v.decimals, v.sort_order, TRUE
FROM (
  VALUES
    ('EA',  'Each',     'حبة',  'ea', 0, 11),
    ('DAY', 'Day',      'يوم',  'd',  0, 90)
) AS v(code, name_en, name_ar, symbol, decimals, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u
  WHERE u.code = v.code AND u.deleted_at IS NULL
);

-- Extra derived + packaging units
INSERT INTO units_of_measure (
  company_id, code, name, name_en, name_ar, unit_type,
  base_unit_id, conversion_factor, symbol_en, decimal_places, sort_order, is_active
)
SELECT
  NULL,
  v.code,
  v.name_en,
  v.name_en,
  v.name_ar,
  v.kind,
  (SELECT id FROM units_of_measure WHERE code = v.base_code AND deleted_at IS NULL),
  v.factor,
  v.symbol,
  v.decimals,
  v.sort_order,
  TRUE
FROM (
  VALUES
    -- weight
    ('LB',   'Pound',          'رطل',            'derived',   'KG', 0.453592, 'lb', 3, 23),
    ('OZ',   'Ounce',          'أونصة',          'derived',   'KG', 0.0283495,'oz', 3, 24),
    -- volume
    ('GAL',  'Gallon',         'جالون',          'derived',   'L',  3.78541,  'gal',3, 32),
    -- packaging (piece)
    ('PK6',  'Pack (6 pcs)',   'باك (6 قطع)',    'packaging','PCS', 6,       'pk', 0, 111),
    ('PK12', 'Pack (12 pcs)',  'باك (12 قطعة)',  'packaging','PCS', 12,      'pk', 0, 112),
    ('DOZ',  'Dozen (12 pcs)', 'دستة (12 قطعة)', 'packaging','PCS', 12,      'doz',0, 113),
    ('BAG50','Bag (50 pcs)',   'كيس (50 قطعة)',  'packaging','PCS', 50,      'bag',0, 114),
    ('BOX20','Box (20 pcs)',   'علبة (20 قطعة)', 'packaging','PCS', 20,      'box',0, 115),
    ('CTN48','Carton (48 pcs)','كرتون (48 قطعة)','packaging','PCS', 48,      'ctn',0, 121)
) AS v(code, name_en, name_ar, kind, base_code, factor, symbol, decimals, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u
  WHERE u.code = v.code AND u.deleted_at IS NULL
);

-- =====================================================
-- 2) Extend reference_data (company-scoped)
-- =====================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    -- More item grades
    INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
    SELECT c.id, v.type, v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
    FROM (
      VALUES
        ('item_grades', 'A_PLUS', 'Grade A+', 'درجة A+', 'Top premium quality', 'جودة ممتازة جداً'),
        ('item_grades', 'D',      'Grade D',  'درجة D',  'Low quality / clearance', 'جودة منخفضة / تصفية')
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

-- =====================================================
-- 3) Extend item_categories (company-scoped) with deeper hierarchy
-- =====================================================

DO $$
DECLARE
  c RECORD;
  cat_fin_food INT;
  cat_fin_cons INT;
  cat_food_bev INT;
  cat_food_dry INT;
  cat_cons_clean INT;
  cat_cons_elec INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    SELECT id INTO cat_fin_food FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-FOOD' AND deleted_at IS NULL;
    SELECT id INTO cat_fin_cons FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-CONS' AND deleted_at IS NULL;

    -- Level 3 under Food Products
    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, cat_fin_food, 'CAT-FIN-FOOD-BEV', 'Beverages',   'Beverages',   'مشروبات', 3, TRUE),
      (c.id, cat_fin_food, 'CAT-FIN-FOOD-DRY', 'Dry Goods',   'Dry Goods',   'مواد جافة', 3, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO cat_food_bev FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-FOOD-BEV' AND deleted_at IS NULL;
    SELECT id INTO cat_food_dry FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-FOOD-DRY' AND deleted_at IS NULL;

    -- Level 4 examples
    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, cat_food_bev, 'CAT-FIN-BEV-WTR', 'Water', 'Water', 'مياه', 4, TRUE),
      (c.id, cat_food_bev, 'CAT-FIN-BEV-JUI', 'Juices', 'Juices', 'عصائر', 4, TRUE),
      (c.id, cat_food_dry, 'CAT-FIN-DRY-RIC',  'Rice & Grains', 'Rice & Grains', 'أرز وحبوب', 4, TRUE),
      (c.id, cat_food_dry, 'CAT-FIN-DRY-SPC', 'Spices', 'Spices', 'بهارات', 4, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- Level 3 under Consumer Goods
    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, cat_fin_cons, 'CAT-FIN-CONS-CLEAN', 'Cleaning',   'Cleaning',   'منظفات', 3, TRUE),
      (c.id, cat_fin_cons, 'CAT-FIN-CONS-ELEC',  'Electronics','Electronics','إلكترونيات', 3, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO cat_cons_clean FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-CONS-CLEAN' AND deleted_at IS NULL;
    SELECT id INTO cat_cons_elec  FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-CONS-ELEC'  AND deleted_at IS NULL;

    INSERT INTO item_categories (company_id, parent_id, code, name, name_en, name_ar, level, is_active)
    VALUES
      (c.id, cat_cons_clean, 'CAT-FIN-CLN-DET', 'Detergents', 'Detergents', 'مساحيق وغسيل', 4, TRUE),
      (c.id, cat_cons_clean, 'CAT-FIN-CLN-DSH',  'Dishwashing', 'Dishwashing', 'غسيل صحون', 4, TRUE),
      (c.id, cat_cons_elec,  'CAT-FIN-ELC-ACC',    'Accessories', 'Accessories', 'إكسسوارات', 4, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 4) Extend item_groups (company-scoped) with more sub-groups
-- =====================================================

DO $$
DECLARE
  c RECORD;
  g_fin_food INT;
  g_fin_cons INT;
  g_pack_box INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    SELECT id INTO g_fin_food FROM item_groups WHERE company_id = c.id AND code = 'GRP-FIN-FOOD' AND deleted_at IS NULL;
    SELECT id INTO g_fin_cons FROM item_groups WHERE company_id = c.id AND code = 'GRP-FIN-CONS' AND deleted_at IS NULL;
    SELECT id INTO g_pack_box FROM item_groups WHERE company_id = c.id AND code = 'GRP-PACK-BOX' AND deleted_at IS NULL;

    -- Third level under food and consumer goods
    INSERT INTO item_groups (company_id, code, name, name_en, name_ar, parent_group_id, group_type, sort_order, is_active)
    VALUES
      (c.id, 'GRP-FIN-FOOD-WATER', 'Water', 'Water', 'مياه', g_fin_food, 'sub', 311, TRUE),
      (c.id, 'GRP-FIN-FOOD-JUICE', 'Juices', 'Juices', 'عصائر', g_fin_food, 'sub', 312, TRUE),
      (c.id, 'GRP-FIN-CONS-CLEAN', 'Cleaning', 'Cleaning', 'منظفات', g_fin_cons, 'sub', 321, TRUE),
      (c.id, 'GRP-FIN-CONS-ELEC',  'Electronics', 'Electronics', 'إلكترونيات', g_fin_cons, 'sub', 322, TRUE),
      (c.id, 'GRP-PACK-BOX-TAPE',  'Tape & Seals', 'Tape & Seals', 'شريط ولاصق', g_pack_box, 'sub', 211, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 5) Add more company-scoped units (units)
-- =====================================================

DO $$
DECLARE
  c RECORD;
  pcs_id INT;
  kg_id INT;
  l_id INT;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    SELECT id INTO pcs_id FROM units WHERE company_id = c.id AND code = 'PCS' AND deleted_at IS NULL;
    SELECT id INTO kg_id  FROM units WHERE company_id = c.id AND code = 'KG'  AND deleted_at IS NULL;
    SELECT id INTO l_id   FROM units WHERE company_id = c.id AND code = 'L'   AND deleted_at IS NULL;

    IF pcs_id IS NOT NULL THEN
      INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
      VALUES
        (c.id, 'PK6',  'Pack (6 pcs)',   'باك (6 قطع)',   'piece', pcs_id, 6,  FALSE, TRUE),
        (c.id, 'PK12', 'Pack (12 pcs)',  'باك (12 قطعة)', 'piece', pcs_id, 12, FALSE, TRUE),
        (c.id, 'DOZ',  'Dozen (12 pcs)', 'دستة (12 قطعة)','piece', pcs_id, 12, FALSE, TRUE),
        (c.id, 'BOX20','Box (20 pcs)',   'علبة (20 قطعة)','piece', pcs_id, 20, FALSE, TRUE),
        (c.id, 'CTN48','Carton (48 pcs)','كرتون (48 قطعة)','piece', pcs_id, 48, FALSE, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;

    IF kg_id IS NOT NULL THEN
      INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
      VALUES
        (c.id, 'LB', 'Pound', 'رطل', 'weight', kg_id, 0.453592, FALSE, TRUE),
        (c.id, 'OZ', 'Ounce', 'أونصة', 'weight', kg_id, 0.0283495, FALSE, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;

    IF l_id IS NOT NULL THEN
      INSERT INTO units (company_id, code, name, name_ar, unit_type, base_unit_id, conversion_factor, is_base_unit, is_active)
      VALUES
        (c.id, 'GAL', 'Gallon', 'جالون', 'volume', l_id, 3.78541, FALSE, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 6) Seed sample ITEMS (company-scoped) linked to groups+categories+UOM
--    This makes delete constraints real: categories/groups with items cannot be deleted.
-- =====================================================

DO $$
DECLARE
  c RECORD;
  uom_pcs INT;
  uom_l INT;
  uom_kg INT;
  cat_water INT;
  cat_detergents INT;
  grp_water INT;
  grp_clean INT;
  grp_boxes INT;
BEGIN
  -- Resolve global UOM ids once
  SELECT id INTO uom_pcs FROM units_of_measure WHERE code = 'PCS' AND deleted_at IS NULL;
  SELECT id INTO uom_l   FROM units_of_measure WHERE code = 'L'   AND deleted_at IS NULL;
  SELECT id INTO uom_kg  FROM units_of_measure WHERE code = 'KG'  AND deleted_at IS NULL;

  FOR c IN SELECT id FROM companies LOOP
    -- Category targets
    SELECT id INTO cat_water FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-BEV-WTR' AND deleted_at IS NULL;
    SELECT id INTO cat_detergents FROM item_categories WHERE company_id = c.id AND code = 'CAT-FIN-CLN-DET' AND deleted_at IS NULL;

    -- Group targets
    SELECT id INTO grp_water FROM item_groups WHERE company_id = c.id AND code = 'GRP-FIN-FOOD-WATER' AND deleted_at IS NULL;
    SELECT id INTO grp_clean FROM item_groups WHERE company_id = c.id AND code = 'GRP-FIN-CONS-CLEAN' AND deleted_at IS NULL;
    SELECT id INTO grp_boxes FROM item_groups WHERE company_id = c.id AND code = 'GRP-PACK-BOX' AND deleted_at IS NULL;

    -- Water items (sellable)
    IF cat_water IS NOT NULL AND grp_water IS NOT NULL AND uom_pcs IS NOT NULL THEN
      INSERT INTO items (
        company_id, code, barcode, name, name_ar, description,
        category_id, group_id,
        item_type, is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, is_active,
        created_at, updated_at
      )
      SELECT
        c.id,
        v.code,
        v.barcode,
        v.name_en,
        v.name_ar,
        v.desc_en,
        cat_water,
        grp_water,
        'finished_goods', TRUE, TRUE, TRUE,
        uom_pcs, uom_pcs, uom_pcs,
        TRUE, FALSE,
        'average', v.std_cost, v.last_cost, v.avg_cost,
        v.sell_price,
        TRUE,
        NOW(), NOW()
      FROM (
        VALUES
          ('WTR-500',  '6280000000500', 'Water Bottle 500ml', 'مياه 500 مل', 'Drinking water bottle 500ml', 0.30, 0.28, 0.29, 1.00),
          ('WTR-1500', '6280000001500', 'Water Bottle 1.5L',  'مياه 1.5 لتر', 'Drinking water bottle 1.5L', 0.55, 0.52, 0.53, 1.75),
          ('WTR-20L',  '6280000020000', 'Water Gallon 20L',   'مياه 20 لتر', 'Water gallon 20L',  4.50, 4.20, 4.30, 9.50)
      ) AS v(code, barcode, name_en, name_ar, desc_en, std_cost, last_cost, avg_cost, sell_price)
      WHERE NOT EXISTS (
        SELECT 1 FROM items i
        WHERE i.company_id = c.id AND i.code = v.code AND i.deleted_at IS NULL
      );
    END IF;

    -- Detergents (sellable)
    IF cat_detergents IS NOT NULL AND grp_clean IS NOT NULL AND uom_l IS NOT NULL THEN
      INSERT INTO items (
        company_id, code, barcode, name, name_ar, description,
        category_id, group_id,
        item_type, is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, is_active,
        created_at, updated_at
      )
      SELECT
        c.id,
        v.code,
        v.barcode,
        v.name_en,
        v.name_ar,
        v.desc_en,
        cat_detergents,
        grp_clean,
        'finished_goods', TRUE, TRUE, TRUE,
        uom_l, uom_l, uom_l,
        TRUE, FALSE,
        'average', v.std_cost, v.last_cost, v.avg_cost,
        v.sell_price,
        TRUE,
        NOW(), NOW()
      FROM (
        VALUES
          ('DET-1L', '6280000030001', 'Laundry Detergent 1L', 'منظف غسيل 1 لتر', 'Laundry detergent 1 liter', 3.80, 3.60, 3.70, 7.50),
          ('DET-3L', '6280000030003', 'Laundry Detergent 3L', 'منظف غسيل 3 لتر', 'Laundry detergent 3 liters', 9.90, 9.40, 9.60, 18.90)
      ) AS v(code, barcode, name_en, name_ar, desc_en, std_cost, last_cost, avg_cost, sell_price)
      WHERE NOT EXISTS (
        SELECT 1 FROM items i
        WHERE i.company_id = c.id AND i.code = v.code AND i.deleted_at IS NULL
      );
    END IF;

    -- Packaging materials as trading goods (purchasable)
    IF grp_boxes IS NOT NULL AND uom_pcs IS NOT NULL THEN
      INSERT INTO items (
        company_id, code, barcode, name, name_ar, description,
        category_id, group_id,
        item_type, is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, is_active,
        created_at, updated_at
      )
      SELECT
        c.id,
        v.code,
        v.barcode,
        v.name_en,
        v.name_ar,
        v.desc_en,
        NULL,
        grp_boxes,
        'trading_goods', TRUE, FALSE, TRUE,
        uom_pcs, uom_pcs, uom_pcs,
        TRUE, FALSE,
        'average', v.std_cost, v.last_cost, v.avg_cost,
        0,
        TRUE,
        NOW(), NOW()
      FROM (
        VALUES
          ('BOX-S',  '6280000100001', 'Shipping Box Small',  'صندوق شحن صغير',  'Corrugated shipping box (S)', 1.00, 0.95, 0.98),
          ('BOX-M',  '6280000100002', 'Shipping Box Medium', 'صندوق شحن متوسط', 'Corrugated shipping box (M)', 1.60, 1.55, 1.58),
          ('BOX-L',  '6280000100003', 'Shipping Box Large',  'صندوق شحن كبير',  'Corrugated shipping box (L)', 2.20, 2.10, 2.15)
      ) AS v(code, barcode, name_en, name_ar, desc_en, std_cost, last_cost, avg_cost)
      WHERE NOT EXISTS (
        SELECT 1 FROM items i
        WHERE i.company_id = c.id AND i.code = v.code AND i.deleted_at IS NULL
      );
    END IF;

    -- A couple of raw materials (weight-based)
    IF uom_kg IS NOT NULL THEN
      INSERT INTO items (
        company_id, code, barcode, name, name_ar, description,
        category_id, group_id,
        item_type, is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, is_active,
        created_at, updated_at
      )
      SELECT
        c.id,
        v.code,
        v.barcode,
        v.name_en,
        v.name_ar,
        v.desc_en,
        NULL,
        NULL,
        'raw_material', TRUE, FALSE, TRUE,
        uom_kg, uom_kg, uom_kg,
        TRUE, FALSE,
        'average', v.std_cost, v.last_cost, v.avg_cost,
        0,
        TRUE,
        NOW(), NOW()
      FROM (
        VALUES
          ('RM-SALT', '6280000200001', 'Industrial Salt (kg)', 'ملح صناعي (كجم)', 'Raw material: salt', 0.60, 0.55, 0.58),
          ('RM-SODA', '6280000200002', 'Soda Ash (kg)',        'صودا آش (كجم)',  'Raw material: soda ash', 1.80, 1.70, 1.75)
      ) AS v(code, barcode, name_en, name_ar, desc_en, std_cost, last_cost, avg_cost)
      WHERE NOT EXISTS (
        SELECT 1 FROM items i
        WHERE i.company_id = c.id AND i.code = v.code AND i.deleted_at IS NULL
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
