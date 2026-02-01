@echo off
echo ========================================
echo Rebuilding Backend...
echo ========================================
cd /d C:\projects\slms
docker-compose stop backend
docker-compose build backend
docker-compose up -d backend
timeout /t 6 /nobreak
echo.
echo Checking logs...
docker-compose logs backend --tail=20
echo.
echo ========================================
echo Done!
echo ========================================
