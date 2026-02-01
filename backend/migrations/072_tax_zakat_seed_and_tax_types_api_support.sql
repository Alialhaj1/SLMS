-- =====================================================
-- Migration 072: Tax & Zakat Professional Seed + Tax Types API Support
-- - Adds missing columns to tax_types (soft delete + metadata) so /api/tax-types and /api/tax-rates work reliably
-- - Seeds professional KSA-oriented tax types/rates/codes
-- - Seeds reference_data for tax_item_categories and zakat_codes
-- - Seeds baseline ZATCA (authority) settings in system_policies
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1) tax_types: add soft-delete + metadata columns
-- -----------------------------------------------------
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Backward/forward compatible columns used by frontend tax-types page
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(20);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS default_rate DECIMAL(10, 4);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS applies_to TEXT[];
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS tax_authority VARCHAR(100);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS reporting_frequency VARCHAR(20);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS is_recoverable BOOLEAN;
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS round_method VARCHAR(20);
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_tax_types_company_id ON tax_types(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_types_category ON tax_types(tax_category);
CREATE INDEX IF NOT EXISTS idx_tax_types_active ON tax_types(is_active) WHERE deleted_at IS NULL;

-- -----------------------------------------------------
-- 2) Seed permissions for Tax Types (optional but useful)
-- -----------------------------------------------------
INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('tax:types:view', 'tax:types', 'view', 'View tax types', 'Tax'),
  ('tax:types:create', 'tax:types', 'create', 'Create tax types', 'Tax'),
  ('tax:types:edit', 'tax:types', 'edit', 'Edit tax types', 'Tax'),
  ('tax:types:delete', 'tax:types', 'delete', 'Delete tax types', 'Tax')
ON CONFLICT (permission_code) DO NOTHING;

-- -----------------------------------------------------
-- 3) Seed professional tax types for each company
-- -----------------------------------------------------
WITH companies_list AS (
  SELECT id AS company_id FROM companies WHERE deleted_at IS NULL
)
INSERT INTO tax_types (
  company_id, code, name, name_ar, tax_category,
  rate, is_compound, is_inclusive, is_active,
  calculation_method, default_rate, applies_to, tax_authority, reporting_frequency,
  is_recoverable, round_method, effective_date, expiry_date, description
)
SELECT
  c.company_id,
  v.code,
  v.name,
  v.name_ar,
  v.tax_category,
  v.rate,
  v.is_compound,
  v.is_inclusive,
  TRUE,
  'percentage',
  v.rate,
  v.applies_to,
  v.tax_authority,
  v.reporting_frequency,
  v.is_recoverable,
  'normal',
  DATE '2024-01-01',
  NULL,
  v.description
FROM companies_list c
CROSS JOIN (VALUES
  ('VAT-STD',   'Standard VAT',           'ضريبة القيمة المضافة القياسية', 'vat',        15.0000, FALSE, FALSE, ARRAY['sales','purchases','services'], 'ZATCA', 'monthly', TRUE,  'Standard VAT rate (KSA)') ,
  ('VAT-ZERO',  'Zero Rated VAT',         'ضريبة قيمة مضافة بمعدل صفري',   'vat',         0.0000, FALSE, FALSE, ARRAY['exports'],                  'ZATCA', 'monthly', TRUE,  'Zero-rated supplies (e.g., exports)') ,
  ('VAT-EXEMPT','VAT Exempt',             'معفى من ضريبة القيمة المضافة',  'vat',         0.0000, FALSE, FALSE, ARRAY['sales','services'],          'ZATCA', 'monthly', FALSE, 'VAT-exempt supplies (subject to regulation)') ,
  ('CUSTOMS-GEN','General Customs Duty',  'رسوم جمركية عامة',              'customs',     5.0000, FALSE, FALSE, ARRAY['imports'],                  'ZATCA', 'monthly', FALSE, 'Typical customs duty baseline') ,
  ('EXCISE-TOB','Tobacco Excise Tax',     'ضريبة انتقائية على التبغ',       'excise',    100.0000, FALSE, FALSE, ARRAY['sales','imports'],           'ZATCA', 'monthly', FALSE, 'Excise on tobacco products') ,
  ('EXCISE-SUGAR','Sugary Drinks Tax',    'ضريبة المشروبات السكرية',        'excise',     50.0000, FALSE, FALSE, ARRAY['sales','imports'],           'ZATCA', 'monthly', FALSE, 'Excise on sugary drinks') ,
  ('WHT-DIV',   'Withholding - Dividends','ضريبة مستقطعة - أرباح',          'withholding', 5.0000, FALSE, FALSE, ARRAY['income'],                   'ZATCA', 'monthly', FALSE, 'Withholding tax on dividends (example)') ,
  ('WHT-ROYALTY','Withholding - Royalties','ضريبة مستقطعة - إتاوات',        'withholding',15.0000, FALSE, FALSE, ARRAY['services'],                 'ZATCA', 'monthly', FALSE, 'Withholding tax on royalties (example)') ,
  ('ZAKAT',     'Zakat',                  'الزكاة',                         'zakat',       2.5000, FALSE, FALSE, ARRAY['assets'],                   'ZATCA', 'annually', FALSE, 'Zakat rate (example baseline)')
) AS v(code, name, name_ar, tax_category, rate, is_compound, is_inclusive, applies_to, tax_authority, reporting_frequency, is_recoverable, description)
WHERE NOT EXISTS (
  SELECT 1 FROM tax_types tt
  WHERE tt.company_id = c.company_id
    AND tt.code = v.code
    AND tt.deleted_at IS NULL
);

-- -----------------------------------------------------
-- 4) Seed tax rates per company (linked to tax_types)
-- -----------------------------------------------------
WITH companies_list AS (
  SELECT id AS company_id FROM companies WHERE deleted_at IS NULL
)
INSERT INTO tax_rates (
  company_id, code, name, name_ar, tax_type_id,
  rate, effective_from, is_default, is_active, notes
)
SELECT
  c.company_id,
  r.code,
  r.name,
  r.name_ar,
  tt.id,
  r.rate,
  DATE '2024-01-01',
  r.is_default,
  TRUE,
  r.notes
FROM companies_list c
JOIN tax_types tt
  ON tt.company_id = c.company_id
  AND tt.deleted_at IS NULL
CROSS JOIN (VALUES
  ('VAT-STD-15',     'Standard VAT Rate',         'معدل ضريبة القيمة المضافة القياسي', 'VAT-STD',   15.0000, TRUE,  'Default VAT rate'),
  ('VAT-ZERO-0',     'Zero Rated VAT',            'معدل ضريبة بمعدل صفري',             'VAT-ZERO',   0.0000, TRUE,  'Default zero-rated VAT'),
  ('VAT-EXEMPT-0',   'VAT Exempt',                'معفى من الضريبة',                   'VAT-EXEMPT', 0.0000, TRUE,  'Default VAT exempt'),
  ('CUSTOMS-GEN-5',  'General Customs Rate',      'معدل الجمارك العام',                'CUSTOMS-GEN',5.0000, TRUE,  'Typical customs baseline'),
  ('EXCISE-TOB-100', 'Tobacco Excise 100%',       'ضريبة التبغ 100%',                   'EXCISE-TOB',100.0000, TRUE, 'Excise on tobacco'),
  ('EXCISE-SUGAR-50','Sugary Drinks 50%',         'ضريبة المشروبات السكرية 50%',        'EXCISE-SUGAR',50.0000, TRUE,'Excise on sugary drinks'),
  ('WHT-DIV-5',      'Dividend Withholding 5%',   'استقطاع أرباح 5%',                   'WHT-DIV',    5.0000, TRUE,  'Withholding dividends example'),
  ('WHT-ROYALTY-15', 'Royalties Withholding 15%', 'استقطاع إتاوات 15%',                 'WHT-ROYALTY',15.0000, TRUE, 'Withholding royalties example'),
  ('ZAKAT-2.5',      'Zakat 2.5%',                'نسبة الزكاة 2.5%',                   'ZAKAT',      2.5000, TRUE,  'Zakat baseline')
) AS r(code, name, name_ar, tax_type_code, rate, is_default, notes)
WHERE tt.code = r.tax_type_code
  AND NOT EXISTS (
    SELECT 1 FROM tax_rates tr
    WHERE tr.company_id = c.company_id
      AND tr.code = r.code
      AND tr.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 5) Seed tax codes per company (invoice-friendly)
-- -----------------------------------------------------
WITH companies_list AS (
  SELECT id AS company_id FROM companies WHERE deleted_at IS NULL
)
INSERT INTO tax_codes (
  company_id, code, name, name_ar, description,
  applies_to, vat_rate, customs_rate, excise_rate, withholding_rate,
  is_zero_rated, is_exempt, is_reverse_charge,
  zatca_code, effective_from, is_active, notes
)
SELECT
  c.company_id,
  tc.code,
  tc.name,
  tc.name_ar,
  tc.description,
  tc.applies_to,
  tc.vat_rate,
  tc.customs_rate,
  tc.excise_rate,
  tc.withholding_rate,
  tc.is_zero_rated,
  tc.is_exempt,
  tc.is_reverse_charge,
  tc.zatca_code,
  DATE '2024-01-01',
  TRUE,
  tc.notes
FROM companies_list c
CROSS JOIN (VALUES
  ('S',   'Standard Rate',        'المعدل القياسي',  'Standard supplies subject to VAT',              'both',      15.0000, 0.0000, 0.0000, 0.0000, FALSE, FALSE, FALSE, 'S',  'Default VAT standard'),
  ('Z',   'Zero Rated',           'معدل صفري',       'Zero-rated supplies (e.g., exports)',           'both',       0.0000, 0.0000, 0.0000, 0.0000, TRUE,  FALSE, FALSE, 'Z',  'Default VAT zero'),
  ('E',   'Exempt',               'معفى',            'Exempt supplies (per regulation)',              'both',       0.0000, 0.0000, 0.0000, 0.0000, FALSE, TRUE,  FALSE, 'E',  'Default exempt'),
  ('RC',  'Reverse Charge',       'احتساب عكسي',      'Reverse charge mechanism (B2B/import services)', 'purchases',  15.0000, 0.0000, 0.0000, 0.0000, FALSE, FALSE, TRUE,  'RC', 'Reverse charge'),
  ('OUT', 'Out of Scope',         'خارج النطاق',     'Out of VAT scope transactions',                 'both',       0.0000, 0.0000, 0.0000, 0.0000, FALSE, TRUE,  FALSE, 'O',  'Out of scope')
) AS tc(code, name, name_ar, description, applies_to, vat_rate, customs_rate, excise_rate, withholding_rate, is_zero_rated, is_exempt, is_reverse_charge, zatca_code, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM tax_codes existing
  WHERE existing.company_id = c.company_id
    AND existing.code = tc.code
    AND existing.deleted_at IS NULL
);

-- -----------------------------------------------------
-- 6) Seed reference_data: tax_item_categories + zakat_codes
-- -----------------------------------------------------
-- tax_item_categories
INSERT INTO reference_data (
  type, company_id, code, name_en, name_ar, description_en, description_ar, is_active
)
SELECT
  'tax_item_categories',
  c.id,
  v.code,
  v.name_en,
  v.name_ar,
  v.desc_en,
  v.desc_ar,
  TRUE
FROM companies c
CROSS JOIN (VALUES
  ('GENERAL',   'General Items',         'أصناف عامة',        'Default items category',                   'تصنيف افتراضي للأصناف'),
  ('SERVICES',  'Services',             'خدمات',             'Services subject to tax rules',           'خدمات خاضعة لقواعد الضرائب'),
  ('EXPORTS',   'Exports',              'صادرات',            'Export supplies (often zero-rated)',      'توريدات تصدير (غالباً بمعدل صفري)'),
  ('EXEMPT',    'Exempt Supplies',       'توريدات معفاة',     'Exempt supplies per regulation',          'توريدات معفاة حسب اللوائح'),
  ('IMPORTS',   'Imports',              'واردات',            'Imported goods/services',                 'سلع/خدمات مستوردة')
) AS v(code, name_en, name_ar, desc_en, desc_ar)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM reference_data rd
    WHERE rd.type = 'tax_item_categories'
      AND rd.company_id = c.id
      AND rd.code = v.code
      AND rd.deleted_at IS NULL
  );

-- zakat_codes
INSERT INTO reference_data (
  type, company_id, code, name_en, name_ar, description_en, description_ar, is_active
)
SELECT
  'zakat_codes',
  c.id,
  v.code,
  v.name_en,
  v.name_ar,
  v.desc_en,
  v.desc_ar,
  TRUE
FROM companies c
CROSS JOIN (VALUES
  ('ZK-STD', 'Standard Zakat', 'زكاة قياسية',  'Standard zakat classification', 'تصنيف الزكاة القياسي'),
  ('ZK-EXM', 'Zakat Exempt',   'معفى من الزكاة','Exempt from zakat',            'معفى من الزكاة'),
  ('ZK-OTH', 'Other Zakat',    'زكاة أخرى',     'Other zakat classification',   'تصنيف زكاة آخر')
) AS v(code, name_en, name_ar, desc_en, desc_ar)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM reference_data rd
    WHERE rd.type = 'zakat_codes'
      AND rd.company_id = c.id
      AND rd.code = v.code
      AND rd.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 7) Seed baseline ZATCA settings (authority settings)
-- -----------------------------------------------------
-- These are company-level keys (company_id = company) so each tenant can configure its own values.
INSERT INTO system_policies (
  company_id, policy_key, policy_value,
  description_en, description_ar,
  data_type, category, default_value, is_system_policy, is_active
)
SELECT
  c.id,
  s.policy_key,
  s.policy_value,
  s.description_en,
  s.description_ar,
  s.data_type,
  'zatca',
  s.default_value,
  FALSE,
  TRUE
FROM companies c
CROSS JOIN (VALUES
  ('zatca.vat_registration_number', '', 'VAT registration number', 'رقم تسجيل ضريبة القيمة المضافة', 'string', ''),
  ('zatca.taxpayer_name_en',        '', 'Taxpayer name (EN)',      'اسم المكلف (إنجليزي)',           'string', ''),
  ('zatca.taxpayer_name_ar',        '', 'Taxpayer name (AR)',      'اسم المكلف (عربي)',              'string', ''),
  ('zatca.branch_address_en',       '', 'Branch address (EN)',     'عنوان الفرع (إنجليزي)',          'string', ''),
  ('zatca.branch_address_ar',       '', 'Branch address (AR)',     'عنوان الفرع (عربي)',             'string', ''),
  ('zatca.reporting_enabled',       'false', 'Enable reporting integration', 'تفعيل تكامل التقارير', 'boolean', 'false')
) AS s(policy_key, policy_value, description_en, description_ar, data_type, default_value)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM system_policies sp
    WHERE sp.company_id = c.id
      AND sp.policy_key = s.policy_key
      AND sp.deleted_at IS NULL
  );

COMMIT;
