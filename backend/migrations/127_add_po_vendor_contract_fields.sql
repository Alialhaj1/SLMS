-- Add vendor contract reference fields to purchase_orders
-- These fields support displaying vendor contract number/date directly on POs,
-- even when a formal vendor_contracts record is not linked.

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_contract_number VARCHAR(50);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_contract_date DATE;

-- Backfill from linked vendor_contracts (if any)
UPDATE purchase_orders po
SET
  vendor_contract_number = COALESCE(po.vendor_contract_number, vc.contract_number),
  vendor_contract_date = COALESCE(po.vendor_contract_date, vc.contract_date)
FROM vendor_contracts vc
WHERE po.contract_id = vc.id
  AND (po.vendor_contract_number IS NULL OR po.vendor_contract_date IS NULL);
