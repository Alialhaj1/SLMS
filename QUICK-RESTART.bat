@echo off
echo ========================================
echo   Quick Frontend Restart
echo ========================================
echo.

cd /d c:\projects\slms

echo Restarting frontend...
docker restart slms-frontend-next-1

echo Waiting 10 seconds...
timeout /t 10 >nul

echo.
echo Checking status...
docker logs slms-frontend-next-1 --tail 8

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
echo Now:
echo 1. Open: http://localhost:3001
echo 2. Login with: ali@alhajco.com
echo 3. Try: /admin/users
echo.
pause
