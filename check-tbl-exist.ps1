Push-Location c:\projects\slms
$env:PAGER = 'cat'
$env:LESS = ''
$env:LESSOPEN = ''

$sql = @"
SELECT 'customs_duty_types' AS tbl, EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customs_duty_types')::text AS ex
UNION ALL
SELECT 'supplier_bank_accounts', EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='supplier_bank_accounts')::text;
"@

$sql | docker compose exec -T -e PAGER=cat -e LESS= postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1

Pop-Location
