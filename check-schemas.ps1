Set-Location c:\projects\slms

$tables = @('insurance_companies','laboratories','shipping_agents','shipment_expense_types','shipment_stages','customs_declaration_statuses','customs_tariffs','customs_exemptions')

foreach ($t in $tables) {
  $sql = "SELECT '=== $t ==='; SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='$t' AND table_schema='public' ORDER BY ordinal_position;"
  $result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
  Write-Host $result
  Write-Host ""
}

# Also check data samples
$sqls = @(
  "SELECT '--- customs_tariffs data ---'; SELECT * FROM customs_tariffs LIMIT 3;",
  "SELECT '--- customs_exemptions data ---'; SELECT * FROM customs_exemptions LIMIT 5;",
  "SELECT '--- insurance_companies cols ---'; SELECT * FROM insurance_companies LIMIT 2;",
  "SELECT '--- laboratories cols ---'; SELECT * FROM laboratories LIMIT 2;",
  "SELECT '--- shipping_agents cols ---'; SELECT * FROM shipping_agents LIMIT 2;"
)
foreach ($q in $sqls) {
  $result = $q | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
  Write-Host $result
  Write-Host ""
}
