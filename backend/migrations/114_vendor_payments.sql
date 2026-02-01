-- Migration 114: Vendor Payments Module
-- Purpose: Track vendor payments and settlements
-- Date: 2026-01-07

-- Create vendor_payments table
CREATE TABLE IF NOT EXISTS vendor_payments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  
  -- Payment identification
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Payment details
  payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
  -- payment_method: bank_transfer, check, cash, wire_transfer, credit_card
  
  -- Bank information
  bank_account_id INTEGER REFERENCES bank_accounts(id),
  reference_number VARCHAR(100), -- check number, wire reference, etc.
  
  -- Amounts
  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  payment_amount NUMERIC(18,4) NOT NULL CHECK (payment_amount > 0),
  
  -- Exchange rate (if payment currency differs from invoice currency)
  exchange_rate NUMERIC(18,6) DEFAULT 1.000000,
  base_amount NUMERIC(18,4), -- payment_amount * exchange_rate
  
  -- Allocation tracking
  allocated_amount NUMERIC(18,4) DEFAULT 0,
  unallocated_amount NUMERIC(18,4), -- payment_amount - allocated_amount
  
  -- Status and posting
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- status: draft, approved, posted, cancelled, void
  
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP,
  posted_by INTEGER REFERENCES users(id),
  
  -- Notes
  notes TEXT,
  payment_terms_note TEXT, -- discount taken, early payment, etc.
  
  -- Audit trail
  created_by INTEGER NOT NULL REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_payment_number_per_company UNIQUE (company_id, payment_number, deleted_at),
  CONSTRAINT valid_unallocated CHECK (unallocated_amount >= 0),
  CONSTRAINT posting_integrity CHECK (
    (is_posted = false AND posted_at IS NULL AND posted_by IS NULL) OR
    (is_posted = true AND posted_at IS NOT NULL AND posted_by IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_vendor_payments_company ON vendor_payments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_payments_status ON vendor_payments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_payments_posted ON vendor_payments(is_posted) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_payments_unallocated ON vendor_payments(unallocated_amount) WHERE unallocated_amount > 0 AND deleted_at IS NULL;

-- Trigger to update unallocated_amount automatically
CREATE OR REPLACE FUNCTION update_payment_unallocated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unallocated_amount := NEW.payment_amount - COALESCE(NEW.allocated_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_unallocated_insert
BEFORE INSERT ON vendor_payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_unallocated();

CREATE TRIGGER trg_payment_unallocated_update
BEFORE UPDATE ON vendor_payments
FOR EACH ROW
WHEN (OLD.payment_amount IS DISTINCT FROM NEW.payment_amount OR OLD.allocated_amount IS DISTINCT FROM NEW.allocated_amount)
EXECUTE FUNCTION update_payment_unallocated();

-- Comments
COMMENT ON TABLE vendor_payments IS 'Vendor payment transactions with posting and allocation tracking';
COMMENT ON COLUMN vendor_payments.unallocated_amount IS 'Auto-calculated: payment_amount - allocated_amount';
COMMENT ON COLUMN vendor_payments.base_amount IS 'Payment amount in company base currency (for multi-currency)';
COMMENT ON COLUMN vendor_payments.payment_method IS 'bank_transfer, check, cash, wire_transfer, credit_card';
COMMENT ON COLUMN vendor_payments.is_posted IS 'Posted payments affect vendor balance and aging';
