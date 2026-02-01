# Check Backend Status and Logs
Write-Host "🔍 Checking Backend Status..." -ForegroundColor Yellow

# Check Docker containers
Write-Host "`n📦 Docker Containers:" -ForegroundColor Cyan
docker ps --filter "name=backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check if port 4000 is in use
Write-Host "`n🔌 Port 4000 Status:" -ForegroundColor Cyan
$tcpConnection = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($tcpConnection) {
    $processId = $tcpConnection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    Write-Host "   ✅ Port 4000 is IN USE by:" -ForegroundColor Green
    Write-Host "      Process ID: $processId" -ForegroundColor White
    Write-Host "      Process Name: $($process.ProcessName)" -ForegroundColor White
} else {
    Write-Host "   ❌ Port 4000 is NOT in use" -ForegroundColor Red
    Write-Host "   Backend is NOT running!" -ForegroundColor Red
}

# Test API endpoint
Write-Host "`n🌐 Testing Backend API:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend is responding!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Backend is NOT responding!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Show last Docker logs if backend container exists
Write-Host "`n📋 Last 20 Backend Logs:" -ForegroundColor Cyan
docker logs slms-backend-1 --tail 20 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  No Docker container logs found" -ForegroundColor Yellow
}

Write-Host "`n💡 To restart backend:" -ForegroundColor Cyan
Write-Host "   .\restart-backend.ps1" -ForegroundColor White
