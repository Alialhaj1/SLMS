Set-Location c:\projects\slms
docker compose logs backend --tail 15 2>&1 | ForEach-Object { $_.ToString() }
