-- Migration 074: Cash & Banks - permissions + seed banks/bank accounts/cheque books + opening balances
-- Date: 2026-01-03
-- Purpose:
--  - Add missing master:banks:* permissions (used by frontend menu)
--  - Assign cash/banks permissions to default roles
--  - Seed realistic KSA banks, linked bank accounts (to COA), cheque books
--  - Seed a balanced opening balance batch for cash/bank accounts

BEGIN;

-- =====================================================
-- 1) Permissions (best-effort; safe if insert_permission exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_permission') THEN
      PERFORM insert_permission('master:banks:view',   'View Banks',   'عرض البنوك',   'master_data', 'banks', 'view');
      PERFORM insert_permission('master:banks:create', 'Create Bank',  'إنشاء بنك',    'master_data', 'banks', 'create');
      PERFORM insert_permission('master:banks:edit',   'Edit Bank',    'تعديل بنك',    'master_data', 'banks', 'edit');
      PERFORM insert_permission('master:banks:delete', 'Delete Bank',  'حذف بنك',      'master_data', 'banks', 'delete', TRUE, TRUE);
    ELSE
      INSERT INTO permissions (permission_code, resource, action, description, module)
      VALUES
        ('master:banks:view',   'banks', 'view',   'View Banks',  'Master'),
        ('master:banks:create', 'banks', 'create', 'Create Bank', 'Master'),
        ('master:banks:edit',   'banks', 'edit',   'Edit Bank',   'Master'),
        ('master:banks:delete', 'banks', 'delete', 'Delete Bank', 'Master')
      ON CONFLICT (permission_code) DO NOTHING;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2) Role grants (role_permissions)
-- =====================================================
WITH perms AS (
  SELECT id, permission_code
  FROM permissions
  WHERE permission_code IN (
    'master:banks:view',
    'master:banks:create',
    'master:banks:edit',
    'master:banks:delete',
    'finance:bank_accounts:view',
    'finance:bank_accounts:create',
    'finance:bank_accounts:edit',
    'finance:bank_accounts:delete',
    'finance:cheque_books:view',
    'finance:cheque_books:create',
    'finance:cheque_books:edit',
    'finance:cheque_books:delete'
  )
), grants AS (
  SELECT r.id AS role_id, p.id AS permission_id, p.permission_code
  FROM roles r
  JOIN perms p ON (
    (LOWER(r.name) IN ('admin', 'super_admin'))
    OR (LOWER(r.name) = 'accountant' AND p.permission_code IN (
      'master:banks:view','master:banks:create','master:banks:edit',
      'finance:bank_accounts:view','finance:bank_accounts:create','finance:bank_accounts:edit',
      'finance:cheque_books:view','finance:cheque_books:create','finance:cheque_books:edit'
    ))
    OR (LOWER(r.name) = 'viewer' AND p.permission_code IN (
      'master:banks:view','finance:bank_accounts:view','finance:cheque_books:view'
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
-- 3) Seed banks (global)
-- =====================================================
WITH sa AS (
  SELECT id AS country_id
  FROM countries
  WHERE code = 'SA' AND deleted_at IS NULL
  LIMIT 1
), banks_seed AS (
  SELECT * FROM (VALUES
    ('SNB',  'NCBKSAJE', 'Saudi National Bank',         'البنك الأهلي السعودي'),
    ('RJHI', 'RJHISARI', 'Al Rajhi Bank',              'مصرف الراجحي'),
    ('RIBL', 'RIBLSARI', 'Riyad Bank',                 'بنك الرياض'),
    ('SABB', 'SABBSARI', 'SABB',                       'ساب'),
    ('INMA', 'INMASARI', 'Alinma Bank',                'مصرف الإنماء'),
    ('BSF',  'BSFRSARI', 'Banque Saudi Fransi',        'البنك السعودي الفرنسي'),
    ('ANB',  'ARNBSARI', 'Arab National Bank',         'البنك العربي الوطني')
  ) AS v(code, swift_code, name, name_ar)
)
INSERT INTO banks (country_id, code, swift_code, name, name_ar, is_active, is_deleted, deleted_at)
SELECT (SELECT country_id FROM sa), s.code, s.swift_code, s.name, s.name_ar, TRUE, FALSE, NULL
FROM banks_seed s
ON CONFLICT (code) DO UPDATE SET
  swift_code = EXCLUDED.swift_code,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  country_id = COALESCE(EXCLUDED.country_id, banks.country_id),
  is_active = TRUE,
  is_deleted = FALSE,
  deleted_at = NULL,
  updated_at = NOW();

-- =====================================================
-- 4) Seed bank accounts per company (only if COA codes exist)
-- =====================================================
WITH targets AS (
  SELECT * FROM (VALUES
    ('RJHI', '1112010002', '4500123456789', 'SA0380000000004500123456789', 'Operating Account - Al Rajhi', 'الحساب التشغيلي - الراجحي', 1250000.0000::DECIMAL(18,4), TRUE),
    ('SNB',  '1112010001', '6800987654321', 'SA0310000000006800987654321', 'Operating Account - SNB',     'الحساب التشغيلي - الأهلي',   850000.0000::DECIMAL(18,4), FALSE),
    ('RIBL', '1112010008', '3300112233445', 'SA0220000000003300112233445', 'Reserve Account - Riyad',     'حساب احتياطي - الرياض',       125000.0000::DECIMAL(18,4), FALSE)
  ) AS v(bank_code, gl_account_code, account_number, iban, account_name, account_name_ar, opening_balance, is_default)
), sar AS (
  SELECT id AS currency_id FROM currencies WHERE code = 'SAR' AND deleted_at IS NULL LIMIT 1
)
INSERT INTO bank_accounts (
  company_id,
  bank_id,
  branch_id,
  account_number,
  iban,
  account_name,
  currency_id,
  account_type,
  gl_account_id,
  opening_balance,
  current_balance,
  is_default,
  is_active,
  is_deleted,
  deleted_at
)
SELECT
  c.id AS company_id,
  b.id AS bank_id,
  NULL AS branch_id,
  t.account_number,
  t.iban,
  t.account_name,
  (SELECT currency_id FROM sar) AS currency_id,
  'current' AS account_type,
  a.id AS gl_account_id,
  t.opening_balance,
  t.opening_balance,
  t.is_default,
  TRUE,
  FALSE,
  NULL
FROM companies c
JOIN targets t ON TRUE
JOIN banks b ON b.code = t.bank_code AND b.deleted_at IS NULL
JOIN accounts a ON a.company_id = c.id AND a.code = t.gl_account_code AND a.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM bank_accounts ba
  WHERE ba.company_id = c.id
    AND ba.bank_id = b.id
    AND ba.account_number = t.account_number
    AND ba.deleted_at IS NULL
);

-- Ensure only one default per company among non-deleted bank accounts
WITH ranked AS (
  SELECT
    id,
    company_id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY is_default DESC, id ASC) AS rn
  FROM bank_accounts
  WHERE deleted_at IS NULL
)
UPDATE bank_accounts ba
SET is_default = (ranked.rn = 1), updated_at = NOW()
FROM ranked
WHERE ba.id = ranked.id;

-- =====================================================
-- 5) Seed cheque books for seeded bank accounts
-- =====================================================
WITH ba_targets AS (
  SELECT ba.id AS bank_account_id, ba.company_id, b.code AS bank_code
  FROM bank_accounts ba
  JOIN banks b ON b.id = ba.bank_id
  WHERE ba.deleted_at IS NULL
    AND b.deleted_at IS NULL
    AND b.code IN ('RJHI','SNB','RIBL')
)
INSERT INTO cheque_books (
  company_id,
  bank_account_id,
  code,
  series_name,
  cheque_prefix,
  start_number,
  end_number,
  current_number,
  used_leaves,
  cancelled_leaves,
  issue_date,
  expiry_date,
  status,
  is_default,
  notes,
  created_at,
  updated_at,
  is_deleted,
  deleted_at
)
SELECT
  t.company_id,
  t.bank_account_id,
  ('CHQ-' || t.bank_code || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT) AS code,
  ('Main Series ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT) AS series_name,
  t.bank_code AS cheque_prefix,
  100001,
  100050,
  100001,
  0,
  0,
  DATE_TRUNC('year', CURRENT_DATE)::DATE AS issue_date,
  (DATE_TRUNC('year', CURRENT_DATE)::DATE + INTERVAL '1 year' - INTERVAL '1 day')::DATE AS expiry_date,
  'active',
  (t.bank_code = 'RJHI') AS is_default,
  'Seeded cheque book for demo/testing',
  NOW(),
  NOW(),
  FALSE,
  NULL
FROM ba_targets t
WHERE NOT EXISTS (
  SELECT 1 FROM cheque_books cb
  WHERE cb.company_id = t.company_id
    AND cb.code = ('CHQ-' || t.bank_code || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT)
    AND cb.deleted_at IS NULL
);

-- =====================================================
-- 6) Seed opening balances batch + lines (balanced)
-- =====================================================
-- Create fiscal year + January period if missing
WITH yr AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INT AS year
), fy_ins AS (
  INSERT INTO fiscal_years (company_id, year, name, start_date, end_date)
  SELECT c.id, (SELECT year FROM yr), (SELECT year FROM yr)::TEXT,
         MAKE_DATE((SELECT year FROM yr), 1, 1),
         MAKE_DATE((SELECT year FROM yr), 12, 31)
  FROM companies c
  WHERE NOT EXISTS (
    SELECT 1 FROM fiscal_years fy WHERE fy.company_id = c.id AND fy.year = (SELECT year FROM yr)
  )
  RETURNING id, company_id
), fy AS (
  SELECT id, company_id FROM fy_ins
  UNION ALL
  SELECT fy.id, fy.company_id
  FROM fiscal_years fy
  WHERE fy.year = (SELECT year FROM yr)
), ap_ins AS (
  INSERT INTO accounting_periods (company_id, fiscal_year_id, year, month, period_name, start_date, end_date, status)
  SELECT f.company_id, f.id, (SELECT year FROM yr), 1,
         'January ' || (SELECT year FROM yr)::TEXT,
         MAKE_DATE((SELECT year FROM yr), 1, 1),
         (MAKE_DATE((SELECT year FROM yr), 2, 1) - INTERVAL '1 day')::DATE,
         'open'
  FROM fy f
  WHERE NOT EXISTS (
    SELECT 1 FROM accounting_periods ap
    WHERE ap.company_id = f.company_id AND ap.year = (SELECT year FROM yr) AND ap.month = 1
  )
  RETURNING id, company_id
), ap AS (
  SELECT id, company_id FROM ap_ins
  UNION ALL
  SELECT ap.id, ap.company_id
  FROM accounting_periods ap
  WHERE ap.year = (SELECT year FROM yr) AND ap.month = 1
), batches AS (
  INSERT INTO opening_balance_batches (
    company_id,
    fiscal_year_id,
    period_id,
    batch_no,
    status,
    notes,
    created_at,
    posted_at
  )
  SELECT
    f.company_id,
    f.id,
    ap.id,
    'OB-' || (SELECT year FROM yr)::TEXT || '-INIT',
    'posted',
    'Seeded opening balances for Cash & Banks',
    NOW(),
    NOW()
  FROM fy f
  JOIN ap ON ap.company_id = f.company_id
  WHERE NOT EXISTS (
    SELECT 1 FROM opening_balance_batches ob
    WHERE ob.company_id = f.company_id
      AND ob.batch_no = 'OB-' || (SELECT year FROM yr)::TEXT || '-INIT'
  )
  RETURNING id, company_id
), ob AS (
  SELECT id, company_id FROM batches
  UNION ALL
  SELECT id, company_id
  FROM opening_balance_batches
  WHERE batch_no = 'OB-' || (SELECT year FROM yr)::TEXT || '-INIT'
), sar2 AS (
  SELECT id AS currency_id FROM currencies WHERE code = 'SAR' AND deleted_at IS NULL LIMIT 1
), ba_lines AS (
  SELECT
    ba.company_id,
    ba.gl_account_id AS account_id,
    ba.opening_balance::DECIMAL(18,4) AS debit
  FROM bank_accounts ba
  WHERE ba.deleted_at IS NULL
    AND ba.gl_account_id IS NOT NULL
    AND ba.opening_balance IS NOT NULL
    AND ba.opening_balance <> 0
), totals AS (
  SELECT company_id, SUM(debit) AS total_debit
  FROM ba_lines
  GROUP BY company_id
)
INSERT INTO opening_balance_lines (
  company_id,
  batch_id,
  line_no,
  account_id,
  currency_id,
  debit,
  credit,
  description,
  created_at
)
SELECT
  l.company_id,
  ob.id AS batch_id,
  ROW_NUMBER() OVER (PARTITION BY l.company_id ORDER BY l.account_id) AS line_no,
  l.account_id,
  (SELECT currency_id FROM sar2) AS currency_id,
  l.debit,
  0,
  'Seeded opening bank balance',
  NOW()
FROM ba_lines l
JOIN ob ON ob.company_id = l.company_id
WHERE NOT EXISTS (
  SELECT 1 FROM opening_balance_lines obl
  WHERE obl.batch_id = ob.id AND obl.account_id = l.account_id
);

-- Balancing credit to Retained Earnings (3200)
WITH yr AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INT AS year
), ob AS (
  SELECT id, company_id
  FROM opening_balance_batches
  WHERE batch_no = 'OB-' || (SELECT year FROM yr)::TEXT || '-INIT'
), sar2 AS (
  SELECT id AS currency_id FROM currencies WHERE code = 'SAR' AND deleted_at IS NULL LIMIT 1
), totals AS (
  SELECT company_id, SUM(opening_balance)::DECIMAL(18,4) AS total_debit
  FROM bank_accounts
  WHERE deleted_at IS NULL AND opening_balance IS NOT NULL AND opening_balance <> 0
  GROUP BY company_id
), re AS (
  SELECT a.company_id, a.id AS account_id
  FROM accounts a
  WHERE a.code = '3200' AND a.deleted_at IS NULL
)
INSERT INTO opening_balance_lines (
  company_id,
  batch_id,
  line_no,
  account_id,
  currency_id,
  debit,
  credit,
  description,
  created_at
)
SELECT
  ob.company_id,
  ob.id AS batch_id,
  9999 AS line_no,
  re.account_id,
  (SELECT currency_id FROM sar2) AS currency_id,
  0,
  t.total_debit,
  'Balancing entry (Retained Earnings)',
  NOW()
FROM ob
JOIN totals t ON t.company_id = ob.company_id
JOIN re ON re.company_id = ob.company_id
WHERE t.total_debit <> 0
  AND NOT EXISTS (
    SELECT 1 FROM opening_balance_lines obl
    WHERE obl.batch_id = ob.id AND obl.account_id = re.account_id
  );

COMMIT;
