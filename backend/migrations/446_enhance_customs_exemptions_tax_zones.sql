-- Migration 446: Enhance customs_exemptions + create dedicated tax_zones table + entry_exit_points table
-- ═══════════════════════════════════════════════════════════════

-- 1. Enhance customs_exemptions with full fields per GAZT/WCO standards
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS exemption_type VARCHAR(30) DEFAULT 'full';
-- Types: full, partial, temporary, preferential
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS exemption_number VARCHAR(60);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS rate_percent NUMERIC(8,4) DEFAULT 100;
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS exemption_level VARCHAR(30) DEFAULT 'both';
-- Levels: duties_only, vat_only, both
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS hs_codes TEXT; -- comma-separated HS codes
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS fta_agreement VARCHAR(100);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS beneficiary VARCHAR(255);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS max_quantity NUMERIC(18,4);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS max_value NUMERIC(18,4);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS decision_number VARCHAR(100);
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE customs_exemptions ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- 2. Create dedicated tax_zones table (replacing reference_data generic)
CREATE TABLE IF NOT EXISTS tax_zones (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  code            VARCHAR(50)  NOT NULL,
  name_en         VARCHAR(200) NOT NULL,
  name_ar         VARCHAR(200),
  zone_type       VARCHAR(30)  DEFAULT 'domestic',
  -- Types: domestic, economic_zone, free_zone, customs_zone, international
  default_rate    NUMERIC(8,4) DEFAULT 15.00,
  subject_to_zatca BOOLEAN     DEFAULT true,
  description     TEXT,
  description_ar  TEXT,
  is_active       BOOLEAN      DEFAULT true,
  created_by      INTEGER,
  updated_by      INTEGER,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_zones_company ON tax_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_zones_active ON tax_zones(is_active) WHERE deleted_at IS NULL;

-- 3. Create dedicated entry_exit_points table
CREATE TABLE IF NOT EXISTS entry_exit_points (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  code              VARCHAR(50)  NOT NULL,
  name_en           VARCHAR(200) NOT NULL,
  name_ar           VARCHAR(200),
  point_type        VARCHAR(30)  DEFAULT 'sea',
  -- Types: sea, air, land, rail
  direction         VARCHAR(20)  DEFAULT 'both',
  -- Direction: entry, exit, both
  country_id        INTEGER REFERENCES countries(id),
  city              VARCHAR(200),
  customs_office_id INTEGER,
  latitude          NUMERIC(12,8),
  longitude         NUMERIC(12,8),
  operating_hours   VARCHAR(100),
  operating_status  VARCHAR(30)  DEFAULT 'open',
  -- Status: open, closed, restricted
  description       TEXT,
  description_ar    TEXT,
  is_active         BOOLEAN      DEFAULT true,
  created_by        INTEGER,
  updated_by        INTEGER,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_entry_exit_points_company ON entry_exit_points(company_id);
CREATE INDEX IF NOT EXISTS idx_entry_exit_points_type ON entry_exit_points(point_type);
