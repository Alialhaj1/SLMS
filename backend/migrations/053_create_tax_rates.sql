-- =====================================================
-- Migration 053: Create Tax Rates
-- Adds company-scoped tax_rates table (soft delete) used by /api/tax-rates
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  tax_type_id INTEGER REFERENCES tax_types(id),
  rate DECIMAL(10, 4) NOT NULL,
  min_amount DECIMAL(18, 4),
  max_amount DECIMAL(18, 4),
  effective_from DATE NOT NULL,
  effective_to DATE,
  region VARCHAR(100),
  item_category VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_company_id ON tax_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_tax_type_id ON tax_rates(tax_type_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_is_default ON tax_rates(company_id, is_default);

-- Permissions (frontend currently checks master:tax:*; tolerate both namespaces)
INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
('master:tax:view', 'master:tax', 'view', 'View tax master data', 'Master'),
('master:tax:create', 'master:tax', 'create', 'Create tax master data', 'Master'),
('master:tax:update', 'master:tax', 'edit', 'Update tax master data', 'Master'),
('master:tax:delete', 'master:tax', 'delete', 'Delete tax master data', 'Master')
ON CONFLICT (permission_code) DO NOTHING;
