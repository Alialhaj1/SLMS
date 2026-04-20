Set-Location c:\projects\slms
$sql = @"
SELECT table_name || '|' || column_name FROM information_schema.columns WHERE table_name IN ('customs_duty_types','group_categories','shipping_companies','supplier_types','supplier_bank_accounts','cost_element_groups','deferred_policies','prepaid_policies','transaction_defaults') AND column_name LIKE 'name%' ORDER BY table_name, column_name;
"@
$result = $sql | docker compose exec -T postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1
$result | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ -ne '' }
