@echo off
echo Restarting frontend-next to apply translations...
docker restart slms-frontend-next-1
echo.
echo Waiting for frontend to start...
timeout /t 15 >nul
echo.
echo Frontend restarted successfully!
echo Please check http://localhost:3001
pause
