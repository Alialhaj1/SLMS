-- Migration 008: Add User Status and Security Columns
-- Purpose: Enable user status management, auto-lock on failed logins, and security tracking
-- Phase 4B Feature 3: User Status Management

-- =============================================
-- 1. Add User Status Columns
-- =============================================
DO $$
BEGIN
  -- Status management
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' 
      CHECK (status IN ('active', 'disabled', 'locked'));
  END IF;
  
  -- Failed login tracking (auto-lock)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='failed_login_count') THEN
    ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_failed_login_at') THEN
    ALTER TABLE users ADD COLUMN last_failed_login_at TIMESTAMP NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='locked_until') THEN
    ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
  END IF;
  
  -- Login tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_ip') THEN
    ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) NULL; -- Support IPv6
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_user_agent') THEN
    ALTER TABLE users ADD COLUMN last_login_user_agent TEXT NULL;
  END IF;
  
  -- Manual disable tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='disabled_at') THEN
    ALTER TABLE users ADD COLUMN disabled_at TIMESTAMP NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='disabled_by') THEN
    ALTER TABLE users ADD COLUMN disabled_by INT NULL REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='disable_reason') THEN
    ALTER TABLE users ADD COLUMN disable_reason TEXT NULL;
  END IF;
  
  -- Metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status_updated_at') THEN
    ALTER TABLE users ADD COLUMN status_updated_at TIMESTAMP NULL;
  END IF;
END $$;

-- =============================================
-- 2. Create Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_disabled_by ON users(disabled_by) WHERE disabled_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- =============================================
-- 3. Create User Status History Table (Audit Trail)
-- =============================================
CREATE TABLE IF NOT EXISTS user_status_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by INT REFERENCES users(id), -- NULL = system auto-lock
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb -- Store additional context (IP, user_agent, etc.)
);

CREATE INDEX IF NOT EXISTS idx_user_status_history_user_id ON user_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_changed_at ON user_status_history(changed_at);

-- =============================================
-- 4. Create Trigger to Log Status Changes
-- =============================================
CREATE OR REPLACE FUNCTION log_user_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO user_status_history (
            user_id,
            old_status,
            new_status,
            reason,
            changed_by,
            changed_at,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.disable_reason, -- Will be NULL for auto-lock
            NEW.disabled_by,    -- Will be NULL for auto-lock
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'failed_login_count', NEW.failed_login_count,
                'locked_until', NEW.locked_until,
                'last_failed_login_at', NEW.last_failed_login_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_user_status_change ON users;
DROP TRIGGER IF EXISTS trigger_log_user_status_change ON users;
CREATE TRIGGER trigger_log_user_status_change
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_status_change();

-- =============================================
-- 5. Create Helper Function: Check if User is Locked
-- =============================================
CREATE OR REPLACE FUNCTION is_user_locked(user_id_param INT)
RETURNS BOOLEAN AS $$
DECLARE
    user_status VARCHAR(20);
    user_locked_until TIMESTAMP;
BEGIN
    SELECT status, locked_until 
    INTO user_status, user_locked_until
    FROM users 
    WHERE id = user_id_param;
    
    -- User is locked if status = 'locked' AND locked_until is in the future
    IF user_status = 'locked' AND user_locked_until > CURRENT_TIMESTAMP THEN
        RETURN TRUE;
    END IF;
    
    -- Auto-unlock if lock expired
    IF user_status = 'locked' AND user_locked_until <= CURRENT_TIMESTAMP THEN
        UPDATE users 
        SET status = 'active', 
            locked_until = NULL, 
            failed_login_count = 0,
            status_updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id_param;
        
        RETURN FALSE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. Create Helper Function: Auto-Lock User After Failed Logins
-- =============================================
CREATE OR REPLACE FUNCTION auto_lock_user_if_needed(
    user_id_param INT,
    max_attempts INT DEFAULT 5,
    lock_duration_minutes INT DEFAULT 30
)
RETURNS VOID AS $$
DECLARE
    current_failed_count INT;
BEGIN
    -- Get current failed login count
    SELECT failed_login_count INTO current_failed_count
    FROM users
    WHERE id = user_id_param;
    
    -- Lock user if reached max attempts
    IF current_failed_count >= max_attempts THEN
        UPDATE users
        SET status = 'locked',
            locked_until = CURRENT_TIMESTAMP + (lock_duration_minutes || ' minutes')::INTERVAL,
            status_updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. Comments for Documentation
-- =============================================
COMMENT ON COLUMN users.status IS 'User account status: active, disabled (manual by admin), locked (auto by system after failed logins)';
COMMENT ON COLUMN users.failed_login_count IS 'Number of consecutive failed login attempts (reset on successful login)';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked (NULL = not locked)';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.last_login_ip IS 'IP address of last successful login (IPv6 compatible)';
COMMENT ON COLUMN users.disabled_at IS 'Timestamp when account was manually disabled by admin';
COMMENT ON COLUMN users.disabled_by IS 'User ID of admin who disabled this account';
COMMENT ON COLUMN users.disable_reason IS 'Reason provided by admin for disabling account';

COMMENT ON TABLE user_status_history IS 'Audit trail for all user status changes (active/disabled/locked transitions)';
COMMENT ON FUNCTION is_user_locked IS 'Check if user is currently locked, auto-unlock if lock expired';
COMMENT ON FUNCTION auto_lock_user_if_needed IS 'Automatically lock user account after max failed login attempts';

-- =============================================
-- 8. Update Existing Users (Safe Migration)
-- =============================================
-- Set all existing users to 'active' status (already default)
UPDATE users 
SET status = 'active', 
    failed_login_count = 0,
    status_updated_at = CURRENT_TIMESTAMP
WHERE status IS NULL;

-- =============================================
-- 9. Security Constants (Document in .env or config)
-- =============================================
-- MAX_FAILED_LOGIN_ATTEMPTS = 5
-- LOCK_DURATION_MINUTES = 30
-- These should be configurable via environment variables

-- =============================================
-- 10. Verification Queries (for testing)
-- =============================================
-- Check new columns:
-- SELECT id, username, email, status, failed_login_count, locked_until, last_login_at FROM users LIMIT 5;

-- Check trigger is working:
-- UPDATE users SET status = 'locked' WHERE id = 1;
-- SELECT * FROM user_status_history WHERE user_id = 1;

-- Test auto-lock function:
-- UPDATE users SET failed_login_count = 5 WHERE id = 2;
-- SELECT auto_lock_user_if_needed(2);
-- SELECT status, locked_until FROM users WHERE id = 2;
