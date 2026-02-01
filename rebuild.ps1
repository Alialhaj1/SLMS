Set-Location "I:\ملفاتي\LOGISTICS\slms\frontend-next"
docker build -t slms-frontend-next .
docker run -d --name slms-frontend-next-1 -p 3001:3001 slms-frontend-next
Start-Sleep -Seconds 5
docker logs slms-frontend-next-1 --tail 30
Write-Host ""
Write-Host "Done! Check http://localhost:3001" -ForegroundColor Green
