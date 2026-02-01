-- =============================================
-- Inventory Adjustments + Ledger
-- Provides real stock increase/decrease with auditability.
-- =============================================

-- 1) Ensure we have a safe conflict target for "no-location" stock rows.
-- Postgres UNIQUE constraints treat NULLs as distinct, so the existing
-- UNIQUE(item_id, variant_id, warehouse_id, location_id) does not prevent
-- multiple (NULL,NULL) rows per item+warehouse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_item_warehouse_item_warehouse_nolocation
ON item_warehouse (item_id, warehouse_id)
WHERE variant_id IS NULL AND location_id IS NULL;

-- 2) Inventory adjustments (simple movement ledger)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  cost_center_id INTEGER REFERENCES cost_centers(id),

  quantity_delta DECIMAL(18, 4) NOT NULL,
  unit_cost DECIMAL(18, 4),
  notes TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company ON inventory_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item ON inventory_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_warehouse ON inventory_adjustments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_occurred_at ON inventory_adjustments(occurred_at);

-- Optional helper for common lookups
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company_item_wh
ON inventory_adjustments(company_id, item_id, warehouse_id)
WHERE deleted_at IS NULL;
