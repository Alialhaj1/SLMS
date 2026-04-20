-- ============================================================================
-- 426: بيانات مرجعية شاملة - الموانئ والمطارات والجمارك
-- Comprehensive Reference Data - Ports, Airports & Customs Offices
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. SEA PORTS - الموانئ البحرية العالمية (UN/LOCODE)                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Saudi Arabia Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('SAJED', 'Jeddah Islamic Port',              'ميناء جدة الإسلامي',           21.4858, 39.1925),
  ('SADMM', 'King Abdulaziz Port Dammam',       'ميناء الملك عبدالعزيز الدمام', 26.4473, 50.1039),
  ('SAJUB', 'King Fahd Industrial Port Jubail',  'ميناء الملك فهد الصناعي الجبيل', 27.0174, 49.6221),
  ('SAYNB', 'King Fahd Industrial Port Yanbu',   'ميناء الملك فهد الصناعي ينبع',  24.0889, 38.0628),
  ('SAJIZ', 'Jazan Port',                        'ميناء جازان',                 16.9023, 42.5717),
  ('SARTA', 'Ras Tanura Terminal',               'محطة رأس تنورة',              26.6500, 50.1667),
  ('SASHU', 'Shuqaiq Port',                      'ميناء الشقيق',               17.7528, 41.7700),
  ('SADAB', 'Duba Port',                          'ميناء ضبا',                   27.3511, 35.7003),
  ('SARAH', 'Ras Al Khair Port',                  'ميناء رأس الخير',             27.4833, 49.2500)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'SAU'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- UAE Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('AEJEA', 'Jebel Ali Port',             'ميناء جبل علي',              25.0057, 55.0272),
  ('AEKLF', 'Khalifa Port',               'ميناء خليفة',               24.8025, 54.6172),
  ('AERSH', 'Port Rashid',                'ميناء راشد',                25.2750, 55.2800),
  ('AESHJ', 'Port of Sharjah',            'ميناء الشارقة',             25.3561, 55.3958),
  ('AEFUJ', 'Port of Fujairah',           'ميناء الفجيرة',             25.1175, 56.3411),
  ('AEKHF', 'Khor Fakkan Port',           'ميناء خورفكان',             25.3414, 56.3528),
  ('AERAK', 'Saqr Port RAK',              'ميناء صقر رأس الخيمة',      25.8267, 55.9556),
  ('AERUW', 'Ruwais Port',                'ميناء الرويس',              24.1067, 52.7331)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'ARE'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Kuwait Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('KWSHU', 'Shuwaikh Port',              'ميناء الشويخ',              29.3500, 47.9300),
  ('KWSAA', 'Shuaiba Port',               'ميناء الشعيبة',            29.0500, 48.1500),
  ('KWMIA', 'Mina Al Ahmadi',             'ميناء الأحمدي',            29.0603, 48.1600),
  ('KWMAB', 'Mina Abdullah',              'ميناء عبدالله',            29.0000, 48.1833)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'KWT'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Bahrain Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('BHKBS', 'Khalifa Bin Salman Port',    'ميناء خليفة بن سلمان',     26.0000, 50.6167),
  ('BHMIN', 'Mina Salman',                'ميناء سلمان',              26.2000, 50.6000)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'BHR'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Oman Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('OMSOH', 'Port of Sohar',              'ميناء صحار',               24.3667, 56.7333),
  ('OMSLL', 'Port of Salalah',            'ميناء صلالة',              16.9353, 54.0042),
  ('OMSQB', 'Sultan Qaboos Port',         'ميناء السلطان قابوس',      23.6250, 58.5667),
  ('OMDQM', 'Port of Duqm',              'ميناء الدقم',              19.6400, 57.7250)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'OMN'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Qatar Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  ('QAHAM', 'Hamad Port',                 'ميناء حمد',                25.3667, 51.5500),
  ('QADOH', 'Doha Port',                  'ميناء الدوحة',             25.2950, 51.5325),
  ('QARLF', 'Ras Laffan Port',            'ميناء رأس لفان',           25.9333, 51.5333),
  ('QAMSI', 'Mesaieed Port',              'ميناء مسيعيد',             24.9833, 51.5667)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'QAT'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Major World Sea Ports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'sea', v.lat, v.lng, true, true
FROM (VALUES
  -- Egypt - مصر
  ('EGY', 'EGPSD', 'Port Said',                    'بورسعيد',            31.2653, 32.3019),
  ('EGY', 'EGALY', 'Alexandria Port',               'ميناء الإسكندرية',   31.1975, 29.8653),
  ('EGY', 'EGSUZ', 'Suez Port',                     'ميناء السويس',       29.9668, 32.5498),
  ('EGY', 'EGDAM', 'Damietta Port',                 'ميناء دمياط',        31.4514, 31.8050),
  ('EGY', 'EGSOK', 'Sokhna Port',                   'ميناء السخنة',       29.6167, 32.3167),
  -- Jordan
  ('JOR', 'JOAQJ', 'Port of Aqaba',                 'ميناء العقبة',       29.5175, 35.0036),
  -- Iraq
  ('IRQ', 'IQBSR', 'Umm Qasr Port',                 'ميناء أم قصر',       30.0333, 47.9333),
  ('IRQ', 'IQFAO', 'Al Faw Grand Port',             'ميناء الفاو الكبير', 29.9833, 48.4667),
  -- China
  ('CHN', 'CNSHA', 'Port of Shanghai',              'ميناء شنغهاي',       31.3667, 121.5000),
  ('CHN', 'CNNGB', 'Ningbo-Zhoushan Port',          'ميناء نينغبو',       29.8667, 121.5500),
  ('CHN', 'CNSHE', 'Shenzhen Port (Yantian)',       'ميناء شنتشن يانتيان', 22.5833, 114.2667),
  ('CHN', 'CNQIN', 'Qingdao Port',                  'ميناء تشينغداو',     36.0333, 120.3167),
  ('CHN', 'CNTIA', 'Tianjin Port',                  'ميناء تيانجين',      39.0000, 117.7167),
  ('CHN', 'CNGUZ', 'Guangzhou Port (Nansha)',        'ميناء قوانغتشو نانشا', 22.7500, 113.6000),
  -- Singapore
  ('SGP', 'SGSIN', 'Port of Singapore',             'ميناء سنغافورة',     1.2667, 103.8000),
  -- South Korea
  ('KOR', 'KRPUS', 'Port of Busan',                 'ميناء بوسان',        35.1028, 129.0403),
  -- Japan
  ('JPN', 'JPTYO', 'Port of Tokyo',                 'ميناء طوكيو',        35.6500, 139.7833),
  ('JPN', 'JPYOK', 'Port of Yokohama',              'ميناء يوكوهاما',     35.4500, 139.6500),
  ('JPN', 'JPKOB', 'Port of Kobe',                  'ميناء كوبي',         34.6900, 135.2000),
  -- Malaysia
  ('MYS', 'MYPKG', 'Port Klang',                    'ميناء كلانج',        2.9833, 101.4000),
  ('MYS', 'MYPEN', 'Port of Penang',                'ميناء بينانج',       5.4167, 100.3333),
  ('MYS', 'MYTPP', 'Port of Tanjung Pelepas',       'ميناء تانجونج بيليباس', 1.3667, 103.5500),
  -- India
  ('IND', 'INNSA', 'Nhava Sheva (JNPT)',            'ميناء نافا شيفا',    18.9497, 72.9378),
  ('IND', 'INMAA', 'Port of Chennai',               'ميناء تشيناي',       13.0947, 80.2939),
  ('IND', 'INMUN', 'Mundra Port',                   'ميناء مندرا',        22.8400, 69.7200),
  -- Turkey
  ('TUR', 'TRMER', 'Mersin International Port',     'ميناء مرسين الدولي', 36.8000, 34.6333),
  ('TUR', 'TRIST', 'Port of Istanbul (Ambarli)',    'ميناء إسطنبول أمبارلي', 41.0000, 28.6833),
  ('TUR', 'TRIZM', 'Port of Izmir (Alsancak)',      'ميناء إزمير',        38.4500, 27.1333),
  -- Netherlands
  ('NLD', 'NLRTM', 'Port of Rotterdam',             'ميناء روتردام',      51.9167, 4.5000),
  -- Belgium
  ('BEL', 'BEANR', 'Port of Antwerp-Bruges',        'ميناء أنتويرب بروج', 51.2333, 4.4000),
  -- Germany
  ('DEU', 'DEHAM', 'Port of Hamburg',                'ميناء هامبورغ',      53.5500, 9.9667),
  ('DEU', 'DEBRV', 'Port of Bremerhaven',           'ميناء بريمرهافن',    53.5500, 8.5833),
  -- UK
  ('GBR', 'GBFXT', 'Port of Felixstowe',            'ميناء فيليكسستو',    51.9667, 1.3000),
  ('GBR', 'GBSOU', 'Port of Southampton',           'ميناء ساوثهامبتون',  50.8947, -1.4000),
  ('GBR', 'GBLON', 'London Gateway Port',           'ميناء لندن جيتواي',  51.5000, 0.4667),
  -- Spain
  ('ESP', 'ESVLC', 'Port of Valencia',              'ميناء بلنسية',       39.4500, -0.3167),
  ('ESP', 'ESALG', 'Port of Algeciras',             'ميناء الجزيرة الخضراء', 36.1333, -5.4333),
  ('ESP', 'ESBCN', 'Port of Barcelona',             'ميناء برشلونة',      41.3500, 2.1667),
  -- Italy
  ('ITA', 'ITGOA', 'Port of Genoa',                 'ميناء جنوة',         44.4167, 8.9000),
  ('ITA', 'ITGIT', 'Gioia Tauro Container Terminal','ميناء جويا تاورو',   38.4333, 15.8833),
  -- France
  ('FRA', 'FRLEH', 'Port of Le Havre',              'ميناء لوهافر',       49.4833, 0.1167),
  ('FRA', 'FRMRS', 'Port of Marseille Fos',         'ميناء مارسيليا فوس', 43.3500, 5.0500),
  -- USA
  ('USA', 'USLAX', 'Port of Los Angeles',           'ميناء لوس أنجلوس',   33.7333, -118.2833),
  ('USA', 'USLGB', 'Port of Long Beach',            'ميناء لونغ بيتش',    33.7500, -118.2000),
  ('USA', 'USNYC', 'Port of New York/New Jersey',   'ميناء نيويورك نيوجيرسي', 40.6833, -74.0333),
  ('USA', 'USSAV', 'Port of Savannah',              'ميناء سافانا',       32.0833, -81.0833),
  ('USA', 'USHOU', 'Port of Houston',               'ميناء هيوستن',       29.7500, -95.2667),
  -- Brazil
  ('BRA', 'BRSSZ', 'Port of Santos',                'ميناء سانتوس',       -23.9667, -46.3000),
  -- South Africa
  ('ZAF', 'ZADUR', 'Port of Durban',                'ميناء ديربان',       -29.8667, 31.0333),
  ('ZAF', 'ZACPT', 'Port of Cape Town',             'ميناء كيب تاون',     -33.9000, 18.4333),
  -- Morocco
  ('MAR', 'MAPTM', 'Tanger Med Port',               'ميناء طنجة المتوسط', 35.8833, -5.5000),
  -- Sri Lanka
  ('LKA', 'LKCMB', 'Port of Colombo',               'ميناء كولومبو',      6.9500, 79.8500),
  -- Pakistan
  ('PAK', 'PKKHI', 'Karachi Port',                  'ميناء كراتشي',       24.8333, 67.0000),
  ('PAK', 'PKQAS', 'Port Qasim',                    'ميناء قاسم',         24.7833, 67.3167),
  -- Kenya
  ('KEN', 'KEMBA', 'Port of Mombasa',               'ميناء ممباسا',       -4.0667, 39.6500),
  -- Tanzania
  ('TZA', 'TZDAR', 'Port of Dar es Salaam',         'ميناء دار السلام',   -6.8333, 39.2833),
  -- Djibouti
  ('DJI', 'DJJIB', 'Port of Djibouti',              'ميناء جيبوتي',       11.5950, 43.1481),
  -- Indonesia
  ('IDN', 'IDJKT', 'Tanjung Priok Jakarta',         'ميناء تانجونج بريوك جاكارتا', -6.1000, 106.8833),
  -- Thailand
  ('THA', 'THLCH', 'Laem Chabang Port',             'ميناء ليم شابانج',   13.0833, 100.8833),
  -- Vietnam
  ('VNM', 'VNSGN', 'Ho Chi Minh City Port',         'ميناء هوشي منه',     10.7667, 106.7167)
) AS v(country_code, code, name_en, name_ar, lat, lng)
JOIN countries c ON c.code = v.country_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. AIRPORTS - المطارات العالمية (stored as ports with type='air')       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Saudi Arabia Airports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'air', v.lat, v.lng, v.is_intl, true
FROM (VALUES
  ('OERK', 'King Khalid International Airport',         'مطار الملك خالد الدولي',          24.9578, 46.6989, true),
  ('OEJN', 'King Abdulaziz International Airport',      'مطار الملك عبدالعزيز الدولي',     21.6696, 39.1564, true),
  ('OEDF', 'King Fahd International Airport',           'مطار الملك فهد الدولي',           26.4708, 49.7989, true),
  ('OEMA', 'Prince Mohammad bin Abdulaziz Airport',     'مطار الأمير محمد بن عبدالعزيز',   24.5534, 39.7051, true),
  ('OETF', 'Taif International Airport',                'مطار الطائف الدولي',              21.4834, 40.5434, true),
  ('OEAB', 'Abha International Airport',                'مطار أبها الدولي',                18.2404, 42.6567, true),
  ('OETB', 'Tabuk Regional Airport',                    'مطار تبوك الإقليمي',              28.3654, 36.6189, true),
  ('OEGN', 'Jazan Airport',                             'مطار جازان',                      16.9011, 42.5858, true),
  ('OEHL', 'Ha''il Airport',                            'مطار حائل',                       27.4382, 41.6863, false),
  ('OEGS', 'Al Jouf Airport',                           'مطار الجوف',                      29.7851, 40.1006, false),
  ('OERR', 'Arar Airport',                              'مطار عرعر',                       30.9066, 41.1382, false),
  ('OENG', 'Najran Airport',                            'مطار نجران',                      17.6114, 44.4193, false),
  ('OEPA', 'Al Baha Airport',                           'مطار الباحة',                     20.2964, 41.6343, false),
  ('OEWD', 'Prince Abdulmohsin bin Abdulaziz Airport',  'مطار الأمير عبدالمحسن بن عبدالعزيز (ينبع)', 24.1442, 38.0634, false)
) AS v(code, name_en, name_ar, lat, lng, is_intl)
CROSS JOIN countries c WHERE c.code = 'SAU'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, is_international = EXCLUDED.is_international;

-- UAE Airports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'air', v.lat, v.lng, true, true
FROM (VALUES
  ('OMDB', 'Dubai International Airport',         'مطار دبي الدولي',                  25.2528, 55.3644),
  ('OMDW', 'Al Maktoum International Airport',    'مطار آل مكتوم الدولي',             24.8967, 55.1614),
  ('OMAA', 'Abu Dhabi International Airport',     'مطار أبوظبي الدولي',               24.4330, 54.6511),
  ('OMSJ', 'Sharjah International Airport',       'مطار الشارقة الدولي',              25.3286, 55.5172),
  ('OMRK', 'Ras Al Khaimah International Airport','مطار رأس الخيمة الدولي',           25.6133, 55.9389)
) AS v(code, name_en, name_ar, lat, lng)
CROSS JOIN countries c WHERE c.code = 'ARE'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Major World Airports
INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'air', v.lat, v.lng, true, true
FROM (VALUES
  -- GCC Other
  ('KWT', 'OKKK', 'Kuwait International Airport',        'مطار الكويت الدولي',        29.2267, 47.9689),
  ('BHR', 'OBBI', 'Bahrain International Airport',       'مطار البحرين الدولي',        26.2708, 50.6336),
  ('OMN', 'OOMS', 'Muscat International Airport',        'مطار مسقط الدولي',          23.5933, 58.2844),
  ('OMN', 'OOSA', 'Salalah Airport',                     'مطار صلالة',                17.0387, 54.0913),
  ('QAT', 'OTHH', 'Hamad International Airport',         'مطار حمد الدولي',           25.2731, 51.6082),
  -- Egypt
  ('EGY', 'HECA', 'Cairo International Airport',         'مطار القاهرة الدولي',        30.1219, 31.4056),
  ('EGY', 'HEBA', 'Borg El Arab Airport',                'مطار برج العرب',             30.9177, 29.6964),
  ('EGY', 'HEGN', 'Hurghada International Airport',      'مطار الغردقة الدولي',        27.1783, 33.7994),
  ('EGY', 'HESH', 'Sharm El Sheikh Airport',             'مطار شرم الشيخ الدولي',      27.9773, 34.3953),
  -- Jordan
  ('JOR', 'OJAI', 'Queen Alia International Airport',    'مطار الملكة علياء الدولي',    31.7226, 35.9932),
  -- Iraq
  ('IRQ', 'ORBI', 'Baghdad International Airport',       'مطار بغداد الدولي',          33.2625, 44.2346),
  ('IRQ', 'ORER', 'Erbil International Airport',         'مطار أربيل الدولي',          36.2376, 43.9632),
  -- Turkey
  ('TUR', 'LTFM', 'Istanbul Airport',                    'مطار إسطنبول',               41.2753, 28.7519),
  ('TUR', 'LTAI', 'Antalya Airport',                     'مطار أنطاليا',               36.8987, 30.8005),
  -- UK
  ('GBR', 'EGLL', 'London Heathrow Airport',             'مطار لندن هيثرو',            51.4700, -0.4543),
  ('GBR', 'EGKK', 'London Gatwick Airport',              'مطار لندن غاتويك',           51.1481, -0.1903),
  ('GBR', 'EGSS', 'London Stansted Airport',             'مطار لندن ستانستد',          51.8850, 0.2350),
  -- France
  ('FRA', 'LFPG', 'Paris Charles de Gaulle Airport',     'مطار باريس شارل ديغول',      49.0097, 2.5479),
  ('FRA', 'LFPO', 'Paris Orly Airport',                  'مطار باريس أورلي',           48.7233, 2.3794),
  -- Germany
  ('DEU', 'EDDF', 'Frankfurt Airport',                   'مطار فرانكفورت',             50.0333, 8.5706),
  ('DEU', 'EDDM', 'Munich Airport',                      'مطار ميونخ',                 48.3538, 11.7861),
  -- Netherlands
  ('NLD', 'EHAM', 'Amsterdam Schiphol Airport',          'مطار أمستردام سخيبول',        52.3086, 4.7639),
  -- Spain
  ('ESP', 'LEMD', 'Madrid-Barajas Airport',              'مطار مدريد باراخاس',          40.4722, -3.5611),
  ('ESP', 'LEBL', 'Barcelona-El Prat Airport',           'مطار برشلونة',               41.2971, 2.0785),
  -- Italy
  ('ITA', 'LIRF', 'Rome Fiumicino Airport',              'مطار روما فيوميتشينو',       41.8003, 12.2389),
  ('ITA', 'LIMC', 'Milan Malpensa Airport',              'مطار ميلانو مالبنسا',        45.6306, 8.7231),
  -- USA
  ('USA', 'KJFK', 'John F. Kennedy International Airport','مطار جون كينيدي الدولي',     40.6413, -73.7781),
  ('USA', 'KLAX', 'Los Angeles International Airport',   'مطار لوس أنجلوس الدولي',     33.9425, -118.4081),
  ('USA', 'KORD', 'Chicago O''Hare International Airport','مطار شيكاغو أوهير الدولي',    41.9742, -87.9073),
  ('USA', 'KATL', 'Hartsfield-Jackson Atlanta Airport',  'مطار أتلانتا',               33.6407, -84.4277),
  -- China
  ('CHN', 'ZBAA', 'Beijing Capital International Airport','مطار بكين العاصمة الدولي',    40.0799, 116.6031),
  ('CHN', 'ZSPD', 'Shanghai Pudong International Airport','مطار شنغهاي بودونغ الدولي',   31.1434, 121.8052),
  ('CHN', 'ZGGG', 'Guangzhou Baiyun Int''l Airport',     'مطار قوانغتشو بايون الدولي',  23.3924, 113.2988),
  -- Japan
  ('JPN', 'RJTT', 'Tokyo Haneda Airport',                'مطار طوكيو هانيدا',          35.5533, 139.7811),
  ('JPN', 'RJAA', 'Tokyo Narita International Airport',  'مطار طوكيو ناريتا الدولي',   35.7647, 140.3864),
  ('JPN', 'RJBB', 'Kansai International Airport',        'مطار كانساي الدولي',          34.4347, 135.2441),
  -- South Korea
  ('KOR', 'RKSI', 'Incheon International Airport',       'مطار إنتشون الدولي',          37.4602, 126.4407),
  -- Singapore
  ('SGP', 'WSSS', 'Singapore Changi Airport',            'مطار سنغافورة شانغي',         1.3502, 103.9944),
  -- Malaysia
  ('MYS', 'WMKK', 'Kuala Lumpur International Airport',  'مطار كوالالمبور الدولي',     2.7456, 101.7099),
  -- Thailand
  ('THA', 'VTBS', 'Suvarnabhumi Airport Bangkok',        'مطار سوفارنابومي بانكوك',    13.6900, 100.7501),
  -- India
  ('IND', 'VIDP', 'Indira Gandhi International Airport', 'مطار إنديرا غاندي الدولي',   28.5562, 77.1000),
  ('IND', 'VABB', 'Chhatrapati Shivaji Mumbai Airport',  'مطار مومباي الدولي',         19.0868, 72.8654),
  -- Brazil
  ('BRA', 'SBGR', 'São Paulo-Guarulhos Airport',         'مطار ساو باولو غواروليوس',   -23.4356, -46.4731),
  -- South Africa
  ('ZAF', 'FAOR', 'O.R. Tambo International Airport',    'مطار أو آر تامبو الدولي',    -26.1392, 28.2460),
  -- Australia
  ('AUS', 'YSSY', 'Sydney Kingsford Smith Airport',      'مطار سيدني',                 -33.9461, 151.1772),
  ('AUS', 'YMML', 'Melbourne Airport',                   'مطار ملبورن',                -37.6733, 144.8433)
) AS v(country_code, code, name_en, name_ar, lat, lng)
JOIN countries c ON c.code = v.country_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. LAND PORTS / BORDER CROSSINGS - المنافذ البرية                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO ports (country_id, code, name, name_ar, name_en, port_type, latitude, longitude, is_international, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, 'land', v.lat, v.lng, true, true
FROM (VALUES
  -- Saudi Arabia Land Borders
  ('SAU', 'SABTH', 'Al Batha Border Crossing',          'منفذ البطحاء',            24.2536, 49.0322),
  ('SAU', 'SAKFJ', 'King Fahad Causeway',               'جسر الملك فهد',           26.1167, 50.3336),
  ('SAU', 'SAHLT', 'Halat Ammar Border Crossing',       'منفذ حالة عمار',          28.5000, 36.2000),
  ('SAU', 'SALARY', 'Al Raqi Border Post',               'منفذ الرقي',              28.3000, 46.0000),
  ('SAU', 'SATUWAL', 'Tuwal Border Post',                'منفذ طوال',               17.3500, 43.0000),
  ('SAU', 'SAALDRA', 'Al Durrah Border Post',            'منفذ الدرة',              29.0000, 47.0000),
  -- UAE Land Borders
  ('ARE', 'AEHLI', 'Hili Border Post',                  'منفذ هيلي',               24.2667, 55.7667),
  ('ARE', 'AEKHA', 'Khatm Al Shiklah',                  'منفذ ختم الشكلة',          24.2833, 55.9167),
  -- Jordan
  ('JOR', 'JOMDK', 'Mudawwara Border Crossing',         'منفذ المدورة',             29.3167, 36.0000),
  ('JOR', 'JOOMR', 'Omari Border Crossing',             'منفذ العمري',              32.1000, 36.2167)
) AS v(country_code, code, name_en, name_ar, lat, lng)
JOIN countries c ON c.code = v.country_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. CUSTOMS OFFICES - مكاتب الجمارك                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Saudi Arabia Customs
INSERT INTO customs_offices (country_id, code, name, name_ar, name_en, office_type, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, v.office_type, true
FROM (VALUES
  ('SACO-JED', 'Jeddah Islamic Port Customs',          'جمرك ميناء جدة الإسلامي',          'sea'),
  ('SACO-DMM', 'Dammam Port Customs',                  'جمرك ميناء الدمام',                'sea'),
  ('SACO-JUB', 'Jubail Port Customs',                  'جمرك ميناء الجبيل',                'sea'),
  ('SACO-YNB', 'Yanbu Port Customs',                   'جمرك ميناء ينبع',                  'sea'),
  ('SACO-JIZ', 'Jazan Port Customs',                   'جمرك ميناء جازان',                 'sea'),
  ('SACO-RUH', 'King Khalid Airport Customs',          'جمرك مطار الملك خالد الدولي',       'air'),
  ('SACO-JNA', 'King Abdulaziz Airport Customs',       'جمرك مطار الملك عبدالعزيز الدولي',  'air'),
  ('SACO-DMA', 'King Fahd Airport Customs',            'جمرك مطار الملك فهد الدولي',        'air'),
  ('SACO-BTH', 'Al Batha Land Customs',                'جمرك البطحاء البري',                'land'),
  ('SACO-KFC', 'King Fahad Causeway Customs',          'جمرك جسر الملك فهد',               'land'),
  ('SACO-HLT', 'Halat Ammar Customs',                  'جمرك حالة عمار',                   'land'),
  ('SACO-DRY', 'Riyadh Dry Port Customs',              'جمرك الميناء الجاف الرياض',         'dry_port'),
  ('SACO-PLM', 'Saudi Post Mail Customs',              'جمرك البريد السعودي',               'postal')
) AS v(code, name_en, name_ar, office_type)
CROSS JOIN countries c WHERE c.code = 'SAU'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, office_type = EXCLUDED.office_type;

-- UAE Customs
INSERT INTO customs_offices (country_id, code, name, name_ar, name_en, office_type, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, v.office_type, true
FROM (VALUES
  ('AECO-JBL', 'Jebel Ali Customs',                   'جمرك جبل علي',                     'sea'),
  ('AECO-KHL', 'Khalifa Port Customs',                'جمرك ميناء خليفة',                  'sea'),
  ('AECO-DXB', 'Dubai Airport Customs',               'جمرك مطار دبي',                    'air'),
  ('AECO-AUH', 'Abu Dhabi Airport Customs',           'جمرك مطار أبوظبي',                  'air'),
  ('AECO-SHJ', 'Sharjah Airport Customs',             'جمرك مطار الشارقة',                 'air'),
  ('AECO-FUJ', 'Fujairah Port Customs',               'جمرك ميناء الفجيرة',                'sea')
) AS v(code, name_en, name_ar, office_type)
CROSS JOIN countries c WHERE c.code = 'ARE'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, office_type = EXCLUDED.office_type;

-- Kuwait, Bahrain, Oman, Qatar Customs
INSERT INTO customs_offices (country_id, code, name, name_ar, name_en, office_type, is_active)
SELECT c.id, v.code, v.name_en, v.name_ar, v.name_en, v.office_type, true
FROM (VALUES
  ('KWT', 'KWCO-SHW', 'Shuwaikh Customs',             'جمرك الشويخ',             'sea'),
  ('KWT', 'KWCO-AIR', 'Kuwait Airport Customs',        'جمرك مطار الكويت',         'air'),
  ('BHR', 'BHCO-KBS', 'Khalifa Bin Salman Port Customs','جمرك ميناء خليفة بن سلمان','sea'),
  ('BHR', 'BHCO-AIR', 'Bahrain Airport Customs',       'جمرك مطار البحرين',        'air'),
  ('OMN', 'OMCO-SOH', 'Sohar Port Customs',            'جمرك ميناء صحار',          'sea'),
  ('OMN', 'OMCO-SLL', 'Salalah Port Customs',          'جمرك ميناء صلالة',         'sea'),
  ('OMN', 'OMCO-MSC', 'Muscat Airport Customs',        'جمرك مطار مسقط',           'air'),
  ('QAT', 'QACO-HAM', 'Hamad Port Customs',            'جمرك ميناء حمد',           'sea'),
  ('QAT', 'QACO-AIR', 'Hamad Airport Customs',         'جمرك مطار حمد الدولي',      'air')
) AS v(country_code, code, name_en, name_ar, office_type)
JOIN countries c ON c.code = v.country_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, office_type = EXCLUDED.office_type;


COMMIT;
