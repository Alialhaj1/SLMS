-- Link warehouses to cost centers (professional warehouse valuation support)
-- Adds warehouses.cost_center_id -> cost_centers(id)
-- Idempotent

DO $$
BEGIN
  -- 1) Add column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'warehouses'
      AND column_name = 'cost_center_id'
  ) THEN
    ALTER TABLE warehouses
      ADD COLUMN cost_center_id INT NULL;
  END IF;

  -- 2) Add FK constraint if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'warehouses_cost_center_id_fkey'
  ) THEN
    ALTER TABLE warehouses
      ADD CONSTRAINT warehouses_cost_center_id_fkey
      FOREIGN KEY (cost_center_id)
      REFERENCES cost_centers(id)
      ON DELETE SET NULL;
  END IF;

  -- 3) Add index if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_warehouses_company_cost_center_id'
  ) THEN
    CREATE INDEX idx_warehouses_company_cost_center_id
      ON warehouses(company_id, cost_center_id);
  END IF;
END $$;
