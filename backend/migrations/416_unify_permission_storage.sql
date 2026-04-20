-- ============================================================================
-- Migration 416: Unify Permission Storage (JSONB → role_permissions)
-- ============================================================================
-- Purpose: Consolidate dual permission storage into single source (role_permissions table)
-- Problem: roles.permissions JSONB + role_permissions table causes sync issues
-- Solution: Merge JSONB perms into role_permissions, then clear JSONB
-- ============================================================================

BEGIN;

-- Step 1: Insert all JSONB permissions into role_permissions table
-- This ensures no permissions are lost during the migration
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN LATERAL jsonb_array_elements_text(r.permissions) AS pcode
JOIN permissions p ON p.permission_code = pcode
WHERE r.deleted_at IS NULL
  AND r.permissions IS NOT NULL 
  AND r.permissions != '[]'::jsonb
  AND jsonb_array_length(r.permissions) > 0
ON CONFLICT DO NOTHING;

-- Step 2: Verify the migration - create a temp table with counts for audit
CREATE TEMP TABLE _perm_migration_audit AS
SELECT r.id as role_id, 
       r.name as role_name,
       jsonb_array_length(COALESCE(r.permissions, '[]'::jsonb)) as jsonb_before,
       COUNT(DISTINCT rp.permission_id) as table_after
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.name, r.permissions;

-- Log the migration audit
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM _perm_migration_audit WHERE jsonb_before > 0 ORDER BY role_name LOOP
    RAISE NOTICE 'Role [%]: JSONB had %, table now has %', rec.role_name, rec.jsonb_before, rec.table_after;
  END LOOP;
END $$;

-- Step 3: Clear the JSONB column now that everything is in role_permissions
UPDATE roles SET permissions = '[]'::jsonb WHERE permissions IS NOT NULL AND permissions != '[]'::jsonb;

-- Step 4: Add a comment to prevent future JSONB usage
COMMENT ON COLUMN roles.permissions IS 'DEPRECATED: Use role_permissions table. Cleared by migration 416.';

-- Clean up
DROP TABLE IF EXISTS _perm_migration_audit;

COMMIT;
