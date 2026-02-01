-- =====================================================
-- Migration 173: Add UOM to Shipment Items
-- Adds uom_id column to logistics_shipment_items to support
-- syncing UOM from purchase orders (which may use different
-- units than the item's base unit)
-- =====================================================

BEGIN;

-- Add uom_id column to logistics_shipment_items
ALTER TABLE logistics_shipment_items
ADD COLUMN IF NOT EXISTS uom_id INTEGER REFERENCES units_of_measure(id);

-- Add comment explaining the field
COMMENT ON COLUMN logistics_shipment_items.uom_id IS 
  'Unit of measure for this shipment line. Synced from PO item''s uom_id. Falls back to item''s base_uom_id if not set.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_items_uom_id 
ON logistics_shipment_items(uom_id) 
WHERE deleted_at IS NULL;

-- Update existing shipment items to use the PO item's uom_id if available
UPDATE logistics_shipment_items AS lsi
SET uom_id = subq.po_uom_id
FROM (
  SELECT lsi2.id AS shipment_item_id, poi.uom_id AS po_uom_id
  FROM logistics_shipment_items lsi2
  JOIN logistics_shipments ls ON ls.id = lsi2.shipment_id
  JOIN purchase_order_items poi ON poi.order_id = ls.purchase_order_id AND poi.item_id = lsi2.item_id
  WHERE lsi2.uom_id IS NULL AND poi.uom_id IS NOT NULL
) AS subq
WHERE lsi.id = subq.shipment_item_id;

-- For any remaining items without uom_id, use the item's base_uom_id
UPDATE logistics_shipment_items lsi
SET uom_id = i.base_uom_id
FROM items i
WHERE lsi.item_id = i.id
  AND lsi.uom_id IS NULL
  AND i.base_uom_id IS NOT NULL;

COMMIT;
