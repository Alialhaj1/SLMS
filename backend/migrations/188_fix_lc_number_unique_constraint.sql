-- Migration: Fix LC Number Unique Constraint to Allow Soft Deleted Duplicates
-- Date: 2026-01-31
-- Purpose: Allow LC numbers to be reused after soft delete

-- Drop the old unique constraint
ALTER TABLE letters_of_credit 
DROP CONSTRAINT IF EXISTS letters_of_credit_company_id_lc_number_key;

-- Create a partial unique index that only applies to non-deleted records
-- This allows the same lc_number to exist multiple times if deleted_at IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS letters_of_credit_company_lc_number_active_idx 
ON letters_of_credit(company_id, lc_number) 
WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON INDEX letters_of_credit_company_lc_number_active_idx IS 
'Ensures LC numbers are unique within a company for active (non-deleted) records only';
