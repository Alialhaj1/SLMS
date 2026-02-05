-- Migration: Remove BOL/AWB constraint from logistics_shipments
-- These fields will be synced automatically from shipping_bills

-- Drop the constraint that requires either bl_no or awb_no
ALTER TABLE logistics_shipments DROP CONSTRAINT IF EXISTS chk_logistics_shipments_doc_no;

-- Add comment explaining the change
COMMENT ON COLUMN logistics_shipments.bl_no IS 'Bill of Lading number - synced from shipping_bills';
COMMENT ON COLUMN logistics_shipments.awb_no IS 'Air Waybill number - synced from shipping_bills';
COMMENT ON COLUMN logistics_shipments.expected_arrival_date IS 'Expected arrival date - synced from shipping_bills.eta_date';
