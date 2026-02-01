-- =====================================================
-- MIGRATION 101: PROCUREMENT ENTERPRISE ENHANCEMENTS
-- =====================================================
-- Purpose: Add tables for journal entries, vendor performance,
--          document audit trail, and enhanced permissions
-- =====================================================

-- =====================================================
-- 1. JOURNAL ENTRIES (Full Accounting Integration)
-- =====================================================

-- Check if journal_entries table exists (may be created in earlier migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
    CREATE TABLE journal_entries (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      entry_number VARCHAR(50) NOT NULL,
      entry_date DATE NOT NULL,
      entry_type VARCHAR(50) NOT NULL,  -- purchase_invoice, purchase_return, vendor_payment, etc.
      reference_type VARCHAR(50),        -- purchase_invoice, purchase_return, goods_receipt
      reference_id INTEGER,
      reference_number VARCHAR(100),
      description TEXT,
      description_ar TEXT,
      currency_id INTEGER REFERENCES currencies(id),
      exchange_rate DECIMAL(18,6) DEFAULT 1,
      total_debit DECIMAL(18,4) NOT NULL DEFAULT 0,
      total_credit DECIMAL(18,4) NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',  -- draft, posted, reversed
      is_reversed BOOLEAN DEFAULT FALSE,
      reversed_by_entry_id INTEGER REFERENCES journal_entries(id),
      reversal_of_entry_id INTEGER REFERENCES journal_entries(id),
      posted_at TIMESTAMP,
      posted_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    );

    CREATE INDEX idx_journal_entries_company ON journal_entries(company_id);
    CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
    CREATE INDEX idx_journal_entries_type ON journal_entries(entry_type);
    CREATE INDEX idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
    CREATE UNIQUE INDEX idx_journal_entries_number ON journal_entries(company_id, entry_number) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- Journal Entry Lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') THEN
    CREATE TABLE journal_entry_lines (
      id SERIAL PRIMARY KEY,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      account_code VARCHAR(50),
      description TEXT,
      description_ar TEXT,
      debit_amount DECIMAL(18,4) DEFAULT 0,
      credit_amount DECIMAL(18,4) DEFAULT 0,
      cost_center_id INTEGER REFERENCES cost_centers(id),
      project_id INTEGER,
      department_id INTEGER,  -- No FK constraint since departments table may not exist
      vendor_id INTEGER REFERENCES vendors(id),
      customer_id INTEGER,
      item_id INTEGER REFERENCES items(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      currency_amount DECIMAL(18,4),
      exchange_rate DECIMAL(18,6),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
    CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);
    CREATE INDEX idx_journal_entry_lines_vendor ON journal_entry_lines(vendor_id);
  END IF;
END $$;

-- =====================================================
-- 2. VENDOR PERFORMANCE HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_performance_history (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  on_time_rate DECIMAL(5,2),
  return_rate DECIMAL(5,2),
  price_variance_percent DECIMAL(8,2),
  fulfillment_rate DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  rating VARCHAR(20),
  snapshot_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_performance_vendor ON vendor_performance_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_performance_period ON vendor_performance_history(period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_performance_unique 
  ON vendor_performance_history(vendor_id, company_id, period_end);

-- =====================================================
-- 3. DOCUMENT AUDIT TRAIL (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_audit_trail (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  document_type VARCHAR(50) NOT NULL,  -- purchase_order, purchase_invoice, goods_receipt, etc.
  document_id INTEGER NOT NULL,
  document_number VARCHAR(100),
  action VARCHAR(50) NOT NULL,  -- created, updated, approved, rejected, posted, reversed, cancelled
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_data JSONB,
  new_data JSONB,
  reason TEXT,
  reason_ar TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_audit_document ON document_audit_trail(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_doc_audit_company ON document_audit_trail(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_audit_date ON document_audit_trail(performed_at);
CREATE INDEX IF NOT EXISTS idx_doc_audit_user ON document_audit_trail(performed_by);

-- =====================================================
-- 4. COMPANY SETTINGS (For Matching & Performance Config)
-- =====================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  description TEXT,
  description_ar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_unique 
  ON company_settings(company_id, config_key) WHERE deleted_at IS NULL;

-- Insert default matching config
INSERT INTO company_settings (company_id, config_key, config_value, description, description_ar)
SELECT 1, 'three_way_matching', 
  '{"price_tolerance_percent": 2, "qty_tolerance_percent": 5, "allow_over_receipt": false, "allow_over_invoice": false, "require_po_match": true, "require_gr_match": true}',
  'Three-way matching configuration',
  'إعدادات المطابقة الثلاثية'
WHERE NOT EXISTS (
  SELECT 1 FROM company_settings WHERE company_id = 1 AND config_key = 'three_way_matching'
);

-- Insert default score weights
INSERT INTO company_settings (company_id, config_key, config_value, description, description_ar)
SELECT 1, 'vendor_score_weights',
  '{"on_time_delivery": 30, "quality": 25, "price_accuracy": 25, "fulfillment": 20}',
  'Vendor performance score weights',
  'أوزان تقييم أداء الموردين'
WHERE NOT EXISTS (
  SELECT 1 FROM company_settings WHERE company_id = 1 AND config_key = 'vendor_score_weights'
);

-- =====================================================
-- 5. ENHANCED PERMISSIONS FOR PROCUREMENT
-- =====================================================

-- Add new permission actions
INSERT INTO permissions (permission_code, resource, action, description, name_ar)
VALUES
  -- Purchase Orders
  ('purchase_orders:approve', 'purchase_orders', 'approve', 'Approve purchase orders', 'اعتماد أوامر الشراء'),
  ('purchase_orders:post', 'purchase_orders', 'post', 'Post purchase orders', 'ترحيل أوامر الشراء'),
  ('purchase_orders:reverse', 'purchase_orders', 'reverse', 'Reverse posted purchase orders', 'عكس أوامر الشراء المرحلة'),
  ('purchase_orders:override_price', 'purchase_orders', 'override_price', 'Override item prices on PO', 'تجاوز أسعار الأصناف في أمر الشراء'),
  
  -- Purchase Invoices
  ('purchase_invoices:approve', 'purchase_invoices', 'approve', 'Approve purchase invoices', 'اعتماد فواتير المشتريات'),
  ('purchase_invoices:post', 'purchase_invoices', 'post', 'Post purchase invoices', 'ترحيل فواتير المشتريات'),
  ('purchase_invoices:reverse', 'purchase_invoices', 'reverse', 'Reverse posted purchase invoices', 'عكس فواتير المشتريات المرحلة'),
  ('purchase_invoices:override_matching', 'purchase_invoices', 'override_matching', 'Override 3-way matching warnings', 'تجاوز تحذيرات المطابقة الثلاثية'),
  
  -- Purchase Returns
  ('purchase_returns:approve', 'purchase_returns', 'approve', 'Approve purchase returns', 'اعتماد مرتجعات المشتريات'),
  ('purchase_returns:post', 'purchase_returns', 'post', 'Post purchase returns', 'ترحيل مرتجعات المشتريات'),
  ('purchase_returns:reverse', 'purchase_returns', 'reverse', 'Reverse posted purchase returns', 'عكس مرتجعات المشتريات المرحلة'),
  
  -- Goods Receipts
  ('goods_receipts:approve', 'goods_receipts', 'approve', 'Approve goods receipts', 'اعتماد سندات الاستلام'),
  ('goods_receipts:post', 'goods_receipts', 'post', 'Post goods receipts', 'ترحيل سندات الاستلام'),
  ('goods_receipts:reverse', 'goods_receipts', 'reverse', 'Reverse posted goods receipts', 'عكس سندات الاستلام المرحلة'),
  ('goods_receipts:override_qty', 'goods_receipts', 'override_qty', 'Override quantity limits on GR', 'تجاوز حدود الكمية في سند الاستلام'),
  
  -- Vendor Contracts
  ('vendor_contracts:approve', 'vendor_contracts', 'approve', 'Approve vendor contracts', 'اعتماد عقود الموردين'),
  ('vendor_contracts:terminate', 'vendor_contracts', 'terminate', 'Terminate vendor contracts', 'إنهاء عقود الموردين'),
  
  -- Vendor Quotations
  ('vendor_quotations:approve', 'vendor_quotations', 'approve', 'Approve vendor quotations', 'اعتماد عروض أسعار الموردين'),
  ('vendor_quotations:convert', 'vendor_quotations', 'convert', 'Convert quotation to PO', 'تحويل عرض السعر إلى أمر شراء'),
  
  -- Vendor Performance
  ('vendor_performance:view', 'vendor_performance', 'view', 'View vendor performance metrics', 'عرض مقاييس أداء الموردين'),
  ('vendor_performance:export', 'vendor_performance', 'export', 'Export vendor performance reports', 'تصدير تقارير أداء الموردين')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign new permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.resource IN ('purchase_orders', 'purchase_invoices', 'purchase_returns', 
                     'goods_receipts', 'vendor_contracts', 'vendor_quotations', 'vendor_performance')
  AND p.action IN ('approve', 'post', 'reverse', 'override_price', 'override_qty', 
                   'override_matching', 'terminate', 'convert', 'view', 'export')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. ADD STATUS TRACKING COLUMNS TO PROCUREMENT TABLES
-- =====================================================

-- Add is_posted, is_locked, posted_at columns if not exist
-- Each column checked individually to handle partial migrations

-- Purchase Orders columns
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Purchase Invoices columns
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Purchase Returns columns
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Goods Receipts columns
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Add FK columns separately (need DO block for reference constraints)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_orders' AND column_name = 'posted_by') THEN
    ALTER TABLE purchase_orders ADD COLUMN posted_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_orders' AND column_name = 'approved_by') THEN
    ALTER TABLE purchase_orders ADD COLUMN approved_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_orders' AND column_name = 'reversed_by') THEN
    ALTER TABLE purchase_orders ADD COLUMN reversed_by INTEGER REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_invoices' AND column_name = 'posted_by') THEN
    ALTER TABLE purchase_invoices ADD COLUMN posted_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_invoices' AND column_name = 'approved_by') THEN
    ALTER TABLE purchase_invoices ADD COLUMN approved_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_invoices' AND column_name = 'reversed_by') THEN
    ALTER TABLE purchase_invoices ADD COLUMN reversed_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_invoices' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE purchase_invoices ADD COLUMN journal_entry_id INTEGER REFERENCES journal_entries(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_returns' AND column_name = 'posted_by') THEN
    ALTER TABLE purchase_returns ADD COLUMN posted_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_returns' AND column_name = 'approved_by') THEN
    ALTER TABLE purchase_returns ADD COLUMN approved_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_returns' AND column_name = 'reversed_by') THEN
    ALTER TABLE purchase_returns ADD COLUMN reversed_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_returns' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE purchase_returns ADD COLUMN journal_entry_id INTEGER REFERENCES journal_entries(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'goods_receipts' AND column_name = 'posted_by') THEN
    ALTER TABLE goods_receipts ADD COLUMN posted_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'goods_receipts' AND column_name = 'approved_by') THEN
    ALTER TABLE goods_receipts ADD COLUMN approved_by INTEGER REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'goods_receipts' AND column_name = 'reversed_by') THEN
    ALTER TABLE goods_receipts ADD COLUMN reversed_by INTEGER REFERENCES users(id);
  END IF;
END $$;

-- =====================================================
-- 7. CREATE VIEW FOR DOCUMENT LIFECYCLE
-- =====================================================

CREATE OR REPLACE VIEW v_document_lifecycle AS
SELECT 
  dat.document_type,
  dat.document_id,
  dat.document_number,
  dat.company_id,
  -- Creation
  (SELECT performed_at FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'created' LIMIT 1) as created_at,
  (SELECT u.email FROM document_audit_trail d2 
   JOIN users u ON u.id = d2.performed_by
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'created' LIMIT 1) as created_by,
  -- Approval
  (SELECT performed_at FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'approved' ORDER BY performed_at DESC LIMIT 1) as approved_at,
  (SELECT u.email FROM document_audit_trail d2 
   JOIN users u ON u.id = d2.performed_by
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'approved' ORDER BY d2.performed_at DESC LIMIT 1) as approved_by,
  -- Posting
  (SELECT performed_at FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'posted' ORDER BY performed_at DESC LIMIT 1) as posted_at,
  (SELECT u.email FROM document_audit_trail d2 
   JOIN users u ON u.id = d2.performed_by
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'posted' ORDER BY d2.performed_at DESC LIMIT 1) as posted_by,
  -- Reversal
  (SELECT performed_at FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'reversed' ORDER BY performed_at DESC LIMIT 1) as reversed_at,
  (SELECT u.email FROM document_audit_trail d2 
   JOIN users u ON u.id = d2.performed_by
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'reversed' ORDER BY d2.performed_at DESC LIMIT 1) as reversed_by,
  (SELECT reason FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   AND d2.action = 'reversed' ORDER BY d2.performed_at DESC LIMIT 1) as reversal_reason,
  -- Latest status
  (SELECT new_status FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id 
   ORDER BY performed_at DESC LIMIT 1) as current_status,
  -- Count of changes
  (SELECT COUNT(*) FROM document_audit_trail d2 
   WHERE d2.document_type = dat.document_type AND d2.document_id = dat.document_id) as total_changes
FROM document_audit_trail dat
GROUP BY dat.document_type, dat.document_id, dat.document_number, dat.company_id;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Created/Updated Tables:
--   • journal_entries - Full accounting entries
--   • journal_entry_lines - Entry line details
--   • vendor_performance_history - Performance snapshots
--   • document_audit_trail - Enhanced document tracking
--   • company_settings - Configuration storage
-- 
-- Added Columns to:
--   • purchase_orders - posting, approval, reversal tracking
--   • purchase_invoices - posting, approval, reversal, journal link
--   • purchase_returns - posting, approval, reversal, journal link
--   • goods_receipts - posting, approval, reversal tracking
--
-- Added Permissions:
--   • approve, post, reverse for all procurement documents
--   • override_price, override_qty, override_matching
--   • vendor_performance:view, vendor_performance:export
-- =====================================================
