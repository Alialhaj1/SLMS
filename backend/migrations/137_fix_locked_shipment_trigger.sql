-- Migration 137: Fix locked shipment trigger to allow unlock operation
-- The trigger was blocking ALL updates on locked shipments, including the unlock operation itself

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trg_before_shipment_update ON logistics_shipments;

-- Drop the existing function
DROP FUNCTION IF EXISTS prevent_locked_shipment_edit();

-- Create a new function that allows unlock operation
CREATE OR REPLACE FUNCTION prevent_locked_shipment_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow unlock operation: when we're setting locked_at to NULL
  IF OLD.locked_at IS NOT NULL AND NEW.locked_at IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Block other modifications on locked shipments
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify locked shipment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trg_before_shipment_update
  BEFORE UPDATE ON logistics_shipments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_shipment_edit();

COMMENT ON FUNCTION prevent_locked_shipment_edit() IS 'Prevents modifications to locked shipments, except for unlock operation';
