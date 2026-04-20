Set-Location c:\projects\slms
$output = docker compose logs backend --tail 40 --no-color 2>&1
$output | ForEach-Object { Write-Host $_ }
