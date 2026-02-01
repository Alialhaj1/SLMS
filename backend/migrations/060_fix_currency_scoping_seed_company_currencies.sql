BEGIN;

-- Legacy constraint (from 020_add_soft_delete_constraints_indexes.sql) made currency codes globally unique,
-- which breaks company-scoped currencies because global seed rows use company_id IS NULL.
-- We rely instead on:
-- - ux_currencies_global_code_active (code) WHERE company_id IS NULL AND deleted_at IS NULL
-- - ux_currencies_company_code_active (company_id, code) WHERE company_id IS NOT NULL AND deleted_at IS NULL
ALTER TABLE currencies DROP CONSTRAINT IF EXISTS uq_currencies_code;

-- Seed company-scoped currencies by cloning the existing global currency list.
-- Idempotent: only inserts missing (company_id, code) pairs.
INSERT INTO currencies (
    company_id,
    code,
    name,
    name_en,
    name_ar,
    symbol,
    decimal_places,
    subunit_en,
    subunit_ar,
    is_active,
    sort_order,
    symbol_position,
    is_base_currency,
    created_at,
    updated_at
)
SELECT
    c.id AS company_id,
    g.code,
    g.name,
    g.name_en,
    g.name_ar,
    g.symbol,
    g.decimal_places,
    g.subunit_en,
    g.subunit_ar,
    g.is_active,
    g.sort_order,
    g.symbol_position,
    FALSE AS is_base_currency,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM companies c
JOIN currencies g
  ON g.company_id IS NULL
 AND g.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM currencies x
      WHERE x.company_id = c.id
        AND x.code = g.code
        AND x.deleted_at IS NULL
  );

-- If a company has no base currency yet, set it based on companies.currency (currency code).
WITH companies_without_base AS (
    SELECT c.id, c.currency
    FROM companies c
    WHERE c.deleted_at IS NULL
      AND c.currency IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM currencies b
          WHERE b.company_id = c.id
            AND b.deleted_at IS NULL
            AND b.is_base_currency = TRUE
      )
)
UPDATE currencies cur
SET is_base_currency = TRUE,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP
FROM companies_without_base cb
WHERE cur.company_id = cb.id
  AND cur.deleted_at IS NULL
  AND cur.code = cb.currency;

COMMIT;
