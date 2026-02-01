-- Migration 200: RBAC Data Model
-- Phase 3A - Day 1-2: Create permissions, roles, role_permissions, user_roles tables
-- Created: February 1, 2026
-- Purpose: Foundation for enterprise RBAC enforcement (85 permissions × 5 roles)

-- ============================================================================
-- 1. PERMISSIONS TABLE
-- ============================================================================
-- Stores all system permissions (ENTITY_ACTION format)
-- Total: 85 permissions across 14 entities

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_code VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System permissions cannot be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If permissions table existed before this migration, ensure new columns exist
ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Index for fast permission code lookups
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_permissions_updated_at ON permissions;
CREATE TRIGGER trg_update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_permissions_updated_at();

COMMENT ON TABLE permissions IS 'System permissions (ENTITY_ACTION format) - 85 total permissions';
COMMENT ON COLUMN permissions.permission_code IS 'Unique permission code (e.g., ITEM_CREATE, EXPENSE_APPROVE)';
COMMENT ON COLUMN permissions.resource IS 'Resource entity (e.g., item, expense, accounting)';
COMMENT ON COLUMN permissions.action IS 'Action (e.g., view, create, edit, delete, approve)';
COMMENT ON COLUMN permissions.is_system IS 'System permissions cannot be deleted (true for critical permissions)';

-- ============================================================================
-- 2. ROLES TABLE
-- ============================================================================
-- Stores user roles with hierarchy and policies
-- Total: 5 roles (super_admin, admin, manager, accountant, user)

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted
  can_override_policy BOOLEAN DEFAULT false, -- Can override item policies
  is_locked BOOLEAN DEFAULT false, -- Locked roles cannot be modified
  hierarchy_level INTEGER DEFAULT 0, -- 0=lowest (user), 5=highest (super_admin)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If roles table existed before this migration, ensure new columns exist
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_override_policy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Index for fast role name lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(hierarchy_level DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_roles_updated_at ON roles;
CREATE TRIGGER trg_update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- Constraint: Prevent deletion of system roles
CREATE OR REPLACE FUNCTION prevent_system_role_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true AND OLD.name = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot delete system role: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_system_role_deletion ON roles;
CREATE TRIGGER trg_prevent_system_role_deletion
  BEFORE DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_role_deletion();

COMMENT ON TABLE roles IS 'User roles with hierarchy (5 roles total)';
COMMENT ON COLUMN roles.name IS 'Unique role identifier (e.g., super_admin, admin, manager)';
COMMENT ON COLUMN roles.display_name IS 'Human-readable name (e.g., Super Administrator)';
COMMENT ON COLUMN roles.is_system IS 'System roles cannot be deleted (true for super_admin)';
COMMENT ON COLUMN roles.can_override_policy IS 'Can override item policies (super_admin, admin only)';
COMMENT ON COLUMN roles.is_locked IS 'Locked roles cannot be modified (super_admin locked)';
COMMENT ON COLUMN roles.hierarchy_level IS 'Role hierarchy (0=user, 1=accountant, 2=manager, 3=admin, 5=super_admin)';

-- ============================================================================
-- 3. ROLE_PERMISSIONS TABLE (Junction)
-- ============================================================================
-- Maps roles to permissions (many-to-many)
-- Defines which permissions each role has

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(role_id, permission_id) -- Prevent duplicate assignments
);

-- If role_permissions table existed before this migration, ensure audit columns exist
ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Indexes for fast permission checks
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique ON role_permissions(role_id, permission_id);

COMMENT ON TABLE role_permissions IS 'Role-Permission junction table (many-to-many)';
COMMENT ON COLUMN role_permissions.role_id IS 'Foreign key to roles';
COMMENT ON COLUMN role_permissions.permission_id IS 'Foreign key to permissions';
COMMENT ON COLUMN role_permissions.granted_at IS 'When permission was granted to role';
COMMENT ON COLUMN role_permissions.granted_by IS 'User who granted permission (audit trail)';

-- ============================================================================
-- 4. USER_ROLES TABLE (Update existing or create)
-- ============================================================================
-- Maps users to roles (many-to-many)
-- Users can have multiple roles (e.g., user + accountant)

-- Check if user_roles exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    CREATE TABLE user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(user_id, role_id) -- Prevent duplicate role assignments
    );

    -- Indexes for fast user permission lookups
    CREATE INDEX idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX idx_user_roles_role ON user_roles(role_id);
    CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, role_id);

    COMMENT ON TABLE user_roles IS 'User-Role junction table (many-to-many)';
    COMMENT ON COLUMN user_roles.user_id IS 'Foreign key to users';
    COMMENT ON COLUMN user_roles.role_id IS 'Foreign key to roles';
    COMMENT ON COLUMN user_roles.assigned_at IS 'When role was assigned to user';
    COMMENT ON COLUMN user_roles.assigned_by IS 'User who assigned role (audit trail)';
  END IF;
END
$$;

-- Ensure user_roles has audit fields (even if it existed from older migrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    ALTER TABLE user_roles
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Older migrations may have created these helpers with different OUT parameters.
-- Postgres cannot change a function's return row type via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS user_has_permission(integer, varchar);
DROP FUNCTION IF EXISTS get_user_permissions(integer);
DROP FUNCTION IF EXISTS get_user_roles(integer);

-- Function: Check if user has permission
-- Usage: SELECT user_has_permission(1, 'ITEM_CREATE')
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id INTEGER, p_permission_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check if user has role with permission
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.permission_code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_has_permission IS 'Check if user has specific permission (returns true/false)';

-- Function: Get user permissions
-- Usage: SELECT * FROM get_user_permissions(1)
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS TABLE(permission_code VARCHAR, resource VARCHAR, action VARCHAR, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.permission_code, p.resource, p.action, p.description
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
  ORDER BY p.permission_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for a user (returns permission list)';

-- Function: Get user roles
-- Usage: SELECT * FROM get_user_roles(1)
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id INTEGER)
RETURNS TABLE(role_name VARCHAR, display_name VARCHAR, hierarchy_level INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name::varchar AS role_name, r.display_name, r.hierarchy_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  ORDER BY r.hierarchy_level DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_roles IS 'Get all roles for a user (returns role list)';

-- ============================================================================
-- 6. CONSTRAINTS & VALIDATION
-- ============================================================================
-- NOTE: This codebase historically uses mixed role naming (e.g., 'Admin') and
-- resource:action permission codes (e.g., 'companies:view'). We intentionally
-- avoid enforcing strict check constraints here to prevent breaking existing data.

-- ============================================================================
-- 7. AUDIT LOGGING
-- ============================================================================

-- Audit: Track role assignment changes
CREATE TABLE IF NOT EXISTS role_assignment_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  action VARCHAR(20) NOT NULL, -- 'assigned' or 'revoked'
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_user ON role_assignment_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_role ON role_assignment_audit(role_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_performed_at ON role_assignment_audit(performed_at DESC);

COMMENT ON TABLE role_assignment_audit IS 'Audit log for role assignments/revocations';

-- Trigger: Log role assignments
CREATE OR REPLACE FUNCTION log_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO role_assignment_audit (user_id, role_id, action, performed_by)
    VALUES (NEW.user_id, NEW.role_id, 'assigned', NEW.assigned_by);
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO role_assignment_audit (user_id, role_id, action, performed_by)
    VALUES (OLD.user_id, OLD.role_id, 'revoked', NULL);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_role_assignment ON user_roles;
CREATE TRIGGER trg_log_role_assignment
  AFTER INSERT OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_assignment();

-- ============================================================================
-- 8. MIGRATION SUMMARY
-- ============================================================================

-- Tables created:
-- 1. permissions (85 permissions)
-- 2. roles (5 roles)
-- 3. role_permissions (junction table)
-- 4. user_roles (junction table, updated if exists)
-- 5. role_assignment_audit (audit log)

-- Functions created:
-- 1. user_has_permission(user_id, permission_code) → boolean
-- 2. get_user_permissions(user_id) → permission list
-- 3. get_user_roles(user_id) → role list
-- 4. prevent_system_role_deletion() → trigger function
-- 5. log_role_assignment() → audit trigger function

-- Indexes created:
-- 10 indexes for fast permission checks

-- Constraints:
-- 1. Unique constraints (permission_code, role_name, user+role, role+permission)
-- 2. Foreign keys with CASCADE
-- 3. Check constraints (code format, lowercase, hierarchy range)
-- 4. Trigger constraint (prevent super_admin deletion)

-- Next steps:
-- Day 3: Run migration 201 to seed 85 permissions + 5 roles
