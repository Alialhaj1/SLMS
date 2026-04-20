Set-Location c:\projects\slms
$env:PAGER = 'cat'
$env:LESS = '-X -F'
$env:LESSOPEN = ''
$containerName = (docker compose ps -q postgres 2>$null).Trim()
$sql = "SELECT table_name || '|' || column_name FROM information_schema.columns WHERE table_name IN ('customs_duty_types','group_categories','shipping_companies','supplier_types','supplier_bank_accounts','cost_element_groups','deferred_policies','prepaid_policies','transaction_defaults') AND column_name LIKE 'name%' ORDER BY table_name, column_name;"
$result = docker exec -i $containerName psql -U slms -d slms_db --no-psqlrc -t -A -c $sql 2>&1
Write-Host "=== RESULT ==="
$result
