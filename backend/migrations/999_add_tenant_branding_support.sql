-- Migration: Add tenant branding support to companies table
-- Adds branding columns needed for the dual login flow specification
-- Companies table serves as the tenant entity in the multi-tenant architecture

-- Add branding columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7); -- Hex color code
ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7); -- Hex color code
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_code VARCHAR(50) UNIQUE; -- User-friendly company code
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(20) DEFAULT 'customer'; -- customer, trial, enterprise
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'; -- active, trial, suspended, locked, terminated
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'; -- active, trial, expired, cancelled
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10) DEFAULT 'SAR';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(50) DEFAULT 'Asia/Riyadh';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'ar';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_tenant_code ON companies(tenant_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status) WHERE deleted_at IS NULL;

-- Update existing companies to have tenant_code if missing
UPDATE companies 
SET tenant_code = UPPER(code) 
WHERE tenant_code IS NULL AND code IS NOT NULL;

-- Add constraints
ALTER TABLE companies ADD CONSTRAINT check_primary_color_format 
  CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$');
  
ALTER TABLE companies ADD CONSTRAINT check_secondary_color_format 
  CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE companies ADD CONSTRAINT check_status_values 
  CHECK (status IN ('active', 'trial', 'suspended', 'locked', 'terminated'));

ALTER TABLE companies ADD CONSTRAINT check_subscription_status_values 
  CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'pending'));

-- Comments for documentation
COMMENT ON COLUMN companies.tenant_code IS 'User-friendly company identifier for login (e.g., ALHAJCO)';
COMMENT ON COLUMN companies.slug IS 'URL-friendly company identifier for direct access routes';
COMMENT ON COLUMN companies.logo_url IS 'Company logo URL for branding in login portal';  
COMMENT ON COLUMN companies.primary_color IS 'Primary brand color (hex code) for UI theming';
COMMENT ON COLUMN companies.secondary_color IS 'Secondary brand color (hex code) for UI theming';
COMMENT ON COLUMN companies.status IS 'Company account status (active, suspended, locked, etc.)';
COMMENT ON COLUMN companies.tenant_type IS 'Type of tenant (customer, trial, enterprise)';

-- Add sample tenant data if companies table is empty
INSERT INTO companies (
  code, name, name_ar, tenant_code, slug, 
  primary_color, secondary_color, logo_url,
  status, tenant_type, subscription_status,
  is_active, is_default, created_at, updated_at
) VALUES 
(
  'COMP-001', 
  'Al Hajiry Group', 
  'مجموعة الحاجري',
  'ALHAJCO',
  'alhajco',
  '#1e40af', -- Blue
  '#6366f1', -- Indigo  
  NULL,
  'active',
  'enterprise',
  'active',
  TRUE,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET 
  tenant_code = EXCLUDED.tenant_code,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar
WHERE companies.tenant_code IS NULL;

-- Create a view for public tenant information (used by login)
CREATE OR REPLACE VIEW public_tenant_info AS
SELECT 
  id,
  tenant_code,
  name,
  name_ar,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  status,
  tenant_type
FROM companies 
WHERE deleted_at IS NULL 
  AND status IN ('active', 'trial')
  AND tenant_code IS NOT NULL;

COMMENT ON VIEW public_tenant_info IS 'Public tenant information for login portal (excludes sensitive data)';