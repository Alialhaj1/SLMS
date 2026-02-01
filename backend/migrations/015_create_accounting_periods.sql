-- =============================================
-- Accounting Periods Table
-- For period closing and financial controls
-- =============================================

-- Fiscal Years Table
CREATE TABLE IF NOT EXISTS fiscal_years (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    name VARCHAR(100), -- e.g., "2025" or "2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP,
    closed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, year)
);

-- Accounting Periods Table (Monthly/Quarterly)
CREATE TABLE IF NOT EXISTS accounting_periods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year_id INTEGER REFERENCES fiscal_years(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_name VARCHAR(50), -- e.g., "January 2025", "Q1 2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Period Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
    -- open: can create/edit transactions
    -- closed: can't create new, but can adjust with approval
    -- locked: completely frozen, no changes allowed
    
    -- Closing Information
    closed_at TIMESTAMP,
    closed_by INTEGER REFERENCES users(id),
    locked_at TIMESTAMP,
    locked_by INTEGER REFERENCES users(id),
    
    -- Reopening (with audit trail)
    reopened_at TIMESTAMP,
    reopened_by INTEGER REFERENCES users(id),
    reopen_reason TEXT,
    
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id, year, month)
);

-- Period Adjustments (for post-closing entries)
CREATE TABLE IF NOT EXISTS period_adjustments (
    id SERIAL PRIMARY KEY,
    period_id INTEGER NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL, -- 'correction', 'audit_adjustment', 'year_end'
    description TEXT NOT NULL,
    reference_no VARCHAR(50),
    amount DECIMAL(18, 4),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fiscal_years_company ON fiscal_years(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_year ON fiscal_years(year);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_company ON accounting_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_year_month ON accounting_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(status);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_fiscal_year ON accounting_periods(fiscal_year_id);

-- Add accounting permissions to roles table
DO $$
BEGIN
    -- Add permissions if not already in super_admin role
    UPDATE roles 
    SET permissions = permissions || '["accounting:view", "accounting:create", "accounting:edit", "accounting:delete", "accounting:close_period", "accounting:reopen_period", "accounting:lock_period", "journal:create", "journal:post", "journal:approve", "journal:reverse", "ledger:view", "reports:financial"]'::jsonb
    WHERE name = 'super_admin' 
    AND NOT permissions @> '["accounting:view"]'::jsonb;
    
    -- Add accountant permissions if admin role exists
    UPDATE roles 
    SET permissions = permissions || '["accounting:view", "accounting:create", "journal:create", "ledger:view", "reports:financial"]'::jsonb
    WHERE name = 'admin' 
    AND NOT permissions @> '["accounting:view"]'::jsonb;
END $$;

-- Function to check if period is open for transactions
CREATE OR REPLACE FUNCTION is_period_open(p_company_id INTEGER, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    period_status VARCHAR(20);
BEGIN
    SELECT status INTO period_status
    FROM accounting_periods
    WHERE company_id = p_company_id
      AND p_date >= start_date
      AND p_date <= end_date;
    
    IF period_status IS NULL THEN
        -- No period defined, assume open
        RETURN TRUE;
    END IF;
    
    RETURN period_status = 'open';
END;
$$ LANGUAGE plpgsql;

-- Function to get current open period
CREATE OR REPLACE FUNCTION get_current_period(p_company_id INTEGER)
RETURNS TABLE(id INTEGER, year INTEGER, month INTEGER, status VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ap.id, ap.year, ap.month, ap.status
    FROM accounting_periods ap
    WHERE ap.company_id = p_company_id
      AND ap.status = 'open'
      AND CURRENT_DATE >= ap.start_date
      AND CURRENT_DATE <= ap.end_date
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE fiscal_years IS 'Fiscal/Financial years for each company';
COMMENT ON TABLE accounting_periods IS 'Monthly accounting periods with open/closed/locked status';
COMMENT ON TABLE period_adjustments IS 'Post-closing adjustments with approval tracking';
COMMENT ON FUNCTION is_period_open IS 'Check if a specific date falls in an open accounting period';
COMMENT ON FUNCTION get_current_period IS 'Get the current open accounting period for a company';
