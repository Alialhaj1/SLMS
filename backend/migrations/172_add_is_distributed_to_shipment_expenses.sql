-- Migration: Add is_distributed column to shipment_expenses table
-- Purpose: Track which expenses have been distributed to items

DO $$
BEGIN
    -- Add is_distributed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_expenses' AND column_name = 'is_distributed'
    ) THEN
        ALTER TABLE shipment_expenses ADD COLUMN is_distributed BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN shipment_expenses.is_distributed IS 'Whether this expense has been distributed to shipment items';
    END IF;
END $$;

-- Create index for filtering distributed/undistributed expenses
CREATE INDEX IF NOT EXISTS idx_shipment_expenses_is_distributed 
    ON shipment_expenses(is_distributed) WHERE deleted_at IS NULL;
