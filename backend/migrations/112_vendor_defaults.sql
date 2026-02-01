-- Migration 112: Vendor Defaults for UX Automation
-- Purpose: Add default payment term and currency to vendors for auto-population in PO/Invoice
-- Date: 2026-01-07

-- Add default columns to vendors
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS default_payment_term_id INTEGER REFERENCES vendor_payment_terms(id),
ADD COLUMN IF NOT EXISTS default_currency_id INTEGER REFERENCES currencies(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_default_payment_term ON vendors(default_payment_term_id);
CREATE INDEX IF NOT EXISTS idx_vendors_default_currency ON vendors(default_currency_id);

-- Populate defaults for existing vendors based on common patterns
-- Set default payment term: Net 30 for all vendors
UPDATE vendors
SET default_payment_term_id = (SELECT id FROM vendor_payment_terms WHERE code = 'NET30' LIMIT 1)
WHERE default_payment_term_id IS NULL
AND deleted_at IS NULL;

-- Set default currency: SAR for local vendors, USD for external vendors
UPDATE vendors
SET default_currency_id = CASE
  WHEN is_external THEN (SELECT id FROM currencies WHERE code = 'USD' LIMIT 1)
  ELSE (SELECT id FROM currencies WHERE code = 'SAR' LIMIT 1)
END
WHERE default_currency_id IS NULL
AND deleted_at IS NULL;

-- Add helpful comment
COMMENT ON COLUMN vendors.default_payment_term_id IS 'Auto-populates payment term in PO/Invoice creation';
COMMENT ON COLUMN vendors.default_currency_id IS 'Auto-populates currency in PO/Invoice creation';
