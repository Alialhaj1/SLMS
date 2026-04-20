Set-Location c:\projects\slms
$r = Get-Content check-gc-constraints.sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A 2>&1
foreach ($line in $r) { Write-Host $line }
