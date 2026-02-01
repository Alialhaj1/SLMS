-- 080_seed_item_groups_arabic_catalog.sql
-- Seeds a detailed Arabic item group hierarchy (main + sub-groups) into item_groups.
-- Source: user-provided catalog list (Arabic). Stored in DB (not hardcoded in UI).
-- Notes:
-- - Company-scoped: inserts for each company.
-- - Codes kept <= 20 chars to satisfy VARCHAR(20) constraint.
-- - Uses ON CONFLICT to upsert and to revive soft-deleted rows.

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

  INSERT INTO tmp_item_groups_seed (level, code, parent_code, name_en, name_ar, sort_order)
  VALUES
        -- =====================
        -- Main groups (IG001..IG048)
        -- =====================
        (1, 'IG001', NULL, 'Coffee', 'القهوة', 1),
        (1, 'IG002', NULL, 'Saffron', 'الزعفران', 2),
        (1, 'IG003', NULL, 'Tea', 'الشاي', 3),
        (1, 'IG004', NULL, 'Cardamom', 'الهيل', 4),
        (1, 'IG005', NULL, 'Nuts', 'المكسرات', 5),
        (1, 'IG006', NULL, 'Spices', 'بهارات', 6),
        (1, 'IG007', NULL, 'Aromatics', 'عطارة', 7),
        (1, 'IG008', NULL, 'Herbs', 'اعشاب', 8),
        (1, 'IG009', NULL, 'Grains & Legumes', 'حبوب', 9),
        (1, 'IG010', NULL, 'Cosmetics & Personal Care', 'كماليات ومستحضرات تجميل', 10),
        (1, 'IG011', NULL, 'Flavors & Artificial Colors', 'نكهات والوان صناعية', 11),
        (1, 'IG012', NULL, 'Soap', 'صابون', 12),
        (1, 'IG013', NULL, 'Accessories', 'اكسسوارات', 13),
        (1, 'IG014', NULL, 'Cleaning Supplies', 'أدوات نظافة', 14),
        (1, 'IG015', NULL, 'Incense', 'بخور', 15),
        (1, 'IG016', NULL, 'Perfumes', 'عطور', 16),
        (1, 'IG017', NULL, 'Oils', 'زيوت', 17),
        (1, 'IG018', NULL, 'Cheese', 'اجبان', 18),
        (1, 'IG019', NULL, 'Foodstuffs', 'مواد غذائية', 19),
        (1, 'IG020', NULL, 'Sugar', 'سكر', 20),
        (1, 'IG021', NULL, 'Flour', 'دقيق', 21),
        (1, 'IG022', NULL, 'Sweets', 'حلويات', 22),
        (1, 'IG023', NULL, 'Chocolate', 'شوكلاتة', 23),
        (1, 'IG024', NULL, 'Fruit Halawa', 'حلاوى فواكة', 24),
        (1, 'IG025', NULL, 'Snacks', 'وجبات خفيفة', 25),
        (1, 'IG026', NULL, 'Maamoul', 'معمول', 26),
        (1, 'IG027', NULL, 'Sweets (Bulk)', 'حلويات بالكيلو', 27),
        (1, 'IG028', NULL, 'Bakery', 'مخبوزات', 28),
        (1, 'IG029', NULL, 'Foodstuffs (2)', 'مواد غذائية', 29),
        (1, 'IG030', NULL, 'Rice', 'ارز', 30),
        (1, 'IG031', NULL, 'Fish', 'اسماك', 31),
        (1, 'IG032', NULL, 'Meat', 'لحوم', 32),
        (1, 'IG033', NULL, 'Leafy Greens', 'ورقيات', 33),
        (1, 'IG034', NULL, 'Fruits', 'فواكة', 34),
        (1, 'IG035', NULL, 'Vegetables', 'خضار', 35),
        (1, 'IG036', NULL, 'Beverages', 'مشروبات', 36),
        (1, 'IG037', NULL, 'Water', 'مياة', 37),
        (1, 'IG038', NULL, 'Ice', 'ثلج', 38),
        (1, 'IG039', NULL, 'Household Items', 'أدوات منزلية', 39),
        (1, 'IG040', NULL, 'Gifts', 'هدايا', 40),
        (1, 'IG041', NULL, 'Dates', 'تمور', 41),
        (1, 'IG042', NULL, 'Medical Supplies', 'أدوات طبية', 42),
        (1, 'IG043', NULL, 'Paper Products', 'منتجات ورقية', 43),
        (1, 'IG044', NULL, 'Cooking Tools', 'أدوات الطبخ', 44),
        (1, 'IG045', NULL, 'Pest Control', 'منتجات مكافحة الحشرات', 45),
        (1, 'IG046', NULL, 'Pet Products', 'منتجات الحيوانات الاليفة', 46),
        (1, 'IG047', NULL, 'Canned Goods', 'بضائع معلبة', 47),
        (1, 'IG048', NULL, 'School Supplies', 'أدوات مدرسية', 48),

        -- =====================
        -- Coffee (sub groups)
        -- =====================
        (2, '100', 'IG001', 'Harari Coffee', 'قهوة هرري', 100),
        (2, '101', 'IG001', 'Luqmati Coffee', 'قهوة لقمتي', 101),
        (2, '102', 'IG001', 'Ethiopian Coffee', 'قهوة اثيوبي', 102),
        (2, '103', 'IG001', 'Yemeni Coffee', 'قهوة يمنية', 103),
        (2, '104', 'IG001', 'Colombian Coffee', 'قهوة كولمبي', 104),
        (2, '105', 'IG001', 'Brazilian Coffee', 'قهوة برازيلي', 105),
        (2, '106', 'IG001', 'Indian Coffee', 'قهوة هندية', 106),
        (2, '107', 'IG001', 'Turkish Coffee', 'قهوة تركية', 107),
        (2, '108', 'IG001', 'Indonesian Coffee', 'قهوة اندونيسي', 108),
        (2, '109', 'IG001', 'Chinese Coffee', 'قهوة صيني', 109),
        (2, '110', 'IG001', 'Canned Coffee', 'قهوة معلبة', 110),
        (2, '111', 'IG001', 'Coffee Blends', 'خلطات قهوة', 111),

        -- =====================
        -- Saffron
        -- =====================
        (2, '112', 'IG002', 'Saffron Super Nageel', 'زعفران سوبر نقيل', 112),
        (2, '113', 'IG002', 'Saffron Nageel', 'زعفران نقيل', 113),
        (2, '114', 'IG002', 'Saffron Abu Shaibah', 'زعفران أبو شيبة', 114),
        (2, '115', 'IG002', 'Saffron Abu Shal', 'زعفران ابوشال', 115),
        (2, '116', 'IG002', 'Saffron Packs', 'زعفران عبوات', 116),
        (2, '117', 'IG002', 'Saffron Colors', 'ألوان الزعفران', 117),

        -- =====================
        -- Tea
        -- =====================
        (2, '118', 'IG003', 'Tea (Loose)', 'شاي فرط', 118),
        (2, '119', 'IG003', 'Tea (Packs)', 'شاي عبوات', 119),
        (2, '120', 'IG003', 'Green Tea', 'شاي اخضر', 120),
        (2, '121', 'IG003', 'Herbal Tea', 'شاي اعشاب', 121),

        -- =====================
        -- Cardamom
        -- =====================
        (2, '122', 'IG004', 'American Cardamom #1', 'هيل امريكي رقم 1', 122),
        (2, '123', 'IG004', 'American Cardamom #2', 'هيل امريكي رقم 2', 123),
        (2, '124', 'IG004', 'American Cardamom #3', 'هيل امريكي رقم 3', 124),
        (2, '125', 'IG004', 'American Cardamom Junior', 'هيل مريكي جونيور', 125),
        (2, '126', 'IG004', 'American Cardamom Light', 'هيل امريكي مفتح', 126),
        (2, '127', 'IG004', 'American Cardamom Seeds', 'هيل امريكي بذور', 127),
        (2, '128', 'IG004', 'Indian Cardamom 8mm', 'هيل هندي  8 ملم', 128),
        (2, '129', 'IG004', 'Indian Cardamom 7.5mm', 'هيل هندي 7.5 ملم', 129),
        (2, '130', 'IG004', 'Indian Cardamom 7mm', 'هيل هندي 7 ملم', 130),
        (2, '131', 'IG004', 'Indian Cardamom 6.5mm', 'هيل هندي 6.5 ملم', 131),
        (2, '132', 'IG004', 'Indian Cardamom 6mm', 'هيل هندي 6 ملم', 132),
        (2, '133', 'IG004', 'Cardamom Husks', 'قشور الهيل', 133),
        (2, '134', 'IG004', 'Ground Cardamom', 'هيل مطحون', 134),
        (2, '135', 'IG004', 'Cardamom Packs', 'هيل عبوات', 135),

        -- =====================
        -- Nuts
        -- =====================
        (2, '136', 'IG005', 'Raw Nuts', 'مكسرات ني', 136),
        (2, '137', 'IG005', 'Vietnamese Cashew', 'كاجو فيتنامي', 137),
        (2, '138', 'IG005', 'Indian Cashew', 'كاجو هندي', 138),
        (2, '139', 'IG005', 'Pistachio', 'فستق', 139),
        (2, '140', 'IG005', 'American Almond', 'لوز امريكي', 140),
        (2, '141', 'IG005', 'Processed Almond', 'لوز مصنع', 141),
        (3, '141-01', '141', 'Walnut', 'جوز', 1411),
        (3, '141-02', '141', 'Pumpkin Seeds', 'حب القرع', 1412),
        (3, '141-03', '141', 'Sunflower Seeds', 'حب شمسي', 1413),
        (3, '141-04', '141', 'Egyptian Seeds', 'حب مصري', 1414),
        (3, '141-05', '141', 'Afghan Almond', 'لوز أفغاني', 1415),
        (2, '142', 'IG005', 'Yemeni Almond', 'لوز يمني', 142),
        (2, '143', 'IG005', 'Roasted Nuts', 'مكسرات محمصة', 143),
        (2, '144', 'IG005', 'Salted Nuts', 'مكسرات مالحة', 144),
        (2, '145', 'IG005', 'Lemon Nuts', 'مكسرات ليمون', 145),
        (2, '146', 'IG005', 'Smoked Nuts', 'مكسرات مدخنة', 146),
        (2, '147', 'IG005', 'Cheese Nuts', 'مكسرات بالجبن', 147),
        (2, '148', 'IG005', 'Mixed Nuts', 'مكسرات مشكلة', 148),
        (2, '149', 'IG005', 'Turkish Nuts', 'مكسرات تركية', 149),
        (2, '150', 'IG005', 'Japanese Nuts', 'مكسرات يابانية', 150),
        (2, '151', 'IG005', 'Thai Nuts', 'مكسرات تايلاندية', 151),
        (2, '152', 'IG005', 'Chinese Nuts', 'مكسرات صينية', 152),
        (2, '153', 'IG005', 'Crunchy Snacks', 'مقرمشات', 153),
        (2, '154', 'IG005', 'Mexican Nuts', 'مكسرات مكسيكية', 154),
        (2, '155', 'IG005', 'Indian Nuts', 'مكسرات هندية', 155),
        (2, '156', 'IG005', 'Nuts in Shell', 'مكسرات بالقشر', 156),
        (2, '157', 'IG005', 'Raisins', 'زبيب', 157),
        (2, '158', 'IG005', 'Seed Nuts', 'مكسرات بذور', 158),
        (2, '159', 'IG005', 'Nuts (Packs)', 'مكسرات عبوات', 159),

        -- =====================
        -- Spices
        -- =====================
        (2, '160', 'IG006', 'Whole Spices', 'بهارات حب', 160),
        (2, '161', 'IG006', 'Ground Spices', 'بهارات مطحونة', 161),
        (2, '162', 'IG006', 'Spice Boxes', 'بهارات علب', 162),
        (2, '163', 'IG006', 'Mixed Spices', 'بهارات مشكلة', 163),

        -- =====================
        -- Aromatics
        -- =====================
        (2, '164', 'IG007', 'Other', 'أخرى', 164),
        (2, '165', 'IG007', 'Other', 'أخرى', 165),
        (2, '166', 'IG007', 'Other', 'أخرى', 166),
        (2, '167', 'IG007', 'Packaged Aromatics', 'عطارة معلبة', 167),

        -- =====================
        -- Herbs
        -- =====================
        (2, '168', 'IG008', 'Herbs (Bulk)', 'اعشاب بالكيلو', 168),
        (2, '169', 'IG008', 'Leafy', 'ورقيات', 169),
        (2, '170', 'IG008', 'Sticks', 'اعواد', 170),
        (2, '171', 'IG008', 'Seeds', 'بذور', 171),
        (2, '172', 'IG008', 'Packaged Herbs', 'اعشاب معلبة', 172),

        -- =====================
        -- Grains
        -- =====================
        (2, '173', 'IG009', 'Legumes', 'بقوليات', 173),
        (2, '174', 'IG009', 'Barley', 'شعير', 174),
        (2, '175', 'IG009', 'Canned Legumes', 'بقوليات معلبة', 175),
        (2, '176', 'IG009', 'Mixed Grains', 'حبوب منوعة', 176),

        -- =====================
        -- Cosmetics
        -- =====================
        (2, '177', 'IG010', 'Shampoo', 'شامبو', 177),
        (2, '178', 'IG010', 'Soap', 'صابون', 178),
        (2, '179', 'IG010', 'Skin Cream', 'كريم بشرة', 179),
        (2, '180', 'IG010', 'Lotion', 'لوشن', 180),
        (2, '181', 'IG010', 'Moisturizing', 'ترطيب', 181),
        (2, '182', 'IG010', 'Gel', 'جل', 182),
        (2, '183', 'IG010', 'Hair Cream', 'كريم شعر', 183),
        (2, '184', 'IG010', 'Men Care', 'العناية بالرجل', 184),
        (2, '185', 'IG010', 'Women Care', 'العناية بالمرأة', 185),
        (2, '186', 'IG010', 'Children Care', 'العناية بالأطفال', 186),
        (2, '187', 'IG010', 'Elderly Care', 'العناية بكبار السن', 187),
        (2, '188', 'IG010', 'Oral Care', 'العناية بالفم', 188),
        (2, '189', 'IG010', 'Deodorants', 'مزيلات العرق', 189),
        (2, '190', 'IG010', 'Shaving Tools', 'أدوات الحلاقة', 190),
        (2, '191', 'IG010', 'Bath Products', 'منتجات الاستحمام', 191),
        (3, '191-01', '191', 'Hair Dyes & Colors', 'صبغات والوان للشعر', 1911),

        -- =====================
        -- Soap (separate main)
        -- =====================
        (2, '192', 'IG012', 'Other', 'أخرى', 192),
        (2, '193', 'IG012', 'Other', 'أخرى', 193),
        (2, '194', 'IG012', 'Other', 'أخرى', 194),

        -- Accessories
        (2, '195', 'IG013', 'Other', 'أخرى', 195),
        (2, '196', 'IG013', 'Other', 'أخرى', 196),
        (2, '197', 'IG013', 'Other', 'أخرى', 197),

        -- Cleaning supplies
        (2, '198', 'IG014', 'Bags', 'أكياس', 198),
        (2, '199', 'IG014', 'Brooms', 'مكانس', 199),
        (2, '200', 'IG014', 'Tissues', 'مناديل', 200),

        -- Incense
        (2, '201', 'IG015', 'Other', 'أخرى', 201),
        (2, '202', 'IG015', 'Other', 'أخرى', 202),
        (2, '203', 'IG015', 'Other', 'أخرى', 203),

        -- Perfumes
        (2, '204', 'IG016', 'Other', 'أخرى', 204),
        (2, '205', 'IG016', 'Other', 'أخرى', 205),
        (2, '206', 'IG016', 'Other', 'أخرى', 206),

        -- Oils
        (2, '207', 'IG017', 'Cooking Oil', 'زيت طبخ', 207),
        (2, '208', 'IG017', 'Other', 'أخرى', 208),
        (2, '209', 'IG017', 'Medical Oils', 'زيوت طبية', 209),
        (2, '210', 'IG017', 'Olive Oil', 'زيت زيتون', 210),
        (2, '211', 'IG017', 'Skin & Hair Oils', 'زيوت للبشرة والشعر', 211),

        -- Cheese
        (2, '212', 'IG018', 'Other', 'أخرى', 212),
        (2, '213', 'IG018', 'Other', 'أخرى', 213),
        (2, '214', 'IG018', 'Other', 'أخرى', 214),
        (2, '215', 'IG018', 'Other', 'أخرى', 215),

        -- Foodstuffs
        (2, '216', 'IG019', 'Other', 'أخرى', 216),
        (2, '217', 'IG019', 'Other', 'أخرى', 217),
        (2, '218', 'IG019', 'Other', 'أخرى', 218),

        -- Sugar
        (2, '219', 'IG020', 'Other', 'أخرى', 219),
        (2, '220', 'IG020', 'Other', 'أخرى', 220),
        (2, '221', 'IG020', 'Other', 'أخرى', 221),

        -- Flour
        (2, '222', 'IG021', 'Other', 'أخرى', 222),
        (2, '223', 'IG021', 'Other', 'أخرى', 223),
        (2, '224', 'IG021', 'Other', 'أخرى', 224),
        (2, '225', 'IG021', 'Other', 'أخرى', 225),

        -- Sweets
        (2, '226', 'IG022', 'Jelly', 'جيلي', 226),
        (2, '227', 'IG022', 'Candy', 'سكاكر', 227),
        (2, '228', 'IG022', 'Other', 'أخرى', 228),
        (2, '229', 'IG022', 'Other', 'أخرى', 229),
        (2, '230', 'IG022', 'Other', 'أخرى', 230),

        -- Chocolate
        (2, '231', 'IG023', 'Turkish Chocolate', 'شوكلاتة تركية', 231),
        (2, '232', 'IG023', 'Belgian Chocolate', 'شوكلاتة بلجيكي', 232),
        (2, '233', 'IG023', 'Local Chocolate', 'شوكلاتة محلية', 233),
        (2, '234', 'IG023', 'Assorted Chocolate', 'شوكلاتة منوعة', 234),
        (2, '235', 'IG023', 'Chocolate Packs & Boxes', 'شوكلاتة باكت وعلب', 235),

        -- Fruit Halawa
        (2, '236', 'IG024', 'Other', 'أخرى', 236),
        (2, '237', 'IG024', 'Other', 'أخرى', 237),
        (2, '238', 'IG024', 'Other', 'أخرى', 238),
        (2, '239', 'IG024', 'Other', 'أخرى', 239),

        -- Snacks
        (2, '240', 'IG025', 'Other', 'أخرى', 240),
        (2, '241', 'IG025', 'Other', 'أخرى', 241),
        (2, '242', 'IG025', 'Other', 'أخرى', 242),

        -- Maamoul
        (2, '243', 'IG026', 'Other', 'أخرى', 243),
        (2, '244', 'IG026', 'Other', 'أخرى', 244),

        -- Bulk sweets
        (2, '245', 'IG027', 'Other', 'أخرى', 245),
        (2, '246', 'IG027', 'Other', 'أخرى', 246),

        -- Bakery
        (2, '247', 'IG028', 'Other', 'أخرى', 247),
        (2, '248', 'IG028', 'Other', 'أخرى', 248),
        (2, '249', 'IG028', 'Other', 'أخرى', 249),

        -- Foodstuffs (2)
        (2, '250', 'IG029', 'Other', 'أخرى', 250),
        (2, '251', 'IG029', 'Other', 'أخرى', 251),
        (2, '252', 'IG029', 'Other', 'أخرى', 252),

        -- Rice
        (2, '253', 'IG030', 'Other', 'أخرى', 253),
        (2, '254', 'IG030', 'Other', 'أخرى', 254),
        (2, '255', 'IG030', 'Other', 'أخرى', 255),

        -- Fish
        (2, '256', 'IG031', 'Other', 'أخرى', 256),
        (2, '257', 'IG031', 'Other', 'أخرى', 257),
        (2, '258', 'IG031', 'Other', 'أخرى', 258),

        -- Meat
        (2, '259', 'IG032', 'Other', 'أخرى', 259),
        (2, '260', 'IG032', 'Other', 'أخرى', 260),
        (2, '261', 'IG032', 'Other', 'أخرى', 261),

        -- Leafy greens
        (2, '262', 'IG033', 'Other', 'أخرى', 262),
        (2, '263', 'IG033', 'Other', 'أخرى', 263),
        (2, '264', 'IG033', 'Other', 'أخرى', 264),
        (2, '265', 'IG033', 'Other', 'أخرى', 265),

        -- Fruits
        (2, '266', 'IG034', 'Other', 'أخرى', 266),
        (2, '267', 'IG034', 'Other', 'أخرى', 267),
        (2, '268', 'IG034', 'Other', 'أخرى', 268),

        -- Vegetables
        (2, '269', 'IG035', 'Other', 'أخرى', 269),
        (2, '270', 'IG035', 'Other', 'أخرى', 270),
        (2, '271', 'IG035', 'Other', 'أخرى', 271),

        -- Beverages
        (2, '272', 'IG036', 'Soft Drinks', 'مشروبات غازية', 272),
        (2, '273', 'IG036', 'Juices', 'عصائر', 273),

        -- Water
        (2, '274', 'IG037', 'Other', 'أخرى', 274),
        (2, '275', 'IG037', 'Other', 'أخرى', 275),

        -- Ice
        (2, '276', 'IG038', 'Other', 'أخرى', 276),
        (2, '277', 'IG038', 'Other', 'أخرى', 277),
        (2, '278', 'IG038', 'Other', 'أخرى', 278),

        -- Household
        (2, '279', 'IG039', 'Other', 'أخرى', 279),
        (2, '280', 'IG039', 'Other', 'أخرى', 280),
        (2, '281', 'IG039', 'Other', 'أخرى', 281),

        -- Gifts
        (2, '282', 'IG040', 'Other', 'أخرى', 282),
        (2, '283', 'IG040', 'Other', 'أخرى', 283),

        -- Dates
        (2, '284', 'IG041', 'Other', 'أخرى', 284),
        (2, '285', 'IG041', 'Other', 'أخرى', 285),
        (2, '286', 'IG041', 'Other', 'أخرى', 286),

        -- Medical supplies
        (2, '287', 'IG042', 'Other', 'أخرى', 287),

        -- Paper products
        (2, '288', 'IG043', 'Other', 'أخرى', 288),

        -- Cooking tools
        (2, '289', 'IG044', 'Other', 'أخرى', 289),

        -- Pest control
        (2, '290', 'IG045', 'Other', 'أخرى', 290),

        -- Pet products
        (2, '291', 'IG046', 'Other', 'أخرى', 291),

        -- Canned goods
        (2, '292', 'IG047', 'Other', 'أخرى', 292),

        -- School supplies
        (2, '293', 'IG048', 'Bags', 'حقائب', 293),
        (2, '294', 'IG048', 'Pens', 'أقلام', 294),
        (2, '295', 'IG048', 'Notebooks', 'دفاتر', 295),
        (2, '296', 'IG048', 'Books', 'كتب', 296),
        (2, '297', 'IG048', 'Devices', 'أجهزة', 297),
        (2, '298', 'IG048', 'Drawing Tools', 'أدوات رسم', 298),
        (2, '299', 'IG048', 'Other', 'أخرى', 299);

  FOR c IN SELECT id FROM companies LOOP
    -- 1) Insert/Update main groups
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
      NULL,
      'main',
      s.sort_order,
      TRUE
    FROM tmp_item_groups_seed s
    WHERE s.level = 1
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

    -- 2) Insert/Update sub groups (level 2)
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

    -- 3) Insert/Update deeper sub groups (level 3)
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
