-- ============================================================================
-- Migration: 413_global_platform_additions.sql
-- Section:   §13 — الإضافات المقترحة لمنصة عالمية
-- Purpose:   Tables & schemas for all §13.1-13.4 features
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- §13.1  SECURITY & TRUST
-- ═══════════════════════════════════════════════════════════════════════════════

-- §13.1.1 — IP Whitelist per Tenant (P1)
CREATE TABLE IF NOT EXISTS tenant_ip_whitelists (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ip_cidr       VARCHAR(50) NOT NULL,          -- e.g. '192.168.1.0/24' or '10.0.0.5/32'
  label         VARCHAR(100),                   -- 'HQ Office', 'VPN Gateway'
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, ip_cidr)
);

CREATE INDEX IF NOT EXISTS idx_tip_whitelist_tenant ON tenant_ip_whitelists(tenant_id) WHERE is_active = TRUE;

-- §13.1.2 — Login Anomaly Events (P1)
CREATE TABLE IF NOT EXISTS login_anomaly_events (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  event_type    VARCHAR(50) NOT NULL,           -- 'new_device', 'new_country', 'unusual_time', 'impossible_travel'
  severity      VARCHAR(20) DEFAULT 'medium',   -- 'low', 'medium', 'high', 'critical'
  ip_address    VARCHAR(45),
  country_code  VARCHAR(5),
  city          VARCHAR(100),
  device_fingerprint VARCHAR(255),
  user_agent    TEXT,
  details       JSONB DEFAULT '{}',
  is_reviewed   BOOLEAN DEFAULT FALSE,
  reviewed_by   INTEGER REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_user    ON login_anomaly_events(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_tenant  ON login_anomaly_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_type    ON login_anomaly_events(event_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_pending ON login_anomaly_events(is_reviewed) WHERE is_reviewed = FALSE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- §13.2  UX BACKEND
-- ═══════════════════════════════════════════════════════════════════════════════

-- §13.2.1 — User Preferences (column customizer, pinned records, UI settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(200) NOT NULL,         -- 'table:shipments:columns', 'pinned:shipments', 'dashboard:layout'
  preference_value JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);

-- §13.2.2 — Recent Items (last N records accessed per user)
CREATE TABLE IF NOT EXISTS user_recent_items (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,           -- 'shipment', 'vendor', 'customer', 'purchase_order'
  resource_id   INTEGER NOT NULL,
  resource_label VARCHAR(200),                  -- display text: "SHP-2024-0001" or "Al Hajj Trading"
  accessed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recent_user     ON user_recent_items(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_resource ON user_recent_items(resource_type, resource_id);

-- Limit to 50 most recent per user (enforced by trigger)
CREATE OR REPLACE FUNCTION trim_user_recent_items()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_recent_items
  WHERE id IN (
    SELECT id FROM user_recent_items
    WHERE user_id = NEW.user_id
    ORDER BY accessed_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_recent_items ON user_recent_items;
CREATE TRIGGER trg_trim_recent_items
  AFTER INSERT ON user_recent_items
  FOR EACH ROW EXECUTE FUNCTION trim_user_recent_items();


-- ═══════════════════════════════════════════════════════════════════════════════
-- §13.3  BUSINESS LOGIC
-- ═══════════════════════════════════════════════════════════════════════════════

-- §13.3.1 — Email Templates Engine (P1)
CREATE TABLE IF NOT EXISTS email_templates (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = system-wide
  template_code VARCHAR(100) NOT NULL,          -- 'welcome', 'password_reset', 'shipment_status', 'invoice'
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,                  -- Handlebars template: "Hello {{user.name}}"
  body_text     TEXT,                           -- Plain-text fallback
  variables     JSONB DEFAULT '[]',             -- Schema: [{"name":"user.name","type":"string","required":true}]
  locale        VARCHAR(10) DEFAULT 'en',       -- 'en', 'ar'
  category      VARCHAR(50) DEFAULT 'system',   -- 'system', 'marketing', 'transactional'
  is_active     BOOLEAN DEFAULT TRUE,
  version       INTEGER DEFAULT 1,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (tenant_id, template_code, locale)
);

-- Email send log
CREATE TABLE IF NOT EXISTS email_send_log (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  template_id   INTEGER REFERENCES email_templates(id),
  recipient     VARCHAR(255) NOT NULL,
  subject       TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'queued',   -- 'queued', 'sent', 'failed', 'bounced'
  error_message TEXT,
  metadata      JSONB DEFAULT '{}',             -- Template variables used
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_tenant ON email_send_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_send_log(status);

-- §13.3.2 — Document Management (P1) — generic cross-entity attachments
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   VARCHAR(50) NOT NULL,           -- 'shipment', 'vendor', 'purchase_order', 'customer', 'expense'
  entity_id     INTEGER NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_path     TEXT NOT NULL,
  file_url      TEXT,
  file_size     INTEGER,
  mime_type     VARCHAR(100),
  category      VARCHAR(50) DEFAULT 'general',  -- 'invoice', 'contract', 'customs', 'certificate', 'photo'
  description   TEXT,
  version       INTEGER DEFAULT 1,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_docs_entity ON documents(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docs_tenant ON documents(tenant_id) WHERE deleted_at IS NULL;

-- §13.3.3 — Scheduled Reports (P2)
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type   VARCHAR(50) NOT NULL,           -- 'shipments_summary', 'expenses_monthly', 'aging_report'
  report_name   VARCHAR(200) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,        -- '0 8 * * 1' = every Monday 8 AM
  recipients    TEXT[] NOT NULL,                 -- array of email addresses
  format        VARCHAR(10) DEFAULT 'xlsx',     -- 'xlsx', 'pdf', 'csv'
  filters       JSONB DEFAULT '{}',             -- { "date_range": "last_30_days", "status": "active" }
  is_active     BOOLEAN DEFAULT TRUE,
  last_run_at   TIMESTAMPTZ,
  next_run_at   TIMESTAMPTZ,
  last_status   VARCHAR(20),                    -- 'success', 'failed'
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- §13.3.4 — Usage Analytics per Tenant (P1)
CREATE TABLE IF NOT EXISTS tenant_usage_analytics (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date   DATE NOT NULL,
  metric_key    VARCHAR(100) NOT NULL,          -- 'api_calls', 'active_users', 'storage_mb', 'shipments_created'
  metric_value  NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, metric_date, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_date ON tenant_usage_analytics(tenant_id, metric_date DESC);

-- §13.3.5 — Tenant Branding Enhancement (extends existing companies columns)
-- Already has logo_url from migration 999. Add full white-label columns.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'custom_domain') THEN
    ALTER TABLE tenants ADD COLUMN custom_domain VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'branding') THEN
    ALTER TABLE tenants ADD COLUMN branding JSONB DEFAULT '{}';
    -- { "logo_url": "...", "favicon_url": "...", "primary_color": "#0066CC", "accent_color": "#FF6600", "company_name": "..." }
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- §13.4  INFRASTRUCTURE
-- ═══════════════════════════════════════════════════════════════════════════════

-- §13.4.1 — Feature Flags (P2)
CREATE TABLE IF NOT EXISTS feature_flags (
  id            SERIAL PRIMARY KEY,
  flag_key      VARCHAR(100) NOT NULL UNIQUE,    -- 'enable_ai_suggestions', 'new_dashboard_v2'
  display_name  VARCHAR(200),
  description   TEXT,
  flag_type     VARCHAR(20) DEFAULT 'boolean',   -- 'boolean', 'percentage', 'user_list', 'tenant_list'
  default_value JSONB DEFAULT 'false',           -- Default when no override
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flag overrides per tenant
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id            SERIAL PRIMARY KEY,
  flag_id       INTEGER NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,     -- NULL = applies to all
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,       -- NULL = applies to all users
  override_value JSONB NOT NULL,
  reason        TEXT,
  expires_at    TIMESTAMPTZ,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (flag_id, tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ff_overrides_flag   ON feature_flag_overrides(flag_id);
CREATE INDEX IF NOT EXISTS idx_ff_overrides_tenant ON feature_flag_overrides(tenant_id);

-- §13.4.2 — Background Jobs Queue (P2) — lightweight DB-backed queue
CREATE TABLE IF NOT EXISTS background_jobs (
  id            SERIAL PRIMARY KEY,
  queue_name    VARCHAR(100) NOT NULL DEFAULT 'default',  -- 'email', 'reports', 'exports', 'default'
  job_type      VARCHAR(100) NOT NULL,                    -- 'send_email', 'generate_report', 'export_data'
  payload       JSONB NOT NULL DEFAULT '{}',
  status        VARCHAR(20) DEFAULT 'pending',            -- 'pending', 'running', 'completed', 'failed', 'retrying'
  priority      INTEGER DEFAULT 0,                        -- Higher = run first
  attempts      INTEGER DEFAULT 0,
  max_attempts  INTEGER DEFAULT 3,
  error_message TEXT,
  result        JSONB,
  scheduled_at  TIMESTAMPTZ DEFAULT NOW(),                -- For delayed jobs
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pending ON background_jobs(queue_name, priority DESC, scheduled_at ASC)
  WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_jobs_status  ON background_jobs(status);

-- §13.4.3 — Performance Metrics Snapshots (for Prometheus / monitoring)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id            SERIAL PRIMARY KEY,
  metric_name   VARCHAR(100) NOT NULL,          -- 'api_response_time', 'db_query_time', 'active_connections'
  metric_value  NUMERIC(15,4) NOT NULL,
  labels        JSONB DEFAULT '{}',             -- { "method": "GET", "path": "/api/shipments", "status": 200 }
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Partition-friendly index (by time)
CREATE INDEX IF NOT EXISTS idx_perf_metrics_time ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON performance_metrics(metric_name, recorded_at DESC);

-- Auto-cleanup: delete metrics older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  -- §13.1
  ('ip_whitelist:view',     'ip_whitelist',   'view',    'View tenant IP whitelists',         'core', 'tenant'),
  ('ip_whitelist:manage',   'ip_whitelist',   'manage',  'Manage tenant IP whitelists',       'core', 'tenant'),
  ('anomaly:view',          'anomaly',        'view',    'View login anomaly events',         'core', 'shared'),
  ('anomaly:manage',        'anomaly',        'manage',  'Review/dismiss anomaly events',     'core', 'shared'),
  -- §13.2
  ('preferences:manage',    'preferences',    'manage',  'Manage user preferences',           'core', 'shared'),
  ('recent_items:view',     'recent_items',   'view',    'View recent items',                 'core', 'shared'),
  ('global_search:use',     'global_search',  'use',     'Use global search',                 'core', 'shared'),
  -- §13.3
  ('email_templates:view',  'email_templates','view',    'View email templates',              'core', 'shared'),
  ('email_templates:manage','email_templates','manage',  'Manage email templates',            'core', 'shared'),
  ('documents:view',        'documents',      'view',    'View entity documents',             'core', 'shared'),
  ('documents:create',      'documents',      'create',  'Upload documents',                  'core', 'shared'),
  ('documents:delete',      'documents',      'delete',  'Delete documents',                  'core', 'shared'),
  ('scheduled_reports:view','scheduled_reports','view',   'View scheduled reports',            'core', 'shared'),
  ('scheduled_reports:manage','scheduled_reports','manage','Manage scheduled reports',         'core', 'shared'),
  ('usage_analytics:view',  'usage_analytics','view',    'View tenant usage analytics',       'core', 'platform'),
  ('tenant_export:create',  'tenant_export',  'create',  'Trigger full tenant data export',   'core', 'tenant'),
  ('branding:manage',       'branding',       'manage',  'Manage tenant branding',            'core', 'tenant'),
  -- §13.4
  ('feature_flags:view',    'feature_flags',  'view',    'View feature flags',                'core', 'platform'),
  ('feature_flags:manage',  'feature_flags',  'manage',  'Manage feature flags',              'core', 'platform'),
  ('background_jobs:view',  'background_jobs','view',    'View background job status',        'core', 'platform'),
  ('metrics:view',          'metrics',        'view',    'View performance metrics',          'core', 'platform')
ON CONFLICT (permission_code) DO NOTHING;

-- Seed default feature flags
INSERT INTO feature_flags (flag_key, display_name, description, flag_type, default_value)
VALUES
  ('global_search',         'Global Search (⌘K)',          'Enable global search across all records',            'boolean', 'true'),
  ('dark_mode',             'Dark Mode',                   'Enable dark mode toggle',                            'boolean', 'true'),
  ('keyboard_shortcuts',    'Keyboard Shortcuts',          'Enable keyboard shortcut overlay',                   'boolean', 'true'),
  ('onboarding_wizard',     'Onboarding Wizard',           'Show interactive onboarding for new tenant users',   'boolean', 'true'),
  ('in_app_notifications',  'In-App Notifications',        'Enable real-time in-app notification bell',          'boolean', 'true'),
  ('export_excel',          'Export to Excel',             'Enable Excel export on all data tables',             'boolean', 'true'),
  ('export_pdf',            'Export to PDF',               'Enable PDF export on reports',                       'boolean', 'false'),
  ('customizable_dashboard','Customizable Dashboard',      'Enable drag-and-drop dashboard widgets',             'boolean', 'false'),
  ('activity_timeline',     'Activity Timeline',           'Show activity timeline on record detail pages',      'boolean', 'true'),
  ('bulk_actions',          'Bulk Actions',                'Enable multi-select and bulk operations on tables',  'boolean', 'true'),
  ('column_customizer',     'Column Customizer',           'Allow users to hide/show table columns',             'boolean', 'true'),
  ('pinned_records',        'Pinned Records',              'Allow pinning important records to top of lists',    'boolean', 'false'),
  ('recent_items',          'Recent Items',                'Show last 10 accessed records',                      'boolean', 'true'),
  ('document_management',   'Document Management',         'Enable file attachments on all entities',            'boolean', 'true'),
  ('approval_workflows',    'Approval Workflows',          'Enable multi-level approval chains',                 'boolean', 'true'),
  ('email_templates',       'Email Templates Engine',      'Enable customizable email templates per tenant',     'boolean', 'false'),
  ('scheduled_reports',     'Scheduled Reports',           'Enable cron-based automatic report delivery',        'boolean', 'false'),
  ('usage_analytics',       'Tenant Usage Analytics',      'Track per-tenant API/feature usage metrics',         'boolean', 'true'),
  ('white_label',           'White-Label Support',         'Allow Enterprise tenants to use custom branding',    'boolean', 'false'),
  ('ip_whitelist',          'IP Whitelist per Tenant',     'Restrict tenant login to whitelisted IPs',           'boolean', 'false'),
  ('circuit_breaker',       'Circuit Breaker',             'Enable circuit breaker for external service calls',  'boolean', 'true'),
  ('sso_saml',              'SSO / SAML',                  'Enable SSO for Enterprise tenants (future)',         'boolean', 'false')
ON CONFLICT (flag_key) DO NOTHING;

-- Seed default email templates
INSERT INTO email_templates (tenant_id, template_code, subject, body_html, body_text, variables, locale, category)
VALUES
  (NULL, 'welcome', 'Welcome to SLMS — {{company_name}}',
   '<h1>Welcome, {{user_name}}!</h1><p>Your account on <strong>{{company_name}}</strong> has been created.</p><p>Login at: <a href="{{login_url}}">{{login_url}}</a></p><p>Temporary password: <code>{{temp_password}}</code></p>',
   'Welcome {{user_name}}! Your account on {{company_name}} has been created. Login at {{login_url}} with temporary password: {{temp_password}}',
   '[{"name":"user_name","type":"string","required":true},{"name":"company_name","type":"string","required":true},{"name":"login_url","type":"string","required":true},{"name":"temp_password","type":"string","required":false}]',
   'en', 'system'),
  (NULL, 'welcome', 'مرحباً بك في SLMS — {{company_name}}',
   '<h1 dir="rtl">مرحباً {{user_name}}!</h1><p dir="rtl">تم إنشاء حسابك في <strong>{{company_name}}</strong>.</p><p dir="rtl">رابط الدخول: <a href="{{login_url}}">{{login_url}}</a></p><p dir="rtl">كلمة المرور المؤقتة: <code>{{temp_password}}</code></p>',
   'مرحباً {{user_name}}! تم إنشاء حسابك في {{company_name}}. رابط الدخول: {{login_url}} كلمة المرور المؤقتة: {{temp_password}}',
   '[{"name":"user_name","type":"string","required":true},{"name":"company_name","type":"string","required":true},{"name":"login_url","type":"string","required":true},{"name":"temp_password","type":"string","required":false}]',
   'ar', 'system'),
  (NULL, 'password_reset', 'Password Reset — SLMS',
   '<p>Hello {{user_name}},</p><p>A password reset has been approved for your account.</p><p>Temporary password: <code>{{temp_password}}</code></p><p>You will be required to change it on next login.</p>',
   'Hello {{user_name}}, A password reset has been approved. Temp password: {{temp_password}}.',
   '[{"name":"user_name","type":"string","required":true},{"name":"temp_password","type":"string","required":true}]',
   'en', 'system'),
  (NULL, 'shipment_status_update', 'Shipment {{shipment_ref}} — Status Updated to {{new_status}}',
   '<p>Shipment <strong>{{shipment_ref}}</strong> status has been updated.</p><ul><li>Previous: {{old_status}}</li><li>New: <strong>{{new_status}}</strong></li><li>Updated by: {{updated_by}}</li><li>Date: {{updated_at}}</li></ul>',
   'Shipment {{shipment_ref}} status updated from {{old_status}} to {{new_status}} by {{updated_by}} at {{updated_at}}.',
   '[{"name":"shipment_ref","type":"string","required":true},{"name":"old_status","type":"string","required":true},{"name":"new_status","type":"string","required":true},{"name":"updated_by","type":"string","required":true},{"name":"updated_at","type":"string","required":true}]',
   'en', 'transactional')
ON CONFLICT (tenant_id, template_code, locale) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
