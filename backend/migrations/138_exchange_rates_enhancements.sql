-- =============================================
-- Migration 138: Exchange Rates Enhancements
-- =============================================
-- Purpose: Add missing columns and permissions for Exchange Rates module
-- Date: Auto-generated

BEGIN;

-- =============================================
-- 1. Add missing columns to exchange_rates table
-- =============================================

-- Add deleted_at for soft deletes
ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add updated_at and updated_by for tracking changes
ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NULL;

ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- =============================================
-- 2. Add Exchange Rates Permissions
-- =============================================

-- Insert permissions if they don't exist
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('exchange_rates:view', 'exchange_rates', 'view', 'View exchange rates'),
    ('exchange_rates:create', 'exchange_rates', 'create', 'Create exchange rates'),
    ('exchange_rates:update', 'exchange_rates', 'update', 'Update exchange rates'),
    ('exchange_rates:delete', 'exchange_rates', 'delete', 'Delete exchange rates'),
    ('exchange_rates:sync_api', 'exchange_rates', 'sync_api', 'Sync exchange rates from external API')
ON CONFLICT (permission_code) DO NOTHING;

-- =============================================
-- 3. Grant Permissions to Roles
-- =============================================

-- Grant all exchange rates permissions to super_admin and admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
  AND p.permission_code IN (
    'exchange_rates:view',
    'exchange_rates:create',
    'exchange_rates:update',
    'exchange_rates:delete',
    'exchange_rates:sync_api'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant view and create to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.permission_code IN (
    'exchange_rates:view',
    'exchange_rates:create'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant view only to user
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.permission_code = 'exchange_rates:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- 4. Create Indexes for Performance
-- =============================================

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company_currencies_date 
ON exchange_rates(company_id, from_currency_id, to_currency_id, rate_date DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_active 
ON exchange_rates(is_active)
WHERE deleted_at IS NULL;

COMMIT;
