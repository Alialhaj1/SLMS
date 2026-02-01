-- Migration 075: Cash Boxes (master) + permissions + seed
-- Date: 2026-01-03
-- Purpose:
--  - Create company-scoped cash_boxes linked to Chart of Accounts via gl_account_id
--  - Seed finance:cash_boxes:* permissions and assign to default roles
--  - Seed a default cash box per company (linked to COA code 1111 if present)

BEGIN;

-- =====================================================
-- 1) Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_boxes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150),

  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  gl_account_id INTEGER NOT NULL REFERENCES accounts(id),

  opening_balance DECIMAL(18, 4) DEFAULT 0,
  current_balance DECIMAL(18, 4) DEFAULT 0,

  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Soft delete columns
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by INTEGER REFERENCES users(id),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cash_boxes_company ON cash_boxes(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_boxes_company_gl ON cash_boxes(company_id, gl_account_id);

-- =====================================================
-- 2) Permissions
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_permission') THEN
      PERFORM insert_permission('finance:cash_boxes:view',   'View Cash Boxes',   'عرض الصناديق',   'finance', 'cash_boxes', 'view');
      PERFORM insert_permission('finance:cash_boxes:create', 'Create Cash Box',   'إنشاء صندوق',    'finance', 'cash_boxes', 'create');
      PERFORM insert_permission('finance:cash_boxes:edit',   'Edit Cash Box',     'تعديل صندوق',    'finance', 'cash_boxes', 'edit');
      PERFORM insert_permission('finance:cash_boxes:delete', 'Delete Cash Box',   'حذف صندوق',      'finance', 'cash_boxes', 'delete', TRUE, TRUE);
    ELSE
      INSERT INTO permissions (permission_code, resource, action, description, module)
      VALUES
        ('finance:cash_boxes:view',   'finance:cash_boxes', 'view',   'View Cash Boxes', 'Finance'),
        ('finance:cash_boxes:create', 'finance:cash_boxes', 'create', 'Create Cash Box', 'Finance'),
        ('finance:cash_boxes:edit',   'finance:cash_boxes', 'edit',   'Edit Cash Box', 'Finance'),
        ('finance:cash_boxes:delete', 'finance:cash_boxes', 'delete', 'Delete Cash Box', 'Finance')
      ON CONFLICT (permission_code) DO NOTHING;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 3) Role grants (role_permissions)
-- =====================================================
WITH perms AS (
  SELECT id, permission_code
  FROM permissions
  WHERE permission_code IN (
    'finance:cash_boxes:view',
    'finance:cash_boxes:create',
    'finance:cash_boxes:edit',
    'finance:cash_boxes:delete'
  )
), grants AS (
  SELECT r.id AS role_id, p.id AS permission_id, p.permission_code
  FROM roles r
  JOIN perms p ON (
    (LOWER(r.name) IN ('admin', 'super_admin'))
    OR (LOWER(r.name) = 'accountant' AND p.permission_code IN (
      'finance:cash_boxes:view','finance:cash_boxes:create','finance:cash_boxes:edit'
    ))
    OR (LOWER(r.name) = 'viewer' AND p.permission_code IN (
      'finance:cash_boxes:view'
    ))
  )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT g.role_id, g.permission_id
FROM grants g
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = g.role_id AND rp.permission_id = g.permission_id
);

-- =====================================================
-- 4) Seed default cash box per company (linked to COA 1111)
-- =====================================================
WITH base_currency AS (
  SELECT
    c.id AS company_id,
    COALESCE(
      (
        SELECT id
        FROM currencies
        WHERE company_id = c.id AND deleted_at IS NULL AND is_base_currency = TRUE
        ORDER BY id ASC
        LIMIT 1
      ),
      (
        SELECT id
        FROM currencies
        WHERE company_id = c.id AND deleted_at IS NULL AND code = 'SAR'
        ORDER BY id ASC
        LIMIT 1
      ),
      (
        SELECT id
        FROM currencies
        WHERE company_id IS NULL AND deleted_at IS NULL AND code = 'SAR'
        ORDER BY id ASC
        LIMIT 1
      )
    ) AS currency_id
  FROM companies c
  WHERE c.deleted_at IS NULL
), gl AS (
  SELECT a.company_id, a.id AS gl_account_id
  FROM accounts a
  WHERE a.code = '1111' AND a.deleted_at IS NULL
)
INSERT INTO cash_boxes (
  company_id,
  code,
  name,
  name_ar,
  currency_id,
  gl_account_id,
  opening_balance,
  current_balance,
  is_default,
  is_active,
  is_deleted,
  deleted_at
)
SELECT
  bc.company_id,
  'CASH' AS code,
  'Main Cash' AS name,
  'الصندوق الرئيسي' AS name_ar,
  bc.currency_id,
  gl.gl_account_id,
  0::DECIMAL(18,4) AS opening_balance,
  0::DECIMAL(18,4) AS current_balance,
  TRUE AS is_default,
  TRUE AS is_active,
  FALSE AS is_deleted,
  NULL::TIMESTAMP WITH TIME ZONE AS deleted_at
FROM base_currency bc
JOIN gl ON gl.company_id = bc.company_id
WHERE bc.currency_id IS NOT NULL
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  currency_id = EXCLUDED.currency_id,
  gl_account_id = EXCLUDED.gl_account_id,
  is_default = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  deleted_at = NULL,
  updated_at = NOW();

COMMIT;
