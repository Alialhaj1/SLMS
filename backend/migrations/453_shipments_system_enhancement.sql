-- Migration 453: Shipments System Enhancement
-- Fixes critical issues, adds missing columns, creates missing tables

BEGIN;

-- ============================================================
-- 1. Add missing columns to logistics_shipments
-- ============================================================

-- Currency & Exchange Rate (currently only via PO join)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='currency_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN currency_id integer REFERENCES currencies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='exchange_rate') THEN
    ALTER TABLE logistics_shipments ADD COLUMN exchange_rate numeric(18,6) DEFAULT 1;
  END IF;
  -- Payment method as FK instead of free text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='payment_method_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN payment_method_id integer REFERENCES payment_methods(id);
  END IF;
  -- Letter of Credit FK
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='letter_of_credit_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN letter_of_credit_id integer REFERENCES letters_of_credit(id);
  END IF;
  -- Origin/Destination country IDs (separate from city)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='origin_country_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN origin_country_id integer REFERENCES countries(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='destination_country_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN destination_country_id integer REFERENCES countries(id);
  END IF;
  -- Shipping agent FK
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='shipping_agent_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN shipping_agent_id integer REFERENCES shipping_agents(id);
  END IF;
  -- Shipping method FK
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='shipping_method_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN shipping_method_id integer;
  END IF;
  -- Insurance company
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='insurance_company_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN insurance_company_id integer;
  END IF;
  -- Clearance office
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='clearance_office_id') THEN
    ALTER TABLE logistics_shipments ADD COLUMN clearance_office_id integer;
  END IF;
  -- Actual arrival date (vs expected)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='actual_arrival_date') THEN
    ALTER TABLE logistics_shipments ADD COLUMN actual_arrival_date date;
  END IF;
  -- Departure date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='departure_date') THEN
    ALTER TABLE logistics_shipments ADD COLUMN departure_date date;
  END IF;
  -- Cargo description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='cargo_description') THEN
    ALTER TABLE logistics_shipments ADD COLUMN cargo_description text;
  END IF;
  -- Weight & volume
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='total_weight_kg') THEN
    ALTER TABLE logistics_shipments ADD COLUMN total_weight_kg numeric(18,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='total_volume_cbm') THEN
    ALTER TABLE logistics_shipments ADD COLUMN total_volume_cbm numeric(18,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='packages_count') THEN
    ALTER TABLE logistics_shipments ADD COLUMN packages_count integer DEFAULT 0;
  END IF;
END$$;

-- ============================================================
-- 2. Create shipment_cost_types if missing
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_cost_types (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  tenant_id integer NOT NULL,
  code varchar(30) NOT NULL,
  name_en varchar(200) NOT NULL,
  name_ar varchar(200),
  category varchar(50) DEFAULT 'other',
  debit_account_id integer REFERENCES accounts(id),
  credit_account_id integer REFERENCES accounts(id),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  deleted_at timestamp,
  UNIQUE(company_id, code)
);

-- ============================================================
-- 3. Create landed_cost_settings if missing
-- ============================================================
CREATE TABLE IF NOT EXISTS landed_cost_settings (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  tenant_id integer NOT NULL,
  cost_type_code varchar(30) NOT NULL,
  debit_account_id integer REFERENCES accounts(id),
  credit_account_id integer REFERENCES accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  deleted_at timestamp,
  UNIQUE(company_id, cost_type_code)
);

-- ============================================================
-- 4. Create landed_cost_allocations if missing
-- ============================================================
CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  tenant_id integer NOT NULL,
  shipment_id integer NOT NULL REFERENCES logistics_shipments(id),
  expense_id integer REFERENCES shipment_expenses(id),
  item_id integer REFERENCES logistics_shipment_items(id),
  allocation_method varchar(20) DEFAULT 'value',
  percentage numeric(8,4),
  allocated_amount numeric(18,4),
  amount_base_currency numeric(18,4),
  is_posted boolean DEFAULT false,
  journal_entry_id integer,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  deleted_at timestamp
);

-- ============================================================
-- 5. Create shipment_alerts if missing
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_alerts (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  tenant_id integer NOT NULL,
  shipment_id integer NOT NULL REFERENCES logistics_shipments(id),
  alert_rule_id integer REFERENCES shipment_alert_rules(id),
  alert_type varchar(50) NOT NULL,
  severity varchar(20) DEFAULT 'medium',
  title varchar(200),
  title_ar varchar(200),
  message text,
  message_ar text,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp,
  resolved_by integer,
  created_at timestamp DEFAULT NOW(),
  deleted_at timestamp
);

-- ============================================================
-- 6. Fix shipment_events FK: add logistics_shipment_id column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_events' AND column_name='logistics_shipment_id') THEN
    ALTER TABLE shipment_events ADD COLUMN logistics_shipment_id integer REFERENCES logistics_shipments(id);
    CREATE INDEX IF NOT EXISTS idx_shipment_events_logistics ON shipment_events(logistics_shipment_id);
  END IF;
END$$;

-- ============================================================
-- 7. Create view or alias for shipment_types compatibility
-- ============================================================
DO $$
BEGIN
  -- Sync logistics_shipment_types into legacy shipment_types for backward compatibility
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='shipment_types') THEN
    INSERT INTO shipment_types (code, name_en, name_ar, is_active, company_id)
    SELECT lst.code, lst.name_en, lst.name_ar, lst.is_active, lst.company_id
    FROM logistics_shipment_types lst
    WHERE NOT EXISTS (
      SELECT 1 FROM shipment_types st WHERE st.code = lst.code AND st.company_id = lst.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- ============================================================
-- 8. Seed Incoterms reference data (table already exists)
-- ============================================================
INSERT INTO incoterms (code, name, name_ar, description, is_active) VALUES
('EXW', 'Ex Works', 'تسليم المصنع', 'Seller makes goods available at their premises', true),
('FCA', 'Free Carrier', 'التسليم للناقل', 'Seller delivers goods to carrier at named place', true),
('FAS', 'Free Alongside Ship', 'التسليم بجانب السفينة', 'Seller delivers goods alongside the vessel', true),
('FOB', 'Free on Board', 'التسليم على ظهر السفينة', 'Seller delivers goods on board the vessel', true),
('CFR', 'Cost and Freight', 'التكلفة والشحن', 'Seller pays costs and freight to destination port', true),
('CIF', 'Cost, Insurance and Freight', 'التكلفة والتأمين والشحن', 'Seller pays costs, insurance and freight', true),
('CPT', 'Carriage Paid To', 'الشحن مدفوع إلى', 'Seller pays for carriage to destination', true),
('CIP', 'Carriage and Insurance Paid To', 'الشحن والتأمين مدفوع إلى', 'Seller pays carriage and insurance', true),
('DAP', 'Delivered at Place', 'التسليم في المكان', 'Seller delivers goods at the named destination', true),
('DPU', 'Delivered at Place Unloaded', 'التسليم في المكان بعد التفريغ', 'Seller delivers and unloads at destination', true),
('DDP', 'Delivered Duty Paid', 'التسليم مع دفع الرسوم', 'Seller delivers goods cleared for import', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 9. Add indexes for new columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ls_currency ON logistics_shipments(currency_id);
CREATE INDEX IF NOT EXISTS idx_ls_payment_method ON logistics_shipments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_ls_lc ON logistics_shipments(letter_of_credit_id);
CREATE INDEX IF NOT EXISTS idx_ls_shipping_agent ON logistics_shipments(shipping_agent_id);
CREATE INDEX IF NOT EXISTS idx_ls_origin_country ON logistics_shipments(origin_country_id);
CREATE INDEX IF NOT EXISTS idx_ls_dest_country ON logistics_shipments(destination_country_id);
CREATE INDEX IF NOT EXISTS idx_ls_insurance ON logistics_shipments(insurance_company_id);
CREATE INDEX IF NOT EXISTS idx_ls_clearance ON logistics_shipments(clearance_office_id);

-- ============================================================
-- 10. Add permissions for new features
-- ============================================================
INSERT INTO permissions (permission_code, resource, action, description, module, created_at) VALUES
('logistics:shipment_alerts:view', 'shipment_alerts', 'view', 'View shipment alerts', 'logistics', NOW()),
('logistics:shipment_alerts:manage', 'shipment_alerts', 'manage', 'Manage shipment alerts', 'logistics', NOW()),
('logistics:shipment_cost_types:view', 'shipment_cost_types', 'view', 'View shipment cost types', 'logistics', NOW()),
('logistics:shipment_cost_types:create', 'shipment_cost_types', 'create', 'Create shipment cost types', 'logistics', NOW()),
('logistics:shipment_cost_types:edit', 'shipment_cost_types', 'edit', 'Edit shipment cost types', 'logistics', NOW()),
('logistics:shipment_cost_types:delete', 'shipment_cost_types', 'delete', 'Delete shipment cost types', 'logistics', NOW()),
('logistics:landed_cost_settings:view', 'landed_cost_settings', 'view', 'View landed cost settings', 'logistics', NOW()),
('logistics:landed_cost_settings:manage', 'landed_cost_settings', 'manage', 'Manage landed cost settings', 'logistics', NOW()),
('logistics:landed_cost_allocations:view', 'landed_cost_allocations', 'view', 'View landed cost allocations', 'logistics', NOW()),
('logistics:landed_cost_allocations:manage', 'landed_cost_allocations', 'manage', 'Manage landed cost allocations', 'logistics', NOW())
ON CONFLICT (permission_code) DO NOTHING;

-- Grant new permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p
WHERE r.name = 'admin' 
  AND p.permission_code IN (
    'logistics:shipment_alerts:view', 'logistics:shipment_alerts:manage',
    'logistics:shipment_cost_types:view', 'logistics:shipment_cost_types:create',
    'logistics:shipment_cost_types:edit', 'logistics:shipment_cost_types:delete',
    'logistics:landed_cost_settings:view', 'logistics:landed_cost_settings:manage',
    'logistics:landed_cost_allocations:view', 'logistics:landed_cost_allocations:manage'
  )
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO migrations (name, run_at) VALUES ('453_shipments_system_enhancement.sql', NOW())
ON CONFLICT (name) DO NOTHING;

COMMIT;
