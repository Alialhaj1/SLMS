-- Migration 198: Add vendor cover image and image upload permissions
-- Date: 2026-01-26

-- Add cover image column to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_cover_url VARCHAR(500);

-- Add comment
COMMENT ON COLUMN vendors.vendor_cover_url IS 'Cover/banner image URL for vendor profile';

-- Add permissions for vendor image management
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES 
  ('vendors:logo:upload', 'vendors', 'logo_upload', 'Upload vendor logo image', 'procurement'),
  ('vendors:logo:delete', 'vendors', 'logo_delete', 'Delete vendor logo image', 'procurement'),
  ('vendors:cover:upload', 'vendors', 'cover_upload', 'Upload vendor cover image', 'procurement'),
  ('vendors:cover:delete', 'vendors', 'cover_delete', 'Delete vendor cover image', 'procurement')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant permissions to admin and super_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'super_admin')
AND p.permission_code IN (
  'vendors:logo:upload',
  'vendors:logo:delete',
  'vendors:cover:upload',
  'vendors:cover:delete',
  'vendors:logo:update'
)
ON CONFLICT DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vendors_cover_url ON vendors(vendor_cover_url) WHERE vendor_cover_url IS NOT NULL;
