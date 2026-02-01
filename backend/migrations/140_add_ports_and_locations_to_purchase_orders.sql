-- =====================================================
-- Migration 140: Add Ports and Locations to Purchase Orders
-- Adds origin/destination countries, cities, and ports to PO table
-- to enable automatic shipment creation with full location data
-- =====================================================

BEGIN;

-- Add origin and destination location fields to purchase_orders table
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS origin_country_id INTEGER REFERENCES countries(id),
  ADD COLUMN IF NOT EXISTS origin_city_id INTEGER REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS destination_country_id INTEGER REFERENCES countries(id) DEFAULT 1, -- Saudi Arabia
  ADD COLUMN IF NOT EXISTS destination_city_id INTEGER REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS port_of_loading_id INTEGER REFERENCES ports(id),
  ADD COLUMN IF NOT EXISTS port_of_loading_text VARCHAR(200), -- For international ports (free text)
  ADD COLUMN IF NOT EXISTS port_of_discharge_id INTEGER REFERENCES ports(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_origin_country
  ON purchase_orders(origin_country_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_origin_city
  ON purchase_orders(origin_city_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_destination_country
  ON purchase_orders(destination_country_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_destination_city
  ON purchase_orders(destination_city_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_port_of_loading
  ON purchase_orders(port_of_loading_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_port_of_discharge
  ON purchase_orders(port_of_discharge_id) WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN purchase_orders.origin_country_id IS 'Country where goods are being shipped from';
COMMENT ON COLUMN purchase_orders.origin_city_id IS 'City where goods are being shipped from';
COMMENT ON COLUMN purchase_orders.destination_country_id IS 'Country where goods are being shipped to (defaults to Saudi Arabia)';
COMMENT ON COLUMN purchase_orders.destination_city_id IS 'City where goods are being shipped to (within Saudi Arabia)';
COMMENT ON COLUMN purchase_orders.port_of_loading_id IS 'Port where goods will be loaded (if Saudi port, otherwise use port_of_loading_text)';
COMMENT ON COLUMN purchase_orders.port_of_loading_text IS 'Free text for international ports not in ports table';
COMMENT ON COLUMN purchase_orders.port_of_discharge_id IS 'Saudi port/airport where goods will arrive (required for shipments)';

COMMIT;
