-- Migration 059: Assign Phase 1 (Step 2) permissions to Admin/Super Admin
-- Date: 2026-01-01
-- Purpose:
--  - Grant new Settings + Financial Year permissions to Admin by default
--  - Keep parity for super_admin role (even though backend bypasses checks)

BEGIN;

WITH perms AS (
  SELECT id
  FROM permissions
  WHERE permission_code IN (
    -- Base Currency
    'settings:currency:view',
    'settings:currency:create',
    'settings:currency:update',
    'settings:currency:delete',

    -- Default Language
    'settings:language:view',
    'settings:language:update',

    -- Financial Years
    'finance:financial_year:view',
    'finance:financial_year:create',
    'finance:financial_year:update',
    'finance:financial_year:close'
  )
), roles_to_grant AS (
  SELECT id
  FROM roles
  WHERE LOWER(name) IN ('admin', 'super_admin')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles_to_grant r
CROSS JOIN perms p
WHERE NOT EXISTS (
  SELECT 1
  FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
