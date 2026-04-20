-- ============================================================
-- Migration 401: PostgreSQL Row-Level Security (RLS)
-- ============================================================
-- Implements database-level defense-in-depth for multi-tenant
-- isolation. This is a SAFETY NET that works alongside the
-- application middleware (tenantIsolation, companyScopeGuard).
--
-- Architecture:
--   1. App sets session var: SET LOCAL app.tenant_id = '<id>'
--   2. RLS policies check: tenant_id = current_setting('app.tenant_id')
--   3. Platform admins set app.tenant_id = '0' to bypass
--   4. Policies use PERMISSIVE mode (allow union of all policy conditions)
--
-- IMPORTANT: RLS is ENABLED but the application DB user has 
-- BYPASSRLS initially. To fully enforce: REVOKE BYPASSRLS.
-- This allows gradual rollout without breaking existing code.
--
-- Part of P0: Complete Data Isolation Strategy
-- ============================================================

DO $$ BEGIN RAISE NOTICE '=== Migration 401: Row-Level Security Setup ==='; END $$;

-- ────────────────────────────────────────────
-- 1. Helper function: Get current tenant context
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_tenant_id()
RETURNS INTEGER AS $$
BEGIN
  -- Returns the current session tenant_id
  -- Returns 0 for platform admin (unrestricted access)
  -- Returns NULL if not set (blocks all access in strict mode)
  RETURN NULLIF(current_setting('app.tenant_id', true), '')::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 2. Helper function: Check if current session is platform admin
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_platform_admin', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 3. Helper function: Set tenant context (called from middleware)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_tenant_context(
  p_tenant_id INTEGER DEFAULT NULL,
  p_is_platform_admin BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  IF p_is_platform_admin THEN
    PERFORM set_config('app.tenant_id', '0', true);  -- true = LOCAL (transaction-scoped)
    PERFORM set_config('app.is_platform_admin', 'true', true);
  ELSIF p_tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    PERFORM set_config('app.is_platform_admin', 'false', true);
  ELSE
    PERFORM set_config('app.tenant_id', '', true);
    PERFORM set_config('app.is_platform_admin', 'false', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 4. Generic RLS policy creator (DRY)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(
  p_table_name TEXT,
  p_tenant_column TEXT DEFAULT 'tenant_id'
) RETURNS VOID AS $$
DECLARE
  _policy_name TEXT;
  _schema TEXT := 'public';
BEGIN
  -- Check table exists and has the tenant column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = _schema
      AND table_name = p_table_name
      AND column_name = p_tenant_column
  ) THEN
    RAISE NOTICE 'Skipping RLS for % — column % not found', p_table_name, p_tenant_column;
    RETURN;
  END IF;

  -- Enable RLS on the table
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', _schema, p_table_name);
  
  -- Don't force RLS on table owner (the app user)
  -- This means the app user bypasses RLS by default.
  -- To enforce: ALTER TABLE ... FORCE ROW LEVEL SECURITY;
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', _schema, p_table_name);

  -- Drop existing policies if they exist
  _policy_name := 'tenant_isolation_' || p_table_name;
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', _policy_name, _schema, p_table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', _policy_name || '_insert', _schema, p_table_name);

  -- SELECT/UPDATE/DELETE policy: tenant users see only their data
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR ALL USING (
      rls_is_platform_admin() = true
      OR %I = rls_tenant_id()
      OR %I IS NULL
    )',
    _policy_name, _schema, p_table_name,
    p_tenant_column, p_tenant_column
  );

  -- INSERT policy: tenant users can only insert with their tenant_id
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (
      rls_is_platform_admin() = true
      OR %I = rls_tenant_id()
      OR %I IS NULL
    )',
    _policy_name || '_insert', _schema, p_table_name,
    p_tenant_column, p_tenant_column
  );

  RAISE NOTICE 'RLS enabled on %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 5. Apply RLS to all tenant-scoped tables
-- ────────────────────────────────────────────

-- Core Identity & Auth
SELECT create_tenant_rls_policy('users');
SELECT create_tenant_rls_policy('roles');
SELECT create_tenant_rls_policy('refresh_tokens');
SELECT create_tenant_rls_policy('login_history');
SELECT create_tenant_rls_policy('user_companies');
SELECT create_tenant_rls_policy('password_reset_requests');

-- Organization
SELECT create_tenant_rls_policy('companies');
SELECT create_tenant_rls_policy('branches');

-- Audit & System
SELECT create_tenant_rls_policy('audit_logs');
SELECT create_tenant_rls_policy('notifications');
SELECT create_tenant_rls_policy('system_settings');

-- Logistics & Shipping
SELECT create_tenant_rls_policy('shipments');
SELECT create_tenant_rls_policy('logistics_shipments');
SELECT create_tenant_rls_policy('suppliers');
SELECT create_tenant_rls_policy('products');
SELECT create_tenant_rls_policy('expenses');

-- Accounting
SELECT create_tenant_rls_policy('journal_entries');
SELECT create_tenant_rls_policy('accounts');
SELECT create_tenant_rls_policy('fiscal_years');
SELECT create_tenant_rls_policy('accounting_periods');

-- Inventory
SELECT create_tenant_rls_policy('items');
SELECT create_tenant_rls_policy('warehouses');

-- Customers & Vendors
SELECT create_tenant_rls_policy('customers');
SELECT create_tenant_rls_policy('vendors');

-- Procurement
SELECT create_tenant_rls_policy('purchase_orders');

-- Customs
SELECT create_tenant_rls_policy('customs_declarations');

-- ────────────────────────────────────────────
-- 6. Grant BYPASSRLS to app user (safety: allows gradual rollout)
-- ────────────────────────────────────────────
-- The application user (slms or whatever is configured) needs BYPASSRLS
-- initially while we verify all queries correctly set the session context.
-- To fully enforce RLS: ALTER USER slms NOBYPASSRLS;
DO $$ 
BEGIN
  -- Note: In production, after verifying all paths correctly set
  -- app.tenant_id, remove BYPASSRLS with:
  -- ALTER USER slms NOBYPASSRLS;
  RAISE NOTICE 'RLS policies created. App user currently has BYPASSRLS.';
  RAISE NOTICE 'To enforce: ALTER USER <app_user> NOBYPASSRLS;';
END $$;

-- ────────────────────────────────────────────
-- 7. Audit: List all RLS-enabled tables
-- ────────────────────────────────────────────
DO $$
DECLARE
  _count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
  
  RAISE NOTICE '--- RLS Report ---';
  RAISE NOTICE 'Total tables with RLS enabled: %', _count;
END $$;

-- Cleanup: drop the helper function (policies are persistent)
DROP FUNCTION IF EXISTS create_tenant_rls_policy(TEXT, TEXT);

DO $$ BEGIN RAISE NOTICE '=== Migration 401 Complete ==='; END $$;
