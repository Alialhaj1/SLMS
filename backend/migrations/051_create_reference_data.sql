-- 051_create_reference_data.sql
-- Generic reference data table for configurable master data lists

BEGIN;

CREATE TABLE IF NOT EXISTS reference_data (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NULL REFERENCES companies(id),
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT NULL,
  description_ar TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NULL REFERENCES users(id),
  updated_by INTEGER NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_reference_data_type ON reference_data(type);
CREATE INDEX IF NOT EXISTS idx_reference_data_company ON reference_data(company_id);
CREATE INDEX IF NOT EXISTS idx_reference_data_deleted_at ON reference_data(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reference_data_active ON reference_data(is_active);

-- Enforce uniqueness of (type, code) per company for non-deleted rows.
-- Note: partial unique indexes are supported in PostgreSQL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_data_type_code_company_active
  ON reference_data(type, code, COALESCE(company_id, 0))
  WHERE deleted_at IS NULL;

-- Permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('master:reference_data:view',   'reference_data', 'view',   'View reference data (generic master lists)'),
  ('master:reference_data:create', 'reference_data', 'create', 'Create reference data entries'),
  ('master:reference_data:edit',   'reference_data', 'edit',   'Edit reference data entries'),
  ('master:reference_data:delete', 'reference_data', 'delete', 'Delete reference data entries')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin role by default (super_admin bypasses checks, but keeping parity)
WITH perms AS (
  SELECT id FROM permissions
  WHERE permission_code IN (
    'master:reference_data:view',
    'master:reference_data:create',
    'master:reference_data:edit',
    'master:reference_data:delete'
  )
), roles_to_grant AS (
  SELECT id FROM roles WHERE LOWER(name) IN ('admin', 'super_admin')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles_to_grant r
CROSS JOIN perms p
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
