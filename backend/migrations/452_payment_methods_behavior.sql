-- Migration 452: Add payment_behavior to payment_methods
-- Classifies payment method accounting behavior for dynamic form logic

-- 1) Add the payment_behavior column
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS payment_behavior VARCHAR(20);

-- 2) Add default_debit_account_id and default_credit_account_id for accounting rules
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS default_debit_account_id INTEGER REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS default_credit_account_id INTEGER REFERENCES accounts(id);

-- 3) Populate payment_behavior from existing code values
UPDATE payment_methods SET payment_behavior = 'cash'    WHERE code = 'CASH';
UPDATE payment_methods SET payment_behavior = 'bank'    WHERE code IN ('BANK-TRF', 'WIRE', 'DRAFT');
UPDATE payment_methods SET payment_behavior = 'check'   WHERE code IN ('CHECK', 'PDC');
UPDATE payment_methods SET payment_behavior = 'credit'  WHERE code IN ('CC-VISA', 'CC-MC', 'CC-AMEX', 'MADA');
UPDATE payment_methods SET payment_behavior = 'digital' WHERE code IN ('STCPAY', 'APPLEPAY');
UPDATE payment_methods SET payment_behavior = 'lc'      WHERE code = 'LC';
UPDATE payment_methods SET payment_behavior = 'sadad'   WHERE code = 'SADAD';
UPDATE payment_methods SET payment_behavior = 'offset'  WHERE code = 'OFFSET';
UPDATE payment_methods SET payment_behavior = 'barter'  WHERE code = 'BARTER';
UPDATE payment_methods SET payment_behavior = 'bg'      WHERE code = 'BG';
UPDATE payment_methods SET payment_behavior = 'crypto'  WHERE code = 'CRYPTO';

-- Set NOT NULL default for any remaining nulls
UPDATE payment_methods SET payment_behavior = 'bank' WHERE payment_behavior IS NULL;

-- 4) Create index on payment_behavior for filtering
CREATE INDEX IF NOT EXISTS idx_payment_methods_behavior ON payment_methods (payment_behavior);

-- 5) Add requires_cheque_number default sync  
UPDATE payment_methods SET requires_cheque_number = TRUE WHERE code IN ('CHECK', 'PDC') AND (requires_cheque_number IS NULL OR requires_cheque_number = FALSE);
UPDATE payment_methods SET requires_due_date = TRUE WHERE code = 'PDC' AND (requires_due_date IS NULL OR requires_due_date = FALSE);
UPDATE payment_methods SET requires_bank_account = TRUE, requires_bank = TRUE WHERE payment_behavior IN ('bank', 'credit', 'digital') AND (requires_bank_account IS NULL OR requires_bank_account = FALSE);
UPDATE payment_methods SET requires_reference = TRUE WHERE payment_behavior IN ('bank', 'sadad') AND (requires_reference IS NULL OR requires_reference = FALSE);

-- 6) Update sort_order for logical grouping
UPDATE payment_methods SET sort_order = 1  WHERE code = 'CASH';
UPDATE payment_methods SET sort_order = 2  WHERE code = 'BANK-TRF';
UPDATE payment_methods SET sort_order = 3  WHERE code = 'WIRE';
UPDATE payment_methods SET sort_order = 4  WHERE code = 'DRAFT';
UPDATE payment_methods SET sort_order = 5  WHERE code = 'CHECK';
UPDATE payment_methods SET sort_order = 6  WHERE code = 'PDC';
UPDATE payment_methods SET sort_order = 7  WHERE code = 'CC-VISA';
UPDATE payment_methods SET sort_order = 8  WHERE code = 'CC-MC';
UPDATE payment_methods SET sort_order = 9  WHERE code = 'CC-AMEX';
UPDATE payment_methods SET sort_order = 10 WHERE code = 'MADA';
UPDATE payment_methods SET sort_order = 11 WHERE code = 'STCPAY';
UPDATE payment_methods SET sort_order = 12 WHERE code = 'APPLEPAY';
UPDATE payment_methods SET sort_order = 13 WHERE code = 'SADAD';
UPDATE payment_methods SET sort_order = 14 WHERE code = 'LC';
UPDATE payment_methods SET sort_order = 15 WHERE code = 'BG';
UPDATE payment_methods SET sort_order = 16 WHERE code = 'OFFSET';
UPDATE payment_methods SET sort_order = 17 WHERE code = 'BARTER';
UPDATE payment_methods SET sort_order = 18 WHERE code = 'CRYPTO';

-- 7) Populate name_en from name where NULL
UPDATE payment_methods SET name_en = name WHERE name_en IS NULL;
