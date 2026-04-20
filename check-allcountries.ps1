Set-Location c:\projects\slms
$sql = "SELECT id, code, name FROM countries ORDER BY id LIMIT 30;"
$result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host $result

$sql2 = "SELECT count(*) FROM countries;"
$result2 = $sql2 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
Write-Host "Total countries: $result2"
