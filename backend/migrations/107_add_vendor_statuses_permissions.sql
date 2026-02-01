-- =============================================
-- Procurement: Add missing permissions for vendor statuses
--
-- Reason:
-- - Routes use requirePermission('vendor_statuses:view/manage')
-- - Migration 100 seeded many procurement permissions but omitted vendor_statuses
-- =============================================

INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
  ('vendor_statuses:view', 'vendor_statuses', 'view', 'View vendor statuses', 'procurement'),
  ('vendor_statuses:manage', 'vendor_statuses', 'manage', 'Manage vendor statuses', 'procurement')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'procurement'
WHERE r.name = 'admin'
  AND p.permission_code IN ('vendor_statuses:view', 'vendor_statuses:manage')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
