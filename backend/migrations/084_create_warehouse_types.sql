-- 084_create_warehouse_types.sql
-- Adds a dedicated master table for Warehouse Types (company-scoped, soft delete)

BEGIN;

CREATE TABLE IF NOT EXISTS warehouse_types (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  warehouse_category VARCHAR(20) NOT NULL,
  parent_id INTEGER REFERENCES warehouse_types(id) ON DELETE SET NULL,
  allows_sales BOOLEAN NOT NULL DEFAULT TRUE,
  allows_purchases BOOLEAN NOT NULL DEFAULT TRUE,
  allows_transfers BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Enforce uniqueness of code per company for active rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_types_company_code_active
  ON warehouse_types(company_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_types_company_active
  ON warehouse_types(company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_types_parent_id
  ON warehouse_types(parent_id);

COMMIT;
