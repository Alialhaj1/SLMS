-- ============================================================================
-- Migration 356: Create record_statuses table + seed data
-- Screen A-15 — حالة السجلات (Record Status)
-- Used across all modules to define record lifecycle states
-- ============================================================================

-- Drop and recreate if exists (idempotent)
DO $$
BEGIN
  -- Drop table if exists to avoid schema conflicts
  DROP TABLE IF EXISTS record_statuses CASCADE;

  -- Drop table if exists to avoid schema conflicts
  DROP TABLE IF EXISTS record_statuses CASCADE;

  CREATE TABLE record_statuses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20)   NOT NULL,
    name_ar         VARCHAR(60)   NOT NULL,
    name_en         VARCHAR(60)   NOT NULL,
    description_ar  VARCHAR(255),
    description_en  VARCHAR(255),
    color           VARCHAR(7)    NOT NULL DEFAULT '#6B7280',
    bg_color        VARCHAR(7)    NOT NULL DEFAULT '#F3F4F6',
    icon            VARCHAR(10),
    is_active_state BOOLEAN       NOT NULL DEFAULT false,
    is_default      BOOLEAN       NOT NULL DEFAULT false,
    is_system       BOOLEAN       NOT NULL DEFAULT false,
    applies_to      VARCHAR(255)  DEFAULT 'all',
    sort_order      INTEGER       DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active',
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_by      INTEGER,
    updated_by      INTEGER,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_record_statuses_code UNIQUE (code)
  );

  -- Performance indexes
  CREATE INDEX idx_record_statuses_code       ON record_statuses (code);
  CREATE INDEX idx_record_statuses_status      ON record_statuses (status) WHERE deleted_at IS NULL;
  CREATE INDEX idx_record_statuses_is_active   ON record_statuses (is_active) WHERE deleted_at IS NULL;
  CREATE INDEX idx_record_statuses_deleted_at  ON record_statuses (deleted_at);
  CREATE INDEX idx_record_statuses_sort_order  ON record_statuses (sort_order) WHERE deleted_at IS NULL;

  RAISE NOTICE 'Table record_statuses created successfully';
END $$;

-- ============================================================================
-- Seed Data — Core record statuses used across the system
-- ============================================================================
INSERT INTO record_statuses (code, name_ar, name_en, description_ar, description_en, color, bg_color, icon, is_active_state, is_default, is_system, applies_to, sort_order, status, is_active)
VALUES
  ('active',    'نشط',           'Active',         'السجل نشط ومتاح لجميع العمليات',              'Record is active and available for all operations',         '#16A34A', '#DCFCE7', '✅', true,  true,  true, 'all', 1,  'active', true),
  ('inactive',  'غير نشط',       'Inactive',       'السجل معطّل مؤقتاً ولا يظهر في القوائم الجديدة', 'Record is temporarily disabled and hidden from new lists',   '#6B7280', '#F3F4F6', '⭕', false, false, true, 'all', 2,  'active', true),
  ('suspended', 'موقوف',         'Suspended',      'السجل موقوف بسبب مخالفة أو مشكلة إدارية',       'Record is suspended due to violation or administrative issue','#DC2626', '#FEE2E2', '🚫', false, false, true, 'all', 3,  'active', true),
  ('pending',   'قيد المراجعة',   'Pending Review', 'السجل قيد المراجعة والاعتماد',                  'Record is pending review and approval',                      '#D97706', '#FEF3C7', '⏳', false, false, true, 'all', 4,  'active', true),
  ('draft',     'مسودة',         'Draft',          'السجل في مرحلة الإعداد ولم يُعتمد بعد',         'Record is being prepared and not yet finalized',             '#7C3AED', '#EDE9FE', '📝', false, false, true, 'all', 5,  'active', true),
  ('archived',  'مؤرشف',         'Archived',       'السجل مؤرشف ولا يظهر في العمليات اليومية',       'Record is archived and hidden from daily operations',        '#475569', '#F1F5F9', '🗃️', false, false, false, 'all', 6, 'active', true),
  ('expired',   'منتهي الصلاحية', 'Expired',        'السجل انتهت صلاحيته أو فترة سريانه',            'Record has expired or passed its validity period',           '#92400E', '#FEF3C7', '⏰', false, false, false, 'all', 7, 'active', true),
  ('blocked',   'محظور',         'Blocked',        'السجل محظور من الاستخدام في أي عملية',           'Record is blocked from use in any operation',                '#991B1B', '#FEE2E2', '🔒', false, false, false, 'all', 8, 'active', true)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  icon = EXCLUDED.icon,
  is_active_state = EXCLUDED.is_active_state,
  is_default = EXCLUDED.is_default,
  is_system = EXCLUDED.is_system,
  applies_to = EXCLUDED.applies_to,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Permissions for record_statuses
-- ============================================================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('master:record_statuses:view',   'master:record_statuses', 'view',   'View record statuses'),
  ('master:record_statuses:create', 'master:record_statuses', 'create', 'Create record statuses'),
  ('master:record_statuses:edit',   'master:record_statuses', 'edit',   'Edit record statuses'),
  ('master:record_statuses:delete', 'master:record_statuses', 'delete', 'Delete record statuses'),
  ('master:record_statuses:export', 'master:record_statuses', 'export', 'Export record statuses')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin and super_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
  AND p.permission_code LIKE 'master:record_statuses:%'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Migration 356: record_statuses table + seed + permissions complete';
END $$;
