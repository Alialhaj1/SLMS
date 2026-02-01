-- Add is_default to digital_signatures (matches frontend usage)

BEGIN;

ALTER TABLE digital_signatures
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_digital_signatures_default
  ON digital_signatures(company_id)
  WHERE deleted_at IS NULL AND is_default = TRUE;

COMMIT;
