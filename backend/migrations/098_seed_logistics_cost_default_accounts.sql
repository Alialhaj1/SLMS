-- =====================================================
-- Migration 098: Seed Logistics Shipment Cost Default Accounts
--
-- Purpose:
-- Provide operational defaults so that when users add shipment costs,
-- the system can automatically create draft journal entries.
--
-- Strategy:
-- - Use company-scoped `default_accounts` mappings seeded by migration 070.
-- - Seed a minimal, safe set of cost types where we have clear COA keys:
--   - FREIGHT_IN  -> Debit: default_accounts.FREIGHT_IN | Credit: default_accounts.AP_TRADE
--   - CUSTOMS     -> Debit: default_accounts.CUSTOMS    | Credit: default_accounts.AP_TRADE
--   - FREIGHT_OUT -> Debit: default_accounts.FREIGHT_OUT| Credit: default_accounts.AP_TRADE
-- - Idempotent and does not overwrite active user-configured rows.
-- =====================================================

BEGIN;

-- FREIGHT_IN
WITH da AS (
  SELECT
    company_id,
    MAX(CASE WHEN account_key = 'AP_TRADE' AND is_active = TRUE THEN account_id END) AS ap_trade_id,
    MAX(CASE WHEN account_key = 'FREIGHT_IN' AND is_active = TRUE THEN account_id END) AS freight_in_id
  FROM default_accounts
  GROUP BY company_id
)
INSERT INTO logistics_shipment_cost_default_accounts (
  company_id,
  cost_type_code,
  debit_account_id,
  credit_account_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  da.company_id,
  'FREIGHT_IN',
  da.freight_in_id,
  da.ap_trade_id,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM da
JOIN companies c ON c.id = da.company_id AND c.deleted_at IS NULL
WHERE da.ap_trade_id IS NOT NULL
  AND da.freight_in_id IS NOT NULL
ON CONFLICT (company_id, cost_type_code) DO UPDATE
SET debit_account_id = EXCLUDED.debit_account_id,
    credit_account_id = EXCLUDED.credit_account_id,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE logistics_shipment_cost_default_accounts.deleted_at IS NOT NULL
   OR logistics_shipment_cost_default_accounts.is_active = FALSE;

-- CUSTOMS
WITH da AS (
  SELECT
    company_id,
    MAX(CASE WHEN account_key = 'AP_TRADE' AND is_active = TRUE THEN account_id END) AS ap_trade_id,
    MAX(CASE WHEN account_key = 'CUSTOMS' AND is_active = TRUE THEN account_id END) AS customs_id
  FROM default_accounts
  GROUP BY company_id
)
INSERT INTO logistics_shipment_cost_default_accounts (
  company_id,
  cost_type_code,
  debit_account_id,
  credit_account_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  da.company_id,
  'CUSTOMS',
  da.customs_id,
  da.ap_trade_id,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM da
JOIN companies c ON c.id = da.company_id AND c.deleted_at IS NULL
WHERE da.ap_trade_id IS NOT NULL
  AND da.customs_id IS NOT NULL
ON CONFLICT (company_id, cost_type_code) DO UPDATE
SET debit_account_id = EXCLUDED.debit_account_id,
    credit_account_id = EXCLUDED.credit_account_id,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE logistics_shipment_cost_default_accounts.deleted_at IS NOT NULL
   OR logistics_shipment_cost_default_accounts.is_active = FALSE;

-- FREIGHT_OUT
WITH da AS (
  SELECT
    company_id,
    MAX(CASE WHEN account_key = 'AP_TRADE' AND is_active = TRUE THEN account_id END) AS ap_trade_id,
    MAX(CASE WHEN account_key = 'FREIGHT_OUT' AND is_active = TRUE THEN account_id END) AS freight_out_id
  FROM default_accounts
  GROUP BY company_id
)
INSERT INTO logistics_shipment_cost_default_accounts (
  company_id,
  cost_type_code,
  debit_account_id,
  credit_account_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  da.company_id,
  'FREIGHT_OUT',
  da.freight_out_id,
  da.ap_trade_id,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM da
JOIN companies c ON c.id = da.company_id AND c.deleted_at IS NULL
WHERE da.ap_trade_id IS NOT NULL
  AND da.freight_out_id IS NOT NULL
ON CONFLICT (company_id, cost_type_code) DO UPDATE
SET debit_account_id = EXCLUDED.debit_account_id,
    credit_account_id = EXCLUDED.credit_account_id,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE logistics_shipment_cost_default_accounts.deleted_at IS NOT NULL
   OR logistics_shipment_cost_default_accounts.is_active = FALSE;

COMMIT;
