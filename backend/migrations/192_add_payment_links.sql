-- Migration 192: Add Document Links to Vendor Payments
-- Purpose: Link payments to POs, Shipments, LCs, and Projects
-- Date: 2026-01-24

-- Add foreign key columns to vendor_payments
ALTER TABLE vendor_payments
ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id),
ADD COLUMN IF NOT EXISTS shipment_id INTEGER REFERENCES logistics_shipments(id),
ADD COLUMN IF NOT EXISTS lc_id INTEGER REFERENCES letters_of_credit(id),
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_payments_po ON vendor_payments(purchase_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_shipment ON vendor_payments(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_lc ON vendor_payments(lc_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_project ON vendor_payments(project_id) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN vendor_payments.purchase_order_id IS 'Link to purchase order being paid';
COMMENT ON COLUMN vendor_payments.shipment_id IS 'Link to shipment being paid';
COMMENT ON COLUMN vendor_payments.lc_id IS 'Link to letter of credit used for payment';
COMMENT ON COLUMN vendor_payments.project_id IS 'Link to project (usually from shipment)';
