-- =====================================================
-- Migration 096: Logistics Shipments V2 (Operational)
-- Creates company-scoped shipments core with:
-- - shipment types
-- - shipment header + items
-- - receiving receipts (inventory_movements integration)
-- - cost defaults + shipment costs (journal draft integration)
-- - permissions for logistics shipment operations
-- =====================================================

BEGIN;

-- ---------------------------------------------
-- 1) Master: Logistics Shipment Types
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_shipment_types (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_types_company_id
  ON logistics_shipment_types(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_types_deleted_at
  ON logistics_shipment_types(deleted_at);

-- ---------------------------------------------
-- 2) Core: Logistics Shipments (company-scoped)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  shipment_number VARCHAR(60) NOT NULL,
  shipment_type_id INTEGER NOT NULL REFERENCES logistics_shipment_types(id),

  incoterm VARCHAR(20) NOT NULL,

  bl_no VARCHAR(60),
  awb_no VARCHAR(60),

  origin_location_id INTEGER NOT NULL REFERENCES cities(id),
  destination_location_id INTEGER NOT NULL REFERENCES cities(id),
  expected_arrival_date DATE NOT NULL,

  warehouse_id INTEGER REFERENCES warehouses(id),

  stage_code VARCHAR(50),
  status_code VARCHAR(50),

  notes TEXT,

  locked_at TIMESTAMP,
  locked_by INTEGER REFERENCES users(id),

  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE(company_id, shipment_number),
  CONSTRAINT chk_logistics_shipments_doc_no CHECK (
    COALESCE(NULLIF(bl_no, ''), NULLIF(awb_no, '')) IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_company_id
  ON logistics_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_shipment_number
  ON logistics_shipments(company_id, shipment_number);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_status_code
  ON logistics_shipments(company_id, status_code)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_deleted_at
  ON logistics_shipments(deleted_at);

-- ---------------------------------------------
-- 3) Shipment Items (must exist before receiving)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_shipment_items (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  quantity DECIMAL(18, 4) NOT NULL,
  unit_cost DECIMAL(18, 4) NOT NULL DEFAULT 0,
  received_qty DECIMAL(18, 4) NOT NULL DEFAULT 0,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  CONSTRAINT chk_logistics_shipment_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_logistics_shipment_items_received CHECK (received_qty >= 0)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_items_company
  ON logistics_shipment_items(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_items_shipment
  ON logistics_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_items_item
  ON logistics_shipment_items(item_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_items_deleted_at
  ON logistics_shipment_items(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_logistics_shipment_items_one_per_item
  ON logistics_shipment_items(shipment_id, item_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------
-- 4) Receiving (receipt header + lines)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_shipment_receipts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),

  receipt_no VARCHAR(60) NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE(company_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_receipts_company
  ON logistics_shipment_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_receipts_shipment
  ON logistics_shipment_receipts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_receipts_deleted_at
  ON logistics_shipment_receipts(deleted_at);

CREATE TABLE IF NOT EXISTS logistics_shipment_receipt_lines (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receipt_id INTEGER NOT NULL REFERENCES logistics_shipment_receipts(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  qty_received DECIMAL(18, 4) NOT NULL,
  unit_cost DECIMAL(18, 4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_logistics_receipt_lines_qty CHECK (qty_received > 0)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_receipt_lines_receipt
  ON logistics_shipment_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_receipt_lines_item
  ON logistics_shipment_receipt_lines(item_id);

-- ---------------------------------------------
-- 5) Shipment Costs + Default Accounts mapping
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_shipment_cost_default_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  cost_type_code VARCHAR(30) NOT NULL,
  debit_account_id INTEGER NOT NULL REFERENCES accounts(id),
  credit_account_id INTEGER NOT NULL REFERENCES accounts(id),

  is_active BOOLEAN DEFAULT TRUE,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE(company_id, cost_type_code)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_cost_defaults_company
  ON logistics_shipment_cost_default_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_cost_defaults_deleted
  ON logistics_shipment_cost_default_accounts(deleted_at);

CREATE TABLE IF NOT EXISTS logistics_shipment_costs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,

  cost_type_code VARCHAR(30) NOT NULL,
  amount DECIMAL(18, 4) NOT NULL,
  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  description TEXT,

  journal_entry_id INTEGER REFERENCES journal_entries(id),

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  CONSTRAINT chk_logistics_shipment_costs_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipment_costs_company
  ON logistics_shipment_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_costs_shipment
  ON logistics_shipment_costs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_costs_deleted
  ON logistics_shipment_costs(deleted_at);

-- ---------------------------------------------
-- 6) Permissions (frontend-aligned)
-- ---------------------------------------------
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(100);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('logistics:shipments:view', 'logistics:shipments', 'view', 'View Logistics Shipments', 'Logistics'),
  ('logistics:shipments:create', 'logistics:shipments', 'create', 'Create Logistics Shipments', 'Logistics'),
  ('logistics:shipments:edit', 'logistics:shipments', 'edit', 'Edit Logistics Shipments', 'Logistics'),
  ('logistics:shipments:delete', 'logistics:shipments', 'delete', 'Delete Logistics Shipments', 'Logistics'),

  ('logistics:shipment_types:view', 'logistics:shipment_types', 'view', 'View Shipment Types', 'Logistics'),
  ('logistics:shipment_types:create', 'logistics:shipment_types', 'create', 'Create Shipment Types', 'Logistics'),
  ('logistics:shipment_types:edit', 'logistics:shipment_types', 'edit', 'Edit Shipment Types', 'Logistics'),
  ('logistics:shipment_types:delete', 'logistics:shipment_types', 'delete', 'Delete Shipment Types', 'Logistics'),

  ('logistics:shipment_receiving:view', 'logistics:shipment_receiving', 'view', 'View Shipment Receiving', 'Logistics'),
  ('logistics:shipment_receiving:receive', 'logistics:shipment_receiving', 'receive', 'Receive Shipments into Inventory', 'Logistics'),
  ('logistics:shipment_receiving:manage', 'logistics:shipment_receiving', 'manage', 'Manage Shipment Receiving', 'Logistics'),

  ('logistics:shipment_accounting_bridge:view', 'logistics:shipment_accounting_bridge', 'view', 'View Shipment Accounting Bridge', 'Logistics'),
  ('logistics:shipment_accounting_bridge:manage', 'logistics:shipment_accounting_bridge', 'manage', 'Manage Shipment Accounting Bridge', 'Logistics'),
  ('logistics:shipment_accounting_bridge:close', 'logistics:shipment_accounting_bridge', 'close', 'Close/Lock Shipment Accounting Bridge', 'Logistics')
ON CONFLICT (permission_code) DO NOTHING;

-- Ensure super_admin role has all permissions
DO $$
DECLARE
  all_permissions JSONB;
  super_admin_id INTEGER;
BEGIN
  SELECT jsonb_agg(permission_code) INTO all_permissions FROM permissions;

  SELECT id INTO super_admin_id
  FROM roles
  WHERE name = 'super_admin' OR name = 'Super Admin'
  LIMIT 1;

  IF super_admin_id IS NOT NULL AND all_permissions IS NOT NULL THEN
    UPDATE roles
    SET permissions = all_permissions,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = super_admin_id;
  END IF;
END $$;

COMMIT;
