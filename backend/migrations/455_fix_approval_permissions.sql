-- Migration 455: Fix approval permissions for reviewer/approver roles
-- Problem: Only tenant_admin has approval_documents:review/approve/post
-- But Admin, general_manager, and manager roles are used as reviewers in approval_route_steps
-- This means documents get assigned to users who can't actually act on them

-- 1. Grant approval review/approve/post/delegate permissions to manager role (used in 6/9 routes for review step)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 19, p.id FROM permissions p 
WHERE p.permission_code IN (
  'approval_documents:review',
  'approval_documents:approve',
  'approval_documents:delegate',
  'approval_documents:view'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = 19 AND rp.permission_id = p.id
);

-- 2. Grant approval review/approve/post/delegate permissions to Admin role (used in routes 4,8,9)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p 
WHERE p.permission_code IN (
  'approval_documents:view',
  'approval_documents:review',
  'approval_documents:approve',
  'approval_documents:post',
  'approval_documents:delegate'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- 3. Grant missing approval_documents:review/approve/post to general_manager
-- (currently only has old approvals:approve/reject/view)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 12, p.id FROM permissions p 
WHERE p.permission_code IN (
  'approval_documents:review',
  'approval_documents:approve',
  'approval_documents:post',
  'approval_documents:delegate'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = 12 AND rp.permission_id = p.id
);

-- 4. Set domain = 'tenant' for new approval permissions (consistency with other tenant permissions)
UPDATE permissions SET domain = 'tenant' 
WHERE permission_code LIKE 'approval_documents:%' AND (domain IS NULL OR domain = '');

UPDATE permissions SET domain = 'tenant'
WHERE permission_code LIKE 'approval_routes:%' AND (domain IS NULL OR domain = '');

-- 5. Assign manager role (id=19) to user 12 (finance@darkhawlan.com) in company 7
-- so that there's at least one reviewer user for expense_claim, journal_entry, etc. routes
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT 12, 19, 7
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = 12 AND role_id = 19
);
