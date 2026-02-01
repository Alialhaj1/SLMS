# Restart Backend Server
Write-Host "🔄 Restarting Backend Server..." -ForegroundColor Yellow

# Navigate to backend directory
Set-Location C:\projects\slms\backend

# Kill any existing node processes on port 4000
Write-Host "`n🔍 Checking for existing processes on port 4000..." -ForegroundColor Cyan
$connection = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    Write-Host "   Found process: $processId - Stopping..." -ForegroundColor Red
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start backend
Write-Host "`n🚀 Starting Backend Server..." -ForegroundColor Green
Write-Host "   Location: C:\projects\slms\backend" -ForegroundColor White
Write-Host "   Port: 4000" -ForegroundColor White
Write-Host ""

# Set execution policy and run
$env:NODE_ENV = "development"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
npm run dev
