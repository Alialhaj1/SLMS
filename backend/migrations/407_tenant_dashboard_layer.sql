-- ============================================================================
-- Migration 407: Tenant Dashboard Layer — §6 طبقة العميل
-- ============================================================================
-- Creates: tenant_notification_preferences, tenant_backups tables.
-- Seeds:   Tenant-scoped permissions for company profile, company settings,
--          security monitor, backup management, and notifications.
-- ============================================================================

-- ────────────────────────────────────────────
-- 1) tenant_notification_preferences — per-user notification channel prefs
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_notification_preferences (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'in_app', 'sms', 'push')),
  category      VARCHAR(100) NOT NULL,  -- e.g. 'security','system','shipments','approvals','reports'
  is_enabled    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_tnp_tenant_user
  ON tenant_notification_preferences(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tnp_category
  ON tenant_notification_preferences(category);

-- ────────────────────────────────────────────
-- 2) tenant_backups — tenant data backup requests/history
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_backups (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by    INTEGER NOT NULL REFERENCES users(id),
  backup_type     VARCHAR(50) NOT NULL DEFAULT 'full'
                    CHECK (backup_type IN ('full', 'partial', 'schema_only')),
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
  file_path       VARCHAR(500),
  file_size_bytes BIGINT,
  tables_included TEXT[],
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  expires_at      TIMESTAMP WITH TIME ZONE,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant
  ON tenant_backups(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_backups_status
  ON tenant_backups(tenant_id, status);

-- ────────────────────────────────────────────
-- 3) Seed tenant-dashboard permissions (§6)
-- ────────────────────────────────────────────
INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  -- Tenant company profile (read-only view of tenant info + plan + modules)
  ('tenant_profile:view',     'tenant_profile',   'view',   'View tenant company profile & subscription info', 'core', 'tenant'),

  -- Company settings CRUD
  ('company_settings:view',   'company_settings',  'view',   'View company settings',                          'core', 'tenant'),
  ('company_settings:edit',   'company_settings',  'edit',   'Edit company settings',                          'core', 'tenant'),

  -- Security monitoring dashboard
  ('security_monitor:view',   'security_monitor',  'view',   'View security monitoring dashboard',             'core', 'tenant'),

  -- Tenant backup management
  ('tenant_backup:view',      'tenant_backup',     'view',   'View backup history',                            'core', 'tenant'),
  ('tenant_backup:create',    'tenant_backup',     'create', 'Request data backup',                            'core', 'tenant'),

  -- Notification management
  ('notifications:view',      'notifications',     'view',   'View notifications',                             'core', 'shared'),
  ('notifications:manage',    'notifications',     'manage', 'Manage notification preferences',                'core', 'shared')
ON CONFLICT (permission_code) DO NOTHING;

-- ────────────────────────────────────────────
-- 4) Assign new permissions to admin/manager role templates
-- ────────────────────────────────────────────
-- Auto-grant tenant_profile:view, company_settings:view, notifications:view
-- to all existing tenant admin roles (hierarchy_level <= 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.hierarchy_level <= 3
  AND r.deleted_at IS NULL
  AND p.permission_code IN (
    'tenant_profile:view',
    'company_settings:view',
    'company_settings:edit',
    'security_monitor:view',
    'notifications:view',
    'notifications:manage'
  )
ON CONFLICT DO NOTHING;

-- Auto-grant backup permissions to admin roles only (hierarchy_level <= 2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.hierarchy_level <= 2
  AND r.deleted_at IS NULL
  AND p.permission_code IN (
    'tenant_backup:view',
    'tenant_backup:create'
  )
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────
-- 5) Add RLS policies on new tables
-- ────────────────────────────────────────────
ALTER TABLE tenant_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;

-- tenant_notification_preferences: tenant can see own records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tenant_notification_preferences' AND policyname = 'tnp_tenant_isolation'
  ) THEN
    CREATE POLICY tnp_tenant_isolation ON tenant_notification_preferences
      USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);
  END IF;
END $$;

-- tenant_backups: tenant can see own records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tenant_backups' AND policyname = 'tb_tenant_isolation'
  ) THEN
    CREATE POLICY tb_tenant_isolation ON tenant_backups
      USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);
  END IF;
END $$;

-- ============================================================================
-- End of Migration 407
-- ============================================================================
