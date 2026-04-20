-- Migration 438: Enhance Project Links for Cost Tracking
-- Adds amount, currency, cost_category, phase reference
-- ================================================================

DO $$
BEGIN
    -- Phase reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'phase_id') THEN
        ALTER TABLE project_links ADD COLUMN phase_id INTEGER REFERENCES project_phases(id) ON DELETE SET NULL;
    END IF;

    -- Financial amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'amount') THEN
        ALTER TABLE project_links ADD COLUMN amount NUMERIC(18,4);
        COMMENT ON COLUMN project_links.amount IS 'Amount in original currency';
    END IF;

    -- Currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'currency_code') THEN
        ALTER TABLE project_links ADD COLUMN currency_code VARCHAR(10);
    END IF;

    -- Amount in base currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'amount_base') THEN
        ALTER TABLE project_links ADD COLUMN amount_base NUMERIC(18,4);
        COMMENT ON COLUMN project_links.amount_base IS 'Amount converted to company base currency';
    END IF;

    -- Cost category classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'cost_category') THEN
        ALTER TABLE project_links ADD COLUMN cost_category VARCHAR(30);
        COMMENT ON COLUMN project_links.cost_category IS 'Cost classification: freight, customs_duty, insurance, supplier_payment, etc.';
    END IF;

    -- Notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'notes') THEN
        ALTER TABLE project_links ADD COLUMN notes TEXT;
    END IF;

    -- Linked at / by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'linked_at') THEN
        ALTER TABLE project_links ADD COLUMN linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'linked_by') THEN
        ALTER TABLE project_links ADD COLUMN linked_by INTEGER REFERENCES users(id);
    END IF;

    -- Deleted at (soft delete)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_links' AND column_name = 'deleted_at') THEN
        ALTER TABLE project_links ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    RAISE NOTICE 'project_links enhanced with cost tracking columns';
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_links_category ON project_links(cost_category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_links_phase    ON project_links(phase_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_links_project  ON project_links(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_links_type     ON project_links(link_type) WHERE deleted_at IS NULL;

-- ==========================================================
-- View: Aggregate project cost summary from linked transactions
-- ==========================================================
CREATE OR REPLACE VIEW v_project_cost_summary AS
SELECT
    p.id,
    p.code,
    p.name,
    p.name_ar,
    p.company_id,
    p.project_level,
    p.status,
    p.budget,
    p.budget_allocated,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category != 'revenue'), 0)              AS total_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'revenue'), 0)               AS total_revenue,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'freight'), 0)               AS freight_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'customs_duty'), 0)          AS customs_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'insurance'), 0)             AS insurance_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'inland_transport'), 0)      AS inland_transport_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'supplier_payment'), 0)      AS supplier_payment_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'service_fee'), 0)           AS service_fee_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'demurrage'), 0)             AS demurrage_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'bank_charges'), 0)          AS bank_charges_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.cost_category = 'misc'), 0)                  AS misc_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.link_type = 'shipment'), 0)                  AS shipment_linked_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.link_type = 'payment'), 0)                   AS payment_linked_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.link_type = 'expense'), 0)                   AS expense_linked_cost,
    COALESCE(SUM(pl.amount_base) FILTER (WHERE pl.link_type IN ('purchase_invoice','sales_invoice')), 0) AS invoice_linked_cost,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.link_type = 'shipment' AND pl.deleted_at IS NULL)   AS shipments_count,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.link_type = 'payment' AND pl.deleted_at IS NULL)    AS payments_count,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.link_type = 'expense' AND pl.deleted_at IS NULL)    AS expenses_count,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.link_type IN ('purchase_invoice','sales_invoice') AND pl.deleted_at IS NULL) AS invoices_count,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.deleted_at IS NULL)                                  AS total_links_count
FROM projects p
LEFT JOIN project_links pl ON pl.project_id = p.id AND pl.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name, p.name_ar, p.company_id, p.project_level, p.status, p.budget, p.budget_allocated;

DO $$
BEGIN
    RAISE NOTICE 'Migration 438 complete: project_links enhanced + v_project_cost_summary view created';
END $$;
