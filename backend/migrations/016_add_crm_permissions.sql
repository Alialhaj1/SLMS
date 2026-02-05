-- =====================================================
-- Add CRM and additional permissions to database
-- =====================================================

-- CRM Module Permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('crm:view', 'crm', 'view', 'View CRM module'),
  ('crm:contacts:view', 'crm_contacts', 'view', 'View CRM contacts'),
  ('crm:contacts:create', 'crm_contacts', 'create', 'Create CRM contacts'),
  ('crm:contacts:edit', 'crm_contacts', 'edit', 'Edit CRM contacts'),
  ('crm:contacts:delete', 'crm_contacts', 'delete', 'Delete CRM contacts'),
  ('crm:addresses:view', 'crm_addresses', 'view', 'View CRM addresses'),
  ('crm:addresses:create', 'crm_addresses', 'create', 'Create CRM addresses'),
  ('crm:addresses:edit', 'crm_addresses', 'edit', 'Edit CRM addresses'),
  ('crm:addresses:delete', 'crm_addresses', 'delete', 'Delete CRM addresses'),
  ('crm:opportunities:view', 'crm_opportunities', 'view', 'View CRM opportunities'),
  ('crm:opportunities:create', 'crm_opportunities', 'create', 'Create CRM opportunities'),
  ('crm:opportunities:edit', 'crm_opportunities', 'edit', 'Edit CRM opportunities'),
  ('crm:opportunities:delete', 'crm_opportunities', 'delete', 'Delete CRM opportunities'),
  ('crm:follow_up:view', 'crm_follow_up', 'view', 'View CRM follow-ups'),
  ('crm:follow_up:create', 'crm_follow_up', 'create', 'Create CRM follow-ups'),
  ('crm:follow_up:edit', 'crm_follow_up', 'edit', 'Edit CRM follow-ups'),
  ('crm:follow_up:delete', 'crm_follow_up', 'delete', 'Delete CRM follow-ups')
ON CONFLICT (permission_code) DO NOTHING;

-- Additional missing permissions used in pages
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  -- Approvals
  ('approvals:view', 'approvals', 'view', 'View approvals'),
  ('approvals:approve', 'approvals', 'approve', 'Approve items'),
  ('approvals:reject', 'approvals', 'reject', 'Reject items'),
  
  -- Assets
  ('assets:depreciation:view', 'assets_depreciation', 'view', 'View depreciation schedules'),
  ('assets:fixed:view', 'assets_fixed', 'view', 'View fixed assets'),
  ('assets:maintenance:view', 'assets_maintenance', 'view', 'View maintenance contracts'),
  
  -- Compliance
  ('compliance:conformity:view', 'compliance_conformity', 'view', 'View conformity certificates'),
  ('compliance:licenses:view', 'compliance_licenses', 'view', 'View licenses'),
  ('compliance:origin:view', 'compliance_origin', 'view', 'View origin certificates'),
  ('compliance:regulations:view', 'compliance_regulations', 'view', 'View regulations'),
  
  -- Documents
  ('documents:lc:view', 'documents_lc', 'view', 'View letter of credit documents'),
  ('documents:warranty:view', 'documents_warranty', 'view', 'View warranty documents'),
  
  -- Finance
  ('finance:lc:view', 'finance_lc', 'view', 'View letters of credit'),
  ('finance:lc:create', 'finance_lc', 'create', 'Create letters of credit'),
  ('finance:transfers:view', 'finance_transfers', 'view', 'View transfer requests'),
  ('finance:transfers:create', 'finance_transfers', 'create', 'Create transfer requests'),
  
  -- HR
  ('hr:advances:view', 'hr_advances', 'view', 'View HR advances'),
  ('hr:expenses:view', 'hr_expenses', 'view', 'View HR expenses'),
  
  -- Integrations
  ('integrations:banks:view', 'integrations_banks', 'view', 'View bank integrations'),
  ('integrations:payment_gateways:view', 'integrations_payment_gateways', 'view', 'View payment gateways'),
  ('integrations:shipping:view', 'integrations_shipping', 'view', 'View shipping integrations'),
  
  -- Purchasing
  ('purchasing:credit_limits:view', 'purchasing_credit_limits', 'view', 'View vendor credit limits'),
  ('purchasing:price_lists:view', 'purchasing_price_lists', 'view', 'View vendor price lists'),
  
  -- Reports
  ('reports:compliance:view', 'reports_compliance', 'view', 'View compliance reports'),
  ('reports:costs_pricing:view', 'reports_costs_pricing', 'view', 'View costs pricing reports'),
  ('reports:customs:view', 'reports_customs', 'view', 'View customs reports'),
  ('reports:general:view', 'reports_general', 'view', 'View general reports'),
  ('reports:hr:view', 'reports_hr', 'view', 'View HR reports'),
  ('reports:integrations:view', 'reports_integrations', 'view', 'View integrations reports'),
  ('reports:kpis:view', 'reports_kpis', 'view', 'View KPIs'),
  ('reports:notifications:view', 'reports_notifications', 'view', 'View notifications reports'),
  ('reports:purchasing:view', 'reports_purchasing', 'view', 'View purchasing reports'),
  ('reports:analytical:view', 'reports_analytical', 'view', 'View analytical reports'),
  
  -- Requests
  ('requests:view', 'requests', 'view', 'View requests'),
  
  -- Shipments
  ('shipments:cost_types:view', 'shipments_cost_types', 'view', 'View shipment cost types'),
  ('shipments:documents:view', 'shipments_documents', 'view', 'View shipment documents'),
  ('shipments:landed_cost:view', 'shipments_landed_cost', 'view', 'View landed cost'),
  ('shipments:milestones:view', 'shipments_milestones', 'view', 'View shipment milestones'),
  
  -- Shipping
  ('shipping:bill_of_lading:view', 'shipping_bill_of_lading', 'view', 'View bill of lading'),
  ('shipping:contracts:view', 'shipping_contracts', 'view', 'View shipping contracts'),
  ('shipping:documents:view', 'shipping_documents', 'view', 'View shipping documents'),
  ('shipping:insurance:view', 'shipping_insurance', 'view', 'View shipping insurance'),
  ('shipping:schedules:view', 'shipping_schedules', 'view', 'View shipping schedules'),
  
  -- Shipping Bills
  ('shipping_bills:create', 'shipping_bills', 'create', 'Create shipping bills'),
  
  -- Profile & Help
  ('profile:view', 'profile', 'view', 'View own profile'),
  ('help:view', 'help', 'view', 'View help')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant CRM and new permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.permission_code IN (
    'crm:view', 'crm:contacts:view', 'crm:contacts:create', 'crm:contacts:edit', 'crm:contacts:delete',
    'crm:addresses:view', 'crm:addresses:create', 'crm:addresses:edit', 'crm:addresses:delete',
    'crm:opportunities:view', 'crm:opportunities:create', 'crm:opportunities:edit', 'crm:opportunities:delete',
    'crm:follow_up:view', 'crm:follow_up:create', 'crm:follow_up:edit', 'crm:follow_up:delete',
    'approvals:view', 'approvals:approve', 'approvals:reject',
    'assets:depreciation:view', 'assets:fixed:view', 'assets:maintenance:view',
    'compliance:conformity:view', 'compliance:licenses:view', 'compliance:origin:view', 'compliance:regulations:view',
    'documents:lc:view', 'documents:warranty:view',
    'finance:lc:view', 'finance:lc:create', 'finance:transfers:view', 'finance:transfers:create',
    'hr:advances:view', 'hr:expenses:view',
    'integrations:banks:view', 'integrations:payment_gateways:view', 'integrations:shipping:view',
    'purchasing:credit_limits:view', 'purchasing:price_lists:view',
    'reports:compliance:view', 'reports:costs_pricing:view', 'reports:customs:view', 'reports:general:view',
    'reports:hr:view', 'reports:integrations:view', 'reports:kpis:view', 'reports:notifications:view',
    'reports:purchasing:view', 'reports:analytical:view',
    'requests:view',
    'shipments:cost_types:view', 'shipments:documents:view', 'shipments:landed_cost:view', 'shipments:milestones:view',
    'shipping:bill_of_lading:view', 'shipping:contracts:view', 'shipping:documents:view', 'shipping:insurance:view', 'shipping:schedules:view',
    'shipping_bills:create', 'profile:view', 'help:view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Show results
SELECT 
  'Total Permissions' as metric,
  COUNT(*) as count
FROM permissions

UNION ALL

SELECT 
  'CRM Permissions' as metric,
  COUNT(*) as count
FROM permissions
WHERE permission_code LIKE 'crm:%'

UNION ALL

SELECT 
  'Total Role-Permission Links' as metric,
  COUNT(*) as count
FROM role_permissions;
