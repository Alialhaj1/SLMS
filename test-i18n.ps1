#!/usr/bin/env pwsh
# Quick i18n Testing Script

Write-Host "🌐 SLMS i18n Testing Guide" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "frontend-next\package.json")) {
    Write-Host "❌ Error: Run this script from the project root (c:\projects\slms)" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-flight Checklist:" -ForegroundColor Yellow
Write-Host "  1. Node.js installed? $(if (Get-Command node -ErrorAction SilentlyContinue) {'✅'} else {'❌'})"
Write-Host "  2. Dependencies installed? $(if (Test-Path 'frontend-next\node_modules') {'✅'} else {'❌ Run: npm install'})"
Write-Host ""

Write-Host "🚀 Starting Development Server..." -ForegroundColor Green
Set-Location frontend-next

# Start dev server
Write-Host ""
Write-Host "Server will start at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Test URLs:" -ForegroundColor Yellow
Write-Host "  • Login:         http://localhost:3000/auth/login" -ForegroundColor White
Write-Host "  • Profile:       http://localhost:3000/profile" -ForegroundColor White
Write-Host "  • Notifications: http://localhost:3000/notifications" -ForegroundColor White
Write-Host ""
Write-Host "🌍 Language Switching:" -ForegroundColor Yellow
Write-Host "  • Click the 🌐 globe icon in header" -ForegroundColor White
Write-Host "  • Or use Profile page > Language Preference section" -ForegroundColor White
Write-Host "  • Or use browser console:" -ForegroundColor White
Write-Host "    localStorage.setItem('locale', 'ar'); location.reload()" -ForegroundColor Gray
Write-Host "    localStorage.setItem('locale', 'en'); location.reload()" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 What to Check:" -ForegroundColor Yellow
Write-Host "  ✓ All text changes when switching languages" -ForegroundColor White
Write-Host "  ✓ Page direction flips (RTL for Arabic, LTR for English)" -ForegroundColor White
Write-Host "  ✓ Font changes (Cairo for Arabic, Inter for English)" -ForegroundColor White
Write-Host "  ✓ Icons and menus align correctly" -ForegroundColor White
Write-Host "  ✓ Numbers stay LTR in Arabic mode" -ForegroundColor White
Write-Host "  ✓ Time stamps format correctly ('منذ 5 دقائق' / '5m ago')" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

npm run dev
