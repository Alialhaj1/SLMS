-- ============================================================================
-- 361: Seed Real Master Data (Regions, Cities, Timezones, Languages)
-- ============================================================================
-- Comprehensive real-world seed data for logistics ERP
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. UPDATE COUNTRIES WITH FLAG EMOJIS                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  -- Add flag_emoji column if not exists (may already exist from prior migration)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'flag_emoji') THEN
    ALTER TABLE countries ADD COLUMN flag_emoji VARCHAR(10);
  END IF;
END $$;

UPDATE countries SET flag_emoji = '🇸🇦' WHERE code = 'SAU';
UPDATE countries SET flag_emoji = '🇦🇪' WHERE code = 'ARE';
UPDATE countries SET flag_emoji = '🇾🇪' WHERE code = 'YEM';
UPDATE countries SET flag_emoji = '🇪🇬' WHERE code = 'EGY';
UPDATE countries SET flag_emoji = '🇯🇴' WHERE code = 'JOR';
UPDATE countries SET flag_emoji = '🇰🇼' WHERE code = 'KWT';
UPDATE countries SET flag_emoji = '🇧🇭' WHERE code = 'BHR';
UPDATE countries SET flag_emoji = '🇴🇲' WHERE code = 'OMN';
UPDATE countries SET flag_emoji = '🇶🇦' WHERE code = 'QAT';
UPDATE countries SET flag_emoji = '🇺🇸' WHERE code = 'USA';
UPDATE countries SET flag_emoji = '🇬🇧' WHERE code = 'GBR';
UPDATE countries SET flag_emoji = '🇩🇪' WHERE code = 'DEU';
UPDATE countries SET flag_emoji = '🇫🇷' WHERE code = 'FRA';
UPDATE countries SET flag_emoji = '🇨🇳' WHERE code = 'CHN';
UPDATE countries SET flag_emoji = '🇮🇳' WHERE code = 'IND';
UPDATE countries SET flag_emoji = '🇹🇷' WHERE code = 'TUR';
UPDATE countries SET flag_emoji = '🇮🇹' WHERE code = 'ITA';
UPDATE countries SET flag_emoji = '🇯🇵' WHERE code = 'JPN';
UPDATE countries SET flag_emoji = '🇰🇷' WHERE code = 'KOR';
UPDATE countries SET flag_emoji = '🇮🇶' WHERE code = 'IRQ';
UPDATE countries SET flag_emoji = '🇱🇧' WHERE code = 'LBN';
UPDATE countries SET flag_emoji = '🇸🇾' WHERE code = 'SYR';
UPDATE countries SET flag_emoji = '🇸🇩' WHERE code = 'SDN';
UPDATE countries SET flag_emoji = '🇱🇾' WHERE code = 'LBY';
UPDATE countries SET flag_emoji = '🇹🇳' WHERE code = 'TUN';
UPDATE countries SET flag_emoji = '🇲🇦' WHERE code = 'MAR';
UPDATE countries SET flag_emoji = '🇩🇿' WHERE code = 'DZA';
UPDATE countries SET flag_emoji = '🇵🇰' WHERE code = 'PAK';
UPDATE countries SET flag_emoji = '🇧🇩' WHERE code = 'BGD';
UPDATE countries SET flag_emoji = '🇮🇩' WHERE code = 'IDN';
UPDATE countries SET flag_emoji = '🇲🇾' WHERE code = 'MYS';
UPDATE countries SET flag_emoji = '🇸🇬' WHERE code = 'SGP';
UPDATE countries SET flag_emoji = '🇹🇭' WHERE code = 'THA';
UPDATE countries SET flag_emoji = '🇵🇭' WHERE code = 'PHL';
UPDATE countries SET flag_emoji = '🇦🇺' WHERE code = 'AUS';
UPDATE countries SET flag_emoji = '🇨🇦' WHERE code = 'CAN';
UPDATE countries SET flag_emoji = '🇧🇷' WHERE code = 'BRA';
UPDATE countries SET flag_emoji = '🇲🇽' WHERE code = 'MEX';
UPDATE countries SET flag_emoji = '🇷🇺' WHERE code = 'RUS';
UPDATE countries SET flag_emoji = '🇿🇦' WHERE code = 'ZAF';
UPDATE countries SET flag_emoji = '🇳🇬' WHERE code = 'NGA';
UPDATE countries SET flag_emoji = '🇰🇪' WHERE code = 'KEN';
UPDATE countries SET flag_emoji = '🇪🇹' WHERE code = 'ETH';
UPDATE countries SET flag_emoji = '🇬🇭' WHERE code = 'GHA';
UPDATE countries SET flag_emoji = '🇪🇸' WHERE code = 'ESP';
UPDATE countries SET flag_emoji = '🇵🇹' WHERE code = 'PRT';
UPDATE countries SET flag_emoji = '🇳🇱' WHERE code = 'NLD';
UPDATE countries SET flag_emoji = '🇧🇪' WHERE code = 'BEL';
UPDATE countries SET flag_emoji = '🇨🇭' WHERE code = 'CHE';
UPDATE countries SET flag_emoji = '🇦🇹' WHERE code = 'AUT';
UPDATE countries SET flag_emoji = '🇸🇪' WHERE code = 'SWE';
UPDATE countries SET flag_emoji = '🇳🇴' WHERE code = 'NOR';
UPDATE countries SET flag_emoji = '🇩🇰' WHERE code = 'DNK';
UPDATE countries SET flag_emoji = '🇫🇮' WHERE code = 'FIN';
UPDATE countries SET flag_emoji = '🇵🇱' WHERE code = 'POL';
UPDATE countries SET flag_emoji = '🇬🇷' WHERE code = 'GRC';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. SEED REGIONS FOR KEY COUNTRIES                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Helper: only insert if country exists and region code doesn't exist yet
-- Saudi Arabia - 13 Administrative Regions (Provinces)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'province', v.sort_order
FROM (VALUES
  ('SAU-RY', 'Riyadh',          'الرياض',           1),
  ('SAU-MK', 'Makkah',          'مكة المكرمة',      2),
  ('SAU-MD', 'Madinah',         'المدينة المنورة',  3),
  ('SAU-EP', 'Eastern Province', 'المنطقة الشرقية',  4),
  ('SAU-QS', 'Qassim',          'القصيم',           5),
  ('SAU-HA', 'Ha''il',          'حائل',             6),
  ('SAU-TB', 'Tabuk',           'تبوك',             7),
  ('SAU-NB', 'Northern Borders','الحدود الشمالية',  8),
  ('SAU-JF', 'Al Jawf',         'الجوف',            9),
  ('SAU-AS', 'Asir',            'عسير',             10),
  ('SAU-BA', 'Al Baha',         'الباحة',           11),
  ('SAU-JZ', 'Jazan',           'جازان',            12),
  ('SAU-NJ', 'Najran',          'نجران',            13)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'SAU'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- UAE - 7 Emirates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'emirate', v.sort_order
FROM (VALUES
  ('ARE-AZ', 'Abu Dhabi',       'أبو ظبي',          1),
  ('ARE-DU', 'Dubai',           'دبي',              2),
  ('ARE-SH', 'Sharjah',         'الشارقة',          3),
  ('ARE-AJ', 'Ajman',           'عجمان',            4),
  ('ARE-UQ', 'Umm Al Quwain',   'أم القيوين',       5),
  ('ARE-RK', 'Ras Al Khaimah',  'رأس الخيمة',      6),
  ('ARE-FU', 'Fujairah',        'الفجيرة',          7)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'ARE'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Kuwait - 6 Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('KWT-KU', 'Al Asimah',      'العاصمة',           1),
  ('KWT-HW', 'Hawalli',        'حولي',              2),
  ('KWT-FA', 'Al Farwaniyah',  'الفروانية',         3),
  ('KWT-MU', 'Mubarak Al-Kabeer','مبارك الكبير',   4),
  ('KWT-AH', 'Al Ahmadi',      'الأحمدي',           5),
  ('KWT-JA', 'Al Jahra',       'الجهراء',           6)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'KWT'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Bahrain - 4 Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('BHR-CA', 'Capital',          'العاصمة',          1),
  ('BHR-MU', 'Muharraq',        'المحرق',           2),
  ('BHR-NO', 'Northern',        'الشمالية',          3),
  ('BHR-SO', 'Southern',        'الجنوبية',          4)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'BHR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Qatar - 8 Municipalities
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'municipality', v.sort_order
FROM (VALUES
  ('QAT-DA', 'Ad Dawhah',      'الدوحة',            1),
  ('QAT-KH', 'Al Khawr',       'الخور',             2),
  ('QAT-WA', 'Al Wakrah',      'الوكرة',            3),
  ('QAT-RA', 'Al Rayyan',      'الريان',            4),
  ('QAT-SH', 'Ash Shamal',     'الشمال',            5),
  ('QAT-ZA', 'Az Za''ayin',    'الذعاين',           6),
  ('QAT-UM', 'Umm Salal',      'أم صلال',           7),
  ('QAT-DK', 'Al Daayen',      'الضعاين',           8)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'QAT'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Oman - 11 Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('OMN-MU', 'Muscat',           'مسقط',              1),
  ('OMN-ZU', 'Dhofar',          'ظفار',              2),
  ('OMN-DA', 'Ad Dakhiliyah',   'الداخلية',          3),
  ('OMN-BA', 'Al Batinah North','شمال الباطنة',      4),
  ('OMN-BS', 'Al Batinah South','جنوب الباطنة',      5),
  ('OMN-SN', 'Ash Sharqiyah North','شمال الشرقية',   6),
  ('OMN-SS', 'Ash Sharqiyah South','جنوب الشرقية',   7),
  ('OMN-ZA', 'Az Zahirah',      'الظاهرة',          8),
  ('OMN-BU', 'Al Buraimi',      'البريمي',           9),
  ('OMN-WU', 'Al Wusta',        'الوسطى',           10),
  ('OMN-MR', 'Musandam',        'مسندم',            11)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'OMN'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Jordan - 12 Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('JOR-AM', 'Amman',           'عمان',              1),
  ('JOR-IR', 'Irbid',           'إربد',              2),
  ('JOR-ZA', 'Zarqa',           'الزرقاء',           3),
  ('JOR-BA', 'Balqa',           'البلقاء',           4),
  ('JOR-MA', 'Mafraq',          'المفرق',            5),
  ('JOR-KA', 'Karak',           'الكرك',             6),
  ('JOR-TA', 'Tafilah',         'الطفيلة',           7),
  ('JOR-MN', 'Ma''an',          'معان',              8),
  ('JOR-JR', 'Jerash',          'جرش',              9),
  ('JOR-AJ', 'Ajloun',          'عجلون',            10),
  ('JOR-AQ', 'Aqaba',           'العقبة',           11),
  ('JOR-MD', 'Madaba',          'مادبا',            12)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'JOR'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Egypt - Major Governorates (27)
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('EGY-CA', 'Cairo',           'القاهرة',           1),
  ('EGY-GZ', 'Giza',            'الجيزة',            2),
  ('EGY-AL', 'Alexandria',      'الإسكندرية',        3),
  ('EGY-QH', 'Qalyubia',        'القليوبية',         4),
  ('EGY-SH', 'Sharqia',         'الشرقية',           5),
  ('EGY-DK', 'Dakahlia',        'الدقهلية',          6),
  ('EGY-GR', 'Gharbia',         'الغربية',           7),
  ('EGY-MN', 'Monufia',         'المنوفية',          8),
  ('EGY-BH', 'Beheira',         'البحيرة',           9),
  ('EGY-KS', 'Kafr El Sheikh',  'كفر الشيخ',        10),
  ('EGY-DM', 'Damietta',        'دمياط',            11),
  ('EGY-PS', 'Port Said',       'بورسعيد',          12),
  ('EGY-IS', 'Ismailia',        'الإسماعيلية',      13),
  ('EGY-SZ', 'Suez',            'السويس',           14),
  ('EGY-AS', 'Aswan',           'أسوان',            15),
  ('EGY-LX', 'Luxor',           'الأقصر',           16),
  ('EGY-QN', 'Qena',            'قنا',              17),
  ('EGY-SG', 'Sohag',           'سوهاج',            18),
  ('EGY-AT', 'Asyut',           'أسيوط',            19),
  ('EGY-MO', 'Minya',           'المنيا',           20),
  ('EGY-BN', 'Beni Suef',       'بني سويف',         21),
  ('EGY-FY', 'Fayoum',          'الفيوم',           22),
  ('EGY-RB', 'Red Sea',         'البحر الأحمر',     23),
  ('EGY-NV', 'New Valley',      'الوادي الجديد',    24),
  ('EGY-MT', 'Matrouh',         'مطروح',            25),
  ('EGY-NS', 'North Sinai',     'شمال سيناء',       26),
  ('EGY-SS', 'South Sinai',     'جنوب سيناء',       27)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'EGY'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Yemen - Major Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('YEM-SN', 'Sana''a',         'صنعاء',             1),
  ('YEM-AD', 'Aden',            'عدن',               2),
  ('YEM-TA', 'Taiz',            'تعز',               3),
  ('YEM-HO', 'Al Hudaydah',     'الحديدة',           4),
  ('YEM-IB', 'Ibb',             'إب',                5),
  ('YEM-HD', 'Hadramaut',       'حضرموت',            6),
  ('YEM-DH', 'Dhamar',          'ذمار',              7),
  ('YEM-AM', 'Amran',           'عمران',             8),
  ('YEM-MA', 'Ma''rib',         'مأرب',              9),
  ('YEM-SA', 'Sa''dah',         'صعدة',             10),
  ('YEM-SH', 'Shabwah',         'شبوة',             11),
  ('YEM-AB', 'Abyan',           'أبين',             12),
  ('YEM-LA', 'Lahij',           'لحج',              13),
  ('YEM-BY', 'Al Bayda',        'البيضاء',          14),
  ('YEM-HJ', 'Hajjah',          'حجة',              15)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'YEM'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);

-- Iraq - 18 Governorates
INSERT INTO regions (country_id, name_en, name_ar, code, region_type, sort_order)
SELECT c.id, v.name_en, v.name_ar, v.code, 'governorate', v.sort_order
FROM (VALUES
  ('IRQ-BG', 'Baghdad',         'بغداد',             1),
  ('IRQ-BA', 'Basra',           'البصرة',            2),
  ('IRQ-NI', 'Nineveh',         'نينوى',             3),
  ('IRQ-AR', 'Erbil',           'أربيل',             4),
  ('IRQ-SU', 'Sulaymaniyah',    'السليمانية',        5),
  ('IRQ-DH', 'Duhok',           'دهوك',              6),
  ('IRQ-KI', 'Kirkuk',          'كركوك',             7),
  ('IRQ-AN', 'Anbar',           'الأنبار',           8),
  ('IRQ-NA', 'Najaf',           'النجف',             9),
  ('IRQ-KR', 'Karbala',         'كربلاء',           10),
  ('IRQ-DY', 'Diyala',          'ديالى',            11),
  ('IRQ-WA', 'Wasit',           'واسط',             12),
  ('IRQ-SA', 'Saladin',         'صلاح الدين',       13),
  ('IRQ-BB', 'Babil',           'بابل',             14),
  ('IRQ-QA', 'Al Qadisiyyah',   'القادسية',         15),
  ('IRQ-MU', 'Al Muthanna',     'المثنى',           16),
  ('IRQ-TH', 'Dhi Qar',        'ذي قار',           17),
  ('IRQ-MY', 'Maysan',          'ميسان',            18)
) AS v(code, name_en, name_ar, sort_order)
CROSS JOIN countries c
WHERE c.code = 'IRQ'
AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.code = v.code AND r.country_id = c.id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. SEED CITIES FOR KEY COUNTRIES                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Note: Saudi cities already seeded (14 cities from migration 061).
-- Capital cities for 196 countries from migration 062.
-- Adding non-capital major cities for logistics-relevant countries.

-- UAE Cities  
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('ARE-DXB', 'Dubai',              'دبي',              true),
  ('ARE-AUH', 'Abu Dhabi',          'أبو ظبي',          true),
  ('ARE-SHJ', 'Sharjah',            'الشارقة',          true),
  ('ARE-AJM', 'Ajman',              'عجمان',            false),
  ('ARE-RAK', 'Ras Al Khaimah',     'رأس الخيمة',      true),
  ('ARE-FUJ', 'Fujairah',           'الفجيرة',          true),
  ('ARE-AAI', 'Al Ain',             'العين',            false),
  ('ARE-UAQ', 'Umm Al Quwain',      'أم القيوين',       false),
  ('ARE-JAF', 'Jebel Ali',          'جبل علي',          true),
  ('ARE-KHR', 'Khor Fakkan',        'خورفكان',          true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'ARE'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Kuwait Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('KWT-KWI', 'Kuwait City',        'مدينة الكويت',     true),
  ('KWT-HWL', 'Hawalli',            'حولي',             false),
  ('KWT-SAL', 'Salmiya',            'السالمية',         false),
  ('KWT-FAR', 'Farwaniya',          'الفروانية',        false),
  ('KWT-JAH', 'Jahra',              'الجهراء',          false),
  ('KWT-AHM', 'Ahmadi',             'الأحمدي',          true),
  ('KWT-MAN', 'Mangaf',             'المنقف',           false),
  ('KWT-SHU', 'Shuwaikh',           'الشويخ',           true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'KWT'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Bahrain Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('BHR-MAN', 'Manama',             'المنامة',          true),
  ('BHR-MUH', 'Muharraq',           'المحرق',           false),
  ('BHR-RIF', 'Riffa',              'الرفاع',           false),
  ('BHR-ISA', 'Isa Town',           'مدينة عيسى',       false),
  ('BHR-HAM', 'Hamad Town',         'مدينة حمد',        false),
  ('BHR-SIT', 'Sitra',              'سترة',             true),
  ('BHR-JID', 'Jidhafs',            'جدحفص',            false),
  ('BHR-SAL', 'Salman Port',        'ميناء سلمان',      true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'BHR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Qatar Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('QAT-DOH', 'Doha',               'الدوحة',           true),
  ('QAT-WAK', 'Al Wakrah',          'الوكرة',           false),
  ('QAT-KHR', 'Al Khor',            'الخور',            false),
  ('QAT-RAY', 'Al Rayyan',          'الريان',           false),
  ('QAT-UMS', 'Umm Salal',          'أم صلال',          false),
  ('QAT-DAA', 'Al Daayen',          'الضعاين',          false),
  ('QAT-LUS', 'Lusail',             'لوسيل',            false),
  ('QAT-MSA', 'Mesaieed',           'مسيعيد',           true),
  ('QAT-RLA', 'Ras Laffan',         'رأس لفان',         true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'QAT'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Oman Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('OMN-MCT', 'Muscat',             'مسقط',             true),
  ('OMN-SLL', 'Salalah',            'صلالة',            true),
  ('OMN-SOH', 'Sohar',              'صحار',             true),
  ('OMN-NIZ', 'Nizwa',              'نزوى',             false),
  ('OMN-SUR', 'Sur',                'صور',              true),
  ('OMN-RST', 'Rustaq',             'الرستاق',          false),
  ('OMN-IBR', 'Ibra',               'إبراء',            false),
  ('OMN-BRK', 'Barka',              'بركاء',            false),
  ('OMN-DQM', 'Duqm',               'الدقم',            true),
  ('OMN-KHS', 'Khasab',             'خصب',              true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'OMN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Jordan Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('JOR-AMM', 'Amman',              'عمان',             false),
  ('JOR-IRB', 'Irbid',              'إربد',             false),
  ('JOR-ZAR', 'Zarqa',              'الزرقاء',          false),
  ('JOR-AQB', 'Aqaba',              'العقبة',           true),
  ('JOR-SLT', 'Salt',               'السلط',            false),
  ('JOR-KRK', 'Karak',              'الكرك',            false),
  ('JOR-MDB', 'Madaba',             'مادبا',            false),
  ('JOR-JRS', 'Jerash',             'جرش',             false),
  ('JOR-MFR', 'Mafraq',             'المفرق',           false),
  ('JOR-TAF', 'Tafilah',            'الطفيلة',          false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'JOR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Egypt Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('EGY-CAI', 'Cairo',              'القاهرة',          false),
  ('EGY-ALX', 'Alexandria',         'الإسكندرية',       true),
  ('EGY-GIZ', 'Giza',               'الجيزة',           false),
  ('EGY-SHB', 'Shubra El Kheima',   'شبرا الخيمة',     false),
  ('EGY-PSE', 'Port Said',          'بورسعيد',          true),
  ('EGY-SUZ', 'Suez',               'السويس',           true),
  ('EGY-LUX', 'Luxor',              'الأقصر',           false),
  ('EGY-ASW', 'Aswan',              'أسوان',            false),
  ('EGY-MNS', 'Mansoura',           'المنصورة',         false),
  ('EGY-TNT', 'Tanta',              'طنطا',             false),
  ('EGY-ISM', 'Ismailia',           'الإسماعيلية',      false),
  ('EGY-DMT', 'Damietta',           'دمياط',            true),
  ('EGY-ASY', 'Asyut',              'أسيوط',            false),
  ('EGY-SFG', 'Safaga',             'سفاجا',            true),
  ('EGY-HRG', 'Hurghada',           'الغردقة',          false),
  ('EGY-AID', 'Ain Sokhna',         'العين السخنة',     true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'EGY'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Yemen Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('YEM-SAH', 'Sana''a',            'صنعاء',            false),
  ('YEM-ADE', 'Aden',               'عدن',              true),
  ('YEM-TAZ', 'Taiz',               'تعز',              false),
  ('YEM-HOD', 'Al Hudaydah',        'الحديدة',          true),
  ('YEM-IBB', 'Ibb',                'إب',               false),
  ('YEM-MUK', 'Mukalla',            'المكلا',           true),
  ('YEM-SAY', 'Sayun',              'سيئون',            false),
  ('YEM-DHM', 'Dhamar',             'ذمار',             false),
  ('YEM-AMR', 'Amran',              'عمران',            false),
  ('YEM-MAR', 'Ma''rib',            'مأرب',             false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'YEM'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Iraq Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('IRQ-BGW', 'Baghdad',            'بغداد',            false),
  ('IRQ-BAS', 'Basra',              'البصرة',           true),
  ('IRQ-MOS', 'Mosul',              'الموصل',           false),
  ('IRQ-EBL', 'Erbil',              'أربيل',            false),
  ('IRQ-SUL', 'Sulaymaniyah',       'السليمانية',       false),
  ('IRQ-NJF', 'Najaf',              'النجف',            false),
  ('IRQ-KBL', 'Karbala',            'كربلاء',           false),
  ('IRQ-KRK', 'Kirkuk',             'كركوك',            false),
  ('IRQ-UQR', 'Umm Qasr',           'أم قصر',           true),
  ('IRQ-HIL', 'Hillah',             'الحلة',            false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'IRQ'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Turkey Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('TUR-IST', 'Istanbul',           'إسطنبول',          true),
  ('TUR-ANK', 'Ankara',             'أنقرة',            false),
  ('TUR-IZM', 'Izmir',              'إزمير',            true),
  ('TUR-ADA', 'Adana',              'أضنة',             false),
  ('TUR-ANT', 'Antalya',            'أنطاليا',          true),
  ('TUR-BUR', 'Bursa',              'بورصة',            false),
  ('TUR-MER', 'Mersin',             'مرسين',            true),
  ('TUR-GAZ', 'Gaziantep',          'غازي عنتاب',       false),
  ('TUR-KON', 'Konya',              'قونية',            false),
  ('TUR-TRB', 'Trabzon',            'طرابزون',          true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'TUR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- India Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('IND-DEL', 'New Delhi',          'نيودلهي',          false),
  ('IND-BOM', 'Mumbai',             'مومباي',           true),
  ('IND-CHE', 'Chennai',            'تشيناي',           true),
  ('IND-KOL', 'Kolkata',            'كولكاتا',          true),
  ('IND-BLR', 'Bangalore',          'بنغالور',          false),
  ('IND-HYD', 'Hyderabad',          'حيدر أباد',        false),
  ('IND-AHM', 'Ahmedabad',          'أحمد أباد',        false),
  ('IND-CCU', 'Kochi',              'كوتشي',            true),
  ('IND-JAI', 'Jaipur',             'جايبور',           false),
  ('IND-TUT', 'Tuticorin',          'توتيكورين',        true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'IND'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- China Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('CHN-PEK', 'Beijing',            'بكين',             false),
  ('CHN-SHA', 'Shanghai',           'شنغهاي',           true),
  ('CHN-GUZ', 'Guangzhou',          'قوانغتشو',         true),
  ('CHN-SZX', 'Shenzhen',           'شنتشن',            true),
  ('CHN-TSN', 'Tianjin',            'تيانجين',          true),
  ('CHN-NGB', 'Ningbo',             'نينغبو',           true),
  ('CHN-QNG', 'Qingdao',            'تشينغداو',         true),
  ('CHN-DLC', 'Dalian',             'داليان',           true),
  ('CHN-XMN', 'Xiamen',             'شيامن',            true),
  ('CHN-CKG', 'Chongqing',          'تشونغتشينغ',      false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'CHN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- USA Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('USA-NYC', 'New York',           'نيويورك',          true),
  ('USA-LAX', 'Los Angeles',        'لوس أنجلوس',       true),
  ('USA-CHI', 'Chicago',            'شيكاغو',           false),
  ('USA-HOU', 'Houston',            'هيوستن',           true),
  ('USA-MIA', 'Miami',              'ميامي',            true),
  ('USA-SFO', 'San Francisco',      'سان فرانسيسكو',    true),
  ('USA-SEA', 'Seattle',            'سياتل',            true),
  ('USA-ATL', 'Atlanta',            'أتلانتا',          false),
  ('USA-DFW', 'Dallas',             'دالاس',            false),
  ('USA-NWK', 'Newark',             'نيوارك',           true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'USA'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- UK Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('GBR-LON', 'London',             'لندن',             true),
  ('GBR-MAN', 'Manchester',         'مانشستر',          false),
  ('GBR-BIR', 'Birmingham',         'برمنغهام',         false),
  ('GBR-LIV', 'Liverpool',          'ليفربول',          true),
  ('GBR-GLA', 'Glasgow',            'غلاسكو',          false),
  ('GBR-SOT', 'Southampton',        'ساوثهامبتون',      true),
  ('GBR-FEL', 'Felixstowe',         'فيليكستو',         true),
  ('GBR-EDI', 'Edinburgh',          'إدنبرة',           false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'GBR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Germany Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('DEU-BER', 'Berlin',             'برلين',            false),
  ('DEU-HAM', 'Hamburg',            'هامبورغ',          true),
  ('DEU-MUC', 'Munich',             'ميونخ',            false),
  ('DEU-FRA', 'Frankfurt',          'فرانكفورت',        false),
  ('DEU-BRE', 'Bremen',             'بريمن',            true),
  ('DEU-DUS', 'Dusseldorf',         'دوسلدورف',         false),
  ('DEU-STR', 'Stuttgart',          'شتوتغارت',         false),
  ('DEU-CGN', 'Cologne',            'كولونيا',          false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'DEU'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- France Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('FRA-PAR', 'Paris',              'باريس',            false),
  ('FRA-MRS', 'Marseille',          'مارسيليا',         true),
  ('FRA-LYO', 'Lyon',               'ليون',             false),
  ('FRA-NIC', 'Nice',               'نيس',              false),
  ('FRA-LHR', 'Le Havre',           'لوهافر',           true),
  ('FRA-BOR', 'Bordeaux',           'بوردو',            true),
  ('FRA-TLS', 'Toulouse',           'تولوز',            false),
  ('FRA-NAT', 'Nantes',             'نانت',             true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'FRA'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Italy Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('ITA-ROM', 'Rome',               'روما',             false),
  ('ITA-MIL', 'Milan',              'ميلانو',           false),
  ('ITA-NAP', 'Naples',             'نابولي',           true),
  ('ITA-GEN', 'Genoa',              'جنوة',             true),
  ('ITA-VEN', 'Venice',             'البندقية',         true),
  ('ITA-TRN', 'Trieste',            'ترييستي',          true),
  ('ITA-PAL', 'Palermo',            'باليرمو',          true),
  ('ITA-LVN', 'Livorno',            'ليفورنو',          true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'ITA'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Japan Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('JPN-TYO', 'Tokyo',              'طوكيو',            true),
  ('JPN-OSA', 'Osaka',              'أوساكا',           true),
  ('JPN-YOK', 'Yokohama',           'يوكوهاما',         true),
  ('JPN-KOB', 'Kobe',               'كوبي',             true),
  ('JPN-NGO', 'Nagoya',             'ناغويا',           true),
  ('JPN-FUK', 'Fukuoka',            'فوكوكا',           true),
  ('JPN-SAP', 'Sapporo',            'سابورو',           false),
  ('JPN-KYO', 'Kyoto',              'كيوتو',            false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'JPN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- South Korea Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('KOR-SEL', 'Seoul',              'سيول',             false),
  ('KOR-PUS', 'Busan',              'بوسان',            true),
  ('KOR-ICN', 'Incheon',            'إنتشون',           true),
  ('KOR-DGU', 'Daegu',              'دايغو',            false),
  ('KOR-GWJ', 'Gwangju',            'غوانغجو',          false),
  ('KOR-DJN', 'Daejeon',            'دايجون',           false),
  ('KOR-ULS', 'Ulsan',              'أولسان',           true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'KOR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Lebanon Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('LBN-BEY', 'Beirut',             'بيروت',            true),
  ('LBN-TRI', 'Tripoli',            'طرابلس',           true),
  ('LBN-SID', 'Sidon',              'صيدا',             true),
  ('LBN-TYR', 'Tyre',               'صور',              false),
  ('LBN-JBL', 'Jounieh',            'جونية',            false),
  ('LBN-ZHL', 'Zahle',              'زحلة',             false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'LBN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Syria Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('SYR-DAM', 'Damascus',           'دمشق',            false),
  ('SYR-ALP', 'Aleppo',             'حلب',              false),
  ('SYR-HMS', 'Homs',               'حمص',              false),
  ('SYR-LAT', 'Latakia',            'اللاذقية',         true),
  ('SYR-TAR', 'Tartus',             'طرطوس',            true),
  ('SYR-HMA', 'Hama',               'حماة',             false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'SYR'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Sudan Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('SDN-KRT', 'Khartoum',           'الخرطوم',          false),
  ('SDN-PTS', 'Port Sudan',         'بورتسودان',        true),
  ('SDN-OMD', 'Omdurman',           'أم درمان',         false),
  ('SDN-KSL', 'Kassala',            'كسلا',             false),
  ('SDN-WAD', 'Wad Madani',         'ود مدني',          false)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'SDN'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);

-- Pakistan Major Cities
INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.is_port, true
FROM (VALUES
  ('PAK-KHI', 'Karachi',            'كراتشي',           true),
  ('PAK-LHE', 'Lahore',             'لاهور',            false),
  ('PAK-ISB', 'Islamabad',          'إسلام أباد',       false),
  ('PAK-RWP', 'Rawalpindi',         'راوالبندي',        false),
  ('PAK-FSD', 'Faisalabad',         'فيصل أباد',        false),
  ('PAK-GWD', 'Gwadar',             'جوادر',            true),
  ('PAK-QTA', 'Quetta',             'كويتا',            false),
  ('PAK-PQM', 'Port Qasim',         'ميناء قاسم',       true)
) AS v(code, name, name_ar, is_port)
CROSS JOIN countries c
WHERE c.code = 'PAK'
AND NOT EXISTS (SELECT 1 FROM cities ci WHERE ci.code = v.code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. SEED ADDITIONAL TIMEZONES                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO time_zones (code, name, name_ar, utc_offset, utc_offset_minutes, dst_offset)
SELECT v.code, v.name, v.name_ar, v.utc_offset, v.utc_offset_minutes, v.dst_offset
FROM (VALUES
  ('Europe/Paris',       'Central European Time',       'توقيت وسط أوروبا',         '+01:00', 60,  '+02:00'),
  ('Europe/Berlin',      'Central European Time (DE)',  'توقيت وسط أوروبا (ألمانيا)','+01:00', 60,  '+02:00'),
  ('Europe/Rome',        'Central European Time (IT)',  'توقيت وسط أوروبا (إيطاليا)','+01:00', 60,  '+02:00'),
  ('Europe/Moscow',      'Moscow Time',                 'توقيت موسكو',               '+03:00', 180, NULL),
  ('Europe/Istanbul',    'Turkey Time',                 'توقيت تركيا',               '+03:00', 180, NULL),
  ('Asia/Kolkata',       'India Standard Time',         'توقيت الهند',               '+05:30', 330, NULL),
  ('Asia/Karachi',       'Pakistan Standard Time',      'توقيت باكستان',             '+05:00', 300, NULL),
  ('Asia/Bangkok',       'Indochina Time',              'توقيت الهند الصينية',       '+07:00', 420, NULL),
  ('Asia/Singapore',     'Singapore Time',              'توقيت سنغافورة',            '+08:00', 480, NULL),
  ('Asia/Hong_Kong',     'Hong Kong Time',              'توقيت هونغ كونغ',           '+08:00', 480, NULL),
  ('Asia/Seoul',         'Korea Standard Time',         'توقيت كوريا',               '+09:00', 540, NULL),
  ('Australia/Sydney',   'Australian Eastern Time',     'توقيت شرق أستراليا',        '+10:00', 600, '+11:00'),
  ('Pacific/Auckland',   'New Zealand Time',            'توقيت نيوزيلندا',           '+12:00', 720, '+13:00'),
  ('America/Chicago',    'Central Standard Time',       'التوقيت المركزي الأمريكي',  '-06:00', -360, '-05:00'),
  ('America/Los_Angeles','Pacific Standard Time',       'توقيت المحيط الهادئ',       '-08:00', -480, '-07:00'),
  ('America/Sao_Paulo',  'Brasilia Time',               'توقيت برازيليا',            '-03:00', -180, NULL),
  ('Africa/Cairo',       'Egypt Standard Time',         'توقيت مصر',                 '+02:00', 120, NULL),
  ('Africa/Johannesburg','South Africa Time',           'توقيت جنوب أفريقيا',        '+02:00', 120, NULL),
  ('Asia/Baghdad',       'Arabia Standard Time (Iraq)', 'توقيت العراق',              '+03:00', 180, NULL),
  ('Asia/Beirut',        'Eastern European Time',       'توقيت شرق أوروبا (لبنان)',  '+02:00', 120, '+03:00'),
  ('Asia/Kuwait',        'Arabia Standard Time (KW)',   'توقيت الكويت',              '+03:00', 180, NULL),
  ('Asia/Muscat',        'Gulf Standard Time (Oman)',   'توقيت عمان',                '+04:00', 240, NULL),
  ('Asia/Bahrain',       'Arabia Standard Time (BH)',   'توقيت البحرين',             '+03:00', 180, NULL),
  ('Asia/Qatar',         'Arabia Standard Time (QA)',   'توقيت قطر',                 '+03:00', 180, NULL),
  ('Asia/Aden',          'Arabia Standard Time (YE)',   'توقيت اليمن',               '+03:00', 180, NULL),
  ('Asia/Amman',         'Eastern European Time (JO)',  'توقيت الأردن',              '+03:00', 180, NULL)
) AS v(code, name, name_ar, utc_offset, utc_offset_minutes, dst_offset)
WHERE NOT EXISTS (SELECT 1 FROM time_zones tz WHERE tz.code = v.code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5. SEED ADDITIONAL LANGUAGES                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO system_languages (code, name, name_ar, direction, is_active)
SELECT v.code, v.name, v.name_ar, v.direction, true
FROM (VALUES
  ('fr', 'French',     'الفرنسية',    'ltr'),
  ('de', 'German',     'الألمانية',   'ltr'),
  ('es', 'Spanish',    'الإسبانية',   'ltr'),
  ('it', 'Italian',    'الإيطالية',   'ltr'),
  ('pt', 'Portuguese', 'البرتغالية',  'ltr'),
  ('tr', 'Turkish',    'التركية',     'ltr'),
  ('ur', 'Urdu',       'الأردية',     'rtl'),
  ('hi', 'Hindi',      'الهندية',     'ltr'),
  ('zh', 'Chinese',    'الصينية',     'ltr'),
  ('ja', 'Japanese',   'اليابانية',   'ltr'),
  ('ko', 'Korean',     'الكورية',     'ltr'),
  ('ru', 'Russian',    'الروسية',     'ltr'),
  ('fa', 'Persian',    'الفارسية',    'rtl'),
  ('ms', 'Malay',      'الملايوية',   'ltr'),
  ('id', 'Indonesian', 'الإندونيسية', 'ltr'),
  ('bn', 'Bengali',    'البنغالية',   'ltr'),
  ('sw', 'Swahili',    'السواحيلية',  'ltr'),
  ('nl', 'Dutch',      'الهولندية',   'ltr')
) AS v(code, name, name_ar, direction)
WHERE NOT EXISTS (SELECT 1 FROM system_languages sl WHERE sl.code = v.code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6. SEED ADDITIONAL CURRENCIES                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO currencies (code, name, name_ar, symbol, decimal_places, is_active)
SELECT v.code, v.name, v.name_ar, v.symbol, v.decimal_places, true
FROM (VALUES
  ('IQD', 'Iraqi Dinar',         'الدينار العراقي',     'ع.د',  3),
  ('LBP', 'Lebanese Pound',      'الليرة اللبنانية',    'ل.ل',  2),
  ('SYP', 'Syrian Pound',        'الليرة السورية',      'ل.س',  2),
  ('SDG', 'Sudanese Pound',      'الجنيه السوداني',     'ج.س',  2),
  ('LYD', 'Libyan Dinar',        'الدينار الليبي',      'ل.د',  3),
  ('TND', 'Tunisian Dinar',      'الدينار التونسي',     'د.ت',  3),
  ('MAD', 'Moroccan Dirham',     'الدرهم المغربي',      'د.م',  2),
  ('DZD', 'Algerian Dinar',      'الدينار الجزائري',    'د.ج',  2),
  ('PKR', 'Pakistani Rupee',     'الروبية الباكستانية', '₨',    2),
  ('BDT', 'Bangladeshi Taka',    'التاكا البنغلاديشية', '৳',    2),
  ('IDR', 'Indonesian Rupiah',   'الروبية الإندونيسية', 'Rp',   0),
  ('MYR', 'Malaysian Ringgit',   'الرينغيت الماليزي',   'RM',   2),
  ('SGD', 'Singapore Dollar',    'الدولار السنغافوري',  'S$',   2),
  ('THB', 'Thai Baht',           'البات التايلندي',     '฿',    2),
  ('PHP', 'Philippine Peso',     'البيسو الفلبيني',     '₱',    2),
  ('AUD', 'Australian Dollar',   'الدولار الأسترالي',   'A$',   2),
  ('CAD', 'Canadian Dollar',     'الدولار الكندي',      'C$',   2),
  ('BRL', 'Brazilian Real',      'الريال البرازيلي',    'R$',   2),
  ('MXN', 'Mexican Peso',        'البيسو المكسيكي',     '$',    2),
  ('RUB', 'Russian Ruble',       'الروبل الروسي',       '₽',    2),
  ('ZAR', 'South African Rand',  'الراند الجنوب أفريقي','R',    2),
  ('NGN', 'Nigerian Naira',      'النايرا النيجيرية',   '₦',    2),
  ('KES', 'Kenyan Shilling',     'الشلن الكيني',        'KSh',  2),
  ('CHF', 'Swiss Franc',         'الفرنك السويسري',     'CHF',  2),
  ('SEK', 'Swedish Krona',       'الكرونة السويدية',    'kr',   2),
  ('NOK', 'Norwegian Krone',     'الكرونة النرويجية',   'kr',   2),
  ('DKK', 'Danish Krone',        'الكرونة الدنماركية',  'kr',   2),
  ('PLN', 'Polish Zloty',        'الزلوتي البولندي',    'zł',   2),
  ('KRW', 'South Korean Won',    'الوون الكوري',        '₩',    0),
  ('TWD', 'New Taiwan Dollar',   'الدولار التايواني',   'NT$',  2),
  ('HKD', 'Hong Kong Dollar',    'دولار هونغ كونغ',     'HK$',  2),
  ('NZD', 'New Zealand Dollar',  'دولار نيوزيلندا',     'NZ$',  2)
) AS v(code, name, name_ar, symbol, decimal_places)
WHERE NOT EXISTS (SELECT 1 FROM currencies cu WHERE cu.code = v.code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 7. VERIFY COUNTS                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  cnt_countries INTEGER;
  cnt_cities INTEGER;
  cnt_regions INTEGER;
  cnt_currencies INTEGER;
  cnt_timezones INTEGER;
  cnt_languages INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt_countries FROM countries WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO cnt_cities FROM cities WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO cnt_regions FROM regions WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO cnt_currencies FROM currencies WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO cnt_timezones FROM time_zones WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO cnt_languages FROM system_languages WHERE deleted_at IS NULL;

  RAISE NOTICE '=== Migration 361: Seed Data Summary ===';
  RAISE NOTICE 'Countries: % records', cnt_countries;
  RAISE NOTICE 'Cities: % records', cnt_cities;
  RAISE NOTICE 'Regions: % records', cnt_regions;
  RAISE NOTICE 'Currencies: % records', cnt_currencies;
  RAISE NOTICE 'Timezones: % records', cnt_timezones;
  RAISE NOTICE 'Languages: % records', cnt_languages;
END $$;
