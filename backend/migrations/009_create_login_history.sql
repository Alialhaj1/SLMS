-- =====================================================
-- Migration 009: Login History & Activity Tracking
-- Phase 4B Feature 4: Complete audit trail for authentication
-- =====================================================

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('login_success', 'login_failed', 'logout', 'token_refresh')),
    
    -- Session Information
    ip_address VARCHAR(45),  -- Support IPv6
    user_agent TEXT,
    device_info JSONB,  -- Browser, OS, Device Type
    
    -- Security Context
    failed_reason VARCHAR(100),  -- For failed attempts: wrong_password, account_locked, etc.
    security_flags JSONB,  -- suspicious_ip, new_device, unusual_location, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB  -- Additional context (geolocation, etc.)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_activity_type ON login_history(activity_type);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_activity ON login_history(user_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address) WHERE ip_address IS NOT NULL;

-- Comments
COMMENT ON TABLE login_history IS 'Complete authentication activity log for security audit and compliance (ISO, SOC2)';
COMMENT ON COLUMN login_history.activity_type IS 'Type of authentication event: login_success, login_failed, logout, token_refresh';
COMMENT ON COLUMN login_history.failed_reason IS 'Reason for failed login: wrong_password, account_locked, account_disabled, user_not_found';
COMMENT ON COLUMN login_history.security_flags IS 'Security indicators: suspicious_ip, new_device, unusual_location, tor_exit_node';
COMMENT ON COLUMN login_history.device_info IS 'Parsed user agent: browser, os, device_type, is_mobile';

-- Function to get recent login statistics for a user
CREATE OR REPLACE FUNCTION get_user_login_stats(p_user_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_logins BIGINT,
    successful_logins BIGINT,
    failed_logins BIGINT,
    unique_ips BIGINT,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_logins,
        COUNT(*) FILTER (WHERE activity_type = 'login_success')::BIGINT as successful_logins,
        COUNT(*) FILTER (WHERE activity_type = 'login_failed')::BIGINT as failed_logins,
        COUNT(DISTINCT ip_address)::BIGINT as unique_ips,
        MAX(created_at) FILTER (WHERE activity_type = 'login_success') as last_login_at,
        (SELECT ip_address FROM login_history 
         WHERE user_id = p_user_id AND activity_type = 'login_success' 
         ORDER BY created_at DESC LIMIT 1) as last_login_ip
    FROM login_history
    WHERE user_id = p_user_id 
      AND created_at >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION detect_suspicious_login(
    p_user_id INTEGER,
    p_ip_address VARCHAR(45)
)
RETURNS JSONB AS $$
DECLARE
    v_recent_ips INTEGER;
    v_failed_count INTEGER;
    v_new_device BOOLEAN;
    v_flags JSONB := '{}';
BEGIN
    -- Check for multiple IPs in last hour
    SELECT COUNT(DISTINCT ip_address) INTO v_recent_ips
    FROM login_history
    WHERE user_id = p_user_id 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    IF v_recent_ips > 3 THEN
        v_flags := v_flags || '{"multiple_ips": true}'::JSONB;
    END IF;
    
    -- Check for recent failed attempts from this IP
    SELECT COUNT(*) INTO v_failed_count
    FROM login_history
    WHERE ip_address = p_ip_address 
      AND activity_type = 'login_failed'
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    IF v_failed_count >= 3 THEN
        v_flags := v_flags || '{"suspicious_ip": true}'::JSONB;
    END IF;
    
    -- Check if this is a new device/IP combination
    SELECT NOT EXISTS(
        SELECT 1 FROM login_history
        WHERE user_id = p_user_id 
          AND ip_address = p_ip_address
          AND activity_type = 'login_success'
          AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
    ) INTO v_new_device;
    
    IF v_new_device THEN
        v_flags := v_flags || '{"new_device": true}'::JSONB;
    END IF;
    
    RETURN v_flags;
END;
$$ LANGUAGE plpgsql;

-- Automatically clean up old login history (older than 1 year)
-- This should be run periodically via a scheduled job
CREATE OR REPLACE FUNCTION cleanup_old_login_history()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM login_history
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_login_stats IS 'Calculate login statistics for a user over specified period';
COMMENT ON FUNCTION detect_suspicious_login IS 'Analyze login patterns and flag suspicious activity for security monitoring';
COMMENT ON FUNCTION cleanup_old_login_history IS 'Remove login history older than 1 year for GDPR compliance';
