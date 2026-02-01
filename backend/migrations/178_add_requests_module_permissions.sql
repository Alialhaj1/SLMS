-- =====================================================
-- Migration: 178_add_requests_module_permissions.sql
-- Description: Add permissions for Requests Module
--              (Expense Requests, Transfer Requests, Payment Requests)
-- Date: 2026-01-19
-- =====================================================

BEGIN;

-- =====================================================
-- EXPENSE TYPES PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('expense_types:view', 'expense_types', 'view', 'View expense types'),
('expense_types:create', 'expense_types', 'create', 'Create new expense types'),
('expense_types:update', 'expense_types', 'update', 'Update expense types'),
('expense_types:delete', 'expense_types', 'delete', 'Delete expense types')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- EXPENSE REQUESTS PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('expense_requests:view', 'expense_requests', 'view', 'View expense requests'),
('expense_requests:create', 'expense_requests', 'create', 'Create new expense requests'),
('expense_requests:update', 'expense_requests', 'update', 'Update expense requests'),
('expense_requests:delete', 'expense_requests', 'delete', 'Delete expense requests'),
('expense_requests:submit', 'expense_requests', 'submit', 'Submit expense requests for approval'),
('expense_requests:approve', 'expense_requests', 'approve', 'Approve or reject expense requests'),
('expense_requests:manage', 'expense_requests', 'manage', 'Full management of all expense requests')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- TRANSFER REQUESTS PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('transfer_requests:view', 'transfer_requests', 'view', 'View transfer requests'),
('transfer_requests:create', 'transfer_requests', 'create', 'Create new transfer requests'),
('transfer_requests:update', 'transfer_requests', 'update', 'Update transfer requests'),
('transfer_requests:delete', 'transfer_requests', 'delete', 'Delete transfer requests'),
('transfer_requests:submit', 'transfer_requests', 'submit', 'Submit transfer requests for approval'),
('transfer_requests:approve', 'transfer_requests', 'approve', 'Approve or reject transfer requests'),
('transfer_requests:execute', 'transfer_requests', 'execute', 'Execute approved transfer requests'),
('transfer_requests:print', 'transfer_requests', 'print', 'Print transfer requests'),
('transfer_requests:manage', 'transfer_requests', 'manage', 'Full management of all transfer requests')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- PAYMENT REQUESTS PERMISSIONS
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('payment_requests:view', 'payment_requests', 'view', 'View payment requests'),
('payment_requests:create', 'payment_requests', 'create', 'Create new payment requests'),
('payment_requests:update', 'payment_requests', 'update', 'Update payment requests'),
('payment_requests:delete', 'payment_requests', 'delete', 'Delete payment requests'),
('payment_requests:submit', 'payment_requests', 'submit', 'Submit payment requests for approval'),
('payment_requests:approve', 'payment_requests', 'approve', 'Approve or reject payment requests'),
('payment_requests:execute', 'payment_requests', 'execute', 'Execute approved payment requests'),
('payment_requests:print', 'payment_requests', 'print', 'Print payment requests'),
('payment_requests:manage', 'payment_requests', 'manage', 'Full management of all payment requests')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Assign to ADMIN role (full access)
DO $$
DECLARE
    admin_role_id INTEGER;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Expense Types
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions 
        WHERE permission_code IN (
            'expense_types:view', 'expense_types:create', 'expense_types:update', 'expense_types:delete'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Expense Requests
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions 
        WHERE permission_code IN (
            'expense_requests:view', 'expense_requests:create', 'expense_requests:update',
            'expense_requests:delete', 'expense_requests:submit', 'expense_requests:approve',
            'expense_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Transfer Requests
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions 
        WHERE permission_code IN (
            'transfer_requests:view', 'transfer_requests:create', 'transfer_requests:update',
            'transfer_requests:delete', 'transfer_requests:submit', 'transfer_requests:approve',
            'transfer_requests:execute', 'transfer_requests:print', 'transfer_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Payment Requests
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions 
        WHERE permission_code IN (
            'payment_requests:view', 'payment_requests:create', 'payment_requests:update',
            'payment_requests:delete', 'payment_requests:submit', 'payment_requests:approve',
            'payment_requests:execute', 'payment_requests:print', 'payment_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

-- Assign to MANAGER role (approval and execution)
DO $$
DECLARE
    manager_role_id INTEGER;
BEGIN
    SELECT id INTO manager_role_id FROM roles WHERE name = 'manager' LIMIT 1;
    
    IF manager_role_id IS NOT NULL THEN
        -- Expense Types (view only)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT manager_role_id, id FROM permissions 
        WHERE permission_code = 'expense_types:view'
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Expense Requests (view, create, submit, approve)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT manager_role_id, id FROM permissions 
        WHERE permission_code IN (
            'expense_requests:view', 'expense_requests:create', 'expense_requests:submit',
            'expense_requests:approve', 'expense_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Transfer Requests (full access)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT manager_role_id, id FROM permissions 
        WHERE permission_code IN (
            'transfer_requests:view', 'transfer_requests:create', 'transfer_requests:submit',
            'transfer_requests:approve', 'transfer_requests:execute', 'transfer_requests:print',
            'transfer_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Payment Requests (full access)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT manager_role_id, id FROM permissions 
        WHERE permission_code IN (
            'payment_requests:view', 'payment_requests:create', 'payment_requests:submit',
            'payment_requests:approve', 'payment_requests:execute', 'payment_requests:print',
            'payment_requests:manage'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

-- Assign to USER role (basic operations only)
DO $$
DECLARE
    user_role_id INTEGER;
BEGIN
    SELECT id INTO user_role_id FROM roles WHERE name = 'user' LIMIT 1;
    
    IF user_role_id IS NOT NULL THEN
        -- Expense Types (view only)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT user_role_id, id FROM permissions 
        WHERE permission_code = 'expense_types:view'
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Expense Requests (view own, create, submit)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT user_role_id, id FROM permissions 
        WHERE permission_code IN (
            'expense_requests:view', 'expense_requests:create', 'expense_requests:submit'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Transfer Requests (view own)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT user_role_id, id FROM permissions 
        WHERE permission_code IN (
            'transfer_requests:view', 'transfer_requests:print'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Payment Requests (view own)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT user_role_id, id FROM permissions 
        WHERE permission_code IN (
            'payment_requests:view', 'payment_requests:print'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE expense_types IS 'Reference data for expense categories (requires permissions: expense_types:view/create/update/delete)';
COMMENT ON TABLE expense_requests IS 'Expense requests module (requires permissions: expense_requests:view/create/update/delete/submit/approve/manage)';
COMMENT ON TABLE transfer_requests IS 'Transfer requests module (requires permissions: transfer_requests:view/create/update/delete/submit/approve/execute/print/manage)';
COMMENT ON TABLE payment_requests IS 'Payment requests module (requires permissions: payment_requests:view/create/update/delete/submit/approve/execute/print/manage)';

COMMIT;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
