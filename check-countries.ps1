Set-Location c:\projects\slms
$sql = "SELECT id, code, name FROM countries WHERE code IN ('SA','KW','AE','BH','OM','JO','YE','IQ','QA','EG') OR name ILIKE '%saudi%' OR name ILIKE '%kuwait%' ORDER BY code LIMIT 15;"
$result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host $result

# Also check what company_ids have shipment_stages data
$sql2 = "SELECT DISTINCT company_id FROM shipment_stages ORDER BY company_id;"
$result2 = $sql2 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "shipment_stages companies: $result2"

$sql3 = "SELECT DISTINCT company_id FROM shipment_expense_types ORDER BY company_id;"
$result3 = $sql3 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "shipment_expense_types companies: $result3"
