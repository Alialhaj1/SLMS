-- Migration: Create help_requests table
-- Description: Allows users to request access/permissions from administrators

CREATE TABLE IF NOT EXISTS help_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('access_request', 'permission_request', 'general_support')),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  requested_permission VARCHAR(100),
  requested_page VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
  admin_response TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_help_requests_user ON help_requests(user_id);
CREATE INDEX idx_help_requests_company ON help_requests(company_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_type ON help_requests(type);
CREATE INDEX idx_help_requests_created ON help_requests(created_at DESC);

-- Comments
COMMENT ON TABLE help_requests IS 'User help and access requests';
COMMENT ON COLUMN help_requests.type IS 'Type of request: access_request, permission_request, general_support';
COMMENT ON COLUMN help_requests.status IS 'Request status: pending, approved, rejected, resolved';
COMMENT ON COLUMN help_requests.requested_permission IS 'Permission code requested (e.g., dashboard:view)';
COMMENT ON COLUMN help_requests.requested_page IS 'Page URL where access was denied';
