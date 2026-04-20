Set-Location c:\projects\slms

function Q($sql) {
    $r = docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $sql 2>$null
    return ($r | Where-Object { $_ -match '^\d' } | Select-Object -First 1)
}

Write-Host "=== DATA COUNTS ==="
$tables = @(
    "customer_types","customer_classifications","customer_statuses","customer_groups",
    "customer_categories","address_types","contact_types","supplier_types",
    "vendor_types","vendor_classifications","vendor_categories","vendor_statuses",
    "purchase_order_types","purchase_order_statuses","vendor_payment_terms",
    "vendor_price_lists","supply_terms","delivery_terms","contract_statuses",
    "contract_types","group_categories","item_groups","lc_types","lc_statuses",
    "storage_location_types","shipping_methods","shipping_companies",
    "item_categories","customs_tariffs","customs_exemptions","insurance_companies",
    "laboratories","shipping_agents"
)
foreach ($t in $tables) {
    $c = Q "SELECT count(*) FROM $t"
    if (-not $c) { $c = "MISSING/ERROR" }
    Write-Host "$t = $c"
}

Write-Host ""
Write-Host "=== REFERENCE DATA ==="
$rd = docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -c "SELECT type || '=' || count(*) FROM reference_data WHERE deleted_at IS NULL GROUP BY type ORDER BY type" 2>$null
$rd | Where-Object { $_ -match '=' } | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "=== PO_STATUSES VIEW ==="
$pv = Q "SELECT count(*) FROM po_statuses"
Write-Host "po_statuses view = $pv"
