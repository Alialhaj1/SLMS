-- 055_payment_methods_api.sql
-- Enhance payment_methods schema to match frontend Payment Methods page

BEGIN;

-- Add missing columns used by UI
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS gl_account_code VARCHAR(50);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_reference BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_bank BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS processing_days INTEGER DEFAULT 0;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS transaction_fee_percent DECIMAL(8, 4);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS transaction_fee_fixed DECIMAL(18, 4);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Best-effort backfill / compatibility
UPDATE payment_methods
SET requires_bank = COALESCE(requires_bank, requires_bank_account, FALSE)
WHERE requires_bank IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_deleted_at ON payment_methods(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(company_id, is_default);

-- Permissions (master-data style)
-- Note: RBAC middleware checks permissions from JWT, but we still seed permissions table for admin assignment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    -- Create permission helper may exist; fall back to insert if needed.
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_permission') THEN
      PERFORM insert_permission('master:payment_methods:view', 'View Payment Methods', 'عرض طرق الدفع', 'master_data', 'payment_methods', 'view');
      PERFORM insert_permission('master:payment_methods:create', 'Create Payment Method', 'إنشاء طريقة دفع', 'master_data', 'payment_methods', 'create');
      PERFORM insert_permission('master:payment_methods:edit', 'Edit Payment Method', 'تعديل طريقة دفع', 'master_data', 'payment_methods', 'edit');
      PERFORM insert_permission('master:payment_methods:delete', 'Delete Payment Method', 'حذف طريقة دفع', 'master_data', 'payment_methods', 'delete');
    ELSE
      INSERT INTO permissions (permission_code, resource, action, description)
      VALUES
        ('master:payment_methods:view', 'payment_methods', 'view', 'View Payment Methods'),
        ('master:payment_methods:create', 'payment_methods', 'create', 'Create Payment Method'),
        ('master:payment_methods:edit', 'payment_methods', 'edit', 'Edit Payment Method'),
        ('master:payment_methods:delete', 'payment_methods', 'delete', 'Delete Payment Method')
      ON CONFLICT (permission_code) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
