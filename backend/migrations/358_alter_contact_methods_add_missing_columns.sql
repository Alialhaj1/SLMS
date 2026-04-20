-- =====================================================
-- 358 — Enhance contact_methods table for A-14 spec
-- Adds missing columns needed for Enterprise master page
-- =====================================================

ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS input_type VARCHAR(30) DEFAULT 'text';
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS input_format VARCHAR(50);
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS icon_color VARCHAR(20);
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS is_notification_channel BOOLEAN DEFAULT false;
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE contact_methods ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Set input_type for existing records
UPDATE contact_methods SET input_type = 'email'  WHERE code = 'email'   AND input_type = 'text';
UPDATE contact_methods SET input_type = 'tel'    WHERE code IN ('phone','mobile','fax','whatsapp') AND input_type = 'text';
UPDATE contact_methods SET input_type = 'url'    WHERE code IN ('website','linkedin','twitter')    AND input_type = 'text';

-- Set icon_color for existing records
UPDATE contact_methods SET icon_color = '#EA4335' WHERE code = 'email'    AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#16A34A' WHERE code = 'phone'    AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#2563EB' WHERE code = 'mobile'   AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#6B7280' WHERE code = 'fax'      AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#3B82F6' WHERE code = 'website'  AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#25D366' WHERE code = 'whatsapp' AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#0A66C2' WHERE code = 'linkedin' AND icon_color IS NULL;
UPDATE contact_methods SET icon_color = '#1DA1F2' WHERE code = 'twitter'  AND icon_color IS NULL;

-- Set notification channels
UPDATE contact_methods SET is_notification_channel = true  WHERE code IN ('email','phone','mobile','whatsapp');
UPDATE contact_methods SET is_primary = true               WHERE code IN ('email','phone','mobile');
UPDATE contact_methods SET is_system = true                WHERE code IN ('email','phone','mobile');

-- Icon for seed records
UPDATE contact_methods SET icon = '📧' WHERE code = 'email'    AND icon IS NULL;
UPDATE contact_methods SET icon = '📞' WHERE code = 'phone'    AND icon IS NULL;
UPDATE contact_methods SET icon = '📱' WHERE code = 'mobile'   AND icon IS NULL;
UPDATE contact_methods SET icon = '📠' WHERE code = 'fax'      AND icon IS NULL;
UPDATE contact_methods SET icon = '🌐' WHERE code = 'website'  AND icon IS NULL;
UPDATE contact_methods SET icon = '💬' WHERE code = 'whatsapp' AND icon IS NULL;
UPDATE contact_methods SET icon = '💼' WHERE code = 'linkedin' AND icon IS NULL;
UPDATE contact_methods SET icon = '🐦' WHERE code = 'twitter'  AND icon IS NULL;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_contact_methods_status ON contact_methods(status);
CREATE INDEX IF NOT EXISTS idx_contact_methods_input_type ON contact_methods(input_type);

-- Permissions for master:contact_methods
INSERT INTO permissions (permission_code, resource, action, description, module, is_active)
VALUES
  ('master:contact_methods:view',   'master:contact_methods', 'view',   'View contact methods',   'master', true),
  ('master:contact_methods:create', 'master:contact_methods', 'create', 'Create contact methods', 'master', true),
  ('master:contact_methods:edit',   'master:contact_methods', 'edit',   'Edit contact methods',   'master', true),
  ('master:contact_methods:delete', 'master:contact_methods', 'delete', 'Delete contact methods', 'master', true),
  ('master:contact_methods:export', 'master:contact_methods', 'export', 'Export contact methods', 'master', true)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin/manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('admin','manager')
   AND p.permission_code LIKE 'master:contact_methods:%'
ON CONFLICT DO NOTHING;
