-- ============================================================================
-- Migration 445: Create missing tax, customs, ZATCA tables
-- ============================================================================

-- 1. Withholding Tax Rates
CREATE TABLE IF NOT EXISTS withholding_tax_rates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  rate_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  resident_rate NUMERIC(8,4) DEFAULT 0,
  non_resident_rate NUMERIC(8,4) DEFAULT 0,
  treaty_rate NUMERIC(8,4),
  income_type VARCHAR(100),
  applies_to VARCHAR(50) DEFAULT 'both', -- resident, non_resident, both
  country_id INTEGER REFERENCES countries(id),
  zatca_code VARCHAR(50),
  effective_from DATE,
  effective_to DATE,
  min_amount NUMERIC(18,4) DEFAULT 0,
  max_amount NUMERIC(18,4),
  gl_account_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 2. Tax Categories
CREATE TABLE IF NOT EXISTS tax_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  category_type VARCHAR(50) DEFAULT 'standard', -- standard, zero_rated, exempt, reverse_charge
  parent_id INTEGER REFERENCES tax_categories(id),
  zatca_category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 3. Tax Exemptions
CREATE TABLE IF NOT EXISTS tax_exemptions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  exemption_type VARCHAR(50) DEFAULT 'full', -- full, partial, conditional
  tax_type_id INTEGER REFERENCES tax_types(id),
  exemption_rate NUMERIC(8,4) DEFAULT 100,
  authority VARCHAR(200),
  legal_reference VARCHAR(200),
  certificate_number VARCHAR(100),
  effective_from DATE,
  effective_to DATE,
  conditions TEXT,
  applicable_items TEXT, -- JSON array of item categories
  zatca_exemption_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 4. Customs Fee Categories
CREATE TABLE IF NOT EXISTS customs_fee_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  fee_type VARCHAR(50) DEFAULT 'fixed', -- fixed, percentage, per_unit, tiered
  rate_percent NUMERIC(8,4),
  fixed_amount NUMERIC(18,4),
  currency_code VARCHAR(3) DEFAULT 'SAR',
  calculation_base VARCHAR(50) DEFAULT 'cif_value', -- cif_value, fob_value, quantity, weight
  min_fee NUMERIC(18,4),
  max_fee NUMERIC(18,4),
  applies_to VARCHAR(100), -- import, export, transit, all
  gl_account_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 5. Clearance Documents
CREATE TABLE IF NOT EXISTS clearance_documents (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  document_number VARCHAR(50),
  document_type VARCHAR(50) NOT NULL, -- bill_of_lading, commercial_invoice, packing_list, certificate_of_origin, insurance_certificate, customs_declaration, health_certificate, phytosanitary_certificate
  declaration_id INTEGER REFERENCES customs_declarations(id),
  shipment_id INTEGER,
  reference_number VARCHAR(100),
  title VARCHAR(200),
  title_ar VARCHAR(200),
  issuing_authority VARCHAR(200),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(30) DEFAULT 'pending', -- pending, submitted, approved, rejected, expired
  file_path VARCHAR(500),
  file_name VARCHAR(200),
  file_size INTEGER,
  mime_type VARCHAR(100),
  notes TEXT,
  verified_by INTEGER,
  verified_at TIMESTAMP,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 6. ZATCA Codes (for ZATCA integration reference data)
CREATE TABLE IF NOT EXISTS zatca_codes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  code_type VARCHAR(50) NOT NULL, -- vat_category, unit_of_measure, payment_method, invoice_type, exemption_reason
  parent_code VARCHAR(50),
  zatca_id VARCHAR(50),
  is_b2b BOOLEAN DEFAULT false,
  is_b2c BOOLEAN DEFAULT false,
  version VARCHAR(20),
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 7. ZATCA Config
CREATE TABLE IF NOT EXISTS zatca_config (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  config_type VARCHAR(30) DEFAULT 'string', -- string, boolean, number, json
  category VARCHAR(50) DEFAULT 'general', -- general, api, certificate, invoice, compliance
  description TEXT,
  description_ar TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, config_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withholding_tax_rates_company ON withholding_tax_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_categories_company ON tax_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_company ON tax_exemptions(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_fee_categories_company ON customs_fee_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_clearance_documents_company ON clearance_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_clearance_documents_declaration ON clearance_documents(declaration_id);
CREATE INDEX IF NOT EXISTS idx_zatca_codes_company ON zatca_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_zatca_codes_type ON zatca_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_zatca_config_company ON zatca_config(company_id);
