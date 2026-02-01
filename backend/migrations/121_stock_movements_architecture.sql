-- =====================================================
-- Migration 121: Stock Movements Architecture
-- نظام الحركات المخزنية الموحد
-- =====================================================
-- This migration implements the unified stock movements architecture
-- following the principle: "Every quantity change must go through transactions"

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. UNIFIED STOCK MOVEMENTS TABLE (جدول الحركات المخزنية الموحد)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Item & Location
    item_id INTEGER NOT NULL REFERENCES items(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    bin_location VARCHAR(100),
    
    -- Quantity (positive = in, negative = out)
    qty DECIMAL(18, 4) NOT NULL,
    unit_id INTEGER REFERENCES units(id),
    base_qty DECIMAL(18, 4) NOT NULL, -- Always in base unit
    
    -- Reference to source transaction
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN (
        'PURCHASE',           -- فاتورة شراء
        'PURCHASE_RETURN',    -- مرتجع شراء
        'SALE',               -- فاتورة بيع
        'SALE_RETURN',        -- مرتجع بيع
        'TRANSFER_IN',        -- تحويل وارد
        'TRANSFER_OUT',       -- تحويل صادر
        'ADJUSTMENT_IN',      -- تسوية زيادة
        'ADJUSTMENT_OUT',     -- تسوية نقص
        'WASTAGE',            -- تالف
        'OPENING_BALANCE',    -- رصيد افتتاحي
        'PRODUCTION_IN',      -- إنتاج وارد
        'PRODUCTION_OUT',     -- إنتاج صادر (مواد خام)
        'SAMPLE',             -- عينات
        'DONATION',           -- تبرعات
        'EXPIRED'             -- منتهي الصلاحية
    )),
    reference_id INTEGER, -- ID of the source document
    reference_no VARCHAR(100), -- Document number for display
    
    -- Costing
    unit_cost DECIMAL(18, 4) DEFAULT 0,
    total_cost DECIMAL(18, 4) DEFAULT 0,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Running balance (denormalized for performance)
    balance_after DECIMAL(18, 4),
    
    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Soft delete
    is_reversed BOOLEAN DEFAULT FALSE,
    reversed_by INTEGER REFERENCES users(id),
    reversed_at TIMESTAMP,
    reversal_reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(batch_number) WHERE batch_number IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ITEM UNITS TABLE (جدول وحدات الصنف المتعددة)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS item_units (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    unit_id INTEGER NOT NULL REFERENCES units(id),
    
    -- Conversion
    conversion_factor DECIMAL(18, 6) NOT NULL DEFAULT 1, -- How many base units
    is_base BOOLEAN DEFAULT FALSE,
    is_purchase_unit BOOLEAN DEFAULT FALSE,
    is_sales_unit BOOLEAN DEFAULT FALSE,
    
    -- Pricing per unit
    purchase_price DECIMAL(18, 4),
    sales_price DECIMAL(18, 4),
    
    -- Barcode per unit
    barcode VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(item_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_item_units_item ON item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_item_units_barcode ON item_units(barcode) WHERE barcode IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ENHANCE ITEMS TABLE (تحسين جدول الأصناف)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add blocking/archiving fields
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS blocked_by INTEGER REFERENCES users(id);

-- Add archive fields
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id);

-- Add last movement tracking
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_movement_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_sale_at TIMESTAMP;

-- Add stock alert thresholds
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS max_stock_level DECIMAL(18, 4);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. WAREHOUSE TRANSFERS TABLE (جدول التحويلات المخزنية)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Transfer info
    transfer_no VARCHAR(50) NOT NULL,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Locations
    from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',      -- مسودة
        'PENDING',    -- قيد الانتظار
        'IN_TRANSIT', -- قيد النقل
        'RECEIVED',   -- تم الاستلام
        'CANCELLED'   -- ملغي
    )),
    
    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    received_by INTEGER REFERENCES users(id),
    received_at TIMESTAMP,
    
    UNIQUE(company_id, transfer_no)
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    
    -- Quantities
    qty DECIMAL(18, 4) NOT NULL,
    unit_id INTEGER REFERENCES units(id),
    received_qty DECIMAL(18, 4) DEFAULT 0,
    
    -- Batch/Serial
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Notes
    notes TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. STOCK ADJUSTMENTS TABLE (جدول تسويات المخزون)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Adjustment info
    adjustment_no VARCHAR(50) NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN (
        'COUNT',      -- جرد
        'WASTAGE',    -- تالف
        'EXPIRED',    -- منتهي الصلاحية
        'DAMAGED',    -- تالف
        'CORRECTION', -- تصحيح
        'OTHER'       -- أخرى
    )),
    
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
    )),
    
    -- Metadata
    reason TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    UNIQUE(company_id, adjustment_no)
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id SERIAL PRIMARY KEY,
    adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    
    -- Quantities
    system_qty DECIMAL(18, 4) NOT NULL, -- الكمية في النظام
    actual_qty DECIMAL(18, 4) NOT NULL, -- الكمية الفعلية
    difference_qty DECIMAL(18, 4) GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
    unit_id INTEGER REFERENCES units(id),
    
    -- Costing
    unit_cost DECIMAL(18, 4) DEFAULT 0,
    
    -- Batch/Serial
    batch_number VARCHAR(100),
    
    -- Notes
    notes TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ANALYTICAL VIEWS (العروض التحليلية)
-- ═══════════════════════════════════════════════════════════════════════════

-- A. Item Stock Summary (ملخص مخزون الصنف)
CREATE OR REPLACE VIEW v_item_stock_summary AS
SELECT 
    i.id AS item_id,
    i.company_id,
    i.code AS item_code,
    i.name AS item_name,
    i.name_ar AS item_name_ar,
    COALESCE(SUM(sm.base_qty), 0) AS total_stock,
    i.reorder_point AS min_qty,
    i.max_stock_level AS max_qty,
    i.reorder_point,
    CASE 
        WHEN COALESCE(SUM(sm.base_qty), 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(sm.base_qty), 0) <= COALESCE(i.reorder_point, 0) THEN 'LOW_STOCK'
        WHEN i.max_stock_level IS NOT NULL AND COALESCE(SUM(sm.base_qty), 0) >= i.max_stock_level THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END AS stock_status,
    i.last_movement_at,
    i.last_purchase_at,
    i.last_sale_at
FROM items i
LEFT JOIN stock_movements sm ON sm.item_id = i.id AND sm.is_reversed = FALSE
WHERE i.deleted_at IS NULL AND i.is_active = TRUE
GROUP BY i.id;

-- B. Warehouse Stock (مخزون المستودعات)
CREATE OR REPLACE VIEW v_warehouse_stock AS
SELECT 
    sm.company_id,
    sm.warehouse_id,
    w.name AS warehouse_name,
    sm.item_id,
    i.code AS item_code,
    i.name AS item_name,
    COALESCE(SUM(sm.base_qty), 0) AS stock_qty,
    i.base_uom_id AS base_unit_id,
    u.name AS base_unit_name
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
JOIN warehouses w ON w.id = sm.warehouse_id
LEFT JOIN units u ON u.id = i.base_uom_id
WHERE sm.is_reversed = FALSE
GROUP BY sm.company_id, sm.warehouse_id, w.name, sm.item_id, i.code, i.name, i.base_uom_id, u.name
HAVING SUM(sm.base_qty) != 0;

-- C. Slow Moving Items (الأصناف بطيئة الحركة)
CREATE OR REPLACE VIEW v_slow_moving_items AS
SELECT 
    i.id AS item_id,
    i.company_id,
    i.code,
    i.name,
    i.name_ar,
    i.last_movement_at,
    DATE_PART('day', NOW() - i.last_movement_at) AS days_since_movement,
    COALESCE((
        SELECT SUM(sm.base_qty) 
        FROM stock_movements sm 
        WHERE sm.item_id = i.id AND sm.is_reversed = FALSE
    ), 0) AS current_stock
FROM items i
WHERE i.deleted_at IS NULL 
  AND i.is_active = TRUE
  AND (i.last_movement_at IS NULL OR i.last_movement_at < NOW() - INTERVAL '90 days');

-- D. Expiry Alerts (تنبيهات انتهاء الصلاحية)
CREATE OR REPLACE VIEW v_expiry_alerts AS
SELECT 
    sm.company_id,
    sm.item_id,
    i.code AS item_code,
    i.name AS item_name,
    sm.warehouse_id,
    w.name AS warehouse_name,
    sm.batch_number,
    sm.expiry_date,
    (sm.expiry_date - CURRENT_DATE) AS days_until_expiry,
    SUM(sm.base_qty) AS qty_expiring,
    CASE 
        WHEN sm.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN sm.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'CRITICAL'
        WHEN sm.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'WARNING'
        ELSE 'OK'
    END AS expiry_status
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
JOIN warehouses w ON w.id = sm.warehouse_id
WHERE sm.expiry_date IS NOT NULL 
  AND sm.is_reversed = FALSE
GROUP BY sm.company_id, sm.item_id, i.code, i.name, sm.warehouse_id, w.name, sm.batch_number, sm.expiry_date
HAVING SUM(sm.base_qty) > 0;

-- E. Item Movement Summary (ملخص حركة الصنف)
CREATE OR REPLACE VIEW v_item_movement_summary AS
SELECT 
    i.id AS item_id,
    i.company_id,
    i.code,
    i.name,
    -- Last 30 days
    COALESCE(SUM(CASE WHEN sm.created_at >= NOW() - INTERVAL '30 days' AND sm.base_qty > 0 THEN sm.base_qty ELSE 0 END), 0) AS qty_in_30d,
    COALESCE(SUM(CASE WHEN sm.created_at >= NOW() - INTERVAL '30 days' AND sm.base_qty < 0 THEN ABS(sm.base_qty) ELSE 0 END), 0) AS qty_out_30d,
    COUNT(CASE WHEN sm.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS movement_count_30d,
    -- Last 90 days
    COALESCE(SUM(CASE WHEN sm.created_at >= NOW() - INTERVAL '90 days' AND sm.base_qty > 0 THEN sm.base_qty ELSE 0 END), 0) AS qty_in_90d,
    COALESCE(SUM(CASE WHEN sm.created_at >= NOW() - INTERVAL '90 days' AND sm.base_qty < 0 THEN ABS(sm.base_qty) ELSE 0 END), 0) AS qty_out_90d
FROM items i
LEFT JOIN stock_movements sm ON sm.item_id = i.id AND sm.is_reversed = FALSE
WHERE i.deleted_at IS NULL
GROUP BY i.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. GRANULAR PERMISSIONS (صلاحيات دقيقة)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description) VALUES
-- Items - Granular
('items:view:cost', 'items', 'view_cost', 'View item cost prices'),
('items:update:basic', 'items', 'update_basic', 'Update basic item info'),
('items:update:pricing', 'items', 'update_pricing', 'Update item prices'),
('items:update:stock', 'items', 'update_stock', 'Update stock settings'),
('items:archive', 'items', 'archive', 'Archive items'),
('items:block', 'items', 'block', 'Block/unblock items'),

-- Stock Movements
('stock_movements:view', 'stock_movements', 'view', 'View stock movements'),
('stock_movements:create', 'stock_movements', 'create', 'Create stock movements'),
('stock_movements:reverse', 'stock_movements', 'reverse', 'Reverse stock movements'),
('stock_movements:export', 'stock_movements', 'export', 'Export stock movements'),

-- Warehouse Transfers
('warehouse_transfers:view', 'warehouse_transfers', 'view', 'View warehouse transfers'),
('warehouse_transfers:create', 'warehouse_transfers', 'create', 'Create warehouse transfers'),
('warehouse_transfers:approve', 'warehouse_transfers', 'approve', 'Approve warehouse transfers'),
('warehouse_transfers:receive', 'warehouse_transfers', 'receive', 'Receive warehouse transfers'),
('warehouse_transfers:cancel', 'warehouse_transfers', 'cancel', 'Cancel warehouse transfers'),

-- Stock Adjustments
('stock_adjustments:view', 'stock_adjustments', 'view', 'View stock adjustments'),
('stock_adjustments:create', 'stock_adjustments', 'create', 'Create stock adjustments'),
('stock_adjustments:approve', 'stock_adjustments', 'approve', 'Approve stock adjustments'),
('stock_adjustments:reject', 'stock_adjustments', 'reject', 'Reject stock adjustments'),

-- Reports
('reports:stock_value', 'reports', 'stock_value', 'View stock valuation reports'),
('reports:slow_moving', 'reports', 'slow_moving', 'View slow moving items report'),
('reports:expiry_alerts', 'reports', 'expiry_alerts', 'View expiry alerts report')

ON CONFLICT (permission_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to get item stock by warehouse
CREATE OR REPLACE FUNCTION get_item_stock(p_item_id INTEGER, p_warehouse_id INTEGER DEFAULT NULL)
RETURNS DECIMAL AS $$
BEGIN
    IF p_warehouse_id IS NULL THEN
        RETURN COALESCE((
            SELECT SUM(base_qty) 
            FROM stock_movements 
            WHERE item_id = p_item_id AND is_reversed = FALSE
        ), 0);
    ELSE
        RETURN COALESCE((
            SELECT SUM(base_qty) 
            FROM stock_movements 
            WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id AND is_reversed = FALSE
        ), 0);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if item can be deleted
CREATE OR REPLACE FUNCTION can_delete_item(p_item_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_movements BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM stock_movements WHERE item_id = p_item_id LIMIT 1
    ) INTO v_has_movements;
    
    RETURN NOT v_has_movements;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_movement_at on item
CREATE OR REPLACE FUNCTION update_item_last_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items SET 
        last_movement_at = NEW.created_at,
        last_purchase_at = CASE 
            WHEN NEW.reference_type IN ('PURCHASE', 'PURCHASE_RETURN') THEN NEW.created_at 
            ELSE last_purchase_at 
        END,
        last_sale_at = CASE 
            WHEN NEW.reference_type IN ('SALE', 'SALE_RETURN') THEN NEW.created_at 
            ELSE last_sale_at 
        END,
        updated_at = NOW()
    WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_item_last_movement ON stock_movements;
CREATE TRIGGER trg_update_item_last_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_item_last_movement();

-- ═══════════════════════════════════════════════════════════════════════════
-- Done!
-- ═══════════════════════════════════════════════════════════════════════════
