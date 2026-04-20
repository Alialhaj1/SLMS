-- =====================================================================
-- Migration 420: Comprehensive Approval & Authorization Workflow Engine
-- =====================================================================
-- Purpose: Build a full document lifecycle approval workflow covering
--          all financial documents: journal entries, payment/receipt
--          vouchers, bank transfers, purchase orders, expenses, etc.
--
-- Flow:  Creator(A) → Reviewer(B) → Approver(C) → Posted
--        with rejection, recall, delegation, SLA, and auto-approve
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE approval_document_type AS ENUM (
    'journal_entry',
    'payment_voucher',
    'receipt_voucher',
    'bank_transfer',
    'purchase_order',
    'expense_claim',
    'vendor_invoice',
    'debit_note',
    'credit_note',
    'shipment_order',
    'customs_declaration',
    'stock_adjustment',
    'transfer_request',
    'payment_request',
    'letter_of_credit',
    'bank_reconciliation'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_doc_status AS ENUM (
    'draft',
    'pending_review',
    'under_review',
    'approved',
    'rejected',
    'pending_post',
    'posted',
    'voided',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_action_type AS ENUM (
    'submitted',
    'viewed',
    'reviewed',
    'approved',
    'rejected',
    'posted',
    'voided',
    'cancelled',
    'delegated',
    'escalated',
    'recalled',
    'resubmitted',
    'reminded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_step_type AS ENUM ('review', 'approve', 'notify');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_consensus_type AS ENUM ('any_one', 'all_required', 'majority');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────
-- 2. approval_routes — Template for approval chains
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_routes (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER REFERENCES tenants(id),
  company_id          INTEGER REFERENCES companies(id),
  name_ar             VARCHAR(255) NOT NULL,
  name_en             VARCHAR(255) NOT NULL,
  document_type       approval_document_type NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  min_amount          DECIMAL(18,2) DEFAULT 0,
  max_amount          DECIMAL(18,2),
  auto_approve_below  DECIMAL(18,2),
  require_all_steps   BOOLEAN NOT NULL DEFAULT true,
  sla_hours           INTEGER NOT NULL DEFAULT 24,
  description_ar      TEXT,
  description_en      TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  UNIQUE (company_id, document_type, min_amount, max_amount)
);

CREATE INDEX IF NOT EXISTS idx_approval_routes_company ON approval_routes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_routes_type ON approval_routes(document_type) WHERE deleted_at IS NULL AND is_active = true;


-- ─────────────────────────────────────────────────────────
-- 3. approval_route_steps — Steps within each route
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_route_steps (
  id                      SERIAL PRIMARY KEY,
  route_id                INTEGER NOT NULL REFERENCES approval_routes(id) ON DELETE CASCADE,
  step_number             INTEGER NOT NULL,
  step_type               approval_step_type NOT NULL DEFAULT 'review',
  role_id                 INTEGER REFERENCES roles(id),
  user_id                 INTEGER REFERENCES users(id),
  department              VARCHAR(100),
  approval_type           approval_consensus_type NOT NULL DEFAULT 'any_one',
  can_delegate            BOOLEAN NOT NULL DEFAULT true,
  is_mandatory            BOOLEAN NOT NULL DEFAULT true,
  escalate_after_hours    INTEGER,
  escalate_to_user_id     INTEGER REFERENCES users(id),
  note_required_on_reject BOOLEAN NOT NULL DEFAULT true,
  label_ar                VARCHAR(255),
  label_en                VARCHAR(255),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_route ON approval_route_steps(route_id);


-- ─────────────────────────────────────────────────────────
-- 4. approval_documents — Unified approval tracking
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_documents (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER REFERENCES tenants(id),
  company_id        INTEGER NOT NULL REFERENCES companies(id),
  document_number   VARCHAR(50),
  document_type     approval_document_type NOT NULL,
  reference_id      INTEGER NOT NULL,
  reference_table   VARCHAR(100) NOT NULL,
  title             VARCHAR(500),
  amount            DECIMAL(18,2) DEFAULT 0,
  currency          VARCHAR(10) DEFAULT 'SAR',
  status            approval_doc_status NOT NULL DEFAULT 'draft',
  route_id          INTEGER REFERENCES approval_routes(id),
  current_step      INTEGER DEFAULT 0,
  total_steps       INTEGER DEFAULT 0,
  created_by        INTEGER NOT NULL REFERENCES users(id),
  branch_id         INTEGER REFERENCES branches(id),
  notes             TEXT,
  attachments       JSONB DEFAULT '[]'::jsonb,
  priority          approval_priority NOT NULL DEFAULT 'normal',
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  posted_at         TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  due_date          DATE,
  current_assignee  INTEGER REFERENCES users(id),
  rejection_count   INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_docs_company ON approval_documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_docs_status ON approval_documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_docs_assignee ON approval_documents(current_assignee) WHERE deleted_at IS NULL AND status NOT IN ('draft', 'posted', 'voided', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_approval_docs_creator ON approval_documents(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_docs_ref ON approval_documents(reference_table, reference_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_docs_type ON approval_documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_docs_submitted ON approval_documents(submitted_at) WHERE deleted_at IS NULL AND submitted_at IS NOT NULL;


-- ─────────────────────────────────────────────────────────
-- 5. approval_actions — WORM audit log (INSERT ONLY)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_actions (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL REFERENCES approval_documents(id),
  step_id         INTEGER REFERENCES approval_route_steps(id),
  step_number     INTEGER,
  action          approval_action_type NOT NULL,
  actor_id        INTEGER NOT NULL REFERENCES users(id),
  delegated_by    INTEGER REFERENCES users(id),
  comment         TEXT,
  read_at         TIMESTAMPTZ,
  acted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_doc ON approval_actions(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_actor ON approval_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_action ON approval_actions(action);

-- WORM Policy: Prevent UPDATE and DELETE on approval_actions
CREATE OR REPLACE FUNCTION prevent_approval_actions_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'approval_actions table is WORM (Write Once Read Many). Modifications are not allowed.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_actions_no_update ON approval_actions;
CREATE TRIGGER trg_approval_actions_no_update
  BEFORE UPDATE ON approval_actions
  FOR EACH ROW EXECUTE FUNCTION prevent_approval_actions_modification();

DROP TRIGGER IF EXISTS trg_approval_actions_no_delete ON approval_actions;
CREATE TRIGGER trg_approval_actions_no_delete
  BEFORE DELETE ON approval_actions
  FOR EACH ROW EXECUTE FUNCTION prevent_approval_actions_modification();


-- ─────────────────────────────────────────────────────────
-- 6. approval_watchers — Users monitoring documents
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_watchers (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL REFERENCES approval_documents(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  added_by        INTEGER REFERENCES users(id),
  notify_on       TEXT[] DEFAULT ARRAY['submitted','approved','rejected','posted','voided'],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_watchers_doc ON approval_watchers(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_watchers_user ON approval_watchers(user_id);


-- ─────────────────────────────────────────────────────────
-- 7. approval_delegations — Temporary authority transfer
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_delegations (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER REFERENCES tenants(id),
  company_id      INTEGER REFERENCES companies(id),
  from_user_id    INTEGER NOT NULL REFERENCES users(id),
  to_user_id      INTEGER NOT NULL REFERENCES users(id),
  document_types  approval_document_type[] DEFAULT '{}',
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  CHECK (valid_until > valid_from),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_delegations_from ON approval_delegations(from_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_approval_delegations_to ON approval_delegations(to_user_id) WHERE is_active = true;


-- ─────────────────────────────────────────────────────────
-- 8. Add approval_document_id FK to existing tables
-- ─────────────────────────────────────────────────────────

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS approval_document_id INTEGER REFERENCES approval_documents(id);

DO $$
BEGIN
  ALTER TABLE payment_vouchers
    ADD COLUMN IF NOT EXISTS approval_document_id INTEGER REFERENCES approval_documents(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE receipt_vouchers
    ADD COLUMN IF NOT EXISTS approval_document_id INTEGER REFERENCES approval_documents(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS approval_document_id INTEGER REFERENCES approval_documents(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS approval_document_id INTEGER REFERENCES approval_documents(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────
-- 9. Seed new RBAC Permissions
-- ─────────────────────────────────────────────────────────

INSERT INTO permissions (permission_code, resource, action, name_en, description, module, created_at)
VALUES
  ('approval_documents:view',      'approval_documents', 'view',      'View Approval Documents',      'View documents in approval workflow',               'approvals', NOW()),
  ('approval_documents:create',    'approval_documents', 'create',    'Create Approval Documents',    'Submit documents for approval',                     'approvals', NOW()),
  ('approval_documents:submit',    'approval_documents', 'submit',    'Submit for Approval',          'Submit documents for review',                       'approvals', NOW()),
  ('approval_documents:review',    'approval_documents', 'review',    'Review Documents',             'Review and approve/reject documents (Reviewer B)',   'approvals', NOW()),
  ('approval_documents:approve',   'approval_documents', 'approve',   'Approve Documents',            'Final approval/authorization of documents (Approver C)', 'approvals', NOW()),
  ('approval_documents:post',      'approval_documents', 'post',      'Post Documents',               'Post approved documents to accounting',              'approvals', NOW()),
  ('approval_documents:void',      'approval_documents', 'void',      'Void Documents',               'Void posted documents with reversal',               'approvals', NOW()),
  ('approval_documents:recall',    'approval_documents', 'recall',    'Recall Documents',             'Recall submitted documents before action',           'approvals', NOW()),
  ('approval_documents:delegate',  'approval_documents', 'delegate',  'Delegate Approval',            'Delegate approval authority to another user',        'approvals', NOW()),
  ('approval_documents:monitor',   'approval_documents', 'monitor',   'Monitor Approvals Dashboard',  'Access the approval monitoring dashboard',           'approvals', NOW()),
  ('approval_routes:view',         'approval_routes',    'view',      'View Approval Routes',         'View approval route configurations',                 'approvals', NOW()),
  ('approval_routes:create',       'approval_routes',    'create',    'Create Approval Routes',       'Create and configure approval routes',               'approvals', NOW()),
  ('approval_routes:edit',         'approval_routes',    'edit',      'Edit Approval Routes',         'Edit approval route configurations',                 'approvals', NOW()),
  ('approval_routes:delete',       'approval_routes',    'delete',    'Delete Approval Routes',       'Delete approval route configurations',               'approvals', NOW())
ON CONFLICT (permission_code) DO NOTHING;

-- Grant all approval permissions to super_admin and tenant_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'tenant_admin', 'tenant_owner')
  AND p.permission_code LIKE 'approval_%'
ON CONFLICT DO NOTHING;

-- Grant view + submit + recall to all manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('tenant_manager')
  AND p.permission_code IN ('approval_documents:view', 'approval_documents:create', 'approval_documents:submit', 'approval_documents:recall', 'approval_documents:monitor')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- 10. Helper function: Find matching approval route
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_approval_route(
  p_company_id INTEGER,
  p_document_type TEXT,
  p_amount DECIMAL DEFAULT 0
) RETURNS TABLE (
  route_id INTEGER,
  route_name_ar VARCHAR,
  route_name_en VARCHAR,
  auto_approve_below DECIMAL,
  sla_hours INTEGER,
  step_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id AS route_id,
    ar.name_ar AS route_name_ar,
    ar.name_en AS route_name_en,
    ar.auto_approve_below,
    ar.sla_hours,
    (SELECT COUNT(*) FROM approval_route_steps ars WHERE ars.route_id = ar.id) AS step_count
  FROM approval_routes ar
  WHERE ar.company_id = p_company_id
    AND ar.document_type = p_document_type::approval_document_type
    AND ar.is_active = true
    AND ar.deleted_at IS NULL
    AND p_amount >= COALESCE(ar.min_amount, 0)
    AND (ar.max_amount IS NULL OR p_amount <= ar.max_amount)
  ORDER BY ar.min_amount DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────
-- 11. Seed default approval routes (per company)
--     Created on first use if not configured
-- ─────────────────────────────────────────────────────────

-- We insert defaults for company_id = NULL as templates
-- Actual routes are created per company when they configure the system

INSERT INTO approval_routes (tenant_id, company_id, name_ar, name_en, document_type, sla_hours, auto_approve_below, min_amount, description_ar, description_en)
VALUES
  -- These are TEMPLATE routes (company_id IS NULL) — copied to company on first setup
  (NULL, NULL, 'دورة اعتماد القيود اليومية',      'Journal Entry Approval Route',      'journal_entry',      24, 500,   0, 'دورة اعتماد القيود اليومية الافتراضية',           'Default journal entry approval route'),
  (NULL, NULL, 'دورة اعتماد سندات الصرف',         'Payment Voucher Approval Route',    'payment_voucher',    24, NULL,  0, 'دورة اعتماد سندات الصرف — بدون اعتماد تلقائي',   'Payment voucher approval route — no auto-approve'),
  (NULL, NULL, 'دورة اعتماد سندات القبض',         'Receipt Voucher Approval Route',    'receipt_voucher',    24, 1000,  0, 'دورة اعتماد سندات القبض',                         'Receipt voucher approval route'),
  (NULL, NULL, 'دورة اعتماد التحويلات البنكية',   'Bank Transfer Approval Route',      'bank_transfer',      24, NULL,  0, 'دورة اعتماد التحويلات البنكية',                   'Bank transfer approval route'),
  (NULL, NULL, 'دورة اعتماد أوامر الشراء',        'Purchase Order Approval Route',     'purchase_order',     24, 500,   0, 'دورة اعتماد أوامر الشراء',                        'Purchase order approval route'),
  (NULL, NULL, 'دورة اعتماد مطالبات المصروفات',   'Expense Claim Approval Route',      'expense_claim',      24, 100,   0, 'دورة اعتماد مطالبات المصروفات',                   'Expense claim approval route'),
  (NULL, NULL, 'دورة اعتماد فواتير الموردين',     'Vendor Invoice Approval Route',     'vendor_invoice',     24, NULL,  0, 'دورة اعتماد فواتير الموردين',                     'Vendor invoice approval route'),
  (NULL, NULL, 'دورة اعتماد طلبات التحويل',       'Transfer Request Approval Route',   'transfer_request',   24, NULL,  0, 'دورة اعتماد طلبات التحويل',                       'Transfer request approval route'),
  (NULL, NULL, 'دورة اعتماد طلبات الدفع',         'Payment Request Approval Route',    'payment_request',    24, NULL,  0, 'دورة اعتماد طلبات الدفع',                         'Payment request approval route')
ON CONFLICT DO NOTHING;

-- Seed default steps for template routes
-- Step pattern: Step 1 = Review (B), Step 2 = Approve (C)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, document_type FROM approval_routes WHERE company_id IS NULL AND deleted_at IS NULL LOOP
    -- Step 1: Review
    INSERT INTO approval_route_steps (route_id, step_number, step_type, approval_type, can_delegate, is_mandatory, note_required_on_reject, label_ar, label_en)
    VALUES (r.id, 1, 'review', 'any_one', true, true, true, 'مراجعة', 'Review')
    ON CONFLICT (route_id, step_number) DO NOTHING;

    -- Step 2: Approve
    INSERT INTO approval_route_steps (route_id, step_number, step_type, approval_type, can_delegate, is_mandatory, note_required_on_reject, label_ar, label_en)
    VALUES (r.id, 2, 'approve', 'any_one', true, true, true, 'اعتماد', 'Approve')
    ON CONFLICT (route_id, step_number) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────
-- 12. Updated timestamp trigger for approval_documents
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_approval_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_documents_updated ON approval_documents;
CREATE TRIGGER trg_approval_documents_updated
  BEFORE UPDATE ON approval_documents
  FOR EACH ROW EXECUTE FUNCTION update_approval_documents_timestamp();


COMMIT;
