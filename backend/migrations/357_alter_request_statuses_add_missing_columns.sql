-- =====================================================
-- 357 — Enhance request_statuses table for A-16 spec
-- Adds missing columns needed for Enterprise master page
-- =====================================================

-- Add name_en as alias for name (keep 'name' for backward compat)
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);
-- UPDATE request_statuses SET name_en = name WHERE name_en IS NULL; -- Removed: 'name' column doesn't exist

-- Add description_en as alias for description
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS description_en TEXT;
-- UPDATE request_statuses SET description_en = description WHERE description_en IS NULL; -- Removed: 'description' column doesn't exist

-- Badge appearance
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS bg_color VARCHAR(20);

-- Workflow behavior
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS applies_to VARCHAR(100) DEFAULT 'all';

-- Rename allows_edit/allows_delete to match spec (keep originals for compat)
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS is_editable BOOLEAN;
-- UPDATE request_statuses SET is_editable = allows_edit WHERE is_editable IS NULL; -- Removed: may not exist

ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN;
-- UPDATE request_statuses SET is_deletable = allows_delete WHERE is_deletable IS NULL; -- Removed: may not exist

-- Status field (active/inactive), soft delete, audit
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE request_statuses ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Set defaults for new columns on existing rows
UPDATE request_statuses SET bg_color = CASE
  WHEN color = 'gray'   THEN '#F3F4F6'
  WHEN color = 'yellow' THEN '#FEF9C3'
  WHEN color = 'green'  THEN '#DCFCE7'
  WHEN color = 'red'    THEN '#FEE2E2'
  WHEN color = 'blue'   THEN '#DBEAFE'
  WHEN color = 'slate'  THEN '#F1F5F9'
  ELSE '#F3F4F6'
END WHERE bg_color IS NULL;

-- Set workflow flags on existing seeds
UPDATE request_statuses SET is_final = true WHERE code IN ('EXECUTED', 'CANCELLED');
UPDATE request_statuses SET requires_approval = true WHERE code IN ('SUBMITTED');
UPDATE request_statuses SET category = stage WHERE category = 'general' AND stage IS NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_request_statuses_deleted_at ON request_statuses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_request_statuses_status ON request_statuses(status);
CREATE INDEX IF NOT EXISTS idx_request_statuses_category ON request_statuses(category);

-- =====================================================
-- Permissions for master:request_statuses
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description, module, is_active)
VALUES
  ('master:request_statuses:view',   'master:request_statuses', 'view',   'View request statuses',   'master', true),
  ('master:request_statuses:create', 'master:request_statuses', 'create', 'Create request statuses', 'master', true),
  ('master:request_statuses:edit',   'master:request_statuses', 'edit',   'Edit request statuses',   'master', true),
  ('master:request_statuses:delete', 'master:request_statuses', 'delete', 'Delete request statuses', 'master', true),
  ('master:request_statuses:export', 'master:request_statuses', 'export', 'Export request statuses', 'master', true)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin/manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('admin','manager')
   AND p.permission_code LIKE 'master:request_statuses:%'
ON CONFLICT DO NOTHING;
