-- ============================================================================
-- 425: بيانات مرجعية شاملة - المناطق والمدن العالمية
-- Comprehensive Reference Data - Regions & Cities for Key Countries
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. REGIONS - المناطق والمحافظات (دول رئيسية)                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- UAE - الإمارات العربية المتحدة (7 Emirates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'emirate', v.sort_order
FROM (VALUES
  ('ARE-AD', 'Abu Dhabi',         'أبوظبي',         1),
  ('ARE-DU', 'Dubai',             'دبي',             2),
  ('ARE-SH', 'Sharjah',           'الشارقة',         3),
  ('ARE-AJ', 'Ajman',             'عجمان',           4),
  ('ARE-UQ', 'Umm Al Quwain',    'أم القيوين',      5),
  ('ARE-RK', 'Ras Al Khaimah',   'رأس الخيمة',      6),
  ('ARE-FU', 'Fujairah',          'الفجيرة',         7)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'ARE'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Kuwait - الكويت (6 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('KWT-KU', 'Al Asimah (Capital)', 'العاصمة',        1),
  ('KWT-HW', 'Hawalli',              'حولي',           2),
  ('KWT-FA', 'Al Farwaniyah',        'الفروانية',      3),
  ('KWT-MU', 'Mubarak Al-Kabeer',    'مبارك الكبير',   4),
  ('KWT-AH', 'Al Ahmadi',            'الأحمدي',        5),
  ('KWT-JA', 'Al Jahra',             'الجهراء',        6)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'KWT'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Bahrain - البحرين (4 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('BHR-MN', 'Capital Governorate',     'محافظة العاصمة',     1),
  ('BHR-MH', 'Muharraq',                'المحرق',            2),
  ('BHR-NO', 'Northern Governorate',     'المحافظة الشمالية', 3),
  ('BHR-SO', 'Southern Governorate',     'المحافظة الجنوبية', 4)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'BHR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Oman - عُمان (11 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('OMN-MS', 'Muscat',              'مسقط',              1),
  ('OMN-ZF', 'Dhofar',              'ظفار',               2),
  ('OMN-MN', 'Musandam',            'مسندم',             3),
  ('OMN-BU', 'Al Buraimi',          'البريمي',            4),
  ('OMN-DA', 'Ad Dakhiliyah',       'الداخلية',           5),
  ('OMN-SN', 'North Al Sharqiyah',  'شمال الشرقية',      6),
  ('OMN-SS', 'South Al Sharqiyah',  'جنوب الشرقية',      7),
  ('OMN-BN', 'North Al Batinah',    'شمال الباطنة',      8),
  ('OMN-BS', 'South Al Batinah',    'جنوب الباطنة',      9),
  ('OMN-ZA', 'Az Zahirah',          'الظاهرة',            10),
  ('OMN-WS', 'Al Wusta',            'الوسطى',            11)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'OMN'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Qatar - قطر (8 Municipalities)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'municipality', v.sort_order
FROM (VALUES
  ('QAT-DH', 'Doha',               'الدوحة',            1),
  ('QAT-WK', 'Al Wakrah',          'الوكرة',            2),
  ('QAT-KH', 'Al Khor',            'الخور',             3),
  ('QAT-RY', 'Al Rayyan',          'الريان',            4),
  ('QAT-DA', 'Al Daayen',          'الضعاين',           5),
  ('QAT-SH', 'Ash Shamal',         'الشمال',            6),
  ('QAT-ZB', 'Az Zubarah',         'الزبارة',           7),
  ('QAT-MS', 'Umm Salal',          'أم صلال',           8)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'QAT'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Yemen - اليمن (22 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('YEM-SN', 'Sana''a',            'صنعاء',            1),
  ('YEM-AD', 'Aden',               'عدن',              2),
  ('YEM-TA', 'Taiz',               'تعز',              3),
  ('YEM-HD', 'Al Hudaydah',        'الحديدة',          4),
  ('YEM-IB', 'Ibb',                'إب',               5),
  ('YEM-DH', 'Dhamar',             'ذمار',             6),
  ('YEM-HJ', 'Hajjah',             'حجة',              7),
  ('YEM-SA', 'Sa''dah',            'صعدة',            8),
  ('YEM-AM', 'Amran',              'عمران',            9),
  ('YEM-MR', 'Marib',              'مأرب',             10),
  ('YEM-AB', 'Abyan',              'أبين',             11),
  ('YEM-LA', 'Lahij',              'لحج',              12),
  ('YEM-SH', 'Shabwah',            'شبوة',             13),
  ('YEM-HR', 'Hadramaut',          'حضرموت',           14),
  ('YEM-MH', 'Al Mahrah',          'المهرة',           15),
  ('YEM-SO', 'Socotra',            'سقطرى',            16),
  ('YEM-BH', 'Al Bayda',           'البيضاء',          17),
  ('YEM-MA', 'Al Mahwit',          'المحويت',          18),
  ('YEM-JW', 'Al Jawf',            'الجوف',            19),
  ('YEM-DL', 'Ad Dali',            'الضالع',           20),
  ('YEM-RA', 'Raymah',             'ريمة',             21),
  ('YEM-AA', 'Amanat Al Asimah',   'أمانة العاصمة',    22)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'YEM'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Egypt - مصر (27 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('EGY-CA', 'Cairo',              'القاهرة',          1),
  ('EGY-GZ', 'Giza',               'الجيزة',           2),
  ('EGY-AL', 'Alexandria',         'الإسكندرية',       3),
  ('EGY-QH', 'Qalyubia',          'القليوبية',        4),
  ('EGY-MN', 'Monufia',           'المنوفية',         5),
  ('EGY-GR', 'Gharbia',           'الغربية',          6),
  ('EGY-SH', 'Sharqia',           'الشرقية',          7),
  ('EGY-DK', 'Dakahlia',          'الدقهلية',         8),
  ('EGY-DM', 'Damietta',          'دمياط',            9),
  ('EGY-KS', 'Kafr El Sheikh',    'كفر الشيخ',        10),
  ('EGY-BH', 'Beheira',           'البحيرة',          11),
  ('EGY-IS', 'Ismailia',          'الإسماعيلية',      12),
  ('EGY-SW', 'Suez',              'السويس',           13),
  ('EGY-PS', 'Port Said',         'بورسعيد',          14),
  ('EGY-FY', 'Faiyum',            'الفيوم',           15),
  ('EGY-BM', 'Beni Suef',         'بني سويف',         16),
  ('EGY-MI', 'Minya',             'المنيا',           17),
  ('EGY-AS', 'Assiut',            'أسيوط',            18),
  ('EGY-SG', 'Sohag',             'سوهاج',            19),
  ('EGY-QN', 'Qena',              'قنا',              20),
  ('EGY-LX', 'Luxor',             'الأقصر',           21),
  ('EGY-AW', 'Aswan',             'أسوان',            22),
  ('EGY-RB', 'Red Sea',           'البحر الأحمر',     23),
  ('EGY-NV', 'New Valley',        'الوادي الجديد',    24),
  ('EGY-MT', 'Matrouh',           'مطروح',            25),
  ('EGY-SN', 'South Sinai',       'جنوب سيناء',       26),
  ('EGY-NS', 'North Sinai',       'شمال سيناء',       27)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'EGY'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Jordan - الأردن (12 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('JOR-AM', 'Amman',              'عمان',             1),
  ('JOR-IR', 'Irbid',              'إربد',             2),
  ('JOR-ZR', 'Zarqa',              'الزرقاء',          3),
  ('JOR-BL', 'Balqa',              'البلقاء',          4),
  ('JOR-MA', 'Mafraq',             'المفرق',           5),
  ('JOR-KA', 'Karak',              'الكرك',            6),
  ('JOR-TF', 'Tafilah',            'الطفيلة',          7),
  ('JOR-MN', 'Ma''an',             'معان',             8),
  ('JOR-JR', 'Jerash',             'جرش',              9),
  ('JOR-AJ', 'Ajloun',             'عجلون',            10),
  ('JOR-AQ', 'Aqaba',              'العقبة',           11),
  ('JOR-MD', 'Madaba',             'مادبا',            12)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'JOR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Iraq - العراق (18 Governorates)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('IRQ-BG', 'Baghdad',            'بغداد',            1),
  ('IRQ-BS', 'Basra',              'البصرة',           2),
  ('IRQ-NI', 'Nineveh',            'نينوى',            3),
  ('IRQ-AR', 'Erbil',              'أربيل',            4),
  ('IRQ-SU', 'Sulaymaniyah',       'السليمانية',       5),
  ('IRQ-DH', 'Duhok',              'دهوك',             6),
  ('IRQ-KI', 'Kirkuk',             'كركوك',            7),
  ('IRQ-DI', 'Diyala',             'ديالى',            8),
  ('IRQ-AN', 'Al Anbar',           'الأنبار',          9),
  ('IRQ-BB', 'Babil',              'بابل',             10),
  ('IRQ-KR', 'Karbala',            'كربلاء',           11),
  ('IRQ-NJ', 'Najaf',              'النجف',            12),
  ('IRQ-QD', 'Al Qadisiyyah',      'القادسية',         13),
  ('IRQ-WS', 'Wasit',              'واسط',             14),
  ('IRQ-MY', 'Maysan',             'ميسان',            15),
  ('IRQ-DQ', 'Dhi Qar',            'ذي قار',           16),
  ('IRQ-MU', 'Al Muthanna',        'المثنى',           17),
  ('IRQ-SD', 'Saladin',            'صلاح الدين',       18)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'IRQ'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Turkey - تركيا (81 Provinces - Major ones)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'province', v.sort_order
FROM (VALUES
  ('TUR-34', 'Istanbul',           'إسطنبول',          1),
  ('TUR-06', 'Ankara',             'أنقرة',            2),
  ('TUR-35', 'Izmir',              'إزمير',            3),
  ('TUR-16', 'Bursa',              'بورصة',            4),
  ('TUR-01', 'Adana',              'أضنة',             5),
  ('TUR-07', 'Antalya',            'أنطاليا',          6),
  ('TUR-42', 'Konya',              'قونية',            7),
  ('TUR-27', 'Gaziantep',          'غازي عنتاب',       8),
  ('TUR-33', 'Mersin',             'مرسين',            9),
  ('TUR-21', 'Diyarbakir',         'ديار بكر',         10),
  ('TUR-31', 'Hatay',              'هاتاي',            11),
  ('TUR-41', 'Kocaeli',            'كوجالي',           12),
  ('TUR-54', 'Sakarya',            'سكاريا',           13),
  ('TUR-55', 'Samsun',             'سامسون',           14),
  ('TUR-61', 'Trabzon',            'طرابزون',          15)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'TUR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- India - الهند (Major States)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'state', v.sort_order
FROM (VALUES
  ('IND-MH', 'Maharashtra',       'مهاراشترا',        1),
  ('IND-DL', 'Delhi',             'دلهي',             2),
  ('IND-KA', 'Karnataka',         'كارناتاكا',        3),
  ('IND-TN', 'Tamil Nadu',        'تاميل نادو',       4),
  ('IND-UP', 'Uttar Pradesh',     'أوتار براديش',     5),
  ('IND-GJ', 'Gujarat',           'غوجارات',          6),
  ('IND-WB', 'West Bengal',       'البنغال الغربية',   7),
  ('IND-RJ', 'Rajasthan',         'راجستان',          8),
  ('IND-KL', 'Kerala',            'كيرالا',           9),
  ('IND-AP', 'Andhra Pradesh',    'أندرا براديش',     10),
  ('IND-TS', 'Telangana',         'تيلانغانا',        11),
  ('IND-PB', 'Punjab',            'البنجاب',          12)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'IND'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- China - الصين (Major Provinces/Municipalities)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, v.region_type, v.sort_order
FROM (VALUES
  ('CHN-BJ', 'Beijing',            'بكين',             'municipality', 1),
  ('CHN-SH', 'Shanghai',           'شنغهاي',           'municipality', 2),
  ('CHN-GD', 'Guangdong',          'قوانغدونغ',        'province',     3),
  ('CHN-ZJ', 'Zhejiang',           'تشجيانغ',          'province',     4),
  ('CHN-JS', 'Jiangsu',            'جيانغسو',          'province',     5),
  ('CHN-SD', 'Shandong',           'شاندونغ',          'province',     6),
  ('CHN-FJ', 'Fujian',             'فوجيان',            'province',     7),
  ('CHN-HN', 'Hunan',              'هونان',            'province',     8),
  ('CHN-HB', 'Hubei',              'هوبي',             'province',     9),
  ('CHN-SC', 'Sichuan',            'سيتشوان',          'province',     10),
  ('CHN-TJ', 'Tianjin',            'تيانجين',          'municipality', 11),
  ('CHN-CQ', 'Chongqing',          'تشونغتشينغ',       'municipality', 12)
) AS v(code, name_en, name_ar, region_type, sort_order)
CROSS JOIN countries c WHERE c.code = 'CHN'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- USA - الولايات المتحدة (50 States)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'state', v.sort_order
FROM (VALUES
  ('USA-CA', 'California',        'كاليفورنيا',       1),
  ('USA-TX', 'Texas',             'تكساس',            2),
  ('USA-FL', 'Florida',           'فلوريدا',          3),
  ('USA-NY', 'New York',          'نيويورك',          4),
  ('USA-PA', 'Pennsylvania',      'بنسلفانيا',        5),
  ('USA-IL', 'Illinois',          'إلينوي',           6),
  ('USA-OH', 'Ohio',              'أوهايو',           7),
  ('USA-GA', 'Georgia',           'جورجيا',           8),
  ('USA-NC', 'North Carolina',    'كارولينا الشمالية', 9),
  ('USA-MI', 'Michigan',          'ميشيغان',          10),
  ('USA-NJ', 'New Jersey',        'نيوجيرسي',         11),
  ('USA-VA', 'Virginia',          'فرجينيا',          12),
  ('USA-WA', 'Washington',        'واشنطن',           13),
  ('USA-AZ', 'Arizona',           'أريزونا',          14),
  ('USA-MA', 'Massachusetts',     'ماساتشوستس',       15),
  ('USA-TN', 'Tennessee',         'تينيسي',           16),
  ('USA-IN', 'Indiana',           'إنديانا',          17),
  ('USA-MD', 'Maryland',          'ميريلاند',         18),
  ('USA-MO', 'Missouri',          'ميزوري',           19),
  ('USA-CO', 'Colorado',          'كولورادو',         20),
  ('USA-DC', 'Washington D.C.',   'واشنطن العاصمة',   21)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'USA'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- UK - المملكة المتحدة
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'constituent_country', v.sort_order
FROM (VALUES
  ('GBR-EN', 'England',           'إنجلترا',          1),
  ('GBR-SC', 'Scotland',          'اسكتلندا',         2),
  ('GBR-WA', 'Wales',             'ويلز',             3),
  ('GBR-NI', 'Northern Ireland',  'أيرلندا الشمالية', 4)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'GBR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- Germany - ألمانيا (16 Federal States)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'federal_state', v.sort_order
FROM (VALUES
  ('DEU-NW', 'North Rhine-Westphalia', 'شمال الراين وستفاليا',  1),
  ('DEU-BY', 'Bavaria',                 'بافاريا',              2),
  ('DEU-BW', 'Baden-Württemberg',       'بادن فورتمبرغ',        3),
  ('DEU-NI', 'Lower Saxony',           'ساكسونيا السفلى',       4),
  ('DEU-HE', 'Hesse',                  'هيسن',                  5),
  ('DEU-BE', 'Berlin',                 'برلين',                 6),
  ('DEU-HH', 'Hamburg',                'هامبورغ',               7),
  ('DEU-SN', 'Saxony',                 'ساكسونيا',             8)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'DEU'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);

-- France - فرنسا (Regions)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'region', v.sort_order
FROM (VALUES
  ('FRA-IDF', 'Île-de-France',          'إيل دو فرانس',          1),
  ('FRA-ARA', 'Auvergne-Rhône-Alpes',   'أوفيرن رون ألب',         2),
  ('FRA-NAQ', 'Nouvelle-Aquitaine',      'نوفيل أكيتان',          3),
  ('FRA-OCC', 'Occitanie',              'أوكسيتانيا',            4),
  ('FRA-HDF', 'Hauts-de-France',        'أوت دو فرانس',          5),
  ('FRA-PAC', 'Provence-Alpes-Côte d''Azur', 'بروفانس ألب كوت دازور', 6),
  ('FRA-GES', 'Grand Est',              'غران إيست',             7),
  ('FRA-BRE', 'Bretagne',               'بريتاني',               8)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c WHERE c.code = 'FRA'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.deleted_at IS NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. CITIES - المدن الرئيسية (تكميل وتحسين)                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Saudi Arabia - مدن سعودية إضافية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Riyadh', v.is_port, true
FROM (VALUES
  ('SA-RUH', 'Riyadh',           'الرياض',           'Riyadh',           false),
  ('SA-JED', 'Jeddah',           'جدة',              'Makkah',           true),
  ('SA-MKH', 'Makkah',           'مكة المكرمة',      'Makkah',           false),
  ('SA-MDN', 'Madinah',          'المدينة المنورة',  'Madinah',          false),
  ('SA-DMM', 'Dammam',           'الدمام',           'Eastern Province',  true),
  ('SA-KHB', 'Khobar',           'الخبر',            'Eastern Province',  false),
  ('SA-DHH', 'Dhahran',          'الظهران',          'Eastern Province',  false),
  ('SA-JBL', 'Jubail',           'الجبيل',           'Eastern Province',  true),
  ('SA-YNB', 'Yanbu',            'ينبع',             'Madinah',          true),
  ('SA-TAF', 'Taif',             'الطائف',           'Makkah',           false),
  ('SA-TBK', 'Tabuk',            'تبوك',             'Tabuk',            false),
  ('SA-ABH', 'Abha',             'أبها',             'Asir',             false),
  ('SA-KMS', 'Khamis Mushait',   'خميس مشيط',        'Asir',             false),
  ('SA-JZN', 'Jazan',            'جازان',            'Jazan',            true),
  ('SA-NJR', 'Najran',           'نجران',            'Najran',           false),
  ('SA-HAL', 'Ha''il',           'حائل',             'Ha''il',           false),
  ('SA-BRD', 'Buraidah',         'بريدة',            'Qassim',           false),
  ('SA-UNZ', 'Unayzah',          'عنيزة',            'Qassim',           false),
  ('SA-SKK', 'Sakaka',           'سكاكا',            'Al Jawf',          false),
  ('SA-ARA', 'Arar',             'عرعر',             'Northern Borders', false),
  ('SA-BAH', 'Al Bahah',         'الباحة',           'Al Baha',          false),
  ('SA-RKT', 'Ras Tanura',       'رأس تنورة',        'Eastern Province',  true),
  ('SA-KFJ', 'Al Kharj',         'الخرج',            'Riyadh',           false),
  ('SA-HOF', 'Al Hofuf',         'الهفوف',           'Eastern Province',  false)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'SAU'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- UAE - مدن إماراتية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Dubai', v.is_port, true
FROM (VALUES
  ('AE-AUH', 'Abu Dhabi',        'أبوظبي',           'Abu Dhabi',        true),
  ('AE-DXB', 'Dubai',            'دبي',              'Dubai',            true),
  ('AE-SHJ', 'Sharjah',          'الشارقة',          'Sharjah',          true),
  ('AE-AJM', 'Ajman',            'عجمان',            'Ajman',            true),
  ('AE-RAK', 'Ras Al Khaimah',   'رأس الخيمة',       'Ras Al Khaimah',   true),
  ('AE-FUJ', 'Fujairah',         'الفجيرة',          'Fujairah',         true),
  ('AE-UAQ', 'Umm Al Quwain',    'أم القيوين',       'Umm Al Quwain',    false),
  ('AE-AIN', 'Al Ain',           'العين',            'Abu Dhabi',        false),
  ('AE-RUW', 'Ruwais',           'الرويس',           'Abu Dhabi',        true),
  ('AE-JBA', 'Jebel Ali',        'جبل علي',          'Dubai',            true)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'ARE'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- Kuwait - مدن كويتية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Kuwait', v.is_port, true
FROM (VALUES
  ('KW-KUW', 'Kuwait City',      'مدينة الكويت',     'Al Asimah',       true),
  ('KW-HWL', 'Hawalli',          'حولي',             'Hawalli',          false),
  ('KW-SLM', 'Salmiya',          'السالمية',         'Hawalli',          false),
  ('KW-AHM', 'Ahmadi',           'الأحمدي',          'Al Ahmadi',        true),
  ('KW-FRW', 'Farwaniya',        'الفروانية',        'Al Farwaniyah',    false),
  ('KW-JHR', 'Jahra',            'الجهراء',          'Al Jahra',         false)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'KWT'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- Bahrain - مدن بحرينية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Bahrain', v.is_port, true
FROM (VALUES
  ('BH-MAN', 'Manama',           'المنامة',          'Capital',          true),
  ('BH-MUH', 'Muharraq',         'المحرق',           'Muharraq',         true),
  ('BH-RIF', 'Riffa',            'الرفاع',           'Southern',         false),
  ('BH-HAM', 'Hamad Town',       'مدينة حمد',        'Northern',         false),
  ('BH-ISA', 'Isa Town',         'مدينة عيسى',       'Southern',         false)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'BHR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- Oman - مدن عُمانية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Muscat', v.is_port, true
FROM (VALUES
  ('OM-MSC', 'Muscat',           'مسقط',             'Muscat',           true),
  ('OM-SLL', 'Salalah',          'صلالة',            'Dhofar',           true),
  ('OM-SOH', 'Sohar',            'صحار',             'North Al Batinah', true),
  ('OM-SUR', 'Sur',              'صور',              'South Al Sharqiyah', true),
  ('OM-NIZ', 'Nizwa',            'نزوى',             'Ad Dakhiliyah',    false),
  ('OM-DQM', 'Duqm',             'الدقم',            'Al Wusta',         true)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'OMN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- Qatar - مدن قطرية
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, 'Asia/Qatar', v.is_port, true
FROM (VALUES
  ('QA-DOH', 'Doha',             'الدوحة',           'Doha',            true),
  ('QA-WKR', 'Al Wakrah',        'الوكرة',           'Al Wakrah',       true),
  ('QA-KHR', 'Al Khor',          'الخور',            'Al Khor',         true),
  ('QA-MSA', 'Mesaieed',         'مسيعيد',           'Al Wakrah',       true),
  ('QA-LUS', 'Lusail',           'لوسيل',            'Al Daayen',       false),
  ('QA-RLF', 'Ras Laffan',       'رأس لفان',         'Al Khor',         true)
) AS v(code, name_en, name_ar, province, is_port)
CROSS JOIN countries c WHERE c.code = 'QAT'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);

-- Major world cities
INSERT INTO cities (country_id, code, name, name_ar, state_province, timezone, is_port_city, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.province, v.timezone, v.is_port, true
FROM (VALUES
  -- Europe
  ('GBR', 'GB-LON', 'London',           'لندن',              'England',    'Europe/London',    true),
  ('GBR', 'GB-MAN', 'Manchester',       'مانشستر',           'England',    'Europe/London',    false),
  ('GBR', 'GB-BHM', 'Birmingham',       'برمنغهام',          'England',    'Europe/London',    false),
  ('GBR', 'GB-LVP', 'Liverpool',        'ليفربول',           'England',    'Europe/London',    true),
  ('GBR', 'GB-FXT', 'Felixstowe',       'فليكسستو',          'England',    'Europe/London',    true),
  ('DEU', 'DE-BER', 'Berlin',           'برلين',             'Berlin',     'Europe/Berlin',    false),
  ('DEU', 'DE-HAM', 'Hamburg',          'هامبورغ',           'Hamburg',    'Europe/Berlin',    true),
  ('DEU', 'DE-FRA', 'Frankfurt',        'فرانكفورت',         'Hesse',      'Europe/Berlin',    false),
  ('DEU', 'DE-MUC', 'Munich',           'ميونخ',             'Bavaria',    'Europe/Berlin',    false),
  ('FRA', 'FR-PAR', 'Paris',            'باريس',             'Île-de-France', 'Europe/Paris',  false),
  ('FRA', 'FR-MRS', 'Marseille',        'مارسيليا',          'Provence',   'Europe/Paris',     true),
  ('FRA', 'FR-LYN', 'Lyon',             'ليون',              'Auvergne',   'Europe/Paris',     false),
  ('FRA', 'FR-LEH', 'Le Havre',         'لوهافر',            'Normandie',  'Europe/Paris',     true),
  ('NLD', 'NL-AMS', 'Amsterdam',        'أمستردام',          'North Holland', 'Europe/Amsterdam', true),
  ('NLD', 'NL-RTM', 'Rotterdam',        'روتردام',           'South Holland', 'Europe/Amsterdam', true),
  ('BEL', 'BE-BRU', 'Brussels',         'بروكسل',            'Brussels',   'Europe/Brussels',  false),
  ('BEL', 'BE-ANT', 'Antwerp',          'أنتويرب',           'Flanders',   'Europe/Brussels',  true),
  ('ESP', 'ES-MAD', 'Madrid',           'مدريد',             'Madrid',     'Europe/Madrid',    false),
  ('ESP', 'ES-BCN', 'Barcelona',        'برشلونة',           'Catalonia',  'Europe/Madrid',    true),
  ('ESP', 'ES-VLC', 'Valencia',         'بلنسية',            'Valencia',   'Europe/Madrid',    true),
  ('ITA', 'IT-ROM', 'Rome',             'روما',              'Lazio',      'Europe/Rome',      false),
  ('ITA', 'IT-MIL', 'Milan',            'ميلانو',            'Lombardy',   'Europe/Rome',      false),
  ('ITA', 'IT-GEN', 'Genoa',            'جنوة',              'Liguria',    'Europe/Rome',      true),
  -- Asia
  ('CHN', 'CN-SHA', 'Shanghai',         'شنغهاي',            'Shanghai',   'Asia/Shanghai',    true),
  ('CHN', 'CN-BEJ', 'Beijing',          'بكين',              'Beijing',    'Asia/Shanghai',    false),
  ('CHN', 'CN-GUZ', 'Guangzhou',        'قوانغتشو',          'Guangdong',  'Asia/Shanghai',    true),
  ('CHN', 'CN-SZX', 'Shenzhen',         'شنتشن',             'Guangdong',  'Asia/Shanghai',    true),
  ('CHN', 'CN-NGB', 'Ningbo',           'نينغبو',            'Zhejiang',   'Asia/Shanghai',    true),
  ('CHN', 'CN-QIN', 'Qingdao',          'تشينغداو',          'Shandong',   'Asia/Shanghai',    true),
  ('CHN', 'CN-TIA', 'Tianjin',          'تيانجين',           'Tianjin',    'Asia/Shanghai',    true),
  ('JPN', 'JP-TYO', 'Tokyo',            'طوكيو',             'Kanto',      'Asia/Tokyo',       true),
  ('JPN', 'JP-OSA', 'Osaka',            'أوساكا',            'Kansai',     'Asia/Tokyo',       true),
  ('JPN', 'JP-YOK', 'Yokohama',         'يوكوهاما',          'Kanto',      'Asia/Tokyo',       true),
  ('JPN', 'JP-KOB', 'Kobe',             'كوبي',              'Kansai',     'Asia/Tokyo',       true),
  ('KOR', 'KR-SEL', 'Seoul',            'سيول',              'Seoul',      'Asia/Seoul',       false),
  ('KOR', 'KR-BUS', 'Busan',            'بوسان',             'Busan',      'Asia/Seoul',       true),
  ('IND', 'IN-BOM', 'Mumbai',           'مومباي',            'Maharashtra','Asia/Kolkata',     true),
  ('IND', 'IN-DEL', 'New Delhi',        'نيودلهي',           'Delhi',      'Asia/Kolkata',     false),
  ('IND', 'IN-CHE', 'Chennai',          'تشيناي',            'Tamil Nadu', 'Asia/Kolkata',     true),
  ('SGP', 'SG-SIN', 'Singapore',        'سنغافورة',          'Singapore',  'Asia/Singapore',   true),
  ('MYS', 'MY-KUL', 'Kuala Lumpur',     'كوالالمبور',        'W. Persekutuan', 'Asia/Kuala_Lumpur', false),
  ('MYS', 'MY-PGU', 'Port Klang',       'ميناء كلانج',       'Selangor',   'Asia/Kuala_Lumpur', true),
  ('THA', 'TH-BKK', 'Bangkok',          'بانكوك',            'Bangkok',    'Asia/Bangkok',     true),
  ('IDN', 'ID-JKT', 'Jakarta',          'جاكارتا',           'DKI Jakarta','Asia/Jakarta',     true),
  ('IDN', 'ID-SBY', 'Surabaya',         'سورابايا',          'East Java',  'Asia/Jakarta',     true),
  ('VNM', 'VN-SGN', 'Ho Chi Minh City', 'مدينة هوشي منه',   'South',      'Asia/Ho_Chi_Minh', true),
  ('VNM', 'VN-HAN', 'Hanoi',            'هانوي',             'North',      'Asia/Ho_Chi_Minh', false),
  ('PHL', 'PH-MNL', 'Manila',           'مانيلا',            'NCR',        'Asia/Manila',      true),
  ('TUR', 'TR-IST', 'Istanbul',         'إسطنبول',           'Istanbul',   'Europe/Istanbul',  true),
  ('TUR', 'TR-ANK', 'Ankara',           'أنقرة',             'Ankara',     'Europe/Istanbul',  false),
  ('TUR', 'TR-MER', 'Mersin',           'مرسين',             'Mersin',     'Europe/Istanbul',  true),
  ('TUR', 'TR-IZM', 'Izmir',            'إزمير',             'Izmir',      'Europe/Istanbul',  true),
  -- Americas
  ('USA', 'US-NYC', 'New York',          'نيويورك',           'New York',   'America/New_York', true),
  ('USA', 'US-LAX', 'Los Angeles',       'لوس أنجلوس',       'California', 'America/Los_Angeles', true),
  ('USA', 'US-CHI', 'Chicago',           'شيكاغو',           'Illinois',   'America/Chicago',  false),
  ('USA', 'US-HOU', 'Houston',           'هيوستن',            'Texas',      'America/Chicago',  true),
  ('USA', 'US-MIA', 'Miami',             'ميامي',             'Florida',    'America/New_York', true),
  ('BRA', 'BR-SAO', 'São Paulo',         'ساو باولو',        'São Paulo',  'America/Sao_Paulo', false),
  ('BRA', 'BR-RIO', 'Rio de Janeiro',    'ريو دي جانيرو',    'Rio',        'America/Sao_Paulo', true),
  ('BRA', 'BR-SAN', 'Santos',            'سانتوس',           'São Paulo',  'America/Sao_Paulo', true),
  -- Africa
  ('ZAF', 'ZA-JHB', 'Johannesburg',     'جوهانسبرغ',        'Gauteng',    'Africa/Johannesburg', false),
  ('ZAF', 'ZA-CPT', 'Cape Town',        'كيب تاون',          'Western Cape','Africa/Johannesburg', true),
  ('ZAF', 'ZA-DUR', 'Durban',           'ديربان',            'KwaZulu-Natal','Africa/Johannesburg', true),
  ('NGA', 'NG-LAG', 'Lagos',            'لاغوس',             'Lagos',      'Africa/Lagos',     true),
  ('KEN', 'KE-NBO', 'Nairobi',          'نيروبي',            'Nairobi',    'Africa/Nairobi',   false),
  ('KEN', 'KE-MBA', 'Mombasa',          'ممباسا',            'Coast',      'Africa/Nairobi',   true),
  ('ETH', 'ET-ADD', 'Addis Ababa',      'أديس أبابا',        'A.A.',       'Africa/Addis_Ababa', false),
  -- Oceania
  ('AUS', 'AU-SYD', 'Sydney',           'سيدني',             'NSW',        'Australia/Sydney',  true),
  ('AUS', 'AU-MEL', 'Melbourne',        'ملبورن',             'Victoria',   'Australia/Melbourne', true),
  ('AUS', 'AU-BNE', 'Brisbane',         'بريزبن',            'Queensland', 'Australia/Sydney',  true)
) AS v(country_code, code, name_en, name_ar, province, timezone, is_port)
JOIN countries c ON c.code = v.country_code
WHERE NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code AND ci.deleted_at IS NULL);


COMMIT;
