-- Migration: Add print tracking columns to expense_requests
-- Date: 2026-01-24
-- Purpose: Track print status for expense requests similar to transfer/payment requests

-- Add print tracking columns
ALTER TABLE expense_requests
  ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_printed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS first_printed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS print_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_printed_by INTEGER REFERENCES users(id);

-- Add index for print status
CREATE INDEX IF NOT EXISTS idx_expense_requests_printed 
  ON expense_requests(is_printed) WHERE deleted_at IS NULL;

COMMENT ON COLUMN expense_requests.is_printed IS 'Whether the request has been printed at least once';
COMMENT ON COLUMN expense_requests.first_printed_at IS 'Timestamp of first print';
COMMENT ON COLUMN expense_requests.first_printed_by IS 'User who first printed the request';
COMMENT ON COLUMN expense_requests.print_count IS 'Number of times the request was printed';
COMMENT ON COLUMN expense_requests.last_printed_at IS 'Timestamp of last print';
COMMENT ON COLUMN expense_requests.last_printed_by IS 'User who last printed the request';
