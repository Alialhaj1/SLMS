Set-Location c:\projects\slms
$tables = @('vendor_types','vendor_classifications','vendor_categories','vendor_statuses','purchase_order_types','purchase_order_statuses','vendor_payment_terms','vendor_price_lists','lc_types')
foreach ($t in $tables) {
    $sql = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='$t' AND table_schema='public' ORDER BY ordinal_position;"
    $result = docker compose exec -T postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $sql 2>&1
    Write-Host "=== $t ==="
    Write-Host $result
    Write-Host ""
}
