-- Migration 365: Add missing columns to branches table
-- The branches route code expects FK columns (country_id, city_id, etc.)
-- but the table only has varchar columns (country, city).
-- This adds the missing FK columns and other fields needed by the branches API.

-- Add FK reference columns (nullable, since existing rows won't have them)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone_id INTEGER; -- timezones is a view, no FK constraint
ALTER TABLE branches ADD COLUMN IF NOT EXISTS language_id INTEGER; -- languages is a view, no FK constraint
ALTER TABLE branches ADD COLUMN IF NOT EXISTS parent_branch_id INTEGER REFERENCES branches(id);

-- Add type/classification columns
ALTER TABLE branches ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'branch';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add address/location details
ALTER TABLE branches ADD COLUMN IF NOT EXISTS postal_code VARCHAR(15);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Add legal/tax fields
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tax_number VARCHAR(30);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cr_number VARCHAR(30);

-- Add cost center fields
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS profit_center_code VARCHAR(20);

-- Add indexes for FK columns
CREATE INDEX IF NOT EXISTS idx_branches_country_id ON branches(country_id);
CREATE INDEX IF NOT EXISTS idx_branches_city_id ON branches(city_id);
CREATE INDEX IF NOT EXISTS idx_branches_region_id ON branches(region_id);
CREATE INDEX IF NOT EXISTS idx_branches_parent_branch_id ON branches(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_type ON branches(type);
