-- Migration 007: Create Role Templates Table
-- Purpose: Store predefined role templates with preset permissions for quick role creation
-- Phase 4B Feature 1: Role Templates

-- =============================================
-- 1. Create role_templates table
-- =============================================
CREATE TABLE IF NOT EXISTS role_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    category VARCHAR(50), -- e.g., 'administrative', 'operational', 'readonly'
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. Create index for faster lookups
-- =============================================
CREATE INDEX IF NOT EXISTS idx_role_templates_category ON role_templates(category);
CREATE INDEX IF NOT EXISTS idx_role_templates_is_system ON role_templates(is_system);

-- =============================================
-- 3. Seed 5 Preset Role Templates
-- =============================================

-- Template 1: System Administrator (Full Access)
INSERT INTO role_templates (name, description, permissions, category, is_system) VALUES (
    'System Administrator',
    'Full system access with all permissions including user management, role management, and system settings',
    '["users:view", "users:create", "users:edit", "users:delete", "roles:view", "roles:create", "roles:edit", "roles:delete", "companies:view", "companies:create", "companies:edit", "companies:delete", "branches:view", "branches:create", "branches:edit", "branches:delete", "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete", "products:view", "products:create", "products:edit", "products:delete", "shipments:view", "shipments:create", "shipments:edit", "shipments:delete", "expenses:view", "expenses:create", "expenses:edit", "expenses:delete", "settings:view", "settings:edit", "audit_logs:view"]'::jsonb,
    'administrative',
    true
) ON CONFLICT (name) DO NOTHING;

-- Template 2: Operations Manager (Operations + View Admin)
INSERT INTO role_templates (name, description, permissions, category, is_system) VALUES (
    'Operations Manager',
    'Manage shipments, products, suppliers, and branches. Can view users and roles but cannot modify them',
    '["users:view", "roles:view", "companies:view", "companies:edit", "branches:view", "branches:create", "branches:edit", "branches:delete", "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete", "products:view", "products:create", "products:edit", "products:delete", "shipments:view", "shipments:create", "shipments:edit", "shipments:delete", "expenses:view", "expenses:create", "expenses:edit", "expenses:delete", "settings:view", "audit_logs:view"]'::jsonb,
    'operational',
    true
) ON CONFLICT (name) DO NOTHING;

-- Template 3: Accountant (Financial Operations)
INSERT INTO role_templates (name, description, permissions, category, is_system) VALUES (
    'Accountant',
    'Manage expenses, view shipments and financial reports. Cannot modify operational data',
    '["companies:view", "branches:view", "suppliers:view", "products:view", "shipments:view", "expenses:view", "expenses:create", "expenses:edit", "expenses:delete", "settings:view", "audit_logs:view"]'::jsonb,
    'financial',
    true
) ON CONFLICT (name) DO NOTHING;

-- Template 4: Warehouse Staff (Operational Only)
INSERT INTO role_templates (name, description, permissions, category, is_system) VALUES (
    'Warehouse Staff',
    'Manage shipments and products. Basic operational access without financial or administrative permissions',
    '["suppliers:view", "products:view", "products:create", "products:edit", "shipments:view", "shipments:create", "shipments:edit", "expenses:view"]'::jsonb,
    'operational',
    true
) ON CONFLICT (name) DO NOTHING;

-- Template 5: Read-Only Viewer (Reporting & Audit)
INSERT INTO role_templates (name, description, permissions, category, is_system) VALUES (
    'Read-Only Viewer',
    'View-only access to all data for reporting and auditing purposes. Cannot create, edit, or delete anything',
    '["users:view", "roles:view", "companies:view", "branches:view", "suppliers:view", "products:view", "shipments:view", "expenses:view", "settings:view", "audit_logs:view"]'::jsonb,
    'readonly',
    true
) ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 4. Comments for documentation
-- =============================================
COMMENT ON TABLE role_templates IS 'Predefined role templates with preset permissions for quick role creation';
COMMENT ON COLUMN role_templates.name IS 'Unique template name displayed to users';
COMMENT ON COLUMN role_templates.permissions IS 'JSON array of permission strings (e.g., ["users:view", "users:edit"])';
COMMENT ON COLUMN role_templates.category IS 'Template category: administrative, operational, financial, readonly';
COMMENT ON COLUMN role_templates.is_system IS 'System templates cannot be deleted or modified';

-- =============================================
-- 5. Verification Query (for testing)
-- =============================================
-- SELECT name, category, jsonb_array_length(permissions) as permission_count FROM role_templates ORDER BY category, name;
