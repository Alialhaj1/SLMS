-- ============================================================================
-- Migration 422: Granular Entity-Level Access Control
-- ============================================================================
-- Implements fine-grained CRUD+Approve+Reject+Endorse permissions per-entity
-- per-user for branches, warehouses, and cost centers.
--
-- Workflow support:
--   Accountant       → can_create, can_read
--   Reviewer         → can_read, can_approve, can_reject
--   Financial Manager→ can_read, can_endorse (final approval)
--
-- Replaces coarse-grained access_level (full/write/read) with 7 boolean
-- permission flags on user_branches, and creates parallel tables for
-- warehouses and cost centers.
-- ============================================================================

BEGIN;

-- ─── 1. Add granular permission columns to user_branches ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_branches' AND column_name = 'can_read'
  ) THEN
    ALTER TABLE user_branches ADD COLUMN can_read    BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_create  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_update  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_delete  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_approve BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_reject  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE user_branches ADD COLUMN can_endorse BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Migrate existing access_level data into boolean flags:
--   'full'  → all permissions
--   'write' → read + create + update + delete
--   'read'  → read only
UPDATE user_branches SET
  can_read    = true,
  can_create  = CASE WHEN access_level IN ('write', 'full') THEN true ELSE false END,
  can_update  = CASE WHEN access_level IN ('write', 'full') THEN true ELSE false END,
  can_delete  = CASE WHEN access_level IN ('write', 'full') THEN true ELSE false END,
  can_approve = CASE WHEN access_level = 'full' THEN true ELSE false END,
  can_reject  = CASE WHEN access_level = 'full' THEN true ELSE false END,
  can_endorse = CASE WHEN access_level = 'full' THEN true ELSE false END
WHERE can_read = false;  -- Only update rows that haven't been migrated

-- ─── 2. Create user_warehouses table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_warehouses (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id  INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  can_read      BOOLEAN NOT NULL DEFAULT false,
  can_create    BOOLEAN NOT NULL DEFAULT false,
  can_update    BOOLEAN NOT NULL DEFAULT false,
  can_delete    BOOLEAN NOT NULL DEFAULT false,
  can_approve   BOOLEAN NOT NULL DEFAULT false,
  can_reject    BOOLEAN NOT NULL DEFAULT false,
  can_endorse   BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  assigned_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_user_warehouses_user ON user_warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warehouses_warehouse ON user_warehouses(warehouse_id);

-- ─── 3. Create user_cost_centers table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_cost_centers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cost_center_id  INTEGER NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  can_read        BOOLEAN NOT NULL DEFAULT false,
  can_create      BOOLEAN NOT NULL DEFAULT false,
  can_update      BOOLEAN NOT NULL DEFAULT false,
  can_delete      BOOLEAN NOT NULL DEFAULT false,
  can_approve     BOOLEAN NOT NULL DEFAULT false,
  can_reject      BOOLEAN NOT NULL DEFAULT false,
  can_endorse     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  assigned_by     INTEGER REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cost_center_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cost_centers_user ON user_cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_centers_cc ON user_cost_centers(cost_center_id);

-- ─── 4. Updated DB function: get_user_accessible_branch_ids ────────────────
-- Now returns granular permissions instead of simple access_level

CREATE OR REPLACE FUNCTION get_user_accessible_branch_ids(
  p_user_id INTEGER,
  p_tenant_id INTEGER,
  p_min_access VARCHAR DEFAULT 'read'
)
RETURNS TABLE(branch_id INTEGER, access_level VARCHAR) AS $$
DECLARE
  v_is_tenant_admin BOOLEAN;
BEGIN
  SELECT u.is_tenant_admin INTO v_is_tenant_admin
  FROM users u WHERE u.id = p_user_id AND u.tenant_id = p_tenant_id AND u.deleted_at IS NULL;

  IF v_is_tenant_admin = TRUE THEN
    RETURN QUERY
      SELECT b.id, 'full'::VARCHAR
      FROM branches b
      JOIN companies c ON b.company_id = c.id
      WHERE c.tenant_id = p_tenant_id
        AND b.deleted_at IS NULL
        AND b.is_active = true;
  ELSE
    RETURN QUERY
      SELECT ub.branch_id, ub.access_level
      FROM user_branches ub
      JOIN branches b ON ub.branch_id = b.id
      JOIN companies c ON b.company_id = c.id
      WHERE ub.user_id = p_user_id
        AND ub.is_active = true
        AND b.deleted_at IS NULL
        AND b.is_active = true
        AND c.tenant_id = p_tenant_id
        AND (
          CASE p_min_access
            WHEN 'read'    THEN ub.can_read = true
            WHEN 'create'  THEN ub.can_create = true
            WHEN 'write'   THEN ub.can_create = true OR ub.can_update = true
            WHEN 'approve' THEN ub.can_approve = true
            WHEN 'reject'  THEN ub.can_reject = true
            WHEN 'endorse' THEN ub.can_endorse = true
            WHEN 'full'    THEN ub.can_read = true AND ub.can_create = true AND ub.can_approve = true AND ub.can_endorse = true
            ELSE ub.can_read = true
          END
        );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 5. Updated DB function: check_user_branch_access ──────────────────────

CREATE OR REPLACE FUNCTION check_user_branch_access(
  p_user_id INTEGER,
  p_branch_id INTEGER,
  p_min_access VARCHAR DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_tenant_admin BOOLEAN;
  v_tenant_id INTEGER;
BEGIN
  SELECT u.is_tenant_admin, u.tenant_id INTO v_is_tenant_admin, v_tenant_id
  FROM users u WHERE u.id = p_user_id AND u.deleted_at IS NULL;

  IF v_is_tenant_admin = TRUE THEN
    RETURN EXISTS (
      SELECT 1 FROM branches b
      JOIN companies c ON b.company_id = c.id
      WHERE b.id = p_branch_id AND c.tenant_id = v_tenant_id AND b.deleted_at IS NULL
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_branches ub
    WHERE ub.user_id = p_user_id
      AND ub.branch_id = p_branch_id
      AND ub.is_active = true
      AND (
        CASE p_min_access
          WHEN 'read'    THEN ub.can_read = true
          WHEN 'create'  THEN ub.can_create = true
          WHEN 'write'   THEN ub.can_create = true OR ub.can_update = true
          WHEN 'approve' THEN ub.can_approve = true
          WHEN 'reject'  THEN ub.can_reject = true
          WHEN 'endorse' THEN ub.can_endorse = true
          WHEN 'full'    THEN ub.can_read = true AND ub.can_create = true AND ub.can_approve = true AND ub.can_endorse = true
          ELSE ub.can_read = true
        END
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 6. New DB function: get_user_entity_permissions ───────────────────────
-- Returns full permission details for a user-entity pair

CREATE OR REPLACE FUNCTION get_user_entity_permissions(
  p_user_id INTEGER,
  p_entity_type VARCHAR,
  p_entity_id INTEGER
)
RETURNS TABLE(
  can_read BOOLEAN, can_create BOOLEAN, can_update BOOLEAN,
  can_delete BOOLEAN, can_approve BOOLEAN, can_reject BOOLEAN, can_endorse BOOLEAN
) AS $$
BEGIN
  IF p_entity_type = 'branch' THEN
    RETURN QUERY
      SELECT ub.can_read, ub.can_create, ub.can_update, ub.can_delete,
             ub.can_approve, ub.can_reject, ub.can_endorse
      FROM user_branches ub
      WHERE ub.user_id = p_user_id AND ub.branch_id = p_entity_id AND ub.is_active = true;
  ELSIF p_entity_type = 'warehouse' THEN
    RETURN QUERY
      SELECT uw.can_read, uw.can_create, uw.can_update, uw.can_delete,
             uw.can_approve, uw.can_reject, uw.can_endorse
      FROM user_warehouses uw
      WHERE uw.user_id = p_user_id AND uw.warehouse_id = p_entity_id AND uw.is_active = true;
  ELSIF p_entity_type = 'cost_center' THEN
    RETURN QUERY
      SELECT ucc.can_read, ucc.can_create, ucc.can_update, ucc.can_delete,
             ucc.can_approve, ucc.can_reject, ucc.can_endorse
      FROM user_cost_centers ucc
      WHERE ucc.user_id = p_user_id AND ucc.cost_center_id = p_entity_id AND ucc.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 7. Permissions for entity access management ──────────────────────────

INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, module, module_code, domain, is_system, sort_order)
VALUES
  ('entity_access:view',   'entity_access', 'view',   'View Entity Access',   'عرض صلاحيات الكيانات',   'core', 'core', 'tenant', true, 930),
  ('entity_access:manage', 'entity_access', 'manage', 'Manage Entity Access', 'إدارة صلاحيات الكيانات', 'core', 'core', 'tenant', true, 931),
  ('warehouses:manage_access', 'warehouses', 'manage_access', 'Manage Warehouse Access', 'إدارة صلاحيات المخازن', 'warehousing', 'warehousing', 'tenant', true, 932),
  ('cost_centers:manage_access', 'cost_centers', 'manage_access', 'Manage Cost Center Access', 'إدارة صلاحيات مراكز التكلفة', 'accounting', 'accounting', 'tenant', true, 933)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin-level roles (hierarchy_level <= 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.hierarchy_level <= 3 AND r.deleted_at IS NULL
  AND p.permission_code IN ('entity_access:view', 'entity_access:manage', 'warehouses:manage_access', 'cost_centers:manage_access')
ON CONFLICT DO NOTHING;

-- ─── 8. Auto-assign tenant_admin users full permissions ────────────────────

-- Ensure tenant admins have full branch permissions
UPDATE user_branches ub
SET can_read = true, can_create = true, can_update = true, can_delete = true,
    can_approve = true, can_reject = true, can_endorse = true,
    access_level = 'full'
FROM users u
WHERE ub.user_id = u.id
  AND u.is_tenant_admin = true
  AND u.deleted_at IS NULL;

-- Record migration
CREATE TABLE IF NOT EXISTS applied_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO applied_migrations (name, applied_at)
VALUES ('422_granular_entity_access_control', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
