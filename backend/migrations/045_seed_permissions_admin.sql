-- Seed missing Admin/System permission codes required by frontend MenuPermissions
-- Ensures Permission Matrix and Permissions management can be RBAC-enforced.

INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('permissions:view', 'permissions', 'view', 'View permissions'),
  ('permissions:create', 'permissions', 'create', 'Create permissions'),
  ('permissions:edit', 'permissions', 'edit', 'Edit permissions'),
  ('permissions:delete', 'permissions', 'delete', 'Delete permissions')
ON CONFLICT (permission_code) DO NOTHING;

-- Optional (present in frontend constants; used by some UIs)
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('roles:assign_permissions', 'roles', 'assign_permissions', 'Assign permissions to roles')
ON CONFLICT (permission_code) DO NOTHING;
