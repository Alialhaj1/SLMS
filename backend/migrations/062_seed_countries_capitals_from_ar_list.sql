-- 062_seed_countries_capitals_from_ar_list.sql
-- Seed countries + capital cities from Arabic list (الدولة|العاصمة|القارة)
-- الهدف: حفظ التنسيق والارتباطات (countries -> cities) كبيانات Global (company_id IS NULL)

BEGIN;

-- Source list with ISO codes (alpha-3 + alpha-2) + Arabic names/capitals
DROP TABLE IF EXISTS tmp_normalized;
DROP TABLE IF EXISTS tmp_normalized_countries;

CREATE TEMP TABLE tmp_normalized AS
WITH src(sort_order, name_ar, capital_ar, continent_ar, iso3, iso2) AS (
  VALUES
    (1,  'اليابان', 'طوكيو', 'آسيا', 'JPN', 'JP'),
    (2,  'روسيا', 'موسكو', 'آسيا', 'RUS', 'RU'),
    (3,  'كوريا الجنوبية', 'سيؤول', 'آسيا', 'KOR', 'KR'),
    (4,  'المكسيك', 'مكسيكو سيتي', 'أمريكا الشمالية', 'MEX', 'MX'),
    (5,  'إندونيسيا', 'جاكارتا', 'آسيا', 'IDN', 'ID'),
    (6,  'بيرو', 'ليما', 'أمريكا الجنوبية', 'PER', 'PE'),
    (7,  'الصين', 'بكين', 'آسيا', 'CHN', 'CN'),
    (8,  'مصر', 'القاهرة', 'أفريقيا', 'EGY', 'EG'),
    (9,  'إيران', 'طهران', 'آسيا', 'IRN', 'IR'),
    (10, 'المملكة المتحدة', 'لندن', 'أوروبا', 'GBR', 'GB'),
    (11, 'كولومبيا', 'بوغوتا', 'أمريكا الجنوبية', 'COL', 'CO'),
    (12, 'هونغ كونغ', 'هونغ كونغ', 'آسيا', 'HKG', 'HK'),
    (13, 'تايلاند', 'بانكوك', 'آسيا', 'THA', 'TH'),
    (14, 'بنغلادش', 'دكا', 'آسيا', 'BGD', 'BD'),
    (15, 'العراق', 'بغداد', 'آسيا', 'IRQ', 'IQ'),
    (16, 'السعودية', 'الرياض', 'آسيا', 'SAU', 'SA'),
    (17, 'تشيلي', 'سانتياغو', 'أمريكا الجنوبية', 'CHL', 'CL'),
    (18, 'سنغافورة', 'سنغافورة', 'آسيا', 'SGP', 'SG'),
    (19, 'جمهورية الكونغو الديمقراطية', 'كينشاسا', 'أفريقيا', 'COD', 'CD'),
    (20, 'تركيا', 'أنقرة', 'آسيا', 'TUR', 'TR'),
    (21, 'جنوب أفريقيا', 'كيب تاون', 'أفريقيا', 'ZAF', 'ZA'),
    (22, 'ألمانيا', 'برلين', 'أوروبا', 'DEU', 'DE'),
    (23, 'فيتنام', 'هانوي', 'آسيا', 'VNM', 'VN'),
    (24, 'إسبانيا', 'مدريد', 'أوروبا', 'ESP', 'ES'),
    (25, 'كوريا الشمالية', 'بيونغ يانغ', 'آسيا', 'PRK', 'KP'),
    (26, 'أفغانستان', 'كابول', 'آسيا', 'AFG', 'AF'),
    (27, 'الأرجنتين', 'بيونس أيرس', 'أمريكا الجنوبية', 'ARG', 'AR'),
    (28, 'إثيوبيا', 'أديس أبابا', 'أفريقيا', 'ETH', 'ET'),
    (29, 'كينيا', 'نيروبي', 'أفريقيا', 'KEN', 'KE'),
    (30, 'تايوان', 'تايبيه', 'آسيا', 'TWN', 'TW'),
    (31, 'البرازيل', 'برازيليا', 'أمريكا الجنوبية', 'BRA', 'BR'),
    (32, 'أوكرانيا', 'كييف', 'أوروبا', 'UKR', 'UA'),
    (33, 'إيطاليا', 'روما', 'أوروبا', 'ITA', 'IT'),
    (34, 'أنغولا', 'لواندا', 'أفريقيا', 'AGO', 'AO'),
    (35, 'سوريا', 'دمشق', 'آسيا', 'SYR', 'SY'),
    (36, 'كوبا', 'هافانا', 'أمريكا الشمالية', 'CUB', 'CU'),
    (37, 'أوزبكستان', 'طشقند', 'آسيا', 'UZB', 'UZ'),
    (38, 'فرنسا', 'باريس', 'أوروبا', 'FRA', 'FR'),
    (39, 'أذربيجان', 'باكو', 'أوروبا', 'AZE', 'AZ'),
    (40, 'رومانيا', 'بوخاريست', 'أوروبا', 'ROU', 'RO'),
    (41, 'جمهورية الدومينيكان', 'سانتو دومينجو', 'أمريكا الشمالية', 'DOM', 'DO'),
    (42, 'فنزويلا', 'كاراكاس', 'أمريكا الجنوبية', 'VEN', 'VE'),
    (43, 'المغرب', 'الرباط', 'أفريقيا', 'MAR', 'MA'),
    (44, 'السودان', 'الخرطوم', 'أفريقيا', 'SDN', 'SD'),
    (45, 'جنوب السودان', 'جوبا', 'أفريقيا', 'SSD', 'SS'),
    (46, 'المجر', 'بودابست', 'أوروبا', 'HUN', 'HU'),
    (47, 'بولندا', 'وارسو', 'أوروبا', 'POL', 'PL'),
    (48, 'روسيا البيضاء', 'منسك', 'أوروبا', 'BLR', 'BY'),
    (49, 'غانا', 'أكرا', 'أفريقيا', 'GHA', 'GH'),
    (50, 'الكاميرون', 'ياوندي', 'أفريقيا', 'CMR', 'CM'),
    (51, 'مدغشقر', 'أنتاناناريفو', 'أفريقيا', 'MDG', 'MG'),
    (52, 'لبنان', 'بيروت', 'آسيا', 'LBN', 'LB'),
    (53, 'الفلبين', 'مانيلا', 'آسيا', 'PHL', 'PH'),
    (54, 'النمسا', 'فيينا', 'أوروبا', 'AUT', 'AT'),
    (55, 'الجزائر', 'الجزائر', 'أفريقيا', 'DZA', 'DZ'),
    (56, 'الإكوادور', 'كيتو', 'أمريكا الجنوبية', 'ECU', 'EC'),
    (57, 'زيمبابوي', 'هراري', 'أفريقيا', 'ZWE', 'ZW'),
    (58, 'اليمن', 'صنعاء', 'آسيا', 'YEM', 'YE'),
    (59, 'غينيا', 'كوناكري', 'أفريقيا', 'GIN', 'GN'),
    (60, 'ماليزيا', 'كوالالامبور', 'آسيا', 'MYS', 'MY'),
    (61, 'الأوروغواي', 'مونتيفيديو', 'أمريكا الجنوبية', 'URY', 'UY'),
    (62, 'زامبيا', 'لوساكا', 'أفريقيا', 'ZMB', 'ZM'),
    (63, 'مالي', 'باماكو', 'أفريقيا', 'MLI', 'ML'),
    (64, 'أوغندا', 'كمبالا', 'أفريقيا', 'UGA', 'UG'),
    (65, 'هايتي', 'بورت أو برنس', 'أمريكا الشمالية', 'HTI', 'HT'),
    (66, 'الأردن', 'عمان', 'آسيا', 'JOR', 'JO'),
    (67, 'ليبيا', 'طرابلس', 'أفريقيا', 'LBY', 'LY'),
    (68, 'الكويت', 'الكويت', 'آسيا', 'KWT', 'KW'),
    (69, 'التشيك', 'براغ', 'أوروبا', 'CZE', 'CZ'),
    (70, 'صربيا', 'بلغراد', 'أوروبا', 'SRB', 'RS'),
    (71, 'الصومال', 'مقديشو', 'أفريقيا', 'SOM', 'SO'),
    (72, 'بلغاريا', 'صوفيا', 'أوروبا', 'BGR', 'BG'),
    (73, 'جمهورية الكونغو', 'برازافيل', 'أفريقيا', 'COG', 'CG'),
    (74, 'بلجيكا', 'بروكسل', 'أوروبا', 'BEL', 'BE'),
    (75, 'أرمينيا', 'يريفان', 'آسيا', 'ARM', 'AM'),
    (76, 'موزمبيق', 'مابوتو', 'أفريقيا', 'MOZ', 'MZ'),
    (77, 'جورجيا', 'تبليسي', 'آسيا', 'GEO', 'GE'),
    (78, 'السنغال', 'داكار', 'أفريقيا', 'SEN', 'SN'),
    (79, 'بوركينا فاسو', 'واغادوغو', 'أفريقيا', 'BFA', 'BF'),
    (80, 'إيرلندا', 'دبلن', 'أوروبا', 'IRL', 'IE'),
    (81, 'غواتيمالا', 'غواتيمالا', 'أمريكا الشمالية', 'GTM', 'GT'),
    (82, 'ميانمار', 'نايبيداو', 'آسيا', 'MMR', 'MM'),
    (83, 'قيرغيزستان', 'بشكيك', 'آسيا', 'KGZ', 'KG'),
    (84, 'توغو', 'لومي', 'أفريقيا', 'TGO', 'TG'),
    (85, 'بنما', 'بنما', 'أمريكا الشمالية', 'PAN', 'PA'),
    (86, 'بوليفيا', 'لا باز', 'أمريكا الجنوبية', 'BOL', 'BO'),
    (87, 'نيبال', 'كاثماندو', 'آسيا', 'NPL', 'NP'),
    (88, 'سلطنة عُمان', 'مسقط', 'آسيا', 'OMN', 'OM'),
    (89, 'النيجر', 'نيامي', 'أفريقيا', 'NER', 'NE'),
    (90, 'نيجيريا', 'أبوجا', 'أفريقيا', 'NGA', 'NG'),
    (91, 'السويد', 'ستوكهولم', 'أوروبا', 'SWE', 'SE'),
    (92, 'تونس', 'تونس', 'أفريقيا', 'TUN', 'TN'),
    (93, 'تركمانستان', 'عشق آباد', 'آسيا', 'TKM', 'TM'),
    (94, 'تشاد', 'إنجامينا', 'أفريقيا', 'TCD', 'TD'),
    (95, 'فلسطين', 'القدس الشريف', 'آسيا', 'PSE', 'PS'),
    (96, 'هولندا', 'أمستردام', 'أوروبا', 'NLD', 'NL'),
    (97, 'جمهورية أفريقيا الوسطى', 'بانغي', 'أفريقيا', 'CAF', 'CF'),
    (98, 'كندا', 'أوتاوا', 'أمريكا الشمالية', 'CAN', 'CA'),
    (99, 'اليونان', 'أثينا', 'أوروبا', 'GRC', 'GR'),
    (100,'موريتانيا', 'نواكشوط', 'أفريقيا', 'MRT', 'MR'),
    (101,'رواندا', 'كيغالي', 'أفريقيا', 'RWA', 'RW'),
    (102,'لاتفيا', 'ريغا', 'أوروبا', 'LVA', 'LV'),
    (103,'سانت فينسنت والغرينادين', 'كينغستون', 'أمريكا الشمالية', 'VCT', 'VC'),
    (104,'كازاخستان', 'أستانا', 'آسيا', 'KAZ', 'KZ'),
    (105,'كرواتيا', 'زغرب', 'أوروبا', 'HRV', 'HR'),
    (106,'كمبوديا', 'بنوم بنه', 'آسيا', 'KHM', 'KH'),
    (107,'مولدافيا', 'كيشيناو', 'أوروبا', 'MDA', 'MD'),
    (108,'الولايات المتحدة الأمريكية', 'واشنطن دي سي', 'أمريكا الشمالية', 'USA', 'US'),
    (109,'الإمارات', 'أبو ظبي', 'آسيا', 'ARE', 'AE'),
    (110,'طاجيكستان', 'دوشنبه', 'آسيا', 'TJK', 'TJ'),
    (111,'فنلندا', 'هلسنكي', 'أوروبا', 'FIN', 'FI'),
    (112,'ليتوانيا', 'فيلنيوس', 'أوروبا', 'LTU', 'LT'),
    (113,'الغابون', 'ليبرفيل', 'أفريقيا', 'GAB', 'GA'),
    (114,'إريتريا', 'أسمرة', 'أفريقيا', 'ERI', 'ER'),
    (115,'النرويج', 'أوسلو', 'أوروبا', 'NOR', 'NO'),
    (116,'البرتغال', 'لشبونة', 'أوروبا', 'PRT', 'PT'),
    (117,'السلفادور', 'سان سلفادور', 'أمريكا الشمالية', 'SLV', 'SV'),
    (118,'باراغواي', 'أسونسيون', 'أمريكا الجنوبية', 'PRY', 'PY'),
    (119,'ماكاو', 'ماكاو', 'آسيا', 'MAC', 'MO'),
    (120,'ناورو', 'يارين', 'أوقيانوسيا', 'NRU', 'NR'),
    (121,'مقدونيا الشمالية', 'سكوبيه', 'أوروبا', 'MKD', 'MK'),
    (122,'الدنمارك', 'كوبنهاغن', 'أوروبا', 'DNK', 'DK'),
    (123,'ساحل العاج', 'ياموسوكرو', 'أفريقيا', 'CIV', 'CI'),
    (124,'غينيا بيساو', 'بيساو', 'أفريقيا', 'GNB', 'GW'),
    (125,'سلوفاكيا', 'براتيسلافا', 'أوروبا', 'SVK', 'SK'),
    (126,'إستونيا', 'تالين', 'أوروبا', 'EST', 'EE'),
    (127,'بوروندي', 'جيتيغا', 'أفريقيا', 'BDI', 'BI'),
    (128,'البوسنة والهرسك', 'سراييفو', 'أوروبا', 'BIH', 'BA'),
    (129,'نيوزيلندا', 'ويلينغتون', 'أوقيانوسيا', 'NZL', 'NZ'),
    (130,'ألبانيا', 'تيرانا', 'أوروبا', 'ALB', 'AL'),
    (131,'أستراليا', 'كانبرا', 'أوقيانوسيا', 'AUS', 'AU'),
    (132,'كوستاريكا', 'سان خوسيه', 'أمريكا الشمالية', 'CRI', 'CR'),
    (133,'قطر', 'الدوحة', 'آسيا', 'QAT', 'QA'),
    (134,'بابوا غينيا الجديدة', 'بورت مورسبي', 'أوقيانوسيا', 'PNG', 'PG'),
    (135,'تنزانيا', 'دودوما', 'أفريقيا', 'TZA', 'TZ'),
    (136,'الهند', 'نيودلهي', 'آسيا', 'IND', 'IN'),
    (137,'لاوس', 'فينتيان', 'آسيا', 'LAO', 'LA'),
    (138,'قبرص', 'نيقوسيا', 'أوروبا', 'CYP', 'CY'),
    (139,'ليسوتو', 'ماسيرو', 'أفريقيا', 'LSO', 'LS'),
    (140,'سلوفينيا', 'لوبليانا', 'أوروبا', 'SVN', 'SI'),
    (141,'سورينام', 'باراماريبو', 'أمريكا الجنوبية', 'SUR', 'SR'),
    (142,'ناميبيا', 'ويندهوك', 'أفريقيا', 'NAM', 'NA'),
    (143,'بوتسوانا', 'غابورون', 'أفريقيا', 'BWA', 'BW'),
    (144,'بنين', 'بورتو نوفو', 'أفريقيا', 'BEN', 'BJ'),
    (145,'بوليفيا', 'سوكري', 'أمريكا الجنوبية', 'BOL', 'BO'),
    (146,'موريشيوس', 'بورت لويس', 'أفريقيا', 'MUS', 'MU'),
    (147,'الجبل الأسود', 'بودغوريتشا', 'أوروبا', 'MNE', 'ME'),
    (148,'البحرين', 'المنامة', 'آسيا', 'BHR', 'BH'),
    (149,'غيانا', 'جورج تاون', 'أمريكا الجنوبية', 'GUY', 'GY'),
    (150,'الرأس الأخضر', 'برايا', 'أفريقيا', 'CPV', 'CV'),
    (151,'سويسرا', 'برن', 'أوروبا', 'CHE', 'CH'),
    (152,'آيسلندا', 'ريكيافيك', 'أوروبا', 'ISL', 'IS'),
    (153,'جزر المالديف', 'ماليه', 'آسيا', 'MDV', 'MV'),
    (154,'بوتان', 'تيمفو', 'آسيا', 'BTN', 'BT'),
    (155,'غينيا الاستوائية', 'مالابو', 'أفريقيا', 'GNQ', 'GQ'),
    (156,'فيجي', 'سوفا', 'أوقيانوسيا', 'FJI', 'FJ'),
    (157,'إسواتيني', 'مبابان', 'أفريقيا', 'SWZ', 'SZ'),
    (158,'لوكسمبورغ', 'لوكسمبورغ', 'أوروبا', 'LUX', 'LU'),
    (159,'جزر القمر', 'موروني', 'أفريقيا', 'COM', 'KM'),
    (160,'تيمور الشرقية', 'ديلي', 'آسيا', 'TLS', 'TL'),
    (161,'سانت لوسيا', 'كاستريس', 'أمريكا الشمالية', 'LCA', 'LC'),
    (162,'ساوتوميه وبرينسيب', 'ساوتوميه', 'أفريقيا', 'STP', 'ST'),
    (163,'ترينيداد وتوباغو', 'بورت أوف سبين', 'أمريكا الجنوبية', 'TTO', 'TT'),
    (164,'ساموا', 'أبيا', 'أوقيانوسيا', 'WSM', 'WS'),
    (165,'فانواتو', 'بورت فيلا', 'أوقيانوسيا', 'VUT', 'VU'),
    (166,'موناكو', 'موناكو', 'أوروبا', 'MCO', 'MC'),
    (167,'سيشل', 'فيكتوريا', 'أفريقيا', 'SYC', 'SC'),
    (168,'بروناي', 'بندر سري بكاوان', 'آسيا', 'BRN', 'BN'),
    (169,'أندورا', 'أندورا لا فيلا', 'أوروبا', 'AND', 'AD'),
    (170,'أنتيغوا وباربودا', 'سانت جونز', 'أمريكا الشمالية', 'ATG', 'AG'),
    (171,'تونغا', 'نوكو ألوفا', 'أوقيانوسيا', 'TON', 'TO'),
    (172,'سانت كيتس ونيفيس', 'باستير', 'أمريكا الشمالية', 'KNA', 'KN'),
    (173,'بليز', 'بلموبان', 'أمريكا الشمالية', 'BLZ', 'BZ'),
    (174,'غرينادا', 'سانت جورجز', 'أمريكا الشمالية', 'GRD', 'GD'),
    (175,'مالطا', 'فاليتا', 'أوروبا', 'MLT', 'MT'),
    (176,'سان مارينو', 'سان مارينو', 'أوروبا', 'SMR', 'SM'),
    (177,'توفالو', 'فونافوتي', 'أوقيانوسيا', 'TUV', 'TV'),
    (178,'الفاتيكان', 'الفاتيكان', 'أوروبا', 'VAT', 'VA'),
    (179,'باكستان', 'إسلام أباد', 'آسيا', 'PAK', 'PK'),
    (180,'مالاوي', 'ليلونغوي', 'أفريقيا', 'MWI', 'MW'),
    (181,'ليبيريا', 'مونروفيا', 'أفريقيا', 'LBR', 'LR'),
    (182,'كوسوفو', 'بريشتينا', 'أوروبا', 'XKX', 'XK'),
    (183,'كيريباتي', 'تاراوا', 'أوقيانوسيا', 'KIR', 'KI'),
    (184,'الباهاماس', 'ناساو', 'أمريكا الشمالية', 'BHS', 'BS'),
    (185,'باربادوس', 'بريدج تاون', 'أمريكا الشمالية', 'BRB', 'BB'),
    (186,'جيبوتي', 'جيبوتي', 'أفريقيا', 'DJI', 'DJ'),
    (187,'دومينيكا', 'روسو', 'أمريكا الشمالية', 'DMA', 'DM'),
    (188,'غامبيا', 'بانجول', 'أفريقيا', 'GMB', 'GM'),
    (189,'هندوراس', 'تيغوسيغالبا', 'أمريكا الشمالية', 'HND', 'HN'),
    (190,'جزر مارشال', 'ماجورو', 'أوقيانوسيا', 'MHL', 'MH'),
    (191,'ولايات ميكرونيسيا المتحدة', 'باليكير', 'أوقيانوسيا', 'FSM', 'FM'),
    (192,'منغوليا', 'أولان باتور', 'آسيا', 'MNG', 'MN'),
    (193,'نيكاراغوا', 'ماناغوا', 'أمريكا الشمالية', 'NIC', 'NI'),
    (194,'بالاو', 'نغيرولمود', 'أوقيانوسيا', 'PLW', 'PW'),
    (195,'سريلانكا', 'كولمبو', 'آسيا', 'LKA', 'LK'),
    (196,'سيراليون', 'فريتاون', 'أفريقيا', 'SLE', 'SL')
),
continent_map(continent_ar, continent_en) AS (
  VALUES
    ('آسيا', 'Asia'),
    ('أوروبا', 'Europe'),
    ('أفريقيا', 'Africa'),
    ('أمريكا الشمالية', 'North America'),
    ('أمريكا الجنوبية', 'South America'),
    ('أوقيانوسيا', 'Oceania')
),
normalized AS (
  SELECT
    s.sort_order,
    s.name_ar,
    s.capital_ar,
    s.continent_ar,
    COALESCE(cm.continent_en, s.continent_ar) AS continent_en,
    s.iso3,
    s.iso2
  FROM src s
  LEFT JOIN continent_map cm ON cm.continent_ar = s.continent_ar
)
SELECT * FROM normalized;

CREATE TEMP TABLE tmp_normalized_countries AS
SELECT DISTINCT ON (iso3)
  sort_order,
  name_ar,
  capital_ar,
  continent_ar,
  continent_en,
  iso3,
  iso2
FROM tmp_normalized
ORDER BY iso3, sort_order;

-- 1) Upsert countries
INSERT INTO countries (code, code_2, name, name_ar, region, is_active)
SELECT
  n.iso3,
  n.iso2,
  n.name_ar,
  n.name_ar,
  n.continent_en,
  TRUE
FROM tmp_normalized_countries n
ON CONFLICT (code)
DO UPDATE SET
  code_2 = COALESCE(countries.code_2, EXCLUDED.code_2),
  name_ar = COALESCE(EXCLUDED.name_ar, countries.name_ar),
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- 2) Fill enhanced columns if they exist (continent/capitals/alpha_2/name_en/sort_order/company_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='alpha_2') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET alpha_2 = COALESCE(c.alpha_2, n.iso2)
      FROM tmp_normalized_countries n
      WHERE c.code = n.iso3
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='continent') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET continent = COALESCE(c.continent, n.continent_en)
      FROM tmp_normalized_countries n
      WHERE c.code = n.iso3
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='capital_ar') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET capital_ar = COALESCE(c.capital_ar, n.capital_ar)
      FROM tmp_normalized_countries n
      WHERE c.code = n.iso3
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='capital_en') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET capital_en = COALESCE(c.capital_en, n.capital_ar)
      FROM tmp_normalized_countries n
      WHERE c.code = n.iso3
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET name_en = COALESCE(c.name_en, c.name)
      WHERE c.name_en IS NULL OR c.name_en = ''
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='sort_order') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET sort_order = COALESCE(c.sort_order, n.sort_order)
      FROM tmp_normalized_countries n
      WHERE c.code = n.iso3
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='company_id') THEN
    EXECUTE $sql$
      UPDATE countries c
      SET company_id = NULL
      WHERE c.code IN (SELECT iso3 FROM tmp_normalized_countries)
    $sql$;
  END IF;

END $$;

-- 3) Insert capital cities as global rows (company_id NULL)
DO $$
DECLARE
  rec RECORD;
  countryId INTEGER;
  cityCode TEXT;
  existingCityId INTEGER;
BEGIN
  FOR rec IN SELECT * FROM tmp_normalized LOOP
    SELECT id INTO countryId FROM countries WHERE code = rec.iso3;
    IF countryId IS NULL THEN
      CONTINUE;
    END IF;

    cityCode := rec.iso3 || '-CAP';

    -- Prefer reusing an existing city for the same country (by code OR Arabic name) to avoid duplicates.
    SELECT id INTO existingCityId
    FROM cities
    WHERE country_id = countryId
      AND company_id IS NULL
      AND deleted_at IS NULL
      AND (
        code = cityCode
        OR name_ar = rec.capital_ar
        OR name = rec.capital_ar
      )
    ORDER BY (code = cityCode) DESC
    LIMIT 1;

    IF existingCityId IS NULL THEN
      INSERT INTO cities (country_id, code, name, name_ar, is_port_city, is_active, company_id)
      VALUES (countryId, cityCode, rec.capital_ar, rec.capital_ar, FALSE, TRUE, NULL);
    END IF;

  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='name_en') THEN
    EXECUTE $sql$
      UPDATE cities SET name_en = name
      WHERE code LIKE '%-CAP' AND (name_en IS NULL OR name_en = '')
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='is_capital') THEN
    EXECUTE $sql$
      UPDATE cities SET is_capital = TRUE
      WHERE code LIKE '%-CAP'
    $sql$;
  END IF;

  -- If is_capital exists, also mark any city whose Arabic name matches the capital list.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities' AND column_name='is_capital') THEN
    EXECUTE $sql$
      UPDATE cities c
      SET is_capital = TRUE
      FROM tmp_normalized n
      JOIN countries co ON co.code = n.iso3
      WHERE c.country_id = co.id
        AND c.company_id IS NULL
        AND c.deleted_at IS NULL
        AND c.name_ar = n.capital_ar
    $sql$;
  END IF;

END $$;

COMMIT;
