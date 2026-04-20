-- ============================================================================
-- 428: بيانات مرجعية شاملة - البيانات المالية والضريبية
-- Comprehensive Reference Data - Financial, Tax & Payment Data
-- ============================================================================

BEGIN;

DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP

    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 1. PAYMENT TERMS - شروط الدفع                                     ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO payment_terms (company_id, code, name, name_ar, days, discount_days, discount_percent, description, is_default)
    VALUES
      (comp.id, 'CASH',     'Cash / Immediate',        'نقداً / فوري',        0,   NULL, NULL,  'Payment due immediately upon receipt',         false),
      (comp.id, 'ADVANCE',  'Advance Payment',          'دفع مقدم',           -1,  NULL, NULL,  'Full payment before delivery',                 false),
      (comp.id, 'COD',      'Cash on Delivery',         'الدفع عند التسليم',   0,   NULL, NULL,  'Payment upon goods delivery',                  false),
      (comp.id, 'NET7',     'Net 7 Days',               'صافي 7 أيام',        7,   NULL, NULL,  'Full payment due in 7 days',                   false),
      (comp.id, 'NET15',    'Net 15 Days',              'صافي 15 يوم',        15,  NULL, NULL,  'Full payment due in 15 days',                  false),
      (comp.id, 'NET30',    'Net 30 Days',              'صافي 30 يوم',        30,  NULL, NULL,  'Full payment due in 30 days',                  true),
      (comp.id, 'NET45',    'Net 45 Days',              'صافي 45 يوم',        45,  NULL, NULL,  'Full payment due in 45 days',                  false),
      (comp.id, 'NET60',    'Net 60 Days',              'صافي 60 يوم',        60,  NULL, NULL,  'Full payment due in 60 days',                  false),
      (comp.id, 'NET90',    'Net 90 Days',              'صافي 90 يوم',        90,  NULL, NULL,  'Full payment due in 90 days',                  false),
      (comp.id, 'NET120',   'Net 120 Days',             'صافي 120 يوم',       120, NULL, NULL,  'Full payment due in 120 days',                 false),
      (comp.id, '2N10',     '2% 10 Net 30',             '2% خصم 10 أيام صافي 30', 30, 10, 2.00, '2% discount if paid within 10 days, net 30',  false),
      (comp.id, '1N15',     '1% 15 Net 45',             '1% خصم 15 يوم صافي 45', 45, 15, 1.00, '1% discount if paid within 15 days, net 45',   false),
      (comp.id, '3N10',     '3% 10 Net 60',             '3% خصم 10 أيام صافي 60', 60, 10, 3.00, '3% discount if paid within 10 days, net 60',  false),
      (comp.id, 'EOM',      'End of Month',             'نهاية الشهر',        30,  NULL, NULL,  'Payment due at end of invoice month',           false),
      (comp.id, 'EOM30',    'End of Month + 30',        'نهاية الشهر + 30',   60,  NULL, NULL,  'Payment due 30 days after month end',           false),
      (comp.id, 'INST2',    '2 Installments',           'دفعتين',             60,  NULL, NULL,  '50% upon delivery, 50% after 30 days',         false),
      (comp.id, 'INST3',    '3 Installments',           'ثلاث دفعات',         90,  NULL, NULL,  '33% each at 30/60/90 days',                    false),
      (comp.id, 'INST4',    '4 Installments',           'أربع دفعات',         120, NULL, NULL,  '25% each at 30/60/90/120 days',                false),
      (comp.id, 'LC30',     'Letter of Credit 30 Days', 'اعتماد مستندي 30 يوم', 30, NULL, NULL, 'Payment via LC at 30 days sight',              false),
      (comp.id, 'LC60',     'Letter of Credit 60 Days', 'اعتماد مستندي 60 يوم', 60, NULL, NULL, 'Payment via LC at 60 days sight',              false),
      (comp.id, 'LC90',     'Letter of Credit 90 Days', 'اعتماد مستندي 90 يوم', 90, NULL, NULL, 'Payment via LC at 90 days sight',              false),
      (comp.id, 'LCSG',     'Letter of Credit at Sight','اعتماد مستندي بالاطلاع', 0, NULL, NULL, 'Immediate payment upon LC presentation',     false),
      (comp.id, 'DEP25',    '25% Deposit + Balance',    'مقدم 25% + الباقي',   30, NULL, NULL,  '25% deposit, balance on delivery',              false),
      (comp.id, 'DEP50',    '50% Deposit + Balance',    'مقدم 50% + الباقي',   30, NULL, NULL,  '50% deposit, balance on delivery',              false),
      (comp.id, 'PROG',     'Progress Payments',        'دفعات حسب التقدم',   0,  NULL, NULL,  'Milestone-based progress payments',             false)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, days = EXCLUDED.days,
      discount_days = EXCLUDED.discount_days, discount_percent = EXCLUDED.discount_percent,
      description = EXCLUDED.description;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 2. PAYMENT METHODS - طرق الدفع                                    ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO payment_methods (company_id, code, name, name_ar, payment_type, requires_bank_account, is_active)
    VALUES
      (comp.id, 'CASH',       'Cash',                    'نقداً',               'cash',        false, true),
      (comp.id, 'BANK-TRF',   'Bank Transfer',           'تحويل بنكي',          'bank',        true,  true),
      (comp.id, 'WIRE',       'Wire Transfer',            'حوالة سلكية',         'wire',        true,  true),
      (comp.id, 'CHECK',      'Check / Cheque',           'شيك',                 'check',       true,  true),
      (comp.id, 'CC-VISA',    'Visa Credit Card',         'فيزا',                'credit_card', false, true),
      (comp.id, 'CC-MC',      'Mastercard',               'ماستركارد',           'credit_card', false, true),
      (comp.id, 'CC-AMEX',    'American Express',         'أمريكان إكسبريس',     'credit_card', false, true),
      (comp.id, 'MADA',       'Mada Debit Card',          'بطاقة مدى',           'credit_card', false, true),
      (comp.id, 'STCPAY',     'STC Pay',                  'STC Pay',             'cash',        false, true),
      (comp.id, 'APPLEPAY',   'Apple Pay',                'أبل باي',             'credit_card', false, true),
      (comp.id, 'LC',         'Letter of Credit',         'اعتماد مستندي',       'bank',        true,  true),
      (comp.id, 'BG',         'Bank Guarantee',           'ضمان بنكي',           'bank',        true,  true),
      (comp.id, 'DRAFT',      'Bank Draft',               'حوالة مصرفية',        'bank',        true,  true),
      (comp.id, 'SADAD',      'SADAD',                    'سداد',                'bank',        false, true),
      (comp.id, 'PDC',        'Post-Dated Check',         'شيك مؤجل',            'check',       true,  true),
      (comp.id, 'OFFSET',     'Offset / Netting',         'مقاصة',               'bank',        false, true),
      (comp.id, 'BARTER',     'Barter / Exchange',        'مقايضة',              'cash',        false, true),
      (comp.id, 'CRYPTO',     'Cryptocurrency',           'عملة رقمية',          'wire',        false, false)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, payment_type = EXCLUDED.payment_type,
      requires_bank_account = EXCLUDED.requires_bank_account;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 3. TAX TYPES - أنواع الضرائب والرسوم                              ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO tax_types (company_id, code, name, name_ar, tax_category, rate, is_compound, is_inclusive, is_active)
    VALUES
      -- VAT - ضريبة القيمة المضافة
      (comp.id, 'VAT-15',     'VAT 15%',                ' ض.ق.م 15%',           'vat',         15.00, false, false, true),
      (comp.id, 'VAT-5',      'VAT 5%',                 ' ض.ق.م 5%',            'vat',         5.00,  false, false, true),
      (comp.id, 'VAT-0',      'VAT Zero Rate',          ' ض.ق.م صفر',           'vat',         0.00,  false, false, true),
      (comp.id, 'VAT-EX',     'VAT Exempt',             'معفى من ض.ق.م',        'vat',         0.00,  false, false, true),
      (comp.id, 'VAT-INC15',  'VAT 15% Inclusive',      ' ض.ق.م 15% شامل',      'vat',         15.00, false, true,  true),
      -- Customs Duties - رسوم جمركية
      (comp.id, 'CUST-5',     'Customs Duty 5%',         'رسوم جمركية 5%',       'customs',     5.00,  false, false, true),
      (comp.id, 'CUST-12',    'Customs Duty 12%',        'رسوم جمركية 12%',      'customs',     12.00, false, false, true),
      (comp.id, 'CUST-20',    'Customs Duty 20%',        'رسوم جمركية 20%',      'customs',     20.00, false, false, true),
      (comp.id, 'CUST-100',   'Customs Duty 100%',       'رسوم جمركية 100%',     'customs',     100.00,false, false, true),
      (comp.id, 'CUST-0',     'Customs Exempt',          'إعفاء جمركي',          'customs',     0.00,  false, false, true),
      -- Withholding Tax - ضريبة استقطاع
      (comp.id, 'WHT-5',      'Withholding Tax 5%',     'ضريبة استقطاع 5%',      'withholding', 5.00,  false, false, true),
      (comp.id, 'WHT-15',     'Withholding Tax 15%',    'ضريبة استقطاع 15%',     'withholding', 15.00, false, false, true),
      (comp.id, 'WHT-20',     'Withholding Tax 20%',    'ضريبة استقطاع 20%',     'withholding', 20.00, false, false, true),
      -- Zakat - زكاة
      (comp.id, 'ZAKAT',      'Zakat 2.5%',             'زكاة 2.5%',             'zakat',       2.50,  false, false, true),
      -- Excise Tax - ضريبة انتقائية
      (comp.id, 'EXCISE-50',  'Excise Tax 50%',         'ضريبة انتقائية 50%',    'excise',      50.00, false, false, true),
      (comp.id, 'EXCISE-100', 'Excise Tax 100%',        'ضريبة انتقائية 100%',   'excise',      100.00,false, false, true)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, tax_category = EXCLUDED.tax_category,
      rate = EXCLUDED.rate, is_compound = EXCLUDED.is_compound, is_inclusive = EXCLUDED.is_inclusive;


  END LOOP;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. HS CODES - رموز النظام المنسق (الفصول الرئيسية)                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Note: HS Codes use the existing hs_codes table structure (code, description_en, description_ar)

DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP
    INSERT INTO hs_codes (company_id, code, description_en, description_ar, is_active) VALUES
      (comp.id, 'HS-01', 'Live animals', 'حيوانات حية', true),
      (comp.id, 'HS-02', 'Meat and edible meat offal', 'لحوم ومخلفاتها الصالحة للأكل', true),
      (comp.id, 'HS-03', 'Fish, crustaceans, molluscs', 'أسماك وقشريات ورخويات', true),
      (comp.id, 'HS-04', 'Dairy produce, eggs, honey', 'منتجات ألبان، بيض، عسل', true),
      (comp.id, 'HS-07', 'Edible vegetables', 'خضروات صالحة للأكل', true),
      (comp.id, 'HS-08', 'Edible fruits and nuts', 'فواكه ومكسرات صالحة للأكل', true),
      (comp.id, 'HS-09', 'Coffee, tea, spices', 'بن وشاي وتوابل', true),
      (comp.id, 'HS-10', 'Cereals', 'حبوب', true),
      (comp.id, 'HS-15', 'Animal or vegetable fats and oils', 'شحوم وزيوت حيوانية أو نباتية', true),
      (comp.id, 'HS-17', 'Sugars and confectionery', 'سكر وحلويات', true),
      (comp.id, 'HS-22', 'Beverages, spirits and vinegar', 'مشروبات وخل', true),
      (comp.id, 'HS-24', 'Tobacco and substitutes', 'تبغ وبدائل مصنعة', true),
      (comp.id, 'HS-27', 'Mineral fuels, oils', 'وقود معدني وزيوت', true),
      (comp.id, 'HS-28', 'Inorganic chemicals', 'مواد كيميائية غير عضوية', true),
      (comp.id, 'HS-29', 'Organic chemicals', 'مواد كيميائية عضوية', true),
      (comp.id, 'HS-30', 'Pharmaceutical products', 'منتجات صيدلانية', true),
      (comp.id, 'HS-39', 'Plastics and articles thereof', 'لدائن ومصنوعاتها', true),
      (comp.id, 'HS-44', 'Wood and articles of wood', 'خشب ومصنوعاته', true),
      (comp.id, 'HS-48', 'Paper and paperboard', 'ورق وورق مقوى', true),
      (comp.id, 'HS-61', 'Knitted clothing', 'ملابس محبوكة', true),
      (comp.id, 'HS-62', 'Non-knitted clothing', 'ملابس غير محبوكة', true),
      (comp.id, 'HS-70', 'Glass and glassware', 'زجاج ومصنوعاته', true),
      (comp.id, 'HS-71', 'Precious metals, jewellery', 'معادن ثمينة ومجوهرات', true),
      (comp.id, 'HS-72', 'Iron and steel', 'حديد وصلب', true),
      (comp.id, 'HS-73', 'Articles of iron or steel', 'مصنوعات حديد أو صلب', true),
      (comp.id, 'HS-76', 'Aluminium and articles thereof', 'ألومنيوم ومصنوعاته', true),
      (comp.id, 'HS-84', 'Machinery, mechanical appliances', 'آلات وأجهزة ميكانيكية', true),
      (comp.id, 'HS-85', 'Electrical machinery and equipment', 'آلات ومعدات كهربائية', true),
      (comp.id, 'HS-87', 'Vehicles other than railway', 'مركبات غير السكك الحديدية', true),
      (comp.id, 'HS-90', 'Optical, measuring instruments', 'أجهزة بصرية وقياس', true),
      (comp.id, 'HS-94', 'Furniture, bedding, lighting', 'أثاث ومفروشات وإنارة', true),
      (comp.id, 'HS-95', 'Toys, games and sports equipment', 'ألعاب ومعدات رياضية', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;


COMMIT;
