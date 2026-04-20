-- ============================================================================
-- Migration: 411_database_schema_alignment.sql
-- Section:   §10 — قاعدة البيانات — Database Schema
-- Purpose:   Align all tables to §10 spec: views for naming compliance,
--            add missing tenant_id columns, backfill from companies,
--            add missing FK columns, enforce NOT NULL constraints.
-- Note:      PK type remains SERIAL (INTEGER) throughout — converting to UUID
--            would break every FK in the system. A future migration can handle
--            the INT → UUID conversion when the full codebase is ready.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: §10.1 — Public Schema Compliance
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1a. tenant_plans — VIEW over subscription_plans
--     All existing routes query subscription_plans directly; this VIEW
--     provides §10 naming compliance without breaking anything.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW tenant_plans AS
  SELECT id,
         plan_code AS code,
         plan_name AS name,
         name_ar,
         description,
         description_ar,
         max_users,
         max_companies,
         max_branches,
         max_storage_mb,
         max_api_calls_per_day,
         price_monthly,
         price_yearly,
         currency,
         features,
         is_active,
         is_default,
         sort_order,
         trial_days,
         created_at,
         updated_at,
         deleted_at
  FROM subscription_plans;

-- ─────────────────────────────────────────────
-- 1b. platform_audit_logs — VIEW over audit.platform_logs
--     Routes query audit.platform_logs; this VIEW provides public-schema access
--     under the §10 name.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW platform_audit_logs AS
  SELECT id,
         action,
         actor_id,
         actor_type,
         resource,
         resource_id,
         tenant_id,
         before_data,
         after_data,
         ip_address,
         user_agent,
         metadata,
         created_at
  FROM audit.platform_logs;

-- ─────────────────────────────────────────────
-- 1c. sessions — VIEW over tenant_sessions
--     §10.2 lists "sessions" but the physical table is "tenant_sessions".
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW sessions AS
  SELECT id,
         session_id,
         user_id,
         tenant_id,
         jti,
         login_context,
         ip_address,
         user_agent,
         device_fingerprint,
         device_info,
         is_active,
         last_activity_at,
         expires_at,
         revoked_at,
         revoked_reason,
         created_at
  FROM tenant_sessions;

-- ─────────────────────────────────────────────
-- 1d. tenants — add country_id FK to countries
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN country_id INTEGER REFERENCES countries(id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 1e. tenants — FK to subscription_plans (if missing)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tenants' AND constraint_name = 'fk_tenants_subscription_plan'
  ) THEN
    -- Ensure the column exists and add FK
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tenants' AND column_name = 'subscription_plan_id'
    ) THEN
      ALTER TABLE tenants
        ADD CONSTRAINT fk_tenants_subscription_plan
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id);
    END IF;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: §10.2 — Add tenant_id to tables that only have company_id
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: add tenant_id + FK + backfill from companies for a given table
-- We use a DO block per table for idempotency.

-- ─────────────────────────────────────────────
-- 2a. branches — add tenant_id, backfill from companies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE branches ADD COLUMN tenant_id INTEGER;
  END IF;
END $$;

-- Backfill from companies.tenant_id
UPDATE branches b
SET tenant_id = c.tenant_id
FROM companies c
WHERE b.company_id = c.id
  AND b.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

-- FK constraint (if not already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'branches' AND constraint_name = 'fk_branches_tenant_id'
  ) THEN
    ALTER TABLE branches
      ADD CONSTRAINT fk_branches_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);

-- ─────────────────────────────────────────────
-- 2b. customers — add tenant_id, backfill from companies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN tenant_id INTEGER;
  END IF;
END $$;

UPDATE customers cu
SET tenant_id = c.tenant_id
FROM companies c
WHERE cu.company_id = c.id
  AND cu.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customers' AND constraint_name = 'fk_customers_tenant_id'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT fk_customers_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- ─────────────────────────────────────────────
-- 2c. items — add tenant_id, backfill from companies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE items ADD COLUMN tenant_id INTEGER;
  END IF;
END $$;

UPDATE items i
SET tenant_id = c.tenant_id
FROM companies c
WHERE i.company_id = c.id
  AND i.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'items' AND constraint_name = 'fk_items_tenant_id'
  ) THEN
    ALTER TABLE items
      ADD CONSTRAINT fk_items_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON items(tenant_id);

-- ─────────────────────────────────────────────
-- 2d. warehouses — add tenant_id, backfill from companies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN tenant_id INTEGER;
  END IF;
END $$;

UPDATE warehouses w
SET tenant_id = c.tenant_id
FROM companies c
WHERE w.company_id = c.id
  AND w.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'warehouses' AND constraint_name = 'fk_warehouses_tenant_id'
  ) THEN
    ALTER TABLE warehouses
      ADD CONSTRAINT fk_warehouses_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses(tenant_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: §10.2 — Add missing FK columns to tenant tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 3a. shipments — add type_id, incoterm_id, container_type_id
-- ─────────────────────────────────────────────
DO $$ BEGIN
  -- type_id → shipment_types (created in migration 408)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'type_id'
  ) THEN
    ALTER TABLE shipments ADD COLUMN type_id INTEGER;
    -- FK only if shipment_types table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipment_types') THEN
      ALTER TABLE shipments
        ADD CONSTRAINT fk_shipments_type_id
        FOREIGN KEY (type_id) REFERENCES shipment_types(id);
    END IF;
  END IF;

  -- incoterm_id → incoterms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'incoterm_id'
  ) THEN
    ALTER TABLE shipments ADD COLUMN incoterm_id INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incoterms') THEN
      ALTER TABLE shipments
        ADD CONSTRAINT fk_shipments_incoterm_id
        FOREIGN KEY (incoterm_id) REFERENCES incoterms(id);
    END IF;
  END IF;

  -- container_type_id → container_types
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'container_type_id'
  ) THEN
    ALTER TABLE shipments ADD COLUMN container_type_id INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'container_types') THEN
      ALTER TABLE shipments
        ADD CONSTRAINT fk_shipments_container_type_id
        FOREIGN KEY (container_type_id) REFERENCES container_types(id);
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3b. purchase_orders — add incoterm_id
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'incoterm_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN incoterm_id INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incoterms') THEN
      ALTER TABLE purchase_orders
        ADD CONSTRAINT fk_purchase_orders_incoterm_id
        FOREIGN KEY (incoterm_id) REFERENCES incoterms(id);
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3c. suppliers — add supplier_type_id, country_id
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'supplier_type_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN supplier_type_id INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_types') THEN
      ALTER TABLE suppliers
        ADD CONSTRAINT fk_suppliers_supplier_type_id
        FOREIGN KEY (supplier_type_id) REFERENCES supplier_types(id);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN country_id INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'countries') THEN
      ALTER TABLE suppliers
        ADD CONSTRAINT fk_suppliers_country_id
        FOREIGN KEY (country_id) REFERENCES countries(id);
    END IF;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: §10.2 — Enforce tenant_id NOT NULL (with safety checks)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Rule: All tenant schema tables must have tenant_id NOT NULL.
-- Exceptions:
--   • users / roles: tenant_id may be NULL for platform/super_admin entries
--   • audit_logs: may have NULL tenant_id for platform-level actions
-- We enforce NOT NULL only on tables where every row should be tenant-scoped.

-- ─────────────────────────────────────────────
-- 4a. branches — enforce NOT NULL (tenant-only table)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  -- Only enforce if no NULL rows remain
  IF NOT EXISTS (SELECT 1 FROM branches WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE branches ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ branches: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4b. customers — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ customers: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4c. items — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM items WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE items ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ items: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4d. warehouses — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM warehouses WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE warehouses ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ warehouses: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4e. suppliers — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ suppliers: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4f. shipments — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM shipments WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE shipments ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ shipments: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4g. purchase_orders — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ purchase_orders: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4h. notifications — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ notifications: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4i. tenant_sessions — enforce NOT NULL
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenant_sessions WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE tenant_sessions ALTER COLUMN tenant_id SET NOT NULL;
  ELSE
    RAISE NOTICE '⚠ tenant_sessions: some rows have NULL tenant_id — skipping NOT NULL';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Tenant-isolation trigger for new INSERT — auto-inject tenant_id
-- ═══════════════════════════════════════════════════════════════════════════════
-- ORM middleware rule: "tenant_id يحقنه تلقائياً في كل استعلام"
-- PostgreSQL trigger that auto-populates tenant_id from company_id on INSERT
-- for tables that use the company_id → companies → tenants chain.

CREATE OR REPLACE FUNCTION auto_inject_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If tenant_id already set, do nothing
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to derive from company_id
  IF NEW.company_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM companies
    WHERE id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables that have both company_id and tenant_id
DO $$ 
DECLARE
  _tbl TEXT;
BEGIN
  FOR _tbl IN 
    SELECT unnest(ARRAY['branches', 'customers', 'items', 'warehouses', 'shipments', 'purchase_orders', 'suppliers'])
  LOOP
    -- Only create trigger if both columns exist on the table
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = _tbl AND column_name = 'company_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = _tbl AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_auto_inject_tenant_id ON %I; 
         CREATE TRIGGER trg_auto_inject_tenant_id
           BEFORE INSERT ON %I
           FOR EACH ROW
           EXECUTE FUNCTION auto_inject_tenant_id()',
        _tbl, _tbl
      );
    END IF;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: §10 permissions
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO permissions (permission_code, resource, action, description, module_code, domain)
VALUES
  ('schema:view',       'schema', 'view',       'View database schema information', 'core', 'platform'),
  ('schema:migrate',    'schema', 'migrate',    'Run database migrations',          'core', 'platform')
ON CONFLICT (permission_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
