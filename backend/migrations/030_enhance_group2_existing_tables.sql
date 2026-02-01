-- Migration 030: Group 2 Enhancement - Add Missing Columns to Existing Tables
-- Date: 2025-12-25
-- Description: Enhance existing reference tables (countries, cities, currencies, ports, customs_offices) with bilingual support, soft delete, and audit trail

-- =====================================================
-- 1. Enhance COUNTRIES table
-- =====================================================
-- Add missing columns
ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS continent VARCHAR(50);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS capital_en VARCHAR(255);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS capital_ar VARCHAR(255);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS alpha_2 VARCHAR(2);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data (copy name to name_en if name_en is null)
UPDATE countries SET name_en = name WHERE name_en IS NULL;
UPDATE countries SET alpha_2 = code_2 WHERE alpha_2 IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_countries_company_id ON countries(company_id);
CREATE INDEX IF NOT EXISTS idx_countries_alpha_2 ON countries(alpha_2);
CREATE INDEX IF NOT EXISTS idx_countries_deleted_at ON countries(deleted_at);

COMMENT ON COLUMN countries.name_en IS 'English name (standardized)';
COMMENT ON COLUMN countries.name_ar IS 'Arabic name';
COMMENT ON COLUMN countries.continent IS 'Continent (Asia, Europe, Africa, etc.)';

-- =====================================================
-- 2. Enhance CITIES table
-- =====================================================
-- Add missing columns
ALTER TABLE cities ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS state_province_en VARCHAR(255);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS state_province_ar VARCHAR(255);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS is_capital BOOLEAN DEFAULT FALSE;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data
UPDATE cities SET name_en = name WHERE name_en IS NULL;
UPDATE cities SET state_province_en = state_province WHERE state_province_en IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_cities_company_id ON cities(company_id);
CREATE INDEX IF NOT EXISTS idx_cities_deleted_at ON cities(deleted_at);

-- =====================================================
-- 3. Enhance CURRENCIES table
-- =====================================================
-- Add missing columns
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS symbol_position VARCHAR(10) DEFAULT 'before';
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS subunit_en VARCHAR(50);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS subunit_ar VARCHAR(50);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data
UPDATE currencies SET name_en = name WHERE name_en IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_currencies_company_id ON currencies(company_id);
CREATE INDEX IF NOT EXISTS idx_currencies_deleted_at ON currencies(deleted_at);

-- =====================================================
-- 4. Enhance EXCHANGE_RATES table
-- =====================================================
-- Add missing columns
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS notes_en TEXT;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS notes_ar TEXT;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data
UPDATE exchange_rates SET effective_date = rate_date WHERE effective_date IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_deleted_at ON exchange_rates(deleted_at);

-- =====================================================
-- 5. Enhance PORTS table
-- =====================================================
-- Add missing columns
ALTER TABLE ports ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(255);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT TRUE;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data
UPDATE ports SET name_en = name WHERE name_en IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_ports_company_id ON ports(company_id);
CREATE INDEX IF NOT EXISTS idx_ports_deleted_at ON ports(deleted_at);

-- =====================================================
-- 6. Enhance CUSTOMS_OFFICES table
-- =====================================================
-- Add missing columns
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS port_id INTEGER REFERENCES ports(id);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS border_point_id INTEGER;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS office_type VARCHAR(30);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS contact_fax VARCHAR(50);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS address_en TEXT;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS address_ar TEXT;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS services_en TEXT;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS services_ar TEXT;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE customs_offices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data
UPDATE customs_offices SET name_en = name WHERE name_en IS NULL;
UPDATE customs_offices SET address_en = address WHERE address_en IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_customs_offices_company_id ON customs_offices(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_offices_city_id ON customs_offices(city_id);
CREATE INDEX IF NOT EXISTS idx_customs_offices_port_id ON customs_offices(port_id);
CREATE INDEX IF NOT EXISTS idx_customs_offices_deleted_at ON customs_offices(deleted_at);

-- =====================================================
-- 7. Enhance PAYMENT_TERMS table
-- =====================================================
-- Add missing columns
ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE payment_terms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_payment_terms_deleted_at ON payment_terms(deleted_at);

-- =====================================================
-- 8. Enhance PAYMENT_METHODS table
-- =====================================================
-- Add missing columns
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_deleted_at ON payment_methods(deleted_at);

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 030 completed successfully';
  RAISE NOTICE '📊 Enhanced 8 existing tables with bilingual support, soft delete, and audit trail';
  RAISE NOTICE '🔧 Added 70+ columns across all tables';
  RAISE NOTICE '📇 Created 15+ new indexes for performance';
END $$;
