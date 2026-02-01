-- Migration 118: Approval Matrix System
-- ============================================================================
-- Purpose: Multi-level approval workflows for POs, Invoices, Payments
--          Based on amount thresholds and user roles
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. APPROVAL WORKFLOWS - Define approval rules
-- ============================================================================
CREATE TABLE approval_workflows (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Module configuration
  module VARCHAR(50) NOT NULL, -- 'purchase_orders', 'purchase_invoices', 'vendor_payments'
  workflow_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Amount thresholds
  min_amount NUMERIC(18,4) DEFAULT 0,
  max_amount NUMERIC(18,4), -- NULL = unlimited
  
  -- Approval requirements
  required_approvals_count INTEGER DEFAULT 1, -- How many approvals needed
  approval_role VARCHAR(50), -- 'finance', 'management', 'super_admin' (NULL = any role)
  
  -- Workflow settings
  is_active BOOLEAN DEFAULT true,
  approval_order INTEGER DEFAULT 1, -- For multi-step approvals
  timeout_hours INTEGER, -- Auto-approve after X hours (NULL = no timeout)
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT unique_workflow_per_module_range 
    UNIQUE(company_id, module, min_amount, max_amount, deleted_at)
);

CREATE INDEX idx_approval_workflows_company ON approval_workflows(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_approval_workflows_module ON approval_workflows(module, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_approval_workflows_amount_range ON approval_workflows(min_amount, max_amount) WHERE deleted_at IS NULL AND is_active = true;

-- ============================================================================
-- 2. APPROVAL REQUESTS - Track document approval status
-- ============================================================================
CREATE TABLE approval_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  workflow_id INTEGER REFERENCES approval_workflows(id),
  
  -- Document reference
  document_type VARCHAR(50) NOT NULL, -- 'purchase_order', 'purchase_invoice', 'vendor_payment'
  document_id INTEGER NOT NULL, -- Foreign key to respective table
  document_number VARCHAR(100), -- For display (PO-001, INV-001, PAY-001)
  document_amount NUMERIC(18,4) NOT NULL,
  
  -- Request details
  requested_by INTEGER NOT NULL REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  request_notes TEXT,
  
  -- Approval status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled', 'expired'
  
  -- Approval/Rejection details
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  reviewer_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT check_approval_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired'))
);

CREATE INDEX idx_approval_requests_company ON approval_requests(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_approval_requests_status ON approval_requests(status) WHERE deleted_at IS NULL AND status = 'pending';
CREATE INDEX idx_approval_requests_document ON approval_requests(document_type, document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_approval_requests_reviewed_by ON approval_requests(reviewed_by) WHERE deleted_at IS NULL;

-- Partial index for pending approvals (most common query)
CREATE INDEX idx_approval_requests_pending ON approval_requests(company_id, requested_at DESC)
WHERE deleted_at IS NULL AND status = 'pending';

-- ============================================================================
-- 3. APPROVAL HISTORY - Audit trail for multi-step approvals
-- ============================================================================
CREATE TABLE approval_history (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL REFERENCES approval_requests(id),
  
  -- Step details
  step_number INTEGER NOT NULL,
  approved_by INTEGER NOT NULL REFERENCES users(id),
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
  notes TEXT,
  
  -- User context
  user_role VARCHAR(50),
  user_email VARCHAR(255),
  
  CONSTRAINT check_approval_action CHECK (action IN ('approved', 'rejected'))
);

CREATE INDEX idx_approval_history_request ON approval_history(approval_request_id);
CREATE INDEX idx_approval_history_user ON approval_history(approved_by);

-- ============================================================================
-- 4. HELPER FUNCTION: Check if document needs approval
-- ============================================================================
CREATE OR REPLACE FUNCTION needs_approval(
  p_company_id INTEGER,
  p_module VARCHAR(50),
  p_amount NUMERIC(18,4)
) RETURNS BOOLEAN AS $$
DECLARE
  workflow_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM approval_workflows
    WHERE company_id = p_company_id
      AND module = p_module
      AND is_active = true
      AND deleted_at IS NULL
      AND p_amount >= COALESCE(min_amount, 0)
      AND (max_amount IS NULL OR p_amount <= max_amount)
  ) INTO workflow_exists;
  
  RETURN workflow_exists;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. HELPER FUNCTION: Get matching workflow for document
-- ============================================================================
CREATE OR REPLACE FUNCTION get_approval_workflow(
  p_company_id INTEGER,
  p_module VARCHAR(50),
  p_amount NUMERIC(18,4)
) RETURNS INTEGER AS $$
DECLARE
  workflow_id INTEGER;
BEGIN
  SELECT id INTO workflow_id
  FROM approval_workflows
  WHERE company_id = p_company_id
    AND module = p_module
    AND is_active = true
    AND deleted_at IS NULL
    AND p_amount >= COALESCE(min_amount, 0)
    AND (max_amount IS NULL OR p_amount <= max_amount)
  ORDER BY min_amount DESC -- Match most specific rule first
  LIMIT 1;
  
  RETURN workflow_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. SEED DEFAULT WORKFLOWS (Basic approval rules)
-- ============================================================================
-- Company 1: Default approval rules
INSERT INTO approval_workflows (company_id, module, workflow_name, description, min_amount, max_amount, required_approvals_count, approval_role, is_active, created_by, updated_by)
VALUES
  -- Purchase Orders
  (1, 'purchase_orders', 'PO: Small (< 10K)', 'Purchase orders under 10,000 SAR - Auto-approved or Finance', 0, 9999.99, 1, 'finance', true, 1, 1),
  (1, 'purchase_orders', 'PO: Medium (10K-50K)', 'Purchase orders 10K-50K SAR - Requires Finance approval', 10000, 49999.99, 1, 'finance', true, 1, 1),
  (1, 'purchase_orders', 'PO: Large (50K-100K)', 'Purchase orders 50K-100K SAR - Requires Management approval', 50000, 99999.99, 1, 'management', true, 1, 1),
  (1, 'purchase_orders', 'PO: Very Large (>100K)', 'Purchase orders over 100K SAR - Requires Super Admin approval', 100000, NULL, 1, 'super_admin', true, 1, 1),
  
  -- Purchase Invoices
  (1, 'purchase_invoices', 'Invoice: Small (< 10K)', 'Purchase invoices under 10,000 SAR', 0, 9999.99, 1, 'finance', true, 1, 1),
  (1, 'purchase_invoices', 'Invoice: Medium (10K-50K)', 'Purchase invoices 10K-50K SAR', 10000, 49999.99, 1, 'finance', true, 1, 1),
  (1, 'purchase_invoices', 'Invoice: Large (>50K)', 'Purchase invoices over 50K SAR', 50000, NULL, 1, 'management', true, 1, 1),
  
  -- Vendor Payments
  (1, 'vendor_payments', 'Payment: Small (< 20K)', 'Vendor payments under 20,000 SAR', 0, 19999.99, 1, 'finance', true, 1, 1),
  (1, 'vendor_payments', 'Payment: Medium (20K-100K)', 'Vendor payments 20K-100K SAR', 20000, 99999.99, 1, 'management', true, 1, 1),
  (1, 'vendor_payments', 'Payment: Large (>100K)', 'Vendor payments over 100K SAR', 100000, NULL, 1, 'super_admin', true, 1, 1);

-- ============================================================================
-- 7. ADD APPROVAL COLUMNS TO EXISTING TABLES
-- ============================================================================
-- Add approval_status to purchase_orders (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='approval_status') THEN
    ALTER TABLE purchase_orders ADD COLUMN approval_status VARCHAR(50) DEFAULT 'not_required';
    ALTER TABLE purchase_orders ADD COLUMN approval_request_id INTEGER REFERENCES approval_requests(id);
  END IF;
END $$;

-- Add approval_status to purchase_invoices (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_invoices' AND column_name='approval_status') THEN
    ALTER TABLE purchase_invoices ADD COLUMN approval_status VARCHAR(50) DEFAULT 'not_required';
    ALTER TABLE purchase_invoices ADD COLUMN approval_request_id INTEGER REFERENCES approval_requests(id);
  END IF;
END $$;

-- Add approval_status to vendor_payments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_payments' AND column_name='approval_status') THEN
    ALTER TABLE vendor_payments ADD COLUMN approval_status VARCHAR(50) DEFAULT 'not_required';
    ALTER TABLE vendor_payments ADD COLUMN approval_request_id INTEGER REFERENCES approval_requests(id);
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Workflow Matching Logic:
--    - Finds the most specific workflow (highest min_amount) that matches
--    - If no workflow matches, document doesn't need approval
--    - approval_role can be NULL (any user with approve permission can approve)
--
-- 2. Multi-level Approvals:
--    - approval_order field allows sequential approvals
--    - approval_history tracks each approval step
--    - required_approvals_count can be > 1 (e.g., 2 managers must approve)
--
-- 3. Integration Pattern:
--    - Before posting: Check needs_approval(company_id, module, amount)
--    - If true: Create approval_request with status='pending'
--    - Set document.approval_status = 'pending'
--    - Block posting until approval_status = 'approved'
--
-- 4. Approval Flow:
--    - User creates document → Auto-check thresholds
--    - If needs approval → Create approval_request
--    - Approver reviews → POST /api/approvals/:id/approve
--    - Update approval_request.status = 'approved'
--    - Update document.approval_status = 'approved'
--    - Allow posting
--
-- 5. Timeout Logic (Future Enhancement):
--    - If timeout_hours is set, auto-approve after X hours
--    - Requires background job (cron) to check expired requests
--    - Update status to 'expired' or 'approved' based on policy
--
-- 6. Role-based Approval:
--    - approval_role filters who can approve
--    - 'finance' = users with role containing 'finance'
--    - 'management' = users with role containing 'manager' or 'management'
--    - 'super_admin' = super_admin role only
--    - NULL = any user with 'approvals:approve' permission
-- ============================================================================
