-- Migration: 076_payment_vouchers.sql
-- Description: Add Payment Vouchers (real operational posting via journal engine)
-- Date: 2026-01-03

-- =====================================================
-- 1) Permissions (ensure view exists)
-- =====================================================
DO $$
BEGIN
  -- insert_permission function was created in 021_create_permission_system.sql
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_permission') THEN
    PERFORM insert_permission('purchases:payment:view', 'View Payment Vouchers', 'عرض سندات الصرف', 'purchases', 'payment', 'view');
  ELSE
    -- Fallback: direct insert if helper is missing
    INSERT INTO permissions (permission_code, resource, action, description, module)
    VALUES ('purchases:payment:view', 'purchases:payment', 'view', 'View Payment Vouchers', 'Purchases')
    ON CONFLICT (permission_code) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 2) Table
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),

  voucher_number VARCHAR(50) NOT NULL,
  voucher_date DATE NOT NULL,

  payee TEXT NOT NULL,
  payee_ar TEXT,

  method VARCHAR(20) NOT NULL, -- cash | bank_transfer | cheque

  cash_box_id INTEGER REFERENCES cash_boxes(id),
  bank_account_id INTEGER REFERENCES bank_accounts(id),

  expense_account_id INTEGER NOT NULL REFERENCES accounts(id),

  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  exchange_rate DECIMAL(18, 8) DEFAULT 1,

  amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
  reference VARCHAR(100),

  status document_status NOT NULL DEFAULT 'draft',
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE,

  posted_by INTEGER REFERENCES users(id),
  posted_at TIMESTAMP WITH TIME ZONE,

  voided_by INTEGER REFERENCES users(id),
  voided_at TIMESTAMP WITH TIME ZONE,

  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE (company_id, voucher_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_company_date ON payment_vouchers(company_id, voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_company_status ON payment_vouchers(company_id, status);

-- =====================================================
-- 3) Role grants (role_permissions)
-- =====================================================
WITH perms AS (
  SELECT id, permission_code
  FROM permissions
  WHERE permission_code IN (
    'purchases:payment:view',
    'purchases:payment:create',
    'purchases:payment:approve'
  )
), grants AS (
  SELECT r.id AS role_id, p.id AS permission_id, p.permission_code
  FROM roles r
  JOIN perms p ON (
    (LOWER(r.name) IN ('admin', 'super_admin'))
    OR (LOWER(r.name) = 'accountant' AND p.permission_code IN (
      'purchases:payment:view','purchases:payment:create','purchases:payment:approve'
    ))
    OR (LOWER(r.name) = 'viewer' AND p.permission_code IN (
      'purchases:payment:view'
    ))
  )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT g.role_id, g.permission_id
FROM grants g
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = g.role_id AND rp.permission_id = g.permission_id
);
