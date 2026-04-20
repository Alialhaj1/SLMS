-- ============================================================================
-- Migration 417: WORM Protection for Audit Logs + Generic Error Messages Setup
-- ============================================================================
-- F05: Prevent UPDATE/DELETE on audit_logs (Write Once Read Many)
-- F03: Ensure audit_logs supports super_admin bypass logging
-- ============================================================================

BEGIN;

-- F05: WORM Protection — prevent any UPDATE or DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is write-once: UPDATE and DELETE operations are forbidden';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS worm_audit_logs_update ON audit_logs;
DROP TRIGGER IF EXISTS worm_audit_logs_delete ON audit_logs;

CREATE TRIGGER worm_audit_logs_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER worm_audit_logs_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Add index for querying super_admin bypass events
CREATE INDEX IF NOT EXISTS idx_audit_logs_super_admin_bypass 
  ON audit_logs (action) WHERE action = 'SUPER_ADMIN_BYPASS';

-- Add index for faster per-tenant audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
  ON audit_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

COMMIT;
