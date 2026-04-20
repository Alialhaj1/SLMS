$cd = "c:\projects\slms"
Set-Location $cd

function RunSQL($sql) {
    $r = docker compose exec -T postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $sql 2>$null
    return $r
}

Write-Host "=== TABLE DATA COUNTS ==="
$tables = @(
    "customer_types", "customer_classifications", "customer_statuses", "customer_groups",
    "customer_categories", "address_types", "contact_types", "supplier_types",
    "vendor_types", "vendor_classifications", "vendor_categories", "vendor_statuses",
    "purchase_order_types", "purchase_order_statuses", "vendor_payment_terms",
    "vendor_price_lists", "supply_terms", "delivery_terms", "contract_statuses",
    "contract_types", "group_categories", "item_groups", "lc_types", "lc_statuses"
)

foreach ($t in $tables) {
    $c = RunSQL "SELECT count(*) FROM $t WHERE deleted_at IS NULL"
    if ($LASTEXITCODE -ne 0) {
        $c = RunSQL "SELECT count(*) FROM $t"
        if ($LASTEXITCODE -ne 0) { $c = "TABLE_MISSING" }
    }
    Write-Host "$t : $c"
}

Write-Host ""
Write-Host "=== REFERENCE DATA TYPES ==="
$refTypes = RunSQL "SELECT type || '=' || count(*) FROM reference_data WHERE deleted_at IS NULL GROUP BY type ORDER BY type"
foreach ($r in $refTypes) { Write-Host "  $r" }

Write-Host ""
Write-Host "=== VIEWS/SPECIAL ==="
$v1 = RunSQL "SELECT count(*) FROM po_statuses" 2>$null
Write-Host "po_statuses (view): $v1"
$v2 = RunSQL "SELECT count(*) FROM storage_location_types" 2>$null
Write-Host "storage_location_types: $v2"

Write-Host ""
Write-Host "=== MISSING TABLES CHECK ==="
foreach ($t in @("supplier_categories", "supplier_statuses", "letters_of_credit")) {
    $exists = RunSQL "SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='$t')"
    Write-Host "$t exists: $exists"
}
