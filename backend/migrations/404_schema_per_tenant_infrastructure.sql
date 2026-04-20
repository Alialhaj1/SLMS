-- ================================================================
-- Migration 404: Schema-per-Tenant Infrastructure
-- Architecture Document §3: عزل البيانات — Multi-Tenancy
-- ================================================================
-- Strategy: Shared DB + Separate PostgreSQL Schema per tenant
--   public  → platform tables + global master data (shared)
--   tenant_{code} → all tenant-specific business data
--   audit   → centralized audit logs (platform read-only)
-- ================================================================

-- ────────────────────────────────────────────
-- 1. AUDIT SCHEMA
-- ────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS audit;

-- Centralized platform-level audit log
CREATE TABLE IF NOT EXISTS audit.platform_logs (
    id          BIGSERIAL PRIMARY KEY,
    action      VARCHAR(100)  NOT NULL,
    actor_id    INTEGER,
    actor_type  VARCHAR(20)   DEFAULT 'platform',
    resource    VARCHAR(100),
    resource_id TEXT,
    tenant_id   INTEGER,
    before_data JSONB,
    after_data  JSONB,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB         DEFAULT '{}',
    created_at  TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- Centralized tenant-level audit log (written by triggers / middleware,
-- readable ONLY by the platform for cross-tenant security review)
CREATE TABLE IF NOT EXISTS audit.tenant_logs (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   INTEGER       NOT NULL,
    schema_name VARCHAR(100)  NOT NULL,
    action      VARCHAR(100)  NOT NULL,
    actor_id    INTEGER       NOT NULL,
    resource    VARCHAR(100),
    resource_id TEXT,
    before_data JSONB,
    after_data  JSONB,
    ip_address  INET,
    user_agent  TEXT,
    severity    VARCHAR(20)   DEFAULT 'info'
                CHECK (severity IN ('debug','info','warning','error','critical')),
    metadata    JSONB         DEFAULT '{}',
    created_at  TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- Partition-ready indexes on audit tables
CREATE INDEX IF NOT EXISTS idx_audit_plog_tenant
    ON audit.platform_logs (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_plog_created
    ON audit.platform_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_plog_action
    ON audit.platform_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_tlog_tenant
    ON audit.tenant_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tlog_schema
    ON audit.tenant_logs (schema_name);
CREATE INDEX IF NOT EXISTS idx_audit_tlog_created
    ON audit.tenant_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tlog_actor
    ON audit.tenant_logs (actor_id);

-- ────────────────────────────────────────────
-- 2. TENANT SCHEMA TRACKING TABLE
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_schemas (
    id                SERIAL PRIMARY KEY,
    tenant_id         INTEGER       NOT NULL REFERENCES tenants(id),
    tenant_code       VARCHAR(50)   NOT NULL UNIQUE,
    schema_name       VARCHAR(100)  NOT NULL UNIQUE,
    status            VARCHAR(20)   DEFAULT 'provisioning'
                      CHECK (status IN (
                        'provisioning','active','suspended',
                        'migrating','archived','dropped'
                      )),
    table_count       INTEGER       DEFAULT 0,
    provisioned_at    TIMESTAMPTZ,
    last_migrated_at  TIMESTAMPTZ,
    schema_version    INTEGER       DEFAULT 1,
    metadata          JSONB         DEFAULT '{}',
    created_at        TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_schemas_tenant
    ON tenant_schemas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_schemas_status
    ON tenant_schemas (status);

-- ────────────────────────────────────────────
-- 3. PLATFORM / SHARED TABLE REGISTRY
-- Tables listed here are EXCLUDED from tenant schema cloning.
-- Everything else in public schema gets cloned.
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schema_table_registry (
    id          SERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL UNIQUE,
    scope       VARCHAR(20)  NOT NULL
                CHECK (scope IN ('platform','shared','tenant','audit')),
    description TEXT,
    created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.schema_table_registry (table_name, scope, description) VALUES
-- ─── Platform infrastructure (never cloned) ───
('tenants',                   'platform', 'Tenant registry — root entity'),
('platform_users',            'platform', 'Platform admin accounts'),
('subscription_plans',        'platform', 'Billing plan definitions'),
('subscription_history',      'platform', 'Billing/subscription tracking'),
('migrations',                'platform', 'Migration tracking'),
('tenant_schemas',            'platform', 'This table — schema lifecycle'),
('schema_table_registry',     'platform', 'Platform/shared table registry'),
-- ─── Shared / global (NOT cloned — accessed via search_path fallback) ───
('permissions',               'shared', 'Global permission codes'),
('permission_categories',     'shared', 'Permission grouping metadata'),
('permission_sets',           'shared', 'Reusable permission bundles'),
('permission_set_permissions','shared', 'Permission set junction table'),
('role_templates',            'shared', 'Platform-wide role templates'),
('countries',                 'shared', 'ISO 3166 country list'),
('regions',                   'shared', 'Geographic regions'),
('border_points',             'shared', 'Border crossing points'),
('time_zones',                'shared', 'Time zone reference'),
('ports',                     'shared', 'Global port registry'),
('customs_offices',           'shared', 'Government customs offices'),
('hs_codes',                  'shared', 'Harmonized System codes'),
('customs_tariffs',           'shared', 'Global tariff rates'),
('customs_exemptions',        'shared', 'Global exemptions'),
('reference_data',            'shared', 'Generic global key-value lookups'),
('address_types',             'shared', 'Address type enumeration'),
('contact_methods',           'shared', 'Contact method enumeration'),
('system_languages',          'shared', 'Available UI languages'),
('system_policies',           'shared', 'Platform-wide policies'),
('ui_themes',                 'shared', 'UI theme registry'),
('account_types',             'shared', 'Chart-of-accounts types'),
('account_behaviors',         'shared', 'Account behavior metadata'),
('account_level_types',       'shared', 'Account level type metadata'),
('linked_entity_types',       'shared', 'Entity linking metadata'),
-- ─── Data protection (platform ops) ───
('backup_settings',           'platform', 'Backup configuration'),
('backup_runs',               'platform', 'Backup execution history'),
('backup_history',            'platform', 'Backup archive history'),
('backup_schedules',          'platform', 'Scheduled backup definitions'),
('restore_history',           'platform', 'Restore operation history'),
('protected_tables',          'platform', 'Table protection rules'),
('dangerous_operations_log',  'platform', 'Security operation audit'),
-- ─── Help / support (platform) ───
('help_requests',             'platform', 'Support ticket table'),
-- ─── Audit (lives in audit schema) ───
('audit_logs',                'audit',    'Legacy audit — stays in public, mirrored to audit schema')
ON CONFLICT (table_name) DO NOTHING;

-- ────────────────────────────────────────────
-- 4. PROVISION TENANT SCHEMA — Core Function
-- ────────────────────────────────────────────
-- Creates a new schema for a tenant with copies of all tenant-scoped tables.
--
-- How it works:
--   1. Creates schema  tenant_{code}
--   2. Discovers all public tables NOT in schema_table_registry (scope = platform/shared/audit)
--   3. Clones each table using  LIKE ... INCLUDING ALL
--   4. Recreates intra-schema foreign keys
--   5. Resets sequences to start from 1
--   6. Records in tenant_schemas tracking table
--
-- Usage:  SELECT public.provision_tenant_schema('haj', 42);
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.provision_tenant_schema(
    p_tenant_code TEXT,
    p_tenant_id   INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema       TEXT;
    v_table        RECORD;
    v_fk           RECORD;
    v_seq          RECORD;
    v_tables_done  INTEGER := 0;
    v_fks_done     INTEGER := 0;
    v_seqs_done    INTEGER := 0;
    v_errors       TEXT[]  := '{}';
    v_excluded     TEXT[];
BEGIN
    -- Sanitise schema name: lowercase, alphanumeric + underscore only
    v_schema := 'tenant_' || lower(regexp_replace(p_tenant_code, '[^a-zA-Z0-9]', '_', 'g'));

    -- Check for duplicate
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema) THEN
        RAISE EXCEPTION 'Schema % already exists', v_schema;
    END IF;

    -- ── Build exclusion list from registry ──
    SELECT array_agg(table_name) INTO v_excluded
    FROM public.schema_table_registry
    WHERE scope IN ('platform', 'shared', 'audit');

    IF v_excluded IS NULL THEN
        v_excluded := '{}';
    END IF;

    -- ── 1. Create schema ──
    EXECUTE format('CREATE SCHEMA %I', v_schema);

    -- ── 2. Clone tenant tables ──
    FOR v_table IN
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type   = 'BASE TABLE'
          AND t.table_name != ALL(v_excluded)
        ORDER BY t.table_name
    LOOP
        BEGIN
            EXECUTE format(
                'CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)',
                v_schema, v_table.table_name, v_table.table_name
            );
            v_tables_done := v_tables_done + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors,
                format('TABLE %s: %s', v_table.table_name, SQLERRM));
        END;
    END LOOP;

    -- ── 3. Recreate foreign keys ──
    -- For each FK in public schema, if BOTH the source and referenced tables
    -- exist in the new tenant schema, recreate the FK there.
    -- FKs to shared/platform tables are recreated as cross-schema references to public.
    FOR v_fk IN
        SELECT
            tc.constraint_name,
            tc.table_name      AS src_table,
            kcu.column_name    AS src_column,
            ccu.table_name     AS ref_table,
            ccu.column_name    AS ref_column,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.constraint_schema = ccu.constraint_schema
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
           AND tc.constraint_schema = rc.constraint_schema
        WHERE tc.table_schema   = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name != ALL(v_excluded)
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        BEGIN
            -- Does the source table exist in tenant schema?
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = v_schema AND table_name = v_fk.src_table
            ) THEN
                CONTINUE;
            END IF;

            -- Determine target schema for referenced table
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = v_schema AND table_name = v_fk.ref_table
            ) THEN
                -- Both tables in tenant schema → intra-schema FK
                EXECUTE format(
                    'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON UPDATE %s ON DELETE %s',
                    v_schema, v_fk.src_table,
                    v_fk.src_table || '_' || v_fk.src_column || '_fk',
                    v_fk.src_column,
                    v_schema, v_fk.ref_table, v_fk.ref_column,
                    v_fk.update_rule, v_fk.delete_rule
                );
            ELSE
                -- Referenced table is in public (shared/platform) → cross-schema FK
                EXECUTE format(
                    'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON UPDATE %s ON DELETE %s',
                    v_schema, v_fk.src_table,
                    v_fk.src_table || '_' || v_fk.src_column || '_pub_fk',
                    v_fk.src_column,
                    v_fk.ref_table, v_fk.ref_column,
                    v_fk.update_rule, v_fk.delete_rule
                );
            END IF;
            v_fks_done := v_fks_done + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors,
                format('FK %s.%s→%s: %s', v_fk.src_table, v_fk.src_column, v_fk.ref_table, SQLERRM));
        END;
    END LOOP;

    -- ── 4. Reset sequences to 1 ──
    FOR v_seq IN
        SELECT sequence_schema, sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = v_schema
    LOOP
        BEGIN
            EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', v_seq.sequence_schema, v_seq.sequence_name);
            v_seqs_done := v_seqs_done + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors,
                format('SEQ %s: %s', v_seq.sequence_name, SQLERRM));
        END;
    END LOOP;

    -- ── 5. Record in tracking table ──
    INSERT INTO public.tenant_schemas
        (tenant_id, tenant_code, schema_name, status, table_count, provisioned_at, updated_at)
    VALUES
        (p_tenant_id, lower(p_tenant_code), v_schema, 'active', v_tables_done, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (tenant_code) DO UPDATE SET
        status       = 'active',
        table_count  = v_tables_done,
        provisioned_at = CURRENT_TIMESTAMP,
        updated_at   = CURRENT_TIMESTAMP;

    -- ── 6. Return summary ──
    RETURN jsonb_build_object(
        'schema',          v_schema,
        'tables_created',  v_tables_done,
        'fks_created',     v_fks_done,
        'sequences_reset', v_seqs_done,
        'errors',          to_jsonb(v_errors)
    );
END;
$$;

-- ────────────────────────────────────────────
-- 5. DROP TENANT SCHEMA — Cleanup Function
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.drop_tenant_schema(
    p_tenant_code TEXT,
    p_force       BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema TEXT;
    v_status TEXT;
BEGIN
    v_schema := 'tenant_' || lower(regexp_replace(p_tenant_code, '[^a-zA-Z0-9]', '_', 'g'));

    -- Safety check
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema) THEN
        RETURN jsonb_build_object('error', format('Schema %s does not exist', v_schema));
    END IF;

    -- Check tracking status
    SELECT status INTO v_status FROM public.tenant_schemas WHERE schema_name = v_schema;
    IF v_status NOT IN ('archived', 'suspended') AND NOT p_force THEN
        RETURN jsonb_build_object(
            'error', format('Schema %s is in status "%s" — archive or suspend first, or use force=true', v_schema, v_status)
        );
    END IF;

    -- Drop the schema and all its objects
    EXECUTE format('DROP SCHEMA %I CASCADE', v_schema);

    -- Update tracking
    UPDATE public.tenant_schemas
    SET status = 'dropped', updated_at = CURRENT_TIMESTAMP
    WHERE schema_name = v_schema;

    -- Log to audit
    INSERT INTO audit.platform_logs (action, resource, resource_id, tenant_id, after_data)
    VALUES ('schema_dropped', 'tenant_schema', v_schema,
            (SELECT tenant_id FROM tenant_schemas WHERE schema_name = v_schema),
            jsonb_build_object('schema', v_schema, 'force', p_force));

    RETURN jsonb_build_object('schema', v_schema, 'status', 'dropped');
END;
$$;

-- ────────────────────────────────────────────
-- 6. SEED TENANT SCHEMA — Populate seed data
-- ────────────────────────────────────────────
-- Called after provision_tenant_schema to populate initial data
-- such as currencies, payment methods, tax types, etc.
-- This effectively replaces provision_company_master_data for
-- schema-per-tenant architecture (clones from public where needed).
--
-- Usage:  SELECT public.seed_tenant_schema('tenant_haj', 42, 1, 'SAU');
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_tenant_schema(
    p_schema_name  TEXT,
    p_tenant_id    INTEGER,
    p_company_id   INTEGER,
    p_country_code VARCHAR DEFAULT 'SAU'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seeded JSONB := '{}';
    v_count  INTEGER;
BEGIN
    -- ── A. Currencies (clone from public where company_id IS NULL = global) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.currencies (code, name, name_ar, symbol, decimal_places, is_active, is_global, company_id, tenant_id, created_at, updated_at)
             SELECT code, name, name_ar, symbol, decimal_places, is_active, FALSE, $1, $2, NOW(), NOW()
             FROM public.currencies WHERE (is_global = TRUE OR company_id IS NULL) AND deleted_at IS NULL',
            p_schema_name
        ) USING p_company_id, p_tenant_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_seeded := v_seeded || jsonb_build_object('currencies', v_count);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('currencies_error', SQLERRM);
    END;

    -- ── B. Payment Methods (clone global) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.payment_methods (code, name, name_ar, is_active, is_global, company_id, tenant_id, created_at, updated_at)
             SELECT code, name, name_ar, is_active, FALSE, $1, $2, NOW(), NOW()
             FROM public.payment_methods WHERE (is_global = TRUE OR company_id IS NULL) AND deleted_at IS NULL',
            p_schema_name
        ) USING p_company_id, p_tenant_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_seeded := v_seeded || jsonb_build_object('payment_methods', v_count);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('payment_methods_error', SQLERRM);
    END;

    -- ── C. Shipping Methods (clone global) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.shipping_methods (code, name, name_ar, is_active, is_global, company_id, tenant_id, created_at, updated_at)
             SELECT code, name, name_ar, is_active, FALSE, $1, $2, NOW(), NOW()
             FROM public.shipping_methods WHERE (is_global = TRUE OR company_id IS NULL) AND deleted_at IS NULL',
            p_schema_name
        ) USING p_company_id, p_tenant_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_seeded := v_seeded || jsonb_build_object('shipping_methods', v_count);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('shipping_methods_error', SQLERRM);
    END;

    -- ── D. Cities (clone for the tenant's country) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.cities (name, name_ar, country_id, is_active, company_id, tenant_id, created_at, updated_at)
             SELECT c.name, c.name_ar, c.country_id, c.is_active, $1, $2, NOW(), NOW()
             FROM public.cities c
             JOIN public.countries co ON co.id = c.country_id
             WHERE co.code = $3 AND c.deleted_at IS NULL',
            p_schema_name
        ) USING p_company_id, p_tenant_id, p_country_code;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_seeded := v_seeded || jsonb_build_object('cities', v_count);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('cities_error', SQLERRM);
    END;

    -- ── E. Payment Terms (standard seed) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.payment_terms (code, name, name_ar, days, is_active, company_id, tenant_id, created_at, updated_at) VALUES
             ($1, ''Cash'',      ''نقدي'',       0,  TRUE, $2, $3, NOW(), NOW()),
             ($1, ''Net 15'',    ''صافي 15'',    15, TRUE, $2, $3, NOW(), NOW()),
             ($1, ''Net 30'',    ''صافي 30'',    30, TRUE, $2, $3, NOW(), NOW()),
             ($1, ''Net 60'',    ''صافي 60'',    60, TRUE, $2, $3, NOW(), NOW()),
             ($1, ''Net 90'',    ''صافي 90'',    90, TRUE, $2, $3, NOW(), NOW()),
             ($1, ''COD'',       ''الدفع عند التسليم'', 0, TRUE, $2, $3, NOW(), NOW())',
            p_schema_name
        ) USING 'CASH', p_company_id, p_tenant_id;
        v_seeded := v_seeded || jsonb_build_object('payment_terms', 6);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('payment_terms_error', SQLERRM);
    END;

    -- ── F. Tax Types (ZATCA standard for Saudi) ──
    BEGIN
        IF p_country_code = 'SAU' THEN
            EXECUTE format(
                'INSERT INTO %I.tax_types (code, name, name_ar, rate, is_active, company_id, tenant_id, created_at, updated_at) VALUES
                 (''VAT'',     ''Value Added Tax'',   ''ضريبة القيمة المضافة'', 15.00, TRUE, $1, $2, NOW(), NOW()),
                 (''CUSTOMS'', ''Customs Duty'',      ''رسوم جمركية'',         5.00,  TRUE, $1, $2, NOW(), NOW()),
                 (''WHT'',     ''Withholding Tax'',   ''ضريبة الاستقطاع'',     5.00,  TRUE, $1, $2, NOW(), NOW()),
                 (''ZAKAT'',   ''Zakat'',             ''زكاة'',                2.50,  TRUE, $1, $2, NOW(), NOW())',
                p_schema_name
            ) USING p_company_id, p_tenant_id;
            v_seeded := v_seeded || jsonb_build_object('tax_types', 4);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('tax_types_error', SQLERRM);
    END;

    -- ── G. Warehouse Types (standard seed) ──
    BEGIN
        EXECUTE format(
            'INSERT INTO %I.warehouse_types (code, name, name_ar, is_active, created_at) VALUES
             (''GENERAL'', ''General Warehouse'',  ''مستودع عام'',    TRUE, NOW()),
             (''COLD'',    ''Cold Storage'',       ''تبريد'',         TRUE, NOW()),
             (''BONDED'',  ''Bonded Warehouse'',   ''مستودع جمركي'',  TRUE, NOW()),
             (''TRANSIT'', ''Transit Warehouse'',  ''مستودع عبور'',   TRUE, NOW()),
             (''HAZMAT'',  ''Hazmat Storage'',     ''مواد خطرة'',     TRUE, NOW())',
            p_schema_name
        );
        v_seeded := v_seeded || jsonb_build_object('warehouse_types', 5);
    EXCEPTION WHEN OTHERS THEN
        v_seeded := v_seeded || jsonb_build_object('warehouse_types_error', SQLERRM);
    END;

    RETURN v_seeded;
END;
$$;

-- ────────────────────────────────────────────
-- 7. HELPER: Get schema name for a tenant
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_tenant_schema(p_tenant_id INTEGER)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT schema_name
    FROM public.tenant_schemas
    WHERE tenant_id = p_tenant_id AND status = 'active'
    LIMIT 1;
$$;

-- ────────────────────────────────────────────
-- 8. HELPER: Set search_path for a tenant session
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_tenant_search_path(p_tenant_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_schema TEXT;
BEGIN
    SELECT schema_name INTO v_schema
    FROM public.tenant_schemas
    WHERE tenant_id = p_tenant_id AND status = 'active';

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'No active schema for tenant %', p_tenant_id;
    END IF;

    EXECUTE format('SET LOCAL search_path TO %I, public', v_schema);
    RETURN v_schema;
END;
$$;

-- ────────────────────────────────────────────
-- 9. HELPER: List all tables in a tenant schema
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_tenant_schema_tables(p_schema_name TEXT)
RETURNS TABLE(table_name TEXT, row_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tbl RECORD;
    v_cnt BIGINT;
BEGIN
    FOR v_tbl IN
        SELECT t.table_name::TEXT AS tname
        FROM information_schema.tables t
        WHERE t.table_schema = p_schema_name AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
    LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', p_schema_name, v_tbl.tname) INTO v_cnt;
        table_name := v_tbl.tname;
        row_count  := v_cnt;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ────────────────────────────────────────────
-- 10. HELPER: Validate schema integrity
-- Returns tables missing from tenant schema
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_tenant_schema(p_schema_name TEXT)
RETURNS TABLE(table_name TEXT, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_excluded TEXT[];
    v_tbl      RECORD;
BEGIN
    SELECT array_agg(str.table_name) INTO v_excluded
    FROM public.schema_table_registry str
    WHERE str.scope IN ('platform', 'shared', 'audit');

    FOR v_tbl IN
        SELECT t.table_name::TEXT AS tname
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type   = 'BASE TABLE'
          AND t.table_name != ALL(COALESCE(v_excluded, '{}'))
        ORDER BY t.table_name
    LOOP
        table_name := v_tbl.tname;
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = p_schema_name AND information_schema.tables.table_name = v_tbl.tname
        ) THEN
            status := 'ok';
        ELSE
            status := 'missing';
        END IF;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ────────────────────────────────────────────
-- 11. Grant audit schema read access to app role
-- ────────────────────────────────────────────
DO $$
BEGIN
    -- Grant usage on audit schema
    EXECUTE 'GRANT USAGE ON SCHEMA audit TO CURRENT_USER';
    EXECUTE 'GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO CURRENT_USER';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT, INSERT ON TABLES TO CURRENT_USER';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO CURRENT_USER';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT USAGE, SELECT ON SEQUENCES TO CURRENT_USER';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Grant on audit schema: %', SQLERRM;
END;
$$;

-- ────────────────────────────────────────────
-- 12. Seed permissions for schema management
-- ────────────────────────────────────────────
INSERT INTO permissions (permission_code, resource, action, description) VALUES
    ('tenant_schemas:view',      'tenant_schemas', 'view',      'View tenant schema status'),
    ('tenant_schemas:provision', 'tenant_schemas', 'provision', 'Provision new tenant schema'),
    ('tenant_schemas:drop',      'tenant_schemas', 'drop',      'Drop/archive tenant schema'),
    ('tenant_schemas:validate',  'tenant_schemas', 'validate',  'Validate tenant schema integrity'),
    ('audit_logs:platform',      'audit_logs',     'platform',  'View platform-wide audit logs')
ON CONFLICT (permission_code) DO NOTHING;
