-- Migration 135: Make expected_arrival_date optional in logistics_shipments
-- This allows creating shipments without knowing the exact arrival date upfront

ALTER TABLE logistics_shipments 
ALTER COLUMN expected_arrival_date DROP NOT NULL;

COMMENT ON COLUMN logistics_shipments.expected_arrival_date IS 'Expected arrival date (optional - can be updated later when known)';
