-- Migration 442: Fix vendor_contracts table — add missing columns for full purchasing workflow
-- Adds: quotation link, currency, exchange rate, terms, renewal, project, soft-delete, title fields

ALTER TABLE vendor_contracts
  ADD COLUMN IF NOT EXISTS quotation_id      INT REFERENCES vendor_quotations(id),
  ADD COLUMN IF NOT EXISTS title             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS title_ar          VARCHAR(500),
  ADD COLUMN IF NOT EXISTS exchange_rate     DECIMAL(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS renewal_terms     TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS renewal_notice_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS project_id        INT REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS consumed_qty      DECIMAL(18,4) DEFAULT 0;

-- View: contracts expiring within 30 days
CREATE OR REPLACE VIEW v_contracts_expiring_soon AS
SELECT vc.*, v.name AS vendor_name, v.name_ar AS vendor_name_ar,
       ct.name AS contract_type_name, cs.name AS status_name, cs.color AS status_color,
       c.code AS currency_code, c.symbol AS currency_symbol,
       (vc.end_date - CURRENT_DATE) AS days_remaining
FROM vendor_contracts vc
JOIN vendors v ON v.id = vc.vendor_id
LEFT JOIN contract_types ct ON ct.id = vc.contract_type_id
LEFT JOIN contract_statuses cs ON cs.id = vc.status_id
LEFT JOIN currencies c ON c.id = vc.currency_id
WHERE vc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND vc.deleted_at IS NULL
ORDER BY vc.end_date ASC;
