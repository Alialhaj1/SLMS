-- =====================================================
-- MIGRATION 102: PROCUREMENT CONFIGURATION LAYER
-- =====================================================
-- Purpose: Company-specific procurement settings + 
--          Vendor compliance/risk + Document numbering
-- =====================================================

-- =====================================================
-- 1. PROCUREMENT SETTINGS (Per Company)
-- =====================================================

CREATE TABLE IF NOT EXISTS procurement_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) UNIQUE,
  
  -- 3-Way Matching Configuration
  enable_three_way_matching BOOLEAN DEFAULT TRUE,
  price_tolerance_percent DECIMAL(5,2) DEFAULT 2.00,
  qty_tolerance_percent DECIMAL(5,2) DEFAULT 5.00,
  allow_over_receipt BOOLEAN DEFAULT FALSE,
  allow_over_invoice BOOLEAN DEFAULT FALSE,
  
  -- Approval Workflow
  require_po_approval BOOLEAN DEFAULT TRUE,
  require_invoice_approval BOOLEAN DEFAULT TRUE,
  require_gr_approval BOOLEAN DEFAULT FALSE,
  require_return_approval BOOLEAN DEFAULT TRUE,
  
  -- Posting Controls
  auto_post_goods_receipts BOOLEAN DEFAULT FALSE,
  allow_operational_gr BOOLEAN DEFAULT TRUE,  -- GR without financial posting
  batch_financial_posting BOOLEAN DEFAULT FALSE,
  
  -- Override Permissions
  allow_price_override BOOLEAN DEFAULT FALSE,
  allow_qty_override BOOLEAN DEFAULT FALSE,
  price_override_limit_percent DECIMAL(5,2) DEFAULT 10.00,
  qty_override_limit_percent DECIMAL(5,2) DEFAULT 20.00,
  
  -- Vendor Controls
  block_high_risk_vendors BOOLEAN DEFAULT TRUE,
  require_vendor_compliance BOOLEAN DEFAULT FALSE,
  vendor_credit_check BOOLEAN DEFAULT FALSE,
  
  -- Document Controls
  require_po_for_invoice BOOLEAN DEFAULT TRUE,
  require_gr_for_invoice BOOLEAN DEFAULT TRUE,
  allow_partial_receipt BOOLEAN DEFAULT TRUE,
  allow_partial_invoice BOOLEAN DEFAULT TRUE,
  
  -- Defaults
  default_payment_terms_id INTEGER,
  default_warehouse_id INTEGER,
  default_currency_id INTEGER REFERENCES currencies(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- Insert default settings for existing companies
INSERT INTO procurement_settings (company_id)
SELECT id FROM companies WHERE deleted_at IS NULL
ON CONFLICT (company_id) DO NOTHING;

-- =====================================================
-- 2. VENDOR COMPLIANCE & RISK
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_compliance (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Document Compliance
  has_valid_license BOOLEAN DEFAULT FALSE,
  license_expiry_date DATE,
  has_tax_certificate BOOLEAN DEFAULT FALSE,
  tax_certificate_expiry DATE,
  has_insurance BOOLEAN DEFAULT FALSE,
  insurance_expiry_date DATE,
  missing_documents TEXT[],  -- Array of missing doc types
  
  -- Risk Assessment
  risk_level VARCHAR(20) DEFAULT 'low',  -- low, medium, high, critical
  risk_score DECIMAL(5,2) DEFAULT 0,
  risk_factors JSONB,  -- {"late_payments": 2, "quality_issues": 1}
  
  -- Status Flags
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMP,
  blacklisted_by INTEGER REFERENCES users(id),
  
  is_on_hold BOOLEAN DEFAULT FALSE,
  hold_reason TEXT,
  hold_expires_at TIMESTAMP,
  
  is_preferred BOOLEAN DEFAULT FALSE,
  preferred_since DATE,
  
  -- Compliance Notes
  last_audit_date DATE,
  next_audit_date DATE,
  compliance_notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  
  UNIQUE(vendor_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_compliance_vendor ON vendor_compliance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_compliance_risk ON vendor_compliance(risk_level);
CREATE INDEX IF NOT EXISTS idx_vendor_compliance_blacklist ON vendor_compliance(is_blacklisted) WHERE is_blacklisted = TRUE;

-- =====================================================
-- 3. DOCUMENT NUMBERING SERIES (Shared Service)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_number_series (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  document_type VARCHAR(50) NOT NULL,  -- purchase_order, sales_invoice, etc.
  
  -- Format Configuration
  prefix VARCHAR(20) NOT NULL,         -- PO, SO, INV, GR, etc.
  suffix VARCHAR(20),                   -- Optional suffix
  separator VARCHAR(5) DEFAULT '-',     -- PO-2024-0001
  
  -- Numbering
  current_number INTEGER DEFAULT 0,
  number_length INTEGER DEFAULT 4,      -- Pad with zeros: 0001
  
  -- Reset Policy
  reset_policy VARCHAR(20) DEFAULT 'yearly',  -- yearly, monthly, never
  fiscal_year INTEGER,
  fiscal_month INTEGER,
  last_reset_at TIMESTAMP,
  
  -- Optional Fiscal Year in Number
  include_fiscal_year BOOLEAN DEFAULT TRUE,
  fiscal_year_format VARCHAR(10) DEFAULT 'YYYY',  -- YYYY, YY
  
  -- Branch/Location Prefix
  include_branch_code BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, document_type)
);

-- Insert default numbering series for company 1
INSERT INTO document_number_series (company_id, document_type, prefix, current_number, fiscal_year)
VALUES 
  -- Procurement
  (1, 'purchase_order', 'PO', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'purchase_invoice', 'PINV', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'purchase_return', 'PRET', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'goods_receipt', 'GR', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'vendor_quotation', 'VQ', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'vendor_contract', 'VC', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  -- Sales (pre-create for future)
  (1, 'sales_quotation', 'SQ', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'sales_order', 'SO', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'sales_invoice', 'SINV', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'delivery_note', 'DN', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'sales_return', 'SRET', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'credit_note', 'CN', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  -- Accounting
  (1, 'journal_entry', 'JE', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'payment_voucher', 'PV', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
  (1, 'receipt_voucher', 'RV', 0, EXTRACT(YEAR FROM CURRENT_DATE))
ON CONFLICT (company_id, document_type) DO NOTHING;

-- =====================================================
-- 4. POSTING BATCH (For Batch Financial Posting)
-- =====================================================

CREATE TABLE IF NOT EXISTS posting_batches (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  batch_number VARCHAR(50) NOT NULL,
  batch_date DATE NOT NULL,
  posting_period VARCHAR(7),  -- 2024-01 format
  
  -- Batch Status
  status VARCHAR(20) DEFAULT 'open',  -- open, processing, posted, error
  
  -- Counts
  total_documents INTEGER DEFAULT 0,
  posted_documents INTEGER DEFAULT 0,
  failed_documents INTEGER DEFAULT 0,
  
  -- Totals
  total_debit DECIMAL(18,4) DEFAULT 0,
  total_credit DECIMAL(18,4) DEFAULT 0,
  
  -- Processing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_log JSONB,
  
  -- Audit
  created_by INTEGER REFERENCES users(id),
  posted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posting_batch_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES posting_batches(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_id INTEGER NOT NULL,
  document_number VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, posted, error
  error_message TEXT,
  
  -- Result
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  posted_at TIMESTAMP
);

-- =====================================================
-- 5. ADD OPERATIONAL VS FINANCIAL FLAGS
-- =====================================================

-- Add operational posting flag to goods_receipts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'goods_receipts' AND column_name = 'is_operational_only') THEN
    ALTER TABLE goods_receipts ADD COLUMN is_operational_only BOOLEAN DEFAULT FALSE;
    ALTER TABLE goods_receipts ADD COLUMN financial_posting_batch_id INTEGER REFERENCES posting_batches(id);
    ALTER TABLE goods_receipts ADD COLUMN financial_posted_at TIMESTAMP;
  END IF;
END $$;

-- =====================================================
-- 6. VENDOR COMPLIANCE VIEW
-- =====================================================

CREATE OR REPLACE VIEW v_vendor_compliance_status AS
SELECT 
  v.id as vendor_id,
  v.code as vendor_code,
  v.name as vendor_name,
  v.company_id,
  COALESCE(vc.risk_level, 'unknown') as risk_level,
  COALESCE(vc.risk_score, 0) as risk_score,
  COALESCE(vc.is_blacklisted, FALSE) as is_blacklisted,
  COALESCE(vc.is_on_hold, FALSE) as is_on_hold,
  COALESCE(vc.is_preferred, FALSE) as is_preferred,
  vc.license_expiry_date,
  vc.tax_certificate_expiry,
  vc.insurance_expiry_date,
  CASE 
    WHEN vc.is_blacklisted THEN 'blocked'
    WHEN vc.is_on_hold THEN 'on_hold'
    WHEN vc.risk_level = 'critical' THEN 'high_risk'
    WHEN vc.risk_level = 'high' THEN 'medium_risk'
    WHEN vc.license_expiry_date < CURRENT_DATE THEN 'expired_license'
    WHEN vc.is_preferred THEN 'preferred'
    ELSE 'active'
  END as vendor_status,
  CASE
    WHEN vc.is_blacklisted THEN FALSE
    WHEN vc.is_on_hold THEN FALSE
    WHEN vc.risk_level = 'critical' AND ps.block_high_risk_vendors THEN FALSE
    ELSE TRUE
  END as can_create_po
FROM vendors v
LEFT JOIN vendor_compliance vc ON vc.vendor_id = v.id AND vc.company_id = v.company_id
LEFT JOIN procurement_settings ps ON ps.company_id = v.company_id
WHERE v.deleted_at IS NULL;

-- =====================================================
-- 7. PERMISSIONS FOR NEW FEATURES
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description, name_ar)
VALUES
  ('procurement_settings:view', 'procurement_settings', 'view', 'View procurement settings', 'عرض إعدادات المشتريات'),
  ('procurement_settings:edit', 'procurement_settings', 'edit', 'Edit procurement settings', 'تعديل إعدادات المشتريات'),
  ('vendor_compliance:view', 'vendor_compliance', 'view', 'View vendor compliance', 'عرض امتثال الموردين'),
  ('vendor_compliance:edit', 'vendor_compliance', 'edit', 'Edit vendor compliance', 'تعديل امتثال الموردين'),
  ('vendor_compliance:blacklist', 'vendor_compliance', 'blacklist', 'Blacklist vendors', 'حظر الموردين'),
  ('posting_batches:view', 'posting_batches', 'view', 'View posting batches', 'عرض دفعات الترحيل'),
  ('posting_batches:create', 'posting_batches', 'create', 'Create posting batches', 'إنشاء دفعات الترحيل'),
  ('posting_batches:post', 'posting_batches', 'post', 'Post batches to GL', 'ترحيل الدفعات للأستاذ العام')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.resource IN ('procurement_settings', 'vendor_compliance', 'posting_batches')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Created Tables:
--   • procurement_settings - Company-specific procurement config
--   • vendor_compliance - Vendor risk & compliance tracking
--   • document_number_series - Shared numbering service
--   • posting_batches - Batch financial posting
--   • posting_batch_items - Items in posting batch
--
-- Added Columns:
--   • goods_receipts.is_operational_only
--   • goods_receipts.financial_posting_batch_id
--
-- Created Views:
--   • v_vendor_compliance_status - Vendor risk summary
-- =====================================================
