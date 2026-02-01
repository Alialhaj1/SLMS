-- =====================================================
-- Migration 185: Link Shipment Expenses to Chart of Accounts
-- =====================================================
-- This migration adds a direct link between shipment_expenses
-- and the accounts table for better integration with the Chart of Accounts

-- Add account_id column to shipment_expenses if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE shipment_expenses 
        ADD COLUMN account_id INTEGER REFERENCES accounts(id);
        
        COMMENT ON COLUMN shipment_expenses.account_id IS 'Direct link to Chart of Accounts (child of 1151010003)';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_account_id 
ON shipment_expenses(account_id);

-- Update existing records to link account_id based on analytic_account_code
-- This links expenses to their corresponding accounts in the Chart of Accounts
UPDATE shipment_expenses se
SET account_id = a.id
FROM accounts a
WHERE se.analytic_account_code = a.code
  AND se.company_id = a.company_id
  AND a.deleted_at IS NULL
  AND se.account_id IS NULL;

-- Also add account_id to shipment_expense_types for the parent account reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expense_types' 
        AND column_name = 'linked_account_id'
    ) THEN
        ALTER TABLE shipment_expense_types 
        ADD COLUMN linked_account_id INTEGER REFERENCES accounts(id);
        
        COMMENT ON COLUMN shipment_expense_types.linked_account_id IS 'Direct link to expense account in Chart of Accounts';
    END IF;
END $$;

-- Link expense types to their accounts based on analytic_account_code
UPDATE shipment_expense_types setp
SET linked_account_id = a.id
FROM accounts a
WHERE setp.analytic_account_code = a.code
  AND setp.company_id = a.company_id
  AND a.deleted_at IS NULL
  AND setp.linked_account_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_shipment_expense_types_linked_account_id 
ON shipment_expense_types(linked_account_id);

-- Add comment for documentation
COMMENT ON TABLE shipment_expense_types IS 'Shipment expense types linked to Chart of Accounts (parent: 1151010003)';
