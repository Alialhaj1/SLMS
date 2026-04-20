-- =====================================================
-- 360 — Enhance time_zones table for A-04 spec
-- Adds missing columns + creates 'timezones' view
-- =====================================================

ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(10);
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE time_zones ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Populate for existing rows
UPDATE time_zones SET abbreviation = 'AST',  region = 'Asia'     WHERE code = 'Asia/Riyadh'      AND abbreviation IS NULL;
UPDATE time_zones SET abbreviation = 'GST',  region = 'Asia'     WHERE code = 'Asia/Dubai'        AND abbreviation IS NULL;
UPDATE time_zones SET abbreviation = 'GMT',  region = 'Europe'   WHERE code = 'Europe/London'     AND abbreviation IS NULL;
UPDATE time_zones SET abbreviation = 'EST',  region = 'America'  WHERE code = 'America/New_York'  AND abbreviation IS NULL;
UPDATE time_zones SET abbreviation = 'CST',  region = 'Asia'     WHERE code = 'Asia/Shanghai'     AND abbreviation IS NULL;
UPDATE time_zones SET abbreviation = 'JST',  region = 'Asia'     WHERE code = 'Asia/Tokyo'        AND abbreviation IS NULL;

UPDATE time_zones SET is_default = true  WHERE code = 'Asia/Riyadh';
UPDATE time_zones SET is_system = true   WHERE code IN ('Asia/Riyadh','Europe/London','America/New_York');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_zones_status ON time_zones(status);
CREATE INDEX IF NOT EXISTS idx_time_zones_region ON time_zones(region);

-- Create view so backend can query 'timezones'
CREATE OR REPLACE VIEW timezones AS SELECT * FROM time_zones;

-- Permissions for master:timezones
INSERT INTO permissions (permission_code, resource, action, description, module, is_active)
VALUES
  ('master:timezones:view',   'master:timezones', 'view',   'View timezones',   'master', true),
  ('master:timezones:create', 'master:timezones', 'create', 'Create timezones', 'master', true),
  ('master:timezones:edit',   'master:timezones', 'edit',   'Edit timezones',   'master', true),
  ('master:timezones:delete', 'master:timezones', 'delete', 'Delete timezones', 'master', true),
  ('master:timezones:export', 'master:timezones', 'export', 'Export timezones', 'master', true)
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('admin','manager')
   AND p.permission_code LIKE 'master:timezones:%'
ON CONFLICT DO NOTHING;
