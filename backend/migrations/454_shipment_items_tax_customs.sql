-- Migration 454: Add tax/customs/discount/line_total columns to logistics_shipment_items
-- This enables per-item tax and customs duty calculations on shipments

-- Add new columns
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(500);
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS item_name_ar VARCHAR(500);
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(8,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS has_tax BOOLEAN DEFAULT false;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS tax_rate_id INTEGER REFERENCES tax_rates(id);
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS has_customs BOOLEAN DEFAULT false;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS customs_rate_id INTEGER REFERENCES tax_rates(id);
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS customs_rate NUMERIC(8,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS customs_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS total_with_tax NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(30); -- 'manual', 'purchase_order', 'quotation', 'contract'
ALTER TABLE logistics_shipment_items ADD COLUMN IF NOT EXISTS source_id INTEGER; -- references PO/quotation/contract item id

-- Add total_tax_amount and total_customs_amount columns to the shipment header
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS total_customs_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS total_discount_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,4) DEFAULT 0;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS quotation_id INTEGER;
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS contract_id INTEGER;
