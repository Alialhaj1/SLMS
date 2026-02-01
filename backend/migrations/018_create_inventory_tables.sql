-- =============================================
-- Items & Inventory Master Data
-- Foundation for inventory management
-- =============================================

-- =============================================
-- UNITS OF MEASURE (UOM)
-- =============================================
CREATE TABLE IF NOT EXISTS uom (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    uom_type VARCHAR(20) DEFAULT 'unit',      -- unit, weight, volume, length, area, time
    is_base BOOLEAN DEFAULT false,             -- Base unit for conversion
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- UOM CONVERSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS uom_conversions (
    id SERIAL PRIMARY KEY,
    from_uom_id INTEGER NOT NULL REFERENCES uom(id),
    to_uom_id INTEGER NOT NULL REFERENCES uom(id),
    conversion_factor DECIMAL(18, 8) NOT NULL,  -- 1 from_uom = X to_uom
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_uom_id, to_uom_id)
);

-- =============================================
-- ITEM CATEGORIES (Hierarchy)
-- =============================================
CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    parent_id INTEGER REFERENCES item_categories(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Default Accounts for items in this category
    sales_account_id INTEGER REFERENCES accounts(id),
    cogs_account_id INTEGER REFERENCES accounts(id),
    inventory_account_id INTEGER REFERENCES accounts(id),
    purchase_account_id INTEGER REFERENCES accounts(id),
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- ITEM GROUPS (For grouping similar items)
-- =============================================
CREATE TABLE IF NOT EXISTS item_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- BRANDS
-- =============================================
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    country_id INTEGER REFERENCES countries(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- ITEMS (Products/Materials)
-- =============================================
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    code VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    
    -- Classification
    category_id INTEGER REFERENCES item_categories(id),
    group_id INTEGER REFERENCES item_groups(id),
    brand_id INTEGER REFERENCES brands(id),
    
    -- Item Type
    item_type VARCHAR(20) NOT NULL DEFAULT 'stock',  -- stock, service, non_stock, fixed_asset
    is_purchasable BOOLEAN DEFAULT true,
    is_sellable BOOLEAN DEFAULT true,
    is_stockable BOOLEAN DEFAULT true,
    
    -- Units
    base_uom_id INTEGER NOT NULL REFERENCES uom(id),
    sales_uom_id INTEGER REFERENCES uom(id),
    purchase_uom_id INTEGER REFERENCES uom(id),
    
    -- Inventory Settings
    track_inventory BOOLEAN DEFAULT true,
    allow_negative_stock BOOLEAN DEFAULT false,
    min_stock_level DECIMAL(18, 4) DEFAULT 0,
    max_stock_level DECIMAL(18, 4),
    reorder_level DECIMAL(18, 4),
    reorder_qty DECIMAL(18, 4),
    lead_time_days INTEGER DEFAULT 0,
    
    -- Costing
    costing_method VARCHAR(20) DEFAULT 'average',  -- average, fifo, lifo, specific
    standard_cost DECIMAL(18, 4) DEFAULT 0,
    last_purchase_cost DECIMAL(18, 4) DEFAULT 0,
    average_cost DECIMAL(18, 4) DEFAULT 0,
    
    -- Pricing
    base_selling_price DECIMAL(18, 4) DEFAULT 0,
    min_selling_price DECIMAL(18, 4),
    max_discount_percent DECIMAL(5, 2),
    
    -- Weight & Dimensions
    weight DECIMAL(18, 4),
    weight_uom_id INTEGER REFERENCES uom(id),
    length DECIMAL(18, 4),
    width DECIMAL(18, 4),
    height DECIMAL(18, 4),
    dimension_uom_id INTEGER REFERENCES uom(id),
    volume DECIMAL(18, 4),
    
    -- Customs & Trade
    hs_code VARCHAR(20),                       -- Harmonized System code
    country_of_origin INTEGER REFERENCES countries(id),
    
    -- Accounts (Override category defaults)
    sales_account_id INTEGER REFERENCES accounts(id),
    cogs_account_id INTEGER REFERENCES accounts(id),
    inventory_account_id INTEGER REFERENCES accounts(id),
    purchase_account_id INTEGER REFERENCES accounts(id),
    
    -- Tax
    tax_type_id INTEGER REFERENCES tax_types(id),
    is_tax_inclusive BOOLEAN DEFAULT false,
    
    -- Images & Attachments
    image_url VARCHAR(500),
    
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

-- =============================================
-- ITEM VARIANTS (Size, Color, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS item_variants (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    variant_code VARCHAR(50) NOT NULL,
    variant_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50),
    
    -- Attributes
    attributes JSONB,                          -- {"color": "Red", "size": "XL"}
    
    -- Override parent item
    base_selling_price DECIMAL(18, 4),
    standard_cost DECIMAL(18, 4),
    weight DECIMAL(18, 4),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, variant_code)
);

-- =============================================
-- ITEM ALTERNATES (Substitute items)
-- =============================================
CREATE TABLE IF NOT EXISTS item_alternates (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    alternate_item_id INTEGER NOT NULL REFERENCES items(id),
    priority INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, alternate_item_id)
);

-- =============================================
-- ITEM PRICES (Price Lists)
-- =============================================
CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    currency_id INTEGER REFERENCES currencies(id),
    price_type VARCHAR(20) DEFAULT 'selling',  -- selling, buying
    is_default BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS item_prices (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES item_variants(id),
    uom_id INTEGER REFERENCES uom(id),
    min_qty DECIMAL(18, 4) DEFAULT 1,          -- Minimum quantity for this price
    price DECIMAL(18, 4) NOT NULL,
    discount_percent DECIMAL(5, 2),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(price_list_id, item_id, variant_id, uom_id, min_qty)
);

-- =============================================
-- WAREHOUSES
-- =============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    
    -- Location
    address TEXT,
    city_id INTEGER REFERENCES cities(id),
    country_id INTEGER REFERENCES countries(id),
    
    -- Type
    warehouse_type VARCHAR(20) DEFAULT 'storage',  -- storage, transit, production, scrap
    is_default BOOLEAN DEFAULT false,
    
    -- Contact
    manager_name VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Settings
    allow_negative_stock BOOLEAN DEFAULT false,
    
    -- Account
    inventory_account_id INTEGER REFERENCES accounts(id),
    
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- WAREHOUSE LOCATIONS (Bins/Shelves)
-- =============================================
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    
    -- Location hierarchy
    zone VARCHAR(20),                          -- Zone A, B, C
    aisle VARCHAR(20),
    rack VARCHAR(20),
    shelf VARCHAR(20),
    bin VARCHAR(20),
    
    -- Capacity
    max_weight DECIMAL(18, 4),
    max_volume DECIMAL(18, 4),
    
    -- Type
    location_type VARCHAR(20) DEFAULT 'storage',  -- storage, receiving, shipping, staging
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, code)
);

-- =============================================
-- ITEM WAREHOUSE (Stock per warehouse)
-- =============================================
CREATE TABLE IF NOT EXISTS item_warehouse (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES item_variants(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES warehouse_locations(id),
    
    -- Stock Levels
    qty_on_hand DECIMAL(18, 4) DEFAULT 0,
    qty_reserved DECIMAL(18, 4) DEFAULT 0,     -- Reserved for orders
    qty_on_order DECIMAL(18, 4) DEFAULT 0,     -- On purchase order
    qty_available DECIMAL(18, 4) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
    
    -- Reorder Settings (override item defaults)
    min_stock_level DECIMAL(18, 4),
    max_stock_level DECIMAL(18, 4),
    reorder_level DECIMAL(18, 4),
    reorder_qty DECIMAL(18, 4),
    
    last_stock_date TIMESTAMP,
    last_count_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, variant_id, warehouse_id, location_id)
);

-- =============================================
-- BATCHES (Lot tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    batch_no VARCHAR(50) NOT NULL,
    
    manufacture_date DATE,
    expiry_date DATE,
    supplier_batch VARCHAR(50),                -- Supplier's batch number
    
    status VARCHAR(20) DEFAULT 'active',       -- active, expired, recalled, consumed
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, item_id, batch_no)
);

-- =============================================
-- SERIAL NUMBERS
-- =============================================
CREATE TABLE IF NOT EXISTS serial_numbers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    serial_no VARCHAR(100) NOT NULL,
    
    warehouse_id INTEGER REFERENCES warehouses(id),
    batch_id INTEGER REFERENCES batches(id),
    
    status VARCHAR(20) DEFAULT 'available',    -- available, sold, reserved, in_warranty, returned
    
    -- Warranty
    warranty_start DATE,
    warranty_end DATE,
    
    -- Tracking
    purchase_date DATE,
    purchase_doc_id INTEGER,                   -- Reference to purchase invoice
    sale_date DATE,
    sale_doc_id INTEGER,                       -- Reference to sales invoice
    customer_id INTEGER,                       -- Current owner
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, item_id, serial_no)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_item ON item_warehouse(item_id);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_warehouse ON item_warehouse(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_item_prices_item ON item_prices(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_batches_item ON batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item ON serial_numbers(item_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON serial_numbers(status);

-- =============================================
-- INSERT DEFAULT UOM
-- =============================================
INSERT INTO uom (code, name, name_ar, uom_type, is_base) VALUES
-- Units
('PCS', 'Piece', 'قطعة', 'unit', true),
('BOX', 'Box', 'صندوق', 'unit', false),
('CTN', 'Carton', 'كرتون', 'unit', false),
('PKT', 'Packet', 'باكت', 'unit', false),
('SET', 'Set', 'طقم', 'unit', false),
('PAIR', 'Pair', 'زوج', 'unit', false),
('DOZ', 'Dozen', 'درزن', 'unit', false),
('PAL', 'Pallet', 'طبلية', 'unit', false),
('CNT', 'Container', 'حاوية', 'unit', false),

-- Weight
('KG', 'Kilogram', 'كيلوغرام', 'weight', true),
('G', 'Gram', 'غرام', 'weight', false),
('TON', 'Metric Ton', 'طن متري', 'weight', false),
('LB', 'Pound', 'رطل', 'weight', false),
('OZ', 'Ounce', 'أونصة', 'weight', false),

-- Volume
('L', 'Liter', 'لتر', 'volume', true),
('ML', 'Milliliter', 'مليلتر', 'volume', false),
('GAL', 'Gallon', 'غالون', 'volume', false),
('CBM', 'Cubic Meter', 'متر مكعب', 'volume', false),

-- Length
('M', 'Meter', 'متر', 'length', true),
('CM', 'Centimeter', 'سنتيمتر', 'length', false),
('MM', 'Millimeter', 'مليمتر', 'length', false),
('FT', 'Feet', 'قدم', 'length', false),
('IN', 'Inch', 'إنش', 'length', false),

-- Area
('SQM', 'Square Meter', 'متر مربع', 'area', true),
('SQFT', 'Square Feet', 'قدم مربع', 'area', false)
ON CONFLICT (code) DO NOTHING;

-- Insert common UOM conversions
INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 12 FROM uom f, uom t WHERE f.code = 'DOZ' AND t.code = 'PCS'
ON CONFLICT DO NOTHING;

INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 1000 FROM uom f, uom t WHERE f.code = 'KG' AND t.code = 'G'
ON CONFLICT DO NOTHING;

INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 1000 FROM uom f, uom t WHERE f.code = 'TON' AND t.code = 'KG'
ON CONFLICT DO NOTHING;

INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 1000 FROM uom f, uom t WHERE f.code = 'L' AND t.code = 'ML'
ON CONFLICT DO NOTHING;

INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 100 FROM uom f, uom t WHERE f.code = 'M' AND t.code = 'CM'
ON CONFLICT DO NOTHING;

INSERT INTO uom_conversions (from_uom_id, to_uom_id, conversion_factor) 
SELECT f.id, t.id, 10 FROM uom f, uom t WHERE f.code = 'CM' AND t.code = 'MM'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE uom IS 'Units of Measure master table';
COMMENT ON TABLE uom_conversions IS 'UOM conversion factors';
COMMENT ON TABLE item_categories IS 'Hierarchical item categories';
COMMENT ON TABLE items IS 'Products, materials, and services';
COMMENT ON TABLE item_variants IS 'Item variants (size, color, etc.)';
COMMENT ON TABLE price_lists IS 'Price lists for different customer groups';
COMMENT ON TABLE item_prices IS 'Item prices per price list';
COMMENT ON TABLE warehouses IS 'Warehouse/storage location master';
COMMENT ON TABLE warehouse_locations IS 'Bins/shelves within warehouses';
COMMENT ON TABLE item_warehouse IS 'Stock levels per item per warehouse';
COMMENT ON TABLE batches IS 'Batch/lot tracking';
COMMENT ON TABLE serial_numbers IS 'Serial number tracking';
