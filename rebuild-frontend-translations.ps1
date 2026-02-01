# Rebuild Frontend-Next with updated translations
Write-Host "========================================"
Write-Host " Rebuilding Frontend-Next (Translations)"
Write-Host "========================================"
Write-Host ""

Write-Host "[1/3] Stopping frontend-next service..."
docker-compose stop frontend-next

Write-Host ""
Write-Host "[2/3] Rebuilding frontend-next image (no cache)..."
docker-compose build --no-cache frontend-next

Write-Host ""
Write-Host "[3/3] Starting frontend-next service..."
docker-compose up -d frontend-next

Write-Host ""
Write-Host "========================================"
Write-Host " Rebuild Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Frontend-next is now running with updated translations."
Write-Host "Open http://localhost:3001 to test."
Write-Host ""
Read-Host -Prompt "Press Enter to continue"
