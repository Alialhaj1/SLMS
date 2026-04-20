-- ============================================================================
-- Migration 409: Branch Management Enhancement — §8 نظام الفروع
-- ============================================================================
-- Adds missing §8.1 columns, is_main uniqueness constraint,
-- user_branches junction table (§8.2), and branch permissions.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Add Missing Columns to branches (§8.1 gaps)
-- ═══════════════════════════════════════════════════════════════════════════

-- address_type_id — FK to address_types (مقر/مستودع...)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address_type_id INTEGER REFERENCES address_types(id);

-- Split the old `address TEXT` into two explicit lines
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(500);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(500);

-- Working hours as structured JSON
-- e.g. {"sunday":{"open":"08:00","close":"17:00"},"monday":{...},...}
ALTER TABLE branches ADD COLUMN IF NOT EXISTS working_hours JSONB;

-- is_main — §8.1 says "هل هو الفرع الرئيسي؟"
-- Maps to existing `is_headquarters`, kept as a separate field for §8 compliance
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Data Migration — sync existing data to new columns
-- ═══════════════════════════════════════════════════════════════════════════

-- Copy address → address_line_1 for rows that haven't been migrated
UPDATE branches
SET address_line_1 = address
WHERE address IS NOT NULL AND address_line_1 IS NULL;

-- Sync is_main from is_headquarters
UPDATE branches
SET is_main = is_headquarters
WHERE is_headquarters = TRUE AND is_main = FALSE;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Constraints (§8.2 rules)
-- ═══════════════════════════════════════════════════════════════════════════

-- §8.2 Rule 1: "كل عميل يملك فرعاً رئيسياً واحداً على الأقل (is_main = true)"
-- Enforce: at most ONE is_main per company (partial unique index)
-- The "at least one" guarantee is enforced in application code (on delete).
DROP INDEX IF EXISTS idx_branches_one_main_per_company;
CREATE UNIQUE INDEX idx_branches_one_main_per_company
  ON branches(company_id) WHERE is_main = TRUE AND deleted_at IS NULL;

-- Also enforce for is_headquarters (synced)
DROP INDEX IF EXISTS idx_branches_one_hq_per_company;
CREATE UNIQUE INDEX idx_branches_one_hq_per_company
  ON branches(company_id) WHERE is_headquarters = TRUE AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: user_branches Junction Table (§8.2 Rule 5)
-- ═══════════════════════════════════════════════════════════════════════════
-- "كل مستخدم يمكن ربطه بفرع واحد أو أكثر (home_branch)"

CREATE TABLE IF NOT EXISTS user_branches (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id     INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_home_branch BOOLEAN DEFAULT FALSE,
  assigned_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- Each user can have at most one home branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_branches_one_home
  ON user_branches(user_id) WHERE is_home_branch = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: Trigger to keep is_main and is_headquarters in sync
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_branch_main_hq()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Sync: if is_main changes, update is_headquarters to match, and vice versa
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.is_main IS DISTINCT FROM OLD.is_main THEN
      NEW.is_headquarters := NEW.is_main;
    ELSIF NEW.is_headquarters IS DISTINCT FROM OLD.is_headquarters THEN
      NEW.is_main := NEW.is_headquarters;
    END IF;
    -- On INSERT, ensure they match
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_main = TRUE THEN
        NEW.is_headquarters := TRUE;
      ELSIF NEW.is_headquarters = TRUE THEN
        NEW.is_main := TRUE;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_branch_main_hq ON branches;
CREATE TRIGGER trg_sync_branch_main_hq
  BEFORE INSERT OR UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION sync_branch_main_hq();


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: Permissions
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure 'branches' module exists to satisfy FK on permissions.module_code
INSERT INTO modules (module_code, module_name, name_ar, description, is_active, is_core, category, sort_order)
VALUES ('branches', 'Branch Management', 'إدارة الفروع', 'Branch and location management', true, true, 'system', 3)
ON CONFLICT (module_code) DO NOTHING;

-- Branch user assignment permissions
INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  ('branches:assign_users',  'branches', 'manage',  'Assign/unassign users to branches',  'branches', 'shared'),
  ('branches:view_users',    'branches', 'view_all','View branch user assignments',        'branches', 'shared')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin-level roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.hierarchy_level <= 3 AND r.deleted_at IS NULL
  AND p.permission_code IN ('branches:assign_users', 'branches:view_users')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- End of Migration 409
-- ============================================================================
