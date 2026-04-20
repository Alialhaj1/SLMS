-- ============================================================================
-- Migration: 412_security_hardening.sql
-- Section:   §12 — الأمان — Security Hardening
-- Purpose:   WORM policies, encryption prep, idle timeout, email verification
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: S10 — Audit Logs WORM (Write-Once, Read-Many)
-- Prevents ANY deletion of audit log records.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prevent_audit_log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'WORM_POLICY: audit_logs records cannot be deleted or modified (§12 S10)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Block DELETE on audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_deletion();

-- Block UPDATE on critical audit fields (action, resource, before_data, after_data, user_id, tenant_id)
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.action IS DISTINCT FROM NEW.action
     OR OLD.resource IS DISTINCT FROM NEW.resource
     OR OLD.before_data IS DISTINCT FROM NEW.before_data
     OR OLD.after_data IS DISTINCT FROM NEW.after_data
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR OLD.ip_address IS DISTINCT FROM NEW.ip_address
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'WORM_POLICY: audit_logs critical fields cannot be modified (§12 S10)';
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_tamper ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_tamper
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_tampering();

-- Also protect audit.platform_logs (the platform audit table)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'audit' AND table_name = 'platform_logs') THEN
    EXECUTE '
      DROP TRIGGER IF EXISTS trg_platform_logs_no_delete ON audit.platform_logs;
      CREATE TRIGGER trg_platform_logs_no_delete
        BEFORE DELETE ON audit.platform_logs
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_deletion();
    ';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: S12 — Encrypted sensitive data columns
-- Add encrypted columns for MFA secrets (existing plaintext will be migrated
-- by application code on first access).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Mark existing mfa_secret as legacy; new encrypted column stores AES-256 cipher
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mfa_secret_encrypted'
  ) THEN
    ALTER TABLE users ADD COLUMN mfa_secret_encrypted TEXT;
    COMMENT ON COLUMN users.mfa_secret_encrypted IS 'AES-256-CBC encrypted MFA TOTP secret (§12 S12). Format: iv:ciphertext';
  END IF;
END $$;

-- api_keys.key_hash is already one-way SHA-256 — no change needed.
-- But add an encrypted_key_preview column for admin display (last 4 chars)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'key_preview'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN key_preview VARCHAR(8);
    COMMENT ON COLUMN api_keys.key_preview IS 'Last 4 chars of API key for admin display, e.g. "...a1b2" (§12 S12)';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: S18 — Idle session timeout (configurable)
-- tenant_sessions already has last_activity_at, idle timeout controlled by system_policies
-- ═══════════════════════════════════════════════════════════════════════════════

-- Seed system policy for idle timeout (if not already set)
INSERT INTO system_policies (company_id, policy_key, policy_value, description_en, description_ar, data_type, category, default_value, is_system_policy, is_active)
SELECT NULL, 'idle_session_timeout_minutes', '30',
       '§12 S18: Idle session timeout in minutes. Sessions inactive for this duration are revoked.',
       'مهلة الخمول بالدقائق للجلسات',
       'integer', 'security', '30', TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM system_policies WHERE policy_key = 'idle_session_timeout_minutes' AND company_id IS NULL AND deleted_at IS NULL
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: S20 — Email verification on registration
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verification_token'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verification_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON users (email_verification_token)
  WHERE email_verification_token IS NOT NULL;

-- Backfill: existing users are considered verified
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: S17 — Backup encryption tracking
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backup_history' AND column_name = 'is_encrypted'
  ) THEN
    ALTER TABLE backup_history ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backup_history' AND column_name = 'encryption_algorithm'
  ) THEN
    ALTER TABLE backup_history ADD COLUMN encryption_algorithm VARCHAR(50);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: S13 — File upload validation (magic bytes)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create allowed_file_types reference table for runtime validation
CREATE TABLE IF NOT EXISTS allowed_file_types (
  id SERIAL PRIMARY KEY,
  mime_type VARCHAR(100) NOT NULL UNIQUE,
  extensions TEXT[] NOT NULL,
  magic_bytes BYTEA,
  max_size_bytes INTEGER NOT NULL DEFAULT 5242880,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO allowed_file_types (mime_type, extensions, magic_bytes, max_size_bytes, category)
VALUES
  ('image/jpeg',  ARRAY['jpg','jpeg'], E'\\xFFD8FF',   5242880,  'image'),
  ('image/png',   ARRAY['png'],        E'\\x89504E47', 5242880,  'image'),
  ('image/gif',   ARRAY['gif'],        E'\\x47494638', 5242880,  'image'),
  ('image/webp',  ARRAY['webp'],       E'\\x52494646', 5242880,  'image'),
  ('application/pdf', ARRAY['pdf'],    E'\\x25504446', 10485760, 'document'),
  ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  ARRAY['xlsx'],       E'\\x504B0304', 10485760, 'document'),
  ('text/csv',    ARRAY['csv'],        NULL,            5242880,  'data')
ON CONFLICT (mime_type) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: §12 Permissions
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  ('security:view',        'security', 'view',    'View security settings and audit',       'core', 'platform'),
  ('security:manage',      'security', 'manage',  'Manage security policies',               'core', 'platform'),
  ('backups:create',       'backups',  'create',  'Create encrypted database backups',      'core', 'platform'),
  ('backups:restore',      'backups',  'restore', 'Restore database from backup',           'core', 'platform'),
  ('file_uploads:manage',  'file_uploads', 'manage', 'Manage file upload settings',         'core', 'shared')
ON CONFLICT (permission_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
