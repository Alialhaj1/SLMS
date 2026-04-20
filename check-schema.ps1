Set-Location c:\projects\slms
$q1 = "SELECT column_name||'|'||data_type FROM information_schema.columns WHERE table_name='group_categories' AND table_schema='public' ORDER BY ordinal_position;"
$q2 = "SELECT column_name||'|'||data_type FROM information_schema.columns WHERE table_name='reference_data' AND table_schema='public' ORDER BY ordinal_position;"
Write-Host "=== group_categories ==="
$r1 = docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $q1 2>&1
Write-Host $r1
Write-Host ""
Write-Host "=== reference_data ==="
$r2 = docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -c $q2 2>&1
Write-Host $r2
