-- =====================================================
-- Migration 037: Customs Engine Tables (HS Codes / Tariffs / Exemptions)
-- =====================================================

-- HS Codes
CREATE TABLE IF NOT EXISTS hs_codes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description_en VARCHAR(255) NOT NULL,
  description_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hs_codes_company_id ON hs_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_hs_codes_code ON hs_codes(code);
CREATE INDEX IF NOT EXISTS idx_hs_codes_is_active ON hs_codes(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hs_codes_deleted_at ON hs_codes(deleted_at);

-- Customs Tariffs (duty rate rules)
CREATE TABLE IF NOT EXISTS customs_tariffs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hs_code VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  duty_rate_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes_en TEXT,
  notes_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, hs_code, country_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_customs_tariffs_company_id ON customs_tariffs(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_hs_code ON customs_tariffs(hs_code);
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_country_code ON customs_tariffs(country_code);
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_effective_from ON customs_tariffs(effective_from);
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_is_active ON customs_tariffs(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customs_tariffs_deleted_at ON customs_tariffs(deleted_at);

-- Customs Exemptions
CREATE TABLE IF NOT EXISTS customs_exemptions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  notes_en TEXT,
  notes_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customs_exemptions_company_id ON customs_exemptions(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_exemptions_code ON customs_exemptions(code);
CREATE INDEX IF NOT EXISTS idx_customs_exemptions_is_active ON customs_exemptions(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customs_exemptions_deleted_at ON customs_exemptions(deleted_at);
