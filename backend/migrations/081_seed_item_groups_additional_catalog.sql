-- 081_seed_item_groups_additional_catalog.sql
-- Adds additional realistic sub-groups (and a few deeper sub-groups) to enrich the item_groups catalog.
-- Notes:
-- - Company-scoped: inserts for each company.
-- - Codes kept <= 20 chars to satisfy VARCHAR(20) constraint.
-- - Uses ON CONFLICT to upsert and revive soft-deleted rows.

BEGIN;

DO $$
DECLARE
  c RECORD;
BEGIN
  CREATE TEMP TABLE tmp_item_groups_seed (
    level INT NOT NULL,
    code VARCHAR(20) NOT NULL,
    parent_code VARCHAR(20) NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    sort_order INT NOT NULL
  ) ON COMMIT DROP;

  -- New codes start at 300 to avoid clashing with 080 (100..299)
  INSERT INTO tmp_item_groups_seed (level, code, parent_code, name_en, name_ar, sort_order)
  VALUES
    -- =====================
    -- Spices (IG006)
    -- =====================
    (2, '300', 'IG006', 'Pepper', 'فلفل', 300),
    (2, '301', 'IG006', 'Cumin', 'كمون', 301),
    (2, '302', 'IG006', 'Turmeric', 'كركم', 302),
    (2, '303', 'IG006', 'Cinnamon', 'قرفة', 303),
    (2, '304', 'IG006', 'Paprika', 'بابريكا', 304),
    (2, '305', 'IG006', 'Coriander', 'كزبرة', 305),
    (2, '306', 'IG006', 'Ginger', 'زنجبيل', 306),

    -- =====================
    -- Herbs (IG008)
    -- =====================
    (2, '310', 'IG008', 'Mint', 'نعناع', 310),
    (2, '311', 'IG008', 'Chamomile', 'بابونج', 311),
    (2, '312', 'IG008', 'Sage', 'مرمية', 312),
    (2, '313', 'IG008', 'Thyme', 'زعتر', 313),
    (2, '314', 'IG008', 'Rosemary', 'إكليل الجبل', 314),

    -- =====================
    -- Grains & Legumes (IG009)
    -- =====================
    (2, '320', 'IG009', 'Lentils', 'عدس', 320),
    (2, '321', 'IG009', 'Chickpeas', 'حمص', 321),
    (2, '322', 'IG009', 'Fava Beans', 'فول', 322),
    (2, '323', 'IG009', 'Kidney Beans', 'فاصوليا', 323),

    -- =====================
    -- Oils (IG017)
    -- =====================
    (2, '330', 'IG017', 'Sunflower Oil', 'زيت عباد الشمس', 330),
    (2, '331', 'IG017', 'Corn Oil', 'زيت ذرة', 331),
    (2, '332', 'IG017', 'Canola Oil', 'زيت كانولا', 332),
    (2, '333', 'IG017', 'Sesame Oil', 'زيت سمسم', 333),

    -- =====================
    -- Cheese (IG018)
    -- =====================
    (2, '340', 'IG018', 'White Cheese', 'جبن أبيض', 340),
    (2, '341', 'IG018', 'Cheddar', 'شيدر', 341),
    (2, '342', 'IG018', 'Mozzarella', 'موزاريلا', 342),
    (2, '343', 'IG018', 'Cream Cheese', 'جبن كريمي', 343),

    -- =====================
    -- Sugar (IG020)
    -- =====================
    (2, '350', 'IG020', 'White Sugar', 'سكر أبيض', 350),
    (2, '351', 'IG020', 'Brown Sugar', 'سكر بني', 351),
    (2, '352', 'IG020', 'Powdered Sugar', 'سكر بودرة', 352),

    -- =====================
    -- Flour (IG021)
    -- =====================
    (2, '360', 'IG021', 'All-Purpose Flour', 'دقيق أبيض', 360),
    (2, '361', 'IG021', 'Whole Wheat Flour', 'دقيق قمح كامل', 361),
    (2, '362', 'IG021', 'Semolina', 'سميد', 362),
    (2, '363', 'IG021', 'Corn Flour', 'دقيق ذرة', 363),

    -- =====================
    -- Chocolate (IG023)
    -- =====================
    (2, '370', 'IG023', 'Dark Chocolate', 'شوكلاتة داكنة', 370),
    (2, '371', 'IG023', 'Milk Chocolate', 'شوكلاتة بالحليب', 371),
    (2, '372', 'IG023', 'White Chocolate', 'شوكلاتة بيضاء', 372),

    -- =====================
    -- Rice (IG030)
    -- =====================
    (2, '380', 'IG030', 'Basmati Rice', 'أرز بسمتي', 380),
    (2, '381', 'IG030', 'Jasmine Rice', 'أرز ياسمين', 381),
    (2, '382', 'IG030', 'Short Grain Rice', 'أرز حبة قصيرة', 382),
    (2, '383', 'IG030', 'Parboiled Rice', 'أرز مسلوق', 383),

    -- =====================
    -- Fish (IG031)
    -- =====================
    (2, '390', 'IG031', 'Fresh Fish', 'سمك طازج', 390),
    (2, '391', 'IG031', 'Frozen Fish', 'سمك مجمد', 391),
    (2, '392', 'IG031', 'Canned Tuna', 'تونة معلبة', 392),

    -- =====================
    -- Meat (IG032)
    -- =====================
    (2, '400', 'IG032', 'Beef', 'لحم بقري', 400),
    (2, '401', 'IG032', 'Chicken', 'دجاج', 401),
    (2, '402', 'IG032', 'Lamb', 'لحم غنم', 402),

    -- =====================
    -- Leafy Greens (IG033)
    -- =====================
    (2, '410', 'IG033', 'Parsley', 'بقدونس', 410),
    (2, '411', 'IG033', 'Coriander Leaves', 'كزبرة خضراء', 411),
    (2, '412', 'IG033', 'Lettuce', 'خس', 412),
    (2, '413', 'IG033', 'Spinach', 'سبانخ', 413),

    -- =====================
    -- Fruits (IG034)
    -- =====================
    (2, '420', 'IG034', 'Apples', 'تفاح', 420),
    (2, '421', 'IG034', 'Bananas', 'موز', 421),
    (2, '422', 'IG034', 'Oranges', 'برتقال', 422),
    (2, '423', 'IG034', 'Grapes', 'عنب', 423),

    -- =====================
    -- Vegetables (IG035)
    -- =====================
    (2, '430', 'IG035', 'Tomatoes', 'طماطم', 430),
    (2, '431', 'IG035', 'Potatoes', 'بطاطس', 431),
    (2, '432', 'IG035', 'Onions', 'بصل', 432),
    (2, '433', 'IG035', 'Cucumbers', 'خيار', 433),

    -- =====================
    -- Beverages (IG036)
    -- =====================
    (2, '440', 'IG036', 'Energy Drinks', 'مشروبات طاقة', 440),
    (2, '441', 'IG036', 'Malt Drinks', 'مشروبات شعير', 441),
    (2, '442', 'IG036', 'Iced Tea', 'شاي مثلج', 442),

    -- =====================
    -- Water (IG037)
    -- =====================
    (2, '450', 'IG037', 'Bottled Water (Small)', 'مياه عبوات صغيرة', 450),
    (2, '451', 'IG037', 'Bottled Water (Large)', 'مياه عبوات كبيرة', 451),

    -- =====================
    -- Dates (IG041)
    -- =====================
    (2, '460', 'IG041', 'Ajwa Dates', 'تمر عجوة', 460),
    (2, '461', 'IG041', 'Sukkari Dates', 'تمر سكري', 461),
    (2, '462', 'IG041', 'Medjool Dates', 'تمر مجدول', 462),
    (2, '463', 'IG041', 'Date Paste', 'معجون تمر', 463),

    -- =====================
    -- Paper Products (IG043)
    -- =====================
    (2, '470', 'IG043', 'Facial Tissues', 'مناديل وجه', 470),
    (2, '471', 'IG043', 'Toilet Paper', 'مناديل حمام', 471),
    (2, '472', 'IG043', 'Paper Towels', 'مناديل مطبخ', 472),

    -- =====================
    -- Pest Control (IG045)
    -- =====================
    (2, '480', 'IG045', 'Insect Spray', 'بخاخ حشرات', 480),
    (2, '481', 'IG045', 'Mosquito Repellent', 'طارد بعوض', 481),
    (2, '482', 'IG045', 'Rodent Control', 'مكافحة القوارض', 482),

    -- =====================
    -- School Supplies (IG048) - deeper sub-groups under existing 293..299
    -- =====================
    (3, '293-01', '293', 'School Backpack', 'حقيبة مدرسية', 29301),
    (3, '293-02', '293', 'Lunch Bag', 'حقيبة طعام', 29302),
    (3, '294-01', '294', 'Ballpoint Pens', 'أقلام حبر', 29401),
    (3, '294-02', '294', 'Markers', 'أقلام فلوماستر', 29402),
    (3, '295-01', '295', 'A4 Notebooks', 'دفاتر A4', 29501),
    (3, '295-02', '295', 'Small Notebooks', 'دفاتر صغيرة', 29502);

  FOR c IN SELECT id FROM companies LOOP
    -- 1) Insert/Update sub groups (level 2)
    INSERT INTO item_groups (
      company_id, code, name, name_en, name_ar,
      parent_group_id, group_type, sort_order, is_active
    )
    SELECT
      c.id,
      s.code,
      s.name_en,
      s.name_en,
      s.name_ar,
      p.id,
      'sub',
      s.sort_order,
      TRUE
    FROM tmp_item_groups_seed s
    JOIN item_groups p
      ON p.company_id = c.id
     AND p.code = s.parent_code
     AND p.deleted_at IS NULL
    WHERE s.level = 2
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      name_ar = EXCLUDED.name_ar,
      parent_group_id = EXCLUDED.parent_group_id,
      group_type = EXCLUDED.group_type,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      deleted_at = NULL,
      updated_at = NOW();

    -- 2) Insert/Update deeper sub groups (level 3)
    INSERT INTO item_groups (
      company_id, code, name, name_en, name_ar,
      parent_group_id, group_type, sort_order, is_active
    )
    SELECT
      c.id,
      s.code,
      s.name_en,
      s.name_en,
      s.name_ar,
      p.id,
      'sub',
      s.sort_order,
      TRUE
    FROM tmp_item_groups_seed s
    JOIN item_groups p
      ON p.company_id = c.id
     AND p.code = s.parent_code
     AND p.deleted_at IS NULL
    WHERE s.level = 3
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      name_ar = EXCLUDED.name_ar,
      parent_group_id = EXCLUDED.parent_group_id,
      group_type = EXCLUDED.group_type,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      deleted_at = NULL,
      updated_at = NOW();
  END LOOP;
END $$;

COMMIT;
