-- Migration 010: Enhance roles table with permissions and metadata
-- Add missing columns to roles table for advanced RBAC

-- Add permissions column as JSONB array
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Add company_id for multi-tenant support (nullable for global roles)
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add description column
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add audit columns
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON roles(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN roles.permissions IS 'JSONB array of permission codes (e.g., ["users:view", "users:edit"])';
COMMENT ON COLUMN roles.company_id IS 'Company ID for tenant-specific roles. NULL means global role.';
COMMENT ON COLUMN roles.description IS 'Role description and responsibilities';

-- Update existing roles to have empty permissions array (if not already set)
UPDATE roles 
SET permissions = '[]'::jsonb 
WHERE permissions IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS roles_updated_at_trigger ON roles;
CREATE TRIGGER roles_updated_at_trigger
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_roles_updated_at();
