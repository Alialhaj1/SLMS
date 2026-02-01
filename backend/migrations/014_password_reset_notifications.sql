-- Migration 014: Password Reset Requests & Notifications System
-- Purpose: Add admin-controlled password reset and in-app notifications
-- Date: 2025-12-21
-- Phase: Auth UX Enhancement + i18n Foundation

-- =============================================
-- 1. CREATE TABLE: password_reset_requests
-- =============================================
-- Purpose: Store password reset requests that require admin approval
-- Security: No email tokens, no self-service, admin-only approval flow

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    
    -- User Reference
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request Information
    reason TEXT, -- Optional: User can explain why they need reset
    ip_address VARCHAR(45), -- Support IPv4 and IPv6
    user_agent TEXT,
    
    -- Status Management
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Admin Action Tracking
    handled_by INTEGER REFERENCES users(id), -- Admin who handled the request
    handled_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT, -- Admin can add notes about why approved/rejected
    
    -- Temporary Password (Only for approved requests)
    temp_password_hash VARCHAR(255), -- bcrypt hash of temporary password
    temp_password_expires_at TIMESTAMP WITH TIME ZONE,
    temp_password_used BOOLEAN DEFAULT false,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Use IF NOT EXISTS to make migration idempotent when rerun
CREATE INDEX IF NOT EXISTS idx_prr_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_prr_handled_by ON password_reset_requests(handled_by);
CREATE INDEX IF NOT EXISTS idx_prr_requested_at ON password_reset_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_prr_pending ON password_reset_requests(status, requested_at) 
    WHERE status = 'pending';

-- Comments for Documentation
COMMENT ON TABLE password_reset_requests IS 'Admin-controlled password reset requests - no self-service';
COMMENT ON COLUMN password_reset_requests.status IS 'pending | approved | rejected | cancelled';
COMMENT ON COLUMN password_reset_requests.temp_password_hash IS 'bcrypt hash - only populated after admin approval';
COMMENT ON COLUMN password_reset_requests.temp_password_used IS 'Prevents reuse of same temp password';

-- =============================================
-- 2. CREATE TABLE: notifications
-- =============================================
-- Purpose: In-app notification system with i18n support
-- Design: Stores notification metadata + i18n keys (not hardcoded text)

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    
    -- Type & Category
    type VARCHAR(50) NOT NULL, 
        -- Examples: 'password_reset_request', 'suspicious_login', 'user_disabled',
        --           'role_changed', 'permission_revoked', 'account_locked'
    
    category VARCHAR(30) NOT NULL,
        -- 'security' | 'admin' | 'user' | 'system'
    
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        -- 'low' | 'normal' | 'high' | 'critical'
    
    -- i18n Content (Translation Keys)
    title_key VARCHAR(100) NOT NULL, 
        -- Example: 'notifications.password_reset.title'
    message_key VARCHAR(100) NOT NULL,
        -- Example: 'notifications.password_reset.message'
    
    -- Dynamic Data (JSON Payload)
    payload JSONB DEFAULT '{}'::jsonb,
        -- Example: {"user_email": "test@example.com", "request_id": 123}
        -- Used for message interpolation in frontend
    
    -- Targeting (Who should see this notification)
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        -- NULL = notification not targeted to specific user
    target_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        -- NULL = notification not targeted to specific role
        -- Note: target_user_id takes precedence over target_role_id
    
    -- Related Entity (For deep linking)
    related_entity_type VARCHAR(50),
        -- Examples: 'user', 'role', 'password_reset_request', 'login_history'
    related_entity_id INTEGER,
        -- ID of the related entity
    
    -- Status
    read_at TIMESTAMP WITH TIME ZONE, -- NULL = unread
    dismissed_at TIMESTAMP WITH TIME ZONE, -- User can dismiss notifications
    
    -- Action URL (Deep link)
    action_url VARCHAR(255),
        -- Example: '/admin/password-requests/123'
        -- Frontend can navigate user to relevant page
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE 
        -- Optional: Auto-hide notifications after certain time
);

-- Indexes for Performance (Critical for notification queries)
CREATE INDEX IF NOT EXISTS idx_notif_target_user ON notifications(target_user_id) 
    WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_target_role ON notifications(target_role_id) 
    WHERE target_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notif_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notif_created_at ON notifications(created_at DESC);

-- Composite index for unread notifications query (most common query)
CREATE INDEX IF NOT EXISTS idx_notif_unread_user ON notifications(target_user_id, read_at, created_at DESC) 
    WHERE read_at IS NULL AND target_user_id IS NOT NULL;

-- Composite index for unread role notifications
CREATE INDEX IF NOT EXISTS idx_notif_unread_role ON notifications(target_role_id, read_at, created_at DESC) 
    WHERE read_at IS NULL AND target_role_id IS NOT NULL;

-- Comments for Documentation
COMMENT ON TABLE notifications IS 'In-app notification system with i18n support and permission-based targeting';
COMMENT ON COLUMN notifications.title_key IS 'i18n translation key for title';
COMMENT ON COLUMN notifications.message_key IS 'i18n translation key for message body';
COMMENT ON COLUMN notifications.payload IS 'JSON data for dynamic message interpolation';
COMMENT ON COLUMN notifications.target_user_id IS 'Specific user to notify (takes precedence over role)';
COMMENT ON COLUMN notifications.target_role_id IS 'All users with this role will see notification';

-- =============================================
-- 3. UPDATE TABLE: users (i18n Support)
-- =============================================
-- Purpose: Add language preference and profile image support

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ar'
        CHECK (preferred_language IN ('ar', 'en')),
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255); -- URL or path to profile image

-- Index for language queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Comments
COMMENT ON COLUMN users.preferred_language IS 'User interface language preference: ar (Arabic) or en (English)';
COMMENT ON COLUMN users.must_change_password IS 'Force password change on next login (for temporary passwords)';
COMMENT ON COLUMN users.password_changed_at IS 'Last time user changed their password';
COMMENT ON COLUMN users.profile_image IS 'URL or path to user profile image';

-- =============================================
-- 4. INSERT NEW PERMISSIONS
-- =============================================
-- Purpose: Add granular permissions for password reset and notifications
-- Security: Least privilege principle - no permissions given by default

-- Password Reset Request Permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('password_requests:view', 'password_requests', 'view', 'View password reset requests'),
    ('password_requests:approve', 'password_requests', 'approve', 'Approve password reset requests and generate temporary passwords'),
    ('password_requests:reject', 'password_requests', 'reject', 'Reject password reset requests'),
    ('password_requests:cancel', 'password_requests', 'cancel', 'Cancel own password reset request')
ON CONFLICT (permission_code) DO NOTHING;

-- Notification Permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('notifications:view', 'notifications', 'view', 'View own notifications'),
    ('notifications:view_all', 'notifications', 'view_all', 'View all notifications (admin)'),
    ('notifications:create', 'notifications', 'create', 'Create notifications for other users'),
    ('notifications:delete', 'notifications', 'delete', 'Delete any notification'),
    ('notifications:manage', 'notifications', 'manage', 'Full notification management')
ON CONFLICT (permission_code) DO NOTHING;

-- Security Alert Permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('security:alerts:view', 'security', 'alerts_view', 'View security alerts and suspicious activity'),
    ('security:alerts:manage', 'security', 'alerts_manage', 'Manage security alerts and take actions')
ON CONFLICT (permission_code) DO NOTHING;

-- =============================================
-- 5. CREATE FUNCTION: Auto-update updated_at
-- =============================================
-- Purpose: Automatically update updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to password_reset_requests (create only if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'password_reset_requests_updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS password_reset_requests_updated_at ON password_reset_requests;
CREATE TRIGGER password_reset_requests_updated_at
            BEFORE UPDATE ON password_reset_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================
-- 6. CREATE VIEW: Active Password Reset Requests
-- =============================================
-- Purpose: Quick view for admins to see pending requests

CREATE OR REPLACE VIEW active_password_reset_requests AS
SELECT 
    prr.id,
    prr.user_id,
    u.email AS user_email,
    u.full_name AS user_name,
    u.status AS user_status,
    prr.reason,
    prr.status,
    prr.requested_at,
    prr.ip_address,
    prr.handled_by,
    handler.email AS handler_email,
    prr.handled_at,
    prr.admin_notes,
    prr.temp_password_expires_at,
    prr.temp_password_used
FROM password_reset_requests prr
JOIN users u ON prr.user_id = u.id
LEFT JOIN users handler ON prr.handled_by = handler.id
WHERE prr.status = 'pending'
ORDER BY prr.requested_at DESC;

COMMENT ON VIEW active_password_reset_requests IS 'Shows all pending password reset requests with user details';

-- =============================================
-- 7. CREATE VIEW: Unread Notifications Count
-- =============================================
-- Purpose: Efficient query for notification badge counts

CREATE OR REPLACE VIEW user_unread_notification_counts AS
SELECT 
    target_user_id AS user_id,
    COUNT(*) AS unread_count
FROM notifications
WHERE read_at IS NULL 
    AND dismissed_at IS NULL
    AND target_user_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY target_user_id;

COMMENT ON VIEW user_unread_notification_counts IS 'Efficient view for notification badge counts per user';

-- =============================================
-- 8. GRANT PERMISSIONS (Optional - Adjust based on DB roles)
-- =============================================
-- Note: Uncomment and adjust based on your database role structure

-- GRANT SELECT, INSERT, UPDATE ON password_reset_requests TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =============================================
-- 9. MIGRATION VALIDATION QUERIES
-- =============================================
-- Purpose: Queries to verify migration success

-- Check if tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_requests') THEN
        RAISE EXCEPTION 'Migration failed: password_reset_requests table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE EXCEPTION 'Migration failed: notifications table not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'preferred_language'
    ) THEN
        RAISE EXCEPTION 'Migration failed: preferred_language column not added to users';
    END IF;
    
    RAISE NOTICE 'Migration 014 completed successfully!';
END $$;

-- =============================================
-- 10. ROLLBACK SCRIPT (For Emergency Use)
-- =============================================
-- Uncomment and run if you need to rollback this migration
/*
DROP VIEW IF EXISTS user_unread_notification_counts;
DROP VIEW IF EXISTS active_password_reset_requests;
DROP TRIGGER IF EXISTS password_reset_requests_updated_at ON password_reset_requests;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS password_reset_requests;
ALTER TABLE users DROP COLUMN IF EXISTS profile_image;
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE users DROP COLUMN IF EXISTS preferred_language;
DELETE FROM permissions WHERE permission_code LIKE 'password_requests:%';
DELETE FROM permissions WHERE permission_code LIKE 'notifications:%';
DELETE FROM permissions WHERE permission_code LIKE 'security:alerts:%';
*/

-- =============================================
-- END OF MIGRATION 014
-- =============================================
