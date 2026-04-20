Set-Location c:\projects\slms
$env:DOCKER_CLI_HINTS = 'false'
# Directly capture container logs via docker (not compose) to avoid pager
$containerName = (docker compose ps -q backend 2>$null) | Select-Object -First 1
if ($containerName) {
    docker logs --tail 50 $containerName 2>&1 | ForEach-Object { $_.ToString() } | Select-Object -Last 50
} else {
    Write-Host "Backend container not found"
}
