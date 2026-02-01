-- Ensure Inventory Operations permissions exist and are assigned to key roles
-- Idempotent

DO $$
BEGIN
  -- 1) Ensure permissions exist
  INSERT INTO permissions (permission_code, resource, action, description)
  SELECT v.permission_code, v.resource, v.action, v.description
  FROM (
    VALUES
      ('inventory:balances:view',   'inventory_balances',  'view',   'View inventory balances'),

      ('inventory:receipts:view',   'inventory_receipts',  'view',   'View stock receipts'),
      ('inventory:receipts:create', 'inventory_receipts',  'create', 'Create stock receipt'),

      ('inventory:issues:view',     'inventory_issues',    'view',   'View stock issues'),
      ('inventory:issues:create',   'inventory_issues',    'create', 'Create stock issue'),

      ('inventory:transfers:view',  'inventory_transfers', 'view',   'View stock transfers'),
      ('inventory:transfers:create','inventory_transfers', 'create', 'Create stock transfer'),

      ('inventory:returns:view',    'inventory_returns',   'view',   'View stock returns'),
      ('inventory:returns:create',  'inventory_returns',   'create', 'Create stock return')
  ) AS v(permission_code, resource, action, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.permission_code = v.permission_code
  );

  -- 2) Assign to roles (Admin, super_admin, Accountant, المدير العام) if role exists
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r
  JOIN permissions p
    ON p.permission_code IN (
      'inventory:balances:view',
      'inventory:receipts:view',
      'inventory:receipts:create',
      'inventory:issues:view',
      'inventory:issues:create',
      'inventory:transfers:view',
      'inventory:transfers:create',
      'inventory:returns:view',
      'inventory:returns:create'
    )
  WHERE r.name IN ('Admin', 'super_admin', 'Accountant', 'المدير العام')
    AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

END $$;
