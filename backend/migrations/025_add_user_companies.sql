-- Migration: 025_add_user_companies.sql
-- Description: User-Company assignment for multi-tenant isolation
-- Date: 2025-12-22

-- =====================================================
-- PART 1: USER-COMPANY ASSIGNMENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Default company for this user
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Access level within company
    access_level VARCHAR(20) DEFAULT 'standard',  -- standard, manager, admin
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    UNIQUE (user_id, company_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);

-- Partial unique index: only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_companies_default 
ON user_companies(user_id) 
WHERE is_default = TRUE;

-- =====================================================
-- PART 2: ASSIGN EXISTING USERS TO COMPANIES
-- =====================================================

-- If companies exist, assign all existing users to them
INSERT INTO user_companies (user_id, company_id, is_default, access_level)
SELECT u.id, c.id, TRUE, 'admin'
FROM users u
CROSS JOIN companies c
WHERE u.deleted_at IS NULL
  AND c.deleted_at IS NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- =====================================================
-- PART 3: ADD COLUMNS TO MIGRATIONS TABLE
-- =====================================================

-- Add checksum and execution_time columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'migrations' AND column_name = 'checksum') THEN
        ALTER TABLE migrations ADD COLUMN checksum TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'migrations' AND column_name = 'execution_time_ms') THEN
        ALTER TABLE migrations ADD COLUMN execution_time_ms INTEGER;
    END IF;
END $$;

-- =====================================================
-- PART 4: JOURNAL AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_audit_log (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
    action VARCHAR(50) NOT NULL,  -- created, edited, submitted, approved, posted, reversed
    
    -- Change tracking
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    
    -- Who and when
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Additional context
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_journal_audit_entry ON journal_audit_log(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_audit_user ON journal_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_journal_audit_date ON journal_audit_log(performed_at);

-- =====================================================
-- PART 5: FAILED LOGIN ATTEMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(50),  -- invalid_password, user_not_found, account_locked, account_disabled
    
    -- Optional: link to user if found
    user_id INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_date ON failed_login_attempts(attempted_at);

-- Cleanup function - delete old records
CREATE OR REPLACE FUNCTION cleanup_old_failed_logins()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM failed_login_attempts 
    WHERE attempted_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_companies IS 'Maps users to companies for multi-tenant isolation';
COMMENT ON TABLE journal_audit_log IS 'Detailed audit trail for journal entry changes';
COMMENT ON TABLE failed_login_attempts IS 'Tracks failed login attempts for security monitoring';
