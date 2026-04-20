-- Migration 448: Enhance customs_tariffs with duty_type, rate_type, FTA, origin columns
-- Required by the enterprise tariffs frontend page

ALTER TABLE customs_tariffs
  ADD COLUMN IF NOT EXISTS duty_type_code VARCHAR(50) DEFAULT 'import_duty',
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(30) DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS rate_fixed NUMERIC(12, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fta_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS origin_country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS calculation_basis VARCHAR(50) DEFAULT 'cif_value';

-- Index for FTA lookups
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_fta_code
  ON customs_tariffs(fta_code) WHERE fta_code IS NOT NULL AND deleted_at IS NULL;

-- Index for duty type filtering
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_duty_type_code
  ON customs_tariffs(duty_type_code) WHERE deleted_at IS NULL;
