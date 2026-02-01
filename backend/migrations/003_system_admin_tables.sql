-- Companies Table (Multi-tenant ready)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    legal_name VARCHAR(255),
    tax_number VARCHAR(100),
    registration_number VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_headquarters BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

-- System Settings Table (Key-Value store)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    category VARCHAR(50) DEFAULT 'general', -- general, security, appearance, notifications
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can be accessed without authentication
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- create, update, delete, view, approve, etc.
    resource VARCHAR(100) NOT NULL, -- companies, branches, users, etc.
    resource_id INTEGER,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table (Expanded)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'companies:create'
    resource VARCHAR(50) NOT NULL, -- e.g., 'companies'
    action VARCHAR(50) NOT NULL, -- e.g., 'create'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, category, description, is_public) VALUES
    ('session_timeout', '30', 'number', 'security', 'Session timeout in minutes', false),
    ('password_min_length', '8', 'number', 'security', 'Minimum password length', false),
    ('password_require_uppercase', 'true', 'boolean', 'security', 'Require uppercase in passwords', false),
    ('password_require_number', 'true', 'boolean', 'security', 'Require numbers in passwords', false),
    ('password_require_special', 'false', 'boolean', 'security', 'Require special characters in passwords', false),
    ('default_language', 'en', 'string', 'general', 'Default system language', true),
    ('default_theme', 'light', 'string', 'appearance', 'Default theme (light/dark)', true),
    ('date_format', 'YYYY-MM-DD', 'string', 'general', 'Default date format', true),
    ('time_format', 'HH:mm', 'string', 'general', 'Default time format', true),
    ('currency_symbol', '$', 'string', 'general', 'Default currency symbol', true),
    ('items_per_page', '20', 'number', 'general', 'Default pagination size', true)
ON CONFLICT (key) DO NOTHING;

-- Insert core permissions for Companies module
INSERT INTO permissions (permission_code, resource, action, description) VALUES
    ('companies:view', 'companies', 'view', 'View companies'),
    ('companies:create', 'companies', 'create', 'Create companies'),
    ('companies:edit', 'companies', 'edit', 'Edit companies'),
    ('companies:delete', 'companies', 'delete', 'Delete companies'),
    ('companies:export', 'companies', 'export', 'Export companies'),
    
    ('branches:view', 'branches', 'view', 'View branches'),
    ('branches:create', 'branches', 'create', 'Create branches'),
    ('branches:edit', 'branches', 'edit', 'Edit branches'),
    ('branches:delete', 'branches', 'delete', 'Delete branches'),
    ('branches:export', 'branches', 'export', 'Export branches'),
    
    ('audit_logs:view', 'audit_logs', 'view', 'View audit logs'),
    ('audit_logs:export', 'audit_logs', 'export', 'Export audit logs'),
    
    ('system_settings:view', 'system_settings', 'view', 'View system settings'),
    ('system_settings:edit', 'system_settings', 'edit', 'Edit system settings')
ON CONFLICT (permission_code) DO NOTHING;
