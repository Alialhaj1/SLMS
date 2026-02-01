# Quick Fix for Backend Connection Issue
Write-Host "🔧 Quick Backend Fix Script" -ForegroundColor Yellow
Write-Host "================================`n" -ForegroundColor Yellow

# Step 1: Check current status
Write-Host "Step 1: Checking current status..." -ForegroundColor Cyan
$portInUse = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   ✅ Backend is running on port 4000" -ForegroundColor Green
    
    # Test if it's responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   ✅ Backend is responding properly!" -ForegroundColor Green
        Write-Host "`n✨ Backend is healthy! Try logging in again." -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "   ❌ Backend is running but NOT responding" -ForegroundColor Red
        Write-Host "   Restarting backend..." -ForegroundColor Yellow
        
        # Kill the process
        $processId = $portInUse.OwningProcess
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "   ❌ Backend is NOT running" -ForegroundColor Red
}

# Step 2: Start Backend
Write-Host "`nStep 2: Starting Backend..." -ForegroundColor Cyan
Set-Location C:\projects\slms\backend

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "   ⚠️  .env file not found - Backend will fail to start!" -ForegroundColor Red
    Write-Host "   Creating .env file..." -ForegroundColor Yellow
    
    @"
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://slms:slms_pass@localhost:5432/slms_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath ".env" -Encoding utf8
    
    Write-Host "   ✅ .env file created" -ForegroundColor Green
}

# Start backend in new window
Write-Host "   Starting backend server..." -ForegroundColor White
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "powershell.exe"
$startInfo.Arguments = "-NoExit -Command `"Set-Location '$PWD'; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; npm run dev`""
$startInfo.WindowStyle = "Normal"
$process = [System.Diagnostics.Process]::Start($startInfo)

Write-Host "   ⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 3: Verify
Write-Host "`nStep 3: Verifying backend..." -ForegroundColor Cyan
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   ✅ Backend is UP and responding!" -ForegroundColor Green
        Write-Host "`n🎉 Backend started successfully!" -ForegroundColor Green
        Write-Host "`n📋 Backend Info:" -ForegroundColor Cyan
        Write-Host "   URL: http://localhost:4000" -ForegroundColor White
        Write-Host "   Health: http://localhost:4000/api/health" -ForegroundColor White
        Write-Host "   Login API: http://localhost:4000/api/auth/login" -ForegroundColor White
        Write-Host "`n🚀 You can now try logging in!" -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "   Attempt $i/10: Waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

Write-Host "`n❌ Backend failed to start properly" -ForegroundColor Red
Write-Host "   Check the backend terminal window for errors" -ForegroundColor Yellow
