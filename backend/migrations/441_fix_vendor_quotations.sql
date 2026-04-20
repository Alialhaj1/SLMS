-- Migration 441: Fix vendor_quotations table — add missing columns for full purchasing workflow
-- Adds: currency, exchange rate, financial totals, terms links, project, conversion tracking

ALTER TABLE vendor_quotations
  ADD COLUMN IF NOT EXISTS exchange_rate     DECIMAL(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subtotal          DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount   DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount        DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_amount   DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supply_terms_id   INT REFERENCES supply_terms(id),
  ADD COLUMN IF NOT EXISTS project_id        INT REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS converted_to_contract_id INT REFERENCES vendor_contracts(id),
  ADD COLUMN IF NOT EXISTS converted_to_po_id INT REFERENCES purchase_orders(id),
  ADD COLUMN IF NOT EXISTS rejected_reason   TEXT;

-- Enhance quotation items with additional procurement fields
ALTER TABLE vendor_quotation_items
  ADD COLUMN IF NOT EXISTS specifications    TEXT,
  ADD COLUMN IF NOT EXISTS brand             VARCHAR(200),
  ADD COLUMN IF NOT EXISTS model_number      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS warranty_months   INT,
  ADD COLUMN IF NOT EXISTS delivery_days     INT,
  ADD COLUMN IF NOT EXISTS discount_pct      DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount   DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate          DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount        DECIMAL(18,4) DEFAULT 0;
