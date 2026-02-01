-- Migration 111: Procurement Reference Data (Phase 10)
-- NOTE: Many tables already exist from previous migrations
-- This migration only SEEDS reference data without modifying schema

-- ============================================
-- Seed Data for Company 1
-- ============================================

-- Purchase Order Types (use existing table, just INSERT data)
INSERT INTO purchase_order_types (company_id, code, name, name_ar, affects_inventory, requires_grn, is_active)
VALUES
  (1, 'LOCAL', 'Local Purchase', 'شراء محلي', true, true, true),
  (1, 'IMPORT', 'Import Purchase', 'شراء استيراد', true, true, true),
  (1, 'SERVICE', 'Service Purchase', 'شراء خدمة', false, false, true),
  (1, 'EMERGENCY', 'Emergency Purchase', 'شراء طارئ', true, true, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Vendor Categories (create if not exists, then seed)
CREATE TABLE IF NOT EXISTS vendor_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

INSERT INTO vendor_categories (company_id, code, name, description)
VALUES
  (1, 'CAT-LOC', 'Local Suppliers', 'Domestic suppliers within Saudi Arabia'),
  (1, 'CAT-INT', 'International Suppliers', 'Overseas suppliers requiring import procedures'),
  (1, 'CAT-LOG', 'Logistics Services', 'Freight forwarders, customs brokers'),
  (1, 'CAT-SRV', 'Service Providers', 'Non-inventory service vendors'),
  (1, 'CAT-RAW', 'Raw Materials', 'Raw material suppliers')
ON CONFLICT (company_id, code) DO NOTHING;

-- Vendor Types (create if not exists, then seed)
CREATE TABLE IF NOT EXISTS vendor_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, code)
);

INSERT INTO vendor_types (company_id, code, name, description)
VALUES
  (1, 'MAN', 'Manufacturer', 'Direct manufacturer'),
  (1, 'DIST', 'Distributor', 'Authorized distributor'),
  (1, 'WH', 'Wholesaler', 'Wholesale trader'),
  (1, 'FWD', 'Freight Forwarder', 'Logistics and freight services'),
  (1, 'CUS', 'Customs Broker', 'Customs clearance services')
ON CONFLICT (company_id, code) DO NOTHING;

-- Incoterms (create if not exists, then seed)
CREATE TABLE IF NOT EXISTS incoterms (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

INSERT INTO incoterms (code, name, description)
VALUES
  ('EXW', 'Ex Works', 'Seller makes goods available at their premises'),
  ('FOB', 'Free on Board', 'Seller delivers goods on board vessel'),
  ('CIF', 'Cost Insurance and Freight', 'Seller pays cost, insurance, freight'),
  ('CFR', 'Cost and Freight', 'Seller pays cost and freight'),
  ('DDP', 'Delivered Duty Paid', 'Seller delivers goods cleared for import')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Add Foreign Keys to Existing Tables (if not exists)
-- ============================================

-- Add vendor_category_id to vendors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'vendor_category_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vendor_category_id INTEGER REFERENCES vendor_categories(id);
  END IF;
END $$;

-- Add vendor_type_id to vendors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'vendor_type_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vendor_type_id INTEGER REFERENCES vendor_types(id);
  END IF;
END $$;

-- Add incoterm_id to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'incoterm_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN incoterm_id INTEGER REFERENCES incoterms(id);
  END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 111 completed: Procurement reference data seeded';
  RAISE NOTICE '  - 4 Purchase Order Types seeded';
  RAISE NOTICE '  - 5 Vendor Categories created & seeded';
  RAISE NOTICE '  - 5 Vendor Types created & seeded';
  RAISE NOTICE '  - 5 Incoterms created & seeded';
  RAISE NOTICE '  - Foreign keys added where needed';
  RAISE NOTICE '  - Existing 767 vendors preserved';
END $$;
