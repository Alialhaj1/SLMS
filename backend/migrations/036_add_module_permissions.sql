-- =====================================================
-- Migration 036: Add Module Permissions
-- Add new module-level permissions for Inventory, Partners, Logistics, Tax, Finance, HR, Documents
-- And automatically assign ALL permissions to super_admin
-- =====================================================

-- Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_code VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  module VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert new module permissions (ignore if already exists)
INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
-- Inventory Module
('inventory:view', 'inventory', 'view', 'View inventory module', 'Inventory'),
('inventory:items:view', 'inventory:items', 'view', 'View items', 'Inventory'),
('inventory:items:create', 'inventory:items', 'create', 'Create items', 'Inventory'),
('inventory:items:edit', 'inventory:items', 'edit', 'Edit items', 'Inventory'),
('inventory:items:delete', 'inventory:items', 'delete', 'Delete items', 'Inventory'),
('inventory:categories:view', 'inventory:categories', 'view', 'View categories', 'Inventory'),
('inventory:categories:create', 'inventory:categories', 'create', 'Create categories', 'Inventory'),
('inventory:categories:edit', 'inventory:categories', 'edit', 'Edit categories', 'Inventory'),
('inventory:categories:delete', 'inventory:categories', 'delete', 'Delete categories', 'Inventory'),
('inventory:warehouses:view', 'inventory:warehouses', 'view', 'View warehouses', 'Inventory'),
('inventory:warehouses:create', 'inventory:warehouses', 'create', 'Create warehouses', 'Inventory'),
('inventory:warehouses:edit', 'inventory:warehouses', 'edit', 'Edit warehouses', 'Inventory'),
('inventory:warehouses:delete', 'inventory:warehouses', 'delete', 'Delete warehouses', 'Inventory'),
('inventory:stock:view', 'inventory:stock', 'view', 'View stock', 'Inventory'),
('inventory:stock:adjust', 'inventory:stock', 'adjust', 'Adjust stock', 'Inventory'),
('inventory:stock:transfer', 'inventory:stock', 'transfer', 'Transfer stock', 'Inventory'),
('inventory:stock:count', 'inventory:stock', 'count', 'Count stock', 'Inventory'),

-- Partners Module (Customers & Suppliers)
('partners:view', 'partners', 'view', 'View partners module', 'Partners'),
('partners:customers:view', 'partners:customers', 'view', 'View customers', 'Partners'),
('partners:customers:create', 'partners:customers', 'create', 'Create customers', 'Partners'),
('partners:customers:edit', 'partners:customers', 'edit', 'Edit customers', 'Partners'),
('partners:customers:delete', 'partners:customers', 'delete', 'Delete customers', 'Partners'),
('partners:vendors:view', 'partners:vendors', 'view', 'View vendors', 'Partners'),
('partners:vendors:create', 'partners:vendors', 'create', 'Create vendors', 'Partners'),
('partners:vendors:edit', 'partners:vendors', 'edit', 'Edit vendors', 'Partners'),
('partners:vendors:delete', 'partners:vendors', 'delete', 'Delete vendors', 'Partners'),

-- Logistics Module
('logistics:view', 'logistics', 'view', 'View logistics module', 'Logistics'),
('logistics:shipping_lines:view', 'logistics:shipping_lines', 'view', 'View shipping lines', 'Logistics'),
('logistics:shipping_lines:create', 'logistics:shipping_lines', 'create', 'Create shipping lines', 'Logistics'),
('logistics:shipping_lines:edit', 'logistics:shipping_lines', 'edit', 'Edit shipping lines', 'Logistics'),
('logistics:shipping_lines:delete', 'logistics:shipping_lines', 'delete', 'Delete shipping lines', 'Logistics'),
('logistics:ports:view', 'logistics:ports', 'view', 'View ports', 'Logistics'),
('logistics:ports:create', 'logistics:ports', 'create', 'Create ports', 'Logistics'),
('logistics:ports:edit', 'logistics:ports', 'edit', 'Edit ports', 'Logistics'),
('logistics:ports:delete', 'logistics:ports', 'delete', 'Delete ports', 'Logistics'),
('logistics:customs:view', 'logistics:customs', 'view', 'View customs', 'Logistics'),
('logistics:customs:create', 'logistics:customs', 'create', 'Create customs', 'Logistics'),
('logistics:customs:edit', 'logistics:customs', 'edit', 'Edit customs', 'Logistics'),
('logistics:customs:delete', 'logistics:customs', 'delete', 'Delete customs', 'Logistics'),

-- Customs calculation engine (Frontend-aligned)
('logistics:hs_codes:view', 'logistics:hs_codes', 'view', 'View HS Codes', 'Logistics'),
('logistics:hs_codes:create', 'logistics:hs_codes', 'create', 'Create HS Codes', 'Logistics'),
('logistics:hs_codes:edit', 'logistics:hs_codes', 'edit', 'Edit HS Codes', 'Logistics'),
('logistics:hs_codes:delete', 'logistics:hs_codes', 'delete', 'Delete HS Codes', 'Logistics'),
('logistics:customs_tariffs:view', 'logistics:customs_tariffs', 'view', 'View Customs Tariffs', 'Logistics'),
('logistics:customs_tariffs:create', 'logistics:customs_tariffs', 'create', 'Create Customs Tariffs', 'Logistics'),
('logistics:customs_tariffs:edit', 'logistics:customs_tariffs', 'edit', 'Edit Customs Tariffs', 'Logistics'),
('logistics:customs_tariffs:delete', 'logistics:customs_tariffs', 'delete', 'Delete Customs Tariffs', 'Logistics'),
('logistics:customs_exemptions:view', 'logistics:customs_exemptions', 'view', 'View Customs Exemptions', 'Logistics'),
('logistics:customs_exemptions:create', 'logistics:customs_exemptions', 'create', 'Create Customs Exemptions', 'Logistics'),
('logistics:customs_exemptions:edit', 'logistics:customs_exemptions', 'edit', 'Edit Customs Exemptions', 'Logistics'),
('logistics:customs_exemptions:delete', 'logistics:customs_exemptions', 'delete', 'Delete Customs Exemptions', 'Logistics'),

-- Shipment lifecycle engine (Frontend-aligned)
('logistics:shipment_lifecycle_statuses:view', 'logistics:shipment_lifecycle_statuses', 'view', 'View Shipment Lifecycle Statuses', 'Logistics'),
('logistics:shipment_lifecycle_statuses:create', 'logistics:shipment_lifecycle_statuses', 'create', 'Create Shipment Lifecycle Statuses', 'Logistics'),
('logistics:shipment_lifecycle_statuses:edit', 'logistics:shipment_lifecycle_statuses', 'edit', 'Edit Shipment Lifecycle Statuses', 'Logistics'),
('logistics:shipment_lifecycle_statuses:delete', 'logistics:shipment_lifecycle_statuses', 'delete', 'Delete Shipment Lifecycle Statuses', 'Logistics'),
('logistics:shipment_stages:view', 'logistics:shipment_stages', 'view', 'View Shipment Stages', 'Logistics'),
('logistics:shipment_stages:create', 'logistics:shipment_stages', 'create', 'Create Shipment Stages', 'Logistics'),
('logistics:shipment_stages:edit', 'logistics:shipment_stages', 'edit', 'Edit Shipment Stages', 'Logistics'),
('logistics:shipment_stages:delete', 'logistics:shipment_stages', 'delete', 'Delete Shipment Stages', 'Logistics'),
('logistics:shipment_event_log:view', 'logistics:shipment_event_log', 'view', 'View Shipment Event Log', 'Logistics'),
('logistics:shipment_event_log:export', 'logistics:shipment_event_log', 'export', 'Export Shipment Event Log', 'Logistics'),
('logistics:shipment_document_requirements:view', 'logistics:shipment_document_requirements', 'view', 'View Shipment Document Requirements', 'Logistics'),
('logistics:shipment_document_requirements:manage', 'logistics:shipment_document_requirements', 'manage', 'Manage Shipment Document Requirements', 'Logistics'),

-- Tax Module
('tax:view', 'tax', 'view', 'View tax module', 'Tax'),
('tax:rates:view', 'tax:rates', 'view', 'View tax rates', 'Tax'),
('tax:rates:create', 'tax:rates', 'create', 'Create tax rates', 'Tax'),
('tax:rates:edit', 'tax:rates', 'edit', 'Edit tax rates', 'Tax'),
('tax:rates:delete', 'tax:rates', 'delete', 'Delete tax rates', 'Tax'),
('tax:codes:view', 'tax:codes', 'view', 'View tax codes', 'Tax'),
('tax:codes:create', 'tax:codes', 'create', 'Create tax codes', 'Tax'),
('tax:codes:edit', 'tax:codes', 'edit', 'Edit tax codes', 'Tax'),
('tax:codes:delete', 'tax:codes', 'delete', 'Delete tax codes', 'Tax'),
('tax:zatca:view', 'tax:zatca', 'view', 'View ZATCA integration', 'Tax'),
('tax:zatca:manage', 'tax:zatca', 'manage', 'Manage ZATCA integration', 'Tax'),

-- Finance Module
('finance:view', 'finance', 'view', 'View finance module', 'Finance'),
('finance:coa:view', 'finance:coa', 'view', 'View chart of accounts', 'Finance'),
('finance:coa:create', 'finance:coa', 'create', 'Create chart of accounts', 'Finance'),
('finance:coa:edit', 'finance:coa', 'edit', 'Edit chart of accounts', 'Finance'),
('finance:coa:delete', 'finance:coa', 'delete', 'Delete chart of accounts', 'Finance'),
('finance:bank_accounts:view', 'finance:bank_accounts', 'view', 'View bank accounts', 'Finance'),
('finance:bank_accounts:create', 'finance:bank_accounts', 'create', 'Create bank accounts', 'Finance'),
('finance:bank_accounts:edit', 'finance:bank_accounts', 'edit', 'Edit bank accounts', 'Finance'),
('finance:bank_accounts:delete', 'finance:bank_accounts', 'delete', 'Delete bank accounts', 'Finance'),
('finance:periods:view', 'finance:periods', 'view', 'View fiscal periods', 'Finance'),
('finance:periods:manage', 'finance:periods', 'manage', 'Manage fiscal periods', 'Finance'),

-- HR Module
('hr:view', 'hr', 'view', 'View HR module', 'HR'),
('hr:departments:view', 'hr:departments', 'view', 'View departments', 'HR'),
('hr:departments:create', 'hr:departments', 'create', 'Create departments', 'HR'),
('hr:departments:edit', 'hr:departments', 'edit', 'Edit departments', 'HR'),
('hr:departments:delete', 'hr:departments', 'delete', 'Delete departments', 'HR'),
('hr:jobs:view', 'hr:jobs', 'view', 'View job titles', 'HR'),
('hr:jobs:create', 'hr:jobs', 'create', 'Create job titles', 'HR'),
('hr:jobs:edit', 'hr:jobs', 'edit', 'Edit job titles', 'HR'),
('hr:jobs:delete', 'hr:jobs', 'delete', 'Delete job titles', 'HR'),
('hr:contracts:view', 'hr:contracts', 'view', 'View contracts', 'HR'),
('hr:contracts:create', 'hr:contracts', 'create', 'Create contracts', 'HR'),
('hr:contracts:edit', 'hr:contracts', 'edit', 'Edit contracts', 'HR'),
('hr:contracts:delete', 'hr:contracts', 'delete', 'Delete contracts', 'HR'),
('hr:payroll:view', 'hr:payroll', 'view', 'View payroll', 'HR'),
('hr:payroll:manage', 'hr:payroll', 'manage', 'Manage payroll', 'HR'),

-- Documents Module
('documents:view', 'documents', 'view', 'View documents module', 'Documents'),
('documents:types:view', 'documents:types', 'view', 'View document types', 'Documents'),
('documents:types:create', 'documents:types', 'create', 'Create document types', 'Documents'),
('documents:types:edit', 'documents:types', 'edit', 'Edit document types', 'Documents'),
('documents:types:delete', 'documents:types', 'delete', 'Delete document types', 'Documents'),
('documents:workflows:view', 'documents:workflows', 'view', 'View approval workflows', 'Documents'),
('documents:workflows:create', 'documents:workflows', 'create', 'Create approval workflows', 'Documents'),
('documents:workflows:edit', 'documents:workflows', 'edit', 'Edit approval workflows', 'Documents'),
('documents:workflows:delete', 'documents:workflows', 'delete', 'Delete approval workflows', 'Documents'),
('documents:templates:view', 'documents:templates', 'view', 'View templates', 'Documents'),
('documents:templates:create', 'documents:templates', 'create', 'Create templates', 'Documents'),
('documents:templates:edit', 'documents:templates', 'edit', 'Edit templates', 'Documents'),
('documents:templates:delete', 'documents:templates', 'delete', 'Delete templates', 'Documents'),

-- Master (Generic for all master data)
('master:view', 'master', 'view', 'View master data', 'Master'),
('master:create', 'master', 'create', 'Create master data', 'Master'),
('master:edit', 'master', 'edit', 'Edit master data', 'Master'),
('master:delete', 'master', 'delete', 'Delete master data', 'Master')

ON CONFLICT (permission_code) DO NOTHING;

-- Update super_admin role to have ALL permissions (using JSONB array in permissions column)
DO $$
DECLARE
    all_permissions JSONB;
    super_admin_id INTEGER;
BEGIN
    -- Get all permission codes from the permissions table
    SELECT jsonb_agg(permission_code)
    INTO all_permissions
    FROM permissions;

    -- Get super_admin role id
    SELECT id INTO super_admin_id
    FROM roles
    WHERE name = 'super_admin' OR name = 'Super Admin'
    LIMIT 1;

    -- Update super_admin with all permissions
    IF super_admin_id IS NOT NULL AND all_permissions IS NOT NULL THEN
        UPDATE roles
        SET permissions = all_permissions,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = super_admin_id;
        
        RAISE NOTICE 'Updated super_admin role with % permissions', jsonb_array_length(all_permissions);
    ELSE
        RAISE NOTICE 'super_admin role not found or no permissions exist';
    END IF;
END $$;

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);
