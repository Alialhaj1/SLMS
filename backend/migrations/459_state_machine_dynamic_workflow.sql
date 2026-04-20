-- ============================================================================
-- Migration 459: Professional State Machine + Dynamic Workflow Enhancements
-- ============================================================================
-- 1. Add 'pending_approval' status to fix ambiguous 'approved' usage
-- 2. Add 'allow_same_approver' to approval_routes
-- 3. Add conditional logic columns to approval_route_steps
-- 4. Add 'escalation_enabled' and 'escalation_to_role_id' to routes
-- ============================================================================

BEGIN;

-- ─── 1. Add 'pending_approval' to status enum ───────────────────────────────
-- State flow becomes:
--   DRAFT → PENDING_REVIEW → UNDER_REVIEW → PENDING_APPROVAL → APPROVED → PENDING_POST → POSTED
--                                   ↓                              ↓
--                               REJECTED ←──────────────────── REJECTED

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_doc_status')
      AND enumlabel = 'pending_approval'
  ) THEN
    -- Insert after 'under_review' in sort order
    ALTER TYPE approval_doc_status ADD VALUE 'pending_approval' AFTER 'under_review';
  END IF;
END $$;

-- ─── 2. Add route-level configuration columns ───────────────────────────────

-- allow_same_approver: for small companies where same user reviews + approves
ALTER TABLE approval_routes ADD COLUMN IF NOT EXISTS allow_same_approver BOOLEAN DEFAULT false;

-- escalation: auto-escalate overdue documents
ALTER TABLE approval_routes ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN DEFAULT false;
ALTER TABLE approval_routes ADD COLUMN IF NOT EXISTS escalation_role_id INTEGER REFERENCES roles(id);

-- ─── 3. Add step-level conditional logic ─────────────────────────────────────

-- condition_field: e.g. 'amount', 'document_type', 'branch_id'
-- condition_operator: '>', '<', '>=', '<=', '=', '!='
-- condition_value: threshold value (stored as text for flexibility)
-- skip_if_condition_met: if true, this step is skipped when condition is met

ALTER TABLE approval_route_steps ADD COLUMN IF NOT EXISTS condition_field VARCHAR(50);
ALTER TABLE approval_route_steps ADD COLUMN IF NOT EXISTS condition_operator VARCHAR(10);
ALTER TABLE approval_route_steps ADD COLUMN IF NOT EXISTS condition_value VARCHAR(100);
ALTER TABLE approval_route_steps ADD COLUMN IF NOT EXISTS skip_if_condition_met BOOLEAN DEFAULT false;

-- step_label (optional human-readable label for conditions)
ALTER TABLE approval_route_steps ADD COLUMN IF NOT EXISTS condition_label VARCHAR(255);

COMMIT;
