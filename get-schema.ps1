Set-Location c:\projects\slms
$result = docker compose exec -T -e PAGER=cat -e LESS='' -e LESSOPEN='' postgres psql -U slms -d slms_db --no-psqlrc -t -A -c "SELECT 'GC:'||column_name||':'||data_type FROM information_schema.columns WHERE table_name='group_categories' AND table_schema='public' ORDER BY ordinal_position" 2>&1
foreach ($line in $result) { Write-Host $line }
Write-Host "---"
$result2 = docker compose exec -T -e PAGER=cat -e LESS='' -e LESSOPEN='' postgres psql -U slms -d slms_db --no-psqlrc -t -A -c "SELECT 'RD:'||column_name||':'||data_type FROM information_schema.columns WHERE table_name='reference_data' AND table_schema='public' ORDER BY ordinal_position" 2>&1
foreach ($line in $result2) { Write-Host $line }
