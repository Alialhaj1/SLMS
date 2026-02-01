-- =============================================
-- Migration: Add vendor_id and manager_name to projects
-- Date: 2026-01-12
-- Description: 
--   - Add vendor_id to link projects to vendors/suppliers
--   - Add manager_name for manual entry when manager_id is not set
-- =============================================

-- Add vendor_id column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id);

-- Add manager_name for free text entry
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);

-- Create index for vendor lookup
CREATE INDEX IF NOT EXISTS idx_projects_vendor_id ON projects(vendor_id);

-- Add comment
COMMENT ON COLUMN projects.vendor_id IS 'Reference to vendor/supplier for this project';
COMMENT ON COLUMN projects.manager_name IS 'Manual manager name entry when manager_id is not set';
