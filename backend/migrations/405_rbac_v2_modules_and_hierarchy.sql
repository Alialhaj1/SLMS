-- Migration 405: RBAC v2 — Modules, Hierarchy Enforcement, Wildcard Permissions
-- Architecture Document §4: نظام الصلاحيات — RBAC
-- Created: 2026-02-XX
--
-- Implements:
--   §4.1  7-level role hierarchy (God → View Only)
--   §4.2  Permission format: module.resource.action with wildcard support
--   §4.3  Module gating: platform controls tenant module access
--
-- Tables created/modified:
--   NEW:  modules              — system module definitions
--   NEW:  tenant_modules       — per-tenant module enablement
--   NEW:  permission_templates — role template → permission mappings
--   MOD:  roles                — add role_type, scope columns
--   MOD:  permissions          — add module_code, domain columns if missing
--   MOD:  user_roles           — add tenant_id scoping
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. MODULES TABLE — System module definitions
-- ═══════════════════════════════════════════════════════════════════════════
-- Each module represents a top-level feature area that can be enabled/disabled
-- per tenant. Core modules (is_core=true) are always enabled.

CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  module_code VARCHAR(50) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  is_core BOOLEAN DEFAULT FALSE,
  category VARCHAR(50) DEFAULT 'business',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_code ON modules(module_code);
CREATE INDEX IF NOT EXISTS idx_modules_active ON modules(is_active) WHERE is_active = TRUE;

-- Add missing columns if table existed from an older migration
ALTER TABLE modules ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON TABLE modules IS '§4.3 وحدات النظام — تعريف الوحدات المتاحة';
COMMENT ON COLUMN modules.module_code IS 'Unique module identifier (e.g., shipments, accounting)';
COMMENT ON COLUMN modules.is_core IS 'Core modules are always enabled for all tenants';
COMMENT ON COLUMN modules.is_active IS 'Platform-level toggle — disabled modules are not available to any tenant';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_modules_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modules_updated_at ON modules;
CREATE TRIGGER trg_modules_updated_at
  BEFORE UPDATE ON modules FOR EACH ROW
  EXECUTE FUNCTION update_modules_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TENANT_MODULES TABLE — Per-tenant module enablement
-- ═══════════════════════════════════════════════════════════════════════════
-- Controls which modules each tenant can access. Core modules don't need
-- an entry here — they are always enabled. Non-core modules require an
-- explicit row with is_enabled=true.

CREATE TABLE IF NOT EXISTS tenant_modules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_code VARCHAR(50) NOT NULL REFERENCES modules(module_code) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  enabled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  company_id INTEGER,
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled ON tenant_modules(tenant_id, module_code) WHERE is_enabled = TRUE;

COMMENT ON TABLE tenant_modules IS '§4.3 تفعيل الوحدات لكل مستأجر';
COMMENT ON COLUMN tenant_modules.is_enabled IS 'Whether this module is enabled for the tenant';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ENHANCE ROLES TABLE — Add role_type and scope
-- ═══════════════════════════════════════════════════════════════════════════
-- role_type: 'platform' | 'tenant' | 'custom'
-- company_id: for company-scoped custom roles

ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(20) DEFAULT 'tenant';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_hierarchy_target INTEGER;

-- max_hierarchy_target: A role at hierarchy_level=X can only assign roles where
-- hierarchy_level <= max_hierarchy_target. Ensures tenant_owner cannot create
-- roles above their own level.
COMMENT ON COLUMN roles.role_type IS 'platform=platform-scoped, tenant=tenant-scoped, custom=user-defined';
COMMENT ON COLUMN roles.max_hierarchy_target IS 'Maximum hierarchy_level this role can assign to others';
COMMENT ON COLUMN roles.company_id IS 'Non-null = company-scoped custom role';

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_roles_type ON roles(role_type);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_type ON roles(tenant_id, role_type) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ENHANCE PERMISSIONS TABLE — Add module_code + domain
-- ═══════════════════════════════════════════════════════════════════════════
-- module_code links permissions to modules for module-level gating.
-- domain: 'platform' | 'tenant' | 'shared'

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module_code VARCHAR(50);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS domain VARCHAR(20) DEFAULT 'tenant';

-- Foreign key to modules (permissive — NULL module_code = system/general permission)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_permissions_module_code'
  ) THEN
    ALTER TABLE permissions ADD CONSTRAINT fk_permissions_module_code
      FOREIGN KEY (module_code) REFERENCES modules(module_code) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'FK fk_permissions_module_code skipped: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_permissions_module_code ON permissions(module_code);
CREATE INDEX IF NOT EXISTS idx_permissions_domain ON permissions(domain);

COMMENT ON COLUMN permissions.module_code IS '§4.2 Module this permission belongs to (NULL = system-level)';
COMMENT ON COLUMN permissions.domain IS 'platform | tenant | shared — controls visibility scope';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENHANCE USER_ROLES — Add tenant scoping
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id) WHERE is_active = TRUE;

COMMENT ON COLUMN user_roles.tenant_id IS 'Tenant scope for this role assignment (defense-in-depth)';
COMMENT ON COLUMN user_roles.is_active IS 'Soft disable without removing assignment';
COMMENT ON COLUMN user_roles.expires_at IS 'Automatic role expiry (e.g., temporary elevated access)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PERMISSION TEMPLATES TABLE — Template-based role permission sets
-- ═══════════════════════════════════════════════════════════════════════════
-- When a tenant creates a new custom role from a template, the template's
-- permissions are copied. This enables "Starter Kits" for common role patterns.

CREATE TABLE IF NOT EXISTS permission_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  permission_codes TEXT[] NOT NULL DEFAULT '{}',
  module_code VARCHAR(50) REFERENCES modules(module_code),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE permission_templates IS 'Permission template sets for quick role creation';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SEED MODULES — Core system modules
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO modules (module_code, module_name, name_ar, description, icon_name, is_active, is_core, category, sort_order) VALUES
  ('core',        'Core System',      'النظام الأساسي',  'Authentication, users, roles, settings',  'cog',             TRUE, TRUE,  'system',   0),
  ('dashboard',   'Dashboard',        'لوحة التحكم',     'Main dashboard and KPIs',                 'chart-bar',       TRUE, TRUE,  'system',   1),
  ('shipments',   'Shipments',        'الشحنات',         'Shipment management and tracking',        'truck',           TRUE, FALSE, 'business', 10),
  ('procurement', 'Procurement',      'المشتريات',       'Purchase orders and vendor management',   'shopping-cart',   TRUE, FALSE, 'business', 20),
  ('customs',     'Customs',          'الجمارك',         'Customs declarations and clearance',      'globe',           TRUE, FALSE, 'business', 30),
  ('accounting',  'Accounting',       'المحاسبة',        'Journal entries, ledgers, reports',       'calculator',      TRUE, FALSE, 'business', 40),
  ('warehousing', 'Warehousing',      'المستودعات',      'Inventory, stock movements, counting',    'cube',            TRUE, FALSE, 'business', 50),
  ('zatca',       'ZATCA',            'زاتكا',           'ZATCA e-invoicing compliance',            'document-check',  TRUE, FALSE, 'compliance', 60),
  ('crm',         'CRM',             'إدارة العملاء',    'Customer relationship management',        'users',           TRUE, FALSE, 'business', 70),
  ('reports',     'Reports',          'التقارير',        'Advanced reporting and analytics',         'chart-pie',       TRUE, FALSE, 'analytics', 80),
  ('master_data', 'Master Data',      'البيانات الرئيسية','Countries, ports, currencies, items',     'database',        TRUE, TRUE,  'system',   2)
ON CONFLICT (module_code) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  is_core = EXCLUDED.is_core,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. SEED PLATFORM ROLES — 7-level hierarchy per §4.1
-- ═══════════════════════════════════════════════════════════════════════════
-- Level 6: God (super_admin)        — bypasses ALL checks
-- Level 5: Platform Admin           — manages tenants, modules, subscriptions
-- Level 4: Platform Support         — read-only platform access + tenant impersonation
-- Level 3: Tenant Owner             — full tenant control, manages users/roles
-- Level 2: Tenant Admin             — manages within company, configures settings
-- Level 1: Custom Role              — per-role permission set (created by tenant)
-- Level 0: View Only                — read-only across allowed modules

-- Update existing roles to correct hierarchy levels
UPDATE roles SET hierarchy_level = 6, role_type = 'platform', is_system = TRUE, is_locked = TRUE, can_override_policy = TRUE, max_hierarchy_target = 5
  WHERE name = 'super_admin';

UPDATE roles SET hierarchy_level = 5, role_type = 'platform', is_system = TRUE, max_hierarchy_target = 4
  WHERE name = 'platform_admin';

-- Insert new platform role if missing
INSERT INTO roles (name, display_name, description, is_system, hierarchy_level, role_type, is_locked, can_override_policy, max_hierarchy_target)
VALUES ('platform_support', 'Platform Support', 'Read-only platform access + tenant impersonation', TRUE, 4, 'platform', FALSE, FALSE, 0)
ON CONFLICT (name) DO UPDATE SET
  hierarchy_level = 4, role_type = 'platform', is_system = TRUE, max_hierarchy_target = 0;

-- Tenant system roles
INSERT INTO roles (name, display_name, description, is_system, hierarchy_level, role_type, is_locked, can_override_policy, max_hierarchy_target)
VALUES
  ('tenant_owner', 'Tenant Owner', 'Full tenant control — manages users, roles, settings', TRUE, 3, 'tenant', TRUE, TRUE, 2),
  ('tenant_admin', 'Tenant Admin', 'Company admin — manages operations and settings', TRUE, 2, 'tenant', FALSE, TRUE, 1)
ON CONFLICT (name) DO UPDATE SET
  hierarchy_level = EXCLUDED.hierarchy_level,
  role_type = EXCLUDED.role_type,
  is_system = EXCLUDED.is_system,
  can_override_policy = EXCLUDED.can_override_policy,
  max_hierarchy_target = EXCLUDED.max_hierarchy_target;

-- Update existing tenant-level roles
UPDATE roles SET hierarchy_level = 2, role_type = 'tenant', max_hierarchy_target = 1
  WHERE name = 'admin' AND role_type IS DISTINCT FROM 'platform';

UPDATE roles SET hierarchy_level = 1, role_type = 'tenant', max_hierarchy_target = 0
  WHERE name IN ('manager', 'accountant', 'user', 'tenant_manager', 'tenant_user', 'tenant_customs', 'tenant_warehouse', 'tenant_accounting');

-- View-only system role
INSERT INTO roles (name, display_name, description, is_system, hierarchy_level, role_type, max_hierarchy_target)
VALUES ('view_only', 'View Only', 'Read-only access to allowed modules', TRUE, 0, 'tenant', 0)
ON CONFLICT (name) DO UPDATE SET
  hierarchy_level = 0, role_type = 'tenant', is_system = TRUE, max_hierarchy_target = 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. BACKFILL module_code ON EXISTING PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- Map existing permission codes to module_code based on prefix patterns.
-- e.g., 'shipments:view' → module_code = 'shipments'
-- e.g., 'logistics:shipments:view' → module_code = 'shipments'

-- Shipments module
UPDATE permissions SET module_code = 'shipments', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'shipments:%' OR
    permission_code LIKE 'logistics:shipments:%' OR
    permission_code LIKE 'logistics:tracking:%'
  );

-- Procurement module
UPDATE permissions SET module_code = 'procurement', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'procurement:%' OR
    permission_code LIKE 'vendors:%' OR
    permission_code LIKE 'purchase_orders:%'
  );

-- Customs module
UPDATE permissions SET module_code = 'customs', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'customs:%' OR
    permission_code LIKE 'logistics:customs:%'
  );

-- Accounting module
UPDATE permissions SET module_code = 'accounting', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'accounting:%' OR
    permission_code LIKE 'expenses:%' OR
    permission_code LIKE 'journal%:%' OR
    permission_code LIKE 'invoices:%'
  );

-- Warehousing module
UPDATE permissions SET module_code = 'warehousing', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'inventory:%' OR
    permission_code LIKE 'warehouses:%' OR
    permission_code LIKE 'stock:%'
  );

-- CRM module
UPDATE permissions SET module_code = 'crm', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'customers:%' OR
    permission_code LIKE 'crm:%' OR
    permission_code LIKE 'contacts:%'
  );

-- Reports module
UPDATE permissions SET module_code = 'reports', domain = 'tenant'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'reports:%' OR
    permission_code LIKE '%:export'
  );

-- Master data module
UPDATE permissions SET module_code = 'master_data', domain = 'shared'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'master:%' OR
    permission_code LIKE 'countries:%' OR
    permission_code LIKE 'ports:%' OR
    permission_code LIKE 'currencies:%' OR
    permission_code LIKE 'items:%' OR
    permission_code LIKE 'categories:%'
  );

-- Core system module (admin, users, roles, settings, audit)
UPDATE permissions SET module_code = 'core', domain = 'shared'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'admin:%' OR
    permission_code LIKE 'users:%' OR
    permission_code LIKE 'roles:%' OR
    permission_code LIKE 'settings:%' OR
    permission_code LIKE 'audit:%' OR
    permission_code LIKE 'audit_logs:%' OR
    permission_code LIKE 'companies:%' OR
    permission_code LIKE 'branches:%'
  );

-- Platform-domain permissions
UPDATE permissions SET module_code = 'core', domain = 'platform'
  WHERE module_code IS NULL AND (
    permission_code LIKE 'platform:%' OR
    permission_code LIKE 'tenants:%' OR
    permission_code LIKE 'subscriptions:%' OR
    permission_code LIKE 'system:%'
  );

-- Dashboard module
UPDATE permissions SET module_code = 'dashboard', domain = 'shared'
  WHERE module_code IS NULL AND permission_code LIKE 'dashboard:%';

-- Catch-all: any remaining permissions → core/tenant
UPDATE permissions SET module_code = 'core', domain = 'tenant'
  WHERE module_code IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. HELPER FUNCTION: Check if module is enabled for tenant
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_module_enabled(p_tenant_id INTEGER, p_module_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_core BOOLEAN;
  v_is_active BOOLEAN;
  v_is_enabled BOOLEAN;
BEGIN
  -- Check module exists and is active at platform level
  SELECT is_core, is_active INTO v_is_core, v_is_active
    FROM modules WHERE module_code = p_module_code;

  IF NOT FOUND OR NOT v_is_active THEN
    RETURN FALSE;
  END IF;

  -- Core modules are always enabled
  IF v_is_core THEN
    RETURN TRUE;
  END IF;

  -- Check tenant-specific enablement
  SELECT tm.is_enabled INTO v_is_enabled
    FROM tenant_modules tm
    WHERE tm.tenant_id = p_tenant_id AND tm.module_code = p_module_code;

  RETURN COALESCE(v_is_enabled, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_module_enabled IS '§4.3 Check if a module is enabled for a tenant';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. HELPER FUNCTION: Load user permissions filtered by enabled modules
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id INTEGER, p_tenant_id INTEGER DEFAULT NULL)
RETURNS TABLE(permission_code VARCHAR, module_code VARCHAR, domain VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.permission_code, p.module_code, p.domain
  FROM permissions p
  JOIN role_permissions rp ON rp.permission_id = p.id
  JOIN user_roles ur ON ur.role_id = rp.role_id
  WHERE ur.user_id = p_user_id
    AND (ur.is_active IS NULL OR ur.is_active = TRUE)
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    -- Module gating: only include permissions for enabled modules
    AND (
      p_tenant_id IS NULL  -- platform users see all
      OR p.module_code IS NULL  -- system permissions always visible
      OR p.domain = 'platform'  -- platform-domain filtered elsewhere
      OR is_module_enabled(p_tenant_id, p.module_code)
    )
    -- Domain filter: tenant users cannot see platform-only permissions
    AND (
      p_tenant_id IS NULL
      OR p.domain != 'platform'
    )
  ORDER BY p.permission_code;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_effective_permissions IS '§4.2 Load user permissions filtered by module gating + domain';

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. MIGRATION SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
-- Tables: modules (NEW), tenant_modules (NEW), permission_templates (NEW)
-- Columns: roles(role_type, company_id, deleted_at, max_hierarchy_target)
--          permissions(module_code, domain)
--          user_roles(tenant_id, company_id, is_active, expires_at)
-- Functions: is_module_enabled(), get_user_effective_permissions()
-- Seeded: 11 modules, 7-level role hierarchy
-- ============================================================================
