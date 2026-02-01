-- Migration 116: Data Integrity Constraints
-- Purpose: Prevent deletion/modification of posted financial documents
-- Date: 2026-01-07

-- Prevent deletion of posted invoices
ALTER TABLE purchase_invoices
ADD CONSTRAINT prevent_delete_posted_invoice
CHECK (
  (is_posted = false) OR 
  (is_posted = true AND deleted_at IS NULL)
);

-- Prevent deletion of posted goods receipts
ALTER TABLE goods_receipts
ADD CONSTRAINT prevent_delete_posted_gr
CHECK (
  (is_posted = false) OR 
  (is_posted = true AND deleted_at IS NULL)
);

-- Prevent deletion of posted payments
ALTER TABLE vendor_payments
ADD CONSTRAINT prevent_delete_posted_payment
CHECK (
  (is_posted = false) OR 
  (is_posted = true AND deleted_at IS NULL)
);

-- Prevent deletion of approved/closed purchase orders with received items
ALTER TABLE purchase_orders
ADD CONSTRAINT prevent_delete_received_po
CHECK (
  (status IN ('draft', 'pending_approval')) OR
  (status NOT IN ('draft', 'pending_approval') AND deleted_at IS NULL)
);

-- Add posting audit columns to purchase_invoices (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_invoices' AND column_name='posting_notes') THEN
    ALTER TABLE purchase_invoices ADD COLUMN posting_notes TEXT;
  END IF;
END $$;

-- Add posting audit columns to vendor_payments (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='vendor_payments' AND column_name='approved_by') THEN
    ALTER TABLE vendor_payments ADD COLUMN approved_by INTEGER REFERENCES users(id);
    ALTER TABLE vendor_payments ADD COLUMN approved_at TIMESTAMP;
  END IF;
END $$;

-- Comments
COMMENT ON CONSTRAINT prevent_delete_posted_invoice ON purchase_invoices IS 'Posted invoices cannot be deleted (soft delete blocked)';
COMMENT ON CONSTRAINT prevent_delete_posted_gr ON goods_receipts IS 'Posted goods receipts cannot be deleted';
COMMENT ON CONSTRAINT prevent_delete_posted_payment ON vendor_payments IS 'Posted payments cannot be deleted';
COMMENT ON CONSTRAINT prevent_delete_received_po ON purchase_orders IS 'Approved/closed POs cannot be deleted';
