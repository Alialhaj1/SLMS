Set-Location c:\projects\slms
$tables = @('item_categories','customs_exemptions','customs_tariffs','customs_declaration_statuses','insurance_companies','laboratories','shipment_stages')
foreach ($t in $tables) {
  $sql = "SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name='$t' AND column_name='code' AND data_type='character varying';"
  $result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
  Write-Host "$t code: $result"
}
# Also check declaration_statuses code width
$sql2 = "SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name='customs_declaration_statuses' AND data_type='character varying' ORDER BY ordinal_position;"
$result2 = $sql2 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "customs_declaration_statuses all varchar: $result2"
