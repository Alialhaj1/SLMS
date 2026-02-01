@echo off
cd /d C:\projects\slms
docker compose restart frontend-next
echo.
echo Frontend restarted successfully!
pause
