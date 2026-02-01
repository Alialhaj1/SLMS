-- =====================================================
-- Migration 046: Logistics Integration Tables + Permissions
-- Adds:
-- - shipment_milestones
-- - shipment_alert_rules
-- - carrier_quotes
-- - carrier_evaluations
-- Also seeds frontend-aligned permission codes.
-- =====================================================

-- Shipment milestones / dates per shipment (company scoped)
CREATE TABLE IF NOT EXISTS shipment_milestones (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_reference VARCHAR(100) NOT NULL,
  origin VARCHAR(255),
  destination VARCHAR(255),
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  etd_planned DATE,
  eta_planned DATE,
  atd_actual DATE,
  ata_actual DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, shipment_reference)
);

CREATE INDEX IF NOT EXISTS idx_shipment_milestones_company_id ON shipment_milestones(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_milestones_shipment_reference ON shipment_milestones(shipment_reference);
CREATE INDEX IF NOT EXISTS idx_shipment_milestones_status ON shipment_milestones(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_milestones_deleted_at ON shipment_milestones(deleted_at);

-- Shipment alert rules engine (company scoped)
CREATE TABLE IF NOT EXISTS shipment_alert_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  threshold_value NUMERIC(14,2),
  threshold_unit VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_alert_rules_company_id ON shipment_alert_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_alert_rules_rule_type ON shipment_alert_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_shipment_alert_rules_is_active ON shipment_alert_rules(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_alert_rules_deleted_at ON shipment_alert_rules(deleted_at);

-- Carrier quotes (company scoped)
CREATE TABLE IF NOT EXISTS carrier_quotes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  carrier VARCHAR(255) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  service_level VARCHAR(20) NOT NULL DEFAULT 'standard',
  transit_days INTEGER NOT NULL DEFAULT 7,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
  valid_until DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carrier_quotes_company_id ON carrier_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_carrier_quotes_carrier ON carrier_quotes(carrier);
CREATE INDEX IF NOT EXISTS idx_carrier_quotes_valid_until ON carrier_quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_carrier_quotes_deleted_at ON carrier_quotes(deleted_at);

-- Carrier evaluations (company scoped)
CREATE TABLE IF NOT EXISTS carrier_evaluations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  carrier VARCHAR(255) NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  on_time_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  damage_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  communication_score INTEGER NOT NULL DEFAULT 3,
  cost_score INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carrier_evaluations_company_id ON carrier_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_carrier_evaluations_carrier ON carrier_evaluations(carrier);
CREATE INDEX IF NOT EXISTS idx_carrier_evaluations_period ON carrier_evaluations(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_carrier_evaluations_deleted_at ON carrier_evaluations(deleted_at);

-- =====================================================
-- Permissions (frontend-aligned)
-- =====================================================

-- Ensure permissions table has module metadata columns (older installs created it without these)
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(100);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('logistics:shipment_milestones:view', 'logistics:shipment_milestones', 'view', 'View Shipment Milestones', 'Logistics'),
  ('logistics:shipment_milestones:manage', 'logistics:shipment_milestones', 'manage', 'Manage Shipment Milestones', 'Logistics'),

  ('logistics:shipment_alert_rules:view', 'logistics:shipment_alert_rules', 'view', 'View Shipment Alert Rules', 'Logistics'),
  ('logistics:shipment_alert_rules:manage', 'logistics:shipment_alert_rules', 'manage', 'Manage Shipment Alert Rules', 'Logistics'),

  ('logistics:carrier_quotes:view', 'logistics:carrier_quotes', 'view', 'View Carrier Quotes', 'Logistics'),
  ('logistics:carrier_quotes:manage', 'logistics:carrier_quotes', 'manage', 'Manage Carrier Quotes', 'Logistics'),

  ('logistics:carrier_evaluations:view', 'logistics:carrier_evaluations', 'view', 'View Carrier Evaluations', 'Logistics'),
  ('logistics:carrier_evaluations:manage', 'logistics:carrier_evaluations', 'manage', 'Manage Carrier Evaluations', 'Logistics'),

  ('reports:shipment_profitability:view', 'reports:shipment_profitability', 'view', 'View Shipment Profitability Report', 'Reports'),
  ('reports:shipment_profitability:export', 'reports:shipment_profitability', 'export', 'Export Shipment Profitability Report', 'Reports'),

  ('reports:cost_variance:view', 'reports:cost_variance', 'view', 'View Cost Variance Report', 'Reports'),
  ('reports:cost_variance:export', 'reports:cost_variance', 'export', 'Export Cost Variance Report', 'Reports'),

  ('reports:top_cost_suppliers:view', 'reports:top_cost_suppliers', 'view', 'View Top Cost Suppliers Report', 'Reports'),
  ('reports:top_cost_suppliers:export', 'reports:top_cost_suppliers', 'export', 'Export Top Cost Suppliers Report', 'Reports')
ON CONFLICT (permission_code) DO NOTHING;

-- Ensure super_admin role has all permissions
DO $$
DECLARE
    all_permissions JSONB;
    super_admin_id INTEGER;
BEGIN
    SELECT jsonb_agg(permission_code)
    INTO all_permissions
    FROM permissions;

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
