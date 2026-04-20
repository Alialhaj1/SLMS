-- ============================================================================
-- 423: بيانات مرجعية شاملة - اللغات والمناطق الزمنية وثيمات الواجهة وطرق الاتصال
-- Comprehensive Reference Data - Languages, Timezones, UI Themes, Contact Methods
-- ============================================================================
-- يحتوي على بيانات حقيقية كاملة لجميع لغات العالم والمناطق الزمنية
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. SYSTEM LANGUAGES - لغات النظام (120+ لغة عالمية)                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO system_languages (code, name_en, name_native, name_ar, direction, date_format, time_format, number_format, currency_position, decimal_separator, thousands_separator, is_active, is_default, flag_icon, sort_order, is_system_language, is_document_language, status)
VALUES
  -- اللغات الرئيسية - Primary Languages
  ('ar',    'Arabic',              'العربية',           'العربية',           'rtl', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'after',  '.', ',', true, false, '🇸🇦', 1,  true, true, 'active'),
  ('en',    'English',             'English',            'الإنجليزية',        'ltr', 'MM/DD/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, true,  '🇺🇸', 2,  true, true, 'active'),
  ('fr',    'French',              'Français',           'الفرنسية',          'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇫🇷', 3,  true, true, 'active'),
  ('es',    'Spanish',             'Español',            'الإسبانية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'before', ',', '.', true, false, '🇪🇸', 4,  true, true, 'active'),
  ('de',    'German',              'Deutsch',            'الألمانية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇩🇪', 5,  true, true, 'active'),
  ('zh',    'Chinese',             '中文',               'الصينية',           'ltr', 'YYYY/MM/DD', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇨🇳', 6,  true, true, 'active'),
  ('ja',    'Japanese',            '日本語',             'اليابانية',         'ltr', 'YYYY/MM/DD', 'HH:mm',     '#,##0',    'before', '.', ',', true, false, '🇯🇵', 7,  true, true, 'active'),
  ('ko',    'Korean',              '한국어',             'الكورية',           'ltr', 'YYYY.MM.DD', 'HH:mm',     '#,##0',    'before', '.', ',', true, false, '🇰🇷', 8,  true, true, 'active'),
  ('pt',    'Portuguese',          'Português',          'البرتغالية',        'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'before', ',', '.', true, false, '🇧🇷', 9,  true, true, 'active'),
  ('ru',    'Russian',             'Русский',            'الروسية',           'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇷🇺', 10, true, true, 'active'),
  ('tr',    'Turkish',             'Türkçe',             'التركية',           'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇹🇷', 11, true, true, 'active'),
  ('hi',    'Hindi',               'हिन्दी',              'الهندية',           'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 12, true, true, 'active'),
  ('ur',    'Urdu',                'اردو',               'الأردية',           'rtl', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇵🇰', 13, true, true, 'active'),
  ('fa',    'Persian',             'فارسی',              'الفارسية',          'rtl', 'YYYY/MM/DD', 'HH:mm',     '#,##0.00', 'after',  '.', ',', true, false, '🇮🇷', 14, true, true, 'active'),
  ('id',    'Indonesian',          'Bahasa Indonesia',   'الإندونيسية',       'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'before', ',', '.', true, false, '🇮🇩', 15, true, true, 'active'),
  ('ms',    'Malay',               'Bahasa Melayu',      'الملايوية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇲🇾', 16, true, true, 'active'),
  ('th',    'Thai',                'ไทย',                'التايلاندية',       'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇹🇭', 17, true, true, 'active'),
  ('vi',    'Vietnamese',          'Tiếng Việt',         'الفيتنامية',        'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇻🇳', 18, true, true, 'active'),
  ('it',    'Italian',             'Italiano',           'الإيطالية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇮🇹', 19, true, true, 'active'),
  ('nl',    'Dutch',               'Nederlands',         'الهولندية',         'ltr', 'DD-MM-YYYY', 'HH:mm',     '#.##0,00', 'before', ',', '.', true, false, '🇳🇱', 20, true, true, 'active'),
  ('pl',    'Polish',              'Polski',             'البولندية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇵🇱', 21, true, true, 'active'),
  ('sv',    'Swedish',             'Svenska',            'السويدية',          'ltr', 'YYYY-MM-DD', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇸🇪', 22, true, true, 'active'),
  ('da',    'Danish',              'Dansk',              'الدنماركية',        'ltr', 'DD-MM-YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇩🇰', 23, true, true, 'active'),
  ('no',    'Norwegian',           'Norsk',              'النرويجية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇳🇴', 24, true, true, 'active'),
  ('fi',    'Finnish',             'Suomi',              'الفنلندية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇫🇮', 25, true, true, 'active'),
  ('el',    'Greek',               'Ελληνικά',           'اليونانية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇬🇷', 26, true, true, 'active'),
  ('he',    'Hebrew',              'עברית',              'العبرية',           'rtl', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'after',  '.', ',', true, false, '🇮🇱', 27, true, true, 'active'),
  ('ro',    'Romanian',            'Română',             'الرومانية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇷🇴', 28, true, true, 'active'),
  ('hu',    'Hungarian',           'Magyar',             'المجرية',           'ltr', 'YYYY.MM.DD', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇭🇺', 29, true, true, 'active'),
  ('cs',    'Czech',               'Čeština',            'التشيكية',          'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇨🇿', 30, true, true, 'active'),
  ('sk',    'Slovak',              'Slovenčina',         'السلوفاكية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇸🇰', 31, false, true, 'active'),
  ('bg',    'Bulgarian',           'Български',          'البلغارية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇧🇬', 32, false, true, 'active'),
  ('uk',    'Ukrainian',           'Українська',         'الأوكرانية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇺🇦', 33, false, true, 'active'),
  ('hr',    'Croatian',            'Hrvatski',           'الكرواتية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇭🇷', 34, false, true, 'active'),
  ('sr',    'Serbian',             'Српски',             'الصربية',           'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇷🇸', 35, false, true, 'active'),
  ('sl',    'Slovenian',           'Slovenščina',        'السلوفينية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇸🇮', 36, false, true, 'active'),
  ('et',    'Estonian',            'Eesti',              'الإستونية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇪🇪', 37, false, true, 'active'),
  ('lv',    'Latvian',             'Latviešu',           'اللاتفية',          'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇱🇻', 38, false, true, 'active'),
  ('lt',    'Lithuanian',          'Lietuvių',           'الليتوانية',        'ltr', 'YYYY-MM-DD', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇱🇹', 39, false, true, 'active'),
  ('bn',    'Bengali',             'বাংলা',              'البنغالية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇧🇩', 40, false, true, 'active'),
  ('ta',    'Tamil',               'தமிழ்',              'التاميلية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 41, false, true, 'active'),
  ('te',    'Telugu',              'తెలుగు',             'التيلوغوية',        'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 42, false, true, 'active'),
  ('ml',    'Malayalam',           'മലയാളം',             'المالايالامية',     'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 43, false, true, 'active'),
  ('pa',    'Punjabi',             'ਪੰਜਾਬੀ',            'البنجابية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 44, false, true, 'active'),
  ('gu',    'Gujarati',            'ગુજરાતી',            'الغوجاراتية',       'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 45, false, true, 'active'),
  ('mr',    'Marathi',             'मराठी',              'الماراثية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇮🇳', 46, false, true, 'active'),
  ('sw',    'Swahili',             'Kiswahili',          'السواحلية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇰🇪', 47, false, true, 'active'),
  ('am',    'Amharic',             'አማርኛ',              'الأمهرية',          'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇪🇹', 48, false, true, 'active'),
  ('ha',    'Hausa',               'Hausa',              'الهوسا',            'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇳🇬', 49, false, true, 'active'),
  ('yo',    'Yoruba',              'Yorùbá',             'اليوروبا',          'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇳🇬', 50, false, true, 'active'),
  ('ig',    'Igbo',                'Igbo',               'الإيغبو',           'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇳🇬', 51, false, true, 'active'),
  ('zu',    'Zulu',                'isiZulu',            'الزولو',            'ltr', 'DD/MM/YYYY', 'HH:mm',     '# ##0,00', 'before', ',', ' ', true, false, '🇿🇦', 52, false, true, 'active'),
  ('af',    'Afrikaans',           'Afrikaans',          'الأفريقانية',       'ltr', 'DD/MM/YYYY', 'HH:mm',     '# ##0,00', 'before', ',', ' ', true, false, '🇿🇦', 53, false, true, 'active'),
  ('so',    'Somali',              'Soomaali',           'الصومالية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇸🇴', 54, false, true, 'active'),
  ('ne',    'Nepali',              'नेपाली',             'النيبالية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##,##0.00', 'before', '.', ',', true, false, '🇳🇵', 55, false, true, 'active'),
  ('si',    'Sinhala',             'සිංහල',              'السنهالية',         'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇱🇰', 56, false, true, 'active'),
  ('my',    'Burmese',             'မြန်မာ',              'البورمية',          'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0',    'before', '.', ',', true, false, '🇲🇲', 57, false, true, 'active'),
  ('km',    'Khmer',               'ភាសាខ្មែរ',          'الخميرية',          'ltr', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇰🇭', 58, false, true, 'active'),
  ('lo',    'Lao',                 'ພາສາລາວ',            'اللاوية',           'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0',    'after',  '.', ',', true, false, '🇱🇦', 59, false, true, 'active'),
  ('ka',    'Georgian',            'ქართული',            'الجورجية',          'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇬🇪', 60, false, true, 'active'),
  ('hy',    'Armenian',            'Հայերեն',            'الأرمينية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇦🇲', 61, false, true, 'active'),
  ('az',    'Azerbaijani',         'Azərbaycan',         'الأذربيجانية',      'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇦🇿', 62, false, true, 'active'),
  ('kk',    'Kazakh',              'Қазақша',            'الكازاخستانية',     'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇰🇿', 63, false, true, 'active'),
  ('uz',    'Uzbek',               'Oʻzbekcha',          'الأوزبكية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇺🇿', 64, false, true, 'active'),
  ('tg',    'Tajik',               'Тоҷикӣ',             'الطاجيكية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇹🇯', 65, false, true, 'active'),
  ('tk',    'Turkmen',             'Türkmençe',          'التركمانية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇹🇲', 66, false, true, 'active'),
  ('ky',    'Kyrgyz',              'Кыргызча',           'القيرغيزية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇰🇬', 67, false, true, 'active'),
  ('mn',    'Mongolian',           'Монгол',             'المنغولية',         'ltr', 'YYYY.MM.DD', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇲🇳', 68, false, true, 'active'),
  ('ps',    'Pashto',              'پښتو',               'البشتونية',         'rtl', 'DD/MM/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇦🇫', 69, false, true, 'active'),
  ('ku',    'Kurdish',             'کوردی',              'الكردية',           'rtl', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇮🇶', 70, false, true, 'active'),
  ('tl',    'Filipino',            'Filipino',           'الفلبينية',         'ltr', 'MM/DD/YYYY', 'hh:mm A',   '#,##0.00', 'before', '.', ',', true, false, '🇵🇭', 71, false, true, 'active'),
  ('mg',    'Malagasy',            'Malagasy',           'الملغاشية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '# ##0,00', 'before', ',', ' ', true, false, '🇲🇬', 72, false, true, 'active'),
  ('rw',    'Kinyarwanda',         'Ikinyarwanda',       'الكينيارواندا',     'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'before', ',', '.', true, false, '🇷🇼', 73, false, true, 'active'),
  ('sq',    'Albanian',            'Shqip',              'الألبانية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '# ##0,00', 'after',  ',', ' ', true, false, '🇦🇱', 74, false, true, 'active'),
  ('mk',    'Macedonian',          'Македонски',         'المقدونية',         'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇲🇰', 75, false, true, 'active'),
  ('bs',    'Bosnian',             'Bosanski',           'البوسنية',          'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇧🇦', 76, false, true, 'active'),
  ('mt',    'Maltese',             'Malti',              'المالطية',          'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'after',  '.', ',', true, false, '🇲🇹', 77, false, true, 'active'),
  ('is',    'Icelandic',           'Íslenska',           'الأيسلندية',        'ltr', 'DD.MM.YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇮🇸', 78, false, true, 'active'),
  ('ga',    'Irish',               'Gaeilge',            'الأيرلندية',        'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🇮🇪', 79, false, true, 'active'),
  ('cy',    'Welsh',               'Cymraeg',            'الويلزية',          'ltr', 'DD/MM/YYYY', 'HH:mm',     '#,##0.00', 'before', '.', ',', true, false, '🏴', 80, false, true, 'active'),
  ('ca',    'Catalan',             'Català',             'الكاتالونية',       'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇪🇸', 81, false, true, 'active'),
  ('eu',    'Basque',              'Euskara',            'الباسكية',          'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇪🇸', 82, false, true, 'active'),
  ('gl',    'Galician',            'Galego',             'الغاليسية',         'ltr', 'DD/MM/YYYY', 'HH:mm',     '#.##0,00', 'after',  ',', '.', true, false, '🇪🇸', 83, false, true, 'active')
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_native = EXCLUDED.name_native,
  name_ar = EXCLUDED.name_ar,
  direction = EXCLUDED.direction,
  date_format = EXCLUDED.date_format,
  time_format = EXCLUDED.time_format,
  number_format = EXCLUDED.number_format,
  currency_position = EXCLUDED.currency_position,
  decimal_separator = EXCLUDED.decimal_separator,
  thousands_separator = EXCLUDED.thousands_separator,
  flag_icon = EXCLUDED.flag_icon,
  sort_order = EXCLUDED.sort_order,
  is_system_language = EXCLUDED.is_system_language,
  is_document_language = EXCLUDED.is_document_language,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. TIME ZONES - المناطق الزمنية (جميع المناطق IANA الرئيسية)            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO time_zones (code, name_en, name_ar, utc_offset, dst_observed, abbreviation, region, sort_order, is_active, status)
VALUES
  -- الشرق الأوسط - Middle East
  ('Asia/Riyadh',          'Arabia Standard Time (Riyadh)',       'توقيت السعودية (الرياض)',            '+03:00', false, 'AST',  'Middle East', 1,  true, 'active'),
  ('Asia/Dubai',           'Gulf Standard Time (Dubai)',          'توقيت الخليج (دبي)',                '+04:00', false, 'GST',  'Middle East', 2,  true, 'active'),
  ('Asia/Qatar',           'Arabia Standard Time (Qatar)',        'توقيت قطر (الدوحة)',                '+03:00', false, 'AST',  'Middle East', 3,  true, 'active'),
  ('Asia/Kuwait',          'Arabia Standard Time (Kuwait)',       'توقيت الكويت',                      '+03:00', false, 'AST',  'Middle East', 4,  true, 'active'),
  ('Asia/Bahrain',         'Arabia Standard Time (Bahrain)',      'توقيت البحرين',                     '+03:00', false, 'AST',  'Middle East', 5,  true, 'active'),
  ('Asia/Muscat',          'Gulf Standard Time (Muscat)',         'توقيت عُمان (مسقط)',                '+04:00', false, 'GST',  'Middle East', 6,  true, 'active'),
  ('Asia/Aden',            'Arabia Standard Time (Aden)',         'توقيت اليمن (عدن)',                 '+03:00', false, 'AST',  'Middle East', 7,  true, 'active'),
  ('Asia/Baghdad',         'Arabia Standard Time (Baghdad)',      'توقيت العراق (بغداد)',              '+03:00', false, 'AST',  'Middle East', 8,  true, 'active'),
  ('Asia/Amman',           'Eastern European Time (Amman)',       'توقيت الأردن (عمان)',               '+03:00', true,  'EET',  'Middle East', 9,  true, 'active'),
  ('Asia/Beirut',          'Eastern European Time (Beirut)',      'توقيت لبنان (بيروت)',               '+02:00', true,  'EET',  'Middle East', 10, true, 'active'),
  ('Asia/Damascus',        'Eastern European Time (Damascus)',    'توقيت سوريا (دمشق)',               '+03:00', true,  'EET',  'Middle East', 11, true, 'active'),
  ('Asia/Jerusalem',       'Israel Standard Time',                'توقيت فلسطين (القدس)',              '+02:00', true,  'IST',  'Middle East', 12, true, 'active'),
  ('Asia/Tehran',          'Iran Standard Time',                  'توقيت إيران (طهران)',               '+03:30', true,  'IRST', 'Middle East', 13, true, 'active'),
  -- شمال أفريقيا - North Africa
  ('Africa/Cairo',         'Eastern European Time (Cairo)',       'توقيت مصر (القاهرة)',               '+02:00', false, 'EET',  'North Africa', 14, true, 'active'),
  ('Africa/Tripoli',       'Eastern European Time (Tripoli)',     'توقيت ليبيا (طرابلس)',              '+02:00', false, 'EET',  'North Africa', 15, true, 'active'),
  ('Africa/Tunis',         'Central European Time (Tunis)',       'توقيت تونس',                       '+01:00', false, 'CET',  'North Africa', 16, true, 'active'),
  ('Africa/Algiers',       'Central European Time (Algiers)',     'توقيت الجزائر',                    '+01:00', false, 'CET',  'North Africa', 17, true, 'active'),
  ('Africa/Casablanca',    'Western European Time (Casablanca)',  'توقيت المغرب (الدار البيضاء)',      '+01:00', true,  'WET',  'North Africa', 18, true, 'active'),
  ('Africa/Khartoum',      'Central Africa Time (Khartoum)',      'توقيت السودان (الخرطوم)',           '+02:00', false, 'CAT',  'North Africa', 19, true, 'active'),
  -- أوروبا - Europe
  ('Europe/London',        'Greenwich Mean Time (London)',        'توقيت غرينتش (لندن)',               '+00:00', true,  'GMT',  'Europe', 20, true, 'active'),
  ('Europe/Paris',         'Central European Time (Paris)',       'توقيت وسط أوروبا (باريس)',          '+01:00', true,  'CET',  'Europe', 21, true, 'active'),
  ('Europe/Berlin',        'Central European Time (Berlin)',      'توقيت وسط أوروبا (برلين)',          '+01:00', true,  'CET',  'Europe', 22, true, 'active'),
  ('Europe/Rome',          'Central European Time (Rome)',        'توقيت وسط أوروبا (روما)',           '+01:00', true,  'CET',  'Europe', 23, true, 'active'),
  ('Europe/Madrid',        'Central European Time (Madrid)',      'توقيت وسط أوروبا (مدريد)',          '+01:00', true,  'CET',  'Europe', 24, true, 'active'),
  ('Europe/Amsterdam',     'Central European Time (Amsterdam)',   'توقيت وسط أوروبا (أمستردام)',       '+01:00', true,  'CET',  'Europe', 25, true, 'active'),
  ('Europe/Brussels',      'Central European Time (Brussels)',    'توقيت وسط أوروبا (بروكسل)',         '+01:00', true,  'CET',  'Europe', 26, true, 'active'),
  ('Europe/Zurich',        'Central European Time (Zurich)',      'توقيت وسط أوروبا (زيورخ)',          '+01:00', true,  'CET',  'Europe', 27, true, 'active'),
  ('Europe/Vienna',        'Central European Time (Vienna)',      'توقيت وسط أوروبا (فيينا)',          '+01:00', true,  'CET',  'Europe', 28, true, 'active'),
  ('Europe/Stockholm',     'Central European Time (Stockholm)',   'توقيت وسط أوروبا (ستوكهولم)',       '+01:00', true,  'CET',  'Europe', 29, true, 'active'),
  ('Europe/Oslo',          'Central European Time (Oslo)',        'توقيت وسط أوروبا (أوسلو)',          '+01:00', true,  'CET',  'Europe', 30, true, 'active'),
  ('Europe/Copenhagen',    'Central European Time (Copenhagen)',  'توقيت وسط أوروبا (كوبنهاغن)',       '+01:00', true,  'CET',  'Europe', 31, true, 'active'),
  ('Europe/Helsinki',      'Eastern European Time (Helsinki)',    'توقيت شرق أوروبا (هلسنكي)',         '+02:00', true,  'EET',  'Europe', 32, true, 'active'),
  ('Europe/Athens',        'Eastern European Time (Athens)',      'توقيت شرق أوروبا (أثينا)',          '+02:00', true,  'EET',  'Europe', 33, true, 'active'),
  ('Europe/Istanbul',      'Turkey Time (Istanbul)',              'توقيت تركيا (إسطنبول)',             '+03:00', false, 'TRT',  'Europe', 34, true, 'active'),
  ('Europe/Moscow',        'Moscow Time',                         'توقيت موسكو',                      '+03:00', false, 'MSK',  'Europe', 35, true, 'active'),
  ('Europe/Warsaw',        'Central European Time (Warsaw)',      'توقيت وسط أوروبا (وارسو)',          '+01:00', true,  'CET',  'Europe', 36, true, 'active'),
  ('Europe/Bucharest',     'Eastern European Time (Bucharest)',   'توقيت شرق أوروبا (بوخاريست)',       '+02:00', true,  'EET',  'Europe', 37, true, 'active'),
  ('Europe/Budapest',      'Central European Time (Budapest)',    'توقيت وسط أوروبا (بودابست)',        '+01:00', true,  'CET',  'Europe', 38, true, 'active'),
  ('Europe/Prague',        'Central European Time (Prague)',      'توقيت وسط أوروبا (براغ)',           '+01:00', true,  'CET',  'Europe', 39, true, 'active'),
  ('Europe/Lisbon',        'Western European Time (Lisbon)',      'توقيت غرب أوروبا (لشبونة)',         '+00:00', true,  'WET',  'Europe', 40, true, 'active'),
  ('Europe/Dublin',        'Greenwich Mean Time (Dublin)',        'توقيت أيرلندا (دبلن)',              '+00:00', true,  'GMT',  'Europe', 41, true, 'active'),
  ('Europe/Kyiv',          'Eastern European Time (Kyiv)',        'توقيت شرق أوروبا (كييف)',           '+02:00', true,  'EET',  'Europe', 42, true, 'active'),
  -- آسيا - Asia
  ('Asia/Kolkata',         'India Standard Time',                 'توقيت الهند (كولكاتا)',             '+05:30', false, 'IST',  'Asia', 43, true, 'active'),
  ('Asia/Karachi',         'Pakistan Standard Time',              'توقيت باكستان (كراتشي)',            '+05:00', false, 'PKT',  'Asia', 44, true, 'active'),
  ('Asia/Dhaka',           'Bangladesh Standard Time',            'توقيت بنغلاديش (دكا)',              '+06:00', false, 'BST',  'Asia', 45, true, 'active'),
  ('Asia/Shanghai',        'China Standard Time',                 'توقيت الصين (شنغهاي)',              '+08:00', false, 'CST',  'Asia', 46, true, 'active'),
  ('Asia/Hong_Kong',       'Hong Kong Time',                      'توقيت هونغ كونغ',                   '+08:00', false, 'HKT',  'Asia', 47, true, 'active'),
  ('Asia/Tokyo',           'Japan Standard Time',                 'توقيت اليابان (طوكيو)',             '+09:00', false, 'JST',  'Asia', 48, true, 'active'),
  ('Asia/Seoul',           'Korean Standard Time',                'توقيت كوريا (سيؤول)',               '+09:00', false, 'KST',  'Asia', 49, true, 'active'),
  ('Asia/Singapore',       'Singapore Standard Time',             'توقيت سنغافورة',                   '+08:00', false, 'SGT',  'Asia', 50, true, 'active'),
  ('Asia/Kuala_Lumpur',    'Malaysia Time',                       'توقيت ماليزيا (كوالالمبور)',         '+08:00', false, 'MYT',  'Asia', 51, true, 'active'),
  ('Asia/Bangkok',         'Indochina Time (Bangkok)',            'توقيت تايلاند (بانكوك)',            '+07:00', false, 'ICT',  'Asia', 52, true, 'active'),
  ('Asia/Jakarta',         'Western Indonesia Time',              'توقيت إندونيسيا الغربي (جاكارتا)',  '+07:00', false, 'WIB',  'Asia', 53, true, 'active'),
  ('Asia/Ho_Chi_Minh',     'Indochina Time (Ho Chi Minh)',        'توقيت فيتنام (هوشي منه)',           '+07:00', false, 'ICT',  'Asia', 54, true, 'active'),
  ('Asia/Manila',          'Philippine Standard Time',            'توقيت الفلبين (مانيلا)',            '+08:00', false, 'PHT',  'Asia', 55, true, 'active'),
  ('Asia/Taipei',          'Taipei Standard Time',                'توقيت تايبيه',                     '+08:00', false, 'CST',  'Asia', 56, true, 'active'),
  ('Asia/Colombo',         'Sri Lanka Standard Time',             'توقيت سريلانكا (كولومبو)',          '+05:30', false, 'SLST', 'Asia', 57, true, 'active'),
  ('Asia/Tashkent',        'Uzbekistan Time',                     'توقيت أوزبكستان (طشقند)',           '+05:00', false, 'UZT',  'Asia', 58, true, 'active'),
  ('Asia/Almaty',          'East Kazakhstan Time',                'توقيت كازاخستان (ألماتي)',          '+06:00', false, 'ALMT', 'Asia', 59, true, 'active'),
  ('Asia/Kabul',           'Afghanistan Time',                    'توقيت أفغانستان (كابول)',           '+04:30', false, 'AFT',  'Asia', 60, true, 'active'),
  ('Asia/Yangon',          'Myanmar Time',                        'توقيت ميانمار (يانغون)',            '+06:30', false, 'MMT',  'Asia', 61, true, 'active'),
  ('Asia/Kathmandu',       'Nepal Time',                          'توقيت نيبال (كاتماندو)',            '+05:45', false, 'NPT',  'Asia', 62, true, 'active'),
  ('Asia/Tbilisi',         'Georgia Standard Time',               'توقيت جورجيا (تبليسي)',             '+04:00', false, 'GET',  'Asia', 63, true, 'active'),
  ('Asia/Yerevan',         'Armenia Time',                        'توقيت أرمينيا (يريفان)',            '+04:00', false, 'AMT',  'Asia', 64, true, 'active'),
  ('Asia/Baku',            'Azerbaijan Time',                     'توقيت أذربيجان (باكو)',             '+04:00', false, 'AZT',  'Asia', 65, true, 'active'),
  -- الأمريكتان - Americas
  ('America/New_York',     'Eastern Standard Time (New York)',    'التوقيت الشرقي (نيويورك)',          '-05:00', true,  'EST',  'Americas', 66, true, 'active'),
  ('America/Chicago',      'Central Standard Time (Chicago)',     'التوقيت المركزي (شيكاغو)',          '-06:00', true,  'CST',  'Americas', 67, true, 'active'),
  ('America/Denver',       'Mountain Standard Time (Denver)',     'توقيت الجبال (دنفر)',               '-07:00', true,  'MST',  'Americas', 68, true, 'active'),
  ('America/Los_Angeles',  'Pacific Standard Time (LA)',          'توقيت المحيط الهادئ (لوس أنجلوس)',  '-08:00', true,  'PST',  'Americas', 69, true, 'active'),
  ('America/Toronto',      'Eastern Standard Time (Toronto)',     'التوقيت الشرقي (تورنتو)',           '-05:00', true,  'EST',  'Americas', 70, true, 'active'),
  ('America/Mexico_City',  'Central Standard Time (Mexico)',      'التوقيت المركزي (مكسيكو سيتي)',     '-06:00', true,  'CST',  'Americas', 71, true, 'active'),
  ('America/Sao_Paulo',    'Brasilia Time',                       'توقيت برازيليا',                   '-03:00', false, 'BRT',  'Americas', 72, true, 'active'),
  ('America/Argentina/Buenos_Aires', 'Argentina Time',            'توقيت الأرجنتين (بيونس أيرس)',     '-03:00', false, 'ART',  'Americas', 73, true, 'active'),
  ('America/Lima',         'Peru Time',                           'توقيت بيرو (ليما)',                 '-05:00', false, 'PET',  'Americas', 74, true, 'active'),
  ('America/Bogota',       'Colombia Time',                       'توقيت كولومبيا (بوغوتا)',           '-05:00', false, 'COT',  'Americas', 75, true, 'active'),
  ('America/Santiago',     'Chile Standard Time',                 'توقيت تشيلي (سانتياغو)',           '-04:00', true,  'CLT',  'Americas', 76, true, 'active'),
  -- أفريقيا - Africa
  ('Africa/Johannesburg',  'South Africa Standard Time',          'توقيت جنوب أفريقيا (جوهانسبرغ)',   '+02:00', false, 'SAST', 'Africa', 77, true, 'active'),
  ('Africa/Nairobi',       'East Africa Time (Nairobi)',          'توقيت شرق أفريقيا (نيروبي)',       '+03:00', false, 'EAT',  'Africa', 78, true, 'active'),
  ('Africa/Lagos',         'West Africa Time (Lagos)',            'توقيت غرب أفريقيا (لاغوس)',        '+01:00', false, 'WAT',  'Africa', 79, true, 'active'),
  ('Africa/Accra',         'Greenwich Mean Time (Accra)',         'توقيت غانا (أكرا)',                 '+00:00', false, 'GMT',  'Africa', 80, true, 'active'),
  ('Africa/Addis_Ababa',   'East Africa Time (Addis Ababa)',      'توقيت إثيوبيا (أديس أبابا)',        '+03:00', false, 'EAT',  'Africa', 81, true, 'active'),
  ('Africa/Dar_es_Salaam', 'East Africa Time (Dar es Salaam)',    'توقيت تنزانيا (دار السلام)',        '+03:00', false, 'EAT',  'Africa', 82, true, 'active'),
  -- أوقيانوسيا - Oceania
  ('Australia/Sydney',     'Australian Eastern Standard Time',    'توقيت شرق أستراليا (سيدني)',       '+10:00', true,  'AEST', 'Oceania', 83, true, 'active'),
  ('Australia/Melbourne',  'Australian Eastern Standard Time',    'توقيت شرق أستراليا (ملبورن)',       '+10:00', true,  'AEST', 'Oceania', 84, true, 'active'),
  ('Australia/Perth',      'Australian Western Standard Time',    'توقيت غرب أستراليا (بيرث)',         '+08:00', false, 'AWST', 'Oceania', 85, true, 'active'),
  ('Pacific/Auckland',     'New Zealand Standard Time',           'توقيت نيوزيلندا (أوكلاند)',         '+12:00', true,  'NZST', 'Oceania', 86, true, 'active'),
  ('Pacific/Fiji',         'Fiji Time',                           'توقيت فيجي',                       '+12:00', true,  'FJT',  'Oceania', 87, true, 'active')
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  utc_offset = EXCLUDED.utc_offset,
  dst_observed = EXCLUDED.dst_observed,
  abbreviation = EXCLUDED.abbreviation,
  region = EXCLUDED.region,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. UI THEMES - ثيمات الواجهة                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO ui_themes (company_id, name_en, name_ar, theme_code, primary_color, secondary_color, accent_color, background_color, text_color, sidebar_color, header_color, font_family, font_size_base, border_radius, is_active, is_default)
SELECT v.company_id, v.name_en, v.name_ar, v.theme_code, v.primary_color, v.secondary_color, v.accent_color, v.background_color, v.text_color, v.sidebar_color, v.header_color, v.font_family, v.font_size_base, v.border_radius, v.is_active, v.is_default
FROM (VALUES
  (NULL::integer, 'Ocean Blue',        'أزرق المحيط',       'ocean-blue',     '#1E40AF', '#3B82F6', '#60A5FA', '#F8FAFC', '#1E293B', '#0F172A', '#1E3A5F', 'Inter',     14, 8,  true, true),
  (NULL::integer, 'Emerald Green',     'أخضر زمردي',        'emerald-green',  '#059669', '#10B981', '#34D399', '#F0FDF4', '#1E293B', '#064E3B', '#065F46', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Royal Purple',      'بنفسجي ملكي',       'royal-purple',   '#7C3AED', '#8B5CF6', '#A78BFA', '#FAF5FF', '#1E293B', '#2E1065', '#4C1D95', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Sunset Orange',     'برتقالي الغروب',    'sunset-orange',  '#EA580C', '#F97316', '#FB923C', '#FFF7ED', '#1E293B', '#431407', '#7C2D12', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Desert Sand',       'رمال الصحراء',      'desert-sand',    '#B45309', '#D97706', '#FBBF24', '#FFFBEB', '#1E293B', '#451A03', '#78350F', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Midnight Dark',     'منتصف الليل',       'midnight-dark',  '#6366F1', '#818CF8', '#A5B4FC', '#0F172A', '#E2E8F0', '#020617', '#1E1B4B', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Rose Gold',         'وردي ذهبي',         'rose-gold',      '#BE185D', '#EC4899', '#F9A8D4', '#FDF2F8', '#1E293B', '#500724', '#831843', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Forest Green',      'أخضر غابي',         'forest-green',   '#15803D', '#22C55E', '#4ADE80', '#F0FDF4', '#1E293B', '#052E16', '#14532D', 'Inter',     14, 8,  true, false),
  (NULL::integer, 'Sky Light',         'سماء صافية',        'sky-light',      '#0284C7', '#38BDF8', '#7DD3FC', '#F0F9FF', '#0C4A6E', '#082F49', '#0C4A6E', 'Inter',     14, 6,  true, false),
  (NULL::integer, 'Corporate Gray',    'رمادي مؤسسي',       'corporate-gray', '#475569', '#64748B', '#94A3B8', '#F8FAFC', '#1E293B', '#1E293B', '#334155', 'Inter',     14, 6,  true, false),
  (NULL::integer, 'Saudi Green',       'أخضر سعودي',        'saudi-green',    '#006C35', '#00A859', '#48D597', '#F0FFF4', '#1E293B', '#003D1D', '#005C2E', 'Cairo',     14, 8,  true, false),
  (NULL::integer, 'Teal Modern',       'تيل عصري',          'teal-modern',    '#0D9488', '#14B8A6', '#5EEAD4', '#F0FDFA', '#1E293B', '#042F2E', '#134E4A', 'Inter',     14, 10, true, false)
) AS v(company_id, name_en, name_ar, theme_code, primary_color, secondary_color, accent_color, background_color, text_color, sidebar_color, header_color, font_family, font_size_base, border_radius, is_active, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM ui_themes t WHERE t.theme_code = v.theme_code AND t.company_id IS NULL AND t.deleted_at IS NULL
);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. CONTACT METHODS - طرق الاتصال                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO contact_methods (code, name_en, name_ar, description_en, description_ar, icon, validation_regex, placeholder_en, placeholder_ar, input_type, is_primary, is_notification_channel, sort_order, is_active, status)
VALUES
  ('phone',     'Phone',            'هاتف',                'Primary phone number',       'رقم الهاتف الرئيسي',      'PhoneIcon',     '^\+?[0-9\s\-\(\)]{7,20}$',   '+966 5x xxx xxxx',  '+966 5x xxx xxxx',  'tel',   true,  true,  1,  true, 'active'),
  ('mobile',    'Mobile',           'جوال',                'Mobile phone number',        'رقم الجوال',              'DevicePhoneMobileIcon', '^\+?[0-9\s\-]{7,20}$', '+966 5xx xxx xxx',  '+966 5xx xxx xxx',  'tel',   true,  true,  2,  true, 'active'),
  ('email',     'Email',            'بريد إلكتروني',       'Email address',              'عنوان البريد الإلكتروني',  'EnvelopeIcon',  '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', 'name@example.com', 'name@example.com', 'email', true, true, 3, true, 'active'),
  ('fax',       'Fax',              'فاكس',                'Fax number',                 'رقم الفاكس',              'PrinterIcon',   '^\+?[0-9\s\-\(\)]{7,20}$',   '+966 1x xxx xxxx',  '+966 1x xxx xxxx',  'tel',   false, false, 4,  true, 'active'),
  ('whatsapp',  'WhatsApp',         'واتساب',              'WhatsApp number',            'رقم واتساب',              'ChatBubbleLeftEllipsisIcon', '^\+?[0-9]{7,20}$', '+966 5xx xxx xxx', '+966 5xx xxx xxx', 'tel', false, true, 5, true, 'active'),
  ('website',   'Website',          'موقع إلكتروني',       'Website URL',                'رابط الموقع الإلكتروني',  'GlobeAltIcon',  '^https?://.+$',               'https://example.com', 'https://example.com', 'url', false, false, 6, true, 'active'),
  ('linkedin',  'LinkedIn',         'لينكد إن',            'LinkedIn profile',           'حساب لينكد إن',           'LinkIcon',      '^https?://.*linkedin\.com/.*$', 'https://linkedin.com/in/...', 'https://linkedin.com/in/...', 'url', false, false, 7, true, 'active'),
  ('twitter',   'Twitter/X',        'تويتر/إكس',           'Twitter/X profile',          'حساب تويتر/إكس',          'AtSymbolIcon',  '^@?[A-Za-z0-9_]{1,15}$',     '@username',         '@username',         'text',  false, false, 8,  true, 'active'),
  ('telegram',  'Telegram',         'تيليجرام',            'Telegram account',           'حساب تيليجرام',           'PaperAirplaneIcon', '^\+?[0-9]{7,20}$',       '@username or +966...', '@username أو +966...', 'text', false, true, 9, true, 'active'),
  ('skype',     'Skype',            'سكايب',               'Skype ID',                   'معرف سكايب',              'VideoCameraIcon', '^[a-zA-Z][a-zA-Z0-9._-]{5,31}$', 'skype.username', 'skype.username', 'text', false, false, 10, true, 'active'),
  ('postal',    'Postal Address',   'عنوان بريدي',         'Physical mailing address',   'عنوان المراسلة البريدية',  'MapPinIcon',    NULL,                          'P.O. Box ...',      'ص.ب ...',           'textarea', false, false, 11, true, 'active'),
  ('landline',  'Landline',         'هاتف أرضي',           'Office landline number',     'رقم الهاتف الأرضي',       'PhoneIcon',     '^\+?[0-9\s\-\(\)]{7,20}$',   '+966 1x xxx xxxx',  '+966 1x xxx xxxx',  'tel',   false, false, 12, true, 'active')
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  validation_regex = EXCLUDED.validation_regex,
  placeholder_en = EXCLUDED.placeholder_en,
  placeholder_ar = EXCLUDED.placeholder_ar,
  input_type = EXCLUDED.input_type,
  is_primary = EXCLUDED.is_primary,
  is_notification_channel = EXCLUDED.is_notification_channel,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5. ADDRESS TYPES - أنواع العناوين                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO address_types (code, name_en, name_ar, description_en, description_ar, icon, sort_order, is_active)
VALUES
  ('headquarters', 'Head Office',      'المقر الرئيسي',     'Main headquarters address',         'عنوان المقر الرئيسي',         'BuildingOffice2Icon', 1,  true),
  ('branch',       'Branch Office',    'فرع',               'Branch office address',             'عنوان الفرع',                 'BuildingOfficeIcon',  2,  true),
  ('warehouse',    'Warehouse',        'مستودع',            'Warehouse/storage location',        'عنوان المستودع',              'CubeIcon',            3,  true),
  ('billing',      'Billing Address',  'عنوان الفوترة',     'Billing and invoicing address',     'عنوان الفواتير والفوترة',     'CreditCardIcon',      4,  true),
  ('shipping',     'Shipping Address', 'عنوان الشحن',       'Delivery/shipping destination',     'عنوان التسليم والشحن',        'TruckIcon',           5,  true),
  ('factory',      'Factory',          'مصنع',              'Manufacturing facility',            'عنوان المصنع',                'WrenchScrewdriverIcon', 6, true),
  ('postal',       'Postal Box',       'صندوق بريد',        'P.O. Box address',                  'عنوان صندوق البريد',          'EnvelopeIcon',        7,  true),
  ('residential',  'Residential',      'سكني',              'Residential/home address',          'العنوان السكني',              'HomeIcon',            8,  true),
  ('customs',      'Customs Office',   'مكتب جمركي',        'Customs clearance office address',  'عنوان مكتب التخليص الجمركي',  'ShieldCheckIcon',     9,  true),
  ('port',         'Port/Terminal',    'ميناء/محطة',        'Port or terminal address',          'عنوان الميناء أو المحطة',     'GlobeAltIcon',        10, true),
  ('showroom',     'Showroom',         'صالة عرض',          'Display/showroom address',          'عنوان صالة العرض',            'SparklesIcon',        11, true),
  ('farm',         'Farm/Plantation',  'مزرعة',             'Agricultural farm address',         'عنوان المزرعة',               'SunIcon',             12, true)
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6. RECORD STATUSES - حالة السجلات                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO record_statuses (code, name_en, name_ar, description_en, description_ar, color, bg_color, icon, is_active_state, is_default, is_system, applies_to, sort_order, status)
VALUES
  ('active',      'Active',       'نشط',           'Record is active and operational',     'السجل نشط وفعال',              '#059669', '#ECFDF5', '✅', true,  true,  true,  'all',       1,  'active'),
  ('inactive',    'Inactive',     'غير نشط',       'Record is temporarily disabled',       'السجل معطل مؤقتاً',            '#6B7280', '#F3F4F6', '⏸️', false, false, true,  'all',       2,  'active'),
  ('draft',       'Draft',        'مسودة',          'Record is in draft/preparation',       'السجل مسودة قيد التحضير',       '#F59E0B', '#FFFBEB', '📝', false, false, true,  'all',       3,  'active'),
  ('pending',     'Pending',      'قيد الانتظار',   'Awaiting review or approval',          'بانتظار المراجعة أو الموافقة',  '#3B82F6', '#EFF6FF', '⏳', false, false, true,  'all',       4,  'active'),
  ('approved',    'Approved',     'معتمد',          'Approved by authorized person',        'معتمد من الشخص المخول',         '#10B981', '#D1FAE5', '✅', true,  false, true,  'all',       5,  'active'),
  ('rejected',    'Rejected',     'مرفوض',          'Rejected after review',                'مرفوض بعد المراجعة',            '#EF4444', '#FEF2F2', '❌', false, false, true,  'all',       6,  'active'),
  ('suspended',   'Suspended',    'معلق',           'Temporarily suspended',                'معلق مؤقتاً',                   '#F97316', '#FFF7ED', '🚫', false, false, true,  'all',       7,  'active'),
  ('closed',      'Closed',       'مغلق',           'Closed/completed permanently',         'مغلق بشكل نهائي',              '#6B7280', '#F3F4F6', '🔒', false, false, true,  'all',       8,  'active'),
  ('archived',    'Archived',     'مؤرشف',          'Archived for historical reference',    'مؤرشف للمرجعية التاريخية',      '#9CA3AF', '#F9FAFB', '📦', false, false, true,  'all',       9,  'active'),
  ('expired',     'Expired',      'منتهي الصلاحية', 'Validity period has expired',          'انتهت فترة الصلاحية',           '#DC2626', '#FEE2E2', '⏰', false, false, true,  'contracts', 10, 'active'),
  ('cancelled',   'Cancelled',    'ملغي',           'Cancelled by user/system',             'ملغي من المستخدم/النظام',       '#9CA3AF', '#F3F4F6', '🚫', false, false, true,  'all',       11, 'active'),
  ('under_review','Under Review', 'قيد المراجعة',   'Under internal review',                'قيد المراجعة الداخلية',         '#8B5CF6', '#F5F3FF', '🔍', false, false, false, 'all',       12, 'active'),
  ('blocked',     'Blocked',      'محظور',          'Blocked for compliance/violation',      'محظور لمخالفة أو عدم امتثال',   '#DC2626', '#FEF2F2', '⛔', false, false, true,  'all',       13, 'active'),
  ('on_hold',     'On Hold',      'قيد الإيقاف',    'Temporarily on hold',                  'موقوف مؤقتاً',                  '#F59E0B', '#FFFBEB', '⏸️', false, false, false, 'all',       14, 'active')
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  icon = EXCLUDED.icon,
  is_active_state = EXCLUDED.is_active_state,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 7. REQUEST STATUSES - حالة الطلبات                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Note: request_statuses may have different schema - using safe upsert

DO $$
BEGIN
  -- Ensure columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'request_statuses' AND column_name = 'code') THEN
    RAISE NOTICE 'request_statuses table may not have code column, skipping';
    RETURN;
  END IF;

  INSERT INTO request_statuses (code, name, name_ar, name_en, description, description_en, color, bg_color, stage, category, is_final, requires_approval, applies_to, sort_order, status)
  VALUES
    ('new',             'New',               'جديد',              'New',              'New request not yet reviewed',          'طلب جديد لم تتم مراجعته',              '#3B82F6', '#EFF6FF', 'draft',     'general',    false, false, 'all', 1,  'active'),
    ('submitted',       'Submitted',         'مُقدّم',            'Submitted',        'Request has been submitted',           'تم تقديم الطلب',                       '#6366F1', '#EEF2FF', 'submitted', 'general',    false, false, 'all', 2,  'active'),
    ('in_review',       'In Review',         'قيد المراجعة',      'In Review',        'Request is under review',             'الطلب قيد المراجعة',                   '#8B5CF6', '#F5F3FF', 'submitted', 'general',    false, true,  'all', 3,  'active'),
    ('pending_approval','Pending Approval',  'بانتظار الموافقة',  'Pending Approval', 'Awaiting manager approval',           'بانتظار موافقة المسؤول',               '#F59E0B', '#FFFBEB', 'submitted', 'general',    false, true,  'all', 4,  'active'),
    ('approved',        'Approved',          'معتمد',             'Approved',         'Request has been approved',            'تمت الموافقة على الطلب',               '#10B981', '#D1FAE5', 'approved',  'general',    false, false, 'all', 5,  'active'),
    ('in_progress',     'In Progress',       'قيد التنفيذ',       'In Progress',      'Request is being processed',          'جاري العمل على الطلب',                 '#0EA5E9', '#E0F2FE', 'executed',  'general',    false, false, 'all', 6,  'active'),
    ('partially_done',  'Partially Done',    'منجز جزئياً',       'Partially Done',   'Request partially completed',         'تم تنفيذ الطلب جزئياً',                '#14B8A6', '#CCFBF1', 'executed',  'general',    false, false, 'all', 7,  'active'),
    ('completed',       'Completed',         'مكتمل',             'Completed',        'Request fully completed',             'الطلب مكتمل ومنجز',                   '#059669', '#ECFDF5', 'executed',  'general',    true,  false, 'all', 8,  'active'),
    ('rejected',        'Rejected',          'مرفوض',             'Rejected',         'Request has been rejected',            'تم رفض الطلب',                        '#EF4444', '#FEF2F2', 'rejected',  'general',    true,  false, 'all', 9,  'active'),
    ('cancelled',       'Cancelled',         'ملغي',              'Cancelled',        'Request has been cancelled',           'تم إلغاء الطلب',                      '#6B7280', '#F3F4F6', 'cancelled', 'general',    true,  false, 'all', 10, 'active'),
    ('returned',        'Returned',          'مُعاد',             'Returned',         'Request returned for revision',       'تم إعادة الطلب للمراجعة',              '#F97316', '#FFF7ED', 'draft',     'general',    false, false, 'all', 11, 'active'),
    ('escalated',       'Escalated',         'تم التصعيد',        'Escalated',        'Request escalated to higher level',   'تم تصعيد الطلب لمستوى أعلى',           '#DC2626', '#FEF2F2', 'submitted', 'general',    false, true,  'all', 12, 'active'),
    ('on_hold',         'On Hold',           'قيد الإيقاف',       'On Hold',          'Request temporarily on hold',         'الطلب موقوف مؤقتاً',                   '#F59E0B', '#FFFBEB', 'submitted', 'general',    false, false, 'all', 13, 'active'),
    ('closed',          'Closed',            'مغلق',              'Closed',           'Request permanently closed',          'الطلب مغلق نهائياً',                  '#374151', '#F3F4F6', 'executed',  'general',    true,  false, 'all', 14, 'active')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    description_en = EXCLUDED.description_en,
    color = EXCLUDED.color,
    bg_color = EXCLUDED.bg_color,
    stage = EXCLUDED.stage,
    category = EXCLUDED.category,
    is_final = EXCLUDED.is_final,
    requires_approval = EXCLUDED.requires_approval;
END $$;


COMMIT;
