#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run Phase 2.5 Automated Tests
.DESCRIPTION
    Executes Jest test suite for Items Module Phase 2.5
    Tests: Unit + Integration + Coverage Report
#>

Write-Host "🧪 Phase 2.5 - Automated Testing Suite" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules\jest")) {
    Write-Host "Installing Jest dependencies..." -ForegroundColor Yellow
    npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
}

# Step 2: Run unit tests
Write-Host ""
Write-Host "1️⃣  Running Unit Tests..." -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor DarkGray
npm run test:unit

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Unit tests failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Run integration tests
Write-Host ""
Write-Host "2️⃣  Running Integration Tests..." -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor DarkGray
npm run test:integration

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Integration tests failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Generate coverage report
Write-Host ""
Write-Host "3️⃣  Generating Coverage Report..." -ForegroundColor Green
Write-Host "----------------------------------" -ForegroundColor DarkGray
npm run test:coverage

# Step 5: Open coverage report
if (Test-Path "coverage\index.html") {
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Coverage Report:" -ForegroundColor Cyan
    Write-Host "   File: coverage/index.html" -ForegroundColor Gray
    Write-Host ""
    
    $openReport = Read-Host "Open coverage report in browser? (Y/n)"
    if ($openReport -ne 'n') {
        Start-Process "coverage\index.html"
    }
} else {
    Write-Host "⚠️  Coverage report not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Phase 2.5 Testing Complete!" -ForegroundColor Green
Set-Location ..
