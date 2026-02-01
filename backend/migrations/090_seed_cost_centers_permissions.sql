-- Ensure Cost Centers permissions exist and are assigned to key roles
-- Idempotent

DO $$
DECLARE
  v_perm_ids INT[];
BEGIN
  -- 1) Ensure permissions exist
  INSERT INTO permissions (permission_code, resource, action, description)
  SELECT v.permission_code, v.resource, v.action, v.description
  FROM (
    VALUES
      ('master:cost_centers:view',   'cost_centers', 'view',   'View Cost Centers'),
      ('master:cost_centers:create', 'cost_centers', 'create', 'Create Cost Center'),
      ('master:cost_centers:edit',   'cost_centers', 'edit',   'Edit Cost Center'),
      ('master:cost_centers:delete', 'cost_centers', 'delete', 'Delete Cost Center')
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
      'master:cost_centers:view',
      'master:cost_centers:create',
      'master:cost_centers:edit',
      'master:cost_centers:delete'
    )
  WHERE r.name IN ('Admin', 'super_admin', 'Accountant', 'المدير العام')
    AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

END $$;
