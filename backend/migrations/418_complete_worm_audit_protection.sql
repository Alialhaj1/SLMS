-- ============================================================================
-- Migration 418: Complete WORM Protection for ALL audit tables
-- ============================================================================
-- Fixes identified gap: audit.platform_logs allows UPDATE, 
-- audit.tenant_logs has ZERO trigger protection.
-- 
-- After this migration:
--   public.audit_logs  → DELETE blocked ✅, UPDATE blocked ✅ (already)
--   audit.platform_logs → DELETE blocked ✅ (already), UPDATE blocked ✅ (NEW)
--   audit.tenant_logs  → DELETE blocked ✅ (NEW), UPDATE blocked ✅ (NEW)
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────
-- 1. Add UPDATE trigger to audit.platform_logs
--    (DELETE trigger trg_platform_logs_no_delete already exists)
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit.prevent_platform_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'WORM_POLICY: platform audit logs cannot be modified (§12 S10)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_logs_no_update ON audit.platform_logs;

CREATE TRIGGER trg_platform_logs_no_update
  BEFORE UPDATE ON audit.platform_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.prevent_platform_log_update();

-- ────────────────────────────────────────────────────────
-- 2. Add DELETE + UPDATE triggers to audit.tenant_logs
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit.prevent_tenant_log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'WORM_POLICY: tenant audit logs cannot be deleted (§12 S10)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit.prevent_tenant_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'WORM_POLICY: tenant audit logs cannot be modified (§12 S10)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_logs_no_delete ON audit.tenant_logs;
DROP TRIGGER IF EXISTS trg_tenant_logs_no_update ON audit.tenant_logs;

CREATE TRIGGER trg_tenant_logs_no_delete
  BEFORE DELETE ON audit.tenant_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.prevent_tenant_log_deletion();

CREATE TRIGGER trg_tenant_logs_no_update
  BEFORE UPDATE ON audit.tenant_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.prevent_tenant_log_update();

-- ────────────────────────────────────────────────────────
-- 3. Add indexes for audit query performance
-- ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_logs_created
  ON audit.platform_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_logs_tenant_created
  ON audit.tenant_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

COMMIT;
