-- ============================================================================
-- Migration 406: Platform Layer — §5 إدارة المنصة
-- ============================================================================
-- Creates: impersonation_logs, platform_settings, tenant_requests,
--          subscription_history tables.
-- Seeds:   All platform.* permissions required by §5.
-- Adds:    Impersonation audit columns, platform settings defaults.
-- ============================================================================

-- ────────────────────────────────────────────
-- 1) impersonation_logs — immutable audit trail (§5.3)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id              BIGSERIAL PRIMARY KEY,
  -- Who is impersonating
  super_admin_id  INTEGER NOT NULL REFERENCES users(id),
  -- Target (at least one must be set)
  tenant_id       INTEGER REFERENCES tenants(id),
  target_user_id  INTEGER REFERENCES users(id),
  -- Mandatory reason — validated at API layer
  reason          TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) >= 10),
  -- Token details
  token_jti       UUID,                          -- JWT ID for the impersonation token
  token_expires_at TIMESTAMPTZ,                  -- 30 min from creation
  -- Session tracking
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  ip_address      INET,
  user_agent      TEXT,
  operations_count INTEGER DEFAULT 0,            -- incremented by audit hooks
  -- Immutable: no soft-delete, no update on reason/started_at
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                    -- kept for query compat but NEVER set
);

-- Add missing columns if table existed from an older migration
ALTER TABLE impersonation_logs ADD COLUMN IF NOT EXISTS token_jti UUID;
ALTER TABLE impersonation_logs ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE impersonation_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Fast lookups by admin, tenant, and time range
CREATE INDEX IF NOT EXISTS idx_impersonation_admin    ON impersonation_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant   ON impersonation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_started  ON impersonation_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_jti      ON impersonation_logs(token_jti) WHERE token_jti IS NOT NULL;

-- Protect from deletion — even super admins cannot remove rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_impersonation_no_delete'
  ) THEN
    CREATE OR REPLACE FUNCTION prevent_impersonation_delete() RETURNS TRIGGER AS $fn$
    BEGIN
      RAISE EXCEPTION 'Impersonation logs cannot be deleted — security policy';
    END;
    $fn$ LANGUAGE plpgsql;
    
    CREATE TRIGGER trg_impersonation_no_delete
      BEFORE DELETE ON impersonation_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_impersonation_delete();
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 2) platform_settings — key-value config store (§5.1 #11)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(50)  NOT NULL,             -- smtp, security, backup, monitoring, general
  key         VARCHAR(100) NOT NULL,
  value       TEXT,
  value_type  VARCHAR(20)  DEFAULT 'string',     -- string, number, boolean, json
  description TEXT,
  is_secret   BOOLEAN      DEFAULT FALSE,        -- mask in API responses
  updated_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Seed default platform settings
INSERT INTO platform_settings (category, key, value, value_type, description, is_secret) VALUES
  -- SMTP
  ('smtp', 'host',             'smtp.example.com',   'string',  'SMTP server hostname',      false),
  ('smtp', 'port',             '587',                'number',  'SMTP server port',           false),
  ('smtp', 'username',         '',                   'string',  'SMTP username',              false),
  ('smtp', 'password',         '',                   'string',  'SMTP password',              true),
  ('smtp', 'from_email',       'noreply@slms.sa',    'string',  'Default sender email',       false),
  ('smtp', 'from_name',        'SLMS Platform',      'string',  'Default sender name',        false),
  ('smtp', 'encryption',       'tls',                'string',  'tls or ssl',                 false),
  -- Security
  ('security', 'max_login_attempts',        '5',     'number',  'Max failed logins before lock', false),
  ('security', 'lock_duration_minutes',     '30',    'number',  'Lock duration in minutes',      false),
  ('security', 'password_min_length',       '8',     'number',  'Minimum password length',       false),
  ('security', 'session_timeout_minutes',   '60',    'number',  'Session timeout in minutes',    false),
  ('security', 'require_mfa_platform',      'false', 'boolean', 'Require MFA for platform admins', false),
  ('security', 'ip_whitelist',              '',      'string',  'Platform admin IP whitelist (comma-separated)', false),
  -- Backup
  ('backup', 'auto_backup_enabled',         'true',  'boolean', 'Enable daily automatic backups', false),
  ('backup', 'backup_retention_days',       '30',    'number',  'Days to retain backups',         false),
  ('backup', 'backup_schedule_cron',        '0 2 * * *', 'string', 'Cron expression for auto backup', false),
  -- Monitoring
  ('monitoring', 'health_check_interval_ms', '30000', 'number', 'Health check interval',        false),
  ('monitoring', 'alert_email',              '',      'string',  'Alert recipient email',        false),
  ('monitoring', 'alert_on_tenant_suspension','true', 'boolean', 'Alert when tenant is suspended', false),
  -- General
  ('general', 'platform_name',       'SLMS',           'string',  'Platform display name',     false),
  ('general', 'platform_name_ar',    'نظام إدارة الشحن','string', 'Platform Arabic name',     false),
  ('general', 'default_language',    'en',              'string',  'Default language (en/ar)',  false),
  ('general', 'default_currency',    'SAR',             'string',  'Default currency code',    false),
  ('general', 'maintenance_mode',    'false',           'boolean', 'Enable maintenance mode',  false)
ON CONFLICT (category, key) DO NOTHING;

-- ────────────────────────────────────────────
-- 3) tenant_requests — account signup requests (§5.1 #6)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_requests (
  id              SERIAL PRIMARY KEY,
  -- Company info (step 1)
  company_name    VARCHAR(200) NOT NULL,
  company_name_ar VARCHAR(200),
  company_code    VARCHAR(20),                   -- auto-generated or user-provided
  country         VARCHAR(3)   DEFAULT 'SAU',
  currency        VARCHAR(3)   DEFAULT 'SAR',
  language        VARCHAR(5)   DEFAULT 'ar',
  plan            VARCHAR(50)  DEFAULT 'Starter',
  vat_number      VARCHAR(50),
  -- Admin info (step 2)
  admin_name      VARCHAR(200) NOT NULL,
  admin_email     VARCHAR(200) NOT NULL,
  admin_phone     VARCHAR(20),
  -- Requested modules (step 3)
  requested_modules JSONB      DEFAULT '[]',
  max_users       INTEGER      DEFAULT 5,
  max_shipments   INTEGER,
  -- Review workflow
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','under_review','approved','rejected','provisioned')),
  reviewed_by     INTEGER REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  rejection_reason TEXT,
  -- Provisioned tenant link
  provisioned_tenant_id INTEGER REFERENCES tenants(id),
  -- Source & metadata
  source          VARCHAR(50)  DEFAULT 'web',     -- web, api, manual, referral
  referral_code   VARCHAR(50),
  metadata        JSONB        DEFAULT '{}',
  -- Timestamps
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_requests_status   ON tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_email    ON tenant_requests(admin_email);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_created  ON tenant_requests(created_at DESC);

-- ────────────────────────────────────────────
-- 4) subscription_history — plan change audit trail
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_history (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
  old_plan        VARCHAR(50),
  new_plan        VARCHAR(50) NOT NULL,
  changed_by      INTEGER REFERENCES users(id),  -- null = system auto
  change_reason   TEXT,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,                    -- null = current
  metadata        JSONB       DEFAULT '{}',       -- pricing snapshot, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table existed from an older migration
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS old_plan VARCHAR(50);
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS new_plan VARCHAR(50);
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS changed_by INTEGER;
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS change_reason TEXT;
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ;
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sub_history_tenant ON subscription_history(tenant_id);

-- ────────────────────────────────────────────
-- 5) Seed ALL platform permissions (§5.1 table)
-- ────────────────────────────────────────────
-- 5a) Add 'platform' module FIRST (needed for FK on permissions.module_code)
-- ────────────────────────────────────────────
INSERT INTO modules (module_code, module_name, name_ar, description, is_active, is_core, category, sort_order)
VALUES ('platform', 'Platform Administration', 'إدارة المنصة', 'Core platform management module', true, true, 'platform', 0)
ON CONFLICT (module_code) DO NOTHING;

-- ────────────────────────────────────────────
-- permission_code format: platform.<resource>.<action>
-- module_code = 'platform' (core, always enabled)

INSERT INTO permissions (permission_code, resource, action, module_code, description, created_at, updated_at)
VALUES
  -- #1 Dashboard
  ('platform.dashboard.read',        'platform_dashboard', 'read',   'platform', 'View platform dashboard',             NOW(), NOW()),
  -- #2 Tenant Management
  ('platform.tenants.read',          'platform_tenants',   'read',   'platform', 'View tenant list',                    NOW(), NOW()),
  ('platform.tenants.create',        'platform_tenants',   'create', 'platform', 'Create new tenant',                   NOW(), NOW()),
  ('platform.tenants.update',        'platform_tenants',   'update', 'platform', 'Update tenant details',               NOW(), NOW()),
  ('platform.tenants.delete',        'platform_tenants',   'delete', 'platform', 'Delete/terminate tenant',             NOW(), NOW()),
  ('platform.tenants.suspend',       'platform_tenants',   'suspend','platform', 'Suspend/activate tenant',             NOW(), NOW()),
  ('platform.tenants.impersonate',   'platform_tenants',   'impersonate','platform','Impersonate tenant user',          NOW(), NOW()),
  -- #3 Subscription Plans
  ('platform.plans.read',            'platform_plans',     'read',   'platform', 'View subscription plans',             NOW(), NOW()),
  ('platform.plans.create',          'platform_plans',     'create', 'platform', 'Create subscription plan',            NOW(), NOW()),
  ('platform.plans.update',          'platform_plans',     'update', 'platform', 'Update subscription plan',            NOW(), NOW()),
  ('platform.plans.delete',          'platform_plans',     'delete', 'platform', 'Delete subscription plan',            NOW(), NOW()),
  -- #4 Platform Users
  ('platform.users.read',            'platform_users',     'read',   'platform', 'View platform admins',                NOW(), NOW()),
  ('platform.users.create',          'platform_users',     'create', 'platform', 'Create platform admin',               NOW(), NOW()),
  ('platform.users.update',          'platform_users',     'update', 'platform', 'Update platform admin',               NOW(), NOW()),
  ('platform.users.delete',          'platform_users',     'delete', 'platform', 'Delete platform admin',               NOW(), NOW()),
  -- #5 Master Data
  ('platform.master_data.read',      'platform_master_data','read',  'platform', 'View global reference data',          NOW(), NOW()),
  ('platform.master_data.create',    'platform_master_data','create','platform', 'Create reference data',               NOW(), NOW()),
  ('platform.master_data.update',    'platform_master_data','update','platform', 'Update reference data',               NOW(), NOW()),
  ('platform.master_data.delete',    'platform_master_data','delete','platform', 'Delete reference data',               NOW(), NOW()),
  -- #6 Account Requests
  ('platform.requests.read',         'platform_requests',  'read',   'platform', 'View account requests',               NOW(), NOW()),
  ('platform.requests.approve',      'platform_requests',  'approve','platform', 'Approve account requests',            NOW(), NOW()),
  ('platform.requests.reject',       'platform_requests',  'reject', 'platform', 'Reject account requests',             NOW(), NOW()),
  -- #7 Impersonation Logs
  ('platform.impersonation.read',    'platform_impersonation','read','platform', 'View impersonation logs',             NOW(), NOW()),
  -- #8 Audit Logs
  ('platform.audit.read',            'platform_audit',     'read',   'platform', 'View platform audit logs',            NOW(), NOW()),
  -- #9 Module Management
  ('platform.modules.read',          'platform_modules',   'read',   'platform', 'View module registry',                NOW(), NOW()),
  ('platform.modules.update',        'platform_modules',   'update', 'platform', 'Enable/disable modules',              NOW(), NOW()),
  -- #10 System Monitoring
  ('platform.monitoring.read',       'platform_monitoring','read',   'platform', 'View system health & metrics',        NOW(), NOW()),
  -- #11 Platform Settings
  ('platform.settings.read',         'platform_settings',  'read',   'platform', 'View platform settings',              NOW(), NOW()),
  ('platform.settings.update',       'platform_settings',  'update', 'platform', 'Update platform settings',            NOW(), NOW()),
  -- #12 Super Admins (read-only)
  ('platform.super_admins.read',     'platform_super_admins','read', 'platform', 'View super admin list (read-only)',   NOW(), NOW())
ON CONFLICT (permission_code) DO NOTHING;

-- ────────────────────────────────────────────
-- 6) Assign ALL platform.* permissions to platform_admin + super_admin roles
-- ────────────────────────────────────────────
DO $$
DECLARE
  perm_id INTEGER;
  sa_role_id INTEGER;
  pa_role_id INTEGER;
  ps_role_id INTEGER;
BEGIN
  -- Find platform roles
  SELECT id INTO sa_role_id FROM roles WHERE name = 'super_admin' LIMIT 1;
  SELECT id INTO pa_role_id FROM roles WHERE name = 'platform_admin' LIMIT 1;
  SELECT id INTO ps_role_id FROM roles WHERE name = 'platform_support' LIMIT 1;

  -- super_admin + platform_admin get ALL platform.* permissions
  FOR perm_id IN
    SELECT id FROM permissions WHERE permission_code LIKE 'platform.%'
  LOOP
    IF sa_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (sa_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
    IF pa_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (pa_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- platform_support gets read-only platform permissions (no create/update/delete/suspend/impersonate)
  FOR perm_id IN
    SELECT id FROM permissions
    WHERE permission_code LIKE 'platform.%'
      AND action IN ('read')
  LOOP
    IF ps_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (ps_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────
-- 7) Platform module already inserted in step 5a above
-- ────────────────────────────────────────────

-- ────────────────────────────────────────────
-- Done
-- ────────────────────────────────────────────
