-- =====================================================
-- تحديث صلاحيات الأدوار المتخصصة
-- Update specialized role permissions
-- =====================================================

DO $$
DECLARE
  logistics_role_id INTEGER;
  warehouse_role_id INTEGER;
  accountant_role_id INTEGER;
  manager_role_id INTEGER;
  perm_id INTEGER;
BEGIN
  SELECT id INTO logistics_role_id FROM roles WHERE name = 'Logistics' LIMIT 1;
  SELECT id INTO warehouse_role_id FROM roles WHERE name = 'Warehouse' LIMIT 1;
  SELECT id INTO accountant_role_id FROM roles WHERE name = 'Accountant' LIMIT 1;
  SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' LIMIT 1;

  -- ═══════════════════════════════════════════════════════════
  -- Logistics Role - صلاحيات اللوجستيات
  -- ═══════════════════════════════════════════════════════════
  IF logistics_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        -- Dashboard
        'dashboard:view',
        'dashboard:statistics:view',
        -- Shipments
        'shipments:view', 'shipments:create', 'shipments:edit',
        'logistics:view',
        'logistics:shipments:view', 'logistics:shipments:create', 'logistics:shipments:edit',
        'logistics:shipment:view', 'logistics:shipment:create', 'logistics:shipment:edit', 'logistics:shipment:track', 'logistics:shipment:update_status',
        'logistics:shipment_types:view',
        'logistics:shipping_lines:view',
        'logistics:ports:view',
        'logistics:shipment_lifecycle_statuses:view',
        'logistics:shipment_stages:view',
        'logistics:shipment_events:view',
        'logistics:shipment_milestones:view',
        'logistics:shipment_alerts:view',
        'logistics:shipment_receiving:view', 'logistics:shipment_receiving:receive',
        'logistics:container:manage',
        'logistics:tracking:manage',
        -- Customs
        'logistics:customs:view', 'logistics:customs:create', 'logistics:customs:edit',
        'customs_declarations:view', 'customs_declarations:create', 'customs_declarations:update',
        -- Vendors/Suppliers view
        'vendors:view', 'vendors:profile:view',
        'suppliers:view',
        -- Ports & Countries
        'ports:view',
        'master:countries:view',
        'master:ports:manage',
        -- Reports
        'reports:shipment_costs:view',
        'reports:shipment_delays:view',
        'reports:shipment_profitability:view'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (logistics_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
    RAISE NOTICE 'Added permissions for Logistics role';
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- Warehouse Role - صلاحيات المستودعات
  -- ═══════════════════════════════════════════════════════════
  IF warehouse_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        -- Dashboard
        'dashboard:view',
        'dashboard:statistics:view',
        -- Warehouses
        'warehouses:view',
        'inventory:view',
        'inventory:balances:view',
        'inventory:items:view',
        'inventory:categories:view',
        'inventory:warehouses:view',
        'inventory:stock:view',
        'inventory:receipts:view', 'inventory:receipts:create',
        'inventory:issues:view', 'inventory:issues:create',
        'inventory:transfers:view', 'inventory:transfers:create',
        'inventory:returns:view', 'inventory:returns:create',
        'inventory:adjustment:create',
        'inventory:count:create',
        'master:warehouses:view',
        'master:items:view',
        -- Stock movements
        'stock_movements:view', 'stock_movements:create',
        'stock_adjustments:view', 'stock_adjustments:create',
        'warehouse_transfers:view', 'warehouse_transfers:create', 'warehouse_transfers:receive',
        -- Items
        'items:view:cost',
        -- Batch Numbers
        'batch_numbers:view',
        -- Inventory Policies
        'inventory_policies:view',
        'reorder_rules:view',
        -- Reports
        'reports:warehouses:view'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (warehouse_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
    RAISE NOTICE 'Added permissions for Warehouse role';
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- Accountant Role - صلاحيات المحاسب
  -- ═══════════════════════════════════════════════════════════
  IF accountant_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        -- Dashboard
        'dashboard:view',
        'dashboard:statistics:view',
        -- General Ledger
        'finance:view',
        'finance:coa:view',
        'accounting:journal:view', 'accounting:journal:create', 'accounting:journal:edit', 'accounting:journal:post',
        'accounting:opening_balances:view', 'accounting:opening_balances:create',
        'accounting:periods:view',
        'accounting:budgets:view', 'accounting:budgets:create',
        'master:accounts:view', 'master:accounts:create', 'master:accounts:edit',
        -- Bank & Cash
        'finance:bank_accounts:view', 'finance:bank_accounts:create',
        'finance:cash_boxes:view', 'finance:cash_boxes:create',
        'finance:cheque_books:view',
        'accounting:bank:view', 'accounting:bank:reconcile',
        -- Sub-ledgers
        'accounting:prepaid_expenses:view', 'accounting:prepaid_expenses:create',
        'accounting:deferred_revenue:view', 'accounting:deferred_revenue:create',
        'accounting:cheques_due:view', 'accounting:cheques_due:create',
        'accounting:customers_ledger:view',
        'accounting:inventory_ledger:view',
        'accounting:default_accounts:view',
        -- Credit Notes
        'credit_notes:view', 'credit_notes:create', 'credit_notes:apply',
        -- Reports
        'accounting:reports:trial-balance:view',
        'accounting:reports:general-ledger:view', 'accounting:reports:general-ledger:export',
        'accounting:reports:income-statement:view', 'accounting:reports:income-statement:export',
        'accounting:reports:balance-sheet:view', 'accounting:reports:balance-sheet:export',
        'accounting:reports:cash-flow:view', 'accounting:reports:cash-flow:export',
        'reports:trial_balance:view',
        'reports:balance_sheet:view',
        'reports:income_statement:view',
        'reports:cash_flow:view',
        'reports:financial:view', 'reports:financial:export',
        'reports:aging:view',
        -- Tax
        'tax:view',
        'tax:types:view',
        'tax:rates:view',
        'tax:codes:view',
        -- Exchange Rates
        'exchange_rates:view',
        'master:exchange_rates:view',
        'master:currencies:view',
        -- Customers & Vendors view
        'master:customers:view', 'master:customers:view_balance',
        'master:vendors:view', 'master:vendors:view_balance',
        'customers:view',
        'vendors:view', 'vendors:statements:view'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (accountant_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
    RAISE NOTICE 'Added permissions for Accountant role';
  END IF;

END $$;

-- Verify the update
SELECT r.name as role_name, COUNT(rp.permission_id) as permissions_count 
FROM roles r 
LEFT JOIN role_permissions rp ON r.id = rp.role_id 
GROUP BY r.id, r.name 
ORDER BY permissions_count DESC;
