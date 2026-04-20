-- ============================================================================
-- 424: بيانات مرجعية شاملة - جميع عملات العالم وأسعار الصرف
-- Comprehensive Reference Data - All World Currencies (ISO 4217) + Exchange Rates
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ ALL WORLD CURRENCIES - جميع عملات العالم (ISO 4217)                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO currencies (code, name, name_en, name_ar, symbol, decimal_places, subunit_en, subunit_ar, is_base_currency, is_active, sort_order)
VALUES
  -- العملات الرئيسية - Major Currencies
  ('SAR', 'Saudi Riyal',              'Saudi Riyal',              'ريال سعودي',           '﷼',   2, 'Halala',   'هللة',      true,  true, 1),
  ('USD', 'US Dollar',                'US Dollar',                'دولار أمريكي',         '$',   2, 'Cent',     'سنت',       false, true, 2),
  ('EUR', 'Euro',                     'Euro',                     'يورو',                 '€',   2, 'Cent',     'سنت',       false, true, 3),
  ('GBP', 'British Pound',            'British Pound Sterling',   'جنيه إسترليني',        '£',   2, 'Penny',    'بنس',       false, true, 4),
  ('JPY', 'Japanese Yen',             'Japanese Yen',             'ين ياباني',             '¥',   0, 'Sen',      'سن',        false, true, 5),
  ('CNY', 'Chinese Yuan',             'Chinese Yuan Renminbi',    'يوان صيني',             '¥',   2, 'Fen',      'فن',        false, true, 6),
  ('CHF', 'Swiss Franc',              'Swiss Franc',              'فرنك سويسري',          'Fr',  2, 'Rappen',   'رابن',      false, true, 7),
  ('CAD', 'Canadian Dollar',          'Canadian Dollar',          'دولار كندي',           'C$',  2, 'Cent',     'سنت',       false, true, 8),
  ('AUD', 'Australian Dollar',        'Australian Dollar',        'دولار أسترالي',        'A$',  2, 'Cent',     'سنت',       false, true, 9),
  -- عملات الخليج - GCC Currencies
  ('AED', 'UAE Dirham',               'UAE Dirham',               'درهم إماراتي',         'د.إ', 2, 'Fils',     'فلس',       false, true, 10),
  ('KWD', 'Kuwaiti Dinar',            'Kuwaiti Dinar',            'دينار كويتي',          'د.ك', 3, 'Fils',     'فلس',       false, true, 11),
  ('BHD', 'Bahraini Dinar',           'Bahraini Dinar',           'دينار بحريني',         'د.ب', 3, 'Fils',     'فلس',       false, true, 12),
  ('OMR', 'Omani Rial',               'Omani Rial',               'ريال عُماني',           'ر.ع', 3, 'Baisa',    'بيسة',      false, true, 13),
  ('QAR', 'Qatari Riyal',             'Qatari Riyal',             'ريال قطري',            'ر.ق', 2, 'Dirham',   'درهم',      false, true, 14),
  -- عملات عربية - Arab Currencies
  ('EGP', 'Egyptian Pound',           'Egyptian Pound',           'جنيه مصري',            'ج.م', 2, 'Piastre',  'قرش',       false, true, 15),
  ('JOD', 'Jordanian Dinar',          'Jordanian Dinar',          'دينار أردني',          'د.ا', 3, 'Piastre',  'قرش',       false, true, 16),
  ('LBP', 'Lebanese Pound',           'Lebanese Pound',           'ليرة لبنانية',         'ل.ل', 2, 'Piastre',  'قرش',       false, true, 17),
  ('IQD', 'Iraqi Dinar',              'Iraqi Dinar',              'دينار عراقي',          'ع.د', 3, 'Fils',     'فلس',       false, true, 18),
  ('SYP', 'Syrian Pound',             'Syrian Pound',             'ليرة سورية',           'ل.س', 2, 'Piastre',  'قرش',       false, true, 19),
  ('YER', 'Yemeni Rial',              'Yemeni Rial',              'ريال يمني',            'ر.ي', 2, 'Fils',     'فلس',       false, true, 20),
  ('SDG', 'Sudanese Pound',           'Sudanese Pound',           'جنيه سوداني',          'ج.س', 2, 'Piastre',  'قرش',       false, true, 21),
  ('LYD', 'Libyan Dinar',             'Libyan Dinar',             'دينار ليبي',           'ل.د', 3, 'Dirham',   'درهم',      false, true, 22),
  ('TND', 'Tunisian Dinar',           'Tunisian Dinar',           'دينار تونسي',          'د.ت', 3, 'Millime',  'مليم',      false, true, 23),
  ('MAD', 'Moroccan Dirham',          'Moroccan Dirham',          'درهم مغربي',           'د.م', 2, 'Centime',  'سنتيم',     false, true, 24),
  ('DZD', 'Algerian Dinar',           'Algerian Dinar',           'دينار جزائري',         'د.ج', 2, 'Centime',  'سنتيم',     false, true, 25),
  ('MRU', 'Mauritanian Ouguiya',      'Mauritanian Ouguiya',      'أوقية موريتانية',      'أ.م', 2, 'Khoums',   'خمس',       false, true, 26),
  ('SOS', 'Somali Shilling',          'Somali Shilling',          'شلن صومالي',           'Sh',  2, 'Cent',     'سنت',       false, true, 27),
  ('DJF', 'Djiboutian Franc',         'Djiboutian Franc',         'فرنك جيبوتي',          'Fdj', 0, 'Centime',  'سنتيم',     false, true, 28),
  ('KMF', 'Comorian Franc',           'Comorian Franc',           'فرنك قمري',            'CF',  0, 'Centime',  'سنتيم',     false, true, 29),
  -- عملات آسيوية - Asian Currencies
  ('INR', 'Indian Rupee',             'Indian Rupee',             'روبية هندية',          '₹',   2, 'Paisa',    'بيسة',      false, true, 30),
  ('PKR', 'Pakistani Rupee',          'Pakistani Rupee',          'روبية باكستانية',      'Rs',  2, 'Paisa',    'بيسة',      false, true, 31),
  ('BDT', 'Bangladeshi Taka',         'Bangladeshi Taka',         'تاكا بنغلاديشي',       '৳',   2, 'Poisha',   'بويشا',     false, true, 32),
  ('LKR', 'Sri Lankan Rupee',         'Sri Lankan Rupee',         'روبية سريلانكية',      'Rs',  2, 'Cent',     'سنت',       false, true, 33),
  ('NPR', 'Nepalese Rupee',           'Nepalese Rupee',           'روبية نيبالية',        'Rs',  2, 'Paisa',    'بيسة',      false, true, 34),
  ('IDR', 'Indonesian Rupiah',        'Indonesian Rupiah',        'روبية إندونيسية',      'Rp',  2, 'Sen',      'سن',        false, true, 35),
  ('MYR', 'Malaysian Ringgit',        'Malaysian Ringgit',        'رينغيت ماليزي',        'RM',  2, 'Sen',      'سن',        false, true, 36),
  ('SGD', 'Singapore Dollar',         'Singapore Dollar',         'دولار سنغافوري',       'S$',  2, 'Cent',     'سنت',       false, true, 37),
  ('THB', 'Thai Baht',                'Thai Baht',                'بات تايلندي',          '฿',   2, 'Satang',   'ساتانغ',    false, true, 38),
  ('PHP', 'Philippine Peso',          'Philippine Peso',          'بيسو فلبيني',          '₱',   2, 'Centavo',  'سنتافو',    false, true, 39),
  ('VND', 'Vietnamese Dong',          'Vietnamese Dong',          'دونغ فيتنامي',         '₫',   0, 'Hao',      'هاو',       false, true, 40),
  ('KRW', 'South Korean Won',         'South Korean Won',         'وون كوري جنوبي',       '₩',   0, 'Jeon',     'جون',       false, true, 41),
  ('TWD', 'New Taiwan Dollar',        'New Taiwan Dollar',        'دولار تايواني جديد',   'NT$', 2, 'Cent',     'سنت',       false, true, 42),
  ('HKD', 'Hong Kong Dollar',         'Hong Kong Dollar',         'دولار هونغ كونغ',      'HK$', 2, 'Cent',     'سنت',       false, true, 43),
  ('MMK', 'Myanmar Kyat',             'Myanmar Kyat',             'كيات ميانمار',         'K',   2, 'Pya',      'بيا',       false, true, 44),
  ('KHR', 'Cambodian Riel',           'Cambodian Riel',           'ريال كمبودي',          '៛',   2, 'Sen',      'سن',        false, true, 45),
  ('LAK', 'Lao Kip',                  'Lao Kip',                  'كيب لاوي',             '₭',   2, 'Att',      'آت',        false, true, 46),
  ('MNT', 'Mongolian Tugrik',         'Mongolian Tugrik',         'توغريك منغولي',        '₮',   2, 'Mongo',    'مونغو',     false, true, 47),
  ('AFN', 'Afghan Afghani',           'Afghan Afghani',           'أفغاني أفغانستاني',    '؋',   2, 'Pul',      'بول',       false, true, 48),
  ('IRR', 'Iranian Rial',             'Iranian Rial',             'ريال إيراني',          '﷼',   2, 'Dinar',    'دينار',     false, true, 49),
  ('TRY', 'Turkish Lira',             'Turkish Lira',             'ليرة تركية',           '₺',   2, 'Kurus',    'قرش',       false, true, 50),
  ('ILS', 'Israeli Shekel',           'Israeli New Shekel',       'شيكل إسرائيلي',        '₪',   2, 'Agora',    'أغورة',     false, true, 51),
  ('GEL', 'Georgian Lari',            'Georgian Lari',            'لاري جورجي',           '₾',   2, 'Tetri',    'تتري',      false, true, 52),
  ('AZN', 'Azerbaijani Manat',        'Azerbaijani Manat',        'مانات أذربيجاني',      '₼',   2, 'Qəpik',    'غبيك',      false, true, 53),
  ('AMD', 'Armenian Dram',            'Armenian Dram',            'درام أرميني',          '֏',   2, 'Luma',     'لوما',      false, true, 54),
  ('KZT', 'Kazakh Tenge',             'Kazakhstani Tenge',        'تنغة كازاخستاني',      '₸',   2, 'Tiyin',    'تيين',      false, true, 55),
  ('UZS', 'Uzbekistani Som',          'Uzbekistani Som',          'سوم أوزبكستاني',       'soʻm',2, 'Tiyin',    'تيين',      false, true, 56),
  ('KGS', 'Kyrgyzstani Som',          'Kyrgyzstani Som',          'سوم قيرغيزستاني',      'сом', 2, 'Tyiyn',    'تيين',      false, true, 57),
  ('TJS', 'Tajikistani Somoni',       'Tajikistani Somoni',       'سوموني طاجيكستاني',    'SM',  2, 'Diram',    'ديرم',      false, true, 58),
  ('TMT', 'Turkmenistani Manat',      'Turkmenistani Manat',      'مانات تركمانستاني',    'm',   2, 'Tenge',    'تنغة',      false, true, 59),
  -- عملات أوروبية (غير اليورو) - European Currencies (non-Euro)
  ('RUB', 'Russian Ruble',            'Russian Ruble',            'روبل روسي',            '₽',   2, 'Kopek',    'كوبيك',     false, true, 60),
  ('SEK', 'Swedish Krona',            'Swedish Krona',            'كرونة سويدية',         'kr',  2, 'Öre',      'أوره',      false, true, 61),
  ('NOK', 'Norwegian Krone',          'Norwegian Krone',          'كرونة نرويجية',        'kr',  2, 'Øre',      'أوره',      false, true, 62),
  ('DKK', 'Danish Krone',             'Danish Krone',             'كرونة دنماركية',       'kr',  2, 'Øre',      'أوره',      false, true, 63),
  ('PLN', 'Polish Zloty',             'Polish Zloty',             'زلوتي بولندي',         'zł',  2, 'Grosz',    'غروش',      false, true, 64),
  ('CZK', 'Czech Koruna',             'Czech Koruna',             'كرونة تشيكية',         'Kč',  2, 'Haléř',    'هالير',     false, true, 65),
  ('HUF', 'Hungarian Forint',         'Hungarian Forint',         'فورنت مجري',           'Ft',  2, 'Fillér',   'فيلير',     false, true, 66),
  ('RON', 'Romanian Leu',             'Romanian Leu',             'ليو روماني',           'lei', 2, 'Ban',      'بان',       false, true, 67),
  ('BGN', 'Bulgarian Lev',            'Bulgarian Lev',            'ليف بلغاري',           'лв',  2, 'Stotinka', 'ستوتينكا',  false, true, 68),
  ('UAH', 'Ukrainian Hryvnia',        'Ukrainian Hryvnia',        'هريفنيا أوكرانية',     '₴',   2, 'Kopiyka',  'كوبيكا',    false, true, 69),
  ('HRK', 'Croatian Kuna',            'Croatian Kuna',            'كونا كرواتية',         'kn',  2, 'Lipa',     'ليبا',      false, false, 70),  -- Replaced by EUR Jan 2023
  ('RSD', 'Serbian Dinar',            'Serbian Dinar',            'دينار صربي',           'din', 2, 'Para',     'بارا',      false, true, 71),
  ('ISK', 'Icelandic Krona',          'Icelandic Króna',          'كرونة أيسلندية',       'kr',  0, 'Aurar',    'أورار',     false, true, 72),
  ('ALL', 'Albanian Lek',             'Albanian Lek',             'ليك ألباني',           'L',   2, 'Qindarkë', 'كيندراكا',  false, true, 74),
  ('MKD', 'Macedonian Denar',         'Macedonian Denar',         'دينار مقدوني',         'ден', 2, 'Deni',     'ديني',      false, true, 75),
  ('BAM', 'Bosnian Mark',             'Bosnia Convertible Mark',  'مارك بوسني',           'KM',  2, 'Fening',   'فينينغ',    false, true, 76),
  ('MDL', 'Moldovan Leu',             'Moldovan Leu',             'ليو مولدافي',          'L',   2, 'Ban',      'بان',       false, true, 77),
  ('BYN', 'Belarusian Ruble',         'Belarusian Ruble',         'روبل بيلاروسي',        'Br',  2, 'Kopek',    'كوبيك',     false, true, 78),
  -- عملات أفريقية - African Currencies
  ('ZAR', 'South African Rand',       'South African Rand',       'راند جنوب أفريقي',     'R',   2, 'Cent',     'سنت',       false, true, 79),
  ('NGN', 'Nigerian Naira',           'Nigerian Naira',           'نيرا نيجيرية',         '₦',   2, 'Kobo',     'كوبو',      false, true, 80),
  ('KES', 'Kenyan Shilling',          'Kenyan Shilling',          'شلن كيني',             'KSh', 2, 'Cent',     'سنت',       false, true, 81),
  ('ETB', 'Ethiopian Birr',           'Ethiopian Birr',           'بر إثيوبي',            'Br',  2, 'Santim',   'سنتيم',     false, true, 82),
  ('GHS', 'Ghanaian Cedi',            'Ghanaian Cedi',            'سيدي غاني',            'GH₵', 2, 'Pesewa',   'بيسيوا',    false, true, 83),
  ('TZS', 'Tanzanian Shilling',       'Tanzanian Shilling',       'شلن تنزاني',           'TSh', 2, 'Cent',     'سنت',       false, true, 84),
  ('UGX', 'Ugandan Shilling',         'Ugandan Shilling',         'شلن أوغندي',           'USh', 0, 'Cent',     'سنت',       false, true, 85),
  ('RWF', 'Rwandan Franc',            'Rwandan Franc',            'فرنك رواندي',          'RF',  0, 'Centime',  'سنتيم',     false, true, 86),
  ('MGA', 'Malagasy Ariary',          'Malagasy Ariary',          'أرياري ملغاشي',        'Ar',  2, 'Iraimbilanja','إيرايمبيلانجا', false, true, 87),
  ('XOF', 'West African CFA Franc',   'West African CFA Franc',   'فرنك غرب أفريقي',      'CFA', 0, 'Centime',  'سنتيم',     false, true, 88),
  ('XAF', 'Central African CFA Franc','Central African CFA Franc','فرنك وسط أفريقي',      'FCFA',0, 'Centime',  'سنتيم',     false, true, 89),
  ('ZMW', 'Zambian Kwacha',           'Zambian Kwacha',           'كواشا زامبية',         'ZK',  2, 'Ngwee',    'نغوي',      false, true, 90),
  ('MZN', 'Mozambican Metical',       'Mozambican Metical',       'ميتكال موزمبيقي',      'MT',  2, 'Centavo',  'سنتافو',    false, true, 91),
  ('AOA', 'Angolan Kwanza',           'Angolan Kwanza',           'كوانزا أنغولي',        'Kz',  2, 'Cêntimo',  'سنتيمو',    false, true, 92),
  ('BWP', 'Botswana Pula',            'Botswana Pula',            'بولا بتسوانية',        'P',   2, 'Thebe',    'ثيبي',      false, true, 93),
  ('MWK', 'Malawian Kwacha',          'Malawian Kwacha',          'كواشا مالاوية',        'MK',  2, 'Tambala',  'تمبالا',    false, true, 94),
  ('SCR', 'Seychellois Rupee',        'Seychellois Rupee',        'روبية سيشيلية',        'SR',  2, 'Cent',     'سنت',       false, true, 95),
  ('MUR', 'Mauritian Rupee',          'Mauritian Rupee',          'روبية موريشيوسية',     'Rs',  2, 'Cent',     'سنت',       false, true, 96),
  -- عملات أمريكية - American Currencies
  ('BRL', 'Brazilian Real',           'Brazilian Real',           'ريال برازيلي',         'R$',  2, 'Centavo',  'سنتافو',    false, true, 97),
  ('MXN', 'Mexican Peso',             'Mexican Peso',             'بيسو مكسيكي',          'Mex$',2, 'Centavo',  'سنتافو',    false, true, 98),
  ('ARS', 'Argentine Peso',           'Argentine Peso',           'بيسو أرجنتيني',        'AR$', 2, 'Centavo',  'سنتافو',    false, true, 99),
  ('CLP', 'Chilean Peso',             'Chilean Peso',             'بيسو تشيلي',           'CL$', 0, 'Centavo',  'سنتافو',    false, true, 100),
  ('COP', 'Colombian Peso',           'Colombian Peso',           'بيسو كولومبي',         'COL$',2, 'Centavo',  'سنتافو',    false, true, 101),
  ('PEN', 'Peruvian Sol',             'Peruvian Sol',             'سول بيروفي',           'S/',  2, 'Céntimo',  'سنتيمو',    false, true, 102),
  ('UYU', 'Uruguayan Peso',           'Uruguayan Peso',           'بيسو أوروغواياني',     '$U',  2, 'Centésimo','سنتيسيمو',  false, true, 103),
  ('BOB', 'Bolivian Boliviano',       'Bolivian Boliviano',       'بوليفيانو بوليفي',     'Bs',  2, 'Centavo',  'سنتافو',    false, true, 104),
  ('PYG', 'Paraguayan Guarani',       'Paraguayan Guarani',       'غواراني باراغواياني',   '₲',   0, 'Céntimo',  'سنتيمو',    false, true, 105),
  ('VES', 'Venezuelan Bolívar',       'Venezuelan Bolívar',       'بوليفار فنزويلي',      'Bs.S',2, 'Céntimo',  'سنتيمو',    false, true, 106),
  ('DOP', 'Dominican Peso',           'Dominican Peso',           'بيسو دومينيكاني',      'RD$', 2, 'Centavo',  'سنتافو',    false, true, 107),
  ('GTQ', 'Guatemalan Quetzal',       'Guatemalan Quetzal',       'كويتزال غواتيمالي',    'Q',   2, 'Centavo',  'سنتافو',    false, true, 108),
  ('CRC', 'Costa Rican Colon',        'Costa Rican Colón',        'كولون كوستاريكي',      '₡',   2, 'Céntimo',  'سنتيمو',    false, true, 109),
  ('PAB', 'Panamanian Balboa',        'Panamanian Balboa',        'بالبوا بنمي',          'B/.',  2, 'Centésimo','سنتيسيمو',  false, true, 110),
  ('JMD', 'Jamaican Dollar',          'Jamaican Dollar',          'دولار جمايكي',         'J$',  2, 'Cent',     'سنت',       false, true, 111),
  ('TTD', 'Trinidad Dollar',          'Trinidad & Tobago Dollar', 'دولار ترينيداد',       'TT$', 2, 'Cent',     'سنت',       false, true, 112),
  ('NZD', 'New Zealand Dollar',       'New Zealand Dollar',       'دولار نيوزيلندي',      'NZ$', 2, 'Cent',     'سنت',       false, true, 113),
  -- عملات أوقيانوسيا - Pacific Currencies
  ('FJD', 'Fijian Dollar',            'Fijian Dollar',            'دولار فيجي',           'FJ$', 2, 'Cent',     'سنت',       false, true, 114),
  ('PGK', 'Papua New Guinean Kina',   'Papua New Guinean Kina',   'كينا بابوانية',        'K',   2, 'Toea',     'تويا',      false, true, 115),
  -- عملات خاصة - Special/Precious
  ('XAU', 'Gold (Troy Ounce)',        'Gold (Troy Ounce)',        'الذهب (أونصة تروي)',   'XAU', 4, NULL,       NULL,        false, true, 200),
  ('XAG', 'Silver (Troy Ounce)',      'Silver (Troy Ounce)',      'الفضة (أونصة تروي)',   'XAG', 4, NULL,       NULL,        false, true, 201),
  ('XPT', 'Platinum (Troy Ounce)',    'Platinum (Troy Ounce)',    'البلاتين (أونصة تروي)','XPT', 4, NULL,       NULL,        false, true, 202)
ON CONFLICT (code) WHERE company_id IS NULL AND deleted_at IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  symbol = EXCLUDED.symbol,
  decimal_places = EXCLUDED.decimal_places,
  subunit_en = EXCLUDED.subunit_en,
  subunit_ar = EXCLUDED.subunit_ar,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ EXCHANGE RATES - أسعار الصرف (مرجعية مقابل SAR)                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Insert exchange rates: SAR → other currencies (approximate rates)
INSERT INTO exchange_rates (company_id, from_currency_id, to_currency_id, rate, rate_date, rate_type, source, is_active)
SELECT NULL,
       sar.id,
       target.id,
       v.rate,
       CURRENT_DATE,
       'standard',
       'initial_seed',
       true
FROM (SELECT id FROM currencies WHERE code = 'SAR') sar
CROSS JOIN (
  VALUES
    ('USD', 0.2667),    -- 1 SAR = 0.2667 USD
    ('EUR', 0.2450),    -- 1 SAR = 0.2450 EUR
    ('GBP', 0.2110),    -- 1 SAR = 0.2110 GBP
    ('JPY', 39.960),    -- 1 SAR = 39.96 JPY
    ('CNY', 1.9320),    -- 1 SAR = 1.932 CNY
    ('CHF', 0.2350),    -- 1 SAR = 0.235 CHF
    ('CAD', 0.3650),    -- 1 SAR = 0.365 CAD
    ('AUD', 0.4120),    -- 1 SAR = 0.412 AUD
    ('AED', 0.9793),    -- 1 SAR = 0.9793 AED
    ('KWD', 0.0819),    -- 1 SAR = 0.0819 KWD
    ('BHD', 0.1005),    -- 1 SAR = 0.1005 BHD
    ('OMR', 0.1027),    -- 1 SAR = 0.1027 OMR
    ('QAR', 0.9712),    -- 1 SAR = 0.9712 QAR
    ('EGP', 13.350),    -- 1 SAR = 13.35 EGP
    ('JOD', 0.1890),    -- 1 SAR = 0.189 JOD
    ('INR', 22.350),    -- 1 SAR = 22.35 INR
    ('PKR', 74.200),    -- 1 SAR = 74.2 PKR
    ('TRY', 9.6000),    -- 1 SAR = 9.6 TRY
    ('BRL', 1.3500),    -- 1 SAR = 1.35 BRL
    ('MXN', 4.5800),    -- 1 SAR = 4.58 MXN
    ('ZAR', 4.9500),    -- 1 SAR = 4.95 ZAR
    ('NGN', 420.00),    -- 1 SAR = 420 NGN
    ('KES', 34.500),    -- 1 SAR = 34.5 KES
    ('RUB', 24.500),    -- 1 SAR = 24.5 RUB
    ('IDR', 4215.0),    -- 1 SAR = 4215 IDR
    ('MYR', 1.2600),    -- 1 SAR = 1.26 MYR
    ('SGD', 0.3580),    -- 1 SAR = 0.358 SGD
    ('THB', 9.5000),    -- 1 SAR = 9.5 THB
    ('PHP', 14.900),    -- 1 SAR = 14.9 PHP
    ('KRW', 367.00),    -- 1 SAR = 367 KRW
    ('NZD', 0.4480),    -- 1 SAR = 0.448 NZD
    ('SEK', 2.7500),    -- 1 SAR = 2.75 SEK
    ('NOK', 2.8200),    -- 1 SAR = 2.82 NOK
    ('DKK', 1.8300),    -- 1 SAR = 1.83 DKK
    ('PLN', 1.0650),    -- 1 SAR = 1.065 PLN
    ('HKD', 2.0830)     -- 1 SAR = 2.083 HKD
) AS v(currency_code, rate)
JOIN currencies target ON target.code = v.currency_code
WHERE NOT EXISTS (
  SELECT 1 FROM exchange_rates er
  WHERE er.from_currency_id = sar.id
    AND er.to_currency_id = target.id
    AND er.rate_date = CURRENT_DATE
    AND er.rate_type = 'standard'
);


COMMIT;
