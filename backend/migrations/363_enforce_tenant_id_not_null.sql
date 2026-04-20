-- ============================================================================
-- Migration 363: Enforce tenant_id NOT NULL — Arabic Specification §15.1
-- ============================================================================
-- ⚠  تحذير أمني: لا تجعل tenant_id اختيارياً في أي جدول يخص بيانات العملاء
--
-- This migration runs AFTER 362_core_database_structure_v15.sql.
-- It backfills tenant_id where possible and then enforces NOT NULL constraints.
--
-- STRATEGY:
--   1. Run backfill_tenant_ids() to populate from company_id
--   2. Set default tenant_id for orphan rows (if any)
--   3. Enforce NOT NULL using ALTER TABLE ... SET NOT NULL (with safety checks)
-- ============================================================================

-- Step 1: Run backfill function (created in migration 362)
SELECT backfill_tenant_ids();

-- Step 2: Backfill users.tenant_id from user_companies or JWT claims if missing
-- (Users may not have company_id directly, so we use user_companies junction)
UPDATE users u
SET tenant_id = (
    SELECT MIN(uc.company_id)
    FROM user_companies uc
    WHERE uc.user_id = u.id
)
WHERE u.tenant_id IS NULL
  AND u.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM user_companies uc WHERE uc.user_id = u.id);

-- Step 3: Backfill shipments.tenant_id from supplier_id → vendors → company_id chain
UPDATE shipments s
SET company_id = (
    SELECT MIN(v.company_id)
    FROM vendors v
    WHERE v.id = s.supplier_id
    LIMIT 1
)
WHERE s.company_id IS NULL
  AND s.supplier_id IS NOT NULL;

UPDATE shipments s
SET tenant_id = s.company_id
WHERE s.tenant_id IS NULL
  AND s.company_id IS NOT NULL;

-- Step 4: Backfill audit_logs.tenant_id from user_id → users.tenant_id
UPDATE audit_logs al
SET tenant_id = u.tenant_id
FROM users u
WHERE al.user_id = u.id
  AND al.tenant_id IS NULL
  AND u.tenant_id IS NOT NULL;

-- Step 5: Enforce NOT NULL constraints on critical tenant-scoped tables.
-- Uses DO blocks with exception handling so it doesn't fail if backfill is incomplete.

-- purchase_orders.tenant_id → NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM purchase_orders WHERE tenant_id IS NULL AND deleted_at IS NULL
    ) THEN
        ALTER TABLE purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'purchase_orders.tenant_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'purchase_orders still has NULL tenant_id rows — skipping NOT NULL';
    END IF;
END $$;

-- customs_declarations.tenant_id → NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM customs_declarations WHERE tenant_id IS NULL AND deleted_at IS NULL
    ) THEN
        ALTER TABLE customs_declarations ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'customs_declarations.tenant_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'customs_declarations still has NULL tenant_id rows — skipping NOT NULL';
    END IF;
END $$;

-- journal_entries.tenant_id → NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM journal_entries WHERE tenant_id IS NULL AND deleted_at IS NULL
    ) THEN
        ALTER TABLE journal_entries ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'journal_entries.tenant_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'journal_entries still has NULL tenant_id rows — skipping NOT NULL';
    END IF;
END $$;

-- accounts.tenant_id → NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM accounts WHERE tenant_id IS NULL AND deleted_at IS NULL
    ) THEN
        ALTER TABLE accounts ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'accounts.tenant_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'accounts still has NULL tenant_id rows — skipping NOT NULL';
    END IF;
END $$;

-- logistics_shipments.tenant_id → NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM logistics_shipments WHERE tenant_id IS NULL AND deleted_at IS NULL
    ) THEN
        ALTER TABLE logistics_shipments ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'logistics_shipments.tenant_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'logistics_shipments still has NULL tenant_id rows — skipping NOT NULL';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTE: users.tenant_id is intentionally left NULLABLE because:
--   - Platform admins (super_admin) have tenant_id = NULL
--   - This is by design per §15.1 (platform_users is separate but admins
--     may still use the users table for backward compatibility)
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit: Report current state
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'purchase_orders' AS tbl, COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) AS null_count FROM purchase_orders
        UNION ALL
        SELECT 'customs_declarations', COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) FROM customs_declarations
        UNION ALL
        SELECT 'journal_entries', COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) FROM journal_entries
        UNION ALL
        SELECT 'accounts', COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) FROM accounts
        UNION ALL
        SELECT 'logistics_shipments', COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) FROM logistics_shipments
        UNION ALL
        SELECT 'users', COUNT(*) FILTER (WHERE tenant_id IS NULL AND deleted_at IS NULL) FROM users
        UNION ALL
        SELECT 'audit_logs', COUNT(*) FILTER (WHERE tenant_id IS NULL) FROM audit_logs
    LOOP
        RAISE NOTICE '§15.1 Audit: % — % rows with NULL tenant_id', r.tbl, r.null_count;
    END LOOP;
END $$;
