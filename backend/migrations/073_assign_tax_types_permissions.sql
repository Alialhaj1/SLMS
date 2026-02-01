-- Migration 073: Assign Tax Types permissions to default roles
-- Date: 2026-01-03
-- Purpose:
--  - Grant tax:types:* permissions to Admin by default
--  - Grant tax:types:view/create/edit to Accountant by default
--  - Grant tax:types:view to Viewer by default
--  - Keep parity for super_admin role (even though backend bypasses checks)

BEGIN;

WITH perms AS (
  SELECT id, permission_code
  FROM permissions
  WHERE permission_code IN (
    'tax:types:view',
    'tax:types:create',
    'tax:types:edit',
    'tax:types:delete'
  )
), grants AS (
  SELECT r.id AS role_id, p.id AS permission_id
  FROM roles r
  JOIN perms p ON (
    (LOWER(r.name) IN ('admin', 'super_admin'))
    OR (LOWER(r.name) = 'accountant' AND p.permission_code IN ('tax:types:view', 'tax:types:create', 'tax:types:edit'))
    OR (LOWER(r.name) = 'viewer' AND p.permission_code IN ('tax:types:view'))
  )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT g.role_id, g.permission_id
FROM grants g
WHERE NOT EXISTS (
  SELECT 1
  FROM role_permissions rp
  WHERE rp.role_id = g.role_id AND rp.permission_id = g.permission_id
);

COMMIT;
