-- ============================================================================
-- Migration 410: Users & Roles Enhancement — §9 المستخدمون والأدوار
-- ============================================================================
-- Adds missing §9.1 user columns, §9.2 role columns, §9.3 system roles,
-- status expansion (suspended), and governance constraints.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Add Missing Columns to users (§9.1 gaps)
-- ═══════════════════════════════════════════════════════════════════════════

-- employee_id — internal employee number, unique per tenant
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id_per_tenant
  ON users(tenant_id, employee_id) WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

-- Bilingual names (existing full_name is the English/display name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- Phone (may exist on some production DBs but not via migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- is_owner — company owner, protected from deletion
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- avatar_url (complements existing profile_image, kept for §9.1 compliance)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- preferences JSONB — user preferences (language, theme, notifications, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- two_fa_enabled / two_fa_secret — aliases that map to existing mfa columns
-- (migration 403 already added mfa_enabled, mfa_secret — we add views/aliases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255);

-- login_attempts — alias for existing failed_login_count
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts SMALLINT DEFAULT 0;

-- Expand status CHECK constraint to include 'suspended' and 'inactive'
-- Drop old constraint and add new one
DO $$
BEGIN
  -- Try to drop the old CHECK constraint (name can vary)
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- Add expanded CHECK
  BEGIN
    ALTER TABLE users ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'inactive', 'suspended', 'disabled', 'locked'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- Sync name_en from full_name for existing users
UPDATE users
SET name_en = full_name
WHERE full_name IS NOT NULL AND name_en IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Add Missing Columns to roles (§9.2 gaps)
-- ═══════════════════════════════════════════════════════════════════════════

-- Bilingual role names
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- Description in Arabic
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- module_gates — modules this role has access to (subset of subscription modules)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS module_gates TEXT[];

-- can_create_roles — §9.3 says some roles can create sub-roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_create_roles BOOLEAN DEFAULT FALSE;

-- Sync name_en from existing name for existing roles
UPDATE roles
SET name_en = COALESCE(display_name, name)
WHERE name_en IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Seed §9.3 System Roles
-- ═══════════════════════════════════════════════════════════════════════════
-- These are tenant-scoped system roles seeded for every tenant.
-- is_system = true means they cannot be deleted.
-- Roles are global (tenant_id = NULL) so all tenants inherit them.

-- Using ON CONFLICT on name to avoid duplicates
INSERT INTO roles (name, name_ar, name_en, display_name, description, description_ar,
                   is_system, hierarchy_level, role_type, can_create_roles, module_gates)
VALUES
  -- 🏆 مالك الشركة — Company Owner
  ('company_owner', 'مالك الشركة', 'Company Owner', 'Company Owner',
   'Full access to all enabled modules. Can create roles.',
   'وصول كامل لجميع الوحدات المفعّلة. يمكنه إنشاء أدوار.',
   TRUE, 1, 'tenant', TRUE, ARRAY['*']),

  -- 👔 مدير عام — General Manager
  ('general_manager', 'مدير عام', 'General Manager', 'General Manager',
   'Full access to all modules except billing. Can create roles.',
   'وصول لجميع الوحدات ماعدا الفوترة. يمكنه إنشاء أدوار.',
   TRUE, 2, 'tenant', TRUE, ARRAY['*']),

  -- ⚙ مدير عمليات — Operations Manager
  ('operations_manager', 'مدير عمليات', 'Operations Manager', 'Operations Manager',
   'Manages shipments, procurement, and warehousing.',
   'يدير الشحنات والمشتريات والمستودعات.',
   TRUE, 3, 'tenant', FALSE, ARRAY['shipments', 'procurement', 'warehousing']),

  -- 💰 محاسب — Accountant
  ('accountant', 'محاسب', 'Accountant', 'Accountant',
   'Full accounting access and read-only reports.',
   'وصول كامل للمحاسبة وقراءة التقارير.',
   TRUE, 4, 'tenant', FALSE, ARRAY['accounting', 'reports']),

  -- 🚢 مخلّص جمركي — Customs Broker
  ('customs_broker', 'مخلّص جمركي', 'Customs Broker', 'Customs Broker',
   'Customs clearance and read-only shipment access.',
   'تخليص جمركي واطلاع على الشحنات.',
   TRUE, 4, 'tenant', FALSE, ARRAY['customs', 'shipments']),

  -- 📦 أمين مستودع — Warehouse Keeper
  ('warehouse_keeper', 'أمين مستودع', 'Warehouse Keeper', 'Warehouse Keeper',
   'Warehouse management and read-only items access.',
   'إدارة المستودعات واطلاع على الأصناف.',
   TRUE, 4, 'tenant', FALSE, ARRAY['warehousing', 'items']),

  -- 👀 مشاهد — Viewer
  ('viewer', 'مشاهد', 'Viewer', 'Viewer',
   'Read-only access to all enabled modules.',
   'اطلاع فقط على جميع الوحدات المفعّلة.',
   TRUE, 5, 'tenant', FALSE, ARRAY['*'])

ON CONFLICT (name) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  is_system = EXCLUDED.is_system,
  hierarchy_level = EXCLUDED.hierarchy_level,
  role_type = EXCLUDED.role_type,
  can_create_roles = EXCLUDED.can_create_roles,
  module_gates = EXCLUDED.module_gates,
  updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: Default Permission Assignments for System Roles
-- ═══════════════════════════════════════════════════════════════════════════

-- company_owner gets ALL tenant/shared permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'company_owner' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- general_manager gets ALL tenant/shared except billing module
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'general_manager' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND COALESCE(p.module_code, 'core') != 'billing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- operations_manager: shipments.* + procurement.* + warehousing.*
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'operations_manager' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND COALESCE(p.module_code, '') IN ('shipments', 'procurement', 'warehousing')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- accountant: accounting.* + reports.read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'accountant' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND (
    COALESCE(p.module_code, '') = 'accounting'
    OR (COALESCE(p.module_code, '') = 'reports' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- customs_broker: customs.* + shipments.read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'customs_broker' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND (
    COALESCE(p.module_code, '') = 'customs'
    OR (COALESCE(p.module_code, '') = 'shipments' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- warehouse_keeper: warehousing.* + items.read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'warehouse_keeper' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND (
    COALESCE(p.module_code, '') = 'warehousing'
    OR (COALESCE(p.module_code, '') = 'items' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- viewer: *.read only (all permissions with action = 'view')
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'viewer' AND r.deleted_at IS NULL
  AND p.domain IN ('tenant', 'shared')
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: Seed Missing Permissions
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  ('users:manage_status',    'users',     'manage',       'Enable/disable/suspend user accounts',       'core', 'shared'),
  ('users:assign_roles',     'users',     'manage',       'Assign roles to users',                      'core', 'shared'),
  ('roles:manage_permissions','roles',    'manage',       'Manage role permission assignments',         'core', 'shared'),
  ('roles:clone',            'roles',     'create',       'Clone an existing role',                     'core', 'shared'),
  ('tenant_users:view',      'tenant_users',  'view',    'View tenant user list',                      'core', 'tenant'),
  ('tenant_users:create',    'tenant_users',  'create',  'Create tenant users',                        'core', 'tenant'),
  ('tenant_users:edit',      'tenant_users',  'edit',    'Edit tenant user details',                   'core', 'tenant'),
  ('tenant_users:delete',    'tenant_users',  'delete',  'Delete tenant users',                        'core', 'tenant'),
  ('tenant_roles:view',      'tenant_roles',  'view',    'View tenant-specific roles',                 'core', 'tenant'),
  ('tenant_roles:create',    'tenant_roles',  'create',  'Create tenant-specific roles',               'core', 'tenant'),
  ('tenant_roles:edit',      'tenant_roles',  'edit',    'Edit tenant-specific roles',                 'core', 'tenant'),
  ('tenant_roles:delete',    'tenant_roles',  'delete',  'Delete tenant-specific roles',               'core', 'tenant')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant tenant user/role management permissions to company_owner and general_manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('company_owner', 'general_manager') AND r.deleted_at IS NULL
  AND p.permission_code IN (
    'tenant_users:view', 'tenant_users:create', 'tenant_users:edit', 'tenant_users:delete',
    'tenant_roles:view', 'tenant_roles:create', 'tenant_roles:edit', 'tenant_roles:delete',
    'users:manage_status', 'users:assign_roles', 'roles:manage_permissions', 'roles:clone'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: DB Constraints — Owner Protection
-- ═══════════════════════════════════════════════════════════════════════════

-- Prevent soft-deleting owner users via trigger
CREATE OR REPLACE FUNCTION prevent_owner_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_owner = TRUE AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot delete company owner user (id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_owner_deletion ON users;
CREATE TRIGGER trg_prevent_owner_deletion
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_owner_deletion();

-- Unique email per tenant (allow same email across tenants)
-- Only enforce when tenant_id is not null (platform users use global email uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_per_tenant
  ON users(tenant_id, email) WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;


-- ============================================================================
-- End of Migration 410
-- ============================================================================
