-- Migration 447: Add duty_rate_ar, duty_rate_en, procedures, effective_date to hs_codes
-- These columns match the standard Saudi Customs HS code import template

ALTER TABLE hs_codes ADD COLUMN IF NOT EXISTS duty_rate_ar VARCHAR(255);
ALTER TABLE hs_codes ADD COLUMN IF NOT EXISTS duty_rate_en VARCHAR(255);
ALTER TABLE hs_codes ADD COLUMN IF NOT EXISTS procedures TEXT;
ALTER TABLE hs_codes ADD COLUMN IF NOT EXISTS effective_date DATE;
