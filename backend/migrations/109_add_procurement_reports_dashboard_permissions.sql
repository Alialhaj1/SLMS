-- Migration 109: Add Procurement Reports & Dashboard Permissions
-- Phase 9: Backend Report APIs & Dashboard Data
-- Adds permissions for:
--   - procurement:reports:view (Vendor Aging, Price Variance, Outstanding POs)
--   - procurement:dashboard:view (7 KPIs, Monthly Trend, Top Vendors, Category Breakdown)

-- Insert procurement reports permission
INSERT INTO permissions (permission_code, resource, action, description, created_at, updated_at)
VALUES 
  ('procurement:reports:view', 'procurement_reports', 'view', 'View procurement reports (Vendor Aging, Price Variance, Outstanding POs)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('procurement:dashboard:view', 'procurement_dashboard', 'view', 'View procurement dashboard with KPIs and analytics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to super_admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM permissions p
WHERE p.permission_code IN (
  'procurement:reports:view',
  'procurement:dashboard:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant to admin role (role_id = 2)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 2, p.id, CURRENT_TIMESTAMP
FROM permissions p
WHERE p.permission_code IN (
  'procurement:reports:view',
  'procurement:dashboard:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 109 completed: Procurement Reports & Dashboard permissions added';
END $$;
