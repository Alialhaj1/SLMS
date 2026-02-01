-- Migration 105: Add contract-types permissions
-- Adds CRUD permissions for contract types master data

INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, description, module)
SELECT 'master:contract-types:view', 'contract-types', 'view', 'View Contract Types', 'عرض أنواع العقود', 'View contract types', 'master'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'master:contract-types:view');

INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, description, module)
SELECT 'master:contract-types:create', 'contract-types', 'create', 'Create Contract Types', 'إنشاء أنواع العقود', 'Create new contract types', 'master'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'master:contract-types:create');

INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, description, module)
SELECT 'master:contract-types:update', 'contract-types', 'update', 'Update Contract Types', 'تحديث أنواع العقود', 'Update existing contract types', 'master'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'master:contract-types:update');

INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, description, module)
SELECT 'master:contract-types:delete', 'contract-types', 'delete', 'Delete Contract Types', 'حذف أنواع العقود', 'Delete contract types', 'master'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'master:contract-types:delete');

-- Assign permissions to admin roles (super_admin bypasses permission checks)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'manager')
  AND p.permission_code IN (
    'master:contract-types:view',
    'master:contract-types:create',
    'master:contract-types:update',
    'master:contract-types:delete'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
