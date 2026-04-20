-- ============================================================================
-- 429: بيانات مرجعية شاملة - الضرائب والبيانات الرئيسية المتبقية
-- Comprehensive Seed - Tax Rates, Tax Codes, Taxes, Digital Signatures,
-- Tax Item Categories, Zakat Codes, Tax Zones
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. REFERENCE DATA: Tax Item Categories - فئات بنود الضرائب             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar) VALUES
  (NULL, 'tax_item_categories', 'GOODS-GEN',    'General Goods',                'سلع عامة',                  'Standard taxable goods at regular VAT rate',                 'سلع خاضعة للضريبة بالمعدل العادي'),
  (NULL, 'tax_item_categories', 'GOODS-FOOD',   'Food & Beverages',             'أغذية ومشروبات',            'Food items including groceries and prepared food',           'مواد غذائية بما فيها البقالة والأطعمة المحضرة'),
  (NULL, 'tax_item_categories', 'GOODS-PHARMA', 'Pharmaceutical Products',      'منتجات صيدلانية',           'Medicines and medical supplies',                             'أدوية ومستلزمات طبية'),
  (NULL, 'tax_item_categories', 'GOODS-ELEC',   'Electronics & Equipment',      'إلكترونيات ومعدات',         'Electronic devices, IT equipment, and machinery',            'أجهزة إلكترونية ومعدات تقنية وآلات'),
  (NULL, 'tax_item_categories', 'GOODS-VEHICLE','Vehicles & Parts',             'مركبات وقطع غيار',          'Motor vehicles, spare parts, and accessories',               'مركبات وقطع غيار وملحقاتها'),
  (NULL, 'tax_item_categories', 'GOODS-FUEL',   'Fuel & Energy Products',       'وقود ومنتجات طاقة',         'Petroleum products, gas, and energy commodities',            'منتجات بترولية وغاز وسلع طاقة'),
  (NULL, 'tax_item_categories', 'GOODS-LUXURY', 'Luxury Goods',                 'سلع فاخرة',                 'High-end goods subject to excise or additional duties',      'سلع فاخرة خاضعة لضرائب انتقائية أو رسوم إضافية'),
  (NULL, 'tax_item_categories', 'GOODS-TOBACCO','Tobacco & Derivatives',        'تبغ ومشتقاته',              'Tobacco products subject to excise tax',                     'منتجات تبغ خاضعة للضريبة الانتقائية'),
  (NULL, 'tax_item_categories', 'GOODS-SOFTDRK','Carbonated & Energy Drinks',   'مشروبات غازية وطاقة',       'Sweetened and energy beverages subject to excise',           'مشروبات محلاة وطاقة خاضعة للضريبة الانتقائية'),
  (NULL, 'tax_item_categories', 'SVC-GEN',      'General Services',             'خدمات عامة',                'Standard taxable services',                                  'خدمات خاضعة للضريبة بالمعدل العادي'),
  (NULL, 'tax_item_categories', 'SVC-CONSULT',  'Consulting & Professional',    'استشارات ومهنية',           'Professional consulting, legal, and accounting services',    'خدمات استشارية ومهنية وقانونية ومحاسبية'),
  (NULL, 'tax_item_categories', 'SVC-IT',       'IT & Technology Services',     'خدمات تقنية',               'Software, SaaS, cloud, and IT support services',             'برمجيات وحوسبة سحابية ودعم تقني'),
  (NULL, 'tax_item_categories', 'SVC-TRANSPORT','Transportation & Logistics',   'نقل وخدمات لوجستية',        'Freight, shipping, and logistics services',                  'شحن ونقل وخدمات لوجستية'),
  (NULL, 'tax_item_categories', 'SVC-INSURE',   'Insurance Services',           'خدمات تأمين',               'Insurance premiums and related services',                    'أقساط تأمين وخدمات ذات صلة'),
  (NULL, 'tax_item_categories', 'SVC-FINANCE',  'Financial Services',           'خدمات مالية',               'Banking, financing, and financial intermediary services',    'خدمات مصرفية وتمويل ووساطة مالية'),
  (NULL, 'tax_item_categories', 'SVC-REALESTATE','Real Estate Services',        'خدمات عقارية',              'Property rental, management, and real estate brokerage',     'إيجار وإدارة عقارات ووساطة عقارية'),
  (NULL, 'tax_item_categories', 'SVC-HEALTH',   'Healthcare Services',          'خدمات صحية',                'Medical, dental, and healthcare services',                   'خدمات طبية وصحية'),
  (NULL, 'tax_item_categories', 'SVC-EDU',      'Education & Training',         'تعليم وتدريب',              'Educational and training services',                         'خدمات تعليمية وتدريبية'),
  (NULL, 'tax_item_categories', 'EXPORT',       'Exports',                      'صادرات',                    'Goods and services exported outside KSA — zero-rated',       'سلع وخدمات مصدرة خارج المملكة — معدل صفري'),
  (NULL, 'tax_item_categories', 'IMPORT',       'Imports',                      'واردات',                    'Goods imported into KSA — subject to customs + VAT',         'سلع مستوردة إلى المملكة — خاضعة لجمارك وضريبة'),
  (NULL, 'tax_item_categories', 'EXEMPT',       'Exempt Items',                 'بنود معفاة',                'Items exempt from VAT per ZATCA regulations',                'بنود معفاة من ض.ق.م حسب أنظمة هيئة الزكاة'),
  (NULL, 'tax_item_categories', 'GCC-SUPPLY',   'GCC Intra-Supply',             'توريد بيني خليجي',          'Goods transferred within GCC member states',                 'سلع محولة بين دول مجلس التعاون'),
  (NULL, 'tax_item_categories', 'CAPITAL',      'Capital Assets',               'أصول رأسمالية',             'Fixed assets and capital expenditure items',                 'أصول ثابتة وبنود إنفاق رأسمالي'),
  (NULL, 'tax_item_categories', 'REEXPORT',     'Re-Export Items',              'بنود إعادة تصدير',          'Imported goods re-exported — duty drawback eligible',        'سلع مستوردة معاد تصديرها — مؤهلة لاسترداد الرسوم')
ON CONFLICT (type, code, COALESCE(company_id, 0)) WHERE deleted_at IS NULL DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. REFERENCE DATA: Zakat Codes - رموز الزكاة                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar) VALUES
  (NULL, 'zakat_codes', 'ZK-STD',     'Standard Zakat',              'زكاة عادية',              'Standard 2.5% Zakat on adjusted net profit or Zakat base',     'زكاة بنسبة 2.5% على صافي الربح المعدل أو وعاء الزكاة'),
  (NULL, 'zakat_codes', 'ZK-AGR',     'Agricultural Zakat',          'زكاة زراعية',             'Zakat on agricultural produce — 5% irrigated, 10% rain-fed',   'زكاة على المنتجات الزراعية — 5% مروية، 10% بعلية'),
  (NULL, 'zakat_codes', 'ZK-TRADE',   'Trading Assets Zakat',        'زكاة عروض تجارة',         'Zakat on trading inventory and commercial assets',             'زكاة على المخزون التجاري والأصول التجارية'),
  (NULL, 'zakat_codes', 'ZK-GOLD',    'Gold & Silver Zakat',         'زكاة ذهب وفضة',           'Zakat on gold and silver holdings exceeding nisab',             'زكاة على حيازة الذهب والفضة فوق النصاب'),
  (NULL, 'zakat_codes', 'ZK-CASH',    'Cash & Receivables Zakat',    'زكاة نقد وذمم',           'Zakat on cash balances and accounts receivable',               'زكاة على الأرصدة النقدية والذمم المدينة'),
  (NULL, 'zakat_codes', 'ZK-INVEST',  'Investment Zakat',            'زكاة استثمارات',          'Zakat on investment income and portfolios',                    'زكاة على دخل الاستثمارات والمحافظ'),
  (NULL, 'zakat_codes', 'ZK-RESTATE', 'Real Estate Zakat',           'زكاة عقارات',             'Zakat on properties held for trading (not personal use)',       'زكاة على العقارات المحتفظ بها للتجارة (ليس الاستخدام الشخصي)'),
  (NULL, 'zakat_codes', 'ZK-EXM',     'Zakat Exempt',                'معفى من الزكاة',          'Items exempt from Zakat (personal assets, operational assets)', 'بنود معفاة من الزكاة (أصول شخصية، أصول تشغيلية)'),
  (NULL, 'zakat_codes', 'ZK-FOREIGN', 'Foreign Entity Zakat',        'زكاة كيان أجنبي',         'Income tax applied to foreign-owned entities in lieu of Zakat', 'ضريبة دخل مطبقة على الكيانات الأجنبية بدلاً من الزكاة'),
  (NULL, 'zakat_codes', 'ZK-MIXED',   'Mixed Ownership Zakat',       'زكاة ملكية مختلطة',       'Combined Zakat/Tax for Saudi-foreign joint ventures',          'زكاة/ضريبة مجتمعة للمشاريع المشتركة السعودية-الأجنبية')
ON CONFLICT (type, code, COALESCE(company_id, 0)) WHERE deleted_at IS NULL DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. REFERENCE DATA: Tax Zones - مناطق ضريبية                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar) VALUES
  -- Saudi Arabia Zones
  (NULL, 'tax_zones', 'KSA-STD',     'Saudi Arabia — Standard',       'المملكة العربية السعودية — عادي',     'Standard VAT 15% zone within Saudi Arabia',               'منطقة ض.ق.م 15% العادية داخل المملكة'),
  (NULL, 'tax_zones', 'KSA-ZERO',    'Saudi Arabia — Zero Rated',     'المملكة — معدل صفري',                 'Zero-rated supplies within Saudi Arabia',                 'توريدات بمعدل صفري داخل المملكة'),
  (NULL, 'tax_zones', 'KSA-EXEMPT',  'Saudi Arabia — Exempt',         'المملكة — معفى',                      'VAT-exempt supplies within Saudi Arabia',                 'توريدات معفاة من ض.ق.م داخل المملكة'),
  (NULL, 'tax_zones', 'KSA-FZ',      'Saudi Free Zones',              'مناطق حرة سعودية',                   'Special economic zones (NEOM, KAEC)',                     'مناطق اقتصادية خاصة (نيوم، مدينة الملك عبدالله)'),
  -- GCC Zones
  (NULL, 'tax_zones', 'UAE-STD',     'UAE — Standard',                'الإمارات — عادي',                     'UAE standard VAT zone at 5%',                             'منطقة ض.ق.م الإماراتية 5%'),
  (NULL, 'tax_zones', 'UAE-FZ',      'UAE — Free Zone',               'الإمارات — منطقة حرة',                'UAE designated free zone — zero-rated',                   'منطقة حرة إماراتية معينة — معدل صفري'),
  (NULL, 'tax_zones', 'BHR-STD',     'Bahrain — Standard',            'البحرين — عادي',                      'Bahrain standard VAT zone at 10%',                        'منطقة ض.ق.م البحرينية 10%'),
  (NULL, 'tax_zones', 'OMN-STD',     'Oman — Standard',               'عُمان — عادي',                        'Oman standard VAT zone at 5%',                            'منطقة ض.ق.م العُمانية 5%'),
  (NULL, 'tax_zones', 'KWT-NONE',    'Kuwait — No VAT',               'الكويت — بدون ض.ق.م',                 'Kuwait — VAT not yet implemented',                        'الكويت — ض.ق.م لم تُطبق بعد'),
  (NULL, 'tax_zones', 'QAT-NONE',    'Qatar — No VAT',                'قطر — بدون ض.ق.م',                    'Qatar — VAT not yet implemented',                         'قطر — ض.ق.م لم تُطبق بعد'),
  -- International Zones
  (NULL, 'tax_zones', 'EU-STD',      'European Union — Standard',     'الاتحاد الأوروبي — عادي',             'EU VAT territory (reverse charge applies)',                'أراضي ض.ق.م الأوروبية (الرسوم العكسية تطبق)'),
  (NULL, 'tax_zones', 'INTL-EXPORT', 'International Export',           'تصدير دولي',                         'Export outside GCC — zero-rated',                         'تصدير خارج دول المجلس — معدل صفري'),
  (NULL, 'tax_zones', 'INTL-IMPORT', 'International Import',           'استيراد دولي',                        'Import from outside GCC — customs + VAT',                 'استيراد من خارج دول المجلس — جمارك + ض.ق.م'),
  (NULL, 'tax_zones', 'GCC-INTRA',   'GCC Intra-Supply',              'توريد بيني خليجي',                   'Goods/services between GCC member states',                'سلع/خدمات بين دول مجلس التعاون')
ON CONFLICT (type, code, COALESCE(company_id, 0)) WHERE deleted_at IS NULL DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. COMPANY-SCOPED DATA (per company loop)                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  comp RECORD;
  vat15_id INTEGER;
  vat5_id INTEGER;
  vat0_id INTEGER;
  vatex_id INTEGER;
  cust5_id INTEGER;
  wht5_id INTEGER;
  wht15_id INTEGER;
  wht20_id INTEGER;
  zakat_id INTEGER;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP

    -- ────────────────────────────────────────────────────────────────────
    -- 4A. TAX RATES - معدلات الضرائب
    -- Must resolve tax_type_id from tax_types (seeded by migration 428)
    -- ────────────────────────────────────────────────────────────────────

    -- Get tax_type IDs for this company
    SELECT id INTO vat15_id FROM tax_types WHERE company_id = comp.id AND code = 'VAT-15' LIMIT 1;
    SELECT id INTO vat5_id  FROM tax_types WHERE company_id = comp.id AND code = 'VAT-5'  LIMIT 1;
    SELECT id INTO vat0_id  FROM tax_types WHERE company_id = comp.id AND code = 'VAT-0'  LIMIT 1;
    SELECT id INTO vatex_id FROM tax_types WHERE company_id = comp.id AND code = 'VAT-EX' LIMIT 1;
    SELECT id INTO cust5_id FROM tax_types WHERE company_id = comp.id AND code = 'CUST-5' LIMIT 1;
    SELECT id INTO wht5_id  FROM tax_types WHERE company_id = comp.id AND code = 'WHT-5'  LIMIT 1;
    SELECT id INTO wht15_id FROM tax_types WHERE company_id = comp.id AND code = 'WHT-15' LIMIT 1;
    SELECT id INTO wht20_id FROM tax_types WHERE company_id = comp.id AND code = 'WHT-20' LIMIT 1;
    SELECT id INTO zakat_id FROM tax_types WHERE company_id = comp.id AND code = 'ZAKAT'  LIMIT 1;

    INSERT INTO tax_rates (company_id, code, name, name_ar, tax_type_id, rate, effective_from, effective_to, region, item_category, is_default, is_active, notes)
    VALUES
      -- VAT Rates
      (comp.id, 'VAT-STD-15',     'VAT Standard 15%',            'ض.ق.م عادي 15%',            vat15_id, 15.0000, '2020-07-01', NULL,          'Saudi Arabia',    'General',       true,  true, 'Standard KSA VAT rate effective July 2020'),
      (comp.id, 'VAT-RED-5',      'VAT Reduced 5%',              'ض.ق.م مخفض 5%',              vat5_id,   5.0000, '2018-01-01', '2020-06-30', 'Saudi Arabia',    'General',       false, true, 'Previous KSA VAT rate 2018-2020'),
      (comp.id, 'VAT-ZERO',       'VAT Zero Rate',               'ض.ق.م صفري',                 vat0_id,   0.0000, '2018-01-01', NULL,          'Saudi Arabia',    'Exports',       false, true, 'Zero-rated supplies: exports, intl transport, qualified medicines'),
      (comp.id, 'VAT-EXEMPT',     'VAT Exempt',                  'معفى من ض.ق.م',              vatex_id,  0.0000, '2018-01-01', NULL,          'Saudi Arabia',    'Exempt',        false, true, 'Exempt: financial services, residential rent, local transport'),
      -- UAE VAT Rates
      (comp.id, 'VAT-UAE-5',      'UAE VAT 5%',                  'ض.ق.م إماراتي 5%',           vat5_id,   5.0000, '2018-01-01', NULL,          'UAE',             'General',       false, true, 'UAE standard VAT rate'),
      -- Bahrain VAT Rates
      (comp.id, 'VAT-BHR-10',     'Bahrain VAT 10%',             'ض.ق.م بحريني 10%',           vat15_id, 10.0000, '2022-01-01', NULL,          'Bahrain',         'General',       false, true, 'Bahrain standard VAT rate'),
      -- Customs Duty Rates
      (comp.id, 'CUST-GEN-5',     'General Customs 5%',          'رسوم جمركية عامة 5%',        cust5_id,  5.0000, '2020-01-01', NULL,          'Saudi Arabia',    'General',       true,  true, 'GCC Common External Tariff — standard rate'),
      (comp.id, 'CUST-PROT-12',   'Protective Duty 12%',         'رسوم حماية 12%',             cust5_id, 12.0000, '2020-07-01', NULL,          'Saudi Arabia',    'Protected',     false, true, 'Protective duties on select industries'),
      (comp.id, 'CUST-PROT-20',   'Protective Duty 20%',         'رسوم حماية 20%',             cust5_id, 20.0000, '2020-07-01', NULL,          'Saudi Arabia',    'Protected',     false, true, 'Higher protective duties on building materials'),
      (comp.id, 'CUST-TOBACCO',   'Tobacco Customs 100%',        'جمارك تبغ 100%',             cust5_id,100.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Tobacco',       false, true, 'Tobacco products customs duty'),
      (comp.id, 'CUST-FREE',      'Duty Free',                   'إعفاء جمركي',                cust5_id,  0.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Exempt',        false, true, 'GCC origin goods / free trade agreement'),
      -- Withholding Tax Rates
      (comp.id, 'WHT-MGMT-20',    'WHT Management 20%',          'استقطاع إدارة 20%',          wht20_id, 20.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Management',    false, true, 'Management fees from non-resident'),
      (comp.id, 'WHT-TECH-15',    'WHT Technical 15%',           'استقطاع تقني 15%',           wht15_id, 15.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Technical',     false, true, 'Technical/consulting services from non-resident'),
      (comp.id, 'WHT-RENT-5',     'WHT Rental 5%',               'استقطاع إيجار 5%',           wht5_id,   5.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Rental',        false, true, 'Equipment rental from non-resident'),
      (comp.id, 'WHT-ROYAL-15',   'WHT Royalties 15%',           'استقطاع إتاوات 15%',         wht15_id, 15.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Royalties',     false, true, 'Royalties and IP licenses from non-resident'),
      (comp.id, 'WHT-INSUR-5',    'WHT Insurance 5%',            'استقطاع تأمين 5%',           wht5_id,   5.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Insurance',     false, true, 'Insurance premiums to non-resident'),
      (comp.id, 'WHT-TICKT-5',    'WHT Airline Tickets 5%',      'استقطاع تذاكر 5%',           wht5_id,   5.0000, '2020-01-01', NULL,          'Saudi Arabia',    'Transport',     false, true, 'International transport tickets from non-resident'),
      -- Zakat Rate
      (comp.id, 'ZAKAT-STD',      'Zakat Standard 2.5%',         'زكاة عادية 2.5%',            zakat_id,  2.5000, '2020-01-01', NULL,          'Saudi Arabia',    'General',       true,  true, 'Standard Zakat rate on adjusted Zakat base')
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, tax_type_id = EXCLUDED.tax_type_id,
      rate = EXCLUDED.rate, effective_from = EXCLUDED.effective_from, effective_to = EXCLUDED.effective_to,
      region = EXCLUDED.region, item_category = EXCLUDED.item_category, is_default = EXCLUDED.is_default,
      notes = EXCLUDED.notes;


    -- ────────────────────────────────────────────────────────────────────
    -- 4B. TAX CODES - رموز ضريبية (ZATCA compliant)
    -- ────────────────────────────────────────────────────────────────────

    INSERT INTO tax_codes (company_id, code, name, name_ar, description, applies_to, vat_rate, customs_rate, excise_rate, withholding_rate, is_zero_rated, is_exempt, is_reverse_charge, zatca_code, effective_from, effective_to, is_active, notes)
    VALUES
      -- Standard VAT Codes
      (comp.id, 'S',       'Standard Rated',           'خاضع بالمعدل العادي',    'Standard rated supply subject to 15% VAT',                     'both',      15.0000, 0, 0, 0, false, false, false, 'S',     '2020-07-01', NULL, true, 'ZATCA standard rated code'),
      (comp.id, 'SR',      'Standard Rated (Sales)',   'خاضع عادي (مبيعات)',     'Standard rated — sales only',                                  'sales',     15.0000, 0, 0, 0, false, false, false, 'S',     '2020-07-01', NULL, true, 'Sales-only standard rated'),
      (comp.id, 'SP',      'Standard Rated (Purchase)','خاضع عادي (مشتريات)',    'Standard rated — purchases only',                              'purchases', 15.0000, 0, 0, 0, false, false, false, 'S',     '2020-07-01', NULL, true, 'Purchases-only standard rated'),
      -- Zero Rate
      (comp.id, 'Z',       'Zero Rated',               'معدل صفري',              'Zero-rated supply (exports, intl transport, qualified meds)',   'both',       0.0000, 0, 0, 0, true,  false, false, 'Z',     '2018-01-01', NULL, true, 'ZATCA zero rated code'),
      (comp.id, 'ZE',      'Zero Rated Export',        'صادرات صفرية',           'Zero-rated — export of goods outside GCC',                     'sales',      0.0000, 0, 0, 0, true,  false, false, 'Z',     '2018-01-01', NULL, true, 'Export zero-rated'),
      (comp.id, 'ZM',      'Zero Rated Medicines',     'أدوية صفرية',            'Zero-rated qualified medicines per ZATCA list',                'both',       0.0000, 0, 0, 0, true,  false, false, 'Z',     '2018-01-01', NULL, true, 'Medicines on ZATCA qualified list'),
      -- Exempt
      (comp.id, 'E',       'Exempt',                   'معفى',                   'VAT-exempt supply (financial services, residential rent)',      'both',       0.0000, 0, 0, 0, false, true,  false, 'E',     '2018-01-01', NULL, true, 'ZATCA exempt code'),
      (comp.id, 'EF',      'Exempt Financial',         'معفى مالي',              'Exempt financial services',                                    'both',       0.0000, 0, 0, 0, false, true,  false, 'E',     '2018-01-01', NULL, true, 'Exempt financial services'),
      (comp.id, 'ER',      'Exempt Residential Rent',  'معفى إيجار سكني',        'Exempt residential property rental',                           'both',       0.0000, 0, 0, 0, false, true,  false, 'E',     '2018-01-01', NULL, true, 'Exempt residential rental'),
      -- Reverse Charge
      (comp.id, 'RC',      'Reverse Charge',           'رسوم عكسية',             'Reverse charge — buyer accounts for VAT',                      'purchases',  15.0000, 0, 0, 0, false, false, true,  'RC',    '2018-01-01', NULL, true, 'ZATCA reverse charge code'),
      (comp.id, 'RCGCC',   'Reverse Charge GCC',       'رسوم عكسية خليجي',       'Reverse charge for GCC intra-supply',                          'purchases',  15.0000, 0, 0, 0, false, false, true,  'RC',    '2018-01-01', NULL, true, 'GCC intra-supply reverse charge'),
      -- Out of Scope
      (comp.id, 'OUT',     'Out of Scope',             'خارج النطاق',            'Transactions outside VAT scope',                               'both',       0.0000, 0, 0, 0, false, false, false, 'O',     '2018-01-01', NULL, true, 'ZATCA out of scope code'),
      -- Combined Codes (customs + VAT)
      (comp.id, 'IMP-S',   'Import Standard',          'استيراد خاضع',           'Import: 5% customs duty + 15% VAT',                            'purchases', 15.0000, 5.0000, 0, 0, false, false, false, 'S', '2020-07-01', NULL, true, 'Standard import with customs'),
      (comp.id, 'IMP-Z',   'Import Zero Rated',        'استيراد صفري',           'Import: 5% customs duty + 0% VAT',                             'purchases',  0.0000, 5.0000, 0, 0, true,  false, false, 'Z', '2018-01-01', NULL, true, 'Zero-rated import'),
      (comp.id, 'IMP-GCC', 'GCC Origin Import',        'استيراد منشأ خليجي',     'GCC origin: 0% customs + 15% VAT',                             'purchases', 15.0000, 0.0000, 0, 0, false, false, false, 'S', '2020-07-01', NULL, true, 'GCC origin duty-free import'),
      -- Withholding Codes
      (comp.id, 'WHT-5',   'Withholding 5%',           'استقطاع 5%',             'Withholding tax at 5% — equipment rental, insurance',          'purchases',  0.0000, 0, 0, 5.0000, false, false, false, NULL, '2020-01-01', NULL, true, 'WHT 5% non-resident payments'),
      (comp.id, 'WHT-15',  'Withholding 15%',          'استقطاع 15%',            'Withholding tax at 15% — royalties, technical services',       'purchases',  0.0000, 0, 0, 15.0000, false, false, false, NULL, '2020-01-01', NULL, true, 'WHT 15% non-resident payments'),
      (comp.id, 'WHT-20',  'Withholding 20%',          'استقطاع 20%',            'Withholding tax at 20% — management fees',                     'purchases',  0.0000, 0, 0, 20.0000, false, false, false, NULL, '2020-01-01', NULL, true, 'WHT 20% non-resident payments'),
      -- Excise + VAT
      (comp.id, 'EXC-TOBACCO', 'Excise Tobacco',       'انتقائي تبغ',            'Excise 100% + VAT 15% on tobacco',                             'both',      15.0000, 0, 100.0000, 0, false, false, false, 'S', '2020-07-01', NULL, true, 'Tobacco excise + VAT'),
      (comp.id, 'EXC-DRINKS',  'Excise Beverages',     'انتقائي مشروبات',        'Excise 50% + VAT 15% on carbonated/energy drinks',             'both',      15.0000, 0,  50.0000, 0, false, false, false, 'S', '2020-07-01', NULL, true, 'Beverages excise + VAT')
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      applies_to = EXCLUDED.applies_to, vat_rate = EXCLUDED.vat_rate, customs_rate = EXCLUDED.customs_rate,
      excise_rate = EXCLUDED.excise_rate, withholding_rate = EXCLUDED.withholding_rate,
      is_zero_rated = EXCLUDED.is_zero_rated, is_exempt = EXCLUDED.is_exempt,
      is_reverse_charge = EXCLUDED.is_reverse_charge, zatca_code = EXCLUDED.zatca_code,
      effective_from = EXCLUDED.effective_from, notes = EXCLUDED.notes;


    -- ────────────────────────────────────────────────────────────────────
    -- 4C. TAXES - ضرائب (the main taxes register)
    -- CHECK: tax_type IN ('vat','withholding','sales','zatca','custom')
    -- CHECK: rate >= 0 AND rate <= 100
    -- ────────────────────────────────────────────────────────────────────

    INSERT INTO taxes (company_id, code, name, name_ar, tax_type, rate, description, is_active)
    VALUES
      -- VAT entries
      (comp.id, 'VAT-15',       'Value Added Tax 15%',               'ضريبة القيمة المضافة 15%',        'vat',         15.00,  'Saudi Arabia standard VAT rate effective July 2020',          true),
      (comp.id, 'VAT-5',        'Value Added Tax 5%',                'ضريبة القيمة المضافة 5%',         'vat',          5.00,  'Previous/transitional VAT rate or special reduced rate',      true),
      (comp.id, 'VAT-0',        'Value Added Tax 0%',                'ضريبة القيمة المضافة 0%',         'vat',          0.00,  'Zero-rated VAT for exports and qualifying supplies',          true),
      (comp.id, 'VAT-EXEMPT',   'VAT Exempt',                        'معفى من ض.ق.م',                  'vat',          0.00,  'Exempt from VAT — financial services, residential rent',      true),
      (comp.id, 'VAT-INC',      'VAT 15% Inclusive',                  'ض.ق.م 15% شامل السعر',           'vat',         15.00,  'VAT inclusive in price — used for retail/POS transactions',   true),
      -- Withholding Tax
      (comp.id, 'WHT-5',        'Withholding Tax 5%',                'ضريبة استقطاع 5%',                'withholding',  5.00,  'Equipment rental, insurance — non-resident payments',         true),
      (comp.id, 'WHT-10',       'Withholding Tax 10%',               'ضريبة استقطاع 10%',               'withholding', 10.00,  'Dividends to non-resident partners',                          true),
      (comp.id, 'WHT-15',       'Withholding Tax 15%',               'ضريبة استقطاع 15%',               'withholding', 15.00,  'Royalties, technical and consulting services',                true),
      (comp.id, 'WHT-20',       'Withholding Tax 20%',               'ضريبة استقطاع 20%',               'withholding', 20.00,  'Management fees to non-resident entities',                    true),
      -- Sales Tax (non-VAT jurisdictions)
      (comp.id, 'SALES-GEN',    'General Sales Tax',                  'ضريبة مبيعات عامة',              'sales',        5.00,  'Generic sales tax for jurisdictions without VAT',             true),
      (comp.id, 'SALES-SVC',    'Service Sales Tax',                  'ضريبة مبيعات خدمات',             'sales',       10.00,  'Sales tax on services',                                       true),
      -- ZATCA
      (comp.id, 'ZATCA-VAT',    'ZATCA VAT 15%',                     'ض.ق.م هيئة الزكاة 15%',          'zatca',       15.00,  'ZATCA-regulated VAT reported in e-invoicing',                 true),
      (comp.id, 'ZATCA-ZERO',   'ZATCA Zero Rate',                   'هيئة الزكاة معدل صفري',          'zatca',        0.00,  'ZATCA zero-rated e-invoice line item',                        true),
      (comp.id, 'ZATCA-EXEMPT', 'ZATCA Exempt',                      'هيئة الزكاة معفى',               'zatca',        0.00,  'ZATCA exempt e-invoice line item',                            true),
      -- Custom Duties
      (comp.id, 'CUST-5',       'Customs Duty 5%',                   'رسوم جمركية 5%',                 'custom',       5.00,  'GCC Common External Tariff — standard rate',                  true),
      (comp.id, 'CUST-12',      'Customs Duty 12%',                  'رسوم جمركية 12%',                'custom',      12.00,  'Protective customs duty on manufactured goods',               true),
      (comp.id, 'CUST-20',      'Customs Duty 20%',                  'رسوم جمركية 20%',                'custom',      20.00,  'Protective customs duty on building materials',               true),
      (comp.id, 'CUST-0',       'Customs Exempt',                    'إعفاء جمركي',                    'custom',       0.00,  'GCC origin goods or free trade agreement exempt',             true),
      (comp.id, 'CUST-100',     'Customs Duty 100%',                 'رسوم جمركية 100%',               'custom',     100.00,  'Tobacco and prohibited goods customs rate',                   true)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, tax_type = EXCLUDED.tax_type,
      rate = EXCLUDED.rate, description = EXCLUDED.description;


    -- ────────────────────────────────────────────────────────────────────
    -- 4D. DIGITAL SIGNATURES - التوقيعات الرقمية
    -- ────────────────────────────────────────────────────────────────────

    INSERT INTO digital_signatures (company_id, signature_name_en, signature_name_ar, signature_title_en, signature_title_ar, department, signature_type, is_active)
    VALUES
      (comp.id, 'CEO Signature',              'توقيع الرئيس التنفيذي',         'Chief Executive Officer',      'الرئيس التنفيذي',            'Executive',     'manual',              true),
      (comp.id, 'CFO Signature',              'توقيع المدير المالي',            'Chief Financial Officer',      'المدير المالي',               'Finance',       'manual',              true),
      (comp.id, 'Finance Manager',            'توقيع مدير المالية',             'Finance Manager',              'مدير المالية',                'Finance',       'manual',              true),
      (comp.id, 'Accounting Manager',         'توقيع مدير المحاسبة',            'Accounting Manager',           'مدير المحاسبة',               'Accounting',    'manual',              true),
      (comp.id, 'Procurement Manager',        'توقيع مدير المشتريات',           'Procurement Manager',          'مدير المشتريات',              'Procurement',   'manual',              true),
      (comp.id, 'Warehouse Manager',          'توقيع مدير المستودعات',          'Warehouse Manager',            'مدير المستودعات',             'Warehousing',   'manual',              true),
      (comp.id, 'Sales Manager',              'توقيع مدير المبيعات',            'Sales Manager',                'مدير المبيعات',               'Sales',         'manual',              true),
      (comp.id, 'HR Manager',                 'توقيع مدير الموارد البشرية',     'Human Resources Manager',      'مدير الموارد البشرية',        'HR',            'manual',              true),
      (comp.id, 'IT Manager',                 'توقيع مدير تقنية المعلومات',     'IT Manager',                   'مدير تقنية المعلومات',        'IT',            'manual',              true),
      (comp.id, 'Operations Manager',         'توقيع مدير العمليات',            'Operations Manager',           'مدير العمليات',               'Operations',    'manual',              true),
      (comp.id, 'Legal Advisor',              'توقيع المستشار القانوني',        'Legal Advisor',                'المستشار القانوني',           'Legal',         'manual',              true),
      (comp.id, 'Auditor Signature',          'توقيع المراجع',                 'Internal Auditor',             'المراجع الداخلي',             'Audit',         'manual',              true),
      (comp.id, 'Quality Manager',            'توقيع مدير الجودة',             'Quality Manager',              'مدير الجودة',                 'Quality',       'manual',              true),
      (comp.id, 'Logistics Manager',          'توقيع مدير الخدمات اللوجستية',  'Logistics Manager',            'مدير الخدمات اللوجستية',      'Logistics',     'manual',              true),
      (comp.id, 'ZATCA E-Invoice Stamp',      'ختم الفاتورة الإلكترونية',       'ZATCA E-Invoice Digital Stamp','ختم الفاتورة الرقمية للهيئة', 'Finance',       'digital_certificate', true),
      (comp.id, 'Official Company Seal',      'الختم الرسمي للشركة',           'Official Company Seal',        'الختم الرسمي للشركة',         'Administration','digital_certificate', true)
    ON CONFLICT DO NOTHING;


    -- ────────────────────────────────────────────────────────────────────
    -- 4E. UI THEMES - سمات واجهة المستخدم
    -- ────────────────────────────────────────────────────────────────────

    INSERT INTO ui_themes (company_id, name_en, name_ar, theme_code, primary_color, secondary_color, accent_color, background_color, text_color, sidebar_color, header_color, font_family, font_size_base, border_radius, is_active, is_default)
    VALUES
      (comp.id, 'Default Light',       'الافتراضي فاتح',     'default',    '#3B82F6', '#6366F1', '#F59E0B', '#F9FAFB', '#111827', '#1F2937', '#FFFFFF', 'Inter',          14, 6,  true,  true),
      (comp.id, 'Dark Mode',           'الوضع الداكن',       'dark',       '#60A5FA', '#818CF8', '#FBBF24', '#111827', '#F9FAFB', '#0F172A', '#1E293B', 'Inter',          14, 6,  true,  false),
      (comp.id, 'Corporate Blue',      'أزرق مؤسسي',         'blue',       '#1D4ED8', '#3B82F6', '#F97316', '#EFF6FF', '#1E3A5F', '#1E3A5F', '#1D4ED8', 'Inter',          14, 8,  true,  false),
      (comp.id, 'Forest Green',        'أخضر غابي',          'green',      '#059669', '#10B981', '#F59E0B', '#ECFDF5', '#064E3B', '#064E3B', '#059669', 'Inter',          14, 8,  true,  false),
      (comp.id, 'Corporate',           'رسمي مؤسسي',         'corporate',  '#1E40AF', '#3730A3', '#DC2626', '#F8FAFC', '#0F172A', '#0F172A', '#1E40AF', 'IBM Plex Sans',  14, 4,  true,  false),
      (comp.id, 'Saudi Heritage',      'تراث سعودي',         'saudi',      '#006C35', '#8B6914', '#C8102E', '#FFFBF0', '#1A1A1A', '#1A2E1A', '#006C35', 'Cairo',          14, 6,  true,  false),
      (comp.id, 'Minimal Gray',        'رمادي بسيط',         'minimal',    '#475569', '#64748B', '#3B82F6', '#FFFFFF', '#1E293B', '#F1F5F9', '#F8FAFC', 'Inter',          13, 4,  true,  false),
      (comp.id, 'High Contrast',       'تباين عالي',         'contrast',   '#000000', '#1A1A1A', '#FFD700', '#FFFFFF', '#000000', '#000000', '#FFFFFF', 'Inter',          15, 2,  true,  false),
      (comp.id, 'Ocean Teal',          'أزرق محيطي',         'teal',       '#0D9488', '#14B8A6', '#F59E0B', '#F0FDFA', '#134E4A', '#134E4A', '#0D9488', 'Inter',          14, 8,  true,  false),
      (comp.id, 'Sunset Warm',         'دافئ غروب',          'sunset',     '#DC2626', '#F97316', '#FBBF24', '#FFF7ED', '#7C2D12', '#7C2D12', '#DC2626', 'Inter',          14, 10, true,  false)
    ON CONFLICT (company_id, theme_code, deleted_at) DO UPDATE SET
      name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
      primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color,
      accent_color = EXCLUDED.accent_color, background_color = EXCLUDED.background_color,
      text_color = EXCLUDED.text_color, sidebar_color = EXCLUDED.sidebar_color,
      header_color = EXCLUDED.header_color, font_family = EXCLUDED.font_family,
      font_size_base = EXCLUDED.font_size_base, border_radius = EXCLUDED.border_radius;


  END LOOP;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5. SYSTEM-LEVEL UI THEMES (company_id = NULL = global themes)          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO ui_themes (company_id, name_en, name_ar, theme_code, primary_color, secondary_color, accent_color, background_color, text_color, sidebar_color, header_color, font_family, font_size_base, border_radius, is_active, is_default)
VALUES
  (NULL, 'System Default',     'الافتراضي للنظام',  'system-default', '#3B82F6', '#6366F1', '#F59E0B', '#F9FAFB', '#111827', '#1F2937', '#FFFFFF', 'Inter', 14, 6, true, true),
  (NULL, 'System Dark',        'النظام الداكن',     'system-dark',    '#60A5FA', '#818CF8', '#FBBF24', '#0F172A', '#F9FAFB', '#020617', '#1E293B', 'Inter', 14, 6, true, false)
ON CONFLICT (company_id, theme_code, deleted_at) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color;


COMMIT;
