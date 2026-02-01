-- Add missing columns expected by inventory routes
-- Idempotent

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id);

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_cost_center ON inventory_movements(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_updated_by ON inventory_movements(updated_by);
