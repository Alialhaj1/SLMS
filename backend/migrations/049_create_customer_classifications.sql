-- Migration 049: Create customer classifications
-- Date: 2025-12-30
-- Description: Customer classifications master data (company-scoped) used by frontend page /master/customer-classifications

BEGIN;

CREATE TABLE IF NOT EXISTS customer_classifications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),

  classification_type VARCHAR(20) NOT NULL,
  parent_id INTEGER REFERENCES customer_classifications(id) ON DELETE SET NULL,

  credit_limit_default DECIMAL(18, 4) DEFAULT 0,
  payment_terms_default INTEGER DEFAULT 30,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,

  color VARCHAR(20) DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  description TEXT,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE(company_id, code)
);

-- Constrain type values to match UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_classifications_type'
  ) THEN
    ALTER TABLE customer_classifications
      ADD CONSTRAINT chk_customer_classifications_type
      CHECK (classification_type IN ('size', 'industry', 'region', 'priority', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_classifications_company_id ON customer_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_classifications_deleted_at ON customer_classifications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customer_classifications_type ON customer_classifications(classification_type);

COMMIT;
