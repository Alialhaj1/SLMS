-- 085_seed_warehouse_types_and_accounts.sql
-- Seeds warehouse types (company-scoped) and links them to inventory GL accounts.
-- Goal: provide sensible defaults for local warehouses, external warehouses, branches/shops, cold storage, transit, quarantine.

BEGIN;

-- 1) Add GL account linkage to warehouse_types
ALTER TABLE warehouse_types
  ADD COLUMN IF NOT EXISTS gl_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_types_gl_account_id
  ON warehouse_types(gl_account_id);

-- 2) Ensure per-warehouse-type inventory accounts exist under Inventory (1300)
-- Note: 1305 (Goods in Transit) is seeded by COA and used for Transit type.
DO $$
DECLARE
  v_type_inventory INT;
BEGIN
  SELECT id INTO v_type_inventory FROM account_types WHERE code = 'INVENTORY';
  IF v_type_inventory IS NULL THEN
    RAISE NOTICE 'account_types.INVENTORY not found; skipping warehouse inventory account seeding';
    RETURN;
  END IF;

  -- Main warehouse inventory
  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active)
  SELECT c.id, inv.id, v_type_inventory, '1310', 'Inventory - Main Warehouse', 'مخزون - مستودع رئيسي', 4, false, true, true
  FROM companies c
  JOIN accounts inv ON inv.company_id = c.id AND inv.code = '1300' AND inv.deleted_at IS NULL
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Branch / shop inventory
  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active)
  SELECT c.id, inv.id, v_type_inventory, '1311', 'Inventory - Branches / Shops', 'مخزون - فروع / محلات', 4, false, true, true
  FROM companies c
  JOIN accounts inv ON inv.company_id = c.id AND inv.code = '1300' AND inv.deleted_at IS NULL
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Cold storage (fridge)
  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active)
  SELECT c.id, inv.id, v_type_inventory, '1312', 'Inventory - Cold Storage', 'مخزون - ثلاجات / تبريد', 4, false, true, true
  FROM companies c
  JOIN accounts inv ON inv.company_id = c.id AND inv.code = '1300' AND inv.deleted_at IS NULL
  ON CONFLICT (company_id, code) DO NOTHING;

  -- External warehouse / 3PL
  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active)
  SELECT c.id, inv.id, v_type_inventory, '1313', 'Inventory - External Warehouse', 'مخزون - مستودع خارجي', 4, false, true, true
  FROM companies c
  JOIN accounts inv ON inv.company_id = c.id AND inv.code = '1300' AND inv.deleted_at IS NULL
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Quarantine warehouse
  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active)
  SELECT c.id, inv.id, v_type_inventory, '1314', 'Inventory - Quarantine', 'مخزون - حجر', 4, false, true, true
  FROM companies c
  JOIN accounts inv ON inv.company_id = c.id AND inv.code = '1300' AND inv.deleted_at IS NULL
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;

-- 3) Seed warehouse types per company (idempotent)
INSERT INTO warehouse_types (
  company_id,
  code,
  name,
  name_ar,
  warehouse_category,
  parent_id,
  allows_sales,
  allows_purchases,
  allows_transfers,
  is_default,
  is_active,
  description
)
SELECT
  c.id,
  t.code,
  t.name,
  t.name_ar,
  t.warehouse_category,
  NULL::int,
  t.allows_sales,
  t.allows_purchases,
  t.allows_transfers,
  t.is_default,
  true,
  t.description
FROM companies c
CROSS JOIN (
  VALUES
    ('WT-MAIN-LOCAL', 'Main Warehouse (Local)', 'مستودع رئيسي (محلي)', 'main', true,  true,  true,  true,  'Primary local storage warehouse for normal operations'),
    ('WT-BRANCH',     'Branch / Shop',         'فرع / محل',           'sub',  true,  true,  true,  false, 'Branch store treated as a warehouse location'),
    ('WT-COLD',       'Cold Storage (Fridge)', 'ثلاجات / تبريد',      'sub',  false, true,  true,  false, 'Cold storage / chilled inventory'),
    ('WT-EXT-3PL',    'External Warehouse',    'مستودع خارجي',        'external', false, true,  true,  false, 'Third-party / external warehouse'),
    ('WT-TRANSIT',    'Transit Warehouse',     'مستودع عبور',         'transit', false, false, true,  false, 'Goods in transit / on the way'),
    ('WT-QUAR',       'Quarantine Warehouse',  'مستودع حجر',          'quarantine', false, false, false, false, 'Quality hold / quarantine inventory')
) AS t(code, name, name_ar, warehouse_category, allows_sales, allows_purchases, allows_transfers, is_default, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM warehouse_types wt
  WHERE wt.company_id = c.id
    AND wt.code = t.code
    AND wt.deleted_at IS NULL
);

-- 4) Link seeded types to accounts
UPDATE warehouse_types wt
SET gl_account_id = a.id
FROM accounts a
WHERE wt.deleted_at IS NULL
  AND a.deleted_at IS NULL
  AND a.company_id = wt.company_id
  AND (
    (wt.code = 'WT-MAIN-LOCAL' AND a.code = '1310')
    OR (wt.code = 'WT-BRANCH' AND a.code = '1311')
    OR (wt.code = 'WT-COLD' AND a.code = '1312')
    OR (wt.code = 'WT-EXT-3PL' AND a.code = '1313')
    OR (wt.code = 'WT-TRANSIT' AND a.code = '1305')
    OR (wt.code = 'WT-QUAR' AND a.code = '1314')
  );

COMMIT;
