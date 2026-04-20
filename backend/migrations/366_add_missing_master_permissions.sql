-- ============================================================================
-- Migration 366: Add missing master data CRUD permissions
-- 
-- Several master data routes require permissions that don't exist in the DB:
--   - countries: only had 'view', missing create/edit/delete
--   - cities: only had 'view', missing create/edit/delete
--   - units: completely missing (view/create/edit/delete)
--   - taxes: routes use 'master:taxes:*' (plural) but DB had 'master:tax:*' (singular)
-- 
-- Also assigns all master:* permissions to the 'Admin' role (id=1)
-- and 'super_admin' role (id=6) for tenant admin access.
-- ============================================================================

-- ─── Insert missing permissions ─────────────────────────────────────────────

INSERT INTO permissions (permission_code, resource, action, description, domain, name_ar)
VALUES
  -- Countries CRUD (view already exists)
  ('master:countries:create', 'countries', 'create', 'Create countries', 'tenant', 'إنشاء الدول'),
  ('master:countries:edit',   'countries', 'edit',   'Edit countries',   'tenant', 'تعديل الدول'),
  ('master:countries:delete', 'countries', 'delete', 'Delete countries', 'tenant', 'حذف الدول'),

  -- Cities CRUD (view already exists)
  ('master:cities:create', 'cities', 'create', 'Create cities', 'tenant', 'إنشاء المدن'),
  ('master:cities:edit',   'cities', 'edit',   'Edit cities',   'tenant', 'تعديل المدن'),
  ('master:cities:delete', 'cities', 'delete', 'Delete cities', 'tenant', 'حذف المدن'),

  -- Units CRUD (all missing)
  ('master:units:view',   'units', 'view',   'View units',   'tenant', 'عرض الوحدات'),
  ('master:units:create', 'units', 'create', 'Create units', 'tenant', 'إنشاء الوحدات'),
  ('master:units:edit',   'units', 'edit',   'Edit units',   'tenant', 'تعديل الوحدات'),
  ('master:units:delete', 'units', 'delete', 'Delete units', 'tenant', 'حذف الوحدات'),

  -- Taxes CRUD (routes use 'taxes' plural; DB had 'tax' singular — add plural versions)
  ('master:taxes:view',   'taxes', 'view',   'View taxes',   'tenant', 'عرض الضرائب'),
  ('master:taxes:create', 'taxes', 'create', 'Create taxes', 'tenant', 'إنشاء الضرائب'),
  ('master:taxes:edit',   'taxes', 'edit',   'Edit taxes',   'tenant', 'تعديل الضرائب'),
  ('master:taxes:delete', 'taxes', 'delete', 'Delete taxes', 'tenant', 'حذف الضرائب')
ON CONFLICT (permission_code) DO NOTHING;

-- ─── Assign ALL master:* permissions to Admin role (id=1) ───────────────────
-- This ensures tenant admins have full master data access

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id
FROM permissions p
WHERE p.permission_code LIKE 'master:%'
  AND p.domain = 'tenant'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
  );

-- ─── Assign ALL master:* permissions to super_admin role (id=6) ─────────────
-- Tenant super_admin should also have all master permissions

INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, p.id
FROM permissions p
WHERE p.permission_code LIKE 'master:%'
  AND p.domain = 'tenant'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 6 AND rp.permission_id = p.id
  );
