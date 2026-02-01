-- =============================================
-- Items Enhancements Migration
-- Links items to item_types, suppliers, harvest schedules
-- Adds default vendor, country of origin usage, image support
-- =============================================

-- =============================================
-- ITEM TYPES (via reference_data table)
-- Seed common item types
-- =============================================
INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('item_types', 'STOCK', 'Stock Item', 'صنف مخزني', 'Physical inventory item that is tracked', 'صنف مادي يتم تتبعه في المخزون', true),
  ('item_types', 'SERVICE', 'Service', 'خدمة', 'Non-physical service item', 'صنف خدمي غير مادي', true),
  ('item_types', 'NON_STOCK', 'Non-Stock Item', 'صنف غير مخزني', 'Physical item not tracked in inventory', 'صنف مادي لا يتم تتبعه في المخزون', true),
  ('item_types', 'FIXED_ASSET', 'Fixed Asset', 'أصل ثابت', 'Capital equipment or asset', 'معدات رأسمالية أو أصل ثابت', true),
  ('item_types', 'CONSUMABLE', 'Consumable', 'مستهلك', 'Consumable supplies', 'مستلزمات استهلاكية', true),
  ('item_types', 'RAW_MATERIAL', 'Raw Material', 'مادة خام', 'Raw material for production', 'مادة خام للإنتاج', true),
  ('item_types', 'FINISHED_GOOD', 'Finished Good', 'منتج نهائي', 'Finished manufactured product', 'منتج مصنع نهائي', true),
  ('item_types', 'SEMI_FINISHED', 'Semi-Finished', 'نصف مصنع', 'Work in progress or semi-finished item', 'منتج قيد التصنيع أو نصف مصنع', true),
  ('item_types', 'AGRICULTURAL', 'Agricultural Product', 'منتج زراعي', 'Agricultural or farm product', 'منتج زراعي أو محصول', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- HARVEST SCHEDULES
-- For agricultural items tracking
-- =============================================
CREATE TABLE IF NOT EXISTS harvest_schedules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    
    -- Schedule Details
    season VARCHAR(50),                          -- spring, summer, fall, winter, year_round
    start_month INTEGER CHECK (start_month >= 1 AND start_month <= 12),
    end_month INTEGER CHECK (end_month >= 1 AND end_month <= 12),
    harvest_duration_days INTEGER,               -- Average harvest period in days
    
    -- Location/Region
    region VARCHAR(100),
    country_id INTEGER REFERENCES countries(id),
    
    -- Notes
    notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- Create indexes for harvest_schedules
CREATE INDEX IF NOT EXISTS idx_harvest_schedules_company ON harvest_schedules(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_harvest_schedules_season ON harvest_schedules(season) WHERE deleted_at IS NULL;

-- =============================================
-- ADD NEW COLUMNS TO ITEMS TABLE
-- =============================================

-- Add item_type_id reference to reference_data
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type_id INTEGER REFERENCES reference_data(id);

-- Add default vendor/supplier
ALTER TABLE items ADD COLUMN IF NOT EXISTS default_vendor_id INTEGER REFERENCES vendors(id);

-- Add harvest schedule reference (for agricultural items)
ALTER TABLE items ADD COLUMN IF NOT EXISTS harvest_schedule_id INTEGER REFERENCES harvest_schedules(id);

-- Add expected harvest date (specific date for an item batch)
ALTER TABLE items ADD COLUMN IF NOT EXISTS expected_harvest_date DATE;

-- Add shelf life in days (for perishable items)
ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;

-- Add minimum order quantity
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_order_qty DECIMAL(18, 4);

-- Add manufacturer/brand info
ALTER TABLE items ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200);
ALTER TABLE items ADD COLUMN IF NOT EXISTS manufacturer_part_no VARCHAR(100);

-- Add warranty period in months
ALTER TABLE items ADD COLUMN IF NOT EXISTS warranty_months INTEGER;

-- Add additional images (JSON array of URLs)
ALTER TABLE items ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]'::jsonb;

-- Add specifications (JSON object for custom specs)
ALTER TABLE items ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

-- Add tags for searching
ALTER TABLE items ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_items_item_type_id ON items(item_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_default_vendor ON items(default_vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_harvest_schedule ON items(harvest_schedule_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_country_origin ON items(country_of_origin) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_tags ON items USING GIN(tags) WHERE deleted_at IS NULL;

-- =============================================
-- UPDATE EXISTING item_type VALUES TO LINK TO reference_data
-- This maps the old VARCHAR item_type to the new item_type_id
-- =============================================
UPDATE items i
SET item_type_id = rd.id
FROM reference_data rd
WHERE rd.type = 'item_types'
  AND (
    (i.item_type = 'stock' AND rd.code = 'STOCK') OR
    (i.item_type = 'service' AND rd.code = 'SERVICE') OR
    (i.item_type = 'non_stock' AND rd.code = 'NON_STOCK') OR
    (i.item_type = 'fixed_asset' AND rd.code = 'FIXED_ASSET')
  )
  AND i.item_type_id IS NULL;

-- =============================================
-- SEED HARVEST SCHEDULES PERMISSIONS
-- =============================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('master:harvest_schedules:view', 'master:harvest_schedules', 'view', 'View harvest schedules'),
  ('master:harvest_schedules:create', 'master:harvest_schedules', 'create', 'Create harvest schedules'),
  ('master:harvest_schedules:edit', 'master:harvest_schedules', 'edit', 'Edit harvest schedules'),
  ('master:harvest_schedules:delete', 'master:harvest_schedules', 'delete', 'Delete harvest schedules')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant permissions to admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Super Admin', 'super_admin', 'Admin', 'admin', 'System Admin')
  AND p.permission_code LIKE 'master:harvest_schedules:%'
ON CONFLICT DO NOTHING;

-- =============================================
-- ITEM USAGE STATISTICS VIEW
-- Shows item usage across different modules
-- Note: This view is simplified since not all tables have deleted_at
-- =============================================
CREATE OR REPLACE VIEW item_usage_stats AS
SELECT 
    i.id AS item_id,
    i.code AS item_code,
    i.name AS item_name,
    i.company_id,
    -- Purchase statistics
    COALESCE(poi.purchase_order_count, 0) AS purchase_order_count,
    COALESCE(pii.purchase_invoice_count, 0) AS purchase_invoice_count,
    COALESCE(gri.goods_receipt_count, 0) AS goods_receipt_count,
    -- Sales statistics
    COALESCE(soi.sales_order_count, 0) AS sales_order_count,
    COALESCE(sii.sales_invoice_count, 0) AS sales_invoice_count,
    -- Inventory movements
    COALESCE(im.movement_count, 0) AS inventory_movement_count,
    -- Total usage
    COALESCE(poi.purchase_order_count, 0) + 
    COALESCE(pii.purchase_invoice_count, 0) + 
    COALESCE(soi.sales_order_count, 0) + 
    COALESCE(sii.sales_invoice_count, 0) AS total_transaction_count
FROM items i
LEFT JOIN (
    SELECT item_id, COUNT(*) AS purchase_order_count 
    FROM purchase_order_items 
    GROUP BY item_id
) poi ON poi.item_id = i.id
LEFT JOIN (
    SELECT item_id, COUNT(*) AS purchase_invoice_count 
    FROM purchase_invoice_items 
    GROUP BY item_id
) pii ON pii.item_id = i.id
LEFT JOIN (
    SELECT item_id, COUNT(*) AS goods_receipt_count 
    FROM goods_receipt_items 
    GROUP BY item_id
) gri ON gri.item_id = i.id
LEFT JOIN (
    SELECT item_id, COUNT(*) AS sales_order_count 
    FROM sales_order_items 
    GROUP BY item_id
) soi ON soi.item_id = i.id
LEFT JOIN (
    SELECT item_id, COUNT(*) AS sales_invoice_count 
    FROM sales_invoice_items 
    GROUP BY item_id
) sii ON sii.item_id = i.id
LEFT JOIN (
    SELECT item_id, COUNT(*) AS movement_count 
    FROM inventory_movements 
    WHERE deleted_at IS NULL 
    GROUP BY item_id
) im ON im.item_id = i.id
WHERE i.deleted_at IS NULL;

-- =============================================
-- ITEM TYPE COUNTS VIEW
-- Shows count of items per item type
-- =============================================
CREATE OR REPLACE VIEW item_type_counts AS
SELECT 
    rd.id AS item_type_id,
    rd.code AS item_type_code,
    rd.name_en AS item_type_name,
    rd.name_ar AS item_type_name_ar,
    i.company_id,
    COUNT(i.id) AS item_count,
    COUNT(CASE WHEN i.is_active THEN 1 END) AS active_item_count
FROM reference_data rd
LEFT JOIN items i ON i.item_type_id = rd.id AND i.deleted_at IS NULL
WHERE rd.type = 'item_types' AND rd.deleted_at IS NULL
GROUP BY rd.id, rd.code, rd.name_en, rd.name_ar, i.company_id;

COMMENT ON VIEW item_type_counts IS 'Count of items per item type for dashboard statistics';
COMMENT ON VIEW item_usage_stats IS 'Item usage statistics across all modules';
