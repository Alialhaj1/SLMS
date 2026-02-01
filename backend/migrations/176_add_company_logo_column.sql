-- Migration: Add logo column to companies table
-- This allows storing company logos as file paths

-- Add logo column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo VARCHAR(500);

-- Add comment
COMMENT ON COLUMN companies.logo IS 'Path to company logo file';
