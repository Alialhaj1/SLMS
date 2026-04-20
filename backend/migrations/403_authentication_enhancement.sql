-- Migration 403: Authentication Enhancement
-- Adds: MFA columns on users, tenant_sessions, mfa_backup_codes, mfa_remembered_devices, api_keys
-- Part of Section 2: Complete Authentication System overhaul

-- =============================================================================
-- 1. Add MFA columns to users table
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;           -- Encrypted TOTP secret
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(20) DEFAULT 'totp';  -- 'totp' | 'sms' | 'email'
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_password TEXT;   -- For admin visibility (AES encrypted)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_context VARCHAR(20); -- 'platform' | 'tenant'

-- =============================================================================
-- 2. Tenant Sessions — track active sessions per user/tenant
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    jti VARCHAR(255) NOT NULL,                    -- JWT ID for token revocation
    login_context VARCHAR(20) NOT NULL DEFAULT 'platform',  -- 'platform' | 'tenant' | 'api'
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    device_info JSONB,                            -- Parsed UA (browser, OS, device)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),                  -- 'logout' | 'token_refresh' | 'admin_revoke' | 'session_limit'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tenant_sessions_jti UNIQUE (jti),
    CONSTRAINT uq_tenant_sessions_session_id UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sessions_user_id ON tenant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_tenant_id ON tenant_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_jti ON tenant_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_active ON tenant_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_expires ON tenant_sessions(expires_at) WHERE is_active = TRUE;

-- =============================================================================
-- 3. MFA Backup Codes — 8 one-time-use codes per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,              -- SHA-256 hashed backup code
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ                        -- Optional expiry (null = never expires)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_unused ON mfa_backup_codes(user_id, is_used) WHERE is_used = FALSE;

-- =============================================================================
-- 4. MFA Remembered Devices — "trust this device" for 30 days
-- =============================================================================
CREATE TABLE IF NOT EXISTS mfa_remembered_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_hash VARCHAR(255) NOT NULL,       -- SHA-256 of device trust token
    device_fingerprint VARCHAR(255),               -- Browser fingerprint hash
    device_name VARCHAR(200),                      -- Friendly name (e.g., "Chrome on Windows")
    ip_address VARCHAR(45),
    user_agent TEXT,
    trusted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,               -- 30 days from creation
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,

    CONSTRAINT uq_mfa_device_token UNIQUE (device_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_remembered_devices_user ON mfa_remembered_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_remembered_devices_token ON mfa_remembered_devices(device_token_hash);
CREATE INDEX IF NOT EXISTS idx_mfa_remembered_devices_active ON mfa_remembered_devices(user_id, is_revoked, expires_at)
    WHERE is_revoked = FALSE;

-- =============================================================================
-- 5. API Keys — external integration authentication
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(40) NOT NULL,                   -- Public identifier (prefix: slms_)
    key_hash VARCHAR(255) NOT NULL,                -- SHA-256 of the full API key
    name VARCHAR(200) NOT NULL,                    -- Friendly name (e.g., "ERP Integration")
    description TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    scopes TEXT[] DEFAULT '{}',                    -- Allowed scopes: ['shipments:read', 'expenses:read']
    rate_limit_per_minute INTEGER DEFAULT 60,
    ip_whitelist TEXT[],                           -- Optional IP restriction
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(45),
    expires_at TIMESTAMPTZ,                        -- Null = never expires
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    revoked_by INTEGER REFERENCES users(id),

    CONSTRAINT uq_api_keys_key_id UNIQUE (key_id),
    CONSTRAINT uq_api_keys_key_hash UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- 6. Cleanup function for expired sessions
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deactivate expired sessions
    WITH deactivated AS (
        UPDATE tenant_sessions
        SET is_active = FALSE,
            revoked_reason = 'expired'
        WHERE is_active = TRUE
          AND expires_at < CURRENT_TIMESTAMP
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deactivated;

    -- Deactivate expired remembered devices
    UPDATE mfa_remembered_devices
    SET is_revoked = TRUE,
        revoked_at = CURRENT_TIMESTAMP
    WHERE is_revoked = FALSE
      AND expires_at < CURRENT_TIMESTAMP;

    -- Delete sessions older than 90 days
    DELETE FROM tenant_sessions
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      AND is_active = FALSE;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. Function to get active session count for a user
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_active_sessions(p_user_id INTEGER)
RETURNS TABLE (
    session_count BIGINT,
    latest_session_at TIMESTAMPTZ,
    unique_ips BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        MAX(created_at),
        COUNT(DISTINCT ip_address)::BIGINT
    FROM tenant_sessions
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND expires_at > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. Seed auth-related permissions
-- =============================================================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
    ('mfa:manage', 'mfa', 'manage', 'Manage own MFA settings'),
    ('mfa:admin', 'mfa', 'admin', 'Admin MFA controls for other users'),
    ('api_keys:view', 'api_keys', 'view', 'View API keys'),
    ('api_keys:create', 'api_keys', 'create', 'Create API keys'),
    ('api_keys:delete', 'api_keys', 'delete', 'Delete/revoke API keys'),
    ('sessions:view', 'sessions', 'view', 'View active sessions'),
    ('sessions:revoke', 'sessions', 'revoke', 'Revoke active sessions')
ON CONFLICT (permission_code) DO NOTHING;
