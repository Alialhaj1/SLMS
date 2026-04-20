-- ============================================================================
-- Migration 458: Professional Approval Roles
-- ============================================================================
-- Creates 3 dedicated approval roles:
--   document_creator  → Can create/submit documents for approval
--   document_reviewer → Reviews documents at step 1 (مراجعة)
--   document_approver → Final approval at step 2 (اعتماد)
--
-- Assigns permissions, links to tenant 7 users, updates all 9 route steps.
-- ============================================================================

BEGIN;

-- ─── 1. Create the 3 approval roles ─────────────────────────────────────────

INSERT INTO roles (name, display_name, description, name_en, name_ar, description_ar, is_system_role, role_type, tenant_id, hierarchy_level, created_at, updated_at)
VALUES
  ('document_creator',  'Document Creator',  'Can create and submit documents for approval', 'Document Creator',  'منشئ المستندات',  'يمكنه إنشاء وتقديم المستندات للاعتماد',    false, 'tenant', 7, 1, NOW(), NOW()),
  ('document_reviewer', 'Document Reviewer', 'Reviews documents at the first approval stage',  'Document Reviewer', 'مراجع المستندات', 'يراجع المستندات في مرحلة المراجعة الأولى', false, 'tenant', 7, 2, NOW(), NOW()),
  ('document_approver', 'Document Approver', 'Gives final approval on documents',              'Document Approver', 'معتمد المستندات', 'يمنح الاعتماد النهائي على المستندات',       false, 'tenant', 7, 3, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  name_en      = EXCLUDED.name_en,
  name_ar      = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  hierarchy_level = EXCLUDED.hierarchy_level,
  updated_at   = NOW();

-- ─── 2. Assign permissions to each role ──────────────────────────────────────

-- document_creator: view + create + submit + recall
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'document_creator'
  AND p.permission_code IN (
    'approval_documents:view',
    'approval_documents:create',
    'approval_documents:submit',
    'approval_documents:recall'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- document_reviewer: view + review + delegate
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'document_reviewer'
  AND p.permission_code IN (
    'approval_documents:view',
    'approval_documents:review',
    'approval_documents:delegate'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- document_approver: view + approve + post + void + delegate + monitor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'document_approver'
  AND p.permission_code IN (
    'approval_documents:view',
    'approval_documents:approve',
    'approval_documents:post',
    'approval_documents:void',
    'approval_documents:delegate',
    'approval_documents:monitor'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── 3. Assign roles to tenant 7 users ──────────────────────────────────────
-- User 13 (import@darkhawlan.com)   → document_creator
-- User 12 (finance@darkhawlan.com)  → document_reviewer
-- User 7  (official@darkhawlan.com) → document_approver

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT 13, id, 7, NOW() FROM roles WHERE name = 'document_creator'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT 12, id, 7, NOW() FROM roles WHERE name = 'document_reviewer'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT 7, id, 7, NOW() FROM roles WHERE name = 'document_approver'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ─── 4. Update ALL approval route steps for company 7 ───────────────────────
-- Step 1 (step_number=1, review): manager/Admin → document_reviewer
-- Step 2 (step_number=2, approve): tenant_admin → document_approver

UPDATE approval_route_steps
SET role_id = (SELECT id FROM roles WHERE name = 'document_reviewer')
WHERE step_number = 1
  AND route_id IN (SELECT id FROM approval_routes WHERE company_id = 7);

UPDATE approval_route_steps
SET role_id = (SELECT id FROM roles WHERE name = 'document_approver')
WHERE step_number = 2
  AND route_id IN (SELECT id FROM approval_routes WHERE company_id = 7);

COMMIT;
