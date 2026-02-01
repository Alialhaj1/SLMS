-- =====================================================
-- Migration 039: Shipment Lifecycle Tables (Statuses / Stages)
-- Company-scoped master data for shipment lifecycle engine.
-- =====================================================

-- Shipment Lifecycle Statuses
CREATE TABLE IF NOT EXISTS shipment_lifecycle_statuses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shipment_lifecycle_statuses_company_id ON shipment_lifecycle_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lifecycle_statuses_code ON shipment_lifecycle_statuses(code);
CREATE INDEX IF NOT EXISTS idx_shipment_lifecycle_statuses_is_active ON shipment_lifecycle_statuses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_lifecycle_statuses_deleted_at ON shipment_lifecycle_statuses(deleted_at);

-- Shipment Stages
CREATE TABLE IF NOT EXISTS shipment_stages (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shipment_stages_company_id ON shipment_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_stages_code ON shipment_stages(code);
CREATE INDEX IF NOT EXISTS idx_shipment_stages_sort_order ON shipment_stages(sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_stages_deleted_at ON shipment_stages(deleted_at);
