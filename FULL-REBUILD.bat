@echo off
echo ================================================
echo    SLMS Frontend Complete Rebuild
echo ================================================
echo.

cd /d c:\projects\slms

echo [1/5] Stopping all containers...
docker-compose down
timeout /t 2 >nul

echo.
echo [2/5] Removing old frontend image...
docker rmi slms-frontend-next -f 2>nul
timeout /t 2 >nul

echo.
echo [3/5] Building frontend (NO CACHE - this takes 2-3 minutes)...
docker-compose build --no-cache frontend-next
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Starting all services...
docker-compose up -d
timeout /t 10 >nul

echo.
echo [5/5] Checking status...
docker ps --filter name=slms

echo.
echo ================================================
echo    Build Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Wait 10 seconds for services to start
echo 2. Open: http://localhost:3001
echo 3. Clear browser cache (Ctrl+Shift+Delete)
echo 4. Login with: ali@alhajco.com
echo 5. Try: /admin/users
echo.
echo Checking logs in 5 seconds...
timeout /t 5 >nul

echo.
echo === Frontend Logs ===
docker logs slms-frontend-next-1 --tail 15

echo.
echo === Backend Logs ===
docker logs slms-backend-1 --tail 5

echo.
echo Done! Press any key to exit...
pause >nul
