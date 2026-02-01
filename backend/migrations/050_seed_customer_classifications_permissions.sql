-- Migration 050: Seed customer classifications permissions
-- Date: 2025-12-30
-- Description: Adds RBAC permission codes for Customer Classifications (frontend /master/customer-classifications)

BEGIN;

-- Frontend-aligned master data permissions
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
  ('master:customer_classifications:view', 'master:customer_classifications', 'view', 'View customer classifications', 'Master Data'),
  ('master:customer_classifications:create', 'master:customer_classifications', 'create', 'Create customer classifications', 'Master Data'),
  ('master:customer_classifications:edit', 'master:customer_classifications', 'edit', 'Edit customer classifications', 'Master Data'),
  ('master:customer_classifications:delete', 'master:customer_classifications', 'delete', 'Delete customer classifications', 'Master Data'),
  ('master:customer_classifications:manage', 'master:customer_classifications', 'manage', 'Manage customer classifications', 'Master Data')
ON CONFLICT (permission_code) DO NOTHING;

-- Alias permissions (non-master prefix), used by some APIs
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
  ('customer_classifications:view', 'customer_classifications', 'view', 'View customer classifications', 'Master Data'),
  ('customer_classifications:create', 'customer_classifications', 'create', 'Create customer classifications', 'Master Data'),
  ('customer_classifications:edit', 'customer_classifications', 'edit', 'Edit customer classifications', 'Master Data'),
  ('customer_classifications:delete', 'customer_classifications', 'delete', 'Delete customer classifications', 'Master Data'),
  ('customer_classifications:manage', 'customer_classifications', 'manage', 'Manage customer classifications', 'Master Data')
ON CONFLICT (permission_code) DO NOTHING;

COMMIT;
