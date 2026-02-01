-- =============================================
-- Migration: 183_accounting_rules_permissions.sql
-- Description: Add permissions for Accounting Rules Engine
-- Created: 2026-01-20
-- =============================================

-- Insert permissions for accounting rules
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('accounting:rules:view', 'accounting_rules', 'view', 'View accounting rules'),
('accounting:rules:create', 'accounting_rules', 'create', 'Create accounting rules'),
('accounting:rules:edit', 'accounting_rules', 'edit', 'Edit accounting rules'),
('accounting:rules:delete', 'accounting_rules', 'delete', 'Delete accounting rules'),
('accounting:rules:execute', 'accounting_rules', 'execute', 'Execute accounting rules (auto-posting)')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin and super_admin roles (using name instead of code)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'Admin')
  AND p.permission_code LIKE 'accounting:rules:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant view only to accountant role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Accountant'
  AND p.permission_code = 'accounting:rules:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
