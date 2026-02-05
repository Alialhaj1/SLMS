-- =====================================================
-- إضافة الصلاحيات الناقصة للقوائم (بدون description_ar)
-- Missing Menu Permissions - SLMS
-- =====================================================

-- Dashboard Statistics
INSERT INTO permissions (permission_code, resource, action, description)
VALUES ('dashboard:statistics:view', 'dashboard', 'statistics:view', 'View dashboard statistics')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Reference Data
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:reference_data:view', 'reports', 'reference_data:view', 'View reference data reports'),
  ('reports:reference_data:export', 'reports', 'reference_data:export', 'Export reference data reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Warehouses
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:warehouses:view', 'reports', 'warehouses:view', 'View warehouse reports'),
  ('reports:warehouses:export', 'reports', 'warehouses:export', 'Export warehouse reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Quality
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:quality:view', 'reports', 'quality:view', 'View quality reports'),
  ('reports:quality:export', 'reports', 'quality:export', 'Export quality reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Risks
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:risks:view', 'reports', 'risks:view', 'View risk reports'),
  ('reports:risks:export', 'reports', 'risks:export', 'Export risk reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Security
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:security:view', 'reports', 'security:view', 'View security reports'),
  ('reports:security:export', 'reports', 'security:export', 'Export security reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Shipment Costs
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:shipment_costs:view', 'reports', 'shipment_costs:view', 'View shipment cost reports'),
  ('reports:shipment_costs:export', 'reports', 'shipment_costs:export', 'Export shipment cost reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Item Landed Cost
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:item_landed_cost:view', 'reports', 'item_landed_cost:view', 'View item landed cost reports'),
  ('reports:item_landed_cost:export', 'reports', 'item_landed_cost:export', 'Export item landed cost reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Shipment Delays
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('reports:shipment_delays:view', 'reports', 'shipment_delays:view', 'View shipment delay reports'),
  ('reports:shipment_delays:export', 'reports', 'shipment_delays:export', 'Export shipment delay reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Shipments (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('shipments:view', 'shipments', 'view', 'View shipments'),
  ('shipments:create', 'shipments', 'create', 'Create shipments'),
  ('shipments:edit', 'shipments', 'edit', 'Edit shipments'),
  ('shipments:delete', 'shipments', 'delete', 'Delete shipments')
ON CONFLICT (permission_code) DO NOTHING;

-- Expenses (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('expenses:view', 'expenses', 'view', 'View expenses'),
  ('expenses:create', 'expenses', 'create', 'Create expenses'),
  ('expenses:edit', 'expenses', 'edit', 'Edit expenses'),
  ('expenses:delete', 'expenses', 'delete', 'Delete expenses')
ON CONFLICT (permission_code) DO NOTHING;

-- Warehouses (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('warehouses:view', 'warehouses', 'view', 'View warehouses'),
  ('warehouses:create', 'warehouses', 'create', 'Create warehouses'),
  ('warehouses:edit', 'warehouses', 'edit', 'Edit warehouses'),
  ('warehouses:delete', 'warehouses', 'delete', 'Delete warehouses')
ON CONFLICT (permission_code) DO NOTHING;

-- Suppliers (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('suppliers:view', 'suppliers', 'view', 'View suppliers'),
  ('suppliers:create', 'suppliers', 'create', 'Create suppliers'),
  ('suppliers:edit', 'suppliers', 'edit', 'Edit suppliers'),
  ('suppliers:delete', 'suppliers', 'delete', 'Delete suppliers')
ON CONFLICT (permission_code) DO NOTHING;

-- Users (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('users:view', 'users', 'view', 'View users'),
  ('users:create', 'users', 'create', 'Create users'),
  ('users:edit', 'users', 'edit', 'Edit users'),
  ('users:delete', 'users', 'delete', 'Delete users'),
  ('users:manage_status', 'users', 'manage_status', 'Manage user status'),
  ('users:assign_roles', 'users', 'assign_roles', 'Assign roles to users')
ON CONFLICT (permission_code) DO NOTHING;

-- Roles (Core)
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('roles:view', 'roles', 'view', 'View roles'),
  ('roles:create', 'roles', 'create', 'Create roles'),
  ('roles:edit', 'roles', 'edit', 'Edit roles'),
  ('roles:delete', 'roles', 'delete', 'Delete roles')
ON CONFLICT (permission_code) DO NOTHING;

-- Accounting Reports
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('accounting:reports:trial-balance:view', 'accounting', 'reports:trial-balance:view', 'View trial balance report'),
  ('accounting:reports:general-ledger:view', 'accounting', 'reports:general-ledger:view', 'View general ledger report'),
  ('accounting:reports:general-ledger:export', 'accounting', 'reports:general-ledger:export', 'Export general ledger report'),
  ('accounting:reports:income-statement:view', 'accounting', 'reports:income-statement:view', 'View income statement'),
  ('accounting:reports:income-statement:export', 'accounting', 'reports:income-statement:export', 'Export income statement'),
  ('accounting:reports:balance-sheet:view', 'accounting', 'reports:balance-sheet:view', 'View balance sheet'),
  ('accounting:reports:balance-sheet:export', 'accounting', 'reports:balance-sheet:export', 'Export balance sheet'),
  ('accounting:reports:cash-flow:view', 'accounting', 'reports:cash-flow:view', 'View cash flow statement'),
  ('accounting:reports:cash-flow:export', 'accounting', 'reports:cash-flow:export', 'Export cash flow statement')
ON CONFLICT (permission_code) DO NOTHING;

-- Accounting Sub-Ledgers
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('accounting:prepaid_expenses:view', 'accounting', 'prepaid_expenses:view', 'View prepaid expenses'),
  ('accounting:prepaid_expenses:create', 'accounting', 'prepaid_expenses:create', 'Create prepaid expenses'),
  ('accounting:prepaid_expenses:edit', 'accounting', 'prepaid_expenses:edit', 'Edit prepaid expenses'),
  ('accounting:prepaid_expenses:delete', 'accounting', 'prepaid_expenses:delete', 'Delete prepaid expenses'),
  ('accounting:deferred_revenue:view', 'accounting', 'deferred_revenue:view', 'View deferred revenue'),
  ('accounting:deferred_revenue:create', 'accounting', 'deferred_revenue:create', 'Create deferred revenue'),
  ('accounting:deferred_revenue:edit', 'accounting', 'deferred_revenue:edit', 'Edit deferred revenue'),
  ('accounting:deferred_revenue:delete', 'accounting', 'deferred_revenue:delete', 'Delete deferred revenue'),
  ('accounting:cheques_due:view', 'accounting', 'cheques_due:view', 'View due cheques'),
  ('accounting:cheques_due:create', 'accounting', 'cheques_due:create', 'Create due cheques'),
  ('accounting:cheques_due:edit', 'accounting', 'cheques_due:edit', 'Edit due cheques'),
  ('accounting:cheques_due:delete', 'accounting', 'cheques_due:delete', 'Delete due cheques'),
  ('accounting:customers_ledger:view', 'accounting', 'customers_ledger:view', 'View customers ledger'),
  ('accounting:customers_ledger:export', 'accounting', 'customers_ledger:export', 'Export customers ledger'),
  ('accounting:inventory_ledger:view', 'accounting', 'inventory_ledger:view', 'View inventory ledger'),
  ('accounting:inventory_ledger:export', 'accounting', 'inventory_ledger:export', 'Export inventory ledger'),
  ('accounting:default_accounts:view', 'accounting', 'default_accounts:view', 'View default accounts'),
  ('accounting:default_accounts:manage', 'accounting', 'default_accounts:manage', 'Manage default accounts')
ON CONFLICT (permission_code) DO NOTHING;

-- Customs & Ports
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('customs_offices:view', 'customs_offices', 'view', 'View customs offices'),
  ('customs_offices:create', 'customs_offices', 'create', 'Create customs offices'),
  ('customs_offices:edit', 'customs_offices', 'edit', 'Edit customs offices'),
  ('customs_offices:delete', 'customs_offices', 'delete', 'Delete customs offices'),
  ('customs_fee_categories:view', 'customs_fee_categories', 'view', 'View customs fee categories'),
  ('customs_fee_categories:create', 'customs_fee_categories', 'create', 'Create customs fee categories'),
  ('customs_fee_categories:edit', 'customs_fee_categories', 'edit', 'Edit customs fee categories'),
  ('customs_fee_categories:delete', 'customs_fee_categories', 'delete', 'Delete customs fee categories'),
  ('customs_duties:view', 'customs_duties', 'view', 'View customs duties'),
  ('customs_duties:create', 'customs_duties', 'create', 'Create customs duties'),
  ('customs_duties:edit', 'customs_duties', 'edit', 'Edit customs duties'),
  ('customs_duties:delete', 'customs_duties', 'delete', 'Delete customs duties'),
  ('ports:view', 'ports', 'view', 'View ports'),
  ('ports:create', 'ports', 'create', 'Create ports'),
  ('ports:edit', 'ports', 'edit', 'Edit ports'),
  ('ports:delete', 'ports', 'delete', 'Delete ports')
ON CONFLICT (permission_code) DO NOTHING;

-- Status Types
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('clearance_status:view', 'clearance_status', 'view', 'View clearance status'),
  ('clearance_status:create', 'clearance_status', 'create', 'Create clearance status'),
  ('clearance_status:edit', 'clearance_status', 'edit', 'Edit clearance status'),
  ('clearance_status:delete', 'clearance_status', 'delete', 'Delete clearance status'),
  ('claim_status:view', 'claim_status', 'view', 'View claim status'),
  ('claim_status:create', 'claim_status', 'create', 'Create claim status'),
  ('claim_status:edit', 'claim_status', 'edit', 'Edit claim status'),
  ('claim_status:delete', 'claim_status', 'delete', 'Delete claim status')
ON CONFLICT (permission_code) DO NOTHING;

-- Payment Terms
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('payment_terms:view', 'payment_terms', 'view', 'View payment terms'),
  ('payment_terms:create', 'payment_terms', 'create', 'Create payment terms'),
  ('payment_terms:edit', 'payment_terms', 'edit', 'Edit payment terms'),
  ('payment_terms:delete', 'payment_terms', 'delete', 'Delete payment terms')
ON CONFLICT (permission_code) DO NOTHING;

-- Customer Groups
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('customer_groups:view', 'customer_groups', 'view', 'View customer groups'),
  ('customer_groups:create', 'customer_groups', 'create', 'Create customer groups'),
  ('customer_groups:edit', 'customer_groups', 'edit', 'Edit customer groups'),
  ('customer_groups:delete', 'customer_groups', 'delete', 'Delete customer groups')
ON CONFLICT (permission_code) DO NOTHING;

-- Harvest Schedules
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('harvest_schedules:view', 'harvest_schedules', 'view', 'View harvest schedules'),
  ('harvest_schedules:create', 'harvest_schedules', 'create', 'Create harvest schedules'),
  ('harvest_schedules:edit', 'harvest_schedules', 'edit', 'Edit harvest schedules'),
  ('harvest_schedules:delete', 'harvest_schedules', 'delete', 'Delete harvest schedules')
ON CONFLICT (permission_code) DO NOTHING;

-- Quality Management
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('quality:view', 'quality', 'view', 'View quality management'),
  ('quality:create', 'quality', 'create', 'Create quality records'),
  ('quality:edit', 'quality', 'edit', 'Edit quality records'),
  ('quality:delete', 'quality', 'delete', 'Delete quality records'),
  ('quality:approved_vendors:view', 'quality', 'approved_vendors:view', 'View approved vendors'),
  ('quality:approved_vendors:create', 'quality', 'approved_vendors:create', 'Create approved vendors'),
  ('quality:approved_vendors:edit', 'quality', 'approved_vendors:edit', 'Edit approved vendors'),
  ('quality:approved_vendors:delete', 'quality', 'approved_vendors:delete', 'Delete approved vendors')
ON CONFLICT (permission_code) DO NOTHING;

-- Risk Management
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('risks:view', 'risks', 'view', 'View risks'),
  ('risks:create', 'risks', 'create', 'Create risks'),
  ('risks:edit', 'risks', 'edit', 'Edit risks'),
  ('risks:delete', 'risks', 'delete', 'Delete risks'),
  ('risks:insurance_documents:view', 'risks', 'insurance_documents:view', 'View insurance documents'),
  ('risks:insurance_documents:create', 'risks', 'insurance_documents:create', 'Create insurance documents'),
  ('risks:insurance_documents:edit', 'risks', 'insurance_documents:edit', 'Edit insurance documents'),
  ('risks:insurance_documents:delete', 'risks', 'insurance_documents:delete', 'Delete insurance documents')
ON CONFLICT (permission_code) DO NOTHING;

-- Procurement
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('procurement:view', 'procurement', 'view', 'View procurement'),
  ('procurement:purchase_orders:view', 'procurement', 'purchase_orders:view', 'View purchase orders'),
  ('procurement:purchase_orders:create', 'procurement', 'purchase_orders:create', 'Create purchase orders'),
  ('procurement:purchase_orders:edit', 'procurement', 'purchase_orders:edit', 'Edit purchase orders'),
  ('procurement:purchase_orders:delete', 'procurement', 'purchase_orders:delete', 'Delete purchase orders'),
  ('procurement:purchase_orders:approve', 'procurement', 'purchase_orders:approve', 'Approve purchase orders'),
  ('procurement:purchase_invoices:view', 'procurement', 'purchase_invoices:view', 'View purchase invoices'),
  ('procurement:purchase_invoices:create', 'procurement', 'purchase_invoices:create', 'Create purchase invoices'),
  ('procurement:purchase_invoices:edit', 'procurement', 'purchase_invoices:edit', 'Edit purchase invoices'),
  ('procurement:purchase_invoices:delete', 'procurement', 'purchase_invoices:delete', 'Delete purchase invoices'),
  ('procurement:purchase_invoices:post', 'procurement', 'purchase_invoices:post', 'Post purchase invoices'),
  ('procurement:vendor_contracts:view', 'procurement', 'vendor_contracts:view', 'View vendor contracts'),
  ('procurement:vendor_contracts:create', 'procurement', 'vendor_contracts:create', 'Create vendor contracts'),
  ('procurement:vendor_contracts:edit', 'procurement', 'vendor_contracts:edit', 'Edit vendor contracts'),
  ('procurement:vendor_contracts:delete', 'procurement', 'vendor_contracts:delete', 'Delete vendor contracts'),
  ('procurement:payments:view', 'procurement', 'payments:view', 'View procurement payments'),
  ('procurement:payments:create', 'procurement', 'payments:create', 'Create procurement payments'),
  ('procurement:payments:edit', 'procurement', 'payments:edit', 'Edit procurement payments'),
  ('procurement:payments:delete', 'procurement', 'payments:delete', 'Delete procurement payments'),
  ('procurement:payments:post', 'procurement', 'payments:post', 'Post procurement payments'),
  ('procurement:payments:allocate', 'procurement', 'payments:allocate', 'Allocate procurement payments'),
  ('procurement:reports:export', 'procurement', 'reports:export', 'Export procurement reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Shipment Alerts
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('logistics:shipment_alerts:view', 'logistics', 'shipment_alerts:view', 'View shipment alerts'),
  ('logistics:shipment_alerts:manage', 'logistics', 'shipment_alerts:manage', 'Manage shipment alerts')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Cost Types
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('logistics:shipment_cost_types:view', 'logistics', 'shipment_cost_types:view', 'View shipment cost types'),
  ('logistics:shipment_cost_types:create', 'logistics', 'shipment_cost_types:create', 'Create shipment cost types'),
  ('logistics:shipment_cost_types:edit', 'logistics', 'shipment_cost_types:edit', 'Edit shipment cost types'),
  ('logistics:shipment_cost_types:delete', 'logistics', 'shipment_cost_types:delete', 'Delete shipment cost types')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Landed Cost
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('logistics:landed_cost_allocation:view', 'logistics', 'landed_cost_allocation:view', 'View landed cost allocation'),
  ('logistics:landed_cost_allocation:manage', 'logistics', 'landed_cost_allocation:manage', 'Manage landed cost allocation'),
  ('logistics:landed_cost_settings:view', 'logistics', 'landed_cost_settings:view', 'View landed cost settings'),
  ('logistics:landed_cost_settings:manage', 'logistics', 'landed_cost_settings:manage', 'Manage landed cost settings'),
  ('logistics:duty_calculation:view', 'logistics', 'duty_calculation:view', 'View duty calculation'),
  ('logistics:duty_calculation:manage', 'logistics', 'duty_calculation:manage', 'Manage duty calculation')
ON CONFLICT (permission_code) DO NOTHING;

-- System Setup & Languages
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('system_setup:view', 'system_setup', 'view', 'View system setup'),
  ('system_setup:edit', 'system_setup', 'edit', 'Edit system setup'),
  ('languages:view', 'languages', 'view', 'View languages'),
  ('languages:create', 'languages', 'create', 'Create languages'),
  ('languages:edit', 'languages', 'edit', 'Edit languages'),
  ('languages:delete', 'languages', 'delete', 'Delete languages')
ON CONFLICT (permission_code) DO NOTHING;

-- Help Requests
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
  ('help_requests:view', 'help_requests', 'view', 'View help requests'),
  ('help_requests:manage', 'help_requests', 'manage', 'Manage help requests')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- تعيين الصلاحيات للأدوار الأساسية
-- Assign basic permissions to Admin role
-- =====================================================

DO $$
DECLARE
  admin_role_id INTEGER;
  viewer_role_id INTEGER;
  manager_role_id INTEGER;
  perm_id INTEGER;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' LIMIT 1;
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'Viewer' LIMIT 1;
  SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' LIMIT 1;

  -- Assign dashboard:statistics:view to all roles
  SELECT id INTO perm_id FROM permissions WHERE permission_code = 'dashboard:statistics:view';
  IF perm_id IS NOT NULL THEN
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
    IF viewer_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (viewer_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
    IF manager_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (manager_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Assign all new view permissions to Viewer role
  IF viewer_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code LIKE '%:view' 
      AND permission_code NOT LIKE 'users:%' AND permission_code NOT LIKE 'roles:%'
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (viewer_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Assign core permissions to Admin role
  IF admin_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        'dashboard:statistics:view',
        'shipments:view', 'shipments:create', 'shipments:edit', 'shipments:delete',
        'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
        'warehouses:view', 'warehouses:create', 'warehouses:edit', 'warehouses:delete',
        'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
        'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_status', 'users:assign_roles',
        'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
        'quality:view', 'quality:create', 'quality:edit', 'quality:delete',
        'risks:view', 'risks:create', 'risks:edit', 'risks:delete',
        'procurement:view',
        'help_requests:view', 'help_requests:manage'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Assign manager permissions
  IF manager_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        'dashboard:statistics:view',
        'shipments:view', 'shipments:create', 'shipments:edit',
        'expenses:view', 'expenses:create', 'expenses:edit',
        'warehouses:view',
        'suppliers:view',
        'quality:view',
        'risks:view',
        'procurement:view'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (manager_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Summary
SELECT 'Missing permissions added successfully!' AS status;
SELECT COUNT(*) AS total_permissions FROM permissions;
