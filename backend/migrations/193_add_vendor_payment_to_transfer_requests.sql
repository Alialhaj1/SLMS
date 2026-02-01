-- Migration 193: Add Vendor Payment Link to Transfer Requests
-- Purpose: Allow creating transfer requests directly from vendor payments
-- Date: 2026-01-24

-- Add source_vendor_payment_id to transfer_requests
ALTER TABLE transfer_requests
ADD COLUMN IF NOT EXISTS source_vendor_payment_id INTEGER REFERENCES vendor_payments(id);

-- Make expense_request_id optional (allow NULL)
ALTER TABLE transfer_requests 
ALTER COLUMN expense_request_id DROP NOT NULL;

-- Make expense_type_id optional (use vendor payment type for vendor payments)
ALTER TABLE transfer_requests 
ALTER COLUMN expense_type_id DROP NOT NULL;

-- Add transfer type to distinguish between expense vs payment transfers
ALTER TABLE transfer_requests
ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(50) DEFAULT 'expense' 
CHECK (transfer_type IN ('expense', 'vendor_payment'));

-- Create index for vendor payment lookups
CREATE INDEX IF NOT EXISTS idx_transfer_requests_vendor_payment 
ON transfer_requests(source_vendor_payment_id) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN transfer_requests.source_vendor_payment_id IS 'Link to vendor payment when transfer is for vendor payment';
COMMENT ON COLUMN transfer_requests.transfer_type IS 'expense = from expense request, vendor_payment = from vendor payment';

-- Add constraint: must have either expense_request_id OR source_vendor_payment_id
ALTER TABLE transfer_requests 
ADD CONSTRAINT chk_transfer_source CHECK (
  expense_request_id IS NOT NULL OR source_vendor_payment_id IS NOT NULL
);
