@echo off
echo ========================================
echo SLMS Backend Rebuild
echo ========================================
echo.
echo Stopping backend...
docker-compose stop backend
echo.
echo Rebuilding backend image...
docker-compose build backend
echo.
echo Starting backend...
docker-compose up -d backend
echo.
echo Waiting for startup...
timeout /t 5 /nobreak
echo.
echo Checking logs...
docker-compose logs backend --tail=30
echo.
echo ========================================
echo Backend Rebuild Complete!
echo ========================================
pause
