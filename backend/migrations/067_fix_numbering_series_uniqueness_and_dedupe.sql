-- Migration 067: Fix numbering_series duplicates and enforce uniqueness for active rows
-- Date: 2026-01-01
--
-- Problem:
-- The table has UNIQUE(company_id, module, deleted_at). Because deleted_at is NULL for active rows,
-- PostgreSQL allows multiple rows with deleted_at NULL (NULLs are not equal), leading to duplicates.
--
-- Fix:
-- 1) Soft-delete duplicates where deleted_at IS NULL, keeping the most recently updated row per (company_id, module).
-- 2) Add a partial UNIQUE index to enforce one active row per (company_id, module).

DO $$
BEGIN
  -- 1) Soft-delete duplicates (keep latest by updated_at/created_at, tie-breaker highest id)
  WITH ranked AS (
    SELECT
      id,
      company_id,
      module,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, module
        ORDER BY COALESCE(updated_at, created_at) DESC, COALESCE(created_at, updated_at) DESC, id DESC
      ) AS rn
    FROM numbering_series
    WHERE deleted_at IS NULL
  )
  UPDATE numbering_series ns
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE ns.id IN (SELECT id FROM ranked WHERE rn > 1);

  -- 2) Enforce uniqueness for active rows
  CREATE UNIQUE INDEX IF NOT EXISTS ux_numbering_series_company_module_active
  ON numbering_series (company_id, module)
  WHERE deleted_at IS NULL;

  RAISE NOTICE '✅ Migration 067: numbering_series deduped and active uniqueness enforced';
END $$;
