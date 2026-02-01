-- Migration: 071_create_opening_balances_and_budgets.sql
-- Description: Opening balances + budgets tables and permissions
-- Date: 2026-01-01

-- =====================================================
-- OPENING BALANCES
-- =====================================================

CREATE TABLE IF NOT EXISTS opening_balance_batches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
    period_id INTEGER NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,

    batch_no VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    notes TEXT,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP,

    reversed_by INTEGER REFERENCES users(id),
    reversed_at TIMESTAMP,

    UNIQUE(company_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_opening_balance_batches_company_period
  ON opening_balance_batches(company_id, period_id);

CREATE TABLE IF NOT EXISTS opening_balance_lines (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES opening_balance_batches(id) ON DELETE CASCADE,

    line_no INTEGER NOT NULL DEFAULT 1,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,

    debit DECIMAL(18,4) NOT NULL DEFAULT 0,
    credit DECIMAL(18,4) NOT NULL DEFAULT 0,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_opening_balance_line_amounts CHECK (
      debit >= 0 AND credit >= 0 AND NOT (debit > 0 AND credit > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_opening_balance_lines_batch
  ON opening_balance_lines(batch_id);

-- =====================================================
-- BUDGETS
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),

    department VARCHAR(150),
    department_ar VARCHAR(150),

    category VARCHAR(20) NOT NULL CHECK (category IN ('revenue', 'expense', 'capital')),

    budgeted_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(18,4) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'closed')),

    start_date DATE,
    end_date DATE,

    notes TEXT,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_budgets_company_year ON budgets(company_id, fiscal_year_id);

-- =====================================================
-- PERMISSIONS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_permission') THEN
      -- Opening Balances
      PERFORM insert_permission('accounting:opening_balances:view',   'View Opening Balances',   'عرض الأرصدة الافتتاحية', 'accounting', 'opening_balances', 'view');
      PERFORM insert_permission('accounting:opening_balances:create', 'Create Opening Balances', 'إنشاء أرصدة افتتاحية',   'accounting', 'opening_balances', 'create');
      PERFORM insert_permission('accounting:opening_balances:edit',   'Edit Opening Balances',   'تعديل الأرصدة الافتتاحية','accounting', 'opening_balances', 'edit');
      PERFORM insert_permission('accounting:opening_balances:delete', 'Delete Opening Balances', 'حذف الأرصدة الافتتاحية',  'accounting', 'opening_balances', 'delete', TRUE, TRUE);
      PERFORM insert_permission('accounting:opening_balances:post',   'Post Opening Balances',   'ترحيل الأرصدة الافتتاحية', 'accounting', 'opening_balances', 'post', TRUE, TRUE);
      PERFORM insert_permission('accounting:opening_balances:reverse','Reverse Opening Balances','عكس الأرصدة الافتتاحية',   'accounting', 'opening_balances', 'reverse', TRUE, TRUE);

      -- Budgets
      PERFORM insert_permission('accounting:budgets:view',   'View Budgets',   'عرض الموازنات',   'accounting', 'budgets', 'view');
      PERFORM insert_permission('accounting:budgets:create', 'Create Budgets', 'إنشاء موازنات',   'accounting', 'budgets', 'create');
      PERFORM insert_permission('accounting:budgets:edit',   'Edit Budgets',   'تعديل الموازنات', 'accounting', 'budgets', 'edit');
      PERFORM insert_permission('accounting:budgets:delete', 'Delete Budgets', 'حذف الموازنات',   'accounting', 'budgets', 'delete', TRUE, TRUE);
    ELSE
      INSERT INTO permissions (permission_code, resource, action, description)
      VALUES
        ('accounting:opening_balances:view',    'opening_balances', 'view',   'View Opening Balances'),
        ('accounting:opening_balances:create',  'opening_balances', 'create', 'Create Opening Balances'),
        ('accounting:opening_balances:edit',    'opening_balances', 'edit',   'Edit Opening Balances'),
        ('accounting:opening_balances:delete',  'opening_balances', 'delete', 'Delete Opening Balances'),
        ('accounting:opening_balances:post',    'opening_balances', 'post',   'Post Opening Balances'),
        ('accounting:opening_balances:reverse', 'opening_balances', 'reverse','Reverse Opening Balances'),
        ('accounting:budgets:view',             'budgets',          'view',   'View Budgets'),
        ('accounting:budgets:create',           'budgets',          'create', 'Create Budgets'),
        ('accounting:budgets:edit',             'budgets',          'edit',   'Edit Budgets'),
        ('accounting:budgets:delete',           'budgets',          'delete', 'Delete Budgets')
      ON CONFLICT (permission_code) DO NOTHING;
    END IF;
  END IF;
END $$;
