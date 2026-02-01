-- =============================================
-- 093 - Inventory Movements + Warehouse Pricing/Cost
-- Adds per-warehouse cost/price fields and a unified inventory movement ledger.
-- Idempotent + preserves existing data.
-- =============================================

BEGIN;

-- 1) Extend item_warehouse with per-warehouse costing + selling price
ALTER TABLE item_warehouse
  ADD COLUMN IF NOT EXISTS average_cost DECIMAL(18, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cost DECIMAL(18, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(18, 4) DEFAULT 0;

-- Backfill from items (best-effort, does not overwrite non-zero values)
UPDATE item_warehouse iw
SET
  average_cost = CASE
    WHEN COALESCE(iw.average_cost, 0) = 0 THEN COALESCE(i.average_cost, 0)
    ELSE iw.average_cost
  END,
  last_cost = CASE
    WHEN COALESCE(iw.last_cost, 0) = 0 THEN COALESCE(i.last_purchase_cost, 0)
    ELSE iw.last_cost
  END,
  selling_price = CASE
    WHEN COALESCE(iw.selling_price, 0) = 0 THEN COALESCE(i.base_selling_price, 0)
    ELSE iw.selling_price
  END
FROM items i
WHERE i.id = iw.item_id
  AND iw.variant_id IS NULL
  AND iw.location_id IS NULL;

-- 2) Unified inventory movement ledger
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES item_variants(id),
  location_id INTEGER REFERENCES warehouse_locations(id),

  txn_type VARCHAR(30) NOT NULL, -- receipt, issue, transfer_in, transfer_out, adjustment, return_in, return_out
  qty_delta DECIMAL(18, 4) NOT NULL,

  unit_cost DECIMAL(18, 4),
  unit_price DECIMAL(18, 4),

  ref_type VARCHAR(60),
  ref_id INTEGER,
  ref_no VARCHAR(60),

  notes TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred ON inventory_movements(occurred_at);

-- Avoid double-migration from older adjustments
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_movements_ref
  ON inventory_movements(ref_type, ref_id)
  WHERE ref_type IS NOT NULL AND ref_id IS NOT NULL;

-- 3) Migrate existing inventory_adjustments into movements (preserve history)
INSERT INTO inventory_movements (
  company_id,
  warehouse_id,
  item_id,
  variant_id,
  location_id,
  txn_type,
  qty_delta,
  unit_cost,
  unit_price,
  ref_type,
  ref_id,
  ref_no,
  notes,
  occurred_at,
  created_by,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  ia.company_id,
  ia.warehouse_id,
  ia.item_id,
  NULL,
  NULL,
  'adjustment',
  ia.quantity_delta,
  ia.unit_cost,
  NULL,
  'inventory_adjustments',
  ia.id,
  ('ADJ-' || LPAD(ia.id::text, 6, '0')),
  ia.notes,
  ia.occurred_at,
  ia.created_by,
  ia.created_at,
  ia.updated_at,
  ia.deleted_at
FROM inventory_adjustments ia
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_movements im
  WHERE im.ref_type = 'inventory_adjustments'
    AND im.ref_id = ia.id
);

COMMIT;
