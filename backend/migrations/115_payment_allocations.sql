-- Migration 115: Payment Allocations to Invoices
-- Purpose: Link payments to specific invoices (partial/full settlement)
-- Date: 2026-01-07

-- Create vendor_payment_allocations table
CREATE TABLE IF NOT EXISTS vendor_payment_allocations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Payment and invoice link
  payment_id INTEGER NOT NULL REFERENCES vendor_payments(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id),
  
  -- Allocation details
  allocated_amount NUMERIC(18,4) NOT NULL CHECK (allocated_amount > 0),
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Exchange rate adjustment (if payment and invoice have different currencies)
  exchange_rate NUMERIC(18,6) DEFAULT 1.000000,
  invoice_currency_amount NUMERIC(18,4), -- allocated_amount * exchange_rate
  
  -- Settlement tracking
  settlement_type VARCHAR(50) DEFAULT 'full',
  -- settlement_type: full, partial, discount, write_off
  
  discount_amount NUMERIC(18,4) DEFAULT 0,
  notes TEXT,
  
  -- Audit trail
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_allocation UNIQUE (payment_id, invoice_id, deleted_at),
  CONSTRAINT valid_discount CHECK (discount_amount >= 0)
);

-- Indexes
CREATE INDEX idx_payment_allocations_company ON vendor_payment_allocations(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_allocations_payment ON vendor_payment_allocations(payment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_allocations_invoice ON vendor_payment_allocations(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_allocations_date ON vendor_payment_allocations(allocation_date) WHERE deleted_at IS NULL;

-- Function to update payment allocated_amount when allocation changes
CREATE OR REPLACE FUNCTION update_payment_allocated_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total allocated amount for the payment
  UPDATE vendor_payments
  SET allocated_amount = (
    SELECT COALESCE(SUM(allocated_amount), 0)
    FROM vendor_payment_allocations
    WHERE payment_id = COALESCE(NEW.payment_id, OLD.payment_id)
      AND deleted_at IS NULL
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocation_update_payment_insert
AFTER INSERT ON vendor_payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_payment_allocated_amount();

CREATE TRIGGER trg_allocation_update_payment_update
AFTER UPDATE ON vendor_payment_allocations
FOR EACH ROW
WHEN (OLD.allocated_amount IS DISTINCT FROM NEW.allocated_amount OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
EXECUTE FUNCTION update_payment_allocated_amount();

CREATE TRIGGER trg_allocation_update_payment_delete
AFTER UPDATE ON vendor_payment_allocations
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
EXECUTE FUNCTION update_payment_allocated_amount();

-- Function to update invoice paid_amount and balance when allocation changes
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total NUMERIC(18,4);
  v_paid_total NUMERIC(18,4);
BEGIN
  -- Get invoice total
  SELECT total_amount INTO v_invoice_total
  FROM purchase_invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Calculate total paid (from posted payments only)
  SELECT COALESCE(SUM(vpa.invoice_currency_amount), 0) INTO v_paid_total
  FROM vendor_payment_allocations vpa
  INNER JOIN vendor_payments vp ON vpa.payment_id = vp.id
  WHERE vpa.invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND vp.is_posted = true
    AND vp.deleted_at IS NULL
    AND vpa.deleted_at IS NULL;
  
  -- Update invoice
  UPDATE purchase_invoices
  SET 
    paid_amount = v_paid_total,
    balance = v_invoice_total - v_paid_total,
    status = CASE
      WHEN v_paid_total >= v_invoice_total THEN 'paid'
      WHEN v_paid_total > 0 THEN 'partial_paid'
      ELSE status
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocation_update_invoice_insert
AFTER INSERT ON vendor_payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_invoice_paid_amount();

CREATE TRIGGER trg_allocation_update_invoice_update
AFTER UPDATE ON vendor_payment_allocations
FOR EACH ROW
WHEN (OLD.invoice_currency_amount IS DISTINCT FROM NEW.invoice_currency_amount OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
EXECUTE FUNCTION update_invoice_paid_amount();

CREATE TRIGGER trg_allocation_update_invoice_delete
AFTER UPDATE ON vendor_payment_allocations
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
EXECUTE FUNCTION update_invoice_paid_amount();

-- Comments
COMMENT ON TABLE vendor_payment_allocations IS 'Links payments to invoices, supports partial settlement and discounts';
COMMENT ON COLUMN vendor_payment_allocations.settlement_type IS 'full, partial, discount, write_off';
COMMENT ON COLUMN vendor_payment_allocations.invoice_currency_amount IS 'Allocated amount in invoice currency (after exchange rate)';
COMMENT ON TRIGGER trg_allocation_update_payment_insert ON vendor_payment_allocations IS 'Auto-updates payment.allocated_amount';
COMMENT ON TRIGGER trg_allocation_update_invoice_insert ON vendor_payment_allocations IS 'Auto-updates invoice.paid_amount and balance';
