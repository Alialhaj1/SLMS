-- =====================================================
-- 359 — Enhance system_languages table for A-03 spec
-- Adds missing columns + creates 'languages' view/alias
-- =====================================================

-- Add missing columns
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100);
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_system_language BOOLEAN DEFAULT false;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_document_language BOOLEAN DEFAULT false;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE system_languages ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Populate defaults for existing rows
UPDATE system_languages SET name_ar = 'الإنجليزية', is_system_language = true, is_document_language = true, is_protected = true, is_system = true WHERE code = 'en' AND name_ar IS NULL;
UPDATE system_languages SET name_ar = 'العربية',    is_system_language = true, is_document_language = true, is_protected = true, is_system = true WHERE code = 'ar' AND name_ar IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_languages_status ON system_languages(status);

-- Create view so backend can query 'languages' OR 'system_languages'
CREATE OR REPLACE VIEW languages AS SELECT * FROM system_languages;

-- Permissions for master:languages
INSERT INTO permissions (permission_code, resource, action, description, module, is_active)
VALUES
  ('master:languages:view',   'master:languages', 'view',   'View languages',   'master', true),
  ('master:languages:create', 'master:languages', 'create', 'Create languages', 'master', true),
  ('master:languages:edit',   'master:languages', 'edit',   'Edit languages',   'master', true),
  ('master:languages:delete', 'master:languages', 'delete', 'Delete languages', 'master', true),
  ('master:languages:export', 'master:languages', 'export', 'Export languages', 'master', true)
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('admin','manager')
   AND p.permission_code LIKE 'master:languages:%'
ON CONFLICT DO NOTHING;
