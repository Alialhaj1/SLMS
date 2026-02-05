-- Migration 205: Enhanced Audit Logs for Enterprise Security
-- Adds: request_id, request_duration_ms, session_id
-- Date: 2026-02-04

-- Add request_id column for correlation tracking
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS request_id UUID;

-- Add request duration for performance monitoring
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS request_duration_ms INTEGER;

-- Add session_id for session tracking
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id 
ON audit_logs(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs(user_id, action, created_at DESC);

-- Comment on new columns
COMMENT ON COLUMN audit_logs.request_id IS 'Correlation ID for tracing requests across services';
COMMENT ON COLUMN audit_logs.request_duration_ms IS 'Request processing time in milliseconds';
COMMENT ON COLUMN audit_logs.session_id IS 'User session ID for session tracking';
