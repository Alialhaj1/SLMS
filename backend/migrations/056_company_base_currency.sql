-- Migration 056: Company Base Currency + Settings Permissions
-- Date: 2025-12-31
-- Purpose:
--  - Make currencies usable as company-scoped base currency records
--  - Enforce one base currency per company (soft-delete aware)
--  - Seed required permissions: settings:currency:*

BEGIN;

-- Ensure multi-tenant + soft delete columns exist (idempotent)
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Ensure required columns exist
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_base_currency BOOLEAN DEFAULT false;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Drop global UNIQUE(code) constraint so currencies can be company-scoped.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'currencies'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'currencies_code_key'
  ) THEN
    ALTER TABLE currencies DROP CONSTRAINT currencies_code_key;
  END IF;
END $$;

-- Uniqueness per company (active rows only)
CREATE UNIQUE INDEX IF NOT EXISTS ux_currencies_company_code_active
  ON currencies(company_id, code)
  WHERE deleted_at IS NULL AND company_id IS NOT NULL;

-- Keep uniqueness for global (company_id IS NULL) rows
CREATE UNIQUE INDEX IF NOT EXISTS ux_currencies_global_code_active
  ON currencies(code)
  WHERE deleted_at IS NULL AND company_id IS NULL;

-- Enforce ONE base currency per company
CREATE UNIQUE INDEX IF NOT EXISTS ux_currencies_one_base_per_company
  ON currencies(company_id)
  WHERE deleted_at IS NULL AND is_base_currency = TRUE AND company_id IS NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_currencies_company_id_active ON currencies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_currencies_base_company ON currencies(company_id, is_base_currency) WHERE deleted_at IS NULL;

-- Seed permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('settings:currency:view',   'currency', 'view',   'View Base Currency'),
  ('settings:currency:create', 'currency', 'create', 'Create Currency'),
  ('settings:currency:update', 'currency', 'edit',   'Update Currency'),
  ('settings:currency:delete', 'currency', 'delete', 'Delete Currency')
ON CONFLICT (permission_code) DO NOTHING;

COMMIT;
