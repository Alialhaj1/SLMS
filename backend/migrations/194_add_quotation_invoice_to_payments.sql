-- Migration 194: Add Quotation and Invoice Links to Vendor Payments
-- Purpose: Link payments to vendor quotations and purchase invoices
-- Also add source_type to track payment origin and cash_box_id for cash payments
-- Date: 2026-01-24

-- Add foreign key columns to vendor_payments
ALTER TABLE vendor_payments
ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES vendor_quotations(id),
ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES purchase_invoices(id),
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS cash_box_id INTEGER REFERENCES cash_boxes(id);

-- source_type values: 'po' (purchase order), 'shipment', 'quotation', 'invoice', 'lc', 'direct'

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_payments_quotation ON vendor_payments(quotation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice ON vendor_payments(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_source_type ON vendor_payments(source_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_cash_box ON vendor_payments(cash_box_id) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN vendor_payments.quotation_id IS 'Link to vendor quotation being paid';
COMMENT ON COLUMN vendor_payments.invoice_id IS 'Link to purchase invoice being paid';
COMMENT ON COLUMN vendor_payments.source_type IS 'Type of source document: po, shipment, quotation, invoice, lc, direct';
COMMENT ON COLUMN vendor_payments.cash_box_id IS 'Link to cash box for cash payments';
