-- Migration: 024_create_number_series.sql
-- Description: Automatic document numbering system
-- Date: 2025-12-22

-- =====================================================
-- PART 1: NUMBER SERIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS number_series (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Series Info
    series_code VARCHAR(20) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Document Type
    document_type VARCHAR(50) NOT NULL,
    -- Types: journal_entry, sales_invoice, sales_order, sales_quotation,
    --        purchase_invoice, purchase_order, receipt_voucher, payment_voucher,
    --        stock_transfer, stock_adjustment, delivery_note, goods_receipt
    
    -- Format
    prefix VARCHAR(20),
    suffix VARCHAR(20),
    separator VARCHAR(5) DEFAULT '-',
    
    -- Numbering
    starting_number INTEGER DEFAULT 1,
    current_number INTEGER DEFAULT 0,
    increment_by INTEGER DEFAULT 1,
    min_digits INTEGER DEFAULT 4,  -- Pad with zeros
    
    -- Reset Rules
    reset_frequency VARCHAR(20) DEFAULT 'never',  -- never, yearly, monthly, daily
    last_reset_date DATE,
    
    -- Year/Month inclusion
    include_year BOOLEAN DEFAULT TRUE,
    year_format VARCHAR(10) DEFAULT 'YYYY',  -- YYYY or YY
    include_month BOOLEAN DEFAULT FALSE,
    month_format VARCHAR(10) DEFAULT 'MM',
    include_branch_code BOOLEAN DEFAULT FALSE,
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE (company_id, series_code, document_type)
);

-- Partial unique index for default series per document type per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_number_series_default 
ON number_series(company_id, branch_id, document_type) 
WHERE is_default = TRUE;

-- =====================================================
-- PART 2: NUMBER SERIES HISTORY (Audit)
-- =====================================================

CREATE TABLE IF NOT EXISTS number_series_history (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES number_series(id),
    generated_number VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_id INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER NOT NULL REFERENCES users(id),
    
    -- For gap analysis
    sequence_number INTEGER NOT NULL,
    fiscal_year INTEGER,
    month INTEGER
);

-- =====================================================
-- PART 3: GENERATE NEXT NUMBER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_document_number(
    p_company_id INTEGER,
    p_document_type VARCHAR,
    p_user_id INTEGER,
    p_document_id INTEGER,
    p_branch_id INTEGER DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS VARCHAR AS $$
DECLARE
    v_series RECORD;
    v_next_number INTEGER;
    v_formatted_number VARCHAR(100);
    v_year_part VARCHAR(10);
    v_month_part VARCHAR(10);
    v_branch_code VARCHAR(10);
    v_number_part VARCHAR(20);
BEGIN
    -- Get active series for document type
    SELECT * INTO v_series
    FROM number_series
    WHERE company_id = p_company_id
    AND document_type = p_document_type
    AND is_active = TRUE
    AND (branch_id IS NULL OR branch_id = p_branch_id)
    AND (valid_from IS NULL OR valid_from <= p_date)
    AND (valid_to IS NULL OR valid_to >= p_date)
    ORDER BY 
        CASE WHEN branch_id = p_branch_id THEN 0 ELSE 1 END,
        is_default DESC
    LIMIT 1
    FOR UPDATE;  -- Lock for concurrent access
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active number series found for document type: %', p_document_type;
    END IF;
    
    -- Check if reset needed
    IF v_series.reset_frequency != 'never' THEN
        CASE v_series.reset_frequency
            WHEN 'yearly' THEN
                IF v_series.last_reset_date IS NULL OR 
                   EXTRACT(YEAR FROM v_series.last_reset_date) < EXTRACT(YEAR FROM p_date) THEN
                    v_series.current_number := v_series.starting_number - v_series.increment_by;
                    UPDATE number_series SET last_reset_date = p_date WHERE id = v_series.id;
                END IF;
            WHEN 'monthly' THEN
                IF v_series.last_reset_date IS NULL OR 
                   (EXTRACT(YEAR FROM v_series.last_reset_date) < EXTRACT(YEAR FROM p_date) OR
                    EXTRACT(MONTH FROM v_series.last_reset_date) < EXTRACT(MONTH FROM p_date)) THEN
                    v_series.current_number := v_series.starting_number - v_series.increment_by;
                    UPDATE number_series SET last_reset_date = p_date WHERE id = v_series.id;
                END IF;
            WHEN 'daily' THEN
                IF v_series.last_reset_date IS NULL OR 
                   v_series.last_reset_date < p_date THEN
                    v_series.current_number := v_series.starting_number - v_series.increment_by;
                    UPDATE number_series SET last_reset_date = p_date WHERE id = v_series.id;
                END IF;
        END CASE;
    END IF;
    
    -- Get next number
    v_next_number := v_series.current_number + v_series.increment_by;
    
    -- Format number with padding
    v_number_part := LPAD(v_next_number::TEXT, v_series.min_digits, '0');
    
    -- Build formatted number
    v_formatted_number := COALESCE(v_series.prefix, '');
    
    -- Add year if configured
    IF v_series.include_year THEN
        CASE v_series.year_format
            WHEN 'YYYY' THEN v_year_part := EXTRACT(YEAR FROM p_date)::TEXT;
            WHEN 'YY' THEN v_year_part := RIGHT(EXTRACT(YEAR FROM p_date)::TEXT, 2);
            ELSE v_year_part := EXTRACT(YEAR FROM p_date)::TEXT;
        END CASE;
        v_formatted_number := v_formatted_number || v_year_part || COALESCE(v_series.separator, '');
    END IF;
    
    -- Add month if configured
    IF v_series.include_month THEN
        v_month_part := LPAD(EXTRACT(MONTH FROM p_date)::TEXT, 2, '0');
        v_formatted_number := v_formatted_number || v_month_part || COALESCE(v_series.separator, '');
    END IF;
    
    -- Add branch code if configured
    IF v_series.include_branch_code AND p_branch_id IS NOT NULL THEN
        SELECT code INTO v_branch_code FROM branches WHERE id = p_branch_id;
        v_formatted_number := v_formatted_number || COALESCE(v_branch_code, '') || COALESCE(v_series.separator, '');
    END IF;
    
    -- Add number
    v_formatted_number := v_formatted_number || v_number_part;
    
    -- Add suffix
    IF v_series.suffix IS NOT NULL THEN
        v_formatted_number := v_formatted_number || v_series.suffix;
    END IF;
    
    -- Update series
    UPDATE number_series 
    SET current_number = v_next_number,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE id = v_series.id;
    
    -- Log history
    INSERT INTO number_series_history (
        series_id, generated_number, document_type, document_id,
        generated_by, sequence_number, fiscal_year, month
    ) VALUES (
        v_series.id, v_formatted_number, p_document_type, p_document_id,
        p_user_id, v_next_number, EXTRACT(YEAR FROM p_date), EXTRACT(MONTH FROM p_date)
    );
    
    RETURN v_formatted_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: CHECK FOR GAPS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_number_series_gaps(
    p_series_id INTEGER,
    p_fiscal_year INTEGER DEFAULT NULL
) RETURNS TABLE (
    expected_number INTEGER,
    is_missing BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH number_range AS (
        SELECT generate_series(
            (SELECT COALESCE(MIN(sequence_number), 1) FROM number_series_history WHERE series_id = p_series_id),
            (SELECT COALESCE(MAX(sequence_number), 1) FROM number_series_history WHERE series_id = p_series_id)
        ) AS num
    ),
    used_numbers AS (
        SELECT sequence_number 
        FROM number_series_history 
        WHERE series_id = p_series_id
        AND (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
    )
    SELECT 
        nr.num AS expected_number,
        NOT EXISTS (SELECT 1 FROM used_numbers un WHERE un.sequence_number = nr.num) AS is_missing
    FROM number_range nr
    WHERE NOT EXISTS (SELECT 1 FROM used_numbers un WHERE un.sequence_number = nr.num)
    ORDER BY nr.num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: DEFAULT NUMBER SERIES
-- =====================================================

-- Function to create default series for a company
CREATE OR REPLACE FUNCTION create_default_number_series(
    p_company_id INTEGER,
    p_user_id INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Journal Entries
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES (p_company_id, 'JV', 'Journal Voucher', 'Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'journal_entry', 'JV', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Sales Documents
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES 
        (p_company_id, 'SQ', 'Sales Quotation', 'ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¶ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±', 'sales_quotation', 'SQ', TRUE, p_user_id),
        (p_company_id, 'SO', 'Sales Order', 'ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹', 'sales_order', 'SO', TRUE, p_user_id),
        (p_company_id, 'SI', 'Sales Invoice', 'Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹', 'sales_invoice', 'SI', TRUE, p_user_id),
        (p_company_id, 'SR', 'Sales Return', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹', 'sales_return', 'SR', TRUE, p_user_id),
        (p_company_id, 'DN', 'Delivery Note', 'ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦', 'delivery_note', 'DN', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Purchase Documents
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES 
        (p_company_id, 'PR', 'Purchase Request', 'ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡', 'purchase_request', 'PR', TRUE, p_user_id),
        (p_company_id, 'PO', 'Purchase Order', 'ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â± ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡', 'purchase_order', 'PO', TRUE, p_user_id),
        (p_company_id, 'PI', 'Purchase Invoice', 'Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡', 'purchase_invoice', 'PI', TRUE, p_user_id),
        (p_company_id, 'PRT', 'Purchase Return', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡', 'purchase_return', 'PRT', TRUE, p_user_id),
        (p_company_id, 'GRN', 'Goods Receipt Note', 'ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦', 'goods_receipt', 'GRN', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Financial Documents
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES 
        (p_company_id, 'RV', 'Receipt Voucher', 'ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¶', 'receipt_voucher', 'RV', TRUE, p_user_id),
        (p_company_id, 'PV', 'Payment Voucher', 'ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚ÂµÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â', 'payment_voucher', 'PV', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Inventory Documents
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES 
        (p_company_id, 'ST', 'Stock Transfer', 'ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â®ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ', 'stock_transfer', 'ST', TRUE, p_user_id),
        (p_company_id, 'SA', 'Stock Adjustment', 'ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â®ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'stock_adjustment', 'SA', TRUE, p_user_id),
        (p_company_id, 'SC', 'Stock Count', 'ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â®ÃƒËœÃ‚Â²Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ', 'stock_count', 'SC', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Logistics Documents
    INSERT INTO number_series (company_id, series_code, name_en, name_ar, document_type, prefix, is_default, created_by)
    VALUES 
        (p_company_id, 'SHP', 'Shipment', 'ÃƒËœÃ‚Â´ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â©', 'shipment', 'SHP', TRUE, p_user_id),
        (p_company_id, 'CD', 'Customs Declaration', 'ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â ', 'customs_declaration', 'CD', TRUE, p_user_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_number_series_company ON number_series(company_id);
CREATE INDEX IF NOT EXISTS idx_number_series_type ON number_series(document_type);
CREATE INDEX IF NOT EXISTS idx_number_series_active ON number_series(company_id, document_type) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_number_series_history_series ON number_series_history(series_id);
CREATE INDEX IF NOT EXISTS idx_number_series_history_document ON number_series_history(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_number_series_history_year ON number_series_history(series_id, fiscal_year);

COMMENT ON TABLE number_series IS 'Document numbering configuration per company/document type';
COMMENT ON TABLE number_series_history IS 'Audit trail of all generated document numbers';
COMMENT ON FUNCTION generate_document_number IS 'Generate next document number with proper formatting';
