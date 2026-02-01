-- Add new permissions for soft delete operations
-- Date: 2025-12-20

-- Users soft delete permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
  ('users:restore', 'users', 'restore', 'Restore soft deleted users'),
  ('users:view_deleted', 'users', 'view_deleted', 'View soft deleted users'),
  ('users:permanent_delete', 'users', 'permanent_delete', 'Permanently delete users (unrecoverable)')
ON CONFLICT (permission_code) DO NOTHING;

-- Roles soft delete permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
  ('roles:restore', 'roles', 'restore', 'Restore soft deleted roles'),
  ('roles:view_deleted', 'roles', 'view_deleted', 'View soft deleted roles'),
  ('roles:permanent_delete', 'roles', 'permanent_delete', 'Permanently delete roles (unrecoverable)')
ON CONFLICT (permission_code) DO NOTHING;

-- Companies soft delete permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
  ('companies:restore', 'companies', 'restore', 'Restore soft deleted companies'),
  ('companies:view_deleted', 'companies', 'view_deleted', 'View soft deleted companies'),
  ('companies:permanent_delete', 'companies', 'permanent_delete', 'Permanently delete companies (unrecoverable)')
ON CONFLICT (permission_code) DO NOTHING;

-- Branches soft delete permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
  ('branches:restore', 'branches', 'restore', 'Restore soft deleted branches'),
  ('branches:view_deleted', 'branches', 'view_deleted', 'View soft deleted branches'),
  ('branches:permanent_delete', 'branches', 'permanent_delete', 'Permanently delete branches (unrecoverable)')
ON CONFLICT (permission_code) DO NOTHING;

-- Update super_admin role with all new permissions
UPDATE roles 
SET permissions = (
  SELECT jsonb_agg(permission_code)
  FROM permissions
)
WHERE name = 'super_admin';
