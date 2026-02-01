-- Migration 034: Create New Inventory Control Tables
-- Date: 2025-12-25
-- Description: Create batch_numbers, inventory_policies, and reorder_rules tables (skipping existing tables warehouses, warehouse_locations, serial_numbers)

-- =====================================================
-- 1. Batch Numbers (New Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS batch_numbers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  supplier_id INTEGER, -- Will be linked to suppliers table
  purchase_order_id INTEGER, -- Will be linked to purchase orders
  quantity DECIMAL(18, 3),
  remaining_quantity DECIMAL(18, 3),
  unit_id INTEGER REFERENCES units_of_measure(id),
  notes_en TEXT,
  notes_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, item_id, batch_number, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_batch_numbers_company_id ON batch_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_item_id ON batch_numbers(item_id);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_batch_number ON batch_numbers(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_expiry_date ON batch_numbers(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_active ON batch_numbers(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE batch_numbers IS 'Batch/lot tracking with expiry dates';

-- =====================================================
-- 2. Inventory Policies (New Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_policies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  policy_code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  policy_type VARCHAR(30) CHECK (policy_type IN ('physical_count', 'cycle_count', 'annual_audit', 'reorder', 'write_off')),
  frequency VARCHAR(30), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  description_en TEXT,
  description_ar TEXT,
  rules JSONB, -- JSON configuration for policy rules
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, policy_code, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_inventory_policies_company_id ON inventory_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_policies_type ON inventory_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_inventory_policies_active ON inventory_policies(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE inventory_policies IS 'Inventory control policies (cycle count, reorder, etc.)';

-- =====================================================
-- 3. Reorder Rules (New Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS reorder_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id INTEGER REFERENCES warehouses(id),
  min_qty DECIMAL(18, 3) NOT NULL,
  max_qty DECIMAL(18, 3) NOT NULL,
  reorder_qty DECIMAL(18, 3) NOT NULL,
  reorder_level DECIMAL(18, 3) NOT NULL,
  lead_time_days INTEGER, -- Days to receive after ordering
  preferred_supplier_id INTEGER, -- Will be linked to suppliers
  auto_create_purchase_order BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, item_id, warehouse_id, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_reorder_rules_company_id ON reorder_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_item_id ON reorder_rules(item_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_warehouse_id ON reorder_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_active ON reorder_rules(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE reorder_rules IS 'Automatic reorder rules per item/warehouse';

-- =====================================================
-- Permissions for Group 3 New Tables
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) 
SELECT * FROM (VALUES
  ('batch_numbers:view', 'batch_numbers', 'view', 'View batch numbers'),
  ('batch_numbers:create', 'batch_numbers', 'create', 'Create new batch numbers'),
  ('batch_numbers:edit', 'batch_numbers', 'edit', 'Edit batch numbers'),
  ('batch_numbers:delete', 'batch_numbers', 'delete', 'Delete batch numbers'),
  ('inventory_policies:view', 'inventory_policies', 'view', 'View inventory policies'),
  ('inventory_policies:create', 'inventory_policies', 'create', 'Create new inventory policies'),
  ('inventory_policies:edit', 'inventory_policies', 'edit', 'Edit inventory policies'),
  ('inventory_policies:delete', 'inventory_policies', 'delete', 'Delete inventory policies'),
  ('reorder_rules:view', 'reorder_rules', 'view', 'View reorder rules'),
  ('reorder_rules:create', 'reorder_rules', 'create', 'Create new reorder rules'),
  ('reorder_rules:edit', 'reorder_rules', 'edit', 'Edit reorder rules'),
  ('reorder_rules:delete', 'reorder_rules', 'delete', 'Delete reorder rules')
) AS v(permission_code, resource, action, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permissions.permission_code = v.permission_code);

-- Grant permissions to super_admin and admin
DO $$
DECLARE
  super_admin_role_id INTEGER;
  admin_role_id INTEGER;
  perm RECORD;
BEGIN
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

  FOR perm IN 
    SELECT id FROM permissions 
    WHERE permission_code LIKE 'batch_numbers:%'
       OR permission_code LIKE 'inventory_policies:%'
       OR permission_code LIKE 'reorder_rules:%'
  LOOP
    IF super_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (super_admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 034 completed successfully';
  RAISE NOTICE '📊 Created 3 new tables: batch_numbers, inventory_policies, reorder_rules';
  RAISE NOTICE '🔐 Added 12 permissions for new inventory entities';
  RAISE NOTICE '👤 Granted permissions to super_admin and admin roles';
END $$;
