-- ============================================================
-- Migration 400: Legacy Table Tenant Isolation
-- ============================================================
-- Adds tenant_id and company_id to legacy tables that were
-- created before multi-tenancy was introduced:
--   - suppliers (migration 002)
--   - products (migration 002)
--   - expenses (migration 005)
--   - refresh_tokens (migration 004)
--
-- Also backfills existing data from relationships.
-- Part of P0: Complete Data Isolation Strategy
-- ============================================================

DO $$ BEGIN RAISE NOTICE '=== Migration 400: Legacy Table Tenant Isolation ==='; END $$;

-- ────────────────────────────────────────────
-- 1. SUPPLIERS — Add tenant_id + company_id
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    RAISE NOTICE 'Added tenant_id to suppliers';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN company_id INTEGER REFERENCES companies(id);
    RAISE NOTICE 'Added company_id to suppliers';
  END IF;
END $$;

-- Backfill suppliers.tenant_id from companies.tenant_id (if companies has tenant_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tenant_id'
  ) THEN
    UPDATE suppliers s
    SET tenant_id = c.tenant_id
    FROM companies c
    WHERE s.company_id = c.id
      AND s.tenant_id IS NULL
      AND s.company_id IS NOT NULL;
    RAISE NOTICE 'Backfilled suppliers.tenant_id from companies';
  END IF;
END $$;

-- If suppliers still have NULL tenant_id, assign from first tenant
DO $$ BEGIN
  UPDATE suppliers
  SET tenant_id = (SELECT id FROM tenants ORDER BY id LIMIT 1)
  WHERE tenant_id IS NULL
    AND EXISTS (SELECT 1 FROM tenants LIMIT 1);
END $$;

-- If suppliers still have NULL company_id, assign from first company
DO $$ BEGIN
  UPDATE suppliers
  SET company_id = (SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1)
  WHERE company_id IS NULL
    AND EXISTS (SELECT 1 FROM companies WHERE deleted_at IS NULL LIMIT 1);
END $$;

-- Create indexes for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);

-- ────────────────────────────────────────────
-- 2. PRODUCTS — Add tenant_id + company_id
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE products ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    RAISE NOTICE 'Added tenant_id to products';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE products ADD COLUMN company_id INTEGER REFERENCES companies(id);
    RAISE NOTICE 'Added company_id to products';
  END IF;
END $$;

-- Backfill products via supplier relationship
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    UPDATE products p
    SET tenant_id = s.tenant_id,
        company_id = s.company_id
    FROM suppliers s
    WHERE p.supplier_id = s.id
      AND (p.tenant_id IS NULL OR p.company_id IS NULL);
    RAISE NOTICE 'Backfilled products tenant_id/company_id from suppliers';
  END IF;
END $$;

-- Fallback: assign from first tenant/company
DO $$ BEGIN
  UPDATE products
  SET tenant_id = (SELECT id FROM tenants ORDER BY id LIMIT 1)
  WHERE tenant_id IS NULL
    AND EXISTS (SELECT 1 FROM tenants LIMIT 1);
  
  UPDATE products
  SET company_id = (SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1)
  WHERE company_id IS NULL
    AND EXISTS (SELECT 1 FROM companies WHERE deleted_at IS NULL LIMIT 1);
END $$;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);

-- ────────────────────────────────────────────
-- 3. EXPENSES — Add tenant_id + company_id
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    RAISE NOTICE 'Added tenant_id to expenses';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN company_id INTEGER REFERENCES companies(id);
    RAISE NOTICE 'Added company_id to expenses';
  END IF;
END $$;

-- Backfill expenses via shipment relationship
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'shipment_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'tenant_id'
  ) THEN
    UPDATE expenses e
    SET tenant_id = sh.tenant_id,
        company_id = sh.company_id
    FROM shipments sh
    WHERE e.shipment_id = sh.id
      AND (e.tenant_id IS NULL OR e.company_id IS NULL);
    RAISE NOTICE 'Backfilled expenses tenant_id/company_id from shipments';
  END IF;
END $$;

-- Fallback
DO $$ BEGIN
  UPDATE expenses
  SET tenant_id = (SELECT id FROM tenants ORDER BY id LIMIT 1)
  WHERE tenant_id IS NULL
    AND EXISTS (SELECT 1 FROM tenants LIMIT 1);
  
  UPDATE expenses
  SET company_id = (SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1)
  WHERE company_id IS NULL
    AND EXISTS (SELECT 1 FROM companies WHERE deleted_at IS NULL LIMIT 1);
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);

-- ────────────────────────────────────────────
-- 4. REFRESH_TOKENS — Add tenant_id
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE refresh_tokens ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    RAISE NOTICE 'Added tenant_id to refresh_tokens';
  END IF;
END $$;

-- Backfill from users
UPDATE refresh_tokens rt
SET tenant_id = u.tenant_id
FROM users u
WHERE rt.user_id = u.id
  AND rt.tenant_id IS NULL
  AND u.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id ON refresh_tokens(tenant_id);

-- ────────────────────────────────────────────
-- 5. Verification
-- ────────────────────────────────────────────
DO $$ 
DECLARE
  _suppliers_null BIGINT;
  _products_null BIGINT;
  _expenses_null BIGINT;
  _tokens_null BIGINT;
BEGIN
  SELECT COUNT(*) INTO _suppliers_null FROM suppliers WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO _products_null FROM products WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO _expenses_null FROM expenses WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO _tokens_null FROM refresh_tokens WHERE tenant_id IS NULL AND user_id IN (SELECT id FROM users WHERE tenant_id IS NOT NULL);

  RAISE NOTICE '--- Legacy Table Tenant Isolation Report ---';
  RAISE NOTICE 'suppliers without tenant_id: %', _suppliers_null;
  RAISE NOTICE 'products without tenant_id: %', _products_null;
  RAISE NOTICE 'expenses without tenant_id: %', _expenses_null;
  RAISE NOTICE 'refresh_tokens (tenant users) without tenant_id: %', _tokens_null;
END $$;

DO $$ BEGIN RAISE NOTICE '=== Migration 400 Complete ==='; END $$;
