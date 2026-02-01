-- Migration 195: Fix transfer_requests shipment foreign key
-- The shipment_id was incorrectly referencing 'shipments' table instead of 'logistics_shipments'
-- Date: 2026-01-24

-- Drop the incorrect foreign key constraint
ALTER TABLE transfer_requests DROP CONSTRAINT IF EXISTS transfer_requests_shipment_id_fkey;

-- Add the correct foreign key constraint referencing logistics_shipments
ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_shipment_id_fkey 
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id);

-- Also fix payment_requests if it has the same issue
ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS payment_requests_shipment_id_fkey;
ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_shipment_id_fkey 
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id);

COMMENT ON CONSTRAINT transfer_requests_shipment_id_fkey ON transfer_requests IS 'Links to logistics_shipments table';
