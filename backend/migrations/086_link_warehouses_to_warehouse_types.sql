-- 086_link_warehouses_to_warehouse_types.sql
-- Adds a formal FK link from warehouses -> warehouse_types (company-scoped via API validation)

BEGIN;

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS warehouse_type_id INTEGER REFERENCES warehouse_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_warehouse_type_id
  ON warehouses(warehouse_type_id)
  WHERE deleted_at IS NULL;

-- Best-effort backfill: map legacy warehouses.warehouse_type to seeded warehouse_types
-- Note: we validate company match at API layer (FK cannot enforce company_id equality).
UPDATE warehouses w
SET warehouse_type_id = wt.id
FROM warehouse_types wt
WHERE w.deleted_at IS NULL
  AND wt.deleted_at IS NULL
  AND wt.company_id = w.company_id
  AND w.warehouse_type_id IS NULL
  AND (
    (w.warehouse_type = 'transit' AND wt.code = 'WT-TRANSIT')
    OR (w.warehouse_type IN ('main','storage','branch','sub','external','quarantine','production','scrap') AND wt.code = 'WT-MAIN-LOCAL')
  );

COMMIT;
