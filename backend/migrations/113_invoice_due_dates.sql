-- Migration 113: Purchase Invoice Due Dates
-- Purpose: Add due_date for accurate aging calculations and payment tracking
-- Date: 2026-01-07

-- Add due_date column to purchase_invoices
ALTER TABLE purchase_invoices
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create index for aging queries
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date ON purchase_invoices(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_aging ON purchase_invoices(company_id, due_date, is_posted) WHERE deleted_at IS NULL;

-- Calculate due_date for existing posted invoices
UPDATE purchase_invoices pi
SET due_date = pi.invoice_date + INTERVAL '1 day' * COALESCE(vpt.due_days, 30)
FROM vendor_payment_terms vpt
WHERE pi.payment_terms_id = vpt.id
AND pi.due_date IS NULL
AND pi.is_posted = true
AND pi.deleted_at IS NULL;

-- For invoices without payment terms, default to 30 days
UPDATE purchase_invoices
SET due_date = invoice_date + INTERVAL '30 days'
WHERE due_date IS NULL
AND is_posted = true
AND deleted_at IS NULL;

-- Add helpful comment
COMMENT ON COLUMN purchase_invoices.due_date IS 'Calculated on posting: invoice_date + payment_term_days. Used for accurate aging.';
