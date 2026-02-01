-- =====================================================
-- Migration 097: Seed Logistics Reference Data (Operational)
-- Seeds company-scoped master data required for Logistics / Shipments:
-- - logistics_shipment_types
-- - shipment_lifecycle_statuses
-- - shipment_stages
-- - hs_codes (baseline set)
-- - customs_tariffs (baseline defaults)
-- - customs_exemptions (baseline set)
--
-- Notes:
-- - Idempotent inserts (will not duplicate)
-- - Company-scoped (cross-joins companies)
-- - Soft-deleted "test" rows are left as-is; active "test" rows (if any) are auto-archived.
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 0) Archive any accidental "test" rows (if active)
-- -----------------------------------------------------
UPDATE customs_tariffs
SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
    is_active = FALSE,
    notes_en = CONCAT(COALESCE(notes_en, ''), ' [auto-archived: test data]')
WHERE deleted_at IS NULL
  AND (
    notes_en ILIKE '%test%'
    OR hs_code ILIKE 'HS%'
  );

-- -----------------------------------------------------
-- 1) Logistics Shipment Types (company-scoped)
-- -----------------------------------------------------
WITH seed_types(code, name_en, name_ar) AS (
  VALUES
    ('SEA_FCL', 'Sea Freight (FCL)', 'شحن بحري (حاوية كاملة)'),
    ('SEA_LCL', 'Sea Freight (LCL)', 'شحن بحري (تجميع)'),
    ('AIR', 'Air Freight', 'شحن جوي'),
    ('LAND', 'Land Transport', 'نقل بري'),
    ('MULTIMODAL', 'Multimodal', 'متعدد الوسائط')
)
INSERT INTO logistics_shipment_types (
  company_id,
  code,
  name_en,
  name_ar,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.code,
  s.name_en,
  s.name_ar,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_types s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM logistics_shipment_types t
    WHERE t.company_id = c.id
      AND t.code = s.code
      AND t.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 2) Shipment Lifecycle Statuses (company-scoped)
--    Used by shipment lifecycle master pages.
-- -----------------------------------------------------
WITH seed_statuses(code, name_en, name_ar) AS (
  VALUES
    ('DRAFT', 'Draft', 'مسودة'),
    ('BOOKED', 'Booked', 'محجوزة'),
    ('SHIPPED', 'Shipped', 'تم الشحن'),
    ('IN_TRANSIT', 'In Transit', 'قيد النقل'),
    ('ARRIVED_PORT', 'Arrived (Port)', 'وصلت (الميناء)'),
    ('UNDER_CUSTOMS', 'Under Customs', 'تحت التخليص الجمركي'),
    ('RECEIVED', 'Received', 'تم الاستلام'),
    ('ACCOUNTING_CLOSED', 'Accounting Closed', 'مغلقة محاسبياً'),
    ('CANCELLED', 'Cancelled', 'ملغاة')
)
INSERT INTO shipment_lifecycle_statuses (
  company_id,
  code,
  name_en,
  name_ar,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.code,
  s.name_en,
  s.name_ar,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_statuses s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM shipment_lifecycle_statuses x
    WHERE x.company_id = c.id
      AND x.code = s.code
      AND x.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 3) Shipment Stages (company-scoped)
--    Ordered stages for tracking/operations.
-- -----------------------------------------------------
WITH seed_stages(code, name_en, name_ar, sort_order) AS (
  VALUES
    ('DRAFT', 'Draft', 'مسودة', 10),
    ('BOOKING', 'Booking', 'الحجز', 20),
    ('ORIGIN_HANDLING', 'Origin Handling', 'مناولة المنشأ', 30),
    ('IN_TRANSIT', 'In Transit', 'قيد النقل', 40),
    ('ARRIVAL_HANDLING', 'Arrival Handling', 'مناولة الوصول', 50),
    ('CUSTOMS_CLEARANCE', 'Customs Clearance', 'التخليص الجمركي', 60),
    ('WAREHOUSE_RECEIPT', 'Warehouse Receipt', 'استلام المستودع', 70),
    ('ACCOUNTING', 'Accounting', 'المحاسبة', 80),
    ('CLOSED', 'Closed', 'مغلقة', 90)
)
INSERT INTO shipment_stages (
  company_id,
  code,
  name_en,
  name_ar,
  sort_order,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.code,
  s.name_en,
  s.name_ar,
  s.sort_order,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_stages s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM shipment_stages x
    WHERE x.company_id = c.id
      AND x.code = s.code
      AND x.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 4) HS Codes (company-scoped) - baseline starter set
--    Note: Full HS catalog is typically imported separately.
-- -----------------------------------------------------
WITH seed_hs(code, description_en, description_ar) AS (
  VALUES
    ('010121', 'Pure-bred breeding horses', 'خيول أصيلة للتربية'),
    ('020130', 'Bovine meat (fresh or chilled)', 'لحوم الأبقار (طازجة أو مبردة)'),
    ('040210', 'Milk powder (in solid form)', 'حليب مجفف (بشكل صلب)'),
    ('100630', 'Semi-milled or wholly milled rice', 'أرز نصف مقشور أو مقشور بالكامل'),
    ('170199', 'Cane or beet sugar (other)', 'سكر قصب أو بنجر (أخرى)'),
    ('270900', 'Petroleum oils and oils from bituminous minerals, crude', 'زيوت نفط وزيوت من معادن قارية، خام'),
    ('300490', 'Medicaments (other)', 'أدوية (أخرى)'),
    ('330499', 'Beauty/makeup preparations (other)', 'مستحضرات تجميل/مكياج (أخرى)'),
    ('392690', 'Articles of plastics (other)', 'مصنوعات من اللدائن (أخرى)'),
    ('420221', 'Handbags with outer surface of leather', 'حقائب يد بسطح خارجي من الجلد'),
    ('610910', 'T-shirts of cotton', 'قمصان (تي شيرت) من قطن'),
    ('640399', 'Footwear with outer soles of rubber/plastics/leather (other)', 'أحذية بنعال خارجية من مطاط/لدائن/جلد (أخرى)'),
    ('700719', 'Safety glass (other)', 'زجاج أمان (أخرى)'),
    ('720839', 'Flat-rolled products of iron/non-alloy steel (other)', 'منتجات مسطحة من حديد/فولاذ غير سبيكي (أخرى)'),
    ('730890', 'Structures and parts of structures, of iron or steel (other)', 'هياكل وأجزاء هياكل من حديد أو فولاذ (أخرى)'),
    ('760429', 'Aluminium bars/rods/profiles (other)', 'قضبان/عصي/مقاطع من ألمنيوم (أخرى)'),
    ('840999', 'Parts for internal combustion engines (other)', 'أجزاء لمحركات الاحتراق الداخلي (أخرى)'),
    ('847130', 'Portable automatic data processing machines (laptops)', 'أجهزة معالجة بيانات محمولة (حاسوب محمول)'),
    ('850440', 'Static converters (e.g., chargers, power supplies)', 'محولات ثابتة (مثل الشواحن ومزودات الطاقة)'),
    ('851712', 'Telephones for cellular networks', 'هواتف للشبكات الخلوية'),
    ('852872', 'Reception apparatus for television (other)', 'أجهزة استقبال تلفزيون (أخرى)'),
    ('870323', 'Passenger cars (1,500cc to 3,000cc)', 'سيارات ركاب (1500 إلى 3000 سم³)'),
    ('901890', 'Instruments and appliances used in medical sciences (other)', 'أجهزة وأدوات للاستخدامات الطبية (أخرى)')
)
INSERT INTO hs_codes (
  company_id,
  code,
  description_en,
  description_ar,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.code,
  s.description_en,
  s.description_ar,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_hs s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hs_codes x
    WHERE x.company_id = c.id
      AND x.code = s.code
      AND x.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 5) Customs Exemptions (company-scoped) - baseline set
-- -----------------------------------------------------
WITH seed_exemptions(code, name_en, name_ar, notes_en, notes_ar) AS (
  VALUES
    ('DIPLOMATIC', 'Diplomatic exemption', 'إعفاء دبلوماسي', 'Subject to valid diplomatic documentation.', 'مشروط بتوفر مستندات دبلوماسية سارية.'),
    ('GOV', 'Government entity exemption', 'إعفاء جهة حكومية', 'Subject to government exemption approval.', 'مشروط بموافقة الإعفاء.'),
    ('HUMANITARIAN', 'Humanitarian aid exemption', 'إعفاء مساعدات إنسانية', 'Subject to regulatory approval.', 'مشروط بموافقة الجهة المختصة.'),
    ('MEDICAL', 'Medical supplies exemption', 'إعفاء مستلزمات طبية', 'Subject to classification and approval.', 'مشروط بالتصنيف والموافقة.'),
    ('TEMP_IMPORT', 'Temporary import exemption', 'إعفاء إدخال مؤقت', 'Subject to temporary import terms and re-export.', 'مشروط بشروط الإدخال المؤقت وإعادة التصدير.')
)
INSERT INTO customs_exemptions (
  company_id,
  code,
  name_en,
  name_ar,
  notes_en,
  notes_ar,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.code,
  s.name_en,
  s.name_ar,
  s.notes_en,
  s.notes_ar,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_exemptions s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM customs_exemptions x
    WHERE x.company_id = c.id
      AND x.code = s.code
      AND x.deleted_at IS NULL
  );

-- -----------------------------------------------------
-- 6) Customs Tariffs (company-scoped) - baseline defaults
--
-- We seed a small baseline set with 0% duty and clear notes.
-- Actual duty rates should be maintained per company and regulations.
-- -----------------------------------------------------
WITH seed_tariffs(hs_code, country_code, duty_rate_percent, effective_from, notes_en, notes_ar) AS (
  VALUES
    ('847130', 'CN', 0.0000::NUMERIC(8,4), DATE '2025-01-01', 'Initial default duty rate (update per regulation).', 'نسبة افتراضية أولية (يجب تحديثها حسب الأنظمة).'),
    ('851712', 'CN', 0.0000::NUMERIC(8,4), DATE '2025-01-01', 'Initial default duty rate (update per regulation).', 'نسبة افتراضية أولية (يجب تحديثها حسب الأنظمة).'),
    ('870323', 'JP', 0.0000::NUMERIC(8,4), DATE '2025-01-01', 'Initial default duty rate (update per regulation).', 'نسبة افتراضية أولية (يجب تحديثها حسب الأنظمة).')
)
INSERT INTO customs_tariffs (
  company_id,
  hs_code,
  country_code,
  duty_rate_percent,
  effective_from,
  effective_to,
  notes_en,
  notes_ar,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  s.hs_code,
  s.country_code,
  s.duty_rate_percent,
  s.effective_from,
  NULL,
  s.notes_en,
  s.notes_ar,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN seed_tariffs s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM customs_tariffs x
    WHERE x.company_id = c.id
      AND x.hs_code = s.hs_code
      AND x.country_code = s.country_code
      AND x.effective_from = s.effective_from
      AND x.deleted_at IS NULL
  );

COMMIT;
