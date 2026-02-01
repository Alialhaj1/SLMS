-- Migration 058: Fiscal Years - default + soft delete + permissions
-- Date: 2025-12-31

BEGIN;

ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Enforce ONE default fiscal year per company (active rows only)
CREATE UNIQUE INDEX IF NOT EXISTS ux_fiscal_years_one_default
  ON fiscal_years(company_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_years_company_active ON fiscal_years(company_id) WHERE deleted_at IS NULL;

-- Seed permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('finance:financial_year:view',   'financial_year', 'view',   'View Financial Years'),
  ('finance:financial_year:create', 'financial_year', 'create', 'Create Financial Year'),
  ('finance:financial_year:update', 'financial_year', 'edit',   'Update Financial Year'),
  ('finance:financial_year:close',  'financial_year', 'close',  'Close Financial Year')
ON CONFLICT (permission_code) DO NOTHING;

COMMIT;
