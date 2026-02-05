$ErrorActionPreference = "Stop"

# SSH connection details
$sshKey = "C:\Users\USER\.ssh\id_ed25519"
$server = "root@68.183.221.112"

Write-Host "Rebuilding frontend container on production server..." -ForegroundColor Cyan

# Execute rebuild command
& ssh -i $sshKey $server "cd /opt/slms && docker compose -f docker-compose.prod.yml stop frontend && docker compose -f docker-compose.prod.yml build --no-cache frontend && docker compose -f docker-compose.prod.yml up -d frontend"

Write-Host "Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check health
Write-Host "Checking health endpoint..." -ForegroundColor Cyan
& ssh -i $sshKey $server "curl -s http://localhost:3001/api/health"

Write-Host "`nDone!" -ForegroundColor Green
