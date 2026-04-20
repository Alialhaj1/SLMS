#!/usr/bin/env pwsh

Write-Host "🔄 Emergency SLMS Restart..." -ForegroundColor Yellow
Set-Location "c:\projects\slms"

Write-Host "⏹️ Stopping containers..." -ForegroundColor Red
& docker-compose down

Write-Host "🚀 Starting containers..." -ForegroundColor Green  
& docker-compose up -d

Write-Host "⏳ Waiting for services..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "🔍 Checking service status..." -ForegroundColor Magenta
& docker-compose ps

Write-Host "🌐 Testing backend health..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
    Write-Host "✅ Backend is responding!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎯 Services should be ready! Check http://localhost:3001" -ForegroundColor Green