-- Migration: Add country_id and city_id foreign keys to companies table
-- This allows proper linking to countries and cities master data

-- Add country_id column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);

-- Add city_id column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_country_id ON companies(country_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON companies(city_id) WHERE deleted_at IS NULL;

-- Update existing companies to link country and city if they exist
UPDATE companies c
SET country_id = co.id
FROM countries co
WHERE c.country = co.name AND c.country_id IS NULL AND c.deleted_at IS NULL AND co.deleted_at IS NULL;

UPDATE companies c
SET city_id = ci.id
FROM cities ci
WHERE c.city = ci.name AND c.city_id IS NULL AND c.deleted_at IS NULL AND ci.deleted_at IS NULL;

COMMENT ON COLUMN companies.country_id IS 'Foreign key to countries table';
COMMENT ON COLUMN companies.city_id IS 'Foreign key to cities table';
