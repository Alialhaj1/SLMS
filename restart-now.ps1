Set-Location "c:\projects\slms"
Write-Host "Restarting backend..." -ForegroundColor Yellow
& docker compose restart backend
Start-Sleep -Seconds 6
Write-Host "`nBackend restarted. Reload your browser page." -ForegroundColor Green
