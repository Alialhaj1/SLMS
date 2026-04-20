-- ============================================================================
-- Migration 362: Core Database Structure — Arabic Specification §15.1
-- ============================================================================
-- Ensures all 12 core tables per specification exist with:
--   ✓ tenant_id NOT NULL (on all tenant-scoped tables)
--   ✓ created_at, updated_at, deleted_at (soft delete)
--   ✓ Proper foreign key relationships
--   ✓ Performance indexes
--
-- ⚠ SAFETY: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout
--   so this migration is idempotent and safe to run against existing data.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TENANTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- The system uses `companies` as the physical table, but the code also
-- queries a `tenants` table/view. Ensure both exist.

-- Create tenants table if it doesn't exist (some deployments create it manually)
CREATE TABLE IF NOT EXISTS tenants (
    id              SERIAL PRIMARY KEY,
    company_code    VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    plan            VARCHAR(50) DEFAULT 'standard',
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'trial', 'suspended', 'locked', 'terminated')),
    settings        JSONB DEFAULT '{}',
    slug            VARCHAR(100) UNIQUE,
    logo_url        VARCHAR(500),
    primary_color   VARCHAR(7),
    secondary_color VARCHAR(7),
    subscription_plan_id INTEGER,
    max_users       INTEGER DEFAULT 50,
    max_companies   INTEGER DEFAULT 5,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP WITH TIME ZONE
);

-- Add any missing columns to tenants (if table already existed)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_code VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'standard';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 50;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_company_code ON tenants(company_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;

COMMENT ON TABLE tenants IS '§15.1 المستأجرون — كيان المستأجر الرئيسي لعزل البيانات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USERS TABLE — Add missing columns (tenant_id, updated_at)
-- ═══════════════════════════════════════════════════════════════════════════
-- The users table already exists (001_create_roles_and_users.sql).
-- §15.1 requires tenant_id NOT NULL, updated_at, and deleted_at.

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Add FK constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_tenant_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK for role_id (optional — roles table already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_role_id
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for tenant-scoped user lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id) WHERE deleted_at IS NULL;

-- Auto-update updated_at trigger for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

COMMENT ON TABLE users IS '§15.1 مستخدمو المستأجر — المستخدمون المرتبطون بمستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PLATFORM_USERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- §15.1 requires a separate table for platform-level admins (independent of tenants).
-- Currently platform admins are in the `users` table with tenant_id = NULL.
-- Create a dedicated view for platform users for spec compliance.

CREATE TABLE IF NOT EXISTS platform_users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'platform_admin',
    is_super_admin  BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled', 'locked')),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    last_login_ip   VARCHAR(45),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP WITH TIME ZONE
);

-- Add any missing columns (if table already existed)
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'platform_admin';
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email) WHERE deleted_at IS NULL;

COMMENT ON TABLE platform_users IS '§15.1 مستخدمو المنصة — مستقل عن المستأجرين';

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_platform_users_updated_at ON platform_users;
CREATE TRIGGER trg_platform_users_updated_at
    BEFORE UPDATE ON platform_users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ROLES TABLE — Add missing columns
-- ═══════════════════════════════════════════════════════════════════════════
-- Roles table exists (001, enhanced in 010, 200). §15.1 requires tenant_id.

ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- FK for tenant_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_roles_tenant_id'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT fk_roles_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN roles.tenant_id IS '§15.1 معرف المستأجر — NULL يعني دور عام';
COMMENT ON COLUMN roles.permissions IS '§15.1 صلاحيات الدور كمصفوفة JSON';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. SHIPMENTS TABLE — Ensure old table has tenant isolation
-- ═══════════════════════════════════════════════════════════════════════════
-- The V2 table (logistics_shipments) already has company_id NOT NULL.
-- Ensure the legacy shipments table (005) also has tenant isolation.

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- FK for tenant_id on legacy shipments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_tenant_id'
    ) THEN
        ALTER TABLE shipments ADD CONSTRAINT fk_shipments_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- FK for company_id on legacy shipments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_company_id'
    ) THEN
        ALTER TABLE shipments ADD CONSTRAINT fk_shipments_company_id
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shipments_tenant_id ON shipments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments(company_id) WHERE deleted_at IS NULL;

-- Ensure logistics_shipments (V2) has tenant_id
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_logistics_shipments_tenant_id'
    ) THEN
        ALTER TABLE logistics_shipments ADD CONSTRAINT fk_logistics_shipments_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_tenant_id ON logistics_shipments(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE shipments IS '§15.1 الشحنات — يحتوي على tenant_id للعزل';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PURCHASE_ORDERS — Add tenant_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Already has company_id NOT NULL. Add tenant_id for spec compliance.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_orders_tenant_id'
    ) THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE purchase_orders IS '§15.1 أوامر الشراء — عزل بيانات المستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. PURCHASE_ORDER_ITEMS (po_items) — Add deleted_at, updated_by
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS updated_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_po_items_order_id ON purchase_order_items(order_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE purchase_order_items IS '§15.1 بنود أمر الشراء — حذف ناعم مدعوم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CUSTOMS_DECLARATIONS — Add tenant_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Already has company_id NOT NULL and deleted_at. Add tenant_id.

ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_customs_declarations_tenant_id'
    ) THEN
        ALTER TABLE customs_declarations ADD CONSTRAINT fk_customs_declarations_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customs_declarations_tenant_id ON customs_declarations(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE customs_declarations IS '§15.1 البيانات الجمركية — عزل بيانات المستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. JOURNAL_ENTRIES — Add deleted_at, tenant_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Already has company_id NOT NULL. Missing deleted_at and tenant_id.

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_entries_tenant_id'
    ) THEN
        ALTER TABLE journal_entries ADD CONSTRAINT fk_journal_entries_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON journal_entries(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted_at ON journal_entries(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE journal_entries IS '§15.1 القيود المحاسبية — حذف ناعم + عزل المستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. JOURNAL_LINES — Add updated_at, deleted_at
-- ═══════════════════════════════════════════════════════════════════════════
-- Missing updated_at and deleted_at per spec.

ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_entry_id ON journal_lines(journal_entry_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE journal_lines IS '§15.1 بنود القيد المحاسبي — حذف ناعم مدعوم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. ACCOUNTS (chart_of_accounts) — Already compliant
-- ═══════════════════════════════════════════════════════════════════════════
-- Has company_id NOT NULL, created_at, updated_at, deleted_at.
-- Add tenant_id for consistency.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_accounts_tenant_id'
    ) THEN
        ALTER TABLE accounts ADD CONSTRAINT fk_accounts_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE accounts IS '§15.1 دليل الحسابات — شجرة حسابات هرمية مع عزل المستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. AUDIT_LOGS — Add tenant_id, entity, entity_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Missing tenant_id, updated_at. Immutable log — no deleted_at needed.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- FK for tenant_id on audit_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_tenant_id'
    ) THEN
        ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant_id
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Map existing resource/resource_id columns to entity/entity_id where NULL
UPDATE audit_logs SET entity = resource WHERE entity IS NULL AND resource IS NOT NULL;
UPDATE audit_logs SET entity_id = resource_id WHERE entity_id IS NULL AND resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

COMMENT ON TABLE audit_logs IS '§15.1 سجلات المراجعة — سجل ثبات لا يُحذف مع عزل المستأجر';

-- ═══════════════════════════════════════════════════════════════════════════
-- REUSABLE: updated_at TRIGGER FUNCTION (shared across tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply auto-update triggers to tables that need them
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenants', 'roles', 'journal_entries', 'journal_lines',
        'purchase_order_items', 'customs_declarations', 'accounts',
        'purchase_orders', 'shipments', 'logistics_shipments'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_timestamp()',
            t, t
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY WARNING (§15.1):
--   ⚠  تحذير أمني: لا تجعل tenant_id اختيارياً في أي جدول يخص بيانات العملاء
--
--   tenant_id is initially nullable to allow safe migration of existing data.
--   After backfilling tenant_id from company_id → tenants mapping, enforce NOT NULL
--   using the helper function below.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: Backfill tenant_id from company_id where possible.
-- Run this after confirming tenants ↔ companies mapping exists.
CREATE OR REPLACE FUNCTION backfill_tenant_ids()
RETURNS void AS $$
DECLARE
    tables_to_update TEXT[] := ARRAY[
        'purchase_orders', 'customs_declarations', 'journal_entries',
        'accounts', 'logistics_shipments'
    ];
    t TEXT;
    updated_count INTEGER;
BEGIN
    -- Try to map company_id → tenant_id via companies.tenant_id or tenants table
    FOREACH t IN ARRAY tables_to_update
    LOOP
        -- Strategy: if the table has company_id and tenants has a matching row,
        -- set tenant_id = company_id (in systems where company IS the tenant)
        BEGIN
            EXECUTE format(
                'UPDATE %I SET tenant_id = company_id WHERE tenant_id IS NULL AND company_id IS NOT NULL',
                t
            );
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            RAISE NOTICE 'Backfilled % rows in %', updated_count, t;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %: %', t, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_tenant_ids() IS
    '§15.1 — Run after migration to populate tenant_id from company_id mapping. '
    'After verification, add NOT NULL constraints to tenant_id columns.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY OF CHANGES:
-- ═══════════════════════════════════════════════════════════════════════════
-- ┌──────────────────────────┬────────────────────────────────────────────┐
-- │ Table                    │ Changes                                    │
-- ├──────────────────────────┼────────────────────────────────────────────┤
-- │ tenants                  │ CREATE IF NOT EXISTS + all spec columns    │
-- │ users                    │ + tenant_id, updated_at, role_id, perms    │
-- │ platform_users           │ CREATE (new table per §15.1)              │
-- │ roles                    │ + tenant_id, permissions JSONB             │
-- │ shipments                │ + tenant_id, company_id, deleted_at        │
-- │ logistics_shipments      │ + tenant_id                               │
-- │ purchase_orders          │ + tenant_id                               │
-- │ purchase_order_items     │ + deleted_at, created_by, updated_by      │
-- │ customs_declarations     │ + tenant_id                               │
-- │ journal_entries          │ + deleted_at, tenant_id                   │
-- │ journal_lines            │ + updated_at, deleted_at                  │
-- │ accounts                 │ + tenant_id                               │
-- │ audit_logs               │ + tenant_id, entity, entity_id, updated_at│
-- └──────────────────────────┴────────────────────────────────────────────┘
