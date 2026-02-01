-- Migration 077: Seed Cash Boxes + Bank GL accounts (per provided KSA COA codes)
-- Date: 2026-01-03
-- الهدف:
-- 1) إنشاء حسابات شجرة الحسابات للصناديق والبنوك حسب الأكواد المذكورة (111101..., 111201...)
-- 2) إنشاء/تحديث سجلات الصناديق cash_boxes وربطها فعلياً بـ accounts عبر gl_account_id
-- 3) (اختياري وآمن) إنشاء سجلات bank_accounts مرجعية مرتبطة بحسابات البنوك في الشجرة
--
-- ملاحظة: هذه الهجرة idempotent (تُشغَّل بأمان عدة مرات).

BEGIN;

-- =====================================================
-- 0) Ensure core bank masters exist (global)
-- =====================================================
INSERT INTO banks (code, swift_code, name, name_ar, is_active)
VALUES
  ('SNB',  'NCBKSAJE', 'Saudi National Bank',  'البنك الأهلي السعودي', TRUE),
  ('RJHI', 'RJHISARI', 'Al Rajhi Bank',       'مصرف الراجحي',         TRUE),
  ('INMA', 'INMASARI', 'Alinma Bank',         'مصرف الإنماء',         TRUE),
  ('BSF',  'BSFRSARI', 'Banque Saudi Fransi', 'البنك السعودي الفرنسي', TRUE),
  ('RIBL', 'RIBLSARI', 'Riyad Bank',          'بنك الرياض',           TRUE),
  ('BJAZ', NULL,       'Bank AlJazira',       'بنك الجزيرة',          TRUE)
ON CONFLICT (code) DO UPDATE SET
  swift_code = COALESCE(EXCLUDED.swift_code, banks.swift_code),
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  is_active = TRUE,
  updated_at = NOW();

-- =====================================================
-- 1) Seed COA accounts under existing company COA parents (1110/1112)
-- =====================================================
WITH cash_type AS (
  SELECT id AS account_type_id FROM account_types WHERE code = 'CASH' LIMIT 1
), companies_live AS (
  SELECT id AS company_id FROM companies WHERE deleted_at IS NULL
), parents AS (
  SELECT
    c.company_id,
    (SELECT id FROM accounts WHERE company_id = c.company_id AND code = '1110' AND deleted_at IS NULL LIMIT 1) AS cash_bank_root_id,
    (SELECT id FROM accounts WHERE company_id = c.company_id AND code = '1112' AND deleted_at IS NULL LIMIT 1) AS bank_root_id
  FROM companies_live c
), groups AS (
  SELECT * FROM (VALUES
    ('111101', 'Cash Boxes', 'الصناديق', 4),
    ('111102', 'Cash Float', 'عهدة صناديق (فكة)', 4)
  ) AS v(code, name, name_ar, level)
), banks_group AS (
  SELECT * FROM (VALUES
    ('111201', 'Banks', 'البنوك', 5)
  ) AS v(code, name, name_ar, level)
), upsert_groups AS (
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_active, is_system)
  SELECT
    p.company_id,
    p.cash_bank_root_id,
    g.code,
    g.name,
    g.name_ar,
    (SELECT account_type_id FROM cash_type),
    g.level,
    TRUE,
    FALSE,
    TRUE,
    FALSE
  FROM parents p
  JOIN groups g ON TRUE
  WHERE p.cash_bank_root_id IS NOT NULL
  ON CONFLICT (company_id, code) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    account_type_id = EXCLUDED.account_type_id,
    level = EXCLUDED.level,
    is_group = TRUE,
    allow_posting = FALSE,
    is_active = TRUE,
    deleted_at = NULL
  RETURNING company_id, id, code
), upsert_bank_group AS (
  INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_active, is_system)
  SELECT
    p.company_id,
    p.bank_root_id,
    bg.code,
    bg.name,
    bg.name_ar,
    (SELECT account_type_id FROM cash_type),
    bg.level,
    TRUE,
    FALSE,
    TRUE,
    FALSE
  FROM parents p
  JOIN banks_group bg ON TRUE
  WHERE p.bank_root_id IS NOT NULL
  ON CONFLICT (company_id, code) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    account_type_id = EXCLUDED.account_type_id,
    level = EXCLUDED.level,
    is_group = TRUE,
    allow_posting = FALSE,
    is_active = TRUE,
    deleted_at = NULL
  RETURNING company_id, id, code
), group_ids AS (
  SELECT company_id, id, code FROM upsert_groups
  UNION
  SELECT a.company_id, a.id, a.code
  FROM accounts a
  WHERE a.code IN ('111101','111102')
    AND a.deleted_at IS NULL
), bank_group_ids AS (
  SELECT company_id, id, code FROM upsert_bank_group
  UNION
  SELECT a.company_id, a.id, a.code
  FROM accounts a
  WHERE a.code = '111201'
    AND a.deleted_at IS NULL
), leaf_cash_accounts AS (
  SELECT * FROM (VALUES
    ('111101', '1111010001', 'Main Administration Cash Box', 'صندوق الادارة الرئيسي'),
    ('111101', '1111010002', 'Al Tameer Branch Cash Box', 'صندوق فرع التعمير'),
    ('111101', '1111010003', 'Al Deira Main Branch Cash Box', 'صندوق محل الديرة الفرع الرئيسي'),
    ('111101', '1111010004', 'POS Clearing Cash Box', 'صندوق وسيط نقاط البيع'),
    ('111101', '1111010006', 'Al Tameer Branch Cash Box 2', 'صندوق فرع التعمير 2'),
    ('111101', '1111010007', 'Ateeqah Branch Cash Box', 'صندوق فرع عتيقة'),
    ('111101', '1111010008', 'Rawdah Branch Cash Box', 'صندوق فرع الروضة'),
    ('111101', '1111010009', 'Umm Al Hammam Branch Cash Box', 'صندوق فرع ام الحمام'),
    ('111101', '1111010010', 'Shaqraa Branch Cash Box', 'صندوق فرع شقراء'),
    ('111101', '1111010011', 'Rawdah 2 - Salman Al Farisi Cash Box', 'صندوق الروضه 2 -سلمان الفارسي'),
    ('111101', '1111010012', 'Umm Al Hammam 2 - Al Arbaeen Cash Box', 'صندوق فرع ام الحمام 2 شارع الاربعين'),
    ('111101', '1111010013', 'Rabwa Branch Cash Box', 'صندوق فرع الربوة'),
    ('111101', '1111010014', 'Popular Village Branch Cash Box', 'صندوق فرع القرية الشعبية'),
    ('111101', '1111010017', 'Ateeqah 2 - New Cash Box', 'صندوق فرع عتيقة 2 الجديد'),
    ('111101', '1111010018', 'Al Tameer 3 - New Cash Box', 'صندوق فرع التعمير 3 الجديد'),
    ('111101', '1111010019', 'Yarmouk Branch Cash Box', 'صندوق فرع اليرموك'),
    ('111101', '1111010021', 'Al Salam Branch Cash Box', 'صندوق فرع السلام'),
    ('111101', '1111010022', 'Al Owais Branch Cash Box', 'صندوق فرع العويس'),
    ('111101', '1111010023', 'Hijab Markets - Al Naseem Cash Box', 'صندوق فرع اسواق حجاب- النسيم'),

    ('111102', '1111020001', 'Cash Float (Change)', 'عهده صناديق (فكة )')
  ) AS v(parent_code, code, name, name_ar)
), leaf_bank_accounts AS (
  SELECT * FROM (VALUES
    ('111201', '1112010001', 'Saudi National Bank', 'البنك الأهلي'),
    ('111201', '1112010002', 'Al Rajhi Bank', 'بنك الراجحي'),
    ('111201', '1112010003', 'Alinma Bank - Mawqif', 'بنك الانماء موقف'),
    ('111201', '1112010004', 'Alinma Bank - Dar Kholan', 'بنك الانماء -دار خولان'),
    ('111201', '1112010005', 'Saudi National Bank - Networks', 'البنك الاهلي -شبكات'),
    ('111201', '1112010006', 'Banque Saudi Fransi', 'البنك السعودي الفرنسي'),
    ('111201', '1112010007', 'Saudi National Bank - USD', 'البنك الاهلي -دولار$'),
    ('111201', '1112010008', 'Riyad Bank', 'بنك الرياض'),
    ('111201', '1112010009', 'Bank AlJazira', 'بنك الجزيرة'),
    ('111201', '1112010010', 'Alinma Bank - USD', 'بنك الانماء دولار')
  ) AS v(parent_code, code, name, name_ar)
)
INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, is_active, is_system)
SELECT
  gid.company_id,
  gid.id AS parent_id,
  l.code,
  l.name,
  l.name_ar,
  (SELECT account_type_id FROM cash_type),
  CASE WHEN l.code LIKE '111201%' THEN 6 ELSE 5 END AS level,
  FALSE,
  TRUE,
  TRUE,
  FALSE
FROM group_ids gid
JOIN leaf_cash_accounts l ON l.parent_code = gid.code

UNION ALL

SELECT
  bgid.company_id,
  bgid.id AS parent_id,
  l.code,
  l.name,
  l.name_ar,
  (SELECT account_type_id FROM cash_type),
  6 AS level,
  FALSE,
  TRUE,
  TRUE,
  FALSE
FROM bank_group_ids bgid
JOIN leaf_bank_accounts l ON l.parent_code = bgid.code

ON CONFLICT (company_id, code) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  account_type_id = EXCLUDED.account_type_id,
  level = EXCLUDED.level,
  is_group = FALSE,
  allow_posting = TRUE,
  is_active = TRUE,
  deleted_at = NULL;

-- =====================================================
-- 2) Seed cash_boxes mapped to the leaf cash accounts
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
), cash_targets AS (
  SELECT * FROM (VALUES
    ('1111010001', 'Main Administration Cash Box', 'صندوق الادارة الرئيسي', TRUE),
    ('1111010002', 'Al Tameer Branch Cash Box', 'صندوق فرع التعمير', FALSE),
    ('1111010003', 'Al Deira Main Branch Cash Box', 'صندوق محل الديرة الفرع الرئيسي', FALSE),
    ('1111010004', 'POS Clearing Cash Box', 'صندوق وسيط نقاط البيع', FALSE),
    ('1111010006', 'Al Tameer Branch Cash Box 2', 'صندوق فرع التعمير 2', FALSE),
    ('1111010007', 'Ateeqah Branch Cash Box', 'صندوق فرع عتيقة', FALSE),
    ('1111010008', 'Rawdah Branch Cash Box', 'صندوق فرع الروضة', FALSE),
    ('1111010009', 'Umm Al Hammam Branch Cash Box', 'صندوق فرع ام الحمام', FALSE),
    ('1111010010', 'Shaqraa Branch Cash Box', 'صندوق فرع شقراء', FALSE),
    ('1111010011', 'Rawdah 2 - Salman Al Farisi Cash Box', 'صندوق الروضه 2 -سلمان الفارسي', FALSE),
    ('1111010012', 'Umm Al Hammam 2 - Al Arbaeen Cash Box', 'صندوق فرع ام الحمام 2 شارع الاربعين', FALSE),
    ('1111010013', 'Rabwa Branch Cash Box', 'صندوق فرع الربوة', FALSE),
    ('1111010014', 'Popular Village Branch Cash Box', 'صندوق فرع القرية الشعبية', FALSE),
    ('1111010017', 'Ateeqah 2 - New Cash Box', 'صندوق فرع عتيقة 2 الجديد', FALSE),
    ('1111010018', 'Al Tameer 3 - New Cash Box', 'صندوق فرع التعمير 3 الجديد', FALSE),
    ('1111010019', 'Yarmouk Branch Cash Box', 'صندوق فرع اليرموك', FALSE),
    ('1111010021', 'Al Salam Branch Cash Box', 'صندوق فرع السلام', FALSE),
    ('1111010022', 'Al Owais Branch Cash Box', 'صندوق فرع العويس', FALSE),
    ('1111010023', 'Hijab Markets - Al Naseem Cash Box', 'صندوق فرع اسواق حجاب- النسيم', FALSE),
    ('1111020001', 'Cash Float (Change)', 'عهده صناديق (فكة )', FALSE)
  ) AS v(gl_code, name, name_ar, is_default)
), linked AS (
  SELECT
    bc.company_id,
    t.gl_code,
    t.name,
    t.name_ar,
    t.is_default,
    bc.currency_id,
    a.id AS gl_account_id
  FROM base_currency bc
  JOIN cash_targets t ON TRUE
  JOIN accounts a
    ON a.company_id = bc.company_id
   AND a.code = t.gl_code
   AND a.deleted_at IS NULL
  WHERE bc.currency_id IS NOT NULL
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
  l.company_id,
  l.gl_code AS code,
  l.name,
  l.name_ar,
  l.currency_id,
  l.gl_account_id,
  0::DECIMAL(18,4),
  0::DECIMAL(18,4),
  l.is_default,
  TRUE,
  FALSE,
  NULL::TIMESTAMP WITH TIME ZONE
FROM linked l
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  currency_id = EXCLUDED.currency_id,
  gl_account_id = EXCLUDED.gl_account_id,
  is_active = TRUE,
  is_deleted = FALSE,
  deleted_at = NULL,
  updated_at = NOW();

-- Ensure only one default cash box per company (prefer 1111010001)
WITH preferred AS (
  SELECT company_id, id,
         CASE WHEN code = '1111010001' THEN 0 ELSE 1 END AS sort_key
  FROM cash_boxes
  WHERE deleted_at IS NULL
), pick AS (
  SELECT company_id, id
  FROM (
    SELECT company_id, id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY sort_key ASC, id ASC) AS rn
    FROM preferred
  ) x
  WHERE rn = 1
)
UPDATE cash_boxes cb
SET is_default = (cb.id IN (SELECT id FROM pick WHERE pick.company_id = cb.company_id)),
    updated_at = NOW()
WHERE cb.deleted_at IS NULL;

-- =====================================================
-- 3) (Optional) Seed bank_accounts mapped to the leaf bank GL accounts
-- =====================================================
WITH companies_live AS (
  SELECT id AS company_id FROM companies WHERE deleted_at IS NULL
), bank_targets AS (
  SELECT * FROM (VALUES
    ('1112010001', 'SNB',  'Saudi National Bank',        'البنك الأهلي'),
    ('1112010002', 'RJHI', 'Al Rajhi Bank',             'بنك الراجحي'),
    ('1112010003', 'INMA', 'Alinma Bank - Mawqif',      'بنك الانماء موقف'),
    ('1112010004', 'INMA', 'Alinma Bank - Dar Kholan',  'بنك الانماء -دار خولان'),
    ('1112010005', 'SNB',  'Saudi National Bank - Networks', 'البنك الاهلي -شبكات'),
    ('1112010006', 'BSF',  'Banque Saudi Fransi',       'البنك السعودي الفرنسي'),
    ('1112010007', 'SNB',  'Saudi National Bank - USD', 'البنك الاهلي -دولار$'),
    ('1112010008', 'RIBL', 'Riyad Bank',                'بنك الرياض'),
    ('1112010009', 'BJAZ', 'Bank AlJazira',             'بنك الجزيرة'),
    ('1112010010', 'INMA', 'Alinma Bank - USD',         'بنك الانماء دولار')
  ) AS v(gl_code, bank_code, account_name, account_name_ar)
), currency_pick AS (
  SELECT
    c.company_id,
    COALESCE(
      (
        SELECT id
        FROM currencies
        WHERE company_id = c.company_id AND deleted_at IS NULL AND code = 'SAR'
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
    ) AS sar_currency_id,
    COALESCE(
      (
        SELECT id
        FROM currencies
        WHERE company_id = c.company_id AND deleted_at IS NULL AND code = 'USD'
        ORDER BY id ASC
        LIMIT 1
      ),
      (
        SELECT id
        FROM currencies
        WHERE company_id IS NULL AND deleted_at IS NULL AND code = 'USD'
        ORDER BY id ASC
        LIMIT 1
      )
    ) AS usd_currency_id
  FROM companies_live c
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
  is_active
)
SELECT
  cp.company_id,
  b.id AS bank_id,
  NULL AS branch_id,
  t.gl_code AS account_number,
  NULL AS iban,
  t.account_name,
  COALESCE(
    CASE WHEN (t.account_name_ar ILIKE '%دولار%' OR t.account_name_ar ILIKE '%$%') THEN cp.usd_currency_id END,
    cp.sar_currency_id
  ) AS currency_id,
  'current' AS account_type,
  a.id AS gl_account_id,
  0::DECIMAL(18,4),
  0::DECIMAL(18,4),
  (t.gl_code = '1112010002') AS is_default,
  TRUE
FROM currency_pick cp
JOIN bank_targets t ON TRUE
JOIN banks b ON b.code = t.bank_code
JOIN accounts a ON a.company_id = cp.company_id AND a.code = t.gl_code AND a.deleted_at IS NULL
WHERE COALESCE(
    CASE WHEN (t.account_name_ar ILIKE '%دولار%' OR t.account_name_ar ILIKE '%$%') THEN cp.usd_currency_id END,
    cp.sar_currency_id
  ) IS NOT NULL
ON CONFLICT (company_id, bank_id, account_number) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  currency_id = EXCLUDED.currency_id,
  gl_account_id = EXCLUDED.gl_account_id,
  is_active = TRUE,
  updated_at = NOW();

COMMIT;
