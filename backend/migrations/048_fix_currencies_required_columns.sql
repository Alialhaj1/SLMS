-- Migration 048: Fix currencies required columns
-- Date: 2025-12-30
-- Description: Ensure currencies table has required columns used by /api/master/currencies routes

BEGIN;

-- Ensure multi-tenant + soft delete columns exist
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Ensure bilingual fields exist
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);

-- Ensure auditing fields exist (optional but used widely)
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Backfill name_en from name if missing
UPDATE currencies SET name_en = name WHERE name_en IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_currencies_company_id ON currencies(company_id);
CREATE INDEX IF NOT EXISTS idx_currencies_deleted_at ON currencies(deleted_at);

COMMIT;
