-- =============================================
-- Items Enterprise Enhancements Migration
-- Phase 1: Tracking, Valuation, Hierarchical Groups
-- Date: 2026-01-31
-- =============================================

-- =============================================
-- 1. ITEMS TABLE ENHANCEMENTS
-- =============================================

-- Tracking Policies
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS tracking_policy VARCHAR(50) DEFAULT 'none' 
CHECK (tracking_policy IN ('none', 'batch', 'serial', 'batch_expiry', 'serial_expiry'));

-- Valuation Methods
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(50) DEFAULT 'weighted_avg' 
CHECK (valuation_method IN ('fifo', 'weighted_avg', 'specific_cost', 'standard_cost'));

-- Composite/BOM Flag
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_composite BOOLEAN DEFAULT false;

-- Inventory GL Accounts (link to chart of accounts)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS inventory_account_id INTEGER REFERENCES chart_of_accounts(id);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS cogs_account_id INTEGER REFERENCES chart_of_accounts(id);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS adjustment_account_id INTEGER REFERENCES chart_of_accounts(id);

-- Warehouse Management
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS default_warehouse_id INTEGER REFERENCES warehouses(id);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS default_location VARCHAR(100);

-- Packaging & Logistics
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS net_weight NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS weight_uom VARCHAR(20) DEFAULT 'kg' 
CHECK (weight_uom IN ('kg', 'g', 'lb', 'oz'));

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS volume NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS volume_uom VARCHAR(20) DEFAULT 'cbm' 
CHECK (volume_uom IN ('cbm', 'ltr', 'cft'));

-- Safety Stock & Reorder
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(18,4);

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS reorder_quantity NUMERIC(18,4);

-- Policy Locking (prevent changes after movement)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS policy_locked_at TIMESTAMP;

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS policy_locked_by INTEGER REFERENCES users(id);

-- Comments
COMMENT ON COLUMN items.tracking_policy IS 'Tracking policy: none, batch, serial, batch_expiry, serial_expiry (LOCKED after first movement)';
COMMENT ON COLUMN items.valuation_method IS 'Valuation method: fifo, weighted_avg, specific_cost, standard_cost (LOCKED after first movement)';
COMMENT ON COLUMN items.is_composite IS 'Whether this item is composed of other items (BOM)';
COMMENT ON COLUMN items.policy_locked_at IS 'Timestamp when tracking/valuation policies were locked due to movement';

-- =============================================
-- 2. HIERARCHICAL ITEM GROUPS
-- =============================================

-- Add hierarchy columns to item_groups
ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES item_groups(id);

ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS path VARCHAR(500);

ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS group_type VARCHAR(50) DEFAULT 'main' 
CHECK (group_type IN ('main', 'sub', 'auxiliary', 'similar', 'helper'));

ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE item_groups 
ADD COLUMN IF NOT EXISTS is_leaf BOOLEAN DEFAULT true;

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_item_groups_parent ON item_groups(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_groups_path ON item_groups(path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_groups_level ON item_groups(level) WHERE deleted_at IS NULL;

COMMENT ON COLUMN item_groups.parent_id IS 'Parent group for hierarchical structure';
COMMENT ON COLUMN item_groups.level IS 'Depth level in hierarchy (0 = root)';
COMMENT ON COLUMN item_groups.path IS 'Full path in hierarchy (e.g., /1/5/12)';
COMMENT ON COLUMN item_groups.group_type IS 'Type: main, sub, auxiliary, similar, helper';

-- =============================================
-- 3. ITEM GROUP ASSIGNMENTS (Multi-Group Support)
-- =============================================

CREATE TABLE IF NOT EXISTS item_group_assignments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES item_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(item_id, group_id)
);

-- Only one primary group per item
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_primary_group 
ON item_group_assignments(item_id, is_primary) 
WHERE is_primary = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_group_assignments_item ON item_group_assignments(item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_group_assignments_group ON item_group_assignments(group_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE item_group_assignments IS 'Allows items to belong to multiple groups with one primary';

-- =============================================
-- 4. ITEM WAREHOUSES (Allowed Warehouses per Item)
-- =============================================

CREATE TABLE IF NOT EXISTS item_warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    
    -- Stock Levels per Warehouse
    min_stock NUMERIC(18,4) DEFAULT 0,
    max_stock NUMERIC(18,4),
    reorder_point NUMERIC(18,4),
    
    -- Location Info
    default_location VARCHAR(100),
    default_bin VARCHAR(50),
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(item_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_item_warehouses_item ON item_warehouses(item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_warehouses_warehouse ON item_warehouses(warehouse_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE item_warehouses IS 'Defines which warehouses an item can be stored in';

-- =============================================
-- 5. ITEM BATCHES (for Batch Tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS item_batches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    batch_number VARCHAR(100) NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    
    quantity_on_hand NUMERIC(18,4) DEFAULT 0,
    quantity_reserved NUMERIC(18,4) DEFAULT 0,
    quantity_available NUMERIC(18,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    
    supplier_batch VARCHAR(100),
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(item_id, batch_number, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_item_batches_item ON item_batches(item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON item_batches(expiry_date) WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_batches_warehouse ON item_batches(warehouse_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE item_batches IS 'Tracks batch numbers and expiry dates for batch-tracked items';

-- =============================================
-- 6. ITEM SERIALS (for Serial Number Tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS item_serials (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id),
    
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'damaged', 'scrapped')),
    
    batch_id INTEGER REFERENCES item_batches(id),
    manufacture_date DATE,
    warranty_expiry DATE,
    
    customer_id INTEGER REFERENCES customers(id),
    sale_date DATE,
    
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_serials_item ON item_serials(item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_serials_serial ON item_serials(serial_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_serials_status ON item_serials(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE item_serials IS 'Tracks individual serial numbers for serialized items';

-- =============================================
-- 7. BILL OF MATERIALS (BOM) - Composite Items
-- =============================================

CREATE TABLE IF NOT EXISTS item_bom (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    component_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    uom_id INTEGER REFERENCES units(id),
    
    is_optional BOOLEAN DEFAULT false,
    scrap_factor NUMERIC(5,2) DEFAULT 0 CHECK (scrap_factor >= 0 AND scrap_factor <= 100),
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(parent_item_id, component_item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_bom_parent ON item_bom(parent_item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_bom_component ON item_bom(component_item_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE item_bom IS 'Defines components of composite items (Bill of Materials)';
COMMENT ON COLUMN item_bom.scrap_factor IS 'Expected waste/scrap percentage (0-100)';

-- =============================================
-- 8. ITEM CHANGE LOG (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS item_change_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'policy_locked', 'group_assigned', 'warehouse_assigned', 'deleted')),
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_change_log_item ON item_change_log(item_id);
CREATE INDEX IF NOT EXISTS idx_item_change_log_date ON item_change_log(changed_at DESC);

COMMENT ON TABLE item_change_log IS 'Tracks all changes to items for audit purposes';

-- =============================================
-- 9. HELPER FUNCTION: Compute has_movement
-- =============================================

CREATE OR REPLACE FUNCTION item_has_movement(p_item_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_movement BOOLEAN;
BEGIN
    -- Check if item has any inventory movements
    SELECT EXISTS(
        SELECT 1 FROM inventory_movements 
        WHERE item_id = p_item_id AND deleted_at IS NULL
        LIMIT 1
    ) INTO v_has_movement;
    
    -- Also check logistics_shipment_items (receiving)
    IF NOT v_has_movement THEN
        SELECT EXISTS(
            SELECT 1 FROM logistics_shipment_items 
            WHERE item_id = p_item_id AND deleted_at IS NULL
            LIMIT 1
        ) INTO v_has_movement;
    END IF;
    
    RETURN v_has_movement;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION item_has_movement(INTEGER) IS 'Computes whether an item has any stock movements (NOT stored)';

-- =============================================
-- 10. HELPER FUNCTION: Lock Item Policies
-- =============================================

CREATE OR REPLACE FUNCTION lock_item_policies(p_item_id INTEGER, p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE items 
    SET 
        policy_locked_at = NOW(),
        policy_locked_by = p_user_id
    WHERE id = p_item_id 
      AND policy_locked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lock_item_policies(INTEGER, INTEGER) IS 'Locks tracking/valuation policies after first movement';

-- =============================================
-- 11. VIEW: Items with Stock Summary
-- =============================================

CREATE OR REPLACE VIEW v_items_stock_summary AS
SELECT 
    i.id,
    i.code,
    i.name,
    i.name_ar,
    i.tracking_policy,
    i.valuation_method,
    i.is_composite,
    i.policy_locked_at,
    item_has_movement(i.id) as has_movement,
    
    -- Stock Summary (simplified - just check if movements exist)
    COALESCE((
        SELECT SUM(im.qty_delta)
        FROM inventory_movements im
        WHERE im.item_id = i.id 
          AND im.deleted_at IS NULL
          AND im.qty_delta > 0
    ), 0) - COALESCE((
        SELECT SUM(ABS(im.qty_delta))
        FROM inventory_movements im
        WHERE im.item_id = i.id 
          AND im.deleted_at IS NULL
          AND im.qty_delta < 0
    ), 0) as total_on_hand,
    
    -- Reserved Quantity (future feature)
    0 as quantity_reserved,
    
    -- Available
    COALESCE((
        SELECT SUM(im.qty_delta)
        FROM inventory_movements im
        WHERE im.item_id = i.id 
          AND im.deleted_at IS NULL
          AND im.qty_delta > 0
    ), 0) - COALESCE((
        SELECT SUM(ABS(im.qty_delta))
        FROM inventory_movements im
        WHERE im.item_id = i.id 
          AND im.deleted_at IS NULL
          AND im.qty_delta < 0
    ), 0) as quantity_available,
    
    -- Warehouse Count
    (SELECT COUNT(DISTINCT warehouse_id) 
     FROM inventory_movements im 
     WHERE im.item_id = i.id AND im.deleted_at IS NULL) as warehouses_count
     
FROM items i
WHERE i.deleted_at IS NULL;

COMMENT ON VIEW v_items_stock_summary IS 'Provides real-time stock summary for all items';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Items Enterprise Enhancements Migration Applied Successfully';
    RAISE NOTICE '📊 Features Added:';
    RAISE NOTICE '   - Tracking Policies (Batch, Serial, Expiry)';
    RAISE NOTICE '   - Valuation Methods (FIFO, Weighted Avg)';
    RAISE NOTICE '   - Hierarchical Item Groups';
    RAISE NOTICE '   - Multi-Group Assignments';
    RAISE NOTICE '   - Item-Warehouse Mapping';
    RAISE NOTICE '   - Batch & Serial Tracking Tables';
    RAISE NOTICE '   - Bill of Materials (BOM)';
    RAISE NOTICE '   - Item Change Audit Log';
    RAISE NOTICE '   - has_movement() Function (Computed)';
    RAISE NOTICE '   - Policy Locking Logic';
END $$;
