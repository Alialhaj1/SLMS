-- ============================================================================
-- Migration 421: Branch-Level Access Control
-- ============================================================================
-- Implements row-level branch security for multi-tenant ERP:
--   • tenant_admin → full access to ALL branches (bypass)
--   • Regular users → restricted to assigned branches via user_branches
--   • Documents must link to a branch when company has multiple branches
--   • Adds branch_id to financial document tables missing it
--   • DB function for fast branch access resolution
-- ============================================================================

BEGIN;

-- ─── 1. Add access_level to user_branches ──────────────────────────────────
-- Levels: 'full' (read+write+approve), 'write' (read+write), 'read' (view only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_branches' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE user_branches ADD COLUMN access_level VARCHAR(10) NOT NULL DEFAULT 'full';
    ALTER TABLE user_branches ADD CONSTRAINT chk_user_branches_access_level 
      CHECK (access_level IN ('full', 'write', 'read'));
    COMMENT ON COLUMN user_branches.access_level IS 'Branch access level: full=read+write+approve, write=read+write, read=view-only';
  END IF;
END $$;

-- ─── 2. Add is_active to user_branches ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_branches' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_branches ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- ─── 3. Add branch_id to document tables that need it ──────────────────────

-- payment_vouchers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_vouchers' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE payment_vouchers ADD COLUMN branch_id INTEGER REFERENCES branches(id);
    CREATE INDEX idx_payment_vouchers_branch ON payment_vouchers(branch_id) WHERE branch_id IS NOT NULL;
  END IF;
END $$;

-- purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN branch_id INTEGER REFERENCES branches(id);
    CREATE INDEX idx_purchase_orders_branch ON purchase_orders(branch_id) WHERE branch_id IS NOT NULL;
  END IF;
END $$;

-- purchase_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_invoices' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE purchase_invoices ADD COLUMN branch_id INTEGER REFERENCES branches(id);
    CREATE INDEX idx_purchase_invoices_branch ON purchase_invoices(branch_id) WHERE branch_id IS NOT NULL;
  END IF;
END $$;

-- purchase_returns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_returns' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE purchase_returns ADD COLUMN branch_id INTEGER REFERENCES branches(id);
    CREATE INDEX idx_purchase_returns_branch ON purchase_returns(branch_id) WHERE branch_id IS NOT NULL;
  END IF;
END $$;

-- ─── 4. DB function: get_user_accessible_branch_ids ────────────────────────
-- Returns branch IDs a user can access. NULL = tenant_admin (ALL branches).
CREATE OR REPLACE FUNCTION get_user_accessible_branch_ids(
  p_user_id INTEGER,
  p_tenant_id INTEGER,
  p_min_access VARCHAR DEFAULT 'read'
)
RETURNS TABLE(branch_id INTEGER, access_level VARCHAR) AS $$
DECLARE
  v_is_tenant_admin BOOLEAN;
BEGIN
  -- Check if user is tenant_admin (full bypass)
  SELECT u.is_tenant_admin INTO v_is_tenant_admin
  FROM users u WHERE u.id = p_user_id AND u.tenant_id = p_tenant_id AND u.deleted_at IS NULL;

  IF v_is_tenant_admin = TRUE THEN
    -- Return ALL active branches for the tenant
    RETURN QUERY
      SELECT b.id, 'full'::VARCHAR
      FROM branches b
      JOIN companies c ON b.company_id = c.id
      WHERE c.tenant_id = p_tenant_id
        AND b.deleted_at IS NULL
        AND b.is_active = true;
  ELSE
    -- Return only assigned branches with sufficient access level
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
            WHEN 'read' THEN ub.access_level IN ('read', 'write', 'full')
            WHEN 'write' THEN ub.access_level IN ('write', 'full')
            WHEN 'full' THEN ub.access_level = 'full'
          END
        );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 5. DB function: check_user_branch_access ──────────────────────────────
-- Quick boolean check: can user X access branch Y?
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
    -- Verify branch belongs to same tenant
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
          WHEN 'read' THEN ub.access_level IN ('read', 'write', 'full')
          WHEN 'write' THEN ub.access_level IN ('write', 'full')
          WHEN 'full' THEN ub.access_level = 'full'
        END
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 6. Add branch access permissions ──────────────────────────────────────
INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, module, module_code, domain, is_system, sort_order)
VALUES
  ('branches:manage_access', 'branches', 'manage_access', 'Manage Branch Access', 'إدارة صلاحيات الفروع', 'branches', 'branches', 'tenant', true, 920)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to all tenant_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('tenant_admin', 'Tenant Admin', 'Admin')
  AND p.permission_code = 'branches:manage_access'
ON CONFLICT DO NOTHING;

-- ─── 7. Auto-assign tenant_admin users to all branches ─────────────────────
-- Seed: ensure tenant admins have explicit branch assignments (for consistency)
INSERT INTO user_branches (user_id, branch_id, is_home_branch, access_level, assigned_by, assigned_at, created_at)
SELECT u.id, b.id, (b.is_default OR b.is_main), 'full', u.id, NOW(), NOW()
FROM users u
JOIN companies c ON c.tenant_id = u.tenant_id
JOIN branches b ON b.company_id = c.id AND b.deleted_at IS NULL AND b.is_active = true
WHERE u.is_tenant_admin = true
  AND u.deleted_at IS NULL
ON CONFLICT (user_id, branch_id) DO UPDATE SET access_level = 'full', is_active = true;

-- ─── 8. Replicate to tenant schemas ────────────────────────────────────────
DO $$
DECLARE
  sch TEXT;
BEGIN
  FOR sch IN
    SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- access_level column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = sch AND table_name = 'user_branches' AND column_name = 'access_level'
    ) THEN
      EXECUTE format('ALTER TABLE %I.user_branches ADD COLUMN access_level VARCHAR(10) NOT NULL DEFAULT ''full''', sch);
      EXECUTE format('ALTER TABLE %I.user_branches ADD CONSTRAINT chk_user_branches_access_level CHECK (access_level IN (''full'', ''write'', ''read''))', sch);
    END IF;

    -- is_active column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = sch AND table_name = 'user_branches' AND column_name = 'is_active'
    ) THEN
      EXECUTE format('ALTER TABLE %I.user_branches ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true', sch);
    END IF;
  END LOOP;
END $$;

-- Record migration
INSERT INTO migrations (name, run_at)
VALUES ('421_branch_access_control', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
