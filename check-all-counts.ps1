Push-Location c:\projects\slms
$tables = @(
    "SELECT 'customer_types', count(*) FROM customer_types WHERE deleted_at IS NULL",
    "SELECT 'customer_classifications', count(*) FROM customer_classifications WHERE deleted_at IS NULL",
    "SELECT 'customer_statuses', count(*) FROM customer_statuses WHERE deleted_at IS NULL",
    "SELECT 'customer_groups', count(*) FROM customer_groups WHERE deleted_at IS NULL",
    "SELECT 'customer_categories', count(*) FROM customer_categories WHERE deleted_at IS NULL",
    "SELECT 'address_types', count(*) FROM address_types WHERE deleted_at IS NULL",
    "SELECT 'contact_types', count(*) FROM contact_types WHERE deleted_at IS NULL",
    "SELECT 'supplier_types', count(*) FROM supplier_types WHERE deleted_at IS NULL",
    "SELECT 'vendor_types', count(*) FROM vendor_types WHERE deleted_at IS NULL",
    "SELECT 'vendor_classifications', count(*) FROM vendor_classifications WHERE deleted_at IS NULL",
    "SELECT 'vendor_categories', count(*) FROM vendor_categories WHERE deleted_at IS NULL",
    "SELECT 'vendor_statuses', count(*) FROM vendor_statuses WHERE deleted_at IS NULL",
    "SELECT 'purchase_order_types', count(*) FROM purchase_order_types WHERE deleted_at IS NULL",
    "SELECT 'purchase_order_statuses', count(*) FROM purchase_order_statuses WHERE deleted_at IS NULL",
    "SELECT 'vendor_payment_terms', count(*) FROM vendor_payment_terms WHERE deleted_at IS NULL",
    "SELECT 'vendor_price_lists', count(*) FROM vendor_price_lists WHERE deleted_at IS NULL",
    "SELECT 'supply_terms', count(*) FROM supply_terms WHERE deleted_at IS NULL",
    "SELECT 'delivery_terms', count(*) FROM delivery_terms WHERE deleted_at IS NULL",
    "SELECT 'contract_statuses', count(*) FROM contract_statuses WHERE deleted_at IS NULL",
    "SELECT 'contract_types', count(*) FROM contract_types WHERE deleted_at IS NULL",
    "SELECT 'group_categories', count(*) FROM group_categories WHERE deleted_at IS NULL",
    "SELECT 'item_groups', count(*) FROM item_groups WHERE deleted_at IS NULL",
    "SELECT 'item_categories', count(*) FROM item_categories WHERE deleted_at IS NULL",
    "SELECT 'lc_types', count(*) FROM lc_types WHERE deleted_at IS NULL",
    "SELECT 'lc_statuses', count(*) FROM lc_statuses WHERE deleted_at IS NULL",
    "SELECT 'storage_location_types', count(*) FROM storage_location_types WHERE deleted_at IS NULL",
    "SELECT 'shipping_companies', count(*) FROM shipping_companies WHERE deleted_at IS NULL",
    "SELECT 'shipping_methods', count(*) FROM shipping_methods WHERE deleted_at IS NULL",
    "SELECT 'warehouse_types', count(*) FROM warehouse_types WHERE deleted_at IS NULL",
    "SELECT 'units', count(*) FROM units WHERE deleted_at IS NULL",
    "SELECT 'payment_terms', count(*) FROM payment_terms WHERE deleted_at IS NULL",
    "SELECT 'payment_methods', count(*) FROM payment_methods WHERE deleted_at IS NULL",
    "SELECT 'ref_group_types', count(*) FROM reference_data WHERE type='group_types' AND deleted_at IS NULL",
    "SELECT 'ref_group_levels', count(*) FROM reference_data WHERE type='group_levels' AND deleted_at IS NULL",
    "SELECT 'ref_item_types', count(*) FROM reference_data WHERE type='item_types' AND deleted_at IS NULL",
    "SELECT 'ref_item_grades', count(*) FROM reference_data WHERE type='item_grades' AND deleted_at IS NULL",
    "SELECT 'ref_credit_limits', count(*) FROM reference_data WHERE type='credit_limits' AND deleted_at IS NULL",
    "SELECT 'ref_discount_agr', count(*) FROM reference_data WHERE type='discount_agreements' AND deleted_at IS NULL"
)
foreach ($q in $tables) {
    $r = docker compose exec -T postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $q 2>$null
    Write-Host $r
}
Pop-Location
