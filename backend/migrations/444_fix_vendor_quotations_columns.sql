-- Migration 444: Fix vendor_quotations columns for quotation frontend
-- Adds technical_notes column, relaxes valid_from/valid_to NOT NULL constraints

-- Allow NULL for valid_from/valid_to since frontend doesn't always send both  
ALTER TABLE vendor_quotations ALTER COLUMN valid_from DROP NOT NULL;
ALTER TABLE vendor_quotations ALTER COLUMN valid_to DROP NOT NULL;

-- Add technical_notes column
ALTER TABLE vendor_quotations ADD COLUMN IF NOT EXISTS technical_notes TEXT;

-- Add item_name_ar to quotation items
ALTER TABLE vendor_quotation_items ADD COLUMN IF NOT EXISTS item_name_ar VARCHAR(500);
