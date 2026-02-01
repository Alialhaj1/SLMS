-- =====================================================
-- Migration 141: Add Master Data Reference Permissions
-- Adds permissions for countries, cities, ports access
-- and assigns them to admin/manager/super_admin roles
-- =====================================================

BEGIN;

-- Insert missing permissions for countries
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('master:countries:view', 'countries', 'view', 'View countries list'),
  ('master:cities:view', 'cities', 'view', 'View cities list')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign logistics:ports:view to admin, manager, and super_admin roles
WITH perms AS (
  SELECT id FROM permissions
  WHERE permission_code IN (
    'logistics:ports:view',
    'master:countries:view',
    'master:cities:view'
  )
), roles_to_grant AS (
  SELECT id FROM roles WHERE LOWER(name) IN ('admin', 'manager', 'super_admin')
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
