-- Migration 419: Clear legacy JSONB permissions from roles table
-- The system now uses role_permissions table exclusively (migrated in 416).
-- Roles 1, 9, 25 still have stale JSONB data that is never read.

-- Clear stale JSONB permissions
UPDATE roles SET permissions = '[]'::jsonb WHERE permissions IS NOT NULL AND permissions != '[]'::jsonb;

-- Add a comment so future devs know this column is deprecated
COMMENT ON COLUMN roles.permissions IS 'DEPRECATED: Legacy JSONB permissions. Use role_permissions table. Cleared by migration 419.';
