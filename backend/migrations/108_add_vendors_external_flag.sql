-- =============================================
-- Add vendor external/internal flag
--
-- Rule (per user request):
-- - If supplier name is English => external vendor
-- - If supplier name is Arabic => internal vendor
--
-- We store this as a boolean for easy filtering.
-- =============================================

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendors_company_external
  ON vendors(company_id, is_external)
  WHERE deleted_at IS NULL;
