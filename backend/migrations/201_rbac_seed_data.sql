-- Migration 201: RBAC Seed Data (Compatibility)
-- Phase 3A - Day 3 (adapted): Ensure core RBAC role exists and is correctly mapped.
--
-- IMPORTANT:
-- This codebase already uses `resource:action` permission codes and an existing
-- `roles` table keyed by `roles.name`. We intentionally avoid destructive TRUNCATE
-- operations here.

BEGIN;

-- Defensive: ensure columns added by migration 200 exist
ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_override_policy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;

-- Ensure super_admin role exists
INSERT INTO roles (name, display_name, description, is_system, can_override_policy, is_locked, hierarchy_level)
VALUES ('super_admin', 'Super Administrator', 'Full system access', true, true, true, 5)
ON CONFLICT (name) DO UPDATE
SET
  display_name = COALESCE(roles.display_name, EXCLUDED.display_name),
  description = COALESCE(roles.description, EXCLUDED.description),
  is_system = roles.is_system OR EXCLUDED.is_system,
  can_override_policy = roles.can_override_policy OR EXCLUDED.can_override_policy,
  is_locked = roles.is_locked OR EXCLUDED.is_locked,
  hierarchy_level = GREATEST(COALESCE(roles.hierarchy_level, 0), EXCLUDED.hierarchy_level);

-- Ensure super_admin has all permissions via role_permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure at least one admin user has super_admin role
DO $$
DECLARE
  v_role_id INTEGER;
  v_user_id INTEGER;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'super_admin';
  IF v_role_id IS NULL THEN
    RETURN;
  END IF;

  -- Prefer the seeded super admin email, else fallback to the first user
  SELECT id INTO v_user_id FROM users WHERE email = 'ali@alhajco.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users ORDER BY id LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
