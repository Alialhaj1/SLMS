Set-Location c:\projects\slms
$sql = "SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name='shipment_expense_types' AND data_type='character varying' ORDER BY ordinal_position;"
$result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "=== shipment_expense_types col widths ==="
Write-Host $result

# Also check what's in the migrations table now
$sql2 = "SELECT name FROM migrations ORDER BY name DESC LIMIT 5;"
$result2 = $sql2 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "=== latest migrations ==="
Write-Host $result2

# Check existing expense type codes
$sql3 = "SELECT code FROM shipment_expense_types LIMIT 20;"
$result3 = $sql3 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "=== existing expense type codes ==="
Write-Host $result3

# Also check shipping_agents code column width
$sql4 = "SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name='shipping_agents' AND data_type='character varying' ORDER BY ordinal_position;"
$result4 = $sql4 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "=== shipping_agents col widths ==="
Write-Host $result4
