-- Migration: 023_create_journal_engine.sql
-- Description: Journal Entries Engine - Core of the accounting system
-- Date: 2025-12-22

-- =====================================================
-- PART 1: JOURNAL ENTRY HEADER
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Document Info
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE,
    
    -- Period Reference
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    period_id INTEGER NOT NULL REFERENCES accounting_periods(id),
    
    -- Type and Source
    entry_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    -- Types: manual, sales_invoice, purchase_invoice, receipt, payment, 
    --        inventory_adjustment, depreciation, closing, opening, reversal
    
    source_document_type VARCHAR(50),  -- sales_invoice, purchase_invoice, etc.
    source_document_id INTEGER,           -- Reference to source document
    source_document_number VARCHAR(50),
    
    -- Reversal Info
    is_reversal BOOLEAN DEFAULT FALSE,
    reversed_entry_id INTEGER REFERENCES journal_entries(id),
    reversal_entry_id INTEGER REFERENCES journal_entries(id),
    reversal_date DATE,
    reversal_reason TEXT,
    
    -- Currency
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    exchange_rate DECIMAL(18, 8) DEFAULT 1,
    
    -- Totals (must balance)
    total_debit DECIMAL(18, 4) NOT NULL DEFAULT 0,
    total_credit DECIMAL(18, 4) NOT NULL DEFAULT 0,
    total_debit_fc DECIMAL(18, 4) DEFAULT 0,  -- Foreign currency
    total_credit_fc DECIMAL(18, 4) DEFAULT 0,
    
    -- Status
    status document_status NOT NULL DEFAULT 'draft',
    
    -- Description
    description TEXT,
    narration TEXT,
    reference VARCHAR(100),
    
    -- Approval Workflow
    submitted_by INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Posting
    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE (company_id, entry_number),
    CONSTRAINT chk_journal_balanced CHECK (
        status = 'draft' OR total_debit = total_credit
    )
);

-- =====================================================
-- PART 2: JOURNAL ENTRY LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Account
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    
    -- Dimensions
    cost_center_id INTEGER REFERENCES cost_centers(id),
    profit_center_id INTEGER REFERENCES profit_centers(id),
    project_id INTEGER REFERENCES projects(id),
    
    -- Partner Reference (for AR/AP)
    partner_type VARCHAR(20),  -- customer, vendor, employee
    partner_id INTEGER,
    
    -- Amounts (Company Currency)
    debit_amount DECIMAL(18, 4) DEFAULT 0,
    credit_amount DECIMAL(18, 4) DEFAULT 0,
    
    -- Amounts (Foreign Currency)
    fc_debit_amount DECIMAL(18, 4) DEFAULT 0,
    fc_credit_amount DECIMAL(18, 4) DEFAULT 0,
    currency_id INTEGER REFERENCES currencies(id),
    exchange_rate DECIMAL(18, 8) DEFAULT 1,
    
    -- Description
    description TEXT,
    
    -- Reference to source line
    source_line_type VARCHAR(50),
    source_line_id INTEGER,
    
    -- Tax
    tax_type_id INTEGER REFERENCES tax_types(id),
    tax_amount DECIMAL(18, 4) DEFAULT 0,
    
    -- Quantity (for inventory-related entries)
    quantity DECIMAL(18, 4),
    uom_id INTEGER REFERENCES uom(id),
    
    -- Allocation (for multi-dimension split)
    allocation_id INTEGER,
    allocation_percentage DECIMAL(8, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_line_has_amount CHECK (
        debit_amount > 0 OR credit_amount > 0
    ),
    CONSTRAINT chk_line_single_side CHECK (
        NOT (debit_amount > 0 AND credit_amount > 0)
    ),
    UNIQUE (journal_entry_id, line_number)
);

-- =====================================================
-- PART 3: GENERAL LEDGER (Posted Transactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS general_ledger (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Journal Reference
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
    journal_line_id INTEGER NOT NULL REFERENCES journal_lines(id),
    
    -- Account
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    account_code VARCHAR(20) NOT NULL,
    
    -- Dimensions
    cost_center_id INTEGER REFERENCES cost_centers(id),
    profit_center_id INTEGER REFERENCES profit_centers(id),
    project_id INTEGER REFERENCES projects(id),
    
    -- Partner
    partner_type VARCHAR(20),
    partner_id INTEGER,
    
    -- Period
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    period_id INTEGER NOT NULL REFERENCES accounting_periods(id),
    
    -- Document Info
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    
    -- Amounts
    debit_amount DECIMAL(18, 4) DEFAULT 0,
    credit_amount DECIMAL(18, 4) DEFAULT 0,
    balance DECIMAL(18, 4) DEFAULT 0,  -- Running balance
    
    -- Foreign Currency
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    exchange_rate DECIMAL(18, 8) DEFAULT 1,
    fc_debit_amount DECIMAL(18, 4) DEFAULT 0,
    fc_credit_amount DECIMAL(18, 4) DEFAULT 0,
    
    -- Source
    source_document_type VARCHAR(50),
    source_document_id INTEGER,
    source_document_number VARCHAR(50),
    
    -- Description
    description TEXT,
    
    -- Timestamps
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    posted_by INTEGER NOT NULL REFERENCES users(id)
);

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(fiscal_year_id, period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_document_type, source_document_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON journal_entries(company_id, entry_number);

-- Journal Lines
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_cost_center ON journal_lines(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_partner ON journal_lines(partner_type, partner_id);

-- General Ledger (Critical for reporting)
CREATE INDEX IF NOT EXISTS idx_gl_company ON general_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_account ON general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_account_date ON general_ledger(account_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_period ON general_ledger(fiscal_year_id, period_id);
CREATE INDEX IF NOT EXISTS idx_gl_partner ON general_ledger(partner_type, partner_id);
CREATE INDEX IF NOT EXISTS idx_gl_cost_center ON general_ledger(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_gl_project ON general_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_gl_posting_date ON general_ledger(posting_date);
CREATE INDEX IF NOT EXISTS idx_gl_entry_date ON general_ledger(entry_date);

-- =====================================================
-- PART 5: POSTING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION post_journal_entry(
    p_journal_id INTEGER,
    p_user_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_journal RECORD;
    v_line RECORD;
    v_period RECORD;
    v_account_code VARCHAR(20);
BEGIN
    -- Get journal entry
    SELECT * INTO v_journal FROM journal_entries WHERE id = p_journal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journal entry not found';
    END IF;
    
    -- Validate status
    IF v_journal.status NOT IN ('draft', 'approved') THEN
        RAISE EXCEPTION 'Only draft or approved entries can be posted';
    END IF;
    
    -- Validate balanced
    IF v_journal.total_debit != v_journal.total_credit THEN
        RAISE EXCEPTION 'Journal entry is not balanced: Debit % != Credit %', 
            v_journal.total_debit, v_journal.total_credit;
    END IF;
    
    -- Check period is open
    SELECT * INTO v_period 
    FROM accounting_periods 
    WHERE id = v_journal.period_id;
    
    IF v_period.status != 'open' THEN
        RAISE EXCEPTION 'Cannot post to closed period: %', v_period.period_name;
    END IF;
    
    -- Insert into General Ledger
    FOR v_line IN 
        SELECT jl.*, a.code 
        FROM journal_lines jl
        JOIN accounts a ON a.id = jl.account_id
        WHERE jl.journal_entry_id = p_journal_id
    LOOP
        INSERT INTO general_ledger (
            company_id, branch_id, journal_entry_id, journal_line_id,
            account_id, account_code, cost_center_id, profit_center_id, project_id,
            partner_type, partner_id, fiscal_year_id, period_id,
            entry_number, entry_date, posting_date,
            debit_amount, credit_amount,
            currency_id, exchange_rate, fc_debit_amount, fc_credit_amount,
            source_document_type, source_document_id, source_document_number,
            description, posted_by
        ) VALUES (
            v_journal.company_id, v_journal.branch_id, v_journal.id, v_line.id,
            v_line.account_id, v_line.account_code, v_line.cost_center_id, 
            v_line.profit_center_id, v_line.project_id,
            v_line.partner_type, v_line.partner_id, 
            v_journal.fiscal_year_id, v_journal.period_id,
            v_journal.entry_number, v_journal.entry_date, COALESCE(v_journal.posting_date, CURRENT_DATE),
            v_line.debit_amount, v_line.credit_amount,
            COALESCE(v_line.currency_id, v_journal.currency_id), 
            COALESCE(v_line.exchange_rate, v_journal.exchange_rate),
            v_line.fc_debit_amount, v_line.fc_credit_amount,
            v_journal.source_document_type, v_journal.source_document_id, 
            v_journal.source_document_number,
            v_line.description, p_user_id
        );
        
        -- Update account balance
        PERFORM update_account_balance(
            v_journal.company_id,
            v_line.account_id,
            v_journal.fiscal_year_id,
            v_journal.period_id,
            COALESCE(v_line.currency_id, v_journal.currency_id),
            v_line.cost_center_id,
            v_journal.branch_id,
            v_line.debit_amount,
            v_line.credit_amount
        );
    END LOOP;
    
    -- Update journal status
    UPDATE journal_entries 
    SET status = 'posted',
        posted_by = p_user_id,
        posted_at = CURRENT_TIMESTAMP,
        posting_date = COALESCE(posting_date, CURRENT_DATE),
        updated_by = p_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_journal_id;
    
    -- Log the action
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, 
        new_data, ip_address
    ) VALUES (
        p_user_id, 'POST', 'journal_entries', p_journal_id,
        jsonb_build_object('entry_number', v_journal.entry_number, 'total', v_journal.total_debit),
        '0.0.0.0'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: UPDATE BALANCE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_account_balance(
    p_company_id INTEGER,
    p_account_id INTEGER,
    p_fiscal_year_id INTEGER,
    p_period_id INTEGER,
    p_currency_id INTEGER,
    p_cost_center_id INTEGER,
    p_branch_id INTEGER,
    p_debit DECIMAL(18,4),
    p_credit DECIMAL(18,4)
) RETURNS VOID AS $$
BEGIN
    -- Upsert balance record
    INSERT INTO account_balances (
        company_id, account_id, fiscal_year_id, period_id, 
        currency_id, cost_center_id, branch_id,
        period_debit, period_credit, transaction_count, last_transaction_date
    ) VALUES (
        p_company_id, p_account_id, p_fiscal_year_id, p_period_id,
        p_currency_id, p_cost_center_id, p_branch_id,
        p_debit, p_credit, 1, CURRENT_DATE
    )
    ON CONFLICT (company_id, account_id, fiscal_year_id, period_id, currency_id, cost_center_id, branch_id)
    DO UPDATE SET
        period_debit = account_balances.period_debit + p_debit,
        period_credit = account_balances.period_credit + p_credit,
        transaction_count = account_balances.transaction_count + 1,
        last_transaction_date = CURRENT_DATE,
        last_updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: REVERSE JOURNAL ENTRY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION reverse_journal_entry(
    p_journal_id INTEGER,
    p_user_id INTEGER,
    p_reversal_date DATE,
    p_reason TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_original RECORD;
    v_new_journal_id INTEGER;
    v_new_entry_number VARCHAR(50);
    v_period_id INTEGER;
BEGIN
    -- Get original entry
    SELECT * INTO v_original FROM journal_entries WHERE id = p_journal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journal entry not found';
    END IF;
    
    IF v_original.status != 'posted' THEN
        RAISE EXCEPTION 'Only posted entries can be reversed';
    END IF;
    
    IF v_original.reversal_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'Entry has already been reversed';
    END IF;
    
    -- Get period for reversal date
    SELECT id INTO v_period_id
    FROM accounting_periods
    WHERE p_reversal_date BETWEEN start_date AND end_date
    AND status = 'open'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No open period found for reversal date %', p_reversal_date;
    END IF;
    
    -- Generate reversal number
    v_new_entry_number := v_original.entry_number || '-REV';
    
    -- Create reversal entry
    INSERT INTO journal_entries (
        company_id, branch_id, entry_number, entry_date, 
        fiscal_year_id, period_id, entry_type,
        source_document_type, source_document_id, source_document_number,
        is_reversal, reversed_entry_id,
        currency_id, exchange_rate,
        total_debit, total_credit, total_debit_fc, total_credit_fc,
        status, description, narration, reference,
        created_by
    )
    SELECT 
        company_id, branch_id, v_new_entry_number, p_reversal_date,
        fiscal_year_id, v_period_id, 'reversal',
        'reversal', p_journal_id, entry_number,
        TRUE, p_journal_id,
        currency_id, exchange_rate,
        total_credit, total_debit, total_credit_fc, total_debit_fc,  -- Swapped
        'draft', 'Reversal of: ' || description, p_reason, reference,
        p_user_id
    FROM journal_entries
    WHERE id = p_journal_id
    RETURNING id INTO v_new_journal_id;
    
    -- Create reversal lines (debit/credit swapped)
    INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        cost_center_id, profit_center_id, project_id,
        partner_type, partner_id,
        debit_amount, credit_amount,
        fc_debit_amount, fc_credit_amount,
        currency_id, exchange_rate,
        description, source_line_type, source_line_id
    )
    SELECT 
        v_new_journal_id, line_number, account_id,
        cost_center_id, profit_center_id, project_id,
        partner_type, partner_id,
        credit_amount, debit_amount,  -- Swapped
        fc_credit_amount, fc_debit_amount,
        currency_id, exchange_rate,
        'Reversal: ' || COALESCE(description, ''), 'journal_lines', id
    FROM journal_lines
    WHERE journal_entry_id = p_journal_id;
    
    -- Link original to reversal
    UPDATE journal_entries 
    SET reversal_entry_id = v_new_journal_id,
        reversal_date = p_reversal_date,
        reversal_reason = p_reason,
        status = 'reversed',
        updated_by = p_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_journal_id;
    
    RETURN v_new_journal_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 8: VALIDATION TRIGGERS
-- =====================================================

-- Prevent editing posted entries
CREATE OR REPLACE FUNCTION prevent_posted_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('posted', 'reversed') THEN
        RAISE EXCEPTION 'Cannot modify posted or reversed journal entries';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_journal_edit
BEFORE UPDATE ON journal_entries
FOR EACH ROW
WHEN (OLD.status IN ('posted', 'reversed') AND NEW.status = OLD.status)
EXECUTE FUNCTION prevent_posted_edit();

-- Prevent deleting posted entries
CREATE OR REPLACE FUNCTION prevent_posted_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('posted', 'reversed') THEN
        RAISE EXCEPTION 'Cannot delete posted or reversed journal entries';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_journal_delete
BEFORE DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_delete();

-- Auto-calculate totals
CREATE OR REPLACE FUNCTION update_journal_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE journal_entries
    SET total_debit = (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id),
        total_credit = (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id),
        total_debit_fc = (SELECT COALESCE(SUM(fc_debit_amount), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id),
        total_credit_fc = (SELECT COALESCE(SUM(fc_credit_amount), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.journal_entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_journal_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW
EXECUTE FUNCTION update_journal_totals();

-- =====================================================
-- PART 9: VIEWS FOR REPORTING
-- =====================================================

-- Trial Balance View
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT 
    ab.company_id,
    ab.fiscal_year_id,
    ab.period_id,
    ab.account_id,
    a.code,
    a.name AS account_name,
    a.name_ar AS account_name_ar,
    at.name AS account_type,
    SUM(ab.opening_debit) AS opening_debit,
    SUM(ab.opening_credit) AS opening_credit,
    SUM(ab.period_debit) AS period_debit,
    SUM(ab.period_credit) AS period_credit,
    SUM(ab.closing_debit) AS closing_debit,
    SUM(ab.closing_credit) AS closing_credit,
    SUM(ab.balance) AS balance
FROM account_balances ab
JOIN accounts a ON a.id = ab.account_id
JOIN account_types at ON at.id = a.account_type_id
WHERE TRUE
GROUP BY ab.company_id, ab.fiscal_year_id, ab.period_id, ab.account_id,
         a.code, a.name, a.name_ar, at.name
ORDER BY a.code;

-- Account Ledger View
CREATE OR REPLACE VIEW v_account_ledger AS
SELECT 
    gl.company_id,
    gl.account_id,
    a.code,
    a.name AS account_name,
    a.name_ar AS account_name_ar,
    gl.entry_date,
    gl.entry_number,
    gl.description,
    gl.debit_amount,
    gl.credit_amount,
    SUM(gl.debit_amount - gl.credit_amount) OVER (
        PARTITION BY gl.account_id 
        ORDER BY gl.entry_date, gl.entry_number
    ) AS running_balance,
    gl.cost_center_id,
    cc.name AS cost_center_name,
    gl.source_document_type,
    gl.source_document_number
FROM general_ledger gl
JOIN accounts a ON a.id = gl.account_id
LEFT JOIN cost_centers cc ON cc.id = gl.cost_center_id
ORDER BY gl.account_id, gl.entry_date, gl.entry_number;

COMMENT ON TABLE journal_entries IS 'Header table for all accounting journal entries';
COMMENT ON TABLE journal_lines IS 'Detail lines for journal entries with debit/credit amounts';
COMMENT ON TABLE general_ledger IS 'Posted transactions - immutable record of all accounting movements';
COMMENT ON FUNCTION post_journal_entry(INTEGER, INTEGER) IS 'Post a journal entry to the general ledger';
COMMENT ON FUNCTION reverse_journal_entry(INTEGER, INTEGER, DATE, TEXT) IS 'Create a reversal entry for a posted journal';
