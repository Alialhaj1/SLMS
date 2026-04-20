-- Migration 456: Grant approval permissions to accountant role
-- Allows delegated review tasks to reach accountant users (e.g. user 8)

-- Grant basic approval permissions to accountant role (id=14)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 14, p.id FROM permissions p
WHERE p.permission_code IN (
  'approval_documents:view',
  'approval_documents:review',
  'approval_documents:approve',
  'approval_documents:delegate'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = 14 AND rp.permission_id = p.id
);
