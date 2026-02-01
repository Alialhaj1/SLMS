-- =====================================================
-- Migration 054: Create Tax Codes
-- Adds company-scoped tax_codes table (soft delete) used by /api/tax-codes
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_codes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'both', -- sales | purchases | both
  vat_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  customs_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  excise_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  withholding_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  is_zero_rated BOOLEAN DEFAULT false,
  is_exempt BOOLEAN DEFAULT false,
  is_reverse_charge BOOLEAN DEFAULT false,
  zatca_code VARCHAR(50),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_codes_company_id ON tax_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_codes_applies_to ON tax_codes(company_id, applies_to);
CREATE INDEX IF NOT EXISTS idx_tax_codes_zatca_code ON tax_codes(company_id, zatca_code);

-- Permissions (module-level already exists in 036, but keep master:tax:* in sync with frontend checks)
INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
('master:tax:view', 'master:tax', 'view', 'View tax master data', 'Master'),
('master:tax:create', 'master:tax', 'create', 'Create tax master data', 'Master'),
('master:tax:update', 'master:tax', 'edit', 'Update tax master data', 'Master'),
('master:tax:delete', 'master:tax', 'delete', 'Delete tax master data', 'Master')
ON CONFLICT (permission_code) DO NOTHING;
