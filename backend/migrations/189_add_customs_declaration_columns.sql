-- Migration: Add missing columns to customs_declarations table for expense 8005 sync
-- Date: 2026-01-24

-- Add port_id column for linking to ports table
ALTER TABLE customs_declarations
ADD COLUMN IF NOT EXISTS port_id INTEGER REFERENCES ports(id);

-- Add handling_fees column
ALTER TABLE customs_declarations
ADD COLUMN IF NOT EXISTS handling_fees NUMERIC(18,4) DEFAULT 0;

-- Add ground_fees column
ALTER TABLE customs_declarations
ADD COLUMN IF NOT EXISTS ground_fees NUMERIC(18,4) DEFAULT 0;

-- Create index on port_id
CREATE INDEX IF NOT EXISTS idx_customs_declarations_port ON customs_declarations(port_id);

-- Add comment
COMMENT ON COLUMN customs_declarations.port_id IS 'Reference to the port/entry point';
COMMENT ON COLUMN customs_declarations.handling_fees IS 'Handling fees (رسوم المناولة)';
COMMENT ON COLUMN customs_declarations.ground_fees IS 'Ground fees (رسوم الأرضية)';
