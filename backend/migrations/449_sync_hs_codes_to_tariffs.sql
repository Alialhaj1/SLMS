-- Migration 449: Sync HS codes duty rates into customs_tariffs table
-- Creates tariff entries from HS codes data where duty rates are available
-- This enables the duty calculator to work with all imported HS codes

INSERT INTO customs_tariffs (
  company_id, hs_code, country_code, duty_rate_percent,
  effective_from, notes_en, notes_ar,
  is_active, duty_type_code, rate_type, rate_fixed,
  created_at, updated_at
)
SELECT
  h.company_id,
  h.code,
  'SA',
  CASE
    WHEN LOWER(COALESCE(h.duty_rate_en, h.duty_rate_ar, '')) ~ '^\s*[\d.]+\s*%?\s*$'
      THEN CAST(REGEXP_REPLACE(COALESCE(h.duty_rate_en, h.duty_rate_ar, '0'), '[^0-9.]', '', 'g') AS NUMERIC)
    WHEN LOWER(COALESCE(h.duty_rate_en, h.duty_rate_ar, '')) ~ '[\d.]+'
      THEN CAST((REGEXP_MATCH(COALESCE(h.duty_rate_en, h.duty_rate_ar, '0'), '([\d.]+)'))[1] AS NUMERIC)
    ELSE 0
  END,
  COALESCE(h.effective_date, '2024-01-01'),
  CASE
    WHEN LOWER(COALESCE(h.duty_rate_en, '')) LIKE '%prohibit%' THEN 'Prohibited'
    WHEN LOWER(COALESCE(h.duty_rate_en, '')) LIKE '%exempt%' THEN 'Exempt'
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%محظور%' THEN 'Prohibited'
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%ممنوع%' THEN 'Prohibited'
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%معف%' THEN 'Exempt'
    ELSE h.description_en
  END,
  CASE
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%محظور%' THEN 'محظور'
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%ممنوع%' THEN 'محظور'
    WHEN LOWER(COALESCE(h.duty_rate_ar, '')) LIKE '%معف%' THEN 'معفاة'
    WHEN LOWER(COALESCE(h.duty_rate_en, '')) LIKE '%prohibit%' THEN 'محظور'
    WHEN LOWER(COALESCE(h.duty_rate_en, '')) LIKE '%exempt%' THEN 'معفاة'
    ELSE h.description_ar
  END,
  true,
  'import_duty',
  'percentage',
  0,
  NOW(),
  NOW()
FROM hs_codes h
WHERE h.deleted_at IS NULL
  AND h.duty_rate_en IS NOT NULL
  AND h.duty_rate_en != ''
  AND NOT EXISTS (
    SELECT 1 FROM customs_tariffs ct
    WHERE ct.company_id = h.company_id
      AND ct.hs_code = h.code
      AND ct.country_code = 'SA'
      AND ct.deleted_at IS NULL
  );
