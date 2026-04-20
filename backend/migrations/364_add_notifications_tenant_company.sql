-- Migration: Add tenant_id and company_id columns to notifications table
-- These columns are required by NotificationService for tenant isolation

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- Index for tenant-scoped notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id) WHERE company_id IS NOT NULL;
