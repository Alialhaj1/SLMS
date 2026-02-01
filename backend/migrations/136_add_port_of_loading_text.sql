-- Migration 136: Add port_of_loading_text column for free-text port entry
-- This allows users to enter a port name manually when not in the ports table

ALTER TABLE logistics_shipments
ADD COLUMN IF NOT EXISTS port_of_loading_text VARCHAR(200);

-- Also make port_of_loading_id nullable since we now allow free text
-- (check if column exists before altering)
DO $$
BEGIN
  -- Make port_of_loading_id nullable (optional)
  ALTER TABLE logistics_shipments 
    ALTER COLUMN port_of_loading_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    -- Column might already be nullable or not exist
    NULL;
END $$;

-- Add an index for port_of_loading_text searches
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_port_of_loading_text 
  ON logistics_shipments(port_of_loading_text) 
  WHERE port_of_loading_text IS NOT NULL;

COMMENT ON COLUMN logistics_shipments.port_of_loading_text IS 'Free-text port of loading name (used when port is not in ports table)';
