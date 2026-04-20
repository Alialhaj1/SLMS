$ErrorActionPreference = 'SilentlyContinue'
Push-Location c:\projects\slms

$queries = @{
    'customer_types' = "SELECT count(*) FROM customer_types WHERE deleted_at IS NULL"
    'customer_classifications' = "SELECT count(*) FROM customer_classifications WHERE deleted_at IS NULL"
    'customer_statuses' = "SELECT count(*) FROM customer_statuses WHERE deleted_at IS NULL"
    'customer_groups' = "SELECT count(*) FROM customer_groups WHERE deleted_at IS NULL"
    'customer_categories' = "SELECT count(*) FROM customer_categories WHERE deleted_at IS NULL"
    'address_types' = "SELECT count(*) FROM address_types WHERE deleted_at IS NULL"
    'contact_types' = "SELECT count(*) FROM contact_types WHERE deleted_at IS NULL"
    'supplier_types' = "SELECT count(*) FROM supplier_types WHERE deleted_at IS NULL"
    'vendor_types' = "SELECT count(*) FROM vendor_types WHERE deleted_at IS NULL"
    'vendor_classifications' = "SELECT count(*) FROM vendor_classifications WHERE deleted_at IS NULL"
    'vendor_categories' = "SELECT count(*) FROM vendor_categories WHERE deleted_at IS NULL"
    'vendor_statuses' = "SELECT count(*) FROM vendor_statuses WHERE deleted_at IS NULL"
    'po_types' = "SELECT count(*) FROM purchase_order_types WHERE deleted_at IS NULL"
    'po_statuses' = "SELECT count(*) FROM purchase_order_statuses WHERE deleted_at IS NULL"
    'vendor_pay_terms' = "SELECT count(*) FROM vendor_payment_terms WHERE deleted_at IS NULL"
    'vendor_price_lists' = "SELECT count(*) FROM vendor_price_lists WHERE deleted_at IS NULL"
    'supply_terms' = "SELECT count(*) FROM supply_terms WHERE deleted_at IS NULL"
    'delivery_terms' = "SELECT count(*) FROM delivery_terms WHERE deleted_at IS NULL"
    'contract_statuses' = "SELECT count(*) FROM contract_statuses WHERE deleted_at IS NULL"
    'contract_types' = "SELECT count(*) FROM contract_types WHERE deleted_at IS NULL"
    'group_categories' = "SELECT count(*) FROM group_categories WHERE deleted_at IS NULL"
    'item_groups' = "SELECT count(*) FROM item_groups WHERE deleted_at IS NULL"
    'item_categories' = "SELECT count(*) FROM item_categories WHERE deleted_at IS NULL"
    'lc_types' = "SELECT count(*) FROM lc_types WHERE deleted_at IS NULL"
    'lc_statuses' = "SELECT count(*) FROM lc_statuses WHERE deleted_at IS NULL"
    'storage_loc_types' = "SELECT count(*) FROM storage_location_types WHERE deleted_at IS NULL"
    'shipping_companies' = "SELECT count(*) FROM shipping_companies WHERE deleted_at IS NULL"
    'shipping_methods' = "SELECT count(*) FROM shipping_methods WHERE deleted_at IS NULL"
    'warehouse_types' = "SELECT count(*) FROM warehouse_types WHERE deleted_at IS NULL"
    'units' = "SELECT count(*) FROM units WHERE deleted_at IS NULL"
    'payment_terms' = "SELECT count(*) FROM payment_terms WHERE deleted_at IS NULL"
    'payment_methods' = "SELECT count(*) FROM payment_methods WHERE deleted_at IS NULL"
    'ref_group_types' = "SELECT count(*) FROM reference_data WHERE type='group_types' AND deleted_at IS NULL"
    'ref_group_levels' = "SELECT count(*) FROM reference_data WHERE type='group_levels' AND deleted_at IS NULL"
    'ref_item_types' = "SELECT count(*) FROM reference_data WHERE type='item_types' AND deleted_at IS NULL"
    'ref_item_grades' = "SELECT count(*) FROM reference_data WHERE type='item_grades' AND deleted_at IS NULL"
    'ref_credit_limits' = "SELECT count(*) FROM reference_data WHERE type='credit_limits' AND deleted_at IS NULL"
    'ref_discount_agr' = "SELECT count(*) FROM reference_data WHERE type='discount_agreements' AND deleted_at IS NULL"
}

foreach ($entry in $queries.GetEnumerator() | Sort-Object Name) {
    $result = docker compose exec -T postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $entry.Value 2>$null
    $count = if ($result) { $result.Trim() } else { "ERR" }
    Write-Output ("{0,-25} {1}" -f $entry.Name, $count)
}

Pop-Location
