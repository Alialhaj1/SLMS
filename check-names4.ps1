Set-Location c:\projects\slms
$containerName = (docker compose ps -q postgres 2>$null).Trim()
$result = docker exec $containerName bash -c "PAGER=cat psql -U slms -d slms_db --no-psqlrc --pset pager=off -t -A -c ""SELECT table_name || '|' || column_name FROM information_schema.columns WHERE table_name IN ('customs_duty_types','group_categories','shipping_companies','supplier_types','supplier_bank_accounts','cost_element_groups','deferred_policies','prepaid_policies','transaction_defaults') AND column_name LIKE 'name%' ORDER BY table_name, column_name;""" 2>&1
Write-Host "OUTPUT:"
foreach ($line in $result) { Write-Host $line }
